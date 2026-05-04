import { NextResponse } from "next/server";
import { z } from "zod";

import { buildRecommendation } from "@/lib/server/arbitrum-market-data";
import type { Recommendation } from "@/lib/yieldpilot-types";

const copilotAssetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  symbol: z.string().min(1),
  chainId: z.number().int(),
  chainLabel: z.string().min(1),
  balance: z.number().nonnegative(),
  depositedBalance: z.number().nonnegative(),
  valueUsd: z.number().nullable(),
  unitPriceUsd: z.number().nullable(),
  supported: z.boolean(),
  apy: z.string(),
  totalDeposits: z.string(),
  availableLiquidity: z.string(),
});

const copilotAnalysisRequestSchema = z.object({
  mode: z.enum(["portfolio", "asset"]),
  policy: z.enum(["conservative", "balanced", "yield"]).default("balanced"),
  assets: z.array(copilotAssetSchema),
  focusAssetId: z.string().optional(),
});

type CopilotAssetInput = z.infer<typeof copilotAssetSchema>;
type CopilotPolicyPreset = z.infer<
  typeof copilotAnalysisRequestSchema
>["policy"];

type CopilotAgentStep = {
  title: string;
  description: string;
  status: "complete" | "ready" | "blocked";
};

const POLICY_CONFIG: Record<
  CopilotPolicyPreset,
  {
    label: string;
    risk: "conservative" | "balanced" | "yield";
    liquidity: "instant" | "weekly" | "flexible";
  }
> = {
  conservative: {
    label: "Conservative",
    risk: "conservative",
    liquidity: "instant",
  },
  balanced: {
    label: "Balanced",
    risk: "balanced",
    liquidity: "instant",
  },
  yield: {
    label: "Yield",
    risk: "yield",
    liquidity: "flexible",
  },
};
const AAVE_USDC_SEPOLIA_STRATEGY =
  process.env.NEXT_PUBLIC_AAVE_USDC_SEPOLIA_STRATEGY_ADDRESS;

function getExecutableProtocols(asset: CopilotAssetInput) {
  if (
    AAVE_USDC_SEPOLIA_STRATEGY &&
    asset.chainId === 421614 &&
    asset.symbol.toUpperCase() === "USDC"
  ) {
    return ["aave", "aave-v3", "aave-v2"];
  }

  return undefined;
}

type CopilotAnalysisItem = {
  assetId: string;
  name: string;
  symbol: string;
  chainLabel: string;
  balance: number;
  depositedBalance: number;
  valueUsd: number | null;
  unitPriceUsd: number | null;
  status: "actionable" | "hold" | "blocked" | "error";
  label: string;
  summary: string;
  decisionTitle: string;
  confidence: "high" | "medium" | "low";
  expectedApy: number;
  protocolName: string | null;
  rationale: string;
  factors: string[];
  risks: string[];
  warnings: string[];
  nextAction: string;
};

type CopilotNarrative = {
  headline: string;
  summary: string;
  drivers: string[];
  cautions: string[];
  nextAction: string;
};

function buildMarketFactors(asset: CopilotAssetInput) {
  const factors: string[] = [];
  if (asset.balance > 0) {
    factors.push(
      `${asset.balance.toLocaleString()} ${asset.symbol} detected in wallet`,
    );
  }
  if (asset.depositedBalance > 0) {
    factors.push(
      `${asset.depositedBalance.toLocaleString()} ${asset.symbol} already represented by vault shares`,
    );
  }
  if (asset.totalDeposits !== "-") {
    factors.push(`${asset.totalDeposits} visible across tracked opportunities`);
  }
  if (asset.availableLiquidity !== "-") {
    factors.push(`${asset.availableLiquidity} available for exit context`);
  }
  return factors;
}

