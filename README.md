<img width="1500" height="500" alt="1500x500" src="https://github.com/user-attachments/assets/477faaa0-8e2c-4fee-a51c-30efa617a3f9" />
<br>
Kabon is a policy-driven DeFi treasury copilot for Arbitrum. Users deposit a supported asset into an ERC-4626 vault, receive vault shares as their receipt, and use a guided interface to evaluate approved allocation opportunities, understand recommendation logic, and withdraw with clearer expectations around liquidity and unwind requirements.

The product is Arbitrum-first, with Robinhood Chain testnet support included as an expansion path for tokenized asset and RWA workflows.

## Repository

```text
arbs-london/
  contracts/   Hardhat 3 smart contracts, proxy deployment modules, scripts, and tests
  web/         Next.js frontend, wallet integration, and app-facing API routes
  indexers/    The Graph subgraph for vault event indexing
```

- [contracts](./contracts): vault contracts, deployment scripts, and test coverage
- [web](./web): product interface, wallet flows, recommendations, and market data routes
- [indexers](./indexers): subgraph for historical and real-time vault activity

## Product Model

Kabon is built around one vault per supported asset:

1. Users deposit a supported asset into a vault.
2. The vault mints ERC-4626 shares to represent the user position.
3. Approved vault operators can allocate idle liquidity into whitelisted strategy adapters.
4. Users withdraw by redeeming shares for underlying assets.
5. If idle liquidity is insufficient, the vault recalls liquidity from strategies through a configured withdrawal queue.

This keeps execution vault-mediated rather than requiring users to enter and exit each protocol individually. Kabon recommends and explains compliant allocation routes, while approved vault flows and whitelisted adapters handle protocol-specific execution.

## Platform Components

### Smart Contracts

The contracts workspace includes:

- upgradeable ERC-4626 vault architecture
- owner-managed strategy whitelisting and withdrawal queue controls
- proxy deployment through Hardhat Ignition and OpenZeppelin transparent proxies
- reentrancy protections on vault entrypoints and strategy callbacks
- protections against fee-on-transfer assets and adapter misreporting
- tests covering deposits, withdrawals, upgrades, strategy accounting, unwind behavior, and administrative controls

See [contracts/README.md](./contracts/README.md) for architecture and deployment details.

### Web Application

The frontend workspace includes:

- wallet-aware dashboard and deposit experience
- Reown AppKit wallet integration
- Arbitrum protocol and opportunity data
- recommendation engine with allocation rationale and risk framing
- Robinhood Chain testnet wallet support
- tokenized-equity pricing and chart history via Polygon / Massive when configured
- protocol explorer, activity, and withdrawal surfaces

See [web/README.md](./web/README.md) for setup and frontend details.

### AI Layer

Kabon uses AI as a treasury copilot rather than an autonomous custodian. The AI layer helps users evaluate vault allocation routes by combining live protocol data, user portfolio context, risk preferences, liquidity conditions, and vault policy constraints.

The AI experience is designed to:

- explain why a route is recommended
- compare opportunities across APY, liquidity, risk, and chain support
- surface warnings before allocation
- translate vault and strategy mechanics into user-readable guidance
- keep execution constrained to supported assets, configured vaults, and whitelisted strategy adapters

AI recommendations are advisory. They do not bypass vault controls, independently move user funds, or execute outside the approved contract and adapter model.

### Indexer

The indexer workspace contains a The Graph subgraph for vault activity:

- tracks `Deposit`, `Withdraw`, `StrategyAllocated`, `StrategyRecalled`, `StrategyWhitelisted`, and `WithdrawalQueueUpdated` events
- provides a GraphQL API for historical and real-time vault activity
- supports frontend activity history and analytics

Live endpoints:

- Query URL: https://api.studio.thegraph.com/query/1749198/kabon-vault/v0.0.1
- Studio URL: https://thegraph.com/studio/subgraph/kabon-vault

Local indexer development:

```bash
cd indexers/kabon-vault
bun install
graph codegen
graph build
graph deploy kabon-vault
```

## Reviewer Quickstart

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

## Deployment And Address Wiring

The contracts workspace includes a supported deployment script:

```bash
cd contracts
DEPLOY_ASSET=USDC npx hardhat run scripts/deploy-supported-vault.ts --network arbitrumSepolia
```

The script writes frontend-readable vault addresses to:

- [web/lib/generated/vault-addresses.json](./web/lib/generated/vault-addresses.json)

Supported asset configuration is tracked in:

- [contracts/config/supported-assets.ts](./contracts/config/supported-assets.ts)

## Live Deployment

### Arbitrum Sepolia

- Vault proxy: `0x23d80c8c231d7bf671ac54cd5854728535063254`
- Vault implementation: `0x219ccc99ab55c001f9c48cec3740d6a64518bd72`
- Aave V3 strategy adapter for USDC: `0xC9d2E20859020375c8C7517464A2Ee890Ff0864F`
- Aave V3 Pool: `0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff`
- Aave V3 USDC aToken: `0x460b97BD498E1157530AEb3086301d5225b91216`

Explorer links:

- Vault proxy: https://sepolia.arbiscan.io/address/0x23d80c8c231d7bf671ac54cd5854728535063254
- Vault implementation: https://sepolia.arbiscan.io/address/0x219ccc99ab55c001f9c48cec3740d6a64518bd72
- Aave strategy adapter: https://sepolia.arbiscan.io/address/0xC9d2E20859020375c8C7517464A2Ee890Ff0864F
- Whitelist transaction: https://sepolia.arbiscan.io/tx/0xbdb850cd11f45772e672f410862b444631f5e787d8e750220eaa776d9f92f2ba

Frontend strategy mapping:

```bash
NEXT_PUBLIC_AAVE_USDC_SEPOLIA_STRATEGY_ADDRESS=0xC9d2E20859020375c8C7517464A2Ee890Ff0864F
```

## Route Deployment

Deploy and whitelist a mock route for a fast smoke test:

```bash
cd contracts
VAULT_ADDRESS=0x23d80c8c231d7bf671ac54cd5854728535063254 npm run deploy:mock-strategy -- --network arbitrumSepolia
```

Deploy and whitelist the Aave USDC adapter:

```bash
cd contracts
VAULT_ADDRESS=0x23d80c8c231d7bf671ac54cd5854728535063254 \
AAVE_POOL_ADDRESS=0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff \
AAVE_ATOKEN_ADDRESS=0x460b97BD498E1157530AEb3086301d5225b91216 \
ASSET_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d \
npm run deploy:aave-strategy -- --network arbitrumSepolia
```

Whitelisted route proof:

![Whitelisted route script output](./whitelisted-route.png)

## Security Posture

The vault layer includes protections for several common failure modes:

- initializer locking for the upgradeable implementation
- non-reentrant deposit, mint, withdraw, redeem, deploy, recall, and sync flows
- rejection of short-receipt asset transfers during deposits and strategy deployment
- rejection of adapters that misreport recalled or deployed asset amounts
- two-step ownership transfers
- disabled ownership renounce to avoid orphaning vault controls
- pause requirement before syncing a realized strategy loss into vault accounting

Strategy adapters remain part of the trust boundary and should be reviewed independently before production use.

## Hackathon Evaluation Guide

Kabon demonstrates a vault-based approach to policy-driven yield allocation:

- users deposit once and receive ERC-4626 shares
- Kabon ranks and explains approved opportunities
- the AI copilot turns market, portfolio, risk, and policy inputs into user-readable allocation guidance
- whitelisted adapters execute approved vault-level routes
- withdrawals model idle-liquidity checks and strategy recall behavior
- Robinhood Chain support illustrates an expansion path for RWA and tokenized-equity workflows

The submission is intended to show a credible end-to-end product direction with real vault contracts, frontend flows, live route wiring, and indexer support. Production deployment would require broader adapter coverage, governance hardening, monitoring, audits, and additional operational controls.

## Known Limitations

- Route configuration is currently env-and-mapping based; production use should move to an onchain or database-backed registry.
- Strategy coverage is intentionally narrow, with an Aave USDC path used as the primary live route.
- Robinhood Chain support is focused on wallet readiness and tokenized-asset positioning rather than full protocol opportunity ingestion.
- Production readiness requires multisig or timelock governance, expanded monitoring, independent audits, and broader adapter review.
