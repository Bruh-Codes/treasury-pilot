export type RiskPreset = "conservative" | "balanced" | "yield";
export type LiquidityPreset = "instant" | "weekly" | "flexible";

export type Strategy = {
  id: string;
  name: string;
  protocol: string;
  asset: "USDC";
  apy: number;
  liquidity: "Instant" | "1–3 days" | "7 days";
  risk: "Low" | "Medium" | "Medium-High";
  riskScore: number;
  description: string;
  whitelisted: true;
};

export const STRATEGIES: Strategy[] = [
  {
    id: "idle",
    name: "Idle Reserve",
    protocol: "Vault Cash",
    asset: "USDC",
    apy: 0,
    liquidity: "Instant",
    risk: "Low",
    riskScore: 1,
    description:
      "Unallocated USDC held in the vault. Available for instant withdrawal.",
    whitelisted: true,
  },
  {
    id: "aave-v3",
    name: "Aave v3 USDC",
    protocol: "Aave v3 · Arbitrum",
    asset: "USDC",
    apy: 4.82,
    liquidity: "Instant",
    risk: "Low",
    riskScore: 2,
    description:
      "Supply USDC to Aave v3 lending market. Withdrawals settle on demand subject to utilization.",
    whitelisted: true,
  },
  {
    id: "compound-v3",
    name: "Compound v3 USDC",
    protocol: "Compound v3 · Arbitrum",
    asset: "USDC",
    apy: 5.41,
    liquidity: "Instant",
    risk: "Low",
    riskScore: 2,
    description:
      "USDC base market on Compound v3. Continuous accrual, instant unwind from idle liquidity.",
    whitelisted: true,
  },
  {
    id: "gmx-glp",
    name: "GMX GLP Hedged",
    protocol: "GMX · Arbitrum",
    asset: "USDC",
    apy: 9.74,
    liquidity: "1–3 days",
    risk: "Medium",
    riskScore: 4,
    description:
      "Delta-neutral GLP exposure. Higher yield, short unwind window.",
    whitelisted: true,
  },
];

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
    description: "Moderate deployment across blue-chip lending markets.",
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

export type Allocation = {
  strategyId: string;
  percent: number;
};

export type Recommendation = {
  allocations: Allocation[];
  expectedApy: number;
  riskScore: number;
  rationale: string;
  warnings: string[];
};

export function generateRecommendation(
  risk: RiskPreset,
  liquidity: LiquidityPreset,
): Recommendation {
  const preset = RISK_PRESETS[risk];
  const eligible = STRATEGIES.filter((s) => {
    if (s.id === "idle") return false;
    if (liquidity === "instant") return s.liquidity === "Instant";
    if (liquidity === "weekly") return s.liquidity !== "7 days";
    return true;
  }).sort((a, b) => b.apy - a.apy);

  const idlePct = preset.idle;
  const deployPct = 1 - idlePct;

  const picks = eligible.slice(0, risk === "conservative" ? 1 : 2);
  const split = picks.length === 1 ? [1] : risk === "yield" ? [0.6, 0.4] : [0.55, 0.45];

  const allocations: Allocation[] = [
    { strategyId: "idle", percent: idlePct },
    ...picks.map((s, i) => ({
      strategyId: s.id,
      percent: Math.min(deployPct * split[i], preset.perStrategyMax),
    })),
  ];

  const total = allocations.reduce((a, b) => a + b.percent, 0);
  const idle = allocations.find((a) => a.strategyId === "idle")!;
  idle.percent += 1 - total;

  const expectedApy = allocations.reduce((acc, a) => {
    const s = STRATEGIES.find((x) => x.id === a.strategyId)!;
    return acc + a.percent * s.apy;
  }, 0);

  const riskScore = allocations.reduce((acc, a) => {
    const s = STRATEGIES.find((x) => x.id === a.strategyId)!;
    return acc + a.percent * s.riskScore;
  }, 0);

  const warnings: string[] = [];
  if (picks.some((s) => s.liquidity !== "Instant")) {
    warnings.push("One or more positions require a short unwind window before withdrawal.");
  }

  const rationale = `Based on a ${preset.label.toLowerCase()} risk profile and ${LIQUIDITY_PRESETS[liquidity].label.toLowerCase()} liquidity preference, ${(idlePct * 100).toFixed(0)}% is held as idle reserve for instant withdrawal. The remainder is deployed across ${picks.map((p) => p.name).join(" and ")} — selected for whitelist status, transparent on-chain accounting, and short unwind paths.`;

  return { allocations, expectedApy, riskScore, rationale, warnings };
}

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
