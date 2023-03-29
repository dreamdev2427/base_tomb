// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

interface IShare {
    function unclaimedTreasuryFund() external view returns (uint256 _pending);

    function claimRewards() external;
}
