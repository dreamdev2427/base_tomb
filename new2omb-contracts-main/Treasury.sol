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
        address(0x141dc0287C9B1a66348F5Cad9bB7F651642e21F4) // BondGenesisPool
    ];

    // core components
    address public bomb;
    address public bBond;
    address public bShare;

    address public boardroom;
    address public bombOracle;

    // price
    uint256 public bombPriceOne;
    uint256 public bombPriceCeiling;

    uint256 public seigniorageSaved;

    uint256[] public supplyTiers;
    uint256[] public maxExpansionTiers;

    uint256 public maxSupplyExpansionPercent;
    uint256 public bondDepletionFloorPercent;
    uint256 public seigniorageExpansionFloorPercent;
    uint256 public maxSupplyContractionPercent;
    uint256 public maxDebtRatioPercent;

    // 14 first epochs (0.5 week) with 4.5% expansion regardless of Bomb price
    uint256 public bootstrapEpochs;
    uint256 public bootstrapSupplyExpansionPercent;

    /* =================== Added variables =================== */
    uint256 public previousEpochBombPrice;
    uint256 public maxDiscountRate; // when purchasing bond
    uint256 public maxPremiumRate;  // when redeeming bond
    uint256 public discountPercent;
    uint256 public premiumThreshold;
    uint256 public premiumPercent;
    uint256 public mintingFactorForPayingDebt; // print extra Bomb during debt phase

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
    event RedeemedBonds(address indexed from, uint256 bombAmount, uint256 bondAmount);
    event BoughtBonds(address indexed from, uint256 bombAmount, uint256 bondAmount);
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
        epochSupplyContractionLeft = (getBombPrice() > bombPriceCeiling) ? 0 : getBombCirculatingSupply().mul(maxSupplyContractionPercent).div(10000);
    }

    modifier checkOperator {
        require(
                IBasisAsset(bomb).operator() == address(this) &&
                IBasisAsset(bBond).operator() == address(this) &&
                IBasisAsset(bShare).operator() == address(this) &&
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
    function getBombPrice() public view returns (uint256 bombPrice) {
        try IOracle(bombOracle).consult(bomb, 1e18) returns (uint144 price) {
            return uint256(price);
        } catch {
            revert("Treasury: failed to consult Bomb price from the oracle");
        }
    }

    function getBombUpdatedPrice() public view returns (uint256 _bombPrice) {
        try IOracle(bombOracle).twap(bomb, 1e18) returns (uint144 price) {
            return uint256(price);
        } catch {
            revert("Treasury: failed to consult Bomb price from the oracle");
        }
    }

    // budget
    function getReserve() public view returns (uint256) {
        return seigniorageSaved;
    }

    function getBurnableBombLeft() public view returns (uint256 _burnableBombLeft) {
        uint256 _bombPrice = getBombPrice();
        if (_bombPrice <= bombPriceOne) {
            uint256 _bombSupply = getBombCirculatingSupply();
            uint256 _bondMaxSupply = _bombSupply.mul(maxDebtRatioPercent).div(10000);
            uint256 _bondSupply = IERC20(bBond).totalSupply();
            if (_bondMaxSupply > _bondSupply) {
                uint256 _maxMintableBond = _bondMaxSupply.sub(_bondSupply);
                uint256 _maxBurnableBomb = _maxMintableBond.mul(_bombPrice).div(1e18);
                _burnableBombLeft = Math.min(epochSupplyContractionLeft, _maxBurnableBomb);
            }
        }
    }

    function getRedeemableBonds() public view returns (uint256 _redeemableBonds) {
        uint256 _bombPrice = getBombPrice();
        if (_bombPrice > bombPriceCeiling) {
            uint256 _totalBomb = IERC20(bomb).balanceOf(address(this));
            uint256 _rate = getBondPremiumRate();
            if (_rate > 0) {
                _redeemableBonds = _totalBomb.mul(1e18).div(_rate);
            }
        }
    }

    function getBondDiscountRate() public view returns (uint256 _rate) {
        uint256 _bombPrice = getBombPrice();
        if (_bombPrice <= bombPriceOne) {
            if (discountPercent == 0) {
                // no discount
                _rate = bombPriceOne;
            } else {
                uint256 _bondAmount = bombPriceOne.mul(1e18).div(_bombPrice); // to burn 1 Bomb
                uint256 _discountAmount = _bondAmount.sub(bombPriceOne).mul(discountPercent).div(10000);
                _rate = bombPriceOne.add(_discountAmount);
                if (maxDiscountRate > 0 && _rate > maxDiscountRate) {
                    _rate = maxDiscountRate;
                }
            }
        }
    }

    function getBondPremiumRate() public view returns (uint256 _rate) {
        uint256 _bombPrice = getBombPrice();
        if (_bombPrice > bombPriceCeiling) {
            uint256 _bombPricePremiumThreshold = bombPriceOne.mul(premiumThreshold).div(100);
            if (_bombPrice >= _bombPricePremiumThreshold) {
                //Price > 1.10
                uint256 _premiumAmount = _bombPrice.sub(bombPriceOne).mul(premiumPercent).div(10000);
                _rate = bombPriceOne.add(_premiumAmount);
                if (maxPremiumRate > 0 && _rate > maxPremiumRate) {
                    _rate = maxPremiumRate;
                }
            } else {
                // no premium bonus
                _rate = bombPriceOne;
            }
        }
    }

    /* ========== GOVERNANCE ========== */

    function initialize(
        address _bomb,
        address _bBond,
        address _bShare,
        address _bombOracle,
        address _boardroom,
        uint256 _startTime
    ) public notInitialized onlyOperator {
        bomb = _bomb;
        bBond = _bBond;
        bShare = _bShare;
        bombOracle = _bombOracle;
        boardroom = _boardroom;
        startTime = _startTime;

        bombPriceOne = 10 ** 18;
        bombPriceCeiling = bombPriceOne.mul(101).div(100);

        // Dynamic max expansion percent
        supplyTiers = [0 ether, 206000 ether, 386000 ether, 530000 ether, 1300000 ether, 5000000 ether, 10000000 ether];
        maxExpansionTiers = [600, 500, 450, 400, 200, 100, 50];

        maxSupplyExpansionPercent = 600; // Upto 6% supply for expansion

        bondDepletionFloorPercent = 10000; // 100% of Bond supply for depletion floor
        seigniorageExpansionFloorPercent = 3500; // At least 35% of expansion reserved for boardroom
        maxSupplyContractionPercent = 300; // Upto 3.0% supply for contraction (to burn Bomb and mint BBond)
        maxDebtRatioPercent = 3500; // Upto 35% supply of BBond to purchase

        premiumThreshold = 110;
        premiumPercent = 7000;

        // First 14 epochs with 6% expansion
        bootstrapEpochs = 14;
        bootstrapSupplyExpansionPercent = 600;

        // set seigniorageSaved to it's balance
        seigniorageSaved = IERC20(bomb).balanceOf(address(this));

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

    function setBombOracle(address _bombOracle) external onlyOperator {
        bombOracle = _bombOracle;
    }

    function setBombPriceCeiling(uint256 _bombPriceCeiling) external onlyOperator {
        require(_bombPriceCeiling >= bombPriceOne && _bombPriceCeiling <= bombPriceOne.mul(120).div(100), "out of range"); // [$1.0, $1.2]
        bombPriceCeiling = _bombPriceCeiling;
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
        require(_premiumThreshold >= bombPriceCeiling, "_premiumThreshold exceeds bombPriceCeiling");
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

    function _updateBombPrice() internal {
        try IOracle(bombOracle).update() {} catch {}
    }

    function getBombCirculatingSupply() public view returns (uint256) {
        IERC20 bombErc20 = IERC20(bomb);
        uint256 totalSupply = bombErc20.totalSupply();
        uint256 balanceExcluded = 0;
        for (uint8 entryId = 0; entryId < excludedFromTotalSupply.length; ++entryId) {
            balanceExcluded = balanceExcluded.add(bombErc20.balanceOf(excludedFromTotalSupply[entryId]));
        }
        return totalSupply.sub(balanceExcluded);
    }

    function buyBonds(uint256 _bombAmount, uint256 targetPrice) external onlyOneBlock checkCondition checkOperator {
        require(_bombAmount > 0, "Treasury: cannot purchase bonds with zero amount");

        uint256 bombPrice = getBombPrice();
        require(bombPrice == targetPrice, "Treasury: Bomb price moved");
        require(
            bombPrice < bombPriceOne, // price < $1
            "Treasury: bombPrice not eligible for bond purchase"
        );

        require(_bombAmount <= epochSupplyContractionLeft, "Treasury: not enough bond left to purchase");

        uint256 _rate = getBondDiscountRate();
        require(_rate > 0, "Treasury: invalid bond rate");

        uint256 _bondAmount = _bombAmount.mul(_rate).div(1e18);
        uint256 bombSupply = getBombCirculatingSupply();
        uint256 newBondSupply = IERC20(bBond).totalSupply().add(_bondAmount);
        require(newBondSupply <= bombSupply.mul(maxDebtRatioPercent).div(10000), "over max debt ratio");

        IBasisAsset(bomb).burnFrom(msg.sender, _bombAmount);
        IBasisAsset(bBond).mint(msg.sender, _bondAmount);

        epochSupplyContractionLeft = epochSupplyContractionLeft.sub(_bombAmount);
        _updateBombPrice();

        emit BoughtBonds(msg.sender, _bombAmount, _bondAmount);
    }

    function redeemBonds(uint256 _bondAmount, uint256 targetPrice) external onlyOneBlock checkCondition checkOperator {
        require(_bondAmount > 0, "Treasury: cannot redeem bonds with zero amount");

        uint256 bombPrice = getBombPrice();
        require(bombPrice == targetPrice, "Treasury: Bomb price moved");
        require(
            bombPrice > bombPriceCeiling, // price > $1.01
            "Treasury: bombPrice not eligible for bond purchase"
        );

        uint256 _rate = getBondPremiumRate();
        require(_rate > 0, "Treasury: invalid bond rate");

        uint256 _bombAmount = _bondAmount.mul(_rate).div(1e18);
        require(IERC20(bomb).balanceOf(address(this)) >= _bombAmount, "Treasury: treasury has no more budget");

        seigniorageSaved = seigniorageSaved.sub(Math.min(seigniorageSaved, _bombAmount));

        IBasisAsset(bBond).burnFrom(msg.sender, _bondAmount);
        IERC20(bomb).safeTransfer(msg.sender, _bombAmount);

        _updateBombPrice();

        emit RedeemedBonds(msg.sender, _bombAmount, _bondAmount);
    }

    function _sendToAcropolis(uint256 _amount) internal {
        IBasisAsset(bomb).mint(address(this), _amount);

        uint256 _daoFundSharedAmount = 0;
        if (daoFundSharedPercent > 0) {
            _daoFundSharedAmount = _amount.mul(daoFundSharedPercent).div(10000);
            IERC20(bomb).transfer(daoFund, _daoFundSharedAmount);
            emit DaoFundFunded(block.timestamp, _daoFundSharedAmount);
        }

        uint256 _devFundSharedAmount = 0;
        if (devFundSharedPercent > 0) {
            _devFundSharedAmount = _amount.mul(devFundSharedPercent).div(10000);
            IERC20(bomb).transfer(devFund, _devFundSharedAmount);
            emit DevFundFunded(block.timestamp, _devFundSharedAmount);
        }

        uint256 _teamFundSharedAmount = 0;
        if (teamFundSharedPercent > 0) {
            _teamFundSharedAmount = _amount.mul(teamFundSharedPercent).div(10000);
            IERC20(bomb).transfer(teamFund, _teamFundSharedAmount);
            emit TeamFundFunded(block.timestamp, _teamFundSharedAmount);
        }

        _amount = _amount.sub(_daoFundSharedAmount).sub(_devFundSharedAmount).sub(_teamFundSharedAmount);

        IERC20(bomb).safeApprove(boardroom, 0);
        IERC20(bomb).safeApprove(boardroom, _amount);
        IBoardroom(boardroom).allocateSeigniorage(_amount);
        emit AcropolisFunded(block.timestamp, _amount);
    }

    function _calculateMaxSupplyExpansionPercent(uint256 _bombSupply) internal returns (uint256) {
        for (uint8 tierId = 6; tierId >= 0; --tierId) {
            if (_bombSupply >= supplyTiers[tierId]) {
                maxSupplyExpansionPercent = maxExpansionTiers[tierId];
                break;
            }
        }
        return maxSupplyExpansionPercent;
    }

    function allocateSeigniorage() external onlyOneBlock checkCondition checkEpoch checkOperator {
        _updateBombPrice();
        previousEpochBombPrice = getBombPrice();
        uint256 bombSupply = getBombCirculatingSupply().sub(seigniorageSaved);
        if (epoch < bootstrapEpochs) {
            // 14 first epochs with 6% expansion
            _sendToAcropolis(bombSupply.mul(bootstrapSupplyExpansionPercent).div(10000));
        } else {
            if (previousEpochBombPrice > bombPriceCeiling) {
                // Expansion ($Bomb Price > 1 $FTM): there is some seigniorage to be allocated
                uint256 bondSupply = IERC20(bBond).totalSupply();
                uint256 _percentage = previousEpochBombPrice.sub(bombPriceOne);
                uint256 _savedForBond;
                uint256 _savedForAcropolis;
                uint256 _mse = _calculateMaxSupplyExpansionPercent(bombSupply).mul(1e14);
                if (_percentage > _mse) {
                    _percentage = _mse;
                }
                if (seigniorageSaved >= bondSupply.mul(bondDepletionFloorPercent).div(10000)) {
                    // saved enough to pay debt, mint as usual rate
                    _savedForAcropolis = bombSupply.mul(_percentage).div(1e18);
                } else {
                    // have not saved enough to pay debt, mint more
                    uint256 _seigniorage = bombSupply.mul(_percentage).div(1e18);
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
                    IBasisAsset(bomb).mint(address(this), _savedForBond);
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
        require(address(_token) != address(bomb), "bomb");
        require(address(_token) != address(bBond), "bbond");
        require(address(_token) != address(bShare), "bshare");
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