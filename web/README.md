# YieldPilot Web

Next.js frontend for the YieldPilot product experience. This app presents vault-related views such as dashboard, activity, recommendation, deposit-oriented flows, and withdrawals, while also wiring wallet connectivity and app-facing API routes.

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

- dashboard views for vault balances and opportunity summaries
- withdrawal flow focused on amount, available liquidity, and expected unwind behavior
- recommendation and policy pages
- activity views
- wallet connection and chain-aware UX
- Robinhood Chain testnet wallet support for RWA-oriented product positioning
- API routes for assets, protocols, opportunities, and recommendations

This frontend is product-facing. It does not currently execute the full onchain vault lifecycle by itself without the surrounding backend or operator logic.

## Wallet Setup

Wallet connectivity is handled with Reown AppKit.

Required environment variable:

```bash
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id
```

Example env file:

- [web/.env.example](C:\Users\hp\Desktop\arbs-london\web\.env.example)

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

If you expand the app beyond the current prototype state, document those variables in `.env.example` and keep this README in sync.

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
- Robinhood-specific market ingestion can be layered in later as that ecosystem and its data surfaces mature

## UX Notes

The current interface is designed around a vault product rather than a generic wallet:

- users are oriented around a shared vault position
- withdrawal messaging focuses on idle liquidity versus unwind requirements
- recommendation data is folded into the product flow rather than isolated as a separate research surface
- supported networks now reflect both current Arbitrum execution paths and a Robinhood Chain expansion path for tokenized assets

## Limitations

- some screens are still presentation-first rather than production-integrated
- frontend routes may rely on placeholder or app-defined data models while backend integrations evolve
- wallet UX is present, but operator workflows and full transaction orchestration will need additional integration work

## Related Docs

- [root README](C:\Users\hp\Desktop\arbs-london\README.md)
- [contracts README](C:\Users\hp\Desktop\arbs-london\contracts\README.md)
