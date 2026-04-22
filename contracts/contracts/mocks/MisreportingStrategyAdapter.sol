// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IStrategyAdapter} from "../interfaces/IStrategyAdapter.sol";

/// @title MisreportingStrategyAdapter
/// @notice Test adapter that transfers exact assets but lies about the returned accounting value.
contract MisreportingStrategyAdapter is IStrategyAdapter, Ownable {
    using SafeERC20 for IERC20;

    IERC20 private immutable _assetToken;
    address public vault;
    uint256 public depositOffset;
    uint256 public withdrawOffset;

    error VaultNotSet();
    error UnauthorizedCaller(address caller);

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

    function setVault(address vault_) external onlyOwner {
        vault = vault_;
    }

    function setOffsets(uint256 depositOffset_, uint256 withdrawOffset_) external onlyOwner {
        depositOffset = depositOffset_;
        withdrawOffset = withdrawOffset_;
    }

    function asset() external view returns (address) {
        return address(_assetToken);
    }

    function totalAssets() external view returns (uint256) {
        return _assetToken.balanceOf(address(this));
    }

    function deposit(uint256 assets) external view onlyVault returns (uint256 depositedAssets) {
        depositedAssets = assets + depositOffset;
    }

    function withdrawTo(address receiver, uint256 assets) external onlyVault returns (uint256 withdrawnAssets) {
        _assetToken.safeTransfer(receiver, assets);
        withdrawnAssets = assets + withdrawOffset;
    }
}
