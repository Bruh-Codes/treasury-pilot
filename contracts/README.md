# YieldPilot Contracts

Smart contracts for YieldPilot's shared-vault architecture, built with Hardhat 3, Ignition, viem, and OpenZeppelin.

## Overview

The contracts workspace centers on a single ERC-4626 vault implementation per supported asset. Users deposit the underlying token and receive vault shares. Strategy execution is abstracted behind whitelisted adapters, while withdrawals are serviced from idle liquidity first and then from strategy recalls if needed.

Core components:

- `YieldPilotVault.sol`: upgradeable ERC-4626 vault, admin controls, liquidity management, and strategy interactions
- `YieldPilotVaultStrategyManager.sol`: strategy whitelist state, active-strategy tracking, accounting, and withdrawal queue management
- `IStrategyAdapter.sol`: interface each strategy adapter must satisfy
- `YieldPilotVaultUpgradeMock.sol`: test-only upgrade target used to verify storage continuity and upgrade execution
- mocks for assets and adversarial adapters used in the test suite

## Vault Mechanics

### User flow

1. a user deposits an ERC-20 asset
2. the vault mints ERC-4626 shares to the user
3. the operator can deploy idle assets into approved strategies
4. a user withdraws by redeeming shares for underlying assets
5. if the vault does not have enough idle assets, it recalls capital from strategies using the configured withdrawal queue

### Accounting model

`totalAssets()` is defined as:

- vault-held idle assets
- plus `totalAllocatedAssets` tracked for active strategies

The vault keeps per-strategy accounting and supports `syncStrategyAssets(...)` so gains or paused-loss events can be reflected in vault accounting.

### Strategy model

Strategies are external adapter contracts, not embedded protocol integrations. Each adapter must:

- manage a single asset matching the vault asset
- expose `asset()`
- expose `totalAssets()`
- accept `deposit(uint256 assets)`
- support `withdrawTo(address receiver, uint256 assets)`

The vault only interacts with whitelisted adapters.

## Security Properties

The current implementation includes the following hardening:

- transparent proxy deployment with initializer locking on the implementation
- non-reentrant vault entrypoints and strategy interaction flows
- explicit pause controls for deposits and strategy deployment
- two-step ownership transfer via `Ownable2StepUpgradeable`
- disabled ownership renounce to avoid permanently orphaning controls
- rejection of fee-on-transfer or short-receipt asset behavior during deposits
- rejection of strategy deploy/recall misreporting based on actual token balance deltas
- requirement that realized strategy losses can only be synced while the vault is paused

## Important Trust Boundaries

The vault is safer than the original version, but it is not trustless.

Production assumptions still include:

- the owner is trusted to manage pause, strategy whitelist, deployment, recall, and sync operations
- the proxy admin is trusted to perform upgrades safely
- each whitelisted strategy adapter is trusted code and must be reviewed separately
- `syncStrategyAssets(...)` still relies on the adapter's reported `totalAssets()` value

For real deployments, the owner and proxy admin should be multisig or timelock controlled.

## Project Structure

```text
contracts/
  contracts/
    interfaces/
      IStrategyAdapter.sol
    mocks/
      FeeOnTransferERC20.sol
      MisreportingStrategyAdapter.sol
      MockERC20.sol
      MockStrategyAdapter.sol
      ReentrantStrategyAdapter.sol
      YieldPilotVaultUpgradeMock.sol
    ProxyArtifacts.sol
    YieldPilotVault.sol
    YieldPilotVaultStrategyManager.sol
  ignition/
    modules/
      UpgradeYieldPilotVault.ts
      YieldPilotVaultProxy.ts
  scripts/
    send-op-tx.ts
  test/
    YieldPilotVault.ts
```

## Getting Started

Install dependencies:

```bash
yarn install
```

Compile contracts:

```bash
npx hardhat compile
```

Run tests:

```bash
npx hardhat test
```

## Deployment

The repository uses Hardhat Ignition with an OpenZeppelin transparent proxy.

Deployment flow:

1. deploy `YieldPilotVault`
2. deploy `TransparentUpgradeableProxy`
3. initialize the vault through the proxy
4. recover the auto-created `ProxyAdmin`
5. interact with the vault through the proxy address

Local example:

```bash
npx hardhat ignition deploy ignition/modules/YieldPilotVaultProxy.ts --parameters ignition/parameters/local-vault.json
```

Example parameter file:

```json
{
  "YieldPilotVaultProxyModule": {
    "asset": "0xYourAssetAddress",
    "name": "YieldPilot USDC Vault",
    "symbol": "ypUSDC"
  }
}
```

Upgrade example:

```bash
npx hardhat ignition deploy ignition/modules/UpgradeYieldPilotVault.ts --parameters ignition/parameters/local-upgrade.json
```

Example upgrade parameter file:

```json
{
  "YieldPilotVaultProxyModule": {
    "asset": "0xYourAssetAddress",
    "name": "YieldPilot USDC Vault",
    "symbol": "ypUSDC"
  },
  "YieldPilotVaultUpgradeModule": {
    "reserveTargetBps": 2000
  }
}
```

## Test Coverage

The current suite covers:

- proxy deployment and proxy admin recovery
- deposits into the proxy-backed vault
- allocation across multiple strategies
- withdrawals from idle liquidity
- automatic unwind from strategies when idle liquidity is insufficient
- configured withdrawal queue ordering
- strategy callback reentrancy protections during deploy and unwind
- upgrade execution and storage continuity
- implementation initializer locking
- rejection of unsupported fee-on-transfer asset behavior
- rejection of strategy deploy/recall misreporting
- two-step ownership transfer behavior
- blocked ownership renounce
- loss sync requiring the vault to be paused first

## Operator Notes

- One vault instance should manage one asset only.
- Do not whitelist a strategy adapter until its accounting and withdrawal semantics have been reviewed.
- Do not use the default local deployer account model for production governance.
- Treat upgrades as governance actions with review, simulation, and signoff.
- Treat `syncStrategyAssets(...)` as an operator action that should be monitored and logged.

## References

- [Hardhat Ignition upgradeable proxy guide](https://hardhat.org/ignition/docs/guides/upgradeable-proxies)
- [OpenZeppelin ERC-4626 documentation](https://docs.openzeppelin.com/contracts/5.x/erc4626)