function buildRouteRisks(asset: CopilotAssetInput, warnings: string[]) {
  const risks = [...warnings];
  if (asset.chainLabel.toLowerCase().includes("testnet")) {
    risks.push(
      "This route is on a testnet deployment and is not production capital infrastructure.",
    );
  }
  if (asset.availableLiquidity === "-") {
    risks.push(
      "Liquidity depth is not available for this asset in the current market data set.",
    );
  }
  return Array.from(new Set(risks)).slice(0, 4);
}

function selectPrimaryAllocation(recommendation: Recommendation) {
  return (
    recommendation.allocations
      .filter(
        (allocation) => allocation.strategy.apy > 0 && allocation.percent > 0,
      )
      .sort((left, right) => right.percent - left.percent)[0] ?? null
  );
}

async function analyzeAsset(
  asset: CopilotAssetInput,
  policy: CopilotPolicyPreset,
): Promise<CopilotAnalysisItem> {
  if (!asset.supported) {
    const needsVaultMessage =
      asset.symbol === "ETH"
        ? "A Kabon vault is not deployed for ETH on this chain yet."
        : "A Kabon deposit route is not configured for this asset yet.";

    return {
      assetId: asset.id,
      name: asset.name,
      symbol: asset.symbol,
      chainLabel: asset.chainLabel,
      balance: asset.balance,
      depositedBalance: asset.depositedBalance,
      valueUsd: asset.valueUsd,
      unitPriceUsd: asset.unitPriceUsd,
      status: "blocked",
      label: asset.supported ? "Needs data" : "Needs vault",
      summary: needsVaultMessage,
      decisionTitle: "No approved route",
      confidence: "high",
      expectedApy: 0,
      protocolName: null,
      rationale: needsVaultMessage,
      factors: buildMarketFactors(asset),
      risks: [needsVaultMessage],
      warnings: [needsVaultMessage],
      nextAction:
        "Track the asset, but wait for a supported vault and whitelisted adapter before allocating.",
    };
  }

  try {
    const recommendation = await buildRecommendation({
      assetSymbol: asset.symbol,
      amount: Math.max(asset.valueUsd ?? asset.balance, 1),
      risk: POLICY_CONFIG[policy].risk,
      liquidity: POLICY_CONFIG[policy].liquidity,
      allowedProtocols: getExecutableProtocols(asset),
    });
    const primary = selectPrimaryAllocation(recommendation);
    const expectedApy = Number(recommendation.expectedApy ?? 0);
    const requiresDeposit = asset.balance > 0 && asset.depositedBalance <= 0;

    if (requiresDeposit) {
      const warnings = buildRouteRisks(asset, recommendation.warnings);
      return {
        assetId: asset.id,
        name: asset.name,
        symbol: asset.symbol,
        chainLabel: asset.chainLabel,
        balance: asset.balance,
        depositedBalance: asset.depositedBalance,
        valueUsd: asset.valueUsd,
        unitPriceUsd: asset.unitPriceUsd,
        status: "actionable",
        label: expectedApy > 0 ? "Deposit-ready" : "Needs deposit",
        summary:
          expectedApy > 0
            ? `Deposit into the Kabon vault to make ${primary?.strategy.name ?? "the leading route"} available.`
            : "Deposit into the Kabon vault first so Kabon can monitor and route this position.",
        decisionTitle:
          expectedApy > 0
            ? `Deposit before allocating to ${primary?.strategy.name ?? "a supported route"}`
            : "Deposit before allocation",
        confidence: expectedApy > 0 ? "high" : "medium",
        expectedApy,
        protocolName: primary?.strategy.name ?? null,
        rationale: recommendation.rationale,
        factors: [
          ...buildMarketFactors(asset),
          ...(primary
            ? [
                `${primary.strategy.name} is currently the leading approved strategy candidate`,
              ]
            : []),
          ...(expectedApy > 0
            ? [`Expected route APY is ${expectedApy.toFixed(2)}%`]
            : []),
        ].slice(0, 5),
        risks: warnings,
        warnings,
        nextAction: primary?.strategy.name
          ? "Deposit into the vault, then let the agent execute the whitelisted route from this sheet."
          : "Open the deposit flow, deposit the supported asset, then review the whitelisted allocation route.",
      };
    }

    if (!primary || expectedApy <= 0) {
      const warnings = buildRouteRisks(asset, recommendation.warnings);
      return {
        assetId: asset.id,
        name: asset.name,
        symbol: asset.symbol,
        chainLabel: asset.chainLabel,
        balance: asset.balance,
        depositedBalance: asset.depositedBalance,
        valueUsd: asset.valueUsd,
        unitPriceUsd: asset.unitPriceUsd,
        status: "hold",
        label: "Hold",
        summary: "Best move is to keep this position idle for now.",
        decisionTitle: "Hold in vault",
        confidence: "medium",
        expectedApy,
        protocolName: null,
        rationale: recommendation.rationale,
        factors: buildMarketFactors(asset),
        risks: warnings,
        warnings,
        nextAction:
          "Keep the position idle until a stronger approved route is available.",
      };
    }

    const warnings = buildRouteRisks(asset, recommendation.warnings);
    return {
      assetId: asset.id,
      name: asset.name,
      symbol: asset.symbol,
      chainLabel: asset.chainLabel,
      balance: asset.balance,
      depositedBalance: asset.depositedBalance,
      valueUsd: asset.valueUsd,
      unitPriceUsd: asset.unitPriceUsd,
      status: "actionable",
      label: "Best route",
      summary: `${primary.strategy.name} is the strongest supported route right now.`,
      decisionTitle: `Allocate through ${primary.strategy.name}`,
      confidence: "high",
      expectedApy,
      protocolName: primary.strategy.name,
      rationale: recommendation.rationale,
      factors: [
        ...buildMarketFactors(asset),
        `${primary.strategy.name} has the highest policy-compatible allocation score`,
        `Expected route APY is ${expectedApy.toFixed(2)}%`,
      ].slice(0, 5),
      risks: warnings,
      warnings,
      nextAction:
        "Execute the route from this sheet through the configured vault and whitelisted adapter.",
    };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Analysis failed unexpectedly.";

    return {
      assetId: asset.id,
      name: asset.name,
      symbol: asset.symbol,
      chainLabel: asset.chainLabel,
      balance: asset.balance,
      depositedBalance: asset.depositedBalance,
      valueUsd: asset.valueUsd,
      unitPriceUsd: asset.unitPriceUsd,
      status: "error",
      label: "Retry",
      summary: "We could not analyze this asset right now.",
      decisionTitle: "Analysis unavailable",
      confidence: "low",
      expectedApy: 0,
      protocolName: null,
      rationale: detail,
      factors: buildMarketFactors(asset),
      risks: [detail],
      warnings: [detail],
      nextAction: "Retry analysis after market and vault data finish loading.",
    };
  }
}

