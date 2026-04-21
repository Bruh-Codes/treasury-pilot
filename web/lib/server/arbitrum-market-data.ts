import "server-only";

import type {
	AssetMarketSummary,
	LiquidityPreset,
	Opportunity,
	ProtocolRegistryEntry,
	Recommendation,
	RiskPreset,
	StrategyLiquidity,
	StrategyRisk,
	StrategySnapshot,
} from "@/lib/yieldpilot-types";
import { LIQUIDITY_PRESETS, RISK_PRESETS } from "@/lib/yieldpilot-data";

type DefiLlamaProtocol = {
	name?: string;
	slug?: string;
	category?: string;
	chains?: string[];
	tvl?: number;
	logo?: string;
	url?: string;
};

type DefiLlamaPool = {
	pool?: string;
	chain?: string;
	project?: string;
	symbol?: string;
	apy?: number | null;
	apyBase?: number | null;
	apyReward?: number | null;
	tvlUsd?: number | null;
	stablecoin?: boolean | null;
	poolMeta?: string | null;
	exposure?: string | null;
	ilRisk?: string | null;
};

const ARBITRUM_CHAIN_NAME = "Arbitrum";
const EXECUTABLE_PROJECT_ALLOWLIST = new Set([
	"aave-v3",
	"aave",
	"morpho-blue",
	"morpho",
	"silo-v2",
	"silo",
	"fluid",
	"dolomite",
	"pendle",
	"compound-v3",
	"compound",
	"beefy",
	"curve-dex",
	"camelot-v3",
	"uniswap-v3",
]);

const ASSET_NAME_MAP: Record<string, string> = {
	USDC: "USD Coin",
	USDT: "Tether USD",
	DAI: "Dai",
	ETH: "Ether",
	WETH: "Wrapped Ether",
	WBTC: "Wrapped BTC",
	ARB: "Arbitrum",
	GMX: "GMX",
	FRAX: "Frax",
	USDE: "USDe",
};

const ICON_MAP: Record<string, string> = {
	USDC: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdc.png",
	USDT: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png",
	DAI: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/dai.png",
	ETH: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png",
	WETH: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png",
	WBTC: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/wbtc.png",
	ARB: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/arb.png",
	GMX: "https://assets.coingecko.com/coins/images/18323/large/arbit.png",
	FRAX: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/frax.png",
	USDE: "https://assets.coingecko.com/coins/images/33613/large/usde.png",
};

function stableFetch(input: string) {
	return fetch(input, {
		next: { revalidate: 60 * 15 },
		headers: {
			accept: "application/json",
			"user-agent": "YieldPilot/0.1",
		},
	});
}

async function fetchProtocols(): Promise<DefiLlamaProtocol[]> {
	const response = await stableFetch("https://api.llama.fi/protocols");
	if (!response.ok) {
		throw new Error(`Failed to fetch protocols: ${response.status}`);
	}

	const data = (await response.json()) as DefiLlamaProtocol[];
	return Array.isArray(data) ? data : [];
}

async function fetchPools(): Promise<DefiLlamaPool[]> {
	const urls = ["https://yields.llama.fi/pools", "https://api.llama.fi/pools"];

	for (const url of urls) {
		try {
			const response = await stableFetch(url);
			if (!response.ok) {
				continue;
			}

			const data = (await response.json()) as
				| { data?: DefiLlamaPool[] }
				| DefiLlamaPool[];

			if (Array.isArray(data)) {
				return data;
			}

			if (Array.isArray(data.data)) {
				return data.data;
			}
		} catch {
			continue;
		}
	}

	throw new Error("Failed to fetch yield pools");
}

