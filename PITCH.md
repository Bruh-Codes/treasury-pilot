# Kabon Pitch

## One-Line Pitch

Kabon is a policy-driven vault copilot that helps users and DAOs deposit once, evaluate vetted yield routes, and withdraw with transparent unwind logic on Arbitrum, with Robinhood Chain support as an RWA expansion path.

## Short Description

Kabon is a policy-driven DeFi vault interface where users deposit once and use a copilot to evaluate and explain compliant yield routes on Arbitrum, with Robinhood Chain support for expansion.

## Full Pitch

Kabon focuses on a practical DeFi pain point: yield management is fragmented, time-consuming, and hard to unwind safely. Instead of forcing users to manually monitor protocols and move funds venue by venue, Kabon wraps the experience in a vault-oriented product flow.

Users deposit supported assets into a shared ERC-4626 vault, review recommendation context built from live Arbitrum market data, and follow a clearer path for allocation and withdrawal decisions. The contract system handles strategy accounting, whitelist controls, and unwind order, while the product experience makes those mechanics understandable to end users and treasury operators.

Today, Kabon already demonstrates:

- wallet connection and supported-chain UX
- vault deposit flow when configured addresses are present
- live Arbitrum protocol and opportunity browsing
- a copilot recommendation layer based on policy-style scoring and liquidity/risk preferences
- Robinhood Chain testnet support as an expansion path for tokenized assets and RWAs

## Problem

- yield routing is fragmented and manual
- users and operators must track APY and liquidity across many protocols
- withdrawals become operationally difficult when liquidity is deployed instead of idle

## Why It Matters

- startups and DAOs often hold idle stablecoins but do not want to manage protocol-by-protocol allocation full time
- users want clearer exit expectations, not just better entry flows
- judges can quickly understand both the user pain and the product response

## Solution

- single vault deposit flow with ERC-4626 shares as the user receipt
- strategy deployment and unwind queue handled at vault/operator layer
- recommendation and policy-driven execution framing in the app UX
- clearer withdrawal expectations when recalls are needed

## What Is Real Today

Status checked on April 27, 2026:

- wallet connect is implemented
- vault deposit flow is implemented in the homepage flow when supported env vars and vault addresses are configured
- live protocol and opportunity browsing is implemented for Arbitrum
- recommendation generation is implemented today as a deterministic scoring engine over live market data
- copilot UI is implemented, but it is not yet a true LLM-backed agent workflow

## What Is Still Missing

- deployed production or testnet addresses documented for final submission
- standalone live policy builder flow
- fully integrated withdraw queue and indexed activity history
- stronger AI layer beyond deterministic recommendation logic

## 2-Minute Demo Flow

1. Connect wallet and select a supported Arbitrum chain.
2. Deposit into the vault-backed flow.
3. Show the Kabon Copilot recommendation and rationale using APY, liquidity, and risk context.
4. Open the protocol explorer to validate the recommended venue against live market data.
5. Explain the next deployment-phase steps: allocation execution, withdrawal queue UX, and indexed activity.

## Judge Framing

- **Smart contract quality**: upgradeable vault architecture, non-reentrant entrypoints, strategy accounting checks, and test coverage for deploy/withdraw/unwind/upgrade flows
- **Product-market fit**: targeted at users and treasuries that want simplified yield operations
- **Innovation and creativity**: combines shared-vault UX with recommendation-driven execution framing
- **Real problem solving**: reduces fragmented yield management and makes unwind behavior explicit
