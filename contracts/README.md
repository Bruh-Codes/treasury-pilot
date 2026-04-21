# YieldPilot Contracts

Upgradeable smart contracts for YieldPilot's shared vault architecture, built with Hardhat 3, Ignition, viem, and OpenZeppelin.

## What is included

- `YieldPilotVault`: the shared ERC-4626 vault implementation
- `YieldPilotVaultStrategyManager`: internal strategy registry, accounting, and withdrawal queue module
- `YieldPilotVaultUpgradeMock`: a test-only upgrade target
- `IStrategyAdapter`: interface for whitelisted strategy destinations
- `MockERC20`: test asset used in local environments
- `MockStrategyAdapter`: test adapter used to model capital deployment and unwind flows
- `ReentrantStrategyAdapter`: malicious test adapter used to verify callback reentrancy protections
- Ignition modules for:
  - transparent proxy deployment
  - proxy upgrade through `ProxyAdmin`

## Architecture

YieldPilot uses a single shared vault per supported asset:

- users deposit an ERC-20 asset into the vault
- the vault can keep a portion of funds idle for faster withdrawals
- the owner can allocate idle funds into whitelisted strategy adapters
- active strategies are tracked separately from the ordered withdrawal queue
- withdrawals consume idle liquidity first
- if idle funds are insufficient, the vault recalls liquidity from strategies in the configured queue order

This means users do not withdraw protocol-by-protocol. They request a withdrawal from the vault, and the vault orchestrates the unwind path behind the scenes.

The implementation is split by responsibility:

- `YieldPilotVault.sol` keeps the ERC-4626 surface, owner-facing orchestration, and liquidity logic
- `YieldPilotVaultStrategyManager.sol` owns strategy whitelist state, active strategy tracking, accounting, and queue management

## Proxy pattern

The deployment follows Hardhat Ignition's documented transparent proxy flow:

- deploy `YieldPilotVault`
- deploy `TransparentUpgradeableProxy`
- recover the auto-created `ProxyAdmin` from the proxy's `AdminChanged` event
- interact with the vault through the proxy address
- upgrade through `ProxyAdmin.upgradeAndCall(...)`

Reference:
- [Hardhat Ignition: Upgradeable Contracts](https://hardhat.org/ignition/docs/guides/upgradeable-proxies)

## Project structure

```text
contracts/
  contracts/
    interfaces/
    mocks/
    YieldPilotVault.sol
    YieldPilotVaultStrategyManager.sol
  ignition/
    modules/
      YieldPilotVaultProxy.ts
      UpgradeYieldPilotVault.ts
  test/
    YieldPilotVault.ts
```

## Commands

Install dependencies:

```bash
yarn install
```

Compile:

```bash
npx hardhat compile
```

Run tests:

```bash
npx hardhat test
```

## Deploy with Ignition

Deploy the proxy-backed vault to a local simulated network:

```bash
npx hardhat ignition deploy ignition/modules/YieldPilotVaultProxy.ts --parameters ignition/parameters/local-vault.json
```

Create the parameters file first. The example below is illustrative and is not currently checked into the repository.

Example parameters file:

```json
{
  "YieldPilotVaultProxyModule": {
    "asset": "0xYourAssetAddress",
    "name": "YieldPilot USDC Vault",
    "symbol": "ypUSDC"
  }
}
```

Upgrade the deployed vault:

```bash
npx hardhat ignition deploy ignition/modules/UpgradeYieldPilotVault.ts --parameters ignition/parameters/local-upgrade.json
```

Create the parameters file first. The example below is illustrative and is not currently checked into the repository.

Example upgrade parameters file:

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

## Test coverage

The test suite currently verifies:

- transparent proxy deployment through Ignition
- retrieval of the proxy admin from `AdminChanged`
- deposits into the proxy-backed vault
- allocation into multiple whitelisted strategies
- withdrawals using idle liquidity first
- automatic unwind from strategy positions when idle funds are insufficient
- configured withdrawal queue ordering during unwind
- reentrancy protection against strategy callbacks during deployment
- reentrancy protection against strategy callbacks during withdrawal unwinds
- upgrade from the production vault implementation into the test-only upgrade mock while preserving state
- dedicated Ignition upgrade module execution

## Notes

- The vault currently assumes one asset per vault instance.
- Strategy adapters are intentionally simple in the mock setup; production adapters should add stronger accounting, access control, and external protocol integrations.
- The vault tracks active strategy balances on-chain for cheaper withdrawal routing, keeps a configurable unwind queue, and exposes `syncStrategyAssets(...)` so an owner or automation can reconcile yield growth or losses into vault accounting.
- The default Hardhat compile profile now enables the Solidity optimizer for production-like bytecode by default.
- `YieldPilotVaultUpgradeMock` exists only to prove the upgrade path and storage continuity in tests and local development.
