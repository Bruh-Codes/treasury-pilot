# YieldPilot Web

Next.js frontend for YieldPilot's shared-vault deposit, receive, dashboard, and withdrawal flows.

## Stack

- Next.js 16
- React 19
- TypeScript
- shadcn/ui
- Tailwind CSS v4
- Reown AppKit + Wagmi + Viem
- Recharts for lightweight chart surfaces

## Product surfaces

The frontend currently covers:

- deposit table with supported assets
- deposit modal with asset selection and amount entry
- receive modal with QR code and supported-chain details
- dashboard overview for vault balance, deployed capital, and allocation activity
- withdraw flow focused on amount, available-now liquidity, and unwind expectations

## Wallet integration

Wallet connection is handled with Reown AppKit.

Required environment variable:

```bash
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id
```

An example file is included at:
- [web/.env.example](C:\Users\hp\Desktop\arbs-london\web\.env.example)

## Supported chains

The current frontend is Arbitrum-first:

- Arbitrum One
- Arbitrum Sepolia

## Run locally

Install dependencies:

```bash
bun install
```

Start the development server:

```bash
bun run dev
```

Build:

```bash
bun run build
```

## Structure

```text
web/
  app/          App Router pages and layouts
  components/   product components and shadcn/ui wrappers
  hooks/        reusable frontend hooks
  lib/          wallet config, app state, helpers
```

## UX direction

The UI is intentionally restrained and dark, with an Aave-inspired tone:

- smaller control density
- minimal copy
- compact action modals
- clear hierarchy over feature bloat

## Notes

- Recommendation selection has been intentionally folded back into the deposit journey instead of living as a separate route.
- Supported-chain and receive flows are tailored for the shared vault model rather than a generic wallet UI.
