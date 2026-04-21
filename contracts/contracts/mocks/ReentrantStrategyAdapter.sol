// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IStrategyAdapter} from "../interfaces/IStrategyAdapter.sol";

interface IVaultDeposit {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
}

interface IVaultRedeem {
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
}

/// @title Reentrant Strategy Adapter
/// @notice Test-only adapter that attempts to reenter the vault during deployToStrategy.
contract ReentrantStrategyAdapter is IStrategyAdapter, Ownable {
    using SafeERC20 for IERC20;

    IERC20 private immutable _assetToken;
    address public vault;
    address public receiver;
    uint256 public reenterAssets;
    uint256 public reenterShares;
    bool private _hasReentered;

    error VaultNotSet();
    error UnauthorizedCaller(address caller);

    constructor(address asset_, address receiver_) Ownable(msg.sender) {
        _assetToken = IERC20(asset_);
        receiver = receiver_;
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

    function setVault(address vault_) external onlyOwner {
        vault = vault_;
    }

    function setReentry(uint256 assets, address receiver_) external onlyOwner {
        reenterAssets = assets;
        reenterShares = 0;
        receiver = receiver_;
        _hasReentered = false;
    }

    function setRedeemReentry(uint256 shares, address receiver_) external onlyOwner {
        reenterAssets = 0;
        reenterShares = shares;
        receiver = receiver_;
        _hasReentered = false;
    }

    function asset() external view returns (address) {
        return address(_assetToken);
    }

    function totalAssets() external view returns (uint256) {
        return _assetToken.balanceOf(address(this));
    }

    function deposit(uint256 assets) external onlyVault returns (uint256 depositedAssets) {
        depositedAssets = assets;

        if (!_hasReentered && reenterAssets != 0) {
            _hasReentered = true;
            _assetToken.forceApprove(vault, reenterAssets);
            IVaultDeposit(vault).deposit(reenterAssets, receiver);
        }
    }

    function withdrawTo(address receiver_, uint256 assets) external onlyVault returns (uint256 withdrawnAssets) {
        withdrawnAssets = assets;

        if (!_hasReentered && reenterShares != 0) {
            _hasReentered = true;
            IVaultRedeem(vault).redeem(reenterShares, receiver, receiver);
        }

        _assetToken.safeTransfer(receiver_, assets);
    }
}
