// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title YieldPilotVaultStrategyManager
/// @notice Shared storage and internal helpers for strategy registry, accounting, and unwind ordering.
abstract contract YieldPilotVaultStrategyManager {
    mapping(address => bool) public isWhitelistedStrategy;
    address[] private _strategies;
    address[] private _activeStrategies;
    address[] private _withdrawalQueue;
    mapping(address => uint256) public strategyAssets;
    mapping(address => uint256) internal _activeStrategyIndexPlusOne;
    mapping(address => uint256) internal _withdrawalQueueIndexPlusOne;
    uint256 public totalAllocatedAssets;

    error InvalidStrategy(address strategy);
    error StrategyAlreadyWhitelisted(address strategy);
    error StrategyNotWhitelisted(address strategy);
    error InvalidWithdrawalQueue();

    event StrategyWhitelisted(address indexed strategy);
    event StrategyAllocated(address indexed strategy, uint256 assets);
    event StrategyRecalled(address indexed strategy, uint256 assets);
    event StrategySynced(address indexed strategy, uint256 previousAssets, uint256 currentAssets);
    event WithdrawalQueueUpdated(address[] queue);

    /// @notice Returns all strategy addresses ever whitelisted for the vault.
    /// @return List of strategy adapter addresses.
    function strategies() external view returns (address[] memory) {
        return _strategies;
    }

    /// @notice Returns the list of strategies that currently hold vault capital.
    /// @return List of active strategy adapter addresses.
    function activeStrategies() external view returns (address[] memory) {
        return _activeStrategies;
    }

    /// @notice Returns the ordered strategy queue used during withdrawal unwinds.
    /// @return List of active strategy adapter addresses in unwind priority order.
    function withdrawalQueue() external view returns (address[] memory) {
        return _withdrawalQueue;
    }

    /// @notice Returns the assets currently deployed across all active strategies.
    /// @return total Sum of assets reported by whitelisted strategies.
    function totalStrategyAssets() public view returns (uint256 total) {
        return totalAllocatedAssets;
    }

    function _addStrategyToWhitelist(address strategy) internal {
        if (isWhitelistedStrategy[strategy]) {
            revert StrategyAlreadyWhitelisted(strategy);
        }

        isWhitelistedStrategy[strategy] = true;
        _strategies.push(strategy);

        emit StrategyWhitelisted(strategy);
    }

    function _setWithdrawalQueue(address[] calldata queue) internal {
        uint256 activeLength = _activeStrategies.length;
        if (queue.length != activeLength) {
            revert InvalidWithdrawalQueue();
        }

        for (uint256 i = 0; i < activeLength; ) {
            address strategy = _withdrawalQueue[i];
            delete _withdrawalQueueIndexPlusOne[strategy];

            unchecked {
                ++i;
            }
        }

        delete _withdrawalQueue;

        for (uint256 i = 0; i < activeLength; ) {
            address strategy = queue[i];
            if (_activeStrategyIndexPlusOne[strategy] == 0 || _withdrawalQueueIndexPlusOne[strategy] != 0) {
                revert InvalidWithdrawalQueue();
            }

            _withdrawalQueue.push(strategy);
            _withdrawalQueueIndexPlusOne[strategy] = i + 1;

            unchecked {
                ++i;
            }
        }

        emit WithdrawalQueueUpdated(queue);
    }

    function _withdrawalQueueLength() internal view returns (uint256) {
        return _withdrawalQueue.length;
    }

    function _withdrawalQueueAt(uint256 index) internal view returns (address) {
        return _withdrawalQueue[index];
    }

    function _increaseStrategyAssets(address strategy, uint256 assets) internal {
        if (assets == 0) {
            return;
        }

        if (strategyAssets[strategy] == 0) {
            _addActiveStrategy(strategy);
        }

        unchecked {
            strategyAssets[strategy] += assets;
            totalAllocatedAssets += assets;
        }
    }

    function _decreaseStrategyAssets(address strategy, uint256 assets) internal {
        if (assets == 0) {
            return;
        }

        uint256 previousAssets = strategyAssets[strategy];
        uint256 updatedAssets = previousAssets > assets ? previousAssets - assets : 0;

        strategyAssets[strategy] = updatedAssets;

        unchecked {
            totalAllocatedAssets -= assets > previousAssets ? previousAssets : assets;
        }

        if (updatedAssets == 0) {
            _removeActiveStrategy(strategy);
        }
    }

    function _addActiveStrategy(address strategy) internal {
        if (_activeStrategyIndexPlusOne[strategy] != 0) {
            return;
        }

        _activeStrategies.push(strategy);
        _activeStrategyIndexPlusOne[strategy] = _activeStrategies.length;
        _withdrawalQueue.push(strategy);
        _withdrawalQueueIndexPlusOne[strategy] = _withdrawalQueue.length;
    }

    function _removeActiveStrategy(address strategy) internal {
        uint256 indexPlusOne = _activeStrategyIndexPlusOne[strategy];
        if (indexPlusOne == 0) {
            return;
        }

        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = _activeStrategies.length - 1;

        if (index != lastIndex) {
            address movedStrategy = _activeStrategies[lastIndex];
            _activeStrategies[index] = movedStrategy;
            _activeStrategyIndexPlusOne[movedStrategy] = indexPlusOne;
        }

        _activeStrategies.pop();
        delete _activeStrategyIndexPlusOne[strategy];
        _removeFromWithdrawalQueue(strategy);
    }

    function _removeFromWithdrawalQueue(address strategy) internal {
        uint256 indexPlusOne = _withdrawalQueueIndexPlusOne[strategy];
        if (indexPlusOne == 0) {
            return;
        }

        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = _withdrawalQueue.length - 1;

        for (uint256 i = index; i < lastIndex; ) {
            address movedStrategy = _withdrawalQueue[i + 1];
            _withdrawalQueue[i] = movedStrategy;
            _withdrawalQueueIndexPlusOne[movedStrategy] = i + 1;

            unchecked {
                ++i;
            }
        }

        _withdrawalQueue.pop();
        delete _withdrawalQueueIndexPlusOne[strategy];
    }
}
