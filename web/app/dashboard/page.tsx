"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppKitAccount } from "@reown/appkit/react";
import { useChainId, usePublicClient, useWalletClient } from "wagmi";
import { erc20Abi, parseUnits, type Address } from "viem";
import { CircleArrowDown, Info, QrCode, Sparkles, X } from "lucide-react";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	FinancialMarketsTable,
	type FinancialAssetRow,
} from "@/components/ui/financial-markets-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { getChainById, getChainOptions } from "@/lib/chain-utils";
import { yieldPilotVaultAbi } from "@/lib/vault-abi";
import {
	getSupportedVaultAsset,
	getSupportedVaultAssets,
} from "@/lib/vault-registry";
import {
	useAssetRegistry,
	useAssetSummaries,
	useCopilotAnalysisMutation,
	useGreeting,
	useMultichainBalances,
	useMultichainVaultPositions,
	useTokenHistory,
	useTokenPrices,
	useYieldpilotQueryClient,
	type CopilotAnalysisResponse,
} from "@/lib/use-yieldpilot-market-data";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { DepositDialog } from "@/components/dashboard/deposit-dialog";
import { ReceiveDialog } from "@/components/dashboard/receive-dialog";
import SearchPill from "@/components/dashboard/search-pill";
import DashboardPageSkeleton from "@/components/dashboard/dashboard-skeleton";
import { getKnownAssetIcon } from "@/lib/asset-icon-map";

type AssetItem = {
	id: string;
	name: string;
	symbol: string;
	chainId: number;
	chainLabel: string;
	iconUrl?: string;
	walletBalance: number;
	depositedAmount?: number;
	deposited: string;
	apy: string;
	marketApy?: string;
	totalDeposits: string;
	availableLiquidity: string;
	supported: boolean;
	stable: boolean;
	iconClass: string;
	tokenAddress?: Address;
	tokenDecimals?: number;
	vaultAddress?: Address;
	vaultLabel?: string;
};

type CopilotScope = { mode: "portfolio" } | { mode: "asset"; assetId: string };

type CopilotSignal = NonNullable<FinancialAssetRow["copilot"]>;

type RangeKey = "1D" | "1W" | "1M" | "6M" | "1Y" | "All";

const RANGE_OPTIONS: RangeKey[] = ["1D", "1W", "1M", "6M", "1Y", "All"];

function readAddress(value: string | undefined): Address | undefined {
	if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
		return undefined;
	}

	return /^0x0{40}$/i.test(value) ? undefined : (value as Address);
}

const arbitrumSepoliaUsdcTokenAddress = readAddress(
	process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_USDC_TOKEN_ADDRESS,
);
const robinhoodUsdcTokenAddress = readAddress(
	process.env.NEXT_PUBLIC_ROBINHOOD_USDC_TOKEN_ADDRESS,
);

const TRACKED_TOKEN_CONFIG: Partial<
	Record<
		number,
		Partial<
			Record<string, { address: Address; decimals: number; stable: boolean }>
		>
	>
> = {
	42161: {
		USDC: {
			address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
			decimals: 6,
			stable: true,
		},
		USDT: {
			address: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
			decimals: 6,
			stable: true,
		},
		WETH: {
			address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
			decimals: 18,
			stable: false,
		},
		WBTC: {
			address: "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
			decimals: 8,
			stable: false,
		},
		LINK: {
			address: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
			decimals: 18,
			stable: false,
		},
		AAVE: {
			address: "0xba5ddd1f9d7f570dc94a51479a000e3bce967196",
			decimals: 18,
			stable: false,
		},
		ARB: {
			address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
			decimals: 18,
			stable: false,
		},
	},
	421614: arbitrumSepoliaUsdcTokenAddress
		? {
				USDC: {
					address: arbitrumSepoliaUsdcTokenAddress,
					decimals: 6,
					stable: true,
				},
			}
		: {},
	46630: robinhoodUsdcTokenAddress
		? {
				USDC: {
					address: robinhoodUsdcTokenAddress,
					decimals: 6,
					stable: true,
				},
			}
		: {},
};

