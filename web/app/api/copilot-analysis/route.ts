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
	assets: z.array(copilotAssetSchema),
	focusAssetId: z.string().optional(),
});

type CopilotAssetInput = z.infer<typeof copilotAssetSchema>;

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
	expectedApy: number;
	protocolName: string | null;
	rationale: string;
	warnings: string[];
};

function selectPrimaryAllocation(recommendation: Recommendation) {
	return (
		recommendation.allocations
			.filter((allocation) => allocation.strategy.apy > 0 && allocation.percent > 0)
			.sort((left, right) => right.percent - left.percent)[0] ?? null
	);
}

async function analyzeAsset(
	asset: CopilotAssetInput,
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
			label: "Route pending",
			summary: needsVaultMessage,
			expectedApy: 0,
			protocolName: null,
			rationale: needsVaultMessage,
			warnings: [needsVaultMessage],
		};
	}

	try {
		const recommendation = await buildRecommendation({
			assetSymbol: asset.symbol,
			amount: Math.max(asset.valueUsd ?? asset.balance, 1),
			risk: "balanced",
			liquidity: "instant",
		});
		const primary = selectPrimaryAllocation(recommendation);
		const expectedApy = Number(recommendation.expectedApy ?? 0);
		const requiresDeposit = asset.balance > 0 && asset.depositedBalance <= 0;

		if (requiresDeposit) {
			return {
				assetId: asset.id,
				name: asset.name,
				symbol: asset.symbol,
				chainLabel: asset.chainLabel,
				balance: asset.balance,
				valueUsd: asset.valueUsd,
				unitPriceUsd: asset.unitPriceUsd,
				status: "actionable",
				label:
					expectedApy > 0
						? `Deposit for ${expectedApy.toFixed(2)}%`
						: "Deposit first",
				summary:
					expectedApy > 0
						? "Deposit into the Kabon vault first to unlock the current best route."
						: "Deposit into the Kabon vault first so Kabon can monitor and route this position.",
				expectedApy,
				protocolName: primary?.strategy.name ?? null,
				rationale: recommendation.rationale,
				warnings: recommendation.warnings,
			};
		}

		if (!primary || expectedApy <= 0) {
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
				expectedApy,
				protocolName: null,
				rationale: recommendation.rationale,
				warnings: recommendation.warnings,
			};
		}

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
			label: `${expectedApy.toFixed(2)}% APY`,
			summary: `${primary.strategy.name} is the strongest supported route right now.`,
			expectedApy,
			protocolName: primary.strategy.name,
			rationale: recommendation.rationale,
			warnings: recommendation.warnings,
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
			expectedApy: 0,
			protocolName: null,
			rationale: detail,
			warnings: [detail],
		};
	}
}

async function generateNarrative(params: {
	mode: "portfolio" | "asset";
	items: CopilotAnalysisItem[];
	bestOpportunity: CopilotAnalysisItem | null;
}) {
	const apiKey = process.env.OPENAI_KEY ?? process.env.OPENAI_API_KEY;
	if (!apiKey) {
		return null;
	}

	const prompt = [
		"You are Kabon Copilot.",
		"Write one short dashboard-ready sentence under 22 words.",
		"Do not use bullets or markdown.",
		"Focus only on the best next move and support status.",
		"",
		`Mode: ${params.mode}`,
		`Best opportunity: ${
			params.bestOpportunity
				? `${params.bestOpportunity.symbol} via ${params.bestOpportunity.protocolName ?? "hold"} at ${params.bestOpportunity.expectedApy.toFixed(2)}% APY`
				: "none"
		}`,
		`Assets: ${JSON.stringify(
			params.items.map((item) => ({
				symbol: item.symbol,
				chain: item.chainLabel,
				status: item.status,
				balance: item.balance,
				valueUsd: item.valueUsd,
				expectedApy: item.expectedApy,
				protocolName: item.protocolName,
				summary: item.summary,
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

		if (typeof json.output_text === "string" && json.output_text.trim().length > 0) {
			return json.output_text.trim();
		}

		const text = json.output
			?.flatMap((item) => item.content ?? [])
			.map((part) => (typeof part.text === "string" ? part.text : ""))
			.join("\n")
			.trim();

		return text && text.length > 0 ? text : null;
	} catch {
		return null;
	}
}

function fallbackNarrative(params: {
	mode: "portfolio" | "asset";
	items: CopilotAnalysisItem[];
	bestOpportunity: CopilotAnalysisItem | null;
}) {
	if (params.items.length === 0) {
		return "No wallet assets are available to analyze yet.";
	}

	if (!params.bestOpportunity) {
		return params.mode === "portfolio"
			? "No stronger supported move is available right now."
			: "Holding is the best move right now.";
	}

	return params.mode === "portfolio"
		? `${params.bestOpportunity.symbol} is the strongest supported move right now at about ${params.bestOpportunity.expectedApy.toFixed(2)}% APY.`
		: `${params.bestOpportunity.symbol} is best positioned for ${params.bestOpportunity.protocolName ?? "the leading route"} at about ${params.bestOpportunity.expectedApy.toFixed(2)}% APY.`;
}

export async function POST(request: Request) {
	try {
		const body = copilotAnalysisRequestSchema.parse(await request.json());
		const scopedAssets =
			body.mode === "asset"
				? body.assets.filter((asset) => asset.id === body.focusAssetId)
				: body.assets;

		const items = await Promise.all(scopedAssets.map((asset) => analyzeAsset(asset)));
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
			items,
			bestOpportunity,
		});
		const narrative =
			aiNarrative ??
			fallbackNarrative({
				mode: body.mode,
				items,
				bestOpportunity,
			});

		const subject =
			body.mode === "asset"
				? items[0]?.symbol ?? "Asset"
				: `${items.length} wallet asset${items.length === 1 ? "" : "s"}`;

		return NextResponse.json({
			mode: body.mode,
			title:
				body.mode === "asset" ? `${subject} analysis` : "Portfolio analysis",
			subtitle:
				body.mode === "asset"
					? "Scoped to the selected wallet position."
					: `Scoped to ${subject} currently detected across supported chains.`,
			narrative,
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
