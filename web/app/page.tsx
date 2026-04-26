"use client";

import { useMemo, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import {
	useBalance,
	useChainId,
	usePublicClient,
	useReadContracts,
	useSwitchChain,
	useWalletClient,
} from "wagmi";
import { erc20Abi, formatUnits, parseUnits, type Address } from "viem";
import {
	CircleArrowDown,
	ChevronDown,
	Info,
	QrCode,
	Search,
	X,
} from "lucide-react";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	DialogClose,
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { APP_SUPPORTED_CHAINS, PRIMARY_CHAIN_LABEL } from "@/lib/app-chains";
import { getChainById, getChainOptions } from "@/lib/chain-utils";
import { yieldPilotVaultAbi } from "@/lib/vault-abi";
import {
	getSupportedVaultAsset,
	getSupportedVaultAssets,
} from "@/lib/vault-registry";
import { useAssetSummaries } from "@/lib/use-yieldpilot-market-data";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

type AssetItem = {
	id: string;
	name: string;
	symbol: string;
	iconUrl?: string;
	walletBalance: number;
	deposited: string;
	apy: string;
	totalDeposits: string;
	availableLiquidity: string;
	supported: boolean;
	iconClass: string;
	tokenAddress?: Address;
	tokenDecimals?: number;
	vaultAddress?: Address;
	vaultLabel?: string;
};

type RangeKey = "1D" | "1W" | "1M" | "6M" | "1Y" | "All";

const RANGE_OPTIONS: RangeKey[] = ["1D", "1W", "1M", "6M", "1Y", "All"];

function readAddress(value: string | undefined): Address | undefined {
	return value && /^0x[a-fA-F0-9]{40}$/.test(value)
		? (value as Address)
		: undefined;
}

const arbitrumSepoliaUsdcTokenAddress = readAddress(
	process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_USDC_TOKEN_ADDRESS
);
const robinhoodUsdcTokenAddress = readAddress(
	process.env.NEXT_PUBLIC_ROBINHOOD_USDC_TOKEN_ADDRESS
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

const ASSET_VISUALS: Record<string, { iconUrl?: string; iconClass: string }> = {
	USDC: {
		iconUrl:
			"https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdc.png",
		iconClass: "from-sky-400 to-blue-600",
	},
	USDT: {
		iconUrl:
			"https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png",
		iconClass: "from-emerald-400 to-teal-600",
	},
	ETH: {
		iconUrl:
			"https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png",
		iconClass: "from-slate-500 to-slate-700",
	},
	WETH: {
		iconUrl:
			"https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png",
		iconClass: "from-slate-500 to-slate-700",
	},
	WBTC: {
		iconUrl:
			"https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/wbtc.png",
		iconClass: "from-orange-400 to-amber-500",
	},
	wstETH: {
		iconUrl: "https://assets.coingecko.com/coins/images/18834/large/wstETH.png",
		iconClass: "from-cyan-400 to-sky-600",
	},
	weETH: {
		iconUrl: "https://assets.coingecko.com/coins/images/33033/large/weETH.png",
		iconClass: "from-fuchsia-400 to-violet-600",
	},
	USDe: {
		iconUrl: "https://assets.coingecko.com/coins/images/33613/large/usde.png",
		iconClass: "from-zinc-300 to-zinc-500",
	},
	LINK: {
		iconUrl:
			"https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/link.png",
		iconClass: "from-blue-500 to-blue-700",
	},
	AAVE: {
		iconUrl:
			"https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/aave.png",
		iconClass: "from-violet-400 to-purple-600",
	},
	RLUSD: {
		iconUrl: "https://cryptologos.cc/logos/ripple-usd-rlusd-logo.png?v=040",
		iconClass: "from-blue-400 to-indigo-600",
	},
};

function compactAmount(value: number) {
	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 2,
		notation: value >= 1000 ? "compact" : "standard",
	}).format(value);
}

