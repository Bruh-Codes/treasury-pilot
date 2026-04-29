# Kabon

Kabon is a policy-driven DeFi treasury copilot for Arbitrum. Users deposit a supported asset into a vault, receive ERC-4626 vault shares as their receipt, and use a guided product flow to evaluate allocation opportunities, review recommendation logic, and withdraw with clearer unwind expectations.

The product is Arbitrum-first today, with frontend wallet support expanded to include Robinhood Chain testnet so the app can speak credibly to tokenized asset and RWA workflows as that ecosystem opens up.

This repository contains two workspaces:

- [contracts](C:\Users\hp\Desktop\arbs-london\contracts): Hardhat 3 smart contracts, proxy deployment modules, and tests
- [web](C:\Users\hp\Desktop\arbs-london\web): Next.js frontend, wallet integration, and app-facing API routes

Hackathon-ready pitch copy lives in [PITCH.md](C:\Users\hp\Desktop\arbs-london\PITCH.md).

## Product Model

Kabon is built around one vault per supported asset.

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

- a primary home/dashboard experience that combines wallet balances, deposit actions, and copilot recommendations
- wallet connection through Reown AppKit
- live Arbitrum market, protocol, and opportunity data
- a deterministic recommendation engine exposed through app API routes
- Arbitrum-focused market data plus Robinhood Chain testnet wallet support
- protocol explorer and opportunity detail pages
- placeholder activity and withdraw routes for post-deployment indexing and queue UX

See [web/README.md](C:\Users\hp\Desktop\arbs-london\web\README.md) for frontend setup details.

## Current Demo Status

Status checked on April 27, 2026:

- wallet connect is implemented
- vault deposit flow is implemented in the homepage flow when supported env vars and vault addresses are configured
- live protocol and opportunity browsing is implemented for Arbitrum
- recommendation generation is implemented today as a deterministic scoring engine over live market data
- copilot UI is implemented, but it is not yet a true LLM-backed agent workflow
- withdraw and activity routes are still placeholder UX pending live indexing / queue integration
- deployment, production addresses, and full end-to-end live demo wiring are still pending

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

- demonstrating the Kabon product model
- iterating on ERC-4626 vault behavior
- building operator workflows around strategy deployment and unwind management
- connecting a frontend to a vault-driven yield product
- positioning the product around both DeFi treasury management and emerging tokenized-asset / RWA rails

It should still be treated as a project under active development rather than a finished production deployment package.

## Hackathon Submission Snapshot

### One-line Pitch

Kabon is a policy-driven vault copilot that helps users and DAOs deposit once, evaluate vetted yield routes, and withdraw with transparent unwind logic on Arbitrum, with Robinhood Chain support as an RWA expansion path.

### Problem

- yield routing is fragmented and manual
- users and operators must track APY/liquidity across many protocols
- withdrawals are operationally hard when liquidity is not immediately idle

### Solution

- single vault deposit flow with ERC-4626 shares as the user receipt
- strategy deployment and unwind queue handled at vault/operator layer
- recommendation and policy-driven execution framing in the app UX
- clearer withdrawal expectations when recalls are needed

### Requirement Fit Snapshot

- `Landing / product overview`: mostly covered in the homepage flow
- `Create policy`: partially covered through copilot modes today, but not yet a dedicated policy builder
- `Vault dashboard`: covered in the homepage/dashboard experience
- `Recommendation details`: covered inline through copilot signals and recommendation detail UI
- `Withdraw flow`: contract behavior exists, but the dedicated frontend page is still mostly a placeholder
- `Activity history`: not complete yet
- `AI layer`: recommendation logic exists, but a true LLM-backed copilot has not been added yet
- `Deployment`: not complete yet

### Judging Criteria Mapping

- **Smart contract quality**: upgradeable vault architecture, non-reentrant entrypoints, strategy accounting checks, and test coverage for deploy/withdraw/unwind/upgrade flows
- **Product-market fit**: targeted at users and treasuries that want simplified yield operations
- **Innovation and creativity**: combines shared-vault UX with agentic recommendation and execution framing
- **Real problem solving**: reduces fragmented yield management and makes unwind behavior explicit

### 2-Minute Demo Flow

1. connect wallet and select supported Arbitrum chain
2. deposit into the vault-backed flow
3. show the Kabon Copilot recommendation and rationale (APY/liquidity/risk context)
4. open the protocol explorer to validate the recommended venue against live market data
5. explain that allocation execution, withdrawal queue UX, and indexed activity are the next deployment-phase steps

### Submission Checklist

- deployed on an eligible Arbitrum ecosystem chain
- at least one Robinhood Chain-facing path included in the user flow
- demo video link, deployment addresses, and setup steps documented
- test commands and expected outputs documented for reviewers

Current note on April 27, 2026: Robinhood Chain support is already present in wallet/network readiness, but deployment addresses, live withdrawal indexing, and the stronger AI layer still need to be completed before final submission.

## Deployment + Address Wiring

There is now a supported deploy script in the contracts workspace:

```bash
cd contracts
DEPLOY_ASSET=USDC npx hardhat run scripts/deploy-supported-vault.ts --network arbitrumSepolia
```

That script writes frontend-readable vault addresses into:

- [web/lib/generated/vault-addresses.json](C:\Users\hp\Desktop\arbs-london\web\lib\generated\vault-addresses.json)

Official Robinhood Chain testnet stock-token addresses and official Circle USDC addresses are tracked in:

- [contracts/config/supported-assets.ts](C:\Users\hp\Desktop\arbs-london\contracts\config\supported-assets.ts)
