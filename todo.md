# Arbitrum Buildathon MVP Todo

## Product Name

YieldPilot

AI-assisted stablecoin treasury vault on Arbitrum.

## One-Line Pitch

Users deposit USDC into a policy-controlled vault on Arbitrum, and an off-chain agent recommends how to allocate capital across whitelisted yield opportunities based on the user's risk and liquidity preferences.

## Why This Can Win

- Fits the hackathon theme: capital, institutions, real-world adoption, Arbitrum-native infra
- Strong agentic angle without unsafe "AI controls everything" messaging
- Clear real-world use case: idle stablecoin treasury management
- Easy demo story: deposit, get recommendations, approve allocation, track position, withdraw
- Judges can quickly understand the value
- Technical depth is visible in both smart contracts and product design

## Core Product Idea

This is not generic escrow.

This is not "AI picks random farms."

This is a smart treasury copilot:

- User deposits USDC into an onchain vault
- User selects policy settings
- Agent analyzes only approved opportunities
- Agent recommends an allocation plan with reasoning
- User approves execution
- Vault moves funds only within allowed rules
- User can exit and withdraw back to wallet

## MVP Goal

Build the smallest version that proves:

1. A user can deposit USDC into a vault
2. A user can define simple policy rules
3. An off-chain agent can generate clear allocation recommendations from whitelisted protocols
4. The user can approve a recommendation
5. The contract can execute allocation into supported strategy adapters
6. The user can unwind positions and withdraw funds
7. The UI makes all of this understandable in under 3 minutes

## User Persona

Primary persona:

- startup founder
- DAO operator
- small treasury manager
- crypto-native team holding idle USDC

Simple story:

"I have idle USDC. I want safer yield opportunities on Arbitrum, but I do not want to manually monitor protocols all day."

## MVP User Flow

### 1. Connect Wallet

- User connects wallet
- Network is Arbitrum Sepolia for demo or Arbitrum if feasible

### 2. Create Vault Policy

User chooses:

- risk level: Conservative / Balanced / Yield
- liquidity preference: Instant / 7 days / Flexible
- max allocation per protocol
- allowed strategies from whitelist

For MVP, use simple presets instead of too many controls.

### 3. Deposit USDC

- User deposits USDC into vault
- Vault mints shares or tracks balances internally
- Funds remain owned by vault logic, withdrawable by user

### 4. Agent Recommendation

Agent returns:

- recommended allocation split
- expected APY
- liquidity notes
- risk score
- explanation in simple English

Example:

- 50% idle USDC
- 30% Protocol A lending adapter
- 20% Protocol B yield adapter

### 5. Approve Execution

- User clicks approve recommendation
- Vault executes only allowed actions
- Allocation is stored onchain and reflected in UI

### 6. Monitor Portfolio

UI shows:

- total vault value
- current allocations
- estimated yield
- available to withdraw
- pending unwind if any

### 7. Withdraw

Very important for clarity.

When user wants money back:

- user clicks withdraw
- if enough idle USDC exists, vault returns instantly
- if funds are deployed, vault unwinds positions from supported adapters
- once assets return to vault, user receives USDC back

For MVP, we should support:

- partial withdraw from idle funds first
- full withdraw by unwinding supported positions
- clear UI states: Available now / Requires unwind / Processing

## What Happens If User Wants Money Back

This must be extremely clear in the product and demo.

Rules:

- User funds are never locked forever by the AI
- User can always request withdrawal
- Withdrawals come from idle vault balance first
- If funds are allocated, the vault unwinds positions from supported strategies
- If a strategy has delay or liquidity constraints, the UI must tell the user before allocation

MVP simplification:

- only support strategies that are easy to unwind for demo purposes
- avoid strategies with long lockups
- show "estimated withdrawal time" per strategy

## What The Agent Actually Does

The agent does not custody funds.

The agent does not get private keys.

The agent does:

- read protocol metadata from a curated dataset
- compare opportunities against user policy
- rank possible allocations
- explain recommendations
- optionally trigger a transaction request for user approval

## What Smart Contracts Actually Do

Contracts handle:

