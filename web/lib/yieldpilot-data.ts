import type { LiquidityPreset, RiskPreset } from "./yieldpilot-types";

export type { LiquidityPreset, RiskPreset } from "./yieldpilot-types";

export const RISK_PRESETS: Record<
  RiskPreset,
  { label: string; description: string; idle: number; perStrategyMax: number }
> = {
  conservative: {
    label: "Conservative",
    description: "Capital preservation first. Higher idle reserve, low-risk venues only.",
    idle: 0.5,
    perStrategyMax: 0.3,
  },
  balanced: {
    label: "Balanced",
    description: "Moderate deployment across blue-chip Arbitrum venues.",
    idle: 0.2,
    perStrategyMax: 0.45,
  },
  yield: {
    label: "Yield",
    description: "Maximize policy-compliant APY. Smaller idle buffer.",
    idle: 0.1,
    perStrategyMax: 0.55,
  },
};

export const LIQUIDITY_PRESETS: Record<
  LiquidityPreset,
  { label: string; description: string }
> = {
  instant: {
    label: "Instant",
    description: "Only strategies with on-demand withdrawals.",
  },
  weekly: {
    label: "Up to 7 days",
    description: "Allow strategies with short unwind windows.",
  },
  flexible: {
    label: "Flexible",
    description: "Allow all whitelisted strategies regardless of unwind time.",
  },
};

export function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatPct(n: number, digits = 1) {
  return `${(n * 100).toFixed(digits)}%`;
}
