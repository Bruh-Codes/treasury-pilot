# Kabon Contracts

Smart contracts for Kabon's vault-mediated treasury architecture, built with Hardhat 3, Ignition, viem, and OpenZeppelin.

## Overview

The contracts workspace centers on one ERC-4626 vault implementation per supported asset. Users deposit the underlying token and receive vault shares. Strategy execution is abstracted behind whitelisted adapters, while withdrawals are serviced from idle liquidity first and then from strategy recalls when required.

Core components:

- `YieldPilotVault.sol`: upgradeable ERC-4626 vault with admin controls, liquidity management, and strategy interactions
- `YieldPilotVaultStrategyManager.sol`: strategy whitelist state, active-strategy tracking, accounting, and withdrawal queue management
- `IStrategyAdapter.sol`: interface each strategy adapter must satisfy
- `YieldPilotVaultUpgradeMock.sol`: test-only upgrade target used to verify storage continuity and upgrade execution
- mock assets and adversarial adapters used by the test suite

## Execution Model

Kabon uses vault-mediated execution rather than direct protocol-by-protocol interaction from each user wallet:

1. Users deposit assets into a Kabon ERC-4626 vault.
2. The vault mints shares representing each user position.
3. Approved route execution deploys idle vault liquidity into whitelisted strategy adapters.
4. Withdrawals are served from idle liquidity first, then through strategy recalls using the configured queue.

Protocol-specific behavior lives in adapters, while the user-facing position remains share-based.

## Vault Mechanics

### User Flow

1. A user deposits an ERC-20 asset.
2. The vault mints ERC-4626 shares to the user.
3. Approved route execution can deploy idle assets into approved strategies.
4. A user withdraws by redeeming shares for underlying assets.
5. If the vault does not have enough idle assets, it recalls capital from strategies using the configured withdrawal queue.
6. Optional unwind fees can be charged only on the withdrawal portion that requires strategy recalls.

### Accounting Model

`totalAssets()` is defined as:

- vault-held idle assets
- plus `totalAllocatedAssets` tracked for active strategies

The vault keeps per-strategy accounting and supports `syncStrategyAssets(...)` so gains or paused-loss events can be reflected in vault accounting.

### Withdrawal Fee Model

The vault can optionally charge an unwind withdrawal fee:

- the owner sets `feeRecipient` and `unwindFeeBps`
- the fee is `0` when idle liquidity fully covers a withdrawal
- the fee applies only to the portion of a withdrawal that exceeds current idle liquidity
- `withdraw(...)` preserves the caller's requested net assets and burns additional shares to cover the unwind fee
- `redeem(...)` burns the requested shares and reduces the receiver's net assets by the unwind fee when a strategy recall is required
- the Ignition deployment module defaults `unwindFeeBps` to `500`, or `5%`

### Strategy Model

Strategies are external adapter contracts. Each adapter must:

- manage a single asset matching the vault asset
- expose `asset()`
- expose `totalAssets()`
- accept `deposit(uint256 assets)`
- support `withdrawTo(address receiver, uint256 assets)`

The vault only interacts with whitelisted adapters.

## Security Properties

The current implementation includes:

- transparent proxy deployment with initializer locking on the implementation
- non-reentrant vault entrypoints and strategy interaction flows
- explicit pause controls for deposits and strategy deployment
- two-step ownership transfer through `Ownable2StepUpgradeable`
- disabled ownership renounce to avoid permanently orphaning controls
- rejection of fee-on-transfer or short-receipt asset behavior during deposits
- rejection of strategy deploy and recall misreporting based on actual token balance deltas
- requirement that realized strategy losses can only be synced while the vault is paused

## Trust Boundaries

The vault introduces meaningful controls, but it is not fully trustless. Production assumptions include:

- the owner is trusted to manage pause, strategy whitelist, withdrawal queue, recall, and sync operations
- the proxy admin is trusted to perform upgrades safely
- each whitelisted strategy adapter is trusted code and must be reviewed separately
- `syncStrategyAssets(...)` relies on the adapter's reported `totalAssets()` value

For production deployments, the owner and proxy admin should be controlled by a multisig or timelock.

Route execution is currently permissionless for approved adapters to support a streamlined review flow. Production deployments should revisit this permission model.

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
    deploy-and-whitelist-aave-strategy.ts
    deploy-and-whitelist-mock-strategy.ts
    deploy-supported-vault.ts
    get-proxy-info.ts
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

