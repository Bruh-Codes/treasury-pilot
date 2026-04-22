// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IStrategyAdapter} from "../interfaces/IStrategyAdapter.sol";

/// @title Mock Strategy Adapter
/// @notice Simple test adapter that holds assets directly and exposes the same
///         interface expected from production strategy adapters.
contract MockStrategyAdapter is IStrategyAdapter, Ownable {
    using SafeERC20 for IERC20;

    IERC20 private immutable _assetToken;
    address public vault;

    error VaultNotSet();
    error UnauthorizedCaller(address caller);

    event VaultSet(address indexed vault);
    event Deposited(address indexed vault, uint256 assets);
    event Withdrawn(address indexed vault, address indexed receiver, uint256 assets);
    event LossSwept(address indexed recipient, uint256 assets);

    /// @param asset_ ERC-20 asset managed by this mock adapter.
    constructor(address asset_) Ownable(msg.sender) {
        _assetToken = IERC20(asset_);
    }

    modifier onlyVault() {
        if (vault == address(0)) {
            revert VaultNotSet();
        }

        if (msg.sender != vault) {
            revert UnauthorizedCaller(msg.sender);
        }

        _;
    }

    /// @notice Assigns the vault allowed to call deposit and withdraw functions.
    /// @param vault_ Vault address.
    function setVault(address vault_) external onlyOwner {
        vault = vault_;
        emit VaultSet(vault_);
    }

    /// @inheritdoc IStrategyAdapter
    function asset() external view returns (address) {
        return address(_assetToken);
    }

    /// @inheritdoc IStrategyAdapter
    function totalAssets() external view returns (uint256) {
        return _assetToken.balanceOf(address(this));
    }

    /// @inheritdoc IStrategyAdapter
    function deposit(uint256 assets) external onlyVault returns (uint256 depositedAssets) {
        depositedAssets = assets;
        emit Deposited(msg.sender, assets);
    }

    /// @inheritdoc IStrategyAdapter
    function withdrawTo(address receiver, uint256 assets) external onlyVault returns (uint256 withdrawnAssets) {
        withdrawnAssets = assets;
        _assetToken.safeTransfer(receiver, assets);
        emit Withdrawn(msg.sender, receiver, assets);
    }

    /// @notice Test helper to simulate a strategy loss by removing assets from the adapter.
    function sweepLoss(address recipient, uint256 assets) external onlyOwner {
        _assetToken.safeTransfer(recipient, assets);
        emit LossSwept(recipient, assets);
    }
}