// Dynamic function to generate Trust Wallet URLs using centralized chain utils
function getTrustWalletIconUrl(
	tokenAddress?: Address,
	symbol?: string,
	currentChainId?: number,
): string | undefined {
	if (!tokenAddress) {
		// Handle native ETH
		if (symbol === "ETH") {
			return "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png";
		}
		return undefined;
	}

	// Get chain info using centralized chain utils
	const chain = getChainById(currentChainId || 1);
	let blockchain = "ethereum"; // default

	// Only handle supported chains: Arbitrum One, Arbitrum Sepolia, Robinhood Chain Testnet
	if (chain?.name.toLowerCase().includes("arbitrum")) {
		blockchain = "arbitrum";
	} else if (chain?.name.toLowerCase().includes("robinhood")) {
		blockchain = "ethereum"; // Robinhood Chain uses Ethereum-compatible addresses
	}

	return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${blockchain}/assets/${tokenAddress}/logo.png`;
}

// Fallback icon classes for assets without specific styling
const ASSET_ICON_CLASSES: Record<string, string> = {
	USDC: "from-sky-400 to-blue-600",
	USDT: "from-emerald-400 to-teal-600",
	ETH: "from-slate-500 to-slate-700",
	WETH: "from-slate-500 to-slate-700",
	WBTC: "from-orange-400 to-amber-500",
	wstETH: "from-cyan-400 to-sky-600",
	weETH: "from-fuchsia-400 to-violet-600",
	USDe: "from-zinc-300 to-zinc-500",
	LINK: "from-blue-500 to-blue-700",
	AAVE: "from-violet-400 to-purple-600",
	RLUSD: "from-blue-400 to-indigo-600",
};

function compactAmount(value: number) {
	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 2,
		notation: value >= 1000 ? "compact" : "standard",
	}).format(value);
}

function formatWalletBalance(value: number) {
	if (!Number.isFinite(value) || value <= 0) {
		return "-";
	}

	if (value < 0.000001) {
		return "<0.000001";
	}

	return value.toLocaleString(undefined, {
		minimumFractionDigits: value >= 1 ? 0 : 2,
		maximumFractionDigits: value >= 1 ? 4 : 6,
	});
}

const WALLET_CHART_COLORS = [
	"#8b7eff",
	"#5ec6ff",
	"#f59e0b",
	"#d38cf5",
	"#22c55e",
	"#f43f5e",
	"#06b6d4",
	"#a3e635",
];

export default function DashboardPage() {
	const router = useRouter();
	const assetSummaries = useAssetSummaries();
	const assetRegistry = useAssetRegistry();
	const greetingQuery = useGreeting();
	const { address } = useAppKitAccount();
	const chainId = useChainId();
	const chainOptions = getChainOptions();
	const [search, setSearch] = useState("");
	const [noBalanceAsset, setNoBalanceAsset] = useState<AssetItem | null>(null);
	const [depositAsset, setDepositAsset] = useState<AssetItem | null>(null);
	const [depositAmount, setDepositAmount] = useState("0");
	const [isDepositing, setIsDepositing] = useState(false);
	const [depositOpen, setDepositOpen] = useState(false);
	const [receiveOpen, setReceiveOpen] = useState(false);
	const [chainsOpen, setChainsOpen] = useState(false);
	const [selectedRange, setSelectedRange] = useState<RangeKey>("1W");
	const [selectedChartAssetSymbol, setSelectedChartAssetSymbol] = useState<
		string | null
	>(null);
	const [copilotOpen, setCopilotOpen] = useState(false);
	const [copilotScope, setCopilotScope] = useState<CopilotScope | null>(null);
	const [copilotResult, setCopilotResult] =
		useState<CopilotAnalysisResponse | null>(null);
	const [copilotError, setCopilotError] = useState<string | null>(null);
	const [copilotLoading, setCopilotLoading] = useState(false);
	const [copilotSignals, setCopilotSignals] = useState<
		Record<string, CopilotSignal>
	>({});
	const copilotRequestRef = useRef(0);
	const copilotCacheRef = useRef<Map<string, CopilotAnalysisResponse>>(
		new Map(),
	);
	const queryClient = useYieldpilotQueryClient();
	const summaries = assetSummaries.data?.assets ?? [];
	const registryAssets = assetRegistry.data?.assets ?? [];
	const publicClient = usePublicClient();
	const { data: walletClient } = useWalletClient();
	const copilotAnalysis = useCopilotAnalysisMutation();
	const supportedVaultAssets = useMemo(
		() => getSupportedVaultAssets(chainId),
		[chainId],
	);
	const receiveVaultAsset = supportedVaultAssets[0];
	const trackedVaultPositions = useMemo(
		() =>
			chainOptions.flatMap((chain) =>
				getSupportedVaultAssets(chain.id).map((asset) => ({
					key: `${chain.id}:${asset.vaultAddress.toLowerCase()}`,
					chainId: chain.id,
					symbol: asset.symbol,
					vaultAddress: asset.vaultAddress,
					tokenDecimals: asset.tokenDecimals,
				})),
			),
		[chainOptions],
	);
	const trackedAssetCatalog = useMemo(() => {
		const next = new Map<
			string,
			{
				key: string;
				chainId: number;
				symbol: string;
				name: string;
				decimals: number;
				stable: boolean;
				isNative?: boolean;
				tokenAddress?: Address;
				iconUrl?: string;
			}
		>();

		for (const chain of chainOptions) {
			const nativeKey = `${chain.id}:native:ETH`;
			next.set(nativeKey, {
				key: nativeKey,
				chainId: chain.id,
				symbol: "ETH",
				name: "Ethereum",
				decimals: 18,
				stable: false,
				isNative: true,
				iconUrl: getTrustWalletIconUrl(undefined, "ETH", chain.id),
			});
		}

		for (const [trackedChainId, configBySymbol] of Object.entries(
			TRACKED_TOKEN_CONFIG,
		)) {
			const numericChainId = Number(trackedChainId);
			for (const [symbol, token] of Object.entries(configBySymbol ?? {})) {
				if (!token) continue;
				const key = `${numericChainId}:${token.address.toLowerCase()}`;
				const matchingSummary = summaries.find(
					(summary) => summary.symbol === symbol,
				);
				next.set(key, {
					key,
					chainId: numericChainId,
					symbol,
					name: matchingSummary?.name ?? symbol,
					decimals: token.decimals,
					stable: token.stable,
					tokenAddress: token.address,
					iconUrl:
						matchingSummary?.iconUrl ??
						getKnownAssetIcon(symbol) ??
						getTrustWalletIconUrl(token.address, symbol, numericChainId),
				});
			}
		}

		for (const asset of registryAssets) {
			const tokenAddress = readAddress(asset.address);
			if (!tokenAddress) continue;
			const key = `${asset.chainId}:${asset.address.toLowerCase()}`;
			next.set(key, {
				key,
				chainId: asset.chainId,
				symbol: asset.symbol,
				name: asset.name,
				decimals: asset.decimals,
				stable:
					asset.assetType === "stablecoin" ||
					asset.symbol === "USDC" ||
					asset.symbol === "USDT" ||
					asset.symbol === "RLUSD" ||
					asset.symbol === "USDE",
				tokenAddress,
				iconUrl:
					asset.iconUrl ??
					getKnownAssetIcon(asset.symbol) ??
					getTrustWalletIconUrl(tokenAddress, asset.symbol, asset.chainId),
			});
		}

		return Array.from(next.values());
	}, [chainOptions, registryAssets, summaries]);
	const multichainBalances = useMultichainBalances(
		address as Address | undefined,
		trackedAssetCatalog.map((asset) => ({
			key: asset.key,
			chainId: asset.chainId,
			symbol: asset.symbol,
			name: asset.name,
			decimals: asset.decimals,
			isNative: asset.isNative,
			tokenAddress: asset.tokenAddress,
		})),
	);
	const multichainVaultPositions = useMultichainVaultPositions(
		address as Address | undefined,
		trackedVaultPositions,
	);
	const isAssetSummariesLoading =
		assetSummaries.isPending && assetSummaries.data === undefined;
	const isRegistryLoading =
		Boolean(address) &&
		assetRegistry.isPending &&
		assetRegistry.data === undefined;
	const isMultichainBalancesLoading =
		Boolean(address) &&
		trackedAssetCatalog.length > 0 &&
		multichainBalances.isPending &&
		multichainBalances.data === undefined;
	const isVaultPositionsLoading =
		Boolean(address) &&
		trackedVaultPositions.length > 0 &&
		multichainVaultPositions.isPending &&
		multichainVaultPositions.data === undefined;
	const isPageLoading =
		isAssetSummariesLoading ||
		isRegistryLoading ||
		isMultichainBalancesLoading ||
		isVaultPositionsLoading ||
		greetingQuery.isPending ||
		(!address && (assetSummaries.isPending || assetRegistry.isPending));

	const assets = useMemo(() => {
		const summaryBySymbol = new Map(
			summaries.map((summary) => [summary.symbol, summary] as const),
		);

		return trackedAssetCatalog.map((asset) => {
			const currentSummary =
				asset.chainId === chainId
					? summaryBySymbol.get(asset.symbol)
					: undefined;
			const vaultConfig = getSupportedVaultAsset(asset.chainId, asset.symbol);
			const chainLabel =
				getChainById(asset.chainId)?.name ?? `Chain ${asset.chainId}`;
			const balance =
				multichainBalances.data?.balances?.[asset.key]?.balance ?? 0;
			const depositedAmount = vaultConfig
				? (multichainVaultPositions.data?.positions?.[
						`${asset.chainId}:${vaultConfig.vaultAddress.toLowerCase()}`
					]?.assets ?? 0)
				: 0;

			return {
				id: asset.key,
				name: asset.name,
				symbol: asset.symbol,
				chainId: asset.chainId,
				chainLabel,
				iconUrl: asset.iconUrl,
				walletBalance: balance,
				deposited:
					depositedAmount > 0
						? `${formatWalletBalance(depositedAmount)} ${asset.symbol}`
						: "-",
				apy: vaultConfig ? "-" : "Not supported",
				marketApy:
					currentSummary && currentSummary.protocolCount > 0
						? `${currentSummary.averageApy.toFixed(2)}% avg`
						: "-",
				totalDeposits:
					currentSummary && currentSummary.totalTvlUsd > 0
						? `${compactAmount(currentSummary.totalTvlUsd)} TVL`
						: "-",
				availableLiquidity:
					currentSummary && currentSummary.availableLiquidityUsd > 0
						? `${compactAmount(currentSummary.availableLiquidityUsd)} liquid`
						: "-",
				supported: Boolean(vaultConfig),
				stable: asset.stable,
				iconClass:
					ASSET_ICON_CLASSES[asset.symbol] ?? "from-neutral-500 to-neutral-700",
				tokenAddress: asset.tokenAddress,
				tokenDecimals: vaultConfig?.tokenDecimals ?? asset.decimals,
				vaultAddress: vaultConfig?.vaultAddress,
				vaultLabel: vaultConfig?.vaultLabel,
				depositedAmount,
			} satisfies AssetItem;
		});
	}, [
		chainId,
		multichainBalances.data?.balances,
		multichainVaultPositions.data?.positions,
		summaries,
		trackedAssetCatalog,
	]);

	const walletAssets = useMemo(
		() =>
			assets
				.filter((asset) => asset.walletBalance > 0)
				.sort((left, right) => {
					// First sort by whether there are deposits (assets with deposits first)
					const leftHasDeposits = (left.depositedAmount ?? 0) > 0;
					const rightHasDeposits = (right.depositedAmount ?? 0) > 0;

					if (leftHasDeposits && !rightHasDeposits) {
						return -1;
					}
					if (!leftHasDeposits && rightHasDeposits) {
						return 1;
					}

					// Then sort by wallet balance (descending)
					return right.walletBalance - left.walletBalance;
				}),
		[assets],
	);
	const supportedDepositAssets = useMemo(
		() => walletAssets.filter((asset) => asset.supported),
		[walletAssets],
	);
	const supportedWalletAssets = supportedDepositAssets.length;

	const trackedValueSymbols = useMemo(
		() =>
			Array.from(
				new Set([
					...walletAssets.map((asset) => asset.symbol),
					...trackedVaultPositions.map((position) => position.symbol),
				]),
			).sort(),
		[trackedVaultPositions, walletAssets],
	);
	const tokenPrices = useTokenPrices(trackedValueSymbols);
	const walletAssetsWithMarketData = useMemo(
		() =>
			walletAssets.map((asset) => {
				const unitPriceUsd = tokenPrices.data?.prices?.[asset.symbol] ?? null;
				return {
					...asset,
					unitPriceUsd,
					valueUsd:
						typeof unitPriceUsd === "number"
							? asset.walletBalance * unitPriceUsd
							: null,
				};
			}),
		[tokenPrices.data?.prices, walletAssets],
	);
	const filtered = useMemo(() => {
		const term = search.trim().toLowerCase();
		return walletAssetsWithMarketData.filter((asset) => {
			const matchesSearch =
				term.length === 0 ||
				asset.name.toLowerCase().includes(term) ||
				asset.symbol.toLowerCase().includes(term) ||
				asset.chainLabel.toLowerCase().includes(term);
			return matchesSearch;
		});
	}, [search, walletAssetsWithMarketData]);

	const rows: FinancialAssetRow[] = filtered.map((asset) => ({
		id: asset.id,
		name: asset.name,
		symbol: asset.symbol,
		chainLabel: asset.chainLabel,
		walletBalance:
			asset.walletBalance > 0
				? `${formatWalletBalance(asset.walletBalance)} ${asset.symbol}`
				: "-",
		deposited: asset.deposited,
		apy: asset.apy,
		totalDeposits: asset.totalDeposits,
		availableLiquidity: asset.availableLiquidity,
		supported: asset.supported,
		iconClass: asset.iconClass,
		iconUrl: asset.iconUrl,
		copilot: copilotSignals[asset.id],
	}));
	const tokenHistory = useTokenHistory(
		Array.from(new Set(walletAssets.map((asset) => asset.symbol))).sort(),
		selectedRange,
	);
	const walletChartAssets = useMemo(() => {
		const grouped = new Map<
			string,
			{
				symbol: string;
				label: string;
				balance: number;
				unitPrice: number | null;
				holdings: Array<{
					assetId: string;
					chainLabel: string;
					balance: number;
				}>;
			}
		>();

		for (const asset of walletAssets) {
			const existing = grouped.get(asset.symbol);
			if (existing) {
				existing.balance += asset.walletBalance;
				existing.holdings.push({
					assetId: asset.id,
					chainLabel: asset.chainLabel,
					balance: asset.walletBalance,
				});
				continue;
			}

			grouped.set(asset.symbol, {
				symbol: asset.symbol,
				label: asset.symbol,
				balance: asset.walletBalance,
				unitPrice: tokenPrices.data?.prices?.[asset.symbol] ?? null,
				holdings: [
					{
						assetId: asset.id,
						chainLabel: asset.chainLabel,
						balance: asset.walletBalance,
					},
				],
			});
		}

		return Array.from(grouped.values()).map((asset, index) => ({
			...asset,
			seriesKey: `series-${asset.symbol.toLowerCase()}-${index}`,
			color: WALLET_CHART_COLORS[index % WALLET_CHART_COLORS.length],
			valueUsd:
				typeof asset.unitPrice === "number"
					? asset.balance * asset.unitPrice
					: null,
		}));
	}, [tokenPrices.data?.prices, walletAssets]);
	const chartSeriesAssets = useMemo(
		() =>
			walletChartAssets.filter(
				(asset) =>
					(tokenHistory.data?.history?.[asset.symbol]?.length ?? 0) > 0,
			),
		[tokenHistory.data?.history, walletChartAssets],
	);
	const selectedChartAsset = useMemo(() => {
		if (chartSeriesAssets.length === 0) return null;
		return (
			chartSeriesAssets.find(
				(asset) => asset.symbol === selectedChartAssetSymbol,
			) ?? chartSeriesAssets[0]
		);
	}, [chartSeriesAssets, selectedChartAssetSymbol]);
	useEffect(() => {
		if (chartSeriesAssets.length === 0) {
			setSelectedChartAssetSymbol(null);
			return;
		}

		if (
			selectedChartAssetSymbol &&
			chartSeriesAssets.some(
				(asset) => asset.symbol === selectedChartAssetSymbol,
			)
		) {
			return;
		}

		setSelectedChartAssetSymbol(chartSeriesAssets[0].symbol);
	}, [chartSeriesAssets, selectedChartAssetSymbol]);
	const chartConfig = useMemo(
		() =>
			selectedChartAsset
				? ({
						[selectedChartAsset.seriesKey]: {
							label: selectedChartAsset.label,
							color: selectedChartAsset.color,
						},
					} satisfies ChartConfig)
				: ({} satisfies ChartConfig),
		[selectedChartAsset],
	);
	const chartData = useMemo(() => {
		if (!selectedChartAsset) {
			return [];
		}

		const rows = new Map<number, Record<string, number | string>>();
		const history = tokenHistory.data?.history ?? {};
		const labelFormatter = new Intl.DateTimeFormat("en-US", {
			month: selectedRange === "1D" ? undefined : "short",
			day:
				selectedRange === "1D" ||
				selectedRange === "1W" ||
				selectedRange === "1M"
					? "numeric"
					: undefined,
			hour: selectedRange === "1D" ? "2-digit" : undefined,
		});

		const series = history[selectedChartAsset.symbol] ?? [];
		for (const point of series) {
			const existing = rows.get(point.timestamp) ?? {
				timestamp: point.timestamp,
				label: labelFormatter.format(new Date(point.timestamp)),
			};
			existing[selectedChartAsset.seriesKey] =
				point.priceUsd * selectedChartAsset.balance;
			existing[`${selectedChartAsset.seriesKey}Balance`] =
				selectedChartAsset.balance;
			existing[`${selectedChartAsset.seriesKey}Price`] = point.priceUsd;
			existing[`${selectedChartAsset.seriesKey}Symbol`] =
				selectedChartAsset.symbol;
			existing[`${selectedChartAsset.seriesKey}Holdings`] = JSON.stringify(
				selectedChartAsset.holdings,
			);
			rows.set(point.timestamp, existing);
		}

		return Array.from(rows.values()).sort(
			(left, right) =>
				Number(left.timestamp ?? 0) - Number(right.timestamp ?? 0),
		);
	}, [selectedChartAsset, selectedRange, tokenHistory.data?.history]);
	const selectedChartAssetValueUsd = useMemo(
		() => selectedChartAsset?.valueUsd ?? 0,
		[selectedChartAsset],
	);
	const totalVaultValueUsd = useMemo(
		() =>
			trackedVaultPositions.reduce((sum, position) => {
				const vaultPosition =
					multichainVaultPositions.data?.positions?.[position.key];
				const unitPrice = tokenPrices.data?.prices?.[position.symbol] ?? null;
				if (!vaultPosition || typeof unitPrice !== "number") {
					return sum;
				}

				return sum + vaultPosition.assets * unitPrice;
			}, 0),
		[
			multichainVaultPositions.data?.positions,
			tokenPrices.data?.prices,
			trackedVaultPositions,
		],
	);
	const hasVaultValue = useMemo(
		() =>
			trackedVaultPositions.some((position) => {
				const vaultPosition =
					multichainVaultPositions.data?.positions?.[position.key];
				const unitPrice = tokenPrices.data?.prices?.[position.symbol] ?? null;
				return Boolean(
					vaultPosition &&
					vaultPosition.assets > 0 &&
					typeof unitPrice === "number",
				);
			}),
		[
			multichainVaultPositions.data?.positions,
			tokenPrices.data?.prices,
			trackedVaultPositions,
		],
	);
	const portfolioRangeDelta = useMemo(() => {
		if (!selectedChartAsset) return null;
		if (chartData.length < 2) return null;
		const start = Number(
			(chartData[0] as Record<string, number | string>)[
				selectedChartAsset.seriesKey
			] ?? 0,
		);
		const end = Number(
			(chartData[chartData.length - 1] as Record<string, number | string>)[
				selectedChartAsset.seriesKey
			] ?? 0,
		);
		if (start === 0) return null;
		return {
			amount: end - start,
			percent: ((end - start) / start) * 100,
		};
	}, [chartData, selectedChartAsset]);
	const hasWalletChartAssets = walletChartAssets.length > 0;
	const isChartLoading =
		hasWalletChartAssets &&
		(tokenPrices.isPending ||
			tokenHistory.isPending ||
			tokenHistory.isFetching ||
			(selectedChartAsset !== null && chartData.length === 0));
	const greeting = greetingQuery.data?.greeting ?? "Hello";
	const activeCopilotAsset = useMemo(
		() =>
			copilotScope?.mode === "asset"
				? (walletAssetsWithMarketData.find(
						(asset) => asset.id === copilotScope.assetId,
					) ?? null)
				: null,
		[copilotScope, walletAssetsWithMarketData],
	);

	const selectedDepositUsd = Number(depositAmount || 0) || 0;
	const selectedDepositApy =
		depositAsset?.marketApy && depositAsset.marketApy !== "-"
			? depositAsset.marketApy.replace(" avg", "")
			: "0.00%";

	function setSignalsForAssets(assetIds: string[], signal: CopilotSignal) {
		setCopilotSignals((current) => {
			const next = { ...current };
			for (const assetId of assetIds) {
				next[assetId] = signal;
			}
			return next;
		});
	}

	function buildCopilotCacheKey(
		scope: CopilotScope,
		scopedAssets: Array<
			AssetItem & { unitPriceUsd: number | null; valueUsd: number | null }
		>,
	) {
		return JSON.stringify({
			mode: scope.mode,
			focusAssetId: scope.mode === "asset" ? scope.assetId : null,
			assets: scopedAssets.map((asset) => ({
				id: asset.id,
				balance: Number(asset.walletBalance.toFixed(8)),
				depositedBalance: Number((asset.depositedAmount ?? 0).toFixed(8)),
				valueUsd:
					typeof asset.valueUsd === "number"
						? Number(asset.valueUsd.toFixed(2))
						: null,
				unitPriceUsd:
					typeof asset.unitPriceUsd === "number"
						? Number(asset.unitPriceUsd.toFixed(2))
						: null,
				supported: asset.supported,
				apy: asset.apy,
				totalDeposits: asset.totalDeposits,
				availableLiquidity: asset.availableLiquidity,
			})),
		});
	}

	async function openCopilot(scope: CopilotScope) {
		const scopedAssets =
			scope.mode === "asset"
				? walletAssetsWithMarketData.filter(
						(asset) => asset.id === scope.assetId,
					)
				: walletAssetsWithMarketData;

		if (scopedAssets.length === 0) {
			toast.error("No wallet assets are available to analyze yet");
			return;
		}

		setCopilotScope(scope);
		setCopilotOpen(true);
		setCopilotError(null);
		const cacheKey = buildCopilotCacheKey(scope, scopedAssets);
		const cached = copilotCacheRef.current.get(cacheKey);
		if (cached) {
			setCopilotResult(cached);
			setCopilotLoading(false);
			setCopilotSignals((current) => {
				const next = { ...current };
				for (const item of cached.items) {
					next[item.assetId] = {
						state: item.status,
						label: item.label,
					};
				}
				return next;
			});
			return;
		}

		setCopilotResult(null);
		setCopilotLoading(true);
		setSignalsForAssets(
			scopedAssets.map((asset) => asset.id),
			{
				state: "loading",
				label: "Analyzing...",
			},
		);

		const requestId = ++copilotRequestRef.current;

		try {
			const result = await copilotAnalysis.mutateAsync({
				mode: scope.mode,
				focusAssetId: scope.mode === "asset" ? scope.assetId : undefined,
				assets: scopedAssets.map((asset) => ({
					id: asset.id,
					name: asset.name,
					symbol: asset.symbol,
					chainId: asset.chainId,
					chainLabel: asset.chainLabel,
					balance: asset.walletBalance,
					depositedBalance: asset.depositedAmount ?? 0,
					valueUsd: asset.valueUsd,
					unitPriceUsd: asset.unitPriceUsd,
					supported: asset.supported,
					apy: asset.apy,
					totalDeposits: asset.totalDeposits,
					availableLiquidity: asset.availableLiquidity,
				})),
			});

			if (requestId !== copilotRequestRef.current) {
				return;
			}

			setCopilotResult(result);
			copilotCacheRef.current.set(cacheKey, result);
			setCopilotSignals((current) => {
				const next = { ...current };
				for (const item of result.items) {
					next[item.assetId] = {
						state: item.status,
						label: item.label,
					};
				}
				return next;
			});
		} catch (error) {
			if (requestId !== copilotRequestRef.current) {
				return;
			}

			const message =
				error instanceof Error ? error.message : "Asset analysis failed";
			setCopilotError(message);
			setSignalsForAssets(
				scopedAssets.map((asset) => asset.id),
				{
					state: "error",
					label: "Retry",
				},
			);
			toast.error("Copilot analysis failed", {
				description: message,
			});
		} finally {
			if (requestId === copilotRequestRef.current) {
				setCopilotLoading(false);
			}
		}
	}

	function openDeposit(asset: AssetItem) {
		setDepositAsset(asset);
		setDepositOpen(true);
		setDepositAmount(
			asset.walletBalance && asset.walletBalance > 0
				? Math.min(asset.walletBalance, 5000).toString()
				: "0",
		);
	}

	function handleRowSelect(rowId: string) {
		const asset = assets.find((entry) => entry.id === rowId);
		if (!asset) return;
		router.push(
			`/protocol/opportunities/asset/${encodeURIComponent(asset.symbol)}`,
		);
	}

	function handleDeposit(assetId: string) {
		const asset = assets.find((entry) => entry.id === assetId);
		if (!asset) return;

		if (!asset.supported || asset.walletBalance <= 0) {
			setNoBalanceAsset(asset);
			return;
		}

		openDeposit(asset);
	}

	async function confirmDeposit() {
		if (!depositAsset) return;
		const amount = Number(depositAmount) || 0;
		if (amount <= 0) return;
		if (
			depositAsset.walletBalance !== undefined &&
			amount > depositAsset.walletBalance
		)
			return;
		if (!address) {
			toast.error("Connect your wallet first");
			return;
		}

		if (
			!depositAsset.tokenAddress ||
			!depositAsset.tokenDecimals ||
			!depositAsset.vaultAddress
		) {
			toast.error(
				"No supported vault is configured for this asset on the current chain",
			);
			return;
		}

		if (!walletClient || !publicClient) {
			toast.error("Wallet client is not ready yet");
			return;
		}

		try {
			setIsDepositing(true);

			const parsedAmount = parseUnits(
				depositAmount,
				depositAsset.tokenDecimals,
			);
			const feeEstimate = await publicClient.estimateFeesPerGas();
			const feeOverrides =
				typeof feeEstimate.maxFeePerGas === "bigint" &&
				typeof feeEstimate.maxPriorityFeePerGas === "bigint"
					? {
							maxFeePerGas: feeEstimate.maxFeePerGas,
							maxPriorityFeePerGas: feeEstimate.maxPriorityFeePerGas,
						}
					: typeof feeEstimate.gasPrice === "bigint"
						? {
								gasPrice: feeEstimate.gasPrice,
							}
						: {};

			const allowance = await publicClient.readContract({
				address: depositAsset.tokenAddress,
				abi: erc20Abi,
				functionName: "allowance",
				args: [address as Address, depositAsset.vaultAddress],
			});

			if (allowance < parsedAmount) {
				toast.message(`Approving ${depositAsset.symbol} for vault deposit...`);
				const approveHash = await walletClient.writeContract({
					address: depositAsset.tokenAddress,
					abi: erc20Abi,
					functionName: "approve",
					args: [depositAsset.vaultAddress, parsedAmount],
					account: walletClient.account,
					chain: walletClient.chain,
					...feeOverrides,
				});
				await publicClient.waitForTransactionReceipt({ hash: approveHash });
			}

			toast.message(`Depositing ${depositAmount} ${depositAsset.symbol}...`);
			const depositHash = await walletClient.writeContract({
				address: depositAsset.vaultAddress,
				abi: yieldPilotVaultAbi,
				functionName: "deposit",
				args: [parsedAmount, address as Address],
				account: walletClient.account,
				chain: walletClient.chain,
				...feeOverrides,
			});
			await publicClient.waitForTransactionReceipt({ hash: depositHash });

			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: ["yieldpilot", "multichain-balances"],
				}),
				queryClient.invalidateQueries({
					queryKey: ["yieldpilot", "multichain-vault-positions"],
				}),
			]);
			copilotCacheRef.current.clear();

			setDepositAsset(null);
			setDepositOpen(false);
			toast.success("Deposit submitted successfully", {
				description: `${depositAmount} ${depositAsset.symbol} was deposited into ${depositAsset.vaultLabel ?? "the selected vault"}.`,
			});
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Deposit transaction failed";
			toast.error("Deposit failed", {
				description: message,
			});
		} finally {
			setIsDepositing(false);
		}
	}

	function copyVaultAddress() {
		const vaultAddress = receiveVaultAsset?.vaultAddress;
		if (!vaultAddress) {
			toast.error("No vault address is configured for this network");
			return;
		}

		void (async () => {
			try {
				if (navigator.clipboard?.writeText) {
					await navigator.clipboard.writeText(vaultAddress);
				} else {
					const textarea = document.createElement("textarea");
					textarea.value = vaultAddress;
					textarea.setAttribute("readonly", "");
					textarea.style.position = "absolute";
					textarea.style.left = "-9999px";
					document.body.appendChild(textarea);
					textarea.select();
					document.execCommand("copy");
					document.body.removeChild(textarea);
				}
				toast.success("Vault address copied");
			} catch {
				toast.error("Could not copy address");
			}
		})();
	}

	if (isPageLoading) {
		return <DashboardPageSkeleton />;
	}

	return (
		<div className="px-0 pb-12">
			<div className="px-5 pt-8 md:px-8">
				<div className="flex flex-col gap-8">
					<div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
						<div className="flex flex-col gap-5">
							<div>
								<h1 className="text-[26px] font-semibold tracking-tight text-foreground md:text-[34px]">
									{greeting}.
								</h1>
							</div>

							<div>
								<div className="text-[36px] font-semibold tracking-tight text-foreground md:text-[44px]">
									{hasVaultValue
										? `$${totalVaultValueUsd.toLocaleString(undefined, {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}`
										: "$0.00"}
								</div>
								<div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
									Vault balance
									<Tooltip>
										<TooltipTrigger>
											<Info className="size-3.5" />
										</TooltipTrigger>
										<TooltipContent sideOffset={8} className="max-w-[220px]">
											Approximate value currently deposited inside Kabon vaults
											across supported chains, using live market pricing when
											available.
										</TooltipContent>
									</Tooltip>
								</div>
							</div>

							<div className="border-t border-border pt-4">
								<div className="flex items-center justify-between py-2.5 text-sm">
									<div className="flex items-center gap-1.5 text-muted-foreground">
										Wallet assets
										<Tooltip>
											<TooltipTrigger>
												<Info className="size-3.5" />
											</TooltipTrigger>
											<TooltipContent sideOffset={8} className="max-w-[220px]">
												How many tracked assets with a non-zero balance were
												detected in the connected wallet across supported
												chains.
											</TooltipContent>
										</Tooltip>
									</div>
									<span className="font-semibold text-foreground">
										{walletAssets.length}
									</span>
								</div>
								<div className="flex items-center justify-between py-2.5 text-sm">
									<div className="flex items-center gap-1.5 text-muted-foreground">
										Deposit-ready
										<Tooltip>
											<TooltipTrigger>
												<Info className="size-3.5" />
											</TooltipTrigger>
											<TooltipContent sideOffset={8} className="max-w-[220px]">
												Wallet assets that are both detected in your wallet and
												supported by the live registry.
											</TooltipContent>
										</Tooltip>
									</div>
									<span className="font-semibold text-foreground">
										{supportedWalletAssets}
									</span>
								</div>
							</div>
						</div>

						<div className="flex flex-col gap-4">
							<div className="flex flex-wrap items-center justify-end gap-3">
								<Button
									variant="secondary"
									className="h-12 rounded-full px-4 text-sm font-semibold"
									onClick={() => setReceiveOpen(true)}
								>
									<QrCode data-icon="inline-start" />
									Receive
								</Button>
								<Button
									variant="secondary"
									className="h-12 rounded-full px-4 text-sm font-semibold"
									onClick={() => {
										const vaultAssets = getSupportedVaultAssets(chainId);
										if (vaultAssets.length === 0) {
											toast.error("No vault is configured for this chain");
											return;
										}
										const firstSupportedAsset =
											supportedDepositAssets[0] ?? vaultAssets[0];
										openDeposit(firstSupportedAsset);
									}}
								>
									<CircleArrowDown data-icon="inline-start" />
									Deposit
								</Button>
							</div>

							<Card className="rounded-[24px] border-border bg-card/95 p-0">
								<CardContent className="p-0">
									<div className="flex flex-col gap-3 px-4 py-4 md:px-5">
										<div className="flex items-center justify-between gap-4">
											<div>
												<p className="text-sm font-medium text-muted-foreground">
													Depositable assets
												</p>
												<p className="mt-1 text-xs text-muted-foreground/75">
													Wallet balances across supported chains, paired with
													live pricing and deposit context.
												</p>
											</div>
										</div>
										<div className="flex flex-wrap items-center gap-1">
											{chartSeriesAssets.map((asset) => (
												<button
													key={asset.symbol}
													type="button"
													onClick={() =>
														setSelectedChartAssetSymbol(asset.symbol)
													}
													className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${selectedChartAsset?.symbol === asset.symbol ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
												>
													<span
														className="size-2 rounded-full"
														style={{ backgroundColor: asset.color }}
													/>
													{asset.label}
												</button>
											))}
										</div>
										<div className="flex items-center justify-end gap-1">
											{RANGE_OPTIONS.map((range) => (
												<button
													key={range}
													type="button"
													onClick={() => setSelectedRange(range)}
													className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
														selectedRange === range
															? "bg-foreground/10 text-foreground"
															: "text-muted-foreground hover:text-foreground"
													}`}
												>
													{range}
												</button>
											))}
										</div>
									</div>
									<div className="px-3 pb-3 md:px-4 md:pb-4">
										<div className="px-1 pb-3 text-xs text-muted-foreground">
											{selectedChartAsset && chartData.length > 0
												? `${selectedChartAsset.label} position: $${selectedChartAssetValueUsd.toLocaleString(
														undefined,
														{
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														},
													)}${portfolioRangeDelta ? ` | ${portfolioRangeDelta.percent >= 0 ? "+" : ""}${portfolioRangeDelta.percent.toFixed(2)}% over ${selectedRange}` : ""}`
												: hasWalletChartAssets
													? "Fetching market history for detected wallet assets..."
													: "No wallet assets detected across supported chains yet."}
										</div>
									</div>
									<div className="px-3 pb-3 md:px-4 md:pb-4">
										{chartData.length > 0 && selectedChartAsset ? (
											<>
												<ChartContainer
													config={chartConfig}
													className="min-h-[260px] w-full rounded-[20px] border border-border/70 bg-gradient-to-b from-muted/25 via-transparent to-transparent px-2 py-3"
												>
													<AreaChart
														accessibilityLayer
														data={chartData}
														margin={{ left: 6, right: 10, top: 10, bottom: 8 }}
													>
														<defs>
															<linearGradient
																id={`fill-${selectedChartAsset.seriesKey}`}
																x1="0"
																y1="0"
																x2="0"
																y2="1"
															>
																<stop
																	offset="5%"
																	stopColor={selectedChartAsset.color}
																	stopOpacity={0.28}
																/>
																<stop
																	offset="95%"
																	stopColor={selectedChartAsset.color}
																	stopOpacity={0.04}
																/>
															</linearGradient>
														</defs>
														<CartesianGrid
															vertical={false}
															stroke="rgba(255,255,255,0.06)"
														/>
														<XAxis
															dataKey="label"
															axisLine={false}
															tickLine={false}
															tickMargin={12}
															minTickGap={24}
															tick={{
																fill: "rgba(255,255,255,0.46)",
																fontSize: 11,
															}}
														/>
														<YAxis
															hide
															domain={([dataMin, dataMax]) => {
																const min = Number(dataMin ?? 0);
																const max = Number(dataMax ?? 0);
																const spread = Math.max(
																	max - min,
																	max * 0.08,
																	1,
																);
																return [
																	Math.max(0, min - spread * 0.5),
																	max + spread * 0.5,
																];
															}}
														/>
														<ChartTooltip
															cursor={false}
															content={
																<ChartTooltipContent
																	indicator="dot"
																	formatter={(value, name, item) => {
																		const assetKey = String(
																			item.dataKey ?? name,
																		);
																		const balance = Number(
																			item.payload?.[`${assetKey}Balance`] ?? 0,
																		);
																		const spotPrice = Number(
																			item.payload?.[`${assetKey}Price`] ?? 0,
																		);
																		const symbol = String(
																			item.payload?.[`${assetKey}Symbol`] ??
																				name,
																		);
																		const holdings = JSON.parse(
																			String(
																				item.payload?.[`${assetKey}Holdings`] ??
																					"[]",
																			),
																		) as Array<{
																			assetId: string;
																			chainLabel: string;
																			balance: number;
																		}>;
																		return (
																			<div className="flex w-full items-start justify-between gap-3">
																				<div className="flex flex-col gap-1">
																					<span className="text-muted-foreground">
																						{chartConfig[
																							name as keyof typeof chartConfig
																						]?.label ?? name}
																					</span>
																					<span className="text-[11px] text-muted-foreground/80">
																						{formatWalletBalance(balance)}{" "}
																						{symbol} @ $
																						{spotPrice.toLocaleString(
																							undefined,
																							{
																								minimumFractionDigits: 2,
																								maximumFractionDigits: 2,
																							},
																						)}
																					</span>
																					{holdings.length > 1 ? (
																						<div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground/70">
																							{holdings.map((holding) => (
																								<span key={holding.assetId}>
																									{holding.chainLabel}:{" "}
																									{formatWalletBalance(
																										holding.balance,
																									)}{" "}
																									{symbol}
																								</span>
																							))}
																						</div>
																					) : null}
																				</div>
																				<span className="font-medium text-foreground">
																					$
																					{Number(value).toLocaleString(
																						undefined,
																						{
																							minimumFractionDigits: 2,
																							maximumFractionDigits: 2,
																						},
																					)}
																				</span>
																			</div>
																		);
																	}}
																/>
															}
														/>
														<Area
															type="monotone"
															dataKey={selectedChartAsset.seriesKey}
															fill={`url(#fill-${selectedChartAsset.seriesKey})`}
															fillOpacity={1}
															stroke={selectedChartAsset.color}
															strokeWidth={2.6}
															dot={false}
															activeDot={{
																r: 5,
																fill: selectedChartAsset.color,
																stroke: "hsl(var(--background))",
																strokeWidth: 2,
															}}
															connectNulls
														/>
													</AreaChart>
												</ChartContainer>
											</>
										) : isChartLoading ? (
											<div className="rounded-[20px] border border-border/70 bg-gradient-to-b from-muted/25 via-transparent to-transparent px-4 py-5">
												<div className="flex h-[260px] flex-col justify-between">
													{Array.from({ length: 4 }).map((_, index) => (
														<Skeleton
															key={index}
															className="h-px w-full rounded-full"
														/>
													))}
												</div>
											</div>
										) : (
											<div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-border/70 text-sm text-muted-foreground">
												{hasWalletChartAssets
													? "Market history is unavailable for the selected assets right now."
													: "Connect a wallet with supported assets to see price history."}
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						</div>
					</div>

					<Card className="rounded-[28px] border-border bg-card/90 py-0 shadow-[0_20px_80px_rgba(0,0,0,0.32)]">
						<CardHeader className="gap-5 border-b border-border px-5 py-5 md:px-8">
							<div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
								<div>
									<CardTitle className="text-2xl font-semibold tracking-tight">
										Wallet assets
									</CardTitle>
									<p className="mt-1 text-sm text-muted-foreground">
										Assets detected in the connected wallet across supported
										chains, enriched with live pricing and deposit context
									</p>
								</div>
							</div>

							<div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
								<div className="flex flex-wrap items-center gap-3">
									<SearchPill search={search} setSearch={setSearch} />
								</div>
								<Button
									variant="secondary"
									className="h-11 rounded-full px-4 text-sm font-semibold"
									onClick={() => void openCopilot({ mode: "portfolio" })}
									disabled={walletAssetsWithMarketData.length === 0}
								>
									<Sparkles data-icon="inline-start" />
									Analyze portfolio
								</Button>
							</div>
						</CardHeader>

						<FinancialMarketsTable
							title="Asset"
							rows={rows}
							onRowSelect={handleRowSelect}
							onAction={handleDeposit}
							onCopilotClick={(rowId) =>
								void openCopilot({ mode: "asset", assetId: rowId })
							}
						/>
					</Card>
				</div>
			</div>

			<Sheet open={copilotOpen} onOpenChange={setCopilotOpen}>
				<SheetContent
					side="right"
					className="w-full border-border/80 bg-popover p-0 sm:max-w-[520px]"
				>
					<div className="flex h-full flex-col">
						<SheetHeader className="border-b border-border/70 px-6 py-5">
							<div className="flex items-start gap-3">
								<div className="min-w-0">
									<SheetTitle className="text-xl font-semibold tracking-tight">
										{copilotScope?.mode === "asset"
											? `${activeCopilotAsset?.symbol ?? "Asset"} review`
											: "Kabon review"}
									</SheetTitle>
									<SheetDescription className="mt-1 text-sm text-muted-foreground">
										{copilotScope?.mode === "asset"
											? "Selected wallet position"
											: "Current wallet positions"}
									</SheetDescription>
								</div>
							</div>
						</SheetHeader>

						<div className="flex-1 overflow-y-auto px-6 py-5">
							{copilotLoading || copilotAnalysis.isPending ? (
								<div className="space-y-4">
									<div className="rounded-[22px] border border-border/70 bg-card/70 p-5">
										<Skeleton className="h-4 w-28 rounded-full" />
										<Skeleton className="mt-4 h-8 w-48 rounded-full" />
										<Skeleton className="mt-3 h-4 w-full rounded-full" />
									</div>
									<div className="space-y-3">
										{Array.from({ length: 3 }).map((_, index) => (
											<div
												key={index}
												className="rounded-[20px] border border-border/70 bg-card/60 p-4"
											>
												<Skeleton className="h-5 w-20 rounded-full" />
												<Skeleton className="mt-3 h-4 w-40 rounded-full" />
												<Skeleton className="mt-3 h-4 w-full rounded-full" />
											</div>
										))}
									</div>
								</div>
							) : copilotError ? (
								<div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
									<div className="text-sm font-medium text-foreground">
										Copilot could not finish the analysis
									</div>
									<p className="mt-2 text-sm text-muted-foreground">
										{copilotError}
									</p>
									<Button
										variant="secondary"
										className="mt-4 rounded-full"
										onClick={() =>
											copilotScope ? void openCopilot(copilotScope) : undefined
										}
									>
										Try again
									</Button>
								</div>
							) : copilotResult ? (
								<div className="space-y-5">
									<div className="rounded-[22px] border border-border/70 bg-card/70 p-5">
										<div className="flex items-start justify-between gap-4">
											<div>
												<div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
													Suggested move
												</div>
												<div className="mt-2 text-lg font-semibold text-foreground">
													{copilotResult.bestOpportunity
														? `${copilotResult.bestOpportunity.symbol} ${copilotResult.bestOpportunity.protocolName ? `via ${copilotResult.bestOpportunity.protocolName}` : ""}`
														: "No strong route yet"}
												</div>
												<p className="mt-2 text-sm text-muted-foreground">
													{copilotResult.narrative}
												</p>
											</div>
											<div className="shrink-0 rounded-full border border-border/70 px-3 py-1 text-sm font-semibold text-foreground">
												{copilotResult.bestOpportunity
													? `${copilotResult.bestOpportunity.expectedApy.toFixed(2)}% APY`
													: "Hold"}
											</div>
										</div>
									</div>

									<div className="space-y-3">
										<div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
											Positions
										</div>
										{copilotResult.items.map((item) => (
											<div
												key={item.assetId}
												className="rounded-[20px] border border-border/70 bg-card/60 p-4"
											>
												<div className="flex items-start justify-between gap-4">
													<div className="min-w-0">
														<div className="flex flex-wrap items-center gap-2">
															<span className="text-base font-semibold text-foreground">
																{item.symbol}
															</span>
															<span className="text-xs text-muted-foreground">
																{item.chainLabel}
															</span>
														</div>
														<div className="mt-1 text-sm text-muted-foreground">
															{formatWalletBalance(item.balance)} {item.symbol}
															{typeof item.unitPriceUsd === "number"
																? ` @ $${item.unitPriceUsd.toLocaleString(
																		undefined,
																		{
																			minimumFractionDigits: 2,
																			maximumFractionDigits: 2,
																		},
																	)}`
																: ""}
															{typeof item.valueUsd === "number"
																? ` • $${item.valueUsd.toLocaleString(
																		undefined,
																		{
																			minimumFractionDigits: 2,
																			maximumFractionDigits: 2,
																		},
																	)}`
																: ""}
														</div>
													</div>
													<span
														className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${item.status === "actionable" ? "border-emerald-500/35 bg-emerald-500/12 text-emerald-300" : item.status === "hold" ? "border-sky-500/35 bg-sky-500/12 text-sky-300" : item.status === "blocked" ? "border-amber-500/35 bg-amber-500/12 text-amber-300" : "border-red-500/35 bg-red-500/12 text-red-300"}`}
													>
														{item.label}
													</span>
												</div>
												<p className="mt-3 text-sm text-muted-foreground">
													{item.summary}
												</p>
											</div>
										))}
									</div>
								</div>
							) : (
								<div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-border/70 text-sm text-muted-foreground">
									Open a review to see Kabon guidance.
								</div>
							)}
						</div>
					</div>
				</SheetContent>
			</Sheet>

			<Dialog
				open={Boolean(noBalanceAsset)}
				onOpenChange={(open) => !open && setNoBalanceAsset(null)}
			>
				<DialogContent className="max-w-[540px] rounded-[28px] border border-border/80 bg-popover p-0 shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
					{noBalanceAsset && (
						<div className="p-8">
							<DialogHeader>
								<Avatar className="mb-5 size-16 border border-border/40">
									<AvatarImage
										src={noBalanceAsset.iconUrl}
										alt={`${noBalanceAsset.name} icon`}
										className="size-full object-contain bg-background p-2"
									/>
									<AvatarFallback
										className={`bg-gradient-to-br text-2xl font-semibold text-white ${noBalanceAsset.iconClass}`}
									>
										{noBalanceAsset.symbol.slice(0, 1)}
									</AvatarFallback>
								</Avatar>
								<DialogTitle className="text-[40px] font-semibold tracking-tight text-foreground">
									No {noBalanceAsset.symbol} Balance
								</DialogTitle>
								<DialogDescription className="mt-2 text-lg leading-relaxed text-muted-foreground">
									You do not have a supported {noBalanceAsset.symbol} balance
									ready to deposit right now.
								</DialogDescription>
							</DialogHeader>

							<div className="mt-8">
								<Button
									className="h-14 w-full rounded-full text-base font-semibold"
									onClick={() => setNoBalanceAsset(null)}
								>
									Got it
								</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>

			<DepositDialog
				depositAsset={depositAsset}
				supportedDepositAssets={supportedDepositAssets}
				onDeposit={handleDeposit}
				onClose={() => {
					setDepositAsset(null);
					setDepositOpen(false);
				}}
				isDepositing={isDepositing}
				depositAmount={depositAmount}
				setDepositAmount={setDepositAmount}
				confirmDeposit={confirmDeposit}
				open={depositOpen}
				onOpenChange={setDepositOpen}
				walletReady={Boolean(walletClient && publicClient)}
			/>

			<ReceiveDialog
				receiveOpen={receiveOpen}
				setReceiveOpen={setReceiveOpen}
				setChainsOpen={setChainsOpen}
				copyVaultAddress={copyVaultAddress}
				chainsOpen={chainsOpen}
			/>
		</div>
	);
}
