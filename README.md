# YieldPilot

YieldPilot is an Arbitrum-focused DeFi product that lets users deposit supported assets into a shared vault, receive AI-assisted allocation recommendations across approved protocols, and withdraw through a vault-managed unwind flow instead of handling protocol exits manually.

This repository is split into two workspaces:

- [web](C:\Users\hp\Desktop\arbs-london\web): the Next.js frontend
- [contracts](C:\Users\hp\Desktop\arbs-london\contracts): the Hardhat + OpenZeppelin smart contracts

## Product overview

YieldPilot is designed around a simple user story:

1. connect a wallet
2. deposit a supported asset into the shared vault
3. review approved deployment options surfaced by the product
4. let the vault manage allocations and withdrawals on the user's behalf

The UX is intentionally minimal and Aave-inspired:

- compact product shell
- simple deposit and receive flows
- recommendation logic folded into the deposit journey
- withdrawal screens focused on what is available now versus what needs unwind time

## Repository layout

```text
arbs-london/
  contracts/   Hardhat 3, Ignition, OpenZeppelin, viem
  web/         Next.js 16, React 19, shadcn/ui, Reown
```

## Smart contracts

The contracts workspace contains the shared vault and proxy deployment system:

- transparent upgradeable proxy architecture
- OpenZeppelin-based implementation contracts
- ERC-4626 shared vault with owner-managed strategy deployment
- owner-managed withdrawal queue for predictable unwind ordering
- explicit reentrancy protection around vault entrypoints and strategy callbacks
- a test-only upgrade mock used to verify proxy upgrades safely
- Hardhat Ignition deployment modules
- tests for deposit, allocation, withdrawal unwind, and upgradeability

See:
- [contracts/README.md](C:\Users\hp\Desktop\arbs-london\contracts\README.md)

## Frontend

The frontend workspace contains:

- deposit, receive, dashboard, and withdraw flows
- Reown wallet connect integration
- shadcn/ui primitives
- Arbitrum-focused network metadata and wallet UX

See:
- [web/README.md](C:\Users\hp\Desktop\arbs-london\web\README.md)

## Local development

### Contracts

```bash
cd contracts
yarn install
npx hardhat compile
npx hardhat test
```

### Frontend

```bash
cd web
bun install
bun run dev
```

## Core ideas

- one shared vault per supported asset
- idle liquidity kept in-vault to improve withdrawal responsiveness
- whitelisted strategy destinations only
- transparent upgradeability with OpenZeppelin
- a user-facing experience that avoids exposing unnecessary protocol complexity

## Status

This repository now includes:

- a working proxy-based vault system with upgrade coverage
- strategy accounting and withdrawal-queue management split into dedicated contract modules
- reentrancy regression coverage for strategy callback attacks during deploy and unwind flows
- a polished frontend prototype for deposit, receive, dashboard, and withdrawal flows
- wallet connection via Reown

It is structured to be presentable on GitHub and practical for continued hackathon iteration.
