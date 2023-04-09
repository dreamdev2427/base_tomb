// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@uniswap/lib/contracts/libraries/Babylonian.sol";

import "./owner/Operator.sol";
import "./utils/ContractGuard.sol";
import "./interfaces/IBasisAsset.sol";
import "./interfaces/IOracle.sol";
import "./interfaces/IBoardroom.sol";

contract Treasury is ContractGuard, Operator {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    /* ========= CONSTANT VARIABLES ======== */

    uint256 public constant PERIOD = 6 hours;

    /* ========== STATE VARIABLES ========== */

    // flags
    bool public initialized = false;

    // epoch
    uint256 public startTime;
    uint256 public epoch = 0;
    uint256 public epochSupplyContractionLeft = 0;

    //=================================================================// exclusions from total supply
    address[] public excludedFromTotalSupply = [
        address(0x141dc0287C9B1a66348F5Cad9bB7F651642e21F4) // RBGenesisPool
    ];

    // core components
    address public arbt;
    address public arbBond;
    address public arbShare;

    address public boardroom;
    address public arbtOracle;

    // price
    uint256 public arbtPriceOne;
    uint256 public arbtPriceCeiling;

    uint256 public seigniorageSaved;

    uint256[] public supplyTiers;
    uint256[] public maxExpansionTiers;

    uint256 public maxSupplyExpansionPercent;
    uint256 public bondDepletionFloorPercent;
    uint256 public seigniorageExpansionFloorPercent;
    uint256 public maxSupplyContractionPercent;
    uint256 public maxDebtRatioPercent;

    // 14 first epochs (0.5 week) with 4.5% expansion regardless of ARBt price
    uint256 public bootstrapEpochs;
    uint256 public bootstrapSupplyExpansionPercent;

    /* =================== Added variables =================== */
    uint256 public previousEpochARBtPrice;
    uint256 public maxDiscountRate; // when purchasing bond
    uint256 public maxPremiumRate;  // when redeeming bond
    uint256 public discountPercent;
    uint256 public premiumThreshold;
    uint256 public premiumPercent;
    uint256 public mintingFactorForPayingDebt; // print extra ARBt during debt phase

    address public daoFund;
    uint256 public daoFundSharedPercent;

    //=================================================//

    address public devFund;
    uint256 public devFundSharedPercent;
    address public teamFund;
    uint256 public teamFundSharedPercent;

    /* =================== Events =================== */

    event Initialized(address indexed executor, uint256 at);
    event BurnedBonds(address indexed from, uint256 bondAmount);
    event RedeemedBonds(address indexed from, uint256 arbtAmount, uint256 bondAmount);
    event BoughtBonds(address indexed from, uint256 arbtAmount, uint256 bondAmount);
    event TreasuryFunded(uint256 timestamp, uint256 seigniorage);
    event AcropolisFunded(uint256 timestamp, uint256 seigniorage);
    event DaoFundFunded(uint256 timestamp, uint256 seigniorage);
    event DevFundFunded(uint256 timestamp, uint256 seigniorage);
    event TeamFundFunded(uint256 timestamp, uint256 seigniorage);

    /* =================== Modifier =================== */

    modifier checkCondition {
        require(block.timestamp >= startTime, "Treasury: not started yet");

        _;
    }

    modifier checkEpoch {
        require(block.timestamp >= nextEpochPoint(), "Treasury: not opened yet");

        _;

        epoch = epoch.add(1);
        epochSupplyContractionLeft = (getARBtPrice() > arbtPriceCeiling) ? 0 : getARBtCirculatingSupply().mul(maxSupplyContractionPercent).div(10000);
    }

    modifier checkOperator {
        require(
                IBasisAsset(arbt).operator() == address(this) &&
                IBasisAsset(arbBond).operator() == address(this) &&
                IBasisAsset(arbShare).operator() == address(this) &&
                Operator(boardroom).operator() == address(this),
            "Treasury: need more permission"
        );

        _;
    }

    modifier notInitialized {
        require(!initialized, "Treasury: already initialized");

        _;
    }

    /* ========== VIEW FUNCTIONS ========== */

    function isInitialized() public view returns (bool) {
        return initialized;
    }

    // epoch
    function nextEpochPoint() public view returns (uint256) {
        return startTime.add(epoch.mul(PERIOD));
    }

    // oracle
    function getARBtPrice() public view returns (uint256 arbtPrice) {
        try IOracle(arbtOracle).consult(arbt, 1e18) returns (uint144 price) {
            return uint256(price);
        } catch {
            revert("Treasury: failed to consult ARBt price from the oracle");
        }
    }

    function getRBUpdatedPrice() public view returns (uint256 _arbtPrice) {
        try IOracle(arbtOracle).twap(arbt, 1e18) returns (uint144 price) {
            return uint256(price);
        } catch {
            revert("Treasury: failed to consult ARBt price from the oracle");
        }
    }

    // budget
    function getReserve() public view returns (uint256) {
        return seigniorageSaved;
    }

    function getBurnableARBtLeft() public view returns (uint256 _burnableARBtLeft) {
        uint256 _arbtPrice = getARBtPrice();
        if (_arbtPrice <= arbtPriceOne) {
            uint256 _arbtSupply = getARBtCirculatingSupply();
            uint256 _bondMaxSupply = _arbtSupply.mul(maxDebtRatioPercent).div(10000);
            uint256 _bondSupply = IERC20(arbBond).totalSupply();
            if (_bondMaxSupply > _bondSupply) {
                uint256 _maxMintableBond = _bondMaxSupply.sub(_bondSupply);
                uint256 _maxBurnableRB = _maxMintableBond.mul(_arbtPrice).div(1e18);
                _burnableARBtLeft = Math.min(epochSupplyContractionLeft, _maxBurnableRB);
            }
        }
    }

    function getRedeemableBonds() public view returns (uint256 _redeemableBonds) {
        uint256 _arbtPrice = getARBtPrice();
        if (_arbtPrice > arbtPriceCeiling) {
            uint256 _totalARBt = IERC20(arbt).balanceOf(address(this));
            uint256 _rate = getBondPremiumRate();
            if (_rate > 0) {
                _redeemableBonds = _totalARBt.mul(1e18).div(_rate);
            }
        }
    }

    function getBondDiscountRate() public view returns (uint256 _rate) {
        uint256 _arbtPrice = getARBtPrice();
        if (_arbtPrice <= arbtPriceOne) {
            if (discountPercent == 0) {
                // no discount
                _rate = arbtPriceOne;
            } else {
                uint256 _bondAmount = arbtPriceOne.mul(1e18).div(_arbtPrice); // to burn 1 ARBt
                uint256 _discountAmount = _bondAmount.sub(arbtPriceOne).mul(discountPercent).div(10000);
                _rate = arbtPriceOne.add(_discountAmount);
                if (maxDiscountRate > 0 && _rate > maxDiscountRate) {
                    _rate = maxDiscountRate;
                }
            }
        }
    }

    function getBondPremiumRate() public view returns (uint256 _rate) {
        uint256 _arbtPrice = getARBtPrice();
        if (_arbtPrice > arbtPriceCeiling) {
            uint256 _arbtPricePremiumThreshold = arbtPriceOne.mul(premiumThreshold).div(100);
            if (_arbtPrice >= _arbtPricePremiumThreshold) {
                //Price > 1.10
                uint256 _premiumAmount = _arbtPrice.sub(arbtPriceOne).mul(premiumPercent).div(10000);
                _rate = arbtPriceOne.add(_premiumAmount);
                if (maxPremiumRate > 0 && _rate > maxPremiumRate) {
                    _rate = maxPremiumRate;
                }
            } else {
                // no premium bonus
                _rate = arbtPriceOne;
            }
        }
    }

    /* ========== GOVERNANCE ========== */

    function initialize(
        address _arbt,
        address _arbBond,
        address _arbShare,
        address _arbtOracle,
        address _boardroom,
        uint256 _startTime
    ) public notInitialized onlyOperator {
        arbt = _arbt;
        arbBond = _arbBond;
        arbShare = _arbShare;
        arbtOracle = _arbtOracle;
        boardroom = _boardroom;
        startTime = _startTime;

        arbtPriceOne = 10 ** 18;
        arbtPriceCeiling = arbtPriceOne.mul(101).div(100);

        // Dynamic max expansion percent
        supplyTiers = [0 ether, 206000 ether, 386000 ether, 530000 ether, 1300000 ether, 5000000 ether, 10000000 ether];
        maxExpansionTiers = [600, 500, 450, 400, 200, 100, 50];

        maxSupplyExpansionPercent = 600; // Upto 6% supply for expansion

        bondDepletionFloorPercent = 10000; // 100% of Bond supply for depletion floor
        seigniorageExpansionFloorPercent = 3500; // At least 35% of expansion reserved for boardroom
        maxSupplyContractionPercent = 300; // Upto 3.0% supply for contraction (to burn ARBt and mint RBOND)
        maxDebtRatioPercent = 3500; // Upto 35% supply of RBOND to purchase

        premiumThreshold = 110;
        premiumPercent = 7000;

        // First 14 epochs with 6% expansion
        bootstrapEpochs = 14;
        bootstrapSupplyExpansionPercent = 600;

        // set seigniorageSaved to it's balance
        seigniorageSaved = IERC20(arbt).balanceOf(address(this));

        initialized = true;
        emit Initialized(msg.sender, block.number);
    }

    function setOperator(address _operator) external onlyOperator {
        transferOperator(_operator);
    }

    function renounceOperator() external onlyOperator {
        _renounceOperator();
    }

    function setAcropolis(address _boardroom) external onlyOperator {
        boardroom = _boardroom;
    }

    function setRBOracle(address _arbtOracle) external onlyOperator {
        arbtOracle = _arbtOracle;
    }

    function setRBPriceCeiling(uint256 _arbtPriceCeiling) external onlyOperator {
        require(_arbtPriceCeiling >= arbtPriceOne && _arbtPriceCeiling <= arbtPriceOne.mul(120).div(100), "out of range"); // [$1.0, $1.2]
        arbtPriceCeiling = _arbtPriceCeiling;
    }

    function setMaxSupplyExpansionPercents(uint256 _maxSupplyExpansionPercent) external onlyOperator {
        require(_maxSupplyExpansionPercent >= 10 && _maxSupplyExpansionPercent <= 1000, "_maxSupplyExpansionPercent: out of range"); // [0.1%, 10%]
        maxSupplyExpansionPercent = _maxSupplyExpansionPercent;
    }
    // =================== ALTER THE NUMBERS IN LOGIC!!!! =================== //
    function setSupplyTiersEntry(uint8 _index, uint256 _value) external onlyOperator returns (bool) {
        require(_index >= 0, "Index has to be higher than 0");
        require(_index < 7, "Index has to be lower than count of tiers");
        if (_index > 0) {
            require(_value > supplyTiers[_index - 1]);
        }
        if (_index < 6) {
            require(_value < supplyTiers[_index + 1]);
        }
        supplyTiers[_index] = _value;
        return true;
    }

    function setMaxExpansionTiersEntry(uint8 _index, uint256 _value) external onlyOperator returns (bool) {
        require(_index >= 0, "Index has to be higher than 0");
        require(_index < 7, "Index has to be lower than count of tiers");
        require(_value >= 10 && _value <= 1000, "_value: out of range"); // [0.1%, 10%]
        maxExpansionTiers[_index] = _value;
        return true;
    }

    function setBondDepletionFloorPercent(uint256 _bondDepletionFloorPercent) external onlyOperator {
        require(_bondDepletionFloorPercent >= 500 && _bondDepletionFloorPercent <= 10000, "out of range"); // [5%, 100%]
        bondDepletionFloorPercent = _bondDepletionFloorPercent;
    }

    function setMaxSupplyContractionPercent(uint256 _maxSupplyContractionPercent) external onlyOperator {
        require(_maxSupplyContractionPercent >= 100 && _maxSupplyContractionPercent <= 1500, "out of range"); // [0.1%, 15%]
        maxSupplyContractionPercent = _maxSupplyContractionPercent;
    }

    function setMaxDebtRatioPercent(uint256 _maxDebtRatioPercent) external onlyOperator {
        require(_maxDebtRatioPercent >= 1000 && _maxDebtRatioPercent <= 10000, "out of range"); // [10%, 100%]
        maxDebtRatioPercent = _maxDebtRatioPercent;
    }

    function setBootstrap(uint256 _bootstrapEpochs, uint256 _bootstrapSupplyExpansionPercent) external onlyOperator {
        require(_bootstrapEpochs <= 120, "_bootstrapEpochs: out of range"); // <= 1 month
        require(_bootstrapSupplyExpansionPercent >= 100 && _bootstrapSupplyExpansionPercent <= 1000, "_bootstrapSupplyExpansionPercent: out of range"); // [1%, 10%]
        bootstrapEpochs = _bootstrapEpochs;
        bootstrapSupplyExpansionPercent = _bootstrapSupplyExpansionPercent;
    }
    //======================================================================
    function setExtraFunds(
        address _daoFund,
        uint256 _daoFundSharedPercent,
        address _devFund,
        uint256 _devFundSharedPercent,
        address _teamFund,
        uint256 _teamFundSharedPercent
    ) external onlyOperator {
        require(_daoFund != address(0), "zero");
        require(_daoFundSharedPercent <= 1500, "out of range");
        require(_devFund != address(0), "zero");
        require(_devFundSharedPercent <= 350, "out of range");
        require(_teamFund != address(0), "zero");
        require(_teamFundSharedPercent <= 550, "out of range");

        daoFund = _daoFund;
        daoFundSharedPercent = _daoFundSharedPercent;
        devFund = _devFund;
        devFundSharedPercent = _devFundSharedPercent;
        teamFund = _teamFund;
        teamFundSharedPercent = _teamFundSharedPercent;
    }

    function setMaxDiscountRate(uint256 _maxDiscountRate) external onlyOperator {
        require(_maxDiscountRate <= 20000, "_maxDiscountRate is over 200%");
        maxDiscountRate = _maxDiscountRate;
    }

    function setMaxPremiumRate(uint256 _maxPremiumRate) external onlyOperator {
        require(_maxPremiumRate <= 20000, "_maxPremiumRate is over 200%");
        maxPremiumRate = _maxPremiumRate;
    }

    function setDiscountPercent(uint256 _discountPercent) external onlyOperator {
        require(_discountPercent <= 20000, "_discountPercent is over 200%");
        discountPercent = _discountPercent;
    }

    function setPremiumThreshold(uint256 _premiumThreshold) external onlyOperator {
        require(_premiumThreshold >= arbtPriceCeiling, "_premiumThreshold exceeds arbtPriceCeiling");
        require(_premiumThreshold <= 150, "_premiumThreshold is higher than 1.5");
        premiumThreshold = _premiumThreshold;
    }

    function setPremiumPercent(uint256 _premiumPercent) external onlyOperator {
        require(_premiumPercent <= 20000, "_premiumPercent is over 200%");
        premiumPercent = _premiumPercent;
    }

    function setMintingFactorForPayingDebt(uint256 _mintingFactorForPayingDebt) external onlyOperator {
        require(_mintingFactorForPayingDebt >= 10000 && _mintingFactorForPayingDebt <= 20000, "_mintingFactorForPayingDebt: out of range"); // [100%, 200%]
        mintingFactorForPayingDebt = _mintingFactorForPayingDebt;
    }

    /* ========== MUTABLE FUNCTIONS ========== */

    function _updateARBtPrice() internal {
        try IOracle(arbtOracle).update() {} catch {}
    }

    function getARBtCirculatingSupply() public view returns (uint256) {
        IERC20 arbtErc20 = IERC20(arbt);
        uint256 totalSupply = arbtErc20.totalSupply();
        uint256 balanceExcluded = 0;
        for (uint8 entryId = 0; entryId < excludedFromTotalSupply.length; ++entryId) {
            balanceExcluded = balanceExcluded.add(arbtErc20.balanceOf(excludedFromTotalSupply[entryId]));
        }
        return totalSupply.sub(balanceExcluded);
    }

    function buyBonds(uint256 _arbtAmount, uint256 targetPrice) external onlyOneBlock checkCondition checkOperator {
        require(_arbtAmount > 0, "Treasury: cannot purchase bonds with zero amount");

        uint256 arbtPrice = getARBtPrice();
        require(arbtPrice == targetPrice, "Treasury: ARBt price moved");
        require(
            arbtPrice < arbtPriceOne, // price < $1
            "Treasury: arbtPrice not eligible for bond purchase"
        );

        require(_arbtAmount <= epochSupplyContractionLeft, "Treasury: not enough bond left to purchase");

        uint256 _rate = getBondDiscountRate();
        require(_rate > 0, "Treasury: invalid bond rate");

        uint256 _bondAmount = _arbtAmount.mul(_rate).div(1e18);
        uint256 arbtSupply = getARBtCirculatingSupply();
        uint256 newBondSupply = IERC20(arbBond).totalSupply().add(_bondAmount);
        require(newBondSupply <= arbtSupply.mul(maxDebtRatioPercent).div(10000), "over max debt ratio");

        IBasisAsset(arbt).burnFrom(msg.sender, _arbtAmount);
        IBasisAsset(arbBond).mint(msg.sender, _bondAmount);

        epochSupplyContractionLeft = epochSupplyContractionLeft.sub(_arbtAmount);
        _updateARBtPrice();

        emit BoughtBonds(msg.sender, _arbtAmount, _bondAmount);
    }

    function redeemBonds(uint256 _bondAmount, uint256 targetPrice) external onlyOneBlock checkCondition checkOperator {
        require(_bondAmount > 0, "Treasury: cannot redeem bonds with zero amount");

        uint256 arbtPrice = getARBtPrice();
        require(arbtPrice == targetPrice, "Treasury: ARBt price moved");
        require(
            arbtPrice > arbtPriceCeiling, // price > $1.01
            "Treasury: arbtPrice not eligible for bond purchase"
        );

        uint256 _rate = getBondPremiumRate();
        require(_rate > 0, "Treasury: invalid bond rate");

        uint256 _arbtAmount = _bondAmount.mul(_rate).div(1e18);
        require(IERC20(arbt).balanceOf(address(this)) >= _arbtAmount, "Treasury: treasury has no more budget");

        seigniorageSaved = seigniorageSaved.sub(Math.min(seigniorageSaved, _arbtAmount));

        IBasisAsset(arbBond).burnFrom(msg.sender, _bondAmount);
        IERC20(arbt).safeTransfer(msg.sender, _arbtAmount);

        _updateARBtPrice();

        emit RedeemedBonds(msg.sender, _arbtAmount, _bondAmount);
    }

    function _sendToAcropolis(uint256 _amount) internal {
        IBasisAsset(arbt).mint(address(this), _amount);

        uint256 _daoFundSharedAmount = 0;
        if (daoFundSharedPercent > 0) {
            _daoFundSharedAmount = _amount.mul(daoFundSharedPercent).div(10000);
            IERC20(arbt).transfer(daoFund, _daoFundSharedAmount);
            emit DaoFundFunded(block.timestamp, _daoFundSharedAmount);
        }

        uint256 _devFundSharedAmount = 0;
        if (devFundSharedPercent > 0) {
            _devFundSharedAmount = _amount.mul(devFundSharedPercent).div(10000);
            IERC20(arbt).transfer(devFund, _devFundSharedAmount);
            emit DevFundFunded(block.timestamp, _devFundSharedAmount);
        }

        uint256 _teamFundSharedAmount = 0;
        if (teamFundSharedPercent > 0) {
            _teamFundSharedAmount = _amount.mul(teamFundSharedPercent).div(10000);
            IERC20(arbt).transfer(teamFund, _teamFundSharedAmount);
            emit TeamFundFunded(block.timestamp, _teamFundSharedAmount);
        }

        _amount = _amount.sub(_daoFundSharedAmount).sub(_devFundSharedAmount).sub(_teamFundSharedAmount);

        IERC20(arbt).safeApprove(boardroom, 0);
        IERC20(arbt).safeApprove(boardroom, _amount);
        IBoardroom(boardroom).allocateSeigniorage(_amount);
        emit AcropolisFunded(block.timestamp, _amount);
    }

    function _calculateMaxSupplyExpansionPercent(uint256 _arbtSupply) internal returns (uint256) {
        for (uint8 tierId = 6; tierId >= 0; --tierId) {
            if (_arbtSupply >= supplyTiers[tierId]) {
                maxSupplyExpansionPercent = maxExpansionTiers[tierId];
                break;
            }
        }
        return maxSupplyExpansionPercent;
    }

    function allocateSeigniorage() external onlyOneBlock checkCondition checkEpoch checkOperator {
        _updateARBtPrice();
        previousEpochARBtPrice = getARBtPrice();
        uint256 arbtSupply = getARBtCirculatingSupply().sub(seigniorageSaved);
        if (epoch < bootstrapEpochs) {
            // 14 first epochs with 6% expansion
            _sendToAcropolis(arbtSupply.mul(bootstrapSupplyExpansionPercent).div(10000));
        } else {
            if (previousEpochARBtPrice > arbtPriceCeiling) {
                // Expansion ($ARBt Price > 1 $FTM): there is some seigniorage to be allocated
                uint256 bondSupply = IERC20(arbBond).totalSupply();
                uint256 _percentage = previousEpochARBtPrice.sub(arbtPriceOne);
                uint256 _savedForBond;
                uint256 _savedForAcropolis;
                uint256 _mse = _calculateMaxSupplyExpansionPercent(arbtSupply).mul(1e14);
                if (_percentage > _mse) {
                    _percentage = _mse;
                }
                if (seigniorageSaved >= bondSupply.mul(bondDepletionFloorPercent).div(10000)) {
                    // saved enough to pay debt, mint as usual rate
                    _savedForAcropolis = arbtSupply.mul(_percentage).div(1e18);
                } else {
                    // have not saved enough to pay debt, mint more
                    uint256 _seigniorage = arbtSupply.mul(_percentage).div(1e18);
                    _savedForAcropolis = _seigniorage.mul(seigniorageExpansionFloorPercent).div(10000);
                    _savedForBond = _seigniorage.sub(_savedForAcropolis);
                    if (mintingFactorForPayingDebt > 0) {
                        _savedForBond = _savedForBond.mul(mintingFactorForPayingDebt).div(10000);
                    }
                }
                if (_savedForAcropolis > 0) {
                    _sendToAcropolis(_savedForAcropolis);
                }
                if (_savedForBond > 0) {
                    seigniorageSaved = seigniorageSaved.add(_savedForBond);
                    IBasisAsset(arbt).mint(address(this), _savedForBond);
                    emit TreasuryFunded(block.timestamp, _savedForBond);
                }
            }
        }
    }
    //===================================================================================================================================

    function governanceRecoverUnsupported(
        IERC20 _token,
        uint256 _amount,
        address _to
    ) external onlyOperator {
        // do not allow to drain core tokens
        require(address(_token) != address(arbt), "arbt");
        require(address(_token) != address(arbBond), "bond");
        require(address(_token) != address(arbShare), "share");
        _token.safeTransfer(_to, _amount);
    }

    function boardroomSetOperator(address _operator) external onlyOperator {
        IBoardroom(boardroom).setOperator(_operator);
    }

    function boardroomSetLockUp(uint256 _withdrawLockupEpochs, uint256 _rewardLockupEpochs) external onlyOperator {
        IBoardroom(boardroom).setLockUp(_withdrawLockupEpochs, _rewardLockupEpochs);
    }

    function boardroomAllocateSeigniorage(uint256 amount) external onlyOperator {
        IBoardroom(boardroom).allocateSeigniorage(amount);
    }

    function boardroomGovernanceRecoverUnsupported(
        address _token,
        uint256 _amount,
        address _to
    ) external onlyOperator {
        IBoardroom(boardroom).governanceRecoverUnsupported(_token, _amount, _to);
    }
}