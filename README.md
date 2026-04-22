# YieldPilot

YieldPilot is a shared-vault DeFi product focused on making onchain yield allocation easier to use. Users deposit a supported asset into a vault, receive ERC-4626 vault shares as their receipt, and rely on the vault to handle strategy deployment and withdrawal unwinds behind the scenes.

The product is Arbitrum-first today, with frontend wallet support expanded to include Robinhood Chain testnet so the app can speak credibly to tokenized asset and RWA workflows as that ecosystem opens up.

This repository contains two workspaces:

- [contracts](C:\Users\hp\Desktop\arbs-london\contracts): Hardhat 3 smart contracts, proxy deployment modules, and tests
- [web](C:\Users\hp\Desktop\arbs-london\web): Next.js frontend, wallet integration, and app-facing API routes

## Product Model

YieldPilot is built around one vault per supported asset.

At a high level:

1. a user deposits an ERC-20 asset into the vault
2. the vault mints ERC-4626 shares to the user
3. the vault operator can deploy idle liquidity into approved strategy adapters
4. users withdraw by redeeming shares for underlying assets
5. if idle liquidity is insufficient, the vault recalls liquidity from strategies using a configured withdrawal queue

The user does not have to exit protocols one by one. Their position is represented by vault shares, while the vault manages the underlying routing.

## Repository Layout

```text
arbs-london/
  contracts/   Vault contracts, mocks, Ignition modules, tests
  web/         Next.js app, UI components, API routes, wallet setup
```

## Contracts Summary

The contracts workspace currently includes:

- an upgradeable ERC-4626 vault
- owner-managed strategy whitelisting and deployment
- explicit withdrawal queue management for unwind order
- proxy deployment through Hardhat Ignition and OpenZeppelin transparent proxies
- reentrancy protections on vault entrypoints and strategy callbacks
- hardening against fee-on-transfer assets and adapter misreporting on deploy/recall flows
- tests covering deposits, withdrawals, upgrades, strategy accounting, and admin controls

See [contracts/README.md](C:\Users\hp\Desktop\arbs-london\contracts\README.md) for contract architecture and deployment details.

## Web Summary

The frontend workspace currently includes:

- landing and product navigation
- dashboard, activity, recommendation, and withdraw views
- wallet connection through Reown AppKit
- Arbitrum-focused market data plus Robinhood Chain testnet wallet support
- app routes and API routes for asset, protocol, and recommendation data

See [web/README.md](C:\Users\hp\Desktop\arbs-london\web\README.md) for frontend setup details.

## Local Development

### Contracts

```bash
cd contracts
yarn install
npx hardhat compile
npx hardhat test
```

### Web

```bash
cd web
bun install
bun run dev
```

## Current Security Posture

The vault layer has explicit protections for several common failure modes:

- implementation initializer locking for the upgradeable contract
- non-reentrant deposit, mint, withdraw, redeem, deploy, recall, and sync flows
- rejection of short-receipt asset transfers during deposits and strategy deployment
- rejection of adapters that misreport recalled or deployed asset amounts
- two-step ownership transfers
- disabled ownership renounce to avoid orphaning vault controls
- pause required before syncing a realized strategy loss into vault accounting

This does not remove the need to review every production strategy adapter independently. Adapter code remains part of the trust boundary.

## What This Repo Is Good For

This repository is a strong base for:

- demonstrating the YieldPilot product model
- iterating on ERC-4626 vault behavior
- building operator workflows around strategy deployment and unwind management
- connecting a frontend to a vault-driven yield product
- positioning the product around both DeFi treasury management and emerging tokenized-asset / RWA rails

It should still be treated as a project under active development rather than a finished production deployment package.