export default function DashboardPage() {
	const assetSummaries = useAssetSummaries();
	const { address } = useAppKitAccount();
	const chainId = useChainId();
	const { switchChain } = useSwitchChain();
	const chainOptions = getChainOptions();
	const [search, setSearch] = useState("");
	const [noBalanceAsset, setNoBalanceAsset] = useState<AssetItem | null>(null);
	const [depositAsset, setDepositAsset] = useState<AssetItem | null>(null);
	const [depositAmount, setDepositAmount] = useState("0");
	const [isDepositing, setIsDepositing] = useState(false);
	const [receiveOpen, setReceiveOpen] = useState(false);
	const [chainsOpen, setChainsOpen] = useState(false);
	const [selectedRange, setSelectedRange] = useState<RangeKey>("1W");
	const summaries = assetSummaries.data?.assets ?? [];
	const publicClient = usePublicClient();
	const { data: walletClient } = useWalletClient();
	const supportedVaultAssets = useMemo(
		() => getSupportedVaultAssets(chainId),
		[chainId]
	);
	const receiveVaultAsset = supportedVaultAssets[0];
	const nativeBalance = useBalance({
		address: address as Address | undefined,
		query: {
			enabled: Boolean(address),
		},
	});
	const trackedTokenContracts = useMemo(() => {
		if (!address) return [];
		const chainConfig = TRACKED_TOKEN_CONFIG[chainId] ?? {};
		return summaries
			.map((summary) => {
				const token = chainConfig[summary.symbol];
				if (!token) return null;
				return {
					symbol: summary.symbol,
					decimals: token.decimals,
					stable: token.stable,
					contract: {
						address: token.address,
						abi: erc20Abi,
						functionName: "balanceOf" as const,
						args: [address as Address] as const,
					},
				};
			})
			.filter((item): item is NonNullable<typeof item> => item !== null);
	}, [address, chainId, summaries]);
	const tokenBalances = useReadContracts({
		allowFailure: true,
		contracts: trackedTokenContracts.map((item) => item.contract),
		query: {
			enabled: trackedTokenContracts.length > 0,
		},
	});
	const isAssetSummariesLoading =
		assetSummaries.isPending && assetSummaries.data === undefined;
	const isNativeBalanceLoading =
		Boolean(address) &&
		nativeBalance.isPending &&
		nativeBalance.data === undefined;
	const isTokenBalancesLoading =
		Boolean(address) &&
		trackedTokenContracts.length > 0 &&
		tokenBalances.isPending &&
		tokenBalances.data === undefined;
	const isPageLoading =
		isAssetSummariesLoading || isNativeBalanceLoading || isTokenBalancesLoading;
	const balanceBySymbol = useMemo(() => {
		const next = new Map<string, { balance: number; stable: boolean }>();
		if (nativeBalance.data?.value !== undefined) {
			next.set("ETH", {
				balance: Number(
					formatUnits(nativeBalance.data.value, nativeBalance.data.decimals)
				),
				stable: false,
			});
		}
		trackedTokenContracts.forEach((item, index) => {
			const result = tokenBalances.data?.[index];
			if (!result || result.status !== "success") return;
			next.set(item.symbol, {
				balance: Number(formatUnits(result.result, item.decimals)),
				stable: item.stable,
			});
		});
		return next;
	}, [nativeBalance.data, tokenBalances.data, trackedTokenContracts]);

	const assets = useMemo(() => {
		if (summaries.length === 0) {
			return [
				{
					id: "usdc",
					name: "USD Coin",
					symbol: "USDC",
					iconUrl: ASSET_VISUALS.USDC.iconUrl,
					walletBalance: 0,
					deposited: "-",
					apy: assetSummaries.isLoading ? "Loading..." : "-",
					totalDeposits: "-",
					availableLiquidity: "-",
					supported: true,
					iconClass: ASSET_VISUALS.USDC.iconClass,
				},
			] satisfies AssetItem[];
		}

		return summaries.map((summary) => {
			const vaultConfig = getSupportedVaultAsset(chainId, summary.symbol);
			const visuals = ASSET_VISUALS[summary.symbol] ?? {
				iconClass: "from-neutral-500 to-neutral-700",
			};
			return {
				id: summary.symbol.toLowerCase(),
				name: summary.name,
				symbol: summary.symbol,
				iconUrl: visuals.iconUrl,
				walletBalance: balanceBySymbol.get(summary.symbol)?.balance ?? 0,
				deposited: "-",
				apy:
					summary.protocolCount > 0
						? `${summary.averageApy.toFixed(2)}% avg`
						: "-",
				totalDeposits:
					summary.totalTvlUsd > 0
						? `${compactAmount(summary.totalTvlUsd)} TVL`
						: "-",
				availableLiquidity:
					summary.availableLiquidityUsd > 0
						? `${compactAmount(summary.availableLiquidityUsd)} liquid`
						: "-",
				supported: summary.supported && Boolean(vaultConfig),
				iconClass: visuals.iconClass, // Change made here
				tokenAddress: vaultConfig?.tokenAddress,
				tokenDecimals: vaultConfig?.tokenDecimals,
				vaultAddress: vaultConfig?.vaultAddress,
				vaultLabel: vaultConfig?.vaultLabel,
			};
		});
	}, [assetSummaries.isLoading, balanceBySymbol, chainId, summaries]);

	const walletAssets = useMemo(
		() =>
			assets
				.filter((asset) => asset.walletBalance > 0)
				.sort((left, right) => right.walletBalance - left.walletBalance),
		[assets]
	);
	const supportedDepositAssets = useMemo(
		() => assets.filter((asset) => asset.supported),
		[assets]
	);
	const totalWalletStableBalance = useMemo(
		() =>
			Array.from(balanceBySymbol.values())
				.filter((asset) => asset.stable)
				.reduce((sum, asset) => sum + asset.balance, 0),
		[balanceBySymbol]
	);
	const supportedWalletAssets = supportedDepositAssets.length;

	const filtered = useMemo(() => {
		const term = search.trim().toLowerCase();
		return walletAssets.filter((asset) => {
			const matchesSearch =
				term.length === 0 ||
				asset.name.toLowerCase().includes(term) ||
				asset.symbol.toLowerCase().includes(term);
			return matchesSearch;
		});
	}, [walletAssets, search]);

	const rows: FinancialAssetRow[] = filtered.map((asset) => ({
		id: asset.id,
		name: asset.name,
		symbol: asset.symbol,
		walletBalance:
			asset.walletBalance > 0
				? `${asset.walletBalance.toLocaleString()} ${asset.symbol}`
				: "-",
		deposited: asset.deposited,
		apy: asset.apy,
		totalDeposits: asset.totalDeposits,
		availableLiquidity: asset.availableLiquidity,
		supported: asset.supported,
		iconClass: asset.iconClass,
		iconUrl: asset.iconUrl,
	}));

	const chartConfig = {
		usdc: {
			label: "USDC",
			color: "#8b7eff",
		},
		eth: {
			label: "ETH",
			color: "#5ec6ff",
		},
		wbtc: {
			label: "WBTC",
			color: "#f59e0b",
		},
		aave: {
			label: "AAVE",
			color: "#d38cf5",
		},
	} satisfies ChartConfig;

	const chartData = useMemo(() => {
		// Get user's actual deposited balances from assets
		const usdcAsset = assets.find((a) => a.symbol === "USDC");
		const ethAsset = assets.find(
			(a) => a.symbol === "ETH" || a.symbol === "WETH"
		);
		const wbtcAsset = assets.find((a) => a.symbol === "WBTC");
		const aaveAsset = assets.find((a) => a.symbol === "AAVE");

		const usdcBalance = usdcAsset?.walletBalance ?? 0;
		const ethBalance = ethAsset?.walletBalance ?? 0;
		const wbtcBalance = wbtcAsset?.walletBalance ?? 0;
		const aaveBalance = aaveAsset?.walletBalance ?? 0;

		// If user has no balance, return empty chart data
		if (
			usdcBalance === 0 &&
			ethBalance === 0 &&
			wbtcBalance === 0 &&
			aaveBalance === 0
		) {
			const emptySeries = {
				"1D": [
					{ label: "00:00", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
					{ label: "04:00", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
					{ label: "08:00", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
					{ label: "12:00", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
					{ label: "16:00", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
					{ label: "20:00", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
				],
				"1W": [
					{
						label: "Mon",
						usdc: usdcBalance * 0.85,
						eth: ethBalance * 0.85,
						wbtc: wbtcBalance * 0.85,
						aave: aaveBalance * 0.85,
					},
					{
						label: "Tue",
						usdc: usdcBalance * 0.89,
						eth: ethBalance * 0.89,
						wbtc: wbtcBalance * 0.89,
						aave: aaveBalance * 0.89,
					},
					{
						label: "Wed",
						usdc: usdcBalance * 0.92,
						eth: ethBalance * 0.92,
						wbtc: wbtcBalance * 0.92,
						aave: aaveBalance * 0.92,
					},
					{
						label: "Thu",
						usdc: usdcBalance * 0.95,
						eth: ethBalance * 0.95,
						wbtc: wbtcBalance * 0.95,
						aave: aaveBalance * 0.95,
					},
					{
						label: "Fri",
						usdc: usdcBalance * 0.98,
						eth: ethBalance * 0.98,
						wbtc: wbtcBalance * 0.98,
						aave: aaveBalance * 0.98,
					},
					{
						label: "Sat",
						usdc: usdcBalance * 0.99,
						eth: ethBalance * 0.99,
						wbtc: wbtcBalance * 0.99,
						aave: aaveBalance * 0.99,
					},
					{
						label: "Sun",
						usdc: usdcBalance,
						eth: ethBalance,
						wbtc: wbtcBalance,
						aave: aaveBalance,
					},
				],
				"1M": [
					{
						label: "W1",
						usdc: usdcBalance * 0.7,
						eth: ethBalance * 0.7,
						wbtc: wbtcBalance * 0.7,
						aave: aaveBalance * 0.7,
					},
					{
						label: "W2",
						usdc: usdcBalance * 0.8,
						eth: ethBalance * 0.8,
						wbtc: wbtcBalance * 0.8,
						aave: aaveBalance * 0.8,
					},
					{
						label: "W3",
						usdc: usdcBalance * 0.88,
						eth: ethBalance * 0.88,
						wbtc: wbtcBalance * 0.88,
						aave: aaveBalance * 0.88,
					},
					{
						label: "W4",
						usdc: usdcBalance * 0.95,
						eth: ethBalance * 0.95,
						wbtc: wbtcBalance * 0.95,
						aave: aaveBalance * 0.95,
					},
					{
						label: "Now",
						usdc: usdcBalance,
						eth: ethBalance,
						wbtc: wbtcBalance,
						aave: aaveBalance,
					},
				],
				"6M": [
					{ label: "Nov", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
					{ label: "Dec", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
					{ label: "Jan", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
					{ label: "Feb", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
					{
						label: "Mar",
						usdc: usdcBalance * 0.45,
						eth: ethBalance * 0.45,
						wbtc: wbtcBalance * 0.45,
						aave: aaveBalance * 0.45,
					},
					{
						label: "Apr",
						usdc: usdcBalance,
						eth: ethBalance,
						wbtc: wbtcBalance,
						aave: aaveBalance,
					},
					{ label: "Mar", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
					{ label: "Apr", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
				],
				"1Y": [
					{ label: "Q2", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
					{ label: "Q3", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
					{ label: "Q4", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
					{ label: "Q1", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
					{ label: "Now", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
				],
				All: [
					{ label: "Start", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
					{ label: "Phase 1", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
					{ label: "Phase 2", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
					{ label: "Phase 3", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
					{ label: "Now", usdc: 0, eth: 0, wbtc: 0, aave: 0 },
				],
			};
			return emptySeries[selectedRange];
		}

		const series: Record<
			RangeKey,
			Array<{
				label: string;
				usdc: number;
				eth: number;
				wbtc: number;
				aave: number;
			}>
		> = {
			"1D": [
				{
					label: "00:00",
					usdc: usdcBalance * 0.95,
					eth: ethBalance * 0.95,
					wbtc: wbtcBalance * 0.95,
					aave: aaveBalance * 0.95,
				},
				{
					label: "04:00",
					usdc: usdcBalance * 0.97,
					eth: ethBalance * 0.97,
					wbtc: wbtcBalance * 0.97,
					aave: aaveBalance * 0.97,
				},
				{
					label: "08:00",
					usdc: usdcBalance * 0.98,
					eth: ethBalance * 0.98,
					wbtc: wbtcBalance * 0.98,
					aave: aaveBalance * 0.98,
				},
				{
					label: "12:00",
					usdc: usdcBalance * 0.99,
					eth: ethBalance * 0.99,
					wbtc: wbtcBalance * 0.99,
					aave: aaveBalance * 0.99,
				},
				{
					label: "16:00",
					usdc: usdcBalance * 1.01,
					eth: ethBalance * 1.01,
					wbtc: wbtcBalance * 1.01,
					aave: aaveBalance * 1.01,
				},
				{
					label: "20:00",
					usdc: usdcBalance,
					eth: ethBalance,
					wbtc: wbtcBalance,
					aave: aaveBalance,
				},
			],
			"1W": [
				{
					label: "Mon",
					usdc: usdcBalance * 0.85,
					eth: ethBalance * 0.85,
					wbtc: wbtcBalance * 0.85,
					aave: aaveBalance * 0.85,
				},
				{
					label: "Tue",
					usdc: usdcBalance * 0.89,
					eth: ethBalance * 0.89,
					wbtc: wbtcBalance * 0.89,
					aave: aaveBalance * 0.89,
				},
				{
					label: "Wed",
					usdc: usdcBalance * 0.92,
					eth: ethBalance * 0.92,
					wbtc: wbtcBalance * 0.92,
					aave: aaveBalance * 0.92,
				},
				{
					label: "Thu",
					usdc: usdcBalance * 0.95,
					eth: ethBalance * 0.95,
					wbtc: wbtcBalance * 0.95,
					aave: aaveBalance * 0.95,
				},
				{
					label: "Fri",
					usdc: usdcBalance * 0.98,
					eth: ethBalance * 0.98,
					wbtc: wbtcBalance * 0.98,
					aave: aaveBalance * 0.98,
				},
				{
					label: "Sat",
					usdc: usdcBalance * 0.99,
					eth: ethBalance * 0.99,
					wbtc: wbtcBalance * 0.99,
					aave: aaveBalance * 0.99,
				},
				{
					label: "Sun",
					usdc: usdcBalance,
					eth: ethBalance,
					wbtc: wbtcBalance,
					aave: aaveBalance,
				},
			],
			"1M": [
				{
					label: "W1",
					usdc: usdcBalance * 0.7,
					eth: ethBalance * 0.7,
					wbtc: wbtcBalance * 0.7,
					aave: aaveBalance * 0.7,
				},
				{
					label: "W2",
					usdc: usdcBalance * 0.8,
					eth: ethBalance * 0.8,
					wbtc: wbtcBalance * 0.8,
					aave: aaveBalance * 0.8,
				},
				{
					label: "W3",
					usdc: usdcBalance * 0.88,
					eth: ethBalance * 0.88,
					wbtc: wbtcBalance * 0.88,
					aave: aaveBalance * 0.88,
				},
				{
					label: "W4",
					usdc: usdcBalance * 0.95,
					eth: ethBalance * 0.95,
					wbtc: wbtcBalance * 0.95,
					aave: aaveBalance * 0.95,
				},
				{
					label: "Now",
					usdc: usdcBalance,
					eth: ethBalance,
					wbtc: wbtcBalance,
					aave: aaveBalance,
				},
			],
			"6M": [
				{
					label: "Nov",
					usdc: usdcBalance * 0.45,
					eth: ethBalance * 0.45,
					wbtc: wbtcBalance * 0.45,
					aave: aaveBalance * 0.45,
				},
				{
					label: "Dec",
					usdc: usdcBalance * 0.58,
					eth: ethBalance * 0.58,
					wbtc: wbtcBalance * 0.58,
					aave: aaveBalance * 0.58,
				},
				{
					label: "Jan",
					usdc: usdcBalance * 0.72,
					eth: ethBalance * 0.72,
					wbtc: wbtcBalance * 0.72,
					aave: aaveBalance * 0.72,
				},
				{
					label: "Feb",
					usdc: usdcBalance * 0.84,
					eth: ethBalance * 0.84,
					wbtc: wbtcBalance * 0.84,
					aave: aaveBalance * 0.84,
				},
				{
					label: "Mar",
					usdc: usdcBalance * 0.93,
					eth: ethBalance * 0.93,
					wbtc: wbtcBalance * 0.93,
					aave: aaveBalance * 0.93,
				},
				{
					label: "Apr",
					usdc: usdcBalance,
					eth: ethBalance,
					wbtc: wbtcBalance,
					aave: aaveBalance,
				},
			],
			"1Y": [
				{
					label: "Q2",
					usdc: usdcBalance * 0.35,
					eth: ethBalance * 0.35,
					wbtc: wbtcBalance * 0.35,
					aave: aaveBalance * 0.35,
				},
				{
					label: "Q3",
					usdc: usdcBalance * 0.55,
					eth: ethBalance * 0.55,
					wbtc: wbtcBalance * 0.55,
					aave: aaveBalance * 0.55,
				},
				{
					label: "Q4",
					usdc: usdcBalance * 0.75,
					eth: ethBalance * 0.75,
					wbtc: wbtcBalance * 0.75,
					aave: aaveBalance * 0.75,
				},
				{
					label: "Q1",
					usdc: usdcBalance * 0.92,
					eth: ethBalance * 0.92,
					wbtc: wbtcBalance * 0.92,
					aave: aaveBalance * 0.92,
				},
				{
					label: "Now",
					usdc: usdcBalance,
					eth: ethBalance,
					wbtc: wbtcBalance,
					aave: aaveBalance,
				},
			],
			All: [
				{
					label: "Start",
					usdc: usdcBalance * 0.25,
					eth: ethBalance * 0.25,
					wbtc: wbtcBalance * 0.25,
					aave: aaveBalance * 0.25,
				},
				{
					label: "Phase 1",
					usdc: usdcBalance * 0.45,
					eth: ethBalance * 0.45,
					wbtc: wbtcBalance * 0.45,
					aave: aaveBalance * 0.45,
				},
				{
					label: "Phase 2",
					usdc: usdcBalance * 0.68,
					eth: ethBalance * 0.68,
					wbtc: wbtcBalance * 0.68,
					aave: aaveBalance * 0.68,
				},
				{
					label: "Phase 3",
					usdc: usdcBalance * 0.88,
					eth: ethBalance * 0.88,
					wbtc: wbtcBalance * 0.88,
					aave: aaveBalance * 0.88,
				},
				{
					label: "Now",
					usdc: usdcBalance,
					eth: ethBalance,
					wbtc: wbtcBalance,
					aave: aaveBalance,
				},
			],
		};
		return series[selectedRange];
	}, [selectedRange, assets]);

	const selectedDepositUsd = Number(depositAmount || 0) || 0;
	const selectedDepositApy =
		depositAsset?.apy && depositAsset.apy !== "-"
			? depositAsset.apy.replace(" avg", "")
			: "0.00%";

	function openDeposit(asset: AssetItem) {
		setDepositAsset(asset);
		setDepositAmount(
			asset.walletBalance && asset.walletBalance > 0
				? Math.min(asset.walletBalance, 5000).toString()
				: "0"
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
				"No supported vault is configured for this asset on the current chain"
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
				depositAsset.tokenDecimals
			);

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
			});
			await publicClient.waitForTransactionReceipt({ hash: depositHash });

			setDepositAsset(null);
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
									Good evening.
								</h1>
							</div>

							<div>
								<div className="text-[36px] font-semibold tracking-tight text-foreground md:text-[44px]">
									$
									{totalWalletStableBalance.toLocaleString(undefined, {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									})}
								</div>
								<div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
									Wallet stable balance
									<MetricTooltip text="Approximate connected-wallet balance across tracked stable assets available to deposit.">
										<Info className="size-3.5" />
									</MetricTooltip>
								</div>
							</div>

							<div className="border-t border-border pt-4">
								<div className="flex items-center justify-between py-2.5 text-sm">
									<div className="flex items-center gap-1.5 text-muted-foreground">
										Wallet assets
										<MetricTooltip text="How many tracked assets with a non-zero balance were detected in the connected wallet on the current chain.">
											<Info className="size-3.5" />
										</MetricTooltip>
									</div>
									<span className="font-semibold text-foreground">
										{walletAssets.length}
									</span>
								</div>
								<div className="flex items-center justify-between py-2.5 text-sm">
									<div className="flex items-center gap-1.5 text-muted-foreground">
										Deposit-ready
										<MetricTooltip text="Wallet assets that are both detected in your wallet and supported by the live registry.">
											<Info className="size-3.5" />
										</MetricTooltip>
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
									className="h-12 rounded-full px-7 flex text-sm font-semibold"
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
													Wallet balances on the current chain, paired with live
													Arbitrum APY and liquidity context.
												</p>
											</div>
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
										<ChartContainer
											config={chartConfig}
											className="min-h-[240px] w-full"
										>
											<LineChart
												accessibilityLayer
												data={chartData}
												margin={{ left: 4, right: 8, top: 8, bottom: 8 }}
											>
												<CartesianGrid
													vertical={false}
													stroke="rgba(255,255,255,0.06)"
												/>
												<XAxis
													dataKey="label"
													axisLine={false}
													tickLine={false}
													tickMargin={10}
													tick={{
														fill: "rgba(255,255,255,0.46)",
														fontSize: 11,
													}}
												/>
												<YAxis
													hide
													domain={["dataMin - 500", "dataMax + 500"]}
												/>
												<ChartTooltip
													cursor={false}
													content={
														<ChartTooltipContent
															indicator="dot"
															formatter={(value, name) => (
																<div className="flex w-full items-center justify-between gap-3">
																	<span className="text-muted-foreground">
																		{chartConfig[
																			name as keyof typeof chartConfig
																		]?.label ?? name}
																	</span>
																	<span className="font-medium text-foreground">
																		$
																		{Number(value).toLocaleString(undefined, {
																			minimumFractionDigits: 2,
																			maximumFractionDigits: 2,
																		})}
																	</span>
																</div>
															)}
														/>
													}
												/>
												<Line
													type="monotone"
													dataKey="usdc"
													stroke="var(--color-usdc)"
													strokeWidth={2.2}
													dot={false}
													activeDot={{ r: 4, fill: "var(--color-usdc)" }}
												/>
												<Line
													type="monotone"
													dataKey="eth"
													stroke="var(--color-eth)"
													strokeWidth={2.2}
													dot={false}
													activeDot={{ r: 4, fill: "var(--color-eth)" }}
												/>
												<Line
													type="monotone"
													dataKey="wbtc"
													stroke="var(--color-wbtc)"
													strokeWidth={2.2}
													dot={false}
													activeDot={{ r: 4, fill: "var(--color-wbtc)" }}
												/>
												<Line
													type="monotone"
													dataKey="aave"
													stroke="var(--color-aave)"
													strokeWidth={2.2}
													dot={false}
													activeDot={{ r: 4, fill: "var(--color-aave)" }}
												/>
											</LineChart>
										</ChartContainer>
										<div className="flex flex-wrap items-center gap-4 border-t border-border/70 px-3 pt-4 text-sm md:px-4">
											<LegendChip color="#8b7eff" label="USDC" />
											<LegendChip color="#5ec6ff" label="ETH" />
											<LegendChip color="#f59e0b" label="WBTC" />
											<LegendChip color="#d38cf5" label="AAVE" />
										</div>
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
										Assets detected in the connected wallet, enriched with live
										Arbitrum yield data
									</p>
								</div>
							</div>

							<div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
								<div className="flex flex-wrap items-center gap-3">
									<SearchPill search={search} setSearch={setSearch} />
									{/* <FilterButton label="All Assets" />
									<FilterButton label="All Markets" />
									<div className="flex items-center gap-3 rounded-full border border-border bg-background/60 px-4 py-2.5">
										<span className="text-sm font-medium text-foreground">
											In Wallet
										</span>
										<Switch
											checked={walletOnly}
											onCheckedChange={setWalletOnly}
											aria-label="Filter assets in wallet"
										/>
									</div> */}
								</div>
							</div>
						</CardHeader>

						<FinancialMarketsTable
							title="Asset"
							rows={rows}
							onAction={handleDeposit}
						/>
					</Card>
				</div>
			</div>

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

			<Dialog
				open={Boolean(depositAsset)}
				onOpenChange={(open) => !open && setDepositAsset(null)}
			>
				<DialogContent
					showCloseButton={false}
					className="w-[92vw] max-w-[420px] overflow-hidden rounded-[24px] border border-border/80 bg-background p-0 shadow-[0_24px_80px_rgba(0,0,0,0.38)] sm:w-[420px] sm:max-w-[420px]"
				>
					{depositAsset && (
						<div className="p-6">
							<div className="mb-6 flex items-center justify-between">
								<DialogTitle className="text-xl font-semibold text-foreground">
									Deposit to Vault
								</DialogTitle>
								<DialogClose className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground">
									<X className="size-5" />
								</DialogClose>
							</div>

							{/* Connected Chain Display */}
							<div className="mb-6 rounded-xl border border-border/60 bg-muted/30 p-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<button
													type="button"
													className="flex items-center justify-center rounded-lg border border-border/50 bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
												>
													<SupportedChainIcon
														kind={
															getChainById(chainId)
																?.name.toLowerCase()
																.includes("robinhood")
																? "robinhood"
																: "arbitrum"
														}
													/>
													<span className="ml-2">
														{getChainById(chainId)?.name || "Unknown Network"}
													</span>
													<ChevronDown className="ml-2 size-4 text-muted-foreground" />
												</button>
											</DropdownMenuTrigger>
											<DropdownMenuContent
												align="start"
												className="w-72 rounded-xl border-border/60 bg-card p-2"
											>
												{chainOptions.map((chain) => (
													<DropdownMenuItem
														key={chain.id}
														onClick={async () => {
															try {
																await switchChain({
																chainId: chain.id,
																});
																toast.success(`Switched to ${chain.name}`, {
																	description: chain.badge,
																});
															} catch (error) {
																toast.error("Failed to switch network", {
																	description:
																		error instanceof Error
																			? error.message
																			: "Unknown error",
																});
															}
														}}
														className="rounded-lg px-3 py-2.5 text-sm focus:bg-muted/50"
													>
														<div className="flex items-center gap-3">
															<SupportedChainIcon
																kind={chain.icon as "arbitrum" | "robinhood"}
															/>
															<div className="min-w-0 flex-1">
																<div className="truncate font-medium text-foreground">
																	{chain.name}
																</div>
																<div className="truncate text-xs text-muted-foreground">
																	{chain.badge}
																</div>
															</div>
														</div>
													</DropdownMenuItem>
												))}
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
									<div className="text-xs text-muted-foreground">
										Connected Chain
									</div>
								</div>
							</div>

							{/* Asset Selection and Amount Input */}
							<div className="mb-6 rounded-xl border border-border/60 bg-card p-4">
								<div className="mb-4 flex items-center justify-between">
									<span className="text-sm font-medium text-muted-foreground">
										Select Asset
									</span>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<button
												type="button"
												className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/70"
											>
												<Avatar className="size-6 border border-border/30 bg-background">
													<AvatarImage
														src={depositAsset.iconUrl}
														alt={`${depositAsset.name} icon`}
														className="object-contain p-1.5"
														onError={(e) => {
															// Fallback to gradient if image fails to load
															e.currentTarget.style.display = "none";
														}}
													/>
													<AvatarFallback
														className={`bg-gradient-to-br text-xs font-semibold text-white ${depositAsset.iconClass}`}
													>
														{depositAsset.symbol.slice(0, 1)}
													</AvatarFallback>
												</Avatar>
												{depositAsset.symbol}
												<ChevronDown className="size-4 text-muted-foreground" />
											</button>
										</DropdownMenuTrigger>
										<DropdownMenuContent
											align="end"
											className="w-56 rounded-xl border-border/60 bg-card p-1"
										>
											{supportedDepositAssets.map((asset) => (
												<DropdownMenuItem
													key={asset.id}
													onClick={() => openDeposit(asset)}
													className="rounded-lg px-3 py-2.5 text-sm focus:bg-muted/50"
												>
													<Avatar className="size-6 border border-border/30 bg-background">
														<AvatarImage
															src={asset.iconUrl}
															alt={`${asset.name} icon`}
															className="object-contain p-1.5"
															onError={(e) => {
																// Fallback to gradient if image fails to load
																e.currentTarget.style.display = "none";
															}}
														/>
														<AvatarFallback
															className={`bg-gradient-to-br text-xs font-semibold text-white ${asset.iconClass}`}
														>
															{asset.symbol.slice(0, 1)}
														</AvatarFallback>
													</Avatar>
													<div className="ml-3 min-w-0 flex-1">
														<div className="truncate font-medium text-foreground">
															{asset.symbol}
														</div>
														<div className="truncate text-xs text-muted-foreground">
															Balance:{" "}
															{(asset.walletBalance ?? 0).toLocaleString()}
														</div>
													</div>
												</DropdownMenuItem>
											))}
										</DropdownMenuContent>
									</DropdownMenu>
								</div>

								<div className="space-y-3">
									<div>
										<label className="text-sm font-medium text-muted-foreground">
											Amount
										</label>
										<div className="mt-2 flex items-center gap-3">
											<Input
												value={depositAmount}
												onChange={(event) =>
													setDepositAmount(
														event.target.value.replace(/[^0-9.]/g, "")
													)
												}
												inputMode="decimal"
												placeholder="0.00"
												className="flex-1 border-0 text-3xl font-semibold placeholder:text-muted-foreground/50 focus-visible:ring-0"
											/>
											<span className="text-lg font-medium text-muted-foreground">
												{depositAsset.symbol}
											</span>
										</div>
									</div>

									<div className="flex items-center justify-between text-sm">
										<span className="text-muted-foreground">
											Available:{" "}
											{(depositAsset.walletBalance ?? 0).toLocaleString()}{" "}
											{depositAsset.symbol}
										</span>
										<Button
											variant="ghost"
											size="sm"
											className="h-auto p-0 text-sm font-medium text-primary hover:text-primary/80"
											onClick={() =>
												setDepositAmount(
													(depositAsset.walletBalance ?? 0).toString()
												)
											}
										>
											Max
										</Button>
									</div>
								</div>
							</div>

							{/* Action Buttons */}
							<div className="flex gap-3">
								<Button
									variant="outline"
									className="flex-1 h-12 rounded-lg font-medium"
									onClick={() => setDepositAsset(null)}
								>
									Cancel
								</Button>
								<Button
									className="flex-1 h-12 font-medium"
									onClick={confirmDeposit}
									disabled={
										isDepositing ||
										(Number(depositAmount) || 0) <= 0 ||
										(depositAsset.walletBalance !== undefined &&
											(Number(depositAmount) || 0) >
												depositAsset.walletBalance) ||
										!depositAsset.vaultAddress
									}
								>
									{isDepositing ? "Depositing..." : "Deposit"}
								</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>

			<Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
				<DialogContent
					showCloseButton={false}
					className="w-[92vw] max-w-[360px] rounded-[26px] border border-border/80 bg-popover p-0 shadow-[0_24px_80px_rgba(0,0,0,0.44)] sm:w-[360px] sm:max-w-[360px]"
				>
					<div className="p-4">
						<DialogHeader>
							<div className="flex items-center justify-between">
								<DialogTitle className="text-[18px] font-semibold tracking-tight text-foreground">
									{receiveVaultAsset
										? `Fund ${receiveVaultAsset.symbol} vault`
										: "Fund your account"}
								</DialogTitle>
								<DialogClose className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground">
									<X className="size-5" />
								</DialogClose>
							</div>
							<DialogDescription className="sr-only">
								Scan this QR code or copy the vault address to receive assets.
							</DialogDescription>
						</DialogHeader>

						<div className="mt-3 rounded-[22px] border border-border/70 bg-card/90 p-3">
							<div className="overflow-hidden rounded-[20px] border border-border/60 bg-[#1f1e1e] p-3">
								<div className="mx-auto flex w-full justify-center">
									<VaultQrCode />
								</div>
							</div>

							<div className="mt-4 border-t border-border/60 px-2 pt-4 text-center">
								<div className="break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
									{receiveVaultAsset?.vaultAddress ??
										"No vault address configured for this network"}
								</div>
							</div>

							<div className="mt-4 flex flex-col items-center">
								<button
									type="button"
									onClick={() => setChainsOpen(true)}
									className="flex flex-col items-center gap-2 text-center transition-opacity hover:opacity-90"
								>
									<ArbitrumIcon />
									<div className="text-[15px] font-medium text-muted-foreground">
										Supported Chains
									</div>
								</button>
							</div>

							<Button
								className="mt-5 h-11 w-full rounded-full text-sm font-semibold"
								onClick={copyVaultAddress}
								disabled={!receiveVaultAsset?.vaultAddress}
							>
								Copy Address
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={chainsOpen} onOpenChange={setChainsOpen}>
				<DialogContent
					showCloseButton={false}
					className="w-[92vw] max-w-[500px] rounded-[30px] border border-border/80 bg-popover p-0 shadow-[0_24px_80px_rgba(0,0,0,0.44)] sm:w-[500px] sm:max-w-[500px]"
				>
					<div className="p-6">
						<div className="flex items-center justify-between">
							<DialogTitle className="text-[22px] font-semibold tracking-tight text-foreground">
								Supported Chains
							</DialogTitle>
							<DialogClose className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground">
								<X className="size-5" />
							</DialogClose>
						</div>

						<div className="mt-5 rounded-[22px] border border-border/60 bg-card px-5 py-4 text-base leading-relaxed text-muted-foreground">
							Receive into this vault only from supported networks.
						</div>

						<div className="mt-5 rounded-[22px] border border-border/60 bg-card px-5 py-4">
							<div className="space-y-4">
								{APP_SUPPORTED_CHAINS.map((chain) => (
									<div
										key={chain.id}
										className="flex items-center justify-between gap-3"
									>
										<div className="flex items-center gap-3">
											<SupportedChainIcon kind={chain.icon} />
											<div>
												<div className="text-[16px] font-semibold text-foreground">
													{chain.name}
												</div>
												<div className="text-[12px] text-muted-foreground">
													{chain.badge}
												</div>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>

						<Button
							className="mt-6 h-12 w-full rounded-full text-sm font-semibold"
							onClick={() => setChainsOpen(false)}
						>
							Got it
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function MetricTooltip({
	children,
	text,
}: {
	children: React.ReactNode;
	text: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					className="inline-flex items-center text-muted-foreground transition-colors hover:text-foreground"
					aria-label={text}
				>
					{children}
				</button>
			</TooltipTrigger>
			<TooltipContent sideOffset={8} className="max-w-[220px]">
				{text}
			</TooltipContent>
		</Tooltip>
	);
}

function DashboardPageSkeleton() {
	return (
		<div className="px-0 pb-12">
			<div className="px-5 pt-8 md:px-8">
				<div className="flex flex-col gap-8">
					<div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
						<div className="flex flex-col gap-5">
							<div>
								<Skeleton className="h-10 w-64 rounded-xl" />
							</div>

							<div>
								<Skeleton className="h-16 w-56 rounded-xl" />
								<div className="mt-3 flex items-center gap-2">
									<Skeleton className="h-5 w-32 rounded-full" />
									<Skeleton className="h-4 w-4 rounded-full" />
								</div>
							</div>

							<div className="border-t border-border pt-4">
								<div className="flex items-center justify-between py-2.5">
									<div className="flex items-center gap-2">
										<Skeleton className="h-5 w-24 rounded-full" />
										<Skeleton className="h-4 w-4 rounded-full" />
									</div>
									<Skeleton className="h-6 w-10 rounded-full" />
								</div>
								<div className="flex items-center justify-between py-2.5">
									<div className="flex items-center gap-2">
										<Skeleton className="h-5 w-24 rounded-full" />
										<Skeleton className="h-4 w-4 rounded-full" />
									</div>
									<Skeleton className="h-6 w-10 rounded-full" />
								</div>
							</div>
						</div>

						<div className="flex flex-col gap-4">
							<div className="flex flex-wrap items-center justify-end gap-3">
								<Skeleton className="h-12 w-32 rounded-full" />
								<Skeleton className="h-12 w-32 rounded-full" />
							</div>

							<Card className="rounded-[24px] border-border bg-card/95 p-0">
								<CardContent className="p-0">
									<div className="flex flex-col gap-3 px-4 py-4 md:px-5">
										<div>
											<Skeleton className="h-6 w-40 rounded-full" />
											<Skeleton className="mt-2 h-4 w-72 rounded-full" />
										</div>
										<div className="flex items-center justify-end gap-2">
											{Array.from({ length: 6 }).map((_, index) => (
												<Skeleton
													key={index}
													className="h-8 w-10 rounded-full"
												/>
											))}
										</div>
									</div>
									<div className="px-3 pb-3 md:px-4 md:pb-4">
										<div className="rounded-[20px] border border-border/70 px-4 py-5">
											<div className="flex h-[240px] flex-col justify-between">
												{Array.from({ length: 4 }).map((_, index) => (
													<Skeleton
														key={index}
														className="h-px w-full rounded-full"
													/>
												))}
											</div>
										</div>
										<div className="flex flex-wrap items-center gap-4 border-t border-border/70 px-3 pt-4 text-sm md:px-4">
											{Array.from({ length: 4 }).map((_, index) => (
												<div key={index} className="flex items-center gap-2">
													<Skeleton className="size-2.5 rounded-full" />
													<Skeleton className="h-4 w-12 rounded-full" />
												</div>
											))}
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>

					<Card className="rounded-[28px] border-border bg-card/90 py-0 shadow-[0_20px_80px_rgba(0,0,0,0.32)]">
						<CardHeader className="gap-5 border-b border-border px-5 py-5 md:px-8">
							<div>
								<Skeleton className="h-8 w-44 rounded-full" />
								<Skeleton className="mt-2 h-4 w-80 rounded-full" />
							</div>
							<div className="flex flex-wrap items-center gap-3">
								<Skeleton className="h-11 w-[220px] rounded-full" />
							</div>
						</CardHeader>

						<div className="px-6 py-4">
							<div
								className="border-b border-border/30 bg-muted/15 px-0 py-3"
								style={{
									display: "grid",
									gridTemplateColumns:
										"240px minmax(92px,1fr) minmax(92px,1fr) minmax(72px,1fr) minmax(116px,1fr) minmax(120px,1fr) 74px",
									columnGap: "10px",
								}}
							>
								{Array.from({ length: 7 }).map((_, index) => (
									<Skeleton key={index} className="h-4 w-16 rounded-full" />
								))}
							</div>
							<div className="divide-y divide-border/20">
								{Array.from({ length: 8 }).map((_, rowIndex) => (
									<div
										key={rowIndex}
										className="px-0 py-4"
										style={{
											display: "grid",
											gridTemplateColumns:
												"240px minmax(92px,1fr) minmax(92px,1fr) minmax(72px,1fr) minmax(116px,1fr) minmax(120px,1fr) 74px",
											columnGap: "10px",
										}}
									>
										<div className="flex items-center gap-3">
											<Skeleton className="size-11 rounded-full" />
											<div className="min-w-0">
												<Skeleton className="h-5 w-28 rounded-full" />
												<Skeleton className="mt-2 h-4 w-16 rounded-full" />
											</div>
										</div>
										<Skeleton className="h-5 w-20 self-center rounded-full" />
										<Skeleton className="h-5 w-16 self-center rounded-full" />
										<Skeleton className="h-5 w-20 self-center rounded-full" />
										<Skeleton className="h-5 w-24 self-center rounded-full" />
										<Skeleton className="h-5 w-28 self-center rounded-full" />
										<div className="flex justify-end">
											<Skeleton className="size-9 rounded-full" />
										</div>
									</div>
								))}
							</div>
						</div>
					</Card>
				</div>
			</div>
		</div>
	);
}

function VaultQrCode() {
	const matrix = [
		"111111101000001111111",
		"100000101101001000001",
		"101110101111101011101",
		"101110100010101011101",
		"101110101110101011101",
		"100000101000101000001",
		"111111101010101111111",
		"000000000111100000000",
		"110011100001011001011",
		"001101011100100111000",
		"111010110010111000111",
		"000111001101000111000",
		"101001111000111010110",
		"000000001010000000000",
		"111111100011001010101",
		"100000101110011100010",
		"101110101001010111011",
		"101110100110110010001",
		"101110101011001110101",
		"100000100001111000111",
		"111111101101010110001",
	];

	return (
		<svg viewBox="0 0 208 208" className="size-full w-full max-w-[208px]">
			<rect width="208" height="208" rx="18" fill="white" />
			{matrix.flatMap((row, y) =>
				row
					.split("")
					.map((cell, x) =>
						cell === "1" ? (
							<rect
								key={`${x}-${y}`}
								x={16 + x * 8}
								y={16 + y * 8}
								width="6"
								height="6"
								rx="2"
								fill="#111111"
							/>
						) : null
					)
			)}
			<rect x="70" y="70" width="68" height="68" rx="16" fill="#111111" />
			<rect x="83" y="83" width="42" height="42" rx="10" fill="white" />
			<path
				d="M94 106 L103 97 L112 106 L123 95"
				fill="none"
				stroke="#111111"
				strokeWidth="7"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function ArbitrumIcon() {
	return (
		<div className="flex size-10 items-center justify-center rounded-full border border-border/60 bg-background">
			<svg viewBox="0 0 32 32" className="size-5">
				<circle cx="16" cy="16" r="16" fill="#1F2937" />
				<path d="M16 5l8 4.6v12.8L16 27l-8-4.6V9.6L16 5z" fill="#213147" />
				<path d="M19.9 10.7l-1.6 4.1 2.7 6.9 2.1-1.2-3.2-9.8z" fill="#12AAFF" />
				<path
					d="M15.6 8.8l-5.1 12.8 2.1 1.2 5.1-12.8-2.1-1.2z"
					fill="#FFFFFF"
				/>
				<path d="M13.7 17.6h4.8l.8 2.2h-4.8l-.8-2.2z" fill="#9DCCED" />
			</svg>
		</div>
	);
}

function RobinhoodChainIcon() {
	return (
		<div className="flex size-10 items-center justify-center rounded-full border border-border/60 bg-background">
			<div className="flex size-5 items-center justify-center rounded-full bg-[#C8FF5A] text-[10px] font-bold text-black">
				RH
			</div>
		</div>
	);
}

function SupportedChainIcon({ kind }: { kind: "arbitrum" | "robinhood" }) {
	if (kind === "robinhood") {
		return <RobinhoodChainIcon />;
	}

	return <ArbitrumIcon />;
}

function LegendChip({ color, label }: { color: string; label: string }) {
	return (
		<div className="flex items-center gap-2 text-muted-foreground">
			<span
				className="size-2.5 rounded-full"
				style={{ backgroundColor: color }}
			/>
			<span>{label}</span>
		</div>
	);
}

function DepositRow({
	label,
	right,
}: {
	label: string;
	right: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-4 border-b border-border py-5 last:border-b-0">
			<div className="flex items-center gap-2.5 text-[15px] text-muted-foreground">
				<span>{label}</span>
				<Info className="size-3.5" />
			</div>
			<div className="shrink-0">{right}</div>
		</div>
	);
}

function CompactDepositRow({
	label,
	right,
}: {
	label: string;
	right: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-b-0">
			<div className="text-sm text-muted-foreground">{label}</div>
			<div className="shrink-0">{right}</div>
		</div>
	);
}

function SearchPill({
	search,
	setSearch,
}: {
	search: string;
	setSearch: (value: string) => void;
}) {
	return (
		<div className="relative">
			<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
			<Input
				value={search}
				onChange={(event) => setSearch(event.target.value)}
				placeholder="Filter assets"
				className="h-11 w-[220px] rounded-full border-border bg-background/60 pl-11 text-sm shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
			/>
		</div>
	);
}

function FilterButton({ label }: { label: string }) {
	return (
		<Button
			variant="secondary"
			size="lg"
			className="rounded-full px-4 text-sm font-medium"
		>
			{label}
			<ChevronDown data-icon="inline-end" className="text-muted-foreground" />
		</Button>
	);
}

function DepositModalRow({
	label,
	info,
	last,
	right,
}: {
	label: string;
	info?: boolean;
	last?: boolean;
	right: React.ReactNode;
}) {
	return (
		<div
			className={`flex items-center justify-between gap-4 py-3 ${
				!last ? "border-b border-white/10" : ""
			}`}
		>
			<div className="flex items-center gap-2.5 text-[13px] text-white/58">
				<span>{label}</span>
				{info && <Info className="size-3" />}
			</div>
			<div className="shrink-0">{right}</div>
		</div>
	);
}