- deposits
- withdrawals
- vault accounting
- policy enforcement
- strategy allocation through adapters
- unwind flow
- event logging

Important:

- agent recommendations are off-chain
- execution guardrails are onchain

## Recommended MVP Architecture

### Contracts

#### 1. Vault Contract

Responsibilities:

- accept USDC deposits
- track user balances or shares
- hold idle funds
- allocate to strategy adapters
- unwind and withdraw

#### 2. Policy Manager

Responsibilities:

- store user vault settings
- enforce allowed strategies
- enforce max allocation per strategy

For MVP, this can be merged into the vault if speed matters.

#### 3. Strategy Adapters

Responsibilities:

- standard interface for deposit/withdraw into supported protocols
- isolate protocol-specific logic

Adapter interface:

- deposit(amount)
- withdraw(amount)
- currentValue()
- availableLiquidity()
- metadata()

#### 4. Recommendation Executor

Optional for MVP.

Could be merged into vault admin/user execution path.

### Off-Chain Backend / Agent

Responsibilities:

- maintain whitelist of supported strategies
- fetch APY, liquidity, and risk data
- apply allocation rules
- generate recommendation JSON
- generate explanation text for UI

### Frontend

Responsibilities:

- onboarding
- deposit
- policy selection
- recommendation display
- approval flow
- portfolio view
- withdrawal flow

## MVP Scope: What To Build Now

### Must Have

- [x] wallet connect
- [x] USDC deposit into vault
- 2 to 3 whitelisted strategy options
- policy presets
- off-chain recommendation engine
- approve and execute allocation
- portfolio dashboard
- [x] withdraw flow with unwind
- clean explanation of risk/liquidity

### Nice To Have

- rebalance button
- historical recommendation log
- alerts
- simulation mode
- gas estimate preview

### Do Not Build In MVP

- dozens of protocols
- fully autonomous execution without approval
- cross-chain routing
- advanced AI chat as the main UI
- complex governance
- dispute systems
- social features
- overcomplicated tokenomics

## Best MVP Positioning

Do not pitch it as:

- yield aggregator
- robo-advisor
- AI trading bot

Pitch it as:

"A policy-driven AI treasury copilot for stablecoin allocation on Arbitrum."

## Strategy Support For MVP

We should keep this very small.

Target:

- 1 idle cash position
- 2 live yield strategies

Selection criteria:

- easy to explain
- easy to integrate
- easy to unwind
- low chance of demo breakage

MVP data model per strategy:

- name
- protocol
- asset
- estimated APY
- liquidity profile
- risk score
- whitelist status
- adapter address

## Recommendation Logic For MVP

Keep it deterministic and credible.

Inputs:

- user risk profile
- user liquidity preference
- current strategy metadata

Outputs:

- allocation percentages
- explanation
- warnings

Example rules:

- Conservative: higher idle cash, lower protocol concentration
- Balanced: moderate split across 2 strategies
- Yield: lower idle cash, higher deployment to top whitelisted APY options

Important:

Do not oversell intelligence.

Better:

"AI summarizes and explains the best policy-compliant allocation."

Not:

"AI guarantees optimal returns."

## Smart Contract Requirements

### Functional

- [x] deposit USDC
- [x] withdraw USDC
- [x] allocate to supported adapter
- [x] unwind from adapter
- [x] enforce whitelist
- enforce max allocation cap
- [x] emit events for each major action

### Safety

- only supported tokens
- [x] only whitelisted adapters
- no unrestricted external calls
- [x] reentrancy protection
- [x] pause or emergency stop if possible
- [x] clear owner/admin boundaries

### Demo Constraints

- every action should be reproducible on testnet
- avoid any flow that depends on fragile external timing
- use mock adapters if live integrations become too risky

## Frontend Requirements

### Page 1: Landing / Product Overview

Must explain in one screen:

- what the product does
- why AI helps
- why it is safe
- how user withdrawals work

### Page 2: Create Policy

Simple controls:

- risk preset
- liquidity preset
- allowed strategies

### Page 3: Vault Dashboard

Show:

