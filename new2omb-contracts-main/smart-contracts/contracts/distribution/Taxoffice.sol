// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "../lib/SafeMath.sol";
import "../owner/Operator.sol";
import "../interfaces/ITaxable.sol";
import "../interfaces/ICamelotRouter.sol";
import "../interfaces/IERC20.sol";

contract TaxOfficeV2 is Operator {
    using SafeMath for uint256;

    address public tomb = address(0x78034f119C109f5C71620fE1df472C0eC9331e40);
    address public weth = address(0x82aF49447D8a07e3bd95BD0d56f35241523fBab1);
    address public camelotRouter = address(0xc873fEcbd354f5A56E00E710B90EF4201db2448d);

    mapping(address => bool) public taxExclusionEnabled;

    function setTaxTiersTwap(uint8 _index, uint256 _value) public onlyOperator returns (bool) {
        return ITaxable(tomb).setTaxTiersTwap(_index, _value);
    }

    function setTaxTiersRate(uint8 _index, uint256 _value) public onlyOperator returns (bool) {
        return ITaxable(tomb).setTaxTiersRate(_index, _value);
    }

    function enableAutoCalculateTax() public onlyOperator {
        ITaxable(tomb).enableAutoCalculateTax();
    }

    function disableAutoCalculateTax() public onlyOperator {
        ITaxable(tomb).disableAutoCalculateTax();
    }

    function setTaxRate(uint256 _taxRate) public onlyOperator {
        ITaxable(tomb).setTaxRate(_taxRate);
    }

    function setBurnThreshold(uint256 _burnThreshold) public onlyOperator {
        ITaxable(tomb).setBurnThreshold(_burnThreshold);
    }

    function setTaxCollectorAddress(address _taxCollectorAddress) public onlyOperator {
        ITaxable(tomb).setTaxCollectorAddress(_taxCollectorAddress);
    }

    function excludeAddressFromTax(address _address) external onlyOperator returns (bool) {
        return _excludeAddressFromTax(_address);
    }

    function _excludeAddressFromTax(address _address) private returns (bool) {
        if (!ITaxable(tomb).isAddressExcluded(_address)) {
            return ITaxable(tomb).excludeAddress(_address);
        }
    }

    function includeAddressInTax(address _address) external onlyOperator returns (bool) {
        return _includeAddressInTax(_address);
    }

    function _includeAddressInTax(address _address) private returns (bool) {
        if (ITaxable(tomb).isAddressExcluded(_address)) {
            return ITaxable(tomb).includeAddress(_address);
        }
    }

    function taxRate() external view returns (uint256) {
        return ITaxable(tomb).taxRate();
    }

    function addLiquidityTaxFree(
        address token,
        uint256 amtTomb,
        uint256 amtToken,
        uint256 amtTombMin,
        uint256 amtTokenMin
    )
        external
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        require(amtTomb != 0 && amtToken != 0, "amounts can't be 0");
        _excludeAddressFromTax(msg.sender);

        IERC20(tomb).transferFrom(msg.sender, address(this), amtTomb);
        IERC20(token).transferFrom(msg.sender, address(this), amtToken);
        _approveTokenIfNeeded(tomb, camelotRouter);
        _approveTokenIfNeeded(token, camelotRouter);

        _includeAddressInTax(msg.sender);

        uint256 resultAmtTomb;
        uint256 resultAmtToken;
        uint256 liquidity;
        (resultAmtTomb, resultAmtToken, liquidity) = ICamelotRouter(camelotRouter).addLiquidity(
            tomb,
            token,
            amtTomb,
            amtToken,
            amtTombMin,
            amtTokenMin,
            msg.sender,
            block.timestamp
        );

        if(amtTomb.sub(resultAmtTomb) > 0) {
            IERC20(tomb).transfer(msg.sender, amtTomb.sub(resultAmtTomb));
        }
        if(amtToken.sub(resultAmtToken) > 0) {
            IERC20(token).transfer(msg.sender, amtToken.sub(resultAmtToken));
        }
        return (resultAmtTomb, resultAmtToken, liquidity);
    }

    function addLiquidityETHTaxFree(
        uint256 amtTomb,
        uint256 amtTombMin,
        uint256 amtFtmMin
    )
        external
        payable
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        require(amtTomb != 0 && msg.value != 0, "amounts can't be 0");
        _excludeAddressFromTax(msg.sender);

        IERC20(tomb).transferFrom(msg.sender, address(this), amtTomb);
        _approveTokenIfNeeded(tomb, camelotRouter);

        _includeAddressInTax(msg.sender);

        uint256 resultAmtTomb;
        uint256 resultAmtFtm;
        uint256 liquidity;
        (resultAmtTomb, resultAmtFtm, liquidity) = ICamelotRouter(camelotRouter).addLiquidityETH{value: msg.value}(
            tomb,
            amtTomb,
            amtTombMin,
            amtFtmMin,
            msg.sender,
            block.timestamp
        );

        if(amtTomb.sub(resultAmtTomb) > 0) {
            IERC20(tomb).transfer(msg.sender, amtTomb.sub(resultAmtTomb));
        }
        return (resultAmtTomb, resultAmtFtm, liquidity);
    }

    function setTaxableTombOracle(address _tombOracle) external onlyOperator {
        ITaxable(tomb).setTombOracle(_tombOracle);
    }

    function transferTaxOffice(address _newTaxOffice) external onlyOperator {
        ITaxable(tomb).setTaxOffice(_newTaxOffice);
    }

    function taxFreeTransferFrom(
        address _sender,
        address _recipient,
        uint256 _amt
    ) external {
        require(taxExclusionEnabled[msg.sender], "Address not approved for tax free transfers");
        _excludeAddressFromTax(_sender);
        IERC20(tomb).transferFrom(_sender, _recipient, _amt);
        _includeAddressInTax(_sender);
    }

    function setTaxExclusionForAddress(address _address, bool _excluded) external onlyOperator {
        taxExclusionEnabled[_address] = _excluded;
    }

    function _approveTokenIfNeeded(address _token, address _router) private {
        if (IERC20(_token).allowance(address(this), _router) == 0) {
            IERC20(_token).approve(_router, type(uint256).max);
        }
    }
}