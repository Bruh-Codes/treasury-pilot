# Kabon Web

Kabon Web is the Next.js frontend for Kabon's vault-oriented treasury experience. It combines wallet connectivity, deposit and withdrawal surfaces, live market data, protocol exploration, and policy-aware recommendation flows for supported vault routes.

## Product Scope

The application provides:

- a wallet-aware dashboard for balances, supported assets, and vault actions
- deposit flows wired to configured vault contracts
- copilot recommendations that explain route selection with risk, liquidity, and APY context
- live Arbitrum protocol and opportunity data
- protocol explorer and opportunity detail pages
- withdrawal and activity surfaces for exit visibility and vault history
- Robinhood Chain testnet wallet support for RWA-oriented workflows
- Polygon / Massive-backed stock pricing and history for supported tokenized-equity symbols when configured

The primary product experience is served from `/`, with supporting routes for protocol research, activity, withdrawals, and swap access.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui and Radix primitives
- Reown AppKit with Wagmi and Viem
- Drizzle ORM
- Recharts

## Routes

- `/`: primary dashboard, wallet-aware deposit flow, and copilot recommendation surface
- `/protocol`: live Arbitrum protocol dashboard
- `/protocol/opportunities/[protocolSlug]`: protocol-level detail page with opportunity snapshots
- `/swap`: embedded swap widget
- `/activity`: wallet and vault activity surface
- `/withdraw`: withdrawal and unwind visibility surface
- `/policy`: redirects to `/`
- `/recommendation`: redirects to `/`

## Local Development

Install dependencies:

```bash
bun install
```

Start the development server:

```bash
bun run dev
```

Build for production:

```bash
bun run build
```

Run the production server locally:

```bash
bun run start
```

## Environment Configuration

Wallet connectivity is handled through Reown AppKit.

Required:

```bash
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id
```

Example environment file:

- [.env.example](./.env.example)

Vault and chain-specific deposit flows may also require:

```bash
NEXT_PUBLIC_ARBITRUM_USDC_VAULT_ADDRESS=
NEXT_PUBLIC_ARBITRUM_SEPOLIA_USDC_TOKEN_ADDRESS=
NEXT_PUBLIC_ARBITRUM_SEPOLIA_USDC_VAULT_ADDRESS=
NEXT_PUBLIC_ROBINHOOD_USDC_TOKEN_ADDRESS=
NEXT_PUBLIC_ROBINHOOD_USDC_VAULT_ADDRESS=
NEXT_PUBLIC_AAVE_USDC_SEPOLIA_STRATEGY_ADDRESS=
```

If a vault address is not configured, the app still loads, but live deposit actions for that chain or asset remain unavailable.

For production-grade tokenized-equity pricing and chart history:

```bash
POLYGON_API_KEY=
STOCK_MARKET_DATA_PROVIDER=polygon
```

Vault deployments can also be wired through the generated address file:

- [lib/generated/vault-addresses.json](./lib/generated/vault-addresses.json)

The contracts deployment script updates this file automatically, reducing the need for manually edited frontend vault variables.

## Application Structure

```text
web/
  app/                  App Router pages, layouts, and API routes
  components/           product components and UI primitives
  components/providers/ wallet and app-level providers
  drizzle/              schema definitions
  hooks/                reusable client hooks
  lib/                  config, helpers, wallet setup, data access
  lib/server/           server-side data helpers
```

## Supported Networks

The app is Arbitrum-first, with Robinhood Chain testnet support at the wallet layer:

- Arbitrum One
- Arbitrum Sepolia
- Robinhood Chain Testnet

Current network responsibilities:

- Arbitrum provides the primary market, protocol, opportunity, and recommendation data.
- Arbitrum Sepolia supports live vault and strategy route demonstration.
- Robinhood Chain testnet support enables wallet readiness and tokenized-asset product positioning.
- Robinhood-specific yield opportunity ingestion is not yet complete.

## Recommendation And AI Layer

Kabon's AI layer is exposed through the product as a vault copilot. It is intended to help users understand allocation choices before they interact with vault routes, not to act as an unrestricted trading agent.

The recommendation flow:

- uses live Arbitrum protocol and yield data
- incorporates portfolio context from the connected wallet where available
- applies user risk and liquidity preferences
- respects supported assets, configured vaults, and whitelisted strategy routes
- scores opportunities against risk and liquidity presets
- returns structured allocations, rationale, expected APY, and warnings
- presents policy-aware guidance inside the main product flow

The AI-facing experience should help reviewers see:

- why a specific route is being recommended
- which tradeoffs matter for the selected asset and chain
- whether liquidity, APY, or risk is driving the recommendation
- what constraints prevent unsupported or unsafe execution paths
- how withdrawals and unwind expectations affect the decision

Execution remains contract-bounded. AI output can explain and rank routes, but user actions and vault operations remain constrained by the deployed contracts, configured addresses, and approved adapters.

Recommended product description:

> Kabon is a policy-driven vault copilot that explains and ranks compliant allocation routes.

## Reviewer Quickstart

```bash
cd web
bun install
bun run dev
```

Set the required environment variables in `.env.local` before reviewing wallet, vault, or API-backed flows.

## Hackathon Evaluation Notes

The web application is designed to demonstrate the complete product direction:

- connect a wallet on a supported network
- view balances and supported vault assets
- initiate a vault deposit where addresses are configured
- review AI copilot route recommendations and rationale
- inspect live protocol opportunity data
- review withdrawal and activity surfaces that reflect the vault-based product model

The frontend is transaction-aware and wired for the live Arbitrum Sepolia vault route, while some operator and indexer-backed flows remain staged for production integration.

## Limitations

- Full operator transaction orchestration still requires additional integration work.
- The dedicated withdrawal page does not yet reflect live queue state or recall progress.
- The activity page is structured for vault history but is not yet fully backed by deployed contract event indexing.
- Robinhood Chain support currently focuses on wallet and asset readiness rather than live yield route ingestion.
- `/policy` and `/recommendation` are currently consolidated into the homepage product flow.

## Related Documentation

- [Root README](../README.md)
- [Contracts README](../contracts/README.md)