- deposited amount
- idle amount
- allocated amount
- recommended plan
- approve button
- withdraw button

### Page 4: Recommendation Details

Show:

- protocol names
- percentages
- expected APY
- risk explanation
- liquidity notes
- "why this recommendation"

### Page 5: Withdraw Flow

Show clearly:

- available to withdraw immediately
- amount that needs unwind
- estimated completion path

## Demo Story

This needs to feel polished and obvious.

### Demo Script

1. Connect wallet
2. Deposit demo USDC
3. Choose Conservative or Balanced policy
4. Ask the agent for recommendation
5. Show recommendation with plain-English reasoning
6. Approve allocation
7. Show funds deployed across strategies
8. Trigger withdrawal
9. Show unwind and return of USDC to wallet/vault

### Demo Message

"This is how a startup or DAO can safely deploy idle stablecoins on Arbitrum without manually researching and managing every protocol."

## Judging Alignment

### Smart Contract Quality

- modular vault plus adapters
- clean access control
- limited surface area
- clear security thinking

### Product-Market Fit

- real treasury problem
- easy user story
- relevant to startups, DAOs, and fintech

### Innovation and Creativity

- AI as treasury copilot, not gimmick
- policy-driven recommendations
- explainable onchain allocation

### Real Problem Solving

- idle stablecoin management
- simpler risk-aware deployment
- transparent withdrawal path

## How To Make It Feel More Premium

- use polished language
- avoid "degen yield" framing
- talk about treasury operations, capital allocation, policy controls, and liquidity management
- make UI feel like fintech, not casino DeFi

## Risks To Avoid

- promising returns
- relying on too many live integrations
- building too much AI chat instead of product flow
- unclear withdrawal mechanics
- too many protocol options
- no explanation of guardrails

## Winning MVP Checklist

- [ ] User understands product in 20 seconds
- [x] Deposit works
- [ ] Recommendation works
- [ ] Allocation execution works
- [x] Withdrawal story is clear and demoable
- [x] Supported strategies are whitelisted and visible
- [ ] UI explains risk and liquidity clearly
- [ ] Smart contracts are clean and limited in scope
- [ ] Demo feels like a real treasury tool

## Build Plan

### Phase 1: Product Definition

- [ ] lock product name
- [ ] lock user persona
- [ ] lock exact pitch
- [ ] lock 2 to 3 supported strategies
- [ ] lock risk presets

### Phase 2: Contracts

- [x] implement vault deposit/withdraw
- [x] implement adapter interface
- [x] implement 2 strategy adapters or mocks
- [ ] add policy enforcement
- [x] add events and safety guards

### Phase 3: Backend / Agent

- [ ] create whitelist strategy dataset
- [ ] define recommendation JSON schema
- [ ] build policy-based recommendation engine
- [ ] generate plain-English explanation

### Phase 4: Frontend

- [ ] landing page
- [ ] policy setup flow
- [ ] deposit flow
- [ ] recommendation panel
- [ ] allocation approval flow
- [ ] withdrawal flow
- [ ] portfolio overview

### Phase 5: Demo Prep

- [ ] seed test wallets
- [ ] prepare happy path demo
- [ ] prepare fallback demo with mock adapters
- [ ] write short demo script
- [ ] prepare architecture slide

## Stretch Goals After MVP

- auto-rebalancing within user-approved policy
- notification system for changing yield/risk
- institution/team vaults with multi-approver flow
- RWA strategy integrations
- Robinhood Chain support
- recommendation history and analytics

## Final Product Principle

If we get stuck, choose the version that makes the user say:

"I understand where my money is, why it was allocated there, and how I can get it back."

That clarity is part of what will make this feel strong enough to win.

## Current Contract Progress

- [x] proxy-based ERC-4626 vault with upgrade test coverage
- [x] strategy whitelist and deployment controls
- [x] active strategy accounting cached on-chain
- [x] owner-managed withdrawal queue for targeted unwinds
- [x] reentrancy regression tests for malicious strategy callbacks
- [ ] per-user policy enforcement onchain
- [ ] live protocol adapters beyond mocks
- [ ] gas benchmarking report for main user flows