1. Deploy `YieldPilotVault`.
2. Deploy `TransparentUpgradeableProxy`.
3. Initialize the vault through the proxy.
4. Recover the auto-created `ProxyAdmin`.
5. Interact with the vault through the proxy address.

Local deployment example:

```bash
npx hardhat ignition deploy ignition/modules/YieldPilotVaultProxy.ts --parameters ignition/parameters/local-vault.json
```

Example parameter file:

```json
{
  "YieldPilotVaultProxyModule": {
    "asset": "0xYourAssetAddress",
    "name": "Kabon USDC Vault",
    "symbol": "kbUSDC",
    "feeRecipient": "0xYourTreasuryAddress",
    "unwindFeeBps": 500
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
    "name": "Kabon USDC Vault",
    "symbol": "kbUSDC",
    "feeRecipient": "0xYourTreasuryAddress",
    "unwindFeeBps": 500
  },
  "YieldPilotVaultUpgradeModule": {
    "reserveTargetBps": 2000
  }
}
```

## Supported-Chain Deployment Script

```bash
cd contracts
DEPLOY_ASSET=USDC npx hardhat run scripts/deploy-supported-vault.ts --network arbitrumSepolia
```

The script:

1. deploys a new `YieldPilotVault` implementation
2. deploys a new `TransparentUpgradeableProxy`
3. initializes the proxy-backed vault for the selected asset
4. configures the withdrawal fee
5. writes the deployed vault address into [../web/lib/generated/vault-addresses.json](../web/lib/generated/vault-addresses.json)

Supported networks:

- `arbitrum`
- `arbitrumSepolia`
- `robinhoodChainTestnet`

Supported assets are tracked in [config/supported-assets.ts](./config/supported-assets.ts).

Required environment variables for remote deployments:

```bash
ARBITRUM_RPC_URL=
ARBITRUM_SEPOLIA_RPC_URL=
ROBINHOOD_CHAIN_TESTNET_RPC_URL=
DEPLOYER_PRIVATE_KEY=
```

Examples:

```bash
# Arbitrum Sepolia USDC vault
DEPLOY_ASSET=USDC npx hardhat run scripts/deploy-supported-vault.ts --network arbitrumSepolia

# Robinhood Chain Testnet AMZN vault
DEPLOY_ASSET=AMZN npx hardhat run scripts/deploy-supported-vault.ts --network robinhoodChainTestnet
```

## Test Coverage

The test suite covers:

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
- rejection of strategy deploy and recall misreporting
- two-step ownership transfer behavior
- blocked ownership renounce
- loss sync requiring the vault to be paused first

## Live Route Quickstart

```bash
cd contracts

# 1. Deploy vault and update ../web/lib/generated/vault-addresses.json.
DEPLOY_ASSET=USDC npm run deploy:vault -- --network arbitrumSepolia

# 2. Confirm route selectors on the deployed proxy.
PROXY_ADDRESS=0x23d80c8c231d7bf671ac54cd5854728535063254 npm run proxy:info -- --network arbitrumSepolia

# 3. Deploy and whitelist the Aave strategy adapter.
VAULT_ADDRESS=0x23d80c8c231d7bf671ac54cd5854728535063254 \
AAVE_POOL_ADDRESS=0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff \
AAVE_ATOKEN_ADDRESS=0x460b97BD498E1157530AEb3086301d5225b91216 \
ASSET_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d \
npm run deploy:aave-strategy -- --network arbitrumSepolia
```

Whitelisting proof:

![Whitelisted route script output](../whitelisted-route.png)

## Reviewer Guidance

For a focused review:

1. Inspect `YieldPilotVault.sol` and `YieldPilotVaultStrategyManager.sol`.
2. Review pause, ownership, strategy whitelist, and withdrawal queue controls.
3. Run the contract test suite.
4. Validate the proxy deployment flow through the Ignition modules.

The contract layer demonstrates a real upgradeable ERC-4626 vault, whitelisted strategy execution, queue-based unwind behavior, and guardrails for common integration risks.

## Operator Notes

- One vault instance should manage one asset only.
- Do not whitelist a strategy adapter until its accounting and withdrawal behavior have been reviewed.
- Do not use the default local deployer account model for production governance.
- Treat upgrades as governance actions with review, simulation, and signoff.
- Treat `syncStrategyAssets(...)` as an operator action that should be monitored and logged.

## References

- [Hardhat Ignition upgradeable proxy guide](https://hardhat.org/ignition/docs/guides/upgradeable-proxies)
- [OpenZeppelin ERC-4626 documentation](https://docs.openzeppelin.com/contracts/5.x/erc4626)
