# Kabon Web

Next.js frontend for the Kabon product experience. This app presents vault-related views such as dashboard, activity, recommendation, deposit-oriented flows, and withdrawals, while also wiring wallet connectivity and app-facing API routes.

## Current Product State

Status checked on April 29, 2026:

- the main product experience lives on `/`, which now acts as the live dashboard, deposit flow, and copilot surface
- wallet connect and vault deposit flow are wired for supported chains when env vars are present
- protocol and opportunity pages are pulling live Arbitrum market data
- recommendation generation is live and combines protocol data, portfolio context, and policy-aware ranking
- Robinhood Chain wallet assets and tokenized-equity balances are surfaced in the dashboard
- supported Robinhood RWA symbols now use Polygon / Massive-backed stock pricing and history when configured
- `/policy` and `/recommendation` currently redirect to `/`
- `/withdraw` and `/activity` are part of the product surface and ready for deeper live integration
- allocation approval / execution UX is still product framing rather than a completed end-to-end operator flow

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui and Radix primitives
- Reown AppKit with Wagmi and Viem
- Drizzle ORM
- Recharts

## What The App Covers

Current product surfaces include:

- homepage dashboard for connected balances, supported deposit assets, and copilot recommendations
- deposit flow wired to configured vault contracts
- protocol explorer and protocol opportunity detail pages
- withdrawal and activity routes
- activity views
- wallet connection and chain-aware UX
- Robinhood Chain testnet wallet support for RWA-oriented product positioning
- API routes for assets, protocols, opportunities, recommendations, and shared crypto / equity market data

## Routes

- `/`: primary Kabon dashboard, wallet-aware deposit flow, and copilot recommendation surface
- `/protocol`: live Arbitrum protocol dashboard
- `/protocol/opportunities/[protocolSlug]`: protocol-level detail page with live opportunity snapshots
- `/swap`: embedded swap widget
- `/activity`: wallet and vault activity surface
- `/withdraw`: withdrawal and unwind visibility surface
- `/policy`: redirects to `/`
- `/recommendation`: redirects to `/`

## Wallet Setup

Wallet connectivity is handled with Reown AppKit.

Required environment variable:

```bash
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id
```

Example env file:

- [web/.env.example](C:\Users\hp\Desktop\arbs-london\web.env.example)

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

## Environment

At minimum, local wallet flows require the Reown project ID.

Depending on which API-backed or database-backed paths you use, you may also need additional environment variables for:

- RPC access
- database connectivity
- third-party data sources
- vault address configuration for each supported asset and chain

If you expand the app beyond the current prototype state, document those variables in `.env.example` and keep this README in sync.

Current deposit integration expects:

- `NEXT_PUBLIC_ARBITRUM_USDC_VAULT_ADDRESS`
- `NEXT_PUBLIC_ARBITRUM_SEPOLIA_USDC_TOKEN_ADDRESS`
- `NEXT_PUBLIC_ARBITRUM_SEPOLIA_USDC_VAULT_ADDRESS`
- `NEXT_PUBLIC_ROBINHOOD_USDC_TOKEN_ADDRESS`
- `NEXT_PUBLIC_ROBINHOOD_USDC_VAULT_ADDRESS`

If those vault variables are missing, the UI still loads, but live deposit actions for the affected chain will stay unavailable.

For production-grade tokenized-equity pricing and chart history, add:

- `POLYGON_API_KEY`
- `STOCK_MARKET_DATA_PROVIDER=polygon`

There is now a second, better config path for vault deployments:

- [web/lib/generated/vault-addresses.json](C:\Users\hp\Desktop\arbs-london\web\lib\generated\vault-addresses.json)

The contracts deploy script updates that generated file automatically, so frontend vault wiring no longer has to rely only on hand-edited env vars.

## App Structure

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

The app is currently Arbitrum-first, with Robinhood Chain testnet support added at the wallet layer:

- Arbitrum One
- Arbitrum Sepolia
- Robinhood Chain Testnet

Important nuance:

- live asset, protocol, opportunity, and recommendation APIs are still centered on Arbitrum market data
- Robinhood Chain support currently improves wallet/network readiness and the product story around tokenized assets and RWAs
- Robinhood stock-token contract discovery is now seeded from official Robinhood documentation in the fallback asset registry
- Robinhood wallet valuation and charting now support a production-grade Polygon / Massive stock market data path
- Robinhood-specific yield / protocol opportunity ingestion is still not complete

## Recommendation Engine

The current recommendation layer is already implemented:

- it uses live Arbitrum protocol and yield data
- it scores opportunities against risk and liquidity presets
- it returns structured allocations, rationale, expected APY, and warnings
- it supports copilot-style guidance inside the product experience

Recommended product description:

"A policy-driven copilot that explains and ranks compliant vault allocation routes."

## UX Notes

The current interface is designed around a vault product rather than a generic wallet:

- users are oriented around a shared vault position
- withdrawal messaging focuses on idle liquidity versus unwind requirements
- recommendation data is folded into the product flow rather than isolated as a separate research surface
- supported networks now reflect both current Arbitrum execution paths and a Robinhood Chain expansion path for tokenized assets

## Limitations

- some screens are still presentation-first rather than production-integrated
- frontend routes may rely on app-defined data models while backend integrations evolve
- wallet UX is present, but operator workflows and full transaction orchestration will need additional integration work
- the dedicated withdraw page does not yet reflect live queue state or recall progress
- the activity page does not yet index deployed contract events
- the policy and recommendation experiences are currently unified into the homepage flow

## Related Docs

- [root README](C:\Users\hp\Desktop\arbs-london\README.md)
- [contracts README](C:\Users\hp\Desktop\arbs-london\contracts\README.md)

## Devpost / Hackathon Copy Pack

### Short Description

Kabon is a policy-driven DeFi vault interface where users deposit once and use a copilot to evaluate and explain compliant yield routes on Arbitrum, with Robinhood Chain support for expansion.

### Full Description

Kabon addresses a practical DeFi problem: yield management is fragmented, time-consuming, and difficult to unwind safely. The web app presents a vault-oriented experience where users can deposit supported assets, review copilot recommendations, inspect live protocol data, and follow withdrawal expectations around a whitelisted vault allocation model.

### Demo Narration Script (2 minutes)

1. "Kabon helps users avoid manual strategy hopping by using a shared vault model."
2. Connect wallet and confirm you are on a supported chain.
3. Open deposit flow, select asset, and submit vault deposit transaction.
4. Show Kabon Copilot and explain why a route is preferred using live APY, liquidity, and risk context.
5. Open the protocol explorer to validate the recommendation against current market venues.
6. Close with: "one vault position, policy-guided allocation, and clearer risk/exit visibility."

### Judging Criteria Mapping (Frontend)

- **Product-market fit**: simplified UX for repetitive yield operations
- **Innovation**: combines agentic recommendation framing with transaction-capable vault UX
- **Real problem solving**: reduces operational complexity around discovery, deployment, and exits

### Reviewer Quickstart

```bash
cd web
bun install
bun run dev
```

Set required environment variables in `.env.local` (see wallet and vault variables above) before running the demo.

## Verification Notes

On April 29, 2026:

- contract tests passed locally in the `contracts` workspace
- the web production build could not be cleanly re-run because another `next build` process was already active in the environment at the time of verification
- Robinhood stock-token pricing/history was verified through the app API routes after the shared market-data provider refactor
