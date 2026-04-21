// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {StorageSlot} from "@openzeppelin/contracts/utils/StorageSlot.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC4626Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {IStrategyAdapter} from "./interfaces/IStrategyAdapter.sol";
import {YieldPilotVaultStrategyManager} from "./YieldPilotVaultStrategyManager.sol";

/// @title YieldPilotVault
/// @notice Upgradeable shared vault that accepts a single ERC-20 asset, keeps an idle
///         withdrawal buffer, and can allocate funds across owner-whitelisted strategies.
/// @dev The vault exposes ERC-4626 style deposits and withdrawals. Idle liquidity is
///      used first during withdrawals, and active strategy positions are unwound only
///      when additional liquidity is required.
contract YieldPilotVault is
    Initializable,
    ERC20Upgradeable,
    ERC4626Upgradeable,
    OwnableUpgradeable,
    ReentrancyGuard,
    PausableUpgradeable,
    YieldPilotVaultStrategyManager
{
    using SafeERC20 for IERC20;

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ReentrancyGuard")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant _REENTRANCY_GUARD_STORAGE =
        0x9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00;
    uint256 private constant _NOT_ENTERED = 1;

    error InsufficientLiquidity(uint256 requestedAssets, uint256 availableAssets);

    /// @notice Initializes the vault implementation behind a transparent proxy.
    /// @param asset_ ERC-20 asset accepted by the vault.
    /// @param name_ ERC-20 name for vault shares.
    /// @param symbol_ ERC-20 symbol for vault shares.
    /// @param owner_ Account that can whitelist strategies and manage allocations.
    function initialize(address asset_, string memory name_, string memory symbol_, address owner_) external initializer {
        __ERC20_init(name_, symbol_);
        __ERC4626_init(IERC20(asset_));
        __Ownable_init(owner_);
        __Pausable_init();
        StorageSlot.getUint256Slot(_REENTRANCY_GUARD_STORAGE).value = _NOT_ENTERED;
    }

    /// @notice Returns the implementation version string.
    /// @return The current contract version identifier.
    function version() external pure virtual returns (string memory) {
        return "1.0.0";
    }

    /// @notice Returns the share token decimals.
    /// @return The decimals inherited from the underlying ERC-4626 configuration.
    function decimals() public view override(ERC20Upgradeable, ERC4626Upgradeable) returns (uint8) {
        return super.decimals();
    }

    /// @notice Returns the vault's unallocated asset balance.
    /// @return Asset amount currently held directly by the vault.
    function idleAssets() public view returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    /// @inheritdoc ERC4626Upgradeable
    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this)) + totalAllocatedAssets;
    }

    /// @notice Previews how a withdrawal would settle at the current point in time.
    /// @param requestedAssets Asset amount the user wants to withdraw.
    /// @return availableNow Amount that can be settled from idle vault liquidity.
    /// @return needsUnwind Amount that would require strategy unwinds.
    function previewSettlement(uint256 requestedAssets) external view returns (uint256 availableNow, uint256 needsUnwind) {
        uint256 idle = idleAssets();
        availableNow = requestedAssets < idle ? requestedAssets : idle;
        needsUnwind = requestedAssets > idle ? requestedAssets - idle : 0;
    }

    /// @notice Whitelists a strategy adapter for future allocations.
    /// @param strategy Strategy adapter address.
    function whitelistStrategy(address strategy) external onlyOwner {
        address vaultAsset = asset();
        if (strategy == address(0) || IStrategyAdapter(strategy).asset() != vaultAsset) {
            revert InvalidStrategy(strategy);
        }

        _addStrategyToWhitelist(strategy);
    }

    /// @notice Reorders the strategy unwind priority used when idle liquidity is insufficient.
    /// @param queue Ordered list of all currently active strategies.
    function setWithdrawalQueue(address[] calldata queue) external onlyOwner {
        _setWithdrawalQueue(queue);
    }

    /// @notice Pauses new deposits and strategy allocations while preserving withdrawals and recalls.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Resumes deposits and strategy allocations after a pause.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Allocates idle assets from the vault into a whitelisted strategy.
    /// @param strategy Strategy adapter address.
    /// @param assets Asset amount to deploy.
    /// @return deployedAssets Amount accepted by the strategy.
    function deployToStrategy(
        address strategy,
        uint256 assets
    ) external onlyOwner nonReentrant whenNotPaused returns (uint256 deployedAssets) {
        if (!isWhitelistedStrategy[strategy]) {
            revert StrategyNotWhitelisted(strategy);
        }

        IERC20 assetToken = IERC20(asset());
        _increaseStrategyAssets(strategy, assets);
        assetToken.safeTransfer(strategy, assets);
        deployedAssets = IStrategyAdapter(strategy).deposit(assets);

        if (deployedAssets > assets) {
            _increaseStrategyAssets(strategy, deployedAssets - assets);
        } else if (deployedAssets < assets) {
            _decreaseStrategyAssets(strategy, assets - deployedAssets);
        }

        emit StrategyAllocated(strategy, deployedAssets);
    }

    /// @notice Recalls assets from a whitelisted strategy back into the vault.
    /// @param strategy Strategy adapter address.
    /// @param assets Asset amount to recall.
    /// @return recalledAssets Amount returned to the vault.
    function recallFromStrategy(address strategy, uint256 assets) external onlyOwner nonReentrant returns (uint256 recalledAssets) {
        if (!isWhitelistedStrategy[strategy]) {
            revert StrategyNotWhitelisted(strategy);
        }

        recalledAssets = IStrategyAdapter(strategy).withdrawTo(address(this), assets);
        _decreaseStrategyAssets(strategy, recalledAssets);

        emit StrategyRecalled(strategy, recalledAssets);
    }

    /// @notice Reconciles cached vault accounting with a strategy's reported balance.
    /// @param strategy Strategy adapter address.
    /// @return currentAssets Strategy assets reported at sync time.
    function syncStrategyAssets(address strategy) external onlyOwner nonReentrant returns (uint256 currentAssets) {
        if (!isWhitelistedStrategy[strategy]) {
            revert StrategyNotWhitelisted(strategy);
        }

        uint256 previousAssets = strategyAssets[strategy];
        currentAssets = IStrategyAdapter(strategy).totalAssets();

        strategyAssets[strategy] = currentAssets;

        if (currentAssets == 0) {
            _removeActiveStrategy(strategy);
        } else {
            _addActiveStrategy(strategy);
        }

        if (currentAssets >= previousAssets) {
            unchecked {
                totalAllocatedAssets += currentAssets - previousAssets;
            }
        } else {
            unchecked {
                totalAllocatedAssets -= previousAssets - currentAssets;
            }
        }

        emit StrategySynced(strategy, previousAssets, currentAssets);
    }

    /// @inheritdoc ERC4626Upgradeable
    function maxDeposit(address receiver) public view override returns (uint256) {
        if (paused()) {
            return 0;
        }

        return super.maxDeposit(receiver);
    }

    /// @inheritdoc ERC4626Upgradeable
    function maxMint(address receiver) public view override returns (uint256) {
        if (paused()) {
            return 0;
        }

        return super.maxMint(receiver);
    }

    /// @inheritdoc ERC4626Upgradeable
    function deposit(uint256 assets, address receiver) public override nonReentrant returns (uint256) {
        return super.deposit(assets, receiver);
    }

    /// @inheritdoc ERC4626Upgradeable
    function mint(uint256 shares, address receiver) public override nonReentrant returns (uint256) {
        return super.mint(shares, receiver);
    }

    /// @inheritdoc ERC4626Upgradeable
    function withdraw(uint256 assets, address receiver, address owner) public override nonReentrant returns (uint256) {
        return super.withdraw(assets, receiver, owner);
    }

    /// @inheritdoc ERC4626Upgradeable
    function redeem(uint256 shares, address receiver, address owner) public override nonReentrant returns (uint256) {
        return super.redeem(shares, receiver, owner);
    }

    /// @dev Ensures enough liquidity is present before the ERC-4626 withdrawal settles.
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal override {
        _ensureLiquidity(assets);
        super._withdraw(caller, receiver, owner, assets, shares);
    }

    /// @dev Pulls funds back from strategies until the requested withdrawal can settle.
    /// @param assets Asset amount that needs to be liquid inside the vault.
    function _ensureLiquidity(uint256 assets) internal {
        uint256 idle = idleAssets();
        if (idle >= assets) {
            return;
        }

        uint256 remaining = assets - idle;
        uint256 strategyLength = _withdrawalQueueLength();

        for (uint256 i = 0; i < strategyLength; ) {
            address strategy = _withdrawalQueueAt(i);
            uint256 strategyBalance = strategyAssets[strategy];
            if (strategyBalance == 0) {
                unchecked {
                    ++i;
                }
                continue;
            }

            uint256 recallAmount = strategyBalance < remaining ? strategyBalance : remaining;
            uint256 recalledAssets = IStrategyAdapter(strategy).withdrawTo(address(this), recallAmount);
            _decreaseStrategyAssets(strategy, recalledAssets);

            emit StrategyRecalled(strategy, recalledAssets);

            if (recalledAssets >= remaining) {
                return;
            }

            remaining -= recalledAssets;

            unchecked {
                ++i;
            }
        }

        revert InsufficientLiquidity(assets, assets - remaining);
    }
}
