// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IStrategyAdapter} from "./interfaces/IStrategyAdapter.sol";

interface IAaveV3Pool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;

    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

/// @title Aave V3 Strategy Adapter
/// @notice Vault-compatible adapter that routes a single ERC-20 asset into Aave V3.
contract AaveV3StrategyAdapter is IStrategyAdapter, Ownable {
    using SafeERC20 for IERC20;

    IERC20 private immutable _assetToken;
    IERC20 private immutable _aToken;
    IAaveV3Pool public immutable pool;
    address public immutable vault;

    error InvalidAddress();
    error UnauthorizedCaller(address caller);

    event Deposited(address indexed vault, uint256 assets);
    event Withdrawn(address indexed vault, address indexed receiver, uint256 assets);

    constructor(address asset_, address pool_, address aToken_, address vault_) Ownable(msg.sender) {
        if (asset_ == address(0) || pool_ == address(0) || aToken_ == address(0) || vault_ == address(0)) {
            revert InvalidAddress();
        }

        _assetToken = IERC20(asset_);
        _aToken = IERC20(aToken_);
        pool = IAaveV3Pool(pool_);
        vault = vault_;

        _assetToken.forceApprove(pool_, type(uint256).max);
    }

    modifier onlyVault() {
        if (msg.sender != vault) {
            revert UnauthorizedCaller(msg.sender);
        }
        _;
    }

    /// @inheritdoc IStrategyAdapter
    function asset() external view returns (address) {
        return address(_assetToken);
    }

    /// @inheritdoc IStrategyAdapter
    function totalAssets() external view returns (uint256) {
        return _aToken.balanceOf(address(this));
    }

    /// @inheritdoc IStrategyAdapter
    function deposit(uint256 assets) external onlyVault returns (uint256 depositedAssets) {
        pool.supply(address(_assetToken), assets, address(this), 0);
        depositedAssets = assets;
        emit Deposited(msg.sender, assets);
    }

    /// @inheritdoc IStrategyAdapter
    function withdrawTo(address receiver, uint256 assets) external onlyVault returns (uint256 withdrawnAssets) {
        withdrawnAssets = pool.withdraw(address(_assetToken), assets, receiver);
        emit Withdrawn(msg.sender, receiver, withdrawnAssets);
    }
}