async function generateNarrative(params: {
  mode: "portfolio" | "asset";
  policy: CopilotPolicyPreset;
  items: CopilotAnalysisItem[];
  bestOpportunity: CopilotAnalysisItem | null;
}): Promise<CopilotNarrative | null> {
  const apiKey = process.env.OPENAI_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const prompt = [
    "You are Kabon Copilot, a DeFi vault portfolio analyst.",
    "Your job is to explain contract-bounded vault recommendations clearly and conservatively.",
    "Do not claim you can execute trades, move funds, guarantee yield, or bypass vault controls.",
    "Return only valid JSON with this exact shape:",
    '{"headline":"short title","summary":"2 sentence max dashboard explanation","drivers":["driver 1","driver 2","driver 3"],"cautions":["caution 1","caution 2"],"nextAction":"specific next user action"}',
    "Keep every string concise. Use plain product language. Mention that execution is limited to configured vaults and whitelisted adapters when relevant.",
    "",
    `Mode: ${params.mode}`,
    `Policy: ${POLICY_CONFIG[params.policy].label}`,
    `Best opportunity: ${
      params.bestOpportunity
        ? `${params.bestOpportunity.symbol} via ${params.bestOpportunity.protocolName ?? "deposit first"} at ${params.bestOpportunity.expectedApy.toFixed(2)}% APY`
        : "none"
    }`,
    `Assets: ${JSON.stringify(
      params.items.map((item) => ({
        symbol: item.symbol,
        chain: item.chainLabel,
        status: item.status,
        label: item.label,
        confidence: item.confidence,
        balance: item.balance,
        depositedBalance: item.depositedBalance,
        valueUsd: item.valueUsd,
        expectedApy: item.expectedApy,
        protocolName: item.protocolName,
        summary: item.summary,
        factors: item.factors,
        risks: item.risks,
        nextAction: item.nextAction,
      })),
    )}`,
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(2500),
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as {
      output_text?: string;
      output?: Array<{
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };

    const text =
      typeof json.output_text === "string" && json.output_text.trim().length > 0
        ? json.output_text.trim()
        : json.output
            ?.flatMap((item) => item.content ?? [])
            .map((part) => (typeof part.text === "string" ? part.text : ""))
            .join("\n")
            .trim();

    if (!text) return null;

    const parsed = JSON.parse(text) as Partial<CopilotNarrative>;
    if (
      typeof parsed.headline !== "string" ||
      typeof parsed.summary !== "string" ||
      typeof parsed.nextAction !== "string"
    ) {
      return null;
    }

    return {
      headline: parsed.headline,
      summary: parsed.summary,
      drivers: Array.isArray(parsed.drivers)
        ? parsed.drivers
            .filter((item): item is string => typeof item === "string")
            .slice(0, 4)
        : [],
      cautions: Array.isArray(parsed.cautions)
        ? parsed.cautions
            .filter((item): item is string => typeof item === "string")
            .slice(0, 3)
        : [],
      nextAction: parsed.nextAction,
    };
  } catch {
    return null;
  }
}

function fallbackNarrative(params: {
  mode: "portfolio" | "asset";
  policy: CopilotPolicyPreset;
  items: CopilotAnalysisItem[];
  bestOpportunity: CopilotAnalysisItem | null;
}): CopilotNarrative {
  if (params.items.length === 0) {
    return {
      headline: "No assets to analyze",
      summary:
        "Connect a wallet with supported assets before requesting portfolio guidance.",
      drivers: [],
      cautions: [
        "No wallet assets were available in the current dashboard state.",
      ],
      nextAction: "Connect a funded wallet or switch to a supported chain.",
    };
  }

  if (!params.bestOpportunity) {
    return {
      headline:
        params.mode === "portfolio" ? "No approved move yet" : "Hold for now",
      summary:
        params.mode === "portfolio"
          ? "Kabon did not find a stronger approved route across the detected wallet assets. Unsupported assets should remain tracked until vault and adapter support is available."
          : "Kabon does not see a stronger approved move for this asset right now.",
      drivers: params.items.flatMap((item) => item.factors).slice(0, 4),
      cautions: params.items.flatMap((item) => item.risks).slice(0, 3),
      nextAction:
        "Keep the position idle and re-run analysis when market or vault support changes.",
    };
  }

  return {
    headline:
      params.bestOpportunity.depositedBalance > 0
        ? `${params.bestOpportunity.symbol} has the strongest route`
        : `${params.bestOpportunity.symbol} is deposit-ready`,
    summary:
      params.bestOpportunity.depositedBalance > 0
        ? `${params.bestOpportunity.protocolName ?? "The leading route"} is the strongest ${POLICY_CONFIG[params.policy].label.toLowerCase()} policy option at about ${params.bestOpportunity.expectedApy.toFixed(2)}% APY. Execution stays limited to configured vaults and whitelisted adapters.`
        : `Deposit ${params.bestOpportunity.symbol} into the Kabon vault before allocation. The current ${POLICY_CONFIG[params.policy].label.toLowerCase()} policy route is ${params.bestOpportunity.protocolName ?? "available after deposit"} at about ${params.bestOpportunity.expectedApy.toFixed(2)}% APY.`,
    drivers: params.bestOpportunity.factors.slice(0, 4),
    cautions: params.bestOpportunity.risks.slice(0, 3),
    nextAction: params.bestOpportunity.nextAction,
  };
}

function buildAgentSteps(params: {
  policy: CopilotPolicyPreset;
  bestOpportunity: CopilotAnalysisItem | null;
}) {
  const best = params.bestOpportunity;
  const hasRoute = Boolean(best?.protocolName);
  const hasVaultPosition = (best?.depositedBalance ?? 0) > 0;

  return [
    {
      title: "Read wallet and vault state",
      description:
        "Balances, vault deposits, chain support, liquidity, and pricing are loaded from the dashboard.",
      status: "complete",
    },
    {
      title: `Apply ${POLICY_CONFIG[params.policy].label} policy`,
      description:
        params.policy === "conservative"
          ? "Prioritize supported assets with immediate liquidity and lower route risk."
          : params.policy === "yield"
            ? "Prioritize the highest approved APY while keeping execution contract-bounded."
            : "Balance APY, liquidity, route readiness, and vault support.",
      status: "complete",
    },
    {
      title: "Check approved route",
      description: hasRoute
        ? `${best?.symbol ?? "Asset"} has a configured route candidate through ${best?.protocolName}.`
        : "No approved strategy adapter is ready for the selected asset set.",
      status: hasRoute ? "ready" : "blocked",
    },
    {
      title: hasVaultPosition
        ? "Route through adapter"
        : "Deposit before routing",
      description: hasVaultPosition
        ? "Use the protocol route view to deploy vault liquidity through the whitelisted adapter."
        : "Deposit into the Kabon vault first, then review the whitelisted allocation route.",
      status: best ? "ready" : "blocked",
    },
  ] satisfies CopilotAgentStep[];
}

export async function POST(request: Request) {
  try {
    const body = copilotAnalysisRequestSchema.parse(await request.json());
    const scopedAssets =
      body.mode === "asset"
        ? body.assets.filter((asset) => asset.id === body.focusAssetId)
        : body.assets;

    const items = await Promise.all(
      scopedAssets.map((asset) => analyzeAsset(asset, body.policy)),
    );
    const bestOpportunity =
      items
        .filter((item) => item.status === "actionable")
        .sort((left, right) => {
          if (right.expectedApy !== left.expectedApy) {
            return right.expectedApy - left.expectedApy;
          }
          return (right.valueUsd ?? 0) - (left.valueUsd ?? 0);
        })[0] ?? null;

    const generatedAt = new Date().toISOString();
    const aiNarrative = await generateNarrative({
      mode: body.mode,
      policy: body.policy,
      items,
      bestOpportunity,
    });
    const narrative =
      aiNarrative ??
      fallbackNarrative({
        mode: body.mode,
        policy: body.policy,
        items,
        bestOpportunity,
      });

    const subject =
      body.mode === "asset"
        ? (items[0]?.symbol ?? "Asset")
        : `${items.length} wallet asset${items.length === 1 ? "" : "s"}`;

    return NextResponse.json({
      mode: body.mode,
      policy: body.policy,
      title:
        body.mode === "asset" ? `${subject} analysis` : "Portfolio analysis",
      subtitle:
        body.mode === "asset"
          ? "Scoped to the selected wallet position."
          : `Scoped to ${subject} currently detected across supported chains.`,
      narrative: narrative.summary,
      headline: narrative.headline,
      drivers: narrative.drivers,
      cautions: narrative.cautions,
      nextAction: narrative.nextAction,
      agentSteps: buildAgentSteps({
        policy: body.policy,
        bestOpportunity,
      }),
      bestOpportunity,
      items,
      generatedAt,
      source: aiNarrative ? "openai" : "fallback",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to analyze assets",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}