function normalizeProjectSlug(project: string) {
	return project
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function normalizeAssetSymbol(symbol: string) {
	return (
		symbol
			.split(/[\s/:-]+/)
			.map((part) => part.trim().toUpperCase())
			.find((part) => /^[A-Z0-9.]{2,10}$/.test(part) && !part.includes("LP")) ??
		symbol.toUpperCase()
	);
}

function getLiquidityLabel(pool: DefiLlamaPool): StrategyLiquidity {
	const meta =
		`${pool.poolMeta ?? ""} ${pool.exposure ?? ""} ${pool.ilRisk ?? ""}`.toLowerCase();
	if (
		meta.includes("7 day") ||
		meta.includes("7-day") ||
		meta.includes("cooldown")
	) {
		return "7 days";
	}
	if (
		meta.includes("3 day") ||
		meta.includes("3-day") ||
		meta.includes("2 day")
	) {
		return "1-3 days";
	}
	if (pool.stablecoin) {
		return "Instant";
	}
	if (meta.includes("lend") || meta.includes("borrow")) {
		return "Instant";
	}
	return "Flexible";
}

function getLiquidityScore(label: StrategyLiquidity) {
	switch (label) {
		case "Instant":
			return 5;
		case "1-3 days":
			return 4;
		case "7 days":
			return 2;
		default:
			return 3;
	}
}

function inferRisk(
	category: string,
	pool: DefiLlamaPool,
): { risk: StrategyRisk; riskScore: number } {
	const normalizedCategory = category.toLowerCase();
	const meta =
		`${pool.poolMeta ?? ""} ${pool.exposure ?? ""} ${pool.ilRisk ?? ""}`.toLowerCase();

	if (
		normalizedCategory.includes("lend") ||
		normalizedCategory.includes("cdp")
	) {
		return { risk: "Low", riskScore: 2 };
	}
	if (pool.stablecoin && !meta.includes("lp") && !meta.includes("il")) {
		return { risk: "Low", riskScore: 2 };
	}
	if (
		normalizedCategory.includes("yield") ||
		normalizedCategory.includes("aggregator")
	) {
		return { risk: "Medium", riskScore: 3 };
	}
	if (
		normalizedCategory.includes("dex") ||
		normalizedCategory.includes("farm")
	) {
		return { risk: "Medium-High", riskScore: 4 };
	}
	if (
		normalizedCategory.includes("options") ||
		normalizedCategory.includes("perp") ||
		normalizedCategory.includes("derivative")
	) {
		return { risk: "High", riskScore: 5 };
	}

	return { risk: "Medium", riskScore: 3 };
}

function buildDescription(
	pool: DefiLlamaPool,
	category: string,
	liquidity: StrategyLiquidity,
) {
	const bits = [
		`${pool.project} on Arbitrum`,
		pool.symbol ? `for ${normalizeAssetSymbol(pool.symbol)}` : undefined,
		category ? `in ${category}` : undefined,
		`with ${liquidity.toLowerCase()} withdrawals`,
	].filter(Boolean);

	return `${bits.join(" ")}.`.replace(/\s+/g, " ");
}

async function getMarketInputs() {
	const [protocols, pools] = await Promise.all([
		fetchProtocols(),
		fetchPools(),
	]);

	const protocolMap = new Map<string, DefiLlamaProtocol>();

	for (const protocol of protocols) {
		if (!protocol.name) continue;
		const chains = protocol.chains ?? [];
		if (!chains.some((chain) => chain.toLowerCase().includes("arbitrum"))) {
			continue;
		}

		protocolMap.set(normalizeProjectSlug(protocol.name), protocol);
		if (protocol.slug) {
			protocolMap.set(normalizeProjectSlug(protocol.slug), protocol);
		}
	}

	return { protocolMap, pools };
}

export async function getArbitrumOpportunities(
	assetSymbol?: string,
): Promise<Opportunity[]> {
	const { protocolMap, pools } = await getMarketInputs();
	const normalizedAsset = assetSymbol
		? normalizeAssetSymbol(assetSymbol)
		: undefined;

	return pools
		.filter((pool) => pool.chain === ARBITRUM_CHAIN_NAME)
		.filter(
			(pool) =>
				typeof pool.project === "string" && typeof pool.symbol === "string",
		)
		.map((pool) => {
			const protocolKey = normalizeProjectSlug(pool.project!);
			const protocol = protocolMap.get(protocolKey);
			const asset = normalizeAssetSymbol(pool.symbol!);
			const liquidityLabel = getLiquidityLabel(pool);
			const category = protocol?.category ?? "Yield";
			const { risk, riskScore } = inferRisk(category, pool);
			const protocolSlug = protocol?.slug ?? protocolKey;

			return {
				id: pool.pool ?? `${protocolSlug}-${asset}`,
				protocolId: protocolSlug,
				protocolName: protocol?.name ?? pool.project!,
				protocolSlug,
				category,
				assetSymbol: asset,
				assetDisplayName: ASSET_NAME_MAP[asset] ?? asset,
				apy: Number(pool.apy ?? 0),
				apyBase: pool.apyBase ?? null,
				apyReward: pool.apyReward ?? null,
				tvlUsd: Number(pool.tvlUsd ?? 0),
				stablecoin: Boolean(pool.stablecoin),
				chain: ARBITRUM_CHAIN_NAME,
				pool: pool.pool ?? protocolSlug,
				poolMeta: pool.poolMeta ?? null,
				liquidityLabel,
				liquidityScore: getLiquidityScore(liquidityLabel),
				risk,
				riskScore,
				url: protocol?.url,
				logo: protocol?.logo ?? ICON_MAP[asset],
				adapterAvailable: EXECUTABLE_PROJECT_ALLOWLIST.has(protocolSlug),
				canDeposit: Number(pool.tvlUsd ?? 0) > 0,
				canWithdraw: liquidityLabel !== "Flexible" || Boolean(pool.stablecoin),
				description: buildDescription(pool, category, liquidityLabel),
			} satisfies Opportunity;
		})
		.filter((opportunity) => opportunity.assetSymbol.length > 0)
		.filter(
			(opportunity) =>
				!normalizedAsset || opportunity.assetSymbol === normalizedAsset,
		)
		.sort((a, b) => b.tvlUsd - a.tvlUsd || b.apy - a.apy)
		.slice(0, 250);
}

export async function getArbitrumProtocolRegistry(
	assetSymbol?: string,
): Promise<ProtocolRegistryEntry[]> {
	const opportunities = await getArbitrumOpportunities(assetSymbol);
	const grouped = new Map<string, Opportunity[]>();

	for (const opportunity of opportunities) {
		const list = grouped.get(opportunity.protocolId) ?? [];
		list.push(opportunity);
		grouped.set(opportunity.protocolId, list);
	}

	return Array.from(grouped.entries())
		.map(([protocolId, items]) => {
			const first = items[0]!;
			const tvl = items.reduce((sum, item) => sum + item.tvlUsd, 0);
			const averageApy =
				items.reduce((sum, item) => sum + item.apy, 0) /
				Math.max(items.length, 1);
			const maxApy = Math.max(...items.map((item) => item.apy));

			return {
				id: protocolId,
				name: first.protocolName,
				slug: first.protocolSlug,
				category: first.category,
				url: first.url,
				logo: first.logo,
				tvl,
				opportunityCount: items.length,
				supportedAssets: Array.from(
					new Set(items.map((item) => item.assetSymbol)),
				).sort(),
				averageApy,
				maxApy,
				liquidityLabel: items.some((item) => item.liquidityLabel === "Instant")
					? "Instant"
					: items.some((item) => item.liquidityLabel === "1-3 days")
						? "1-3 days"
						: items.some((item) => item.liquidityLabel === "7 days")
							? "7 days"
							: "Flexible",
				risk: items.reduce((current, item) =>
					item.riskScore > current.riskScore ? item : current,
				).risk,
				riskScore: Math.round(
					items.reduce((sum, item) => sum + item.riskScore, 0) / items.length,
				),
				adapterAvailable: items.some((item) => item.adapterAvailable),
			} satisfies ProtocolRegistryEntry;
		})
		.sort((a, b) => b.tvl - a.tvl || b.averageApy - a.averageApy);
}

export async function getArbitrumAssetSummaries(): Promise<
	AssetMarketSummary[]
> {
	const opportunities = await getArbitrumOpportunities();
	const grouped = new Map<string, Opportunity[]>();

	for (const opportunity of opportunities) {
		const list = grouped.get(opportunity.assetSymbol) ?? [];
		list.push(opportunity);
		grouped.set(opportunity.assetSymbol, list);
	}

	return Array.from(grouped.entries())
		.map(([symbol, items]) => {
			const totalTvlUsd = items.reduce((sum, item) => sum + item.tvlUsd, 0);
			const topApy = Math.max(...items.map((item) => item.apy));
			const averageApy =
				items.reduce((sum, item) => sum + item.apy, 0) / items.length;

			return {
				symbol,
				name: ASSET_NAME_MAP[symbol] ?? symbol,
				iconUrl: items[0]?.logo ?? ICON_MAP[symbol],
				protocolCount: new Set(items.map((item) => item.protocolId)).size,
				topApy,
				averageApy,
				totalTvlUsd,
				availableLiquidityUsd: totalTvlUsd,
				supported: items.some((item) => item.adapterAvailable),
			} satisfies AssetMarketSummary;
		})
		.sort((a, b) => b.totalTvlUsd - a.totalTvlUsd)
		.slice(0, 12);
}

function buildIdleStrategy(assetSymbol: string): StrategySnapshot {
	return {
		id: "idle",
		name: "Idle Reserve",
		protocol: "Vault Cash",
		asset: assetSymbol,
		apy: 0,
		liquidity: "Instant",
		risk: "Low",
		riskScore: 1,
		description: `Unallocated ${assetSymbol} held in the vault for immediate withdrawals.`,
		adapterAvailable: true,
	};
}

function applyLiquidityFilter(
	opportunity: Opportunity,
	liquidity: LiquidityPreset,
) {
	if (liquidity === "instant") {
		return opportunity.liquidityLabel === "Instant";
	}

	if (liquidity === "weekly") {
		return opportunity.liquidityLabel !== "Flexible";
	}

	return true;
}

function scoreOpportunity(opportunity: Opportunity, risk: RiskPreset) {
	const safetyBias =
		risk === "conservative" ? 1.6 : risk === "balanced" ? 1.2 : 0.8;
	const yieldBias = risk === "yield" ? 1.4 : risk === "balanced" ? 1.0 : 0.7;

	return (
		opportunity.apy * yieldBias +
		opportunity.liquidityScore * 0.9 -
		opportunity.riskScore * safetyBias +
		Math.log10(Math.max(opportunity.tvlUsd, 1))
	);
}

export async function buildRecommendation(input: {
	assetSymbol: string;
	amount: number;
	risk: RiskPreset;
	liquidity: LiquidityPreset;
	allowedProtocols?: string[];
}): Promise<Recommendation> {
	const normalizedAsset = normalizeAssetSymbol(input.assetSymbol);
	const opportunities = (await getArbitrumOpportunities(normalizedAsset))
		.filter((opportunity) => opportunity.adapterAvailable)
		.filter((opportunity) => applyLiquidityFilter(opportunity, input.liquidity))
		.filter((opportunity) =>
			input.allowedProtocols?.length
				? input.allowedProtocols.includes(opportunity.protocolSlug)
				: true,
		);

	const preset = RISK_PRESETS[input.risk];
	const idle = buildIdleStrategy(normalizedAsset);

	if (opportunities.length === 0) {
		return {
			allocations: [{ strategyId: idle.id, percent: 1, strategy: idle }],
			expectedApy: 0,
			riskScore: 1,
			rationale: `No eligible live Arbitrum opportunities matched the ${LIQUIDITY_PRESETS[input.liquidity].label.toLowerCase()} liquidity policy for ${normalizedAsset}, so the recommendation keeps capital idle in the vault.`,
			warnings: [
				"No live opportunities matched the current asset and liquidity filter.",
			],
			protocolUniverseCount: 0,
			generatedAt: new Date().toISOString(),
		};
	}

	const ranked = opportunities
		.slice()
		.sort(
			(a, b) =>
				scoreOpportunity(b, input.risk) - scoreOpportunity(a, input.risk),
		)
		.slice(0, input.risk === "conservative" ? 2 : 3);

	const deployShare = 1 - preset.idle;
	const rawWeights = ranked.map((opportunity) =>
		Math.max(scoreOpportunity(opportunity, input.risk), 0.25),
	);
	const totalWeight = rawWeights.reduce((sum, value) => sum + value, 0);

	const allocations = [
		{ strategyId: idle.id, percent: preset.idle, strategy: idle },
		...ranked.map((opportunity, index) => {
			const weight = rawWeights[index]! / totalWeight;
			const percent = Math.min(deployShare * weight, preset.perStrategyMax);

			const strategy: StrategySnapshot = {
				id: opportunity.id,
				name: opportunity.protocolName,
				protocol: `${opportunity.protocolName} · ${opportunity.assetSymbol}`,
				asset: opportunity.assetSymbol,
				apy: opportunity.apy,
				liquidity: opportunity.liquidityLabel,
				risk: opportunity.risk,
				riskScore: opportunity.riskScore,
				description: opportunity.description,
				logoUrl: opportunity.logo,
				projectUrl: opportunity.url,
				adapterAvailable: opportunity.adapterAvailable,
			};

			return {
				strategyId: strategy.id,
				percent,
				strategy,
			};
		}),
	];

	const totalPercent = allocations.reduce(
		(sum, allocation) => sum + allocation.percent,
		0,
	);
	allocations[0]!.percent += 1 - totalPercent;

	const expectedApy = allocations.reduce(
		(sum, allocation) => sum + allocation.percent * allocation.strategy.apy,
		0,
	);
	const riskScore = allocations.reduce(
		(sum, allocation) =>
			sum + allocation.percent * allocation.strategy.riskScore,
		0,
	);

	const warnings: string[] = [];
	if (
		allocations.some(
			(allocation) => allocation.strategy.liquidity !== "Instant",
		)
	) {
		warnings.push(
			"One or more positions may require a short unwind window before full withdrawal.",
		);
	}

	return {
		allocations,
		expectedApy,
		riskScore,
		rationale: `For a ${preset.label.toLowerCase()} policy and ${LIQUIDITY_PRESETS[input.liquidity].label.toLowerCase()} withdrawals, ${(preset.idle * 100).toFixed(0)}% stays idle in the vault while the remainder is distributed across ${ranked.map((item) => item.protocolName).join(", ")} using live Arbitrum yield and liquidity data.`,
		warnings,
		protocolUniverseCount: opportunities.length,
		generatedAt: new Date().toISOString(),
	};
}
