// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Strategy Adapter Interface
/// @notice Standard interface used by the shared Kabon vault to interact with
///         whitelisted yield destinations.
interface IStrategyAdapter {
    /// @notice Returns the asset managed by the strategy.
    /// @return The ERC-20 asset address accepted by the adapter.
    function asset() external view returns (address);

    /// @notice Returns the strategy's current asset balance.
    /// @return The total assets currently held inside the strategy.
    function totalAssets() external view returns (uint256);

    /// @notice Finalizes a deposit after assets have already been transferred into the strategy.
    /// @param assets The asset amount to deposit.
    /// @return depositedAssets The amount accepted by the strategy.
    function deposit(uint256 assets) external returns (uint256 depositedAssets);

    /// @notice Sends assets from the strategy to a receiver.
    /// @param receiver The destination account for withdrawn funds.
    /// @param assets The asset amount to withdraw.
    /// @return withdrawnAssets The amount sent to the receiver.
    function withdrawTo(address receiver, uint256 assets) external returns (uint256 withdrawnAssets);
}
