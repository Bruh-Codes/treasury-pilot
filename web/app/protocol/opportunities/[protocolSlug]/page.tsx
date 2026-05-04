"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAppKitAccount } from "@reown/appkit/react";
import { useChainId, usePublicClient, useWalletClient } from "wagmi";
import { erc20Abi, parseUnits, type Address } from "viem";
import {
	ArrowLeft,
	ArrowUpRight,
	BadgeInfo,
	Info,
	Loader2,
	Wallet,
	X,
} from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Card } from "@/components/page-primitives";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepositDialog } from "@/components/dashboard/deposit-dialog";
import { ProtocolWithdrawDialog } from "@/components/dashboard/protocol-withdraw-dialog";
import { getKnownAssetIcon } from "@/lib/asset-icon-map";
import { getChainById } from "@/lib/chain-utils";
import { yieldPilotVaultAbi } from "@/lib/vault-abi";
import { aavePoolAbi, AAVE_POOL_ADDRESSES } from "@/lib/aave-pool-abi";
import { getSupportedVaultAsset } from "@/lib/vault-registry";
import { getStrategyInfo } from "@/lib/subgraph/strategy-mapping";
import {
	useMultichainBalances,
	useOpportunities,
	useMultichainVaultPositions,
	useYieldpilotQueryClient,
} from "@/lib/use-yieldpilot-market-data";
import { useStrategyAllocations } from "@/lib/subgraph/hooks";
import type {
	Opportunity,
	StrategyLiquidity,
	StrategyRisk,
} from "@/lib/yieldpilot-types";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/lib/yieldpilot-data";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

type RangeKey = "1W" | "1M" | "1Y" | "All";

type ProtocolDepositAsset = {
	id: string;
	name: string;
	symbol: string;
	chainId: number;
	chainLabel: string;
	iconUrl?: string;
	walletBalance: number;
	supported: boolean;
	iconClass: string;
	tokenAddress?: Address;
	tokenDecimals?: number;
	vaultAddress?: Address;
	vaultLabel?: string;
	marketApy?: string;
};

const ERC20_ABI = [
	{
		name: "balanceOf",
		type: "function",
		stateMutability: "view",
		inputs: [{ name: "account", type: "address" }],
		outputs: [{ name: "", type: "uint256" }],
	},
] as const;

const RANGE_OPTIONS: RangeKey[] = ["1W", "1M", "1Y", "All"];
const DEPOSIT_COLORS = ["#8b7eff", "#d38cf5", "#5ec6ff"] as const;
const WITHDRAW_COLORS = ["#76c8ff", "#8b7eff", "#4ecdc4"] as const;
const AAVE_USDC_SEPOLIA_STRATEGY = process.env
	.NEXT_PUBLIC_AAVE_USDC_SEPOLIA_STRATEGY_ADDRESS as Address | undefined;
const HACKATHON_STRATEGY_ROUTES: Record<string, Address> =
	AAVE_USDC_SEPOLIA_STRATEGY
		? {
				"421614:aave:usdc": AAVE_USDC_SEPOLIA_STRATEGY,
				"421614:aave-v3:usdc": AAVE_USDC_SEPOLIA_STRATEGY,
				"421614:aave-v2:usdc": AAVE_USDC_SEPOLIA_STRATEGY,
			}
		: {};

const ASSET_ICON_CLASSES: Record<string, string> = {
	USDC: "from-sky-400 to-blue-600",
	USDT: "from-emerald-400 to-teal-600",
	ETH: "from-slate-500 to-slate-700",
	WETH: "from-slate-500 to-slate-700",
	WBTC: "from-orange-400 to-amber-500",
	LINK: "from-blue-500 to-blue-700",
	AAVE: "from-violet-400 to-purple-600",
};

function getTrustWalletIconUrl(
	tokenAddress?: Address,
	symbol?: string,
	currentChainId?: number,
): string | undefined {
	if (!tokenAddress) {
		if (symbol === "ETH") {
			return "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png";
		}

		return undefined;
	}

	const chain = getChainById(currentChainId || 1);
	let blockchain = "ethereum";

	if (chain?.name.toLowerCase().includes("arbitrum")) {
		blockchain = "arbitrum";
	} else if (chain?.name.toLowerCase().includes("robinhood")) {
		blockchain = "ethereum";
	}

	return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${blockchain}/assets/${tokenAddress}/logo.png`;
}

function getAssetIconClass(symbol?: string) {
	return (
		ASSET_ICON_CLASSES[symbol?.trim().toUpperCase() ?? ""] ??
		"from-neutral-500 to-neutral-700"
	);
}

function getAssetIconUrl(
	symbol?: string,
	tokenAddress?: Address,
	chainId?: number,
) {
	return (
		getKnownAssetIcon(symbol) ??
		getTrustWalletIconUrl(tokenAddress, symbol, chainId)
	);
}

function getHackathonStrategyAddress(
	chainId: number,
	protocolSlug: string,
	assetSymbol: string,
): Address | undefined {
	const key = `${chainId}:${protocolSlug.toLowerCase()}:${assetSymbol.toLowerCase()}`;
	return HACKATHON_STRATEGY_ROUTES[key];
}

function OpportunityDetailPage() {
	const router = useRouter();
	const params = useParams<{ protocolSlug: string | string[] }>();
	const searchParams = useSearchParams();
	const { address } = useAppKitAccount();
	const chainId = useChainId();
	const publicClient = usePublicClient();
	const { data: walletClient } = useWalletClient();
	const queryClient = useYieldpilotQueryClient();
	const [selectedRange, setSelectedRange] = useState<RangeKey>("1W");
	const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
	const [depositPage, setDepositPage] = useState(1);
	const [withdrawPage, setWithdrawPage] = useState(1);
	const [depositOpen, setDepositOpen] = useState(false);
	const [isDepositing, setIsDepositing] = useState(false);
	const [depositAmount, setDepositAmount] = useState("0");
	const [withdrawOpen, setWithdrawOpen] = useState(false);
	const [isWithdrawing, setIsWithdrawing] = useState(false);
	const [withdrawAmount, setWithdrawAmount] = useState("0");
	const [protocolATokenBalance, setProtocolATokenBalance] = useState(0);
	const [depositBalanceSource, setDepositBalanceSource] = useState<
		"vault" | "wallet"
	>("vault");
	const [depositAsset, setDepositAsset] = useState<ProtocolDepositAsset | null>(
		null,
	);
	const [noBalanceAsset, setNoBalanceAsset] =
		useState<ProtocolDepositAsset | null>(null);
	const [noAdapterAsset, setNoAdapterAsset] =
		useState<ProtocolDepositAsset | null>(null);
	const itemsPerPage = 10;

	const protocolSlugParam = params.protocolSlug;
	const protocolSlug = decodeURIComponent(
		Array.isArray(protocolSlugParam) ? protocolSlugParam[0] : protocolSlugParam,
	);
	const asset = searchParams.get("asset") ?? undefined;

	const currentPage = activeTab === "deposit" ? depositPage : withdrawPage;
	const { data: allocations } = useStrategyAllocations();
	const opportunitiesQuery = useOpportunities(
		asset,
		protocolSlug,
		currentPage,
		itemsPerPage,
		selectedRange,
	);

	const isFetchingNewRange =
		opportunitiesQuery.isFetching && opportunitiesQuery.isPlaceholderData;

	const opportunities = opportunitiesQuery.data?.opportunities ?? [];
	const summary = opportunitiesQuery.data?.summary ?? {
		totalTvlUsd: 0,
		averageApy: 0,
		withdrawableTvlUsd: 0,
		instantLiquidityUsd: 0,
		instantVenueCount: 0,
		adapterReadyCount: 0,
		withdrawEnabledCount: 0,
		primaryLiquidityLabel: "Flexible",
		primaryRisk: "Medium",
	};
	const topOpportunities = opportunitiesQuery.data?.topOpportunities ?? [];
	const totalItems = opportunitiesQuery.data?.total ?? 0;
	const totalPages = Math.ceil(totalItems / itemsPerPage);

	const primary = topOpportunities[0] ?? opportunities[0] ?? null;
	const vaultConfig = getSupportedVaultAsset(
		chainId,
		asset ?? primary?.assetSymbol ?? "",
	);
	const trackedDepositAssets = useMemo(
		() =>
			vaultConfig
				? [
						{
							key: `${chainId}:${vaultConfig.tokenAddress.toLowerCase()}`,
							chainId,
							symbol: vaultConfig.symbol,
							name: vaultConfig.name,
							decimals: vaultConfig.tokenDecimals,
							tokenAddress: vaultConfig.tokenAddress,
						},
					]
				: [],
		[chainId, vaultConfig],
	);
	const multichainBalances = useMultichainBalances(
		address as Address | undefined,
		trackedDepositAssets,
	);
	const trackedVaultPositions = useMemo(
		() =>
			vaultConfig
				? [
						{
							key: `${chainId}:${vaultConfig.vaultAddress.toLowerCase()}`,
							chainId,
							symbol: vaultConfig.symbol,
							vaultAddress: vaultConfig.vaultAddress,
							tokenDecimals: vaultConfig.tokenDecimals,
						},
					]
				: [],
		[chainId, vaultConfig],
	);
	const multichainVaultPositions = useMultichainVaultPositions(
		address as Address | undefined,
		trackedVaultPositions,
	);
	const protocolDepositAsset = useMemo(() => {
		if (!primary || !vaultConfig) return null;
		const walletBalance =
			multichainBalances.data?.balances?.[
				`${chainId}:${vaultConfig.tokenAddress.toLowerCase()}`
			]?.balance ?? 0;

		return {
			id: `${chainId}:${vaultConfig.tokenAddress.toLowerCase()}`,
			name: vaultConfig.name,
			symbol: vaultConfig.symbol,
			chainId,
			chainLabel: getChainById(chainId)?.name ?? `Chain ${chainId}`,
			iconUrl: getAssetIconUrl(
				vaultConfig.symbol,
				vaultConfig.tokenAddress,
				chainId,
			),
			walletBalance,
			supported: true,
			iconClass: getAssetIconClass(vaultConfig.symbol),
			tokenAddress: vaultConfig.tokenAddress,
			tokenDecimals: vaultConfig.tokenDecimals,
			vaultAddress: vaultConfig.vaultAddress,
			vaultLabel: vaultConfig.vaultLabel,
			marketApy: `${summary.averageApy.toFixed(2)}% avg`,
		} satisfies ProtocolDepositAsset;
	}, [
		chainId,
		multichainBalances.data?.balances,
		primary,
		summary.averageApy,
		vaultConfig,
	]);
	const protocolVaultBalance = useMemo(() => {
		if (!vaultConfig) return 0;
		return (
			multichainVaultPositions.data?.positions?.[
				`${chainId}:${vaultConfig.vaultAddress.toLowerCase()}`
			]?.assets ?? 0
		);
	}, [chainId, multichainVaultPositions.data?.positions, vaultConfig]);

	const handleTabChange = (value: string) => {
		setActiveTab(value as "deposit" | "withdraw");
	};

	function openDeposit(
		assetItem: ProtocolDepositAsset,
		source: "vault" | "wallet" = depositBalanceSource,
	) {
		setDepositBalanceSource(source);
		setDepositAsset(assetItem);
		setDepositOpen(true);
		setDepositAmount(
			source === "vault"
				? protocolVaultBalance.toString()
				: assetItem.walletBalance.toString(),
		);
	}

	function openProtocolWithdraw() {
		if (!protocolDepositAsset) return;
		setWithdrawOpen(true);
		setWithdrawAmount(protocolATokenBalance.toString());
	}

	function handleProtocolDeposit() {
		if (!primary?.adapterAvailable) {
			if (protocolDepositAsset) {
				setNoAdapterAsset({
					...protocolDepositAsset,
					iconUrl: primary.logo ?? protocolDepositAsset.iconUrl,
				});
			} else if (primary) {
				setNoAdapterAsset({
					id: `${chainId}:${primary.assetSymbol}`,
					name: primary.assetDisplayName,
					symbol: primary.assetSymbol,
					chainId,
					chainLabel: getChainById(chainId)?.name ?? `Chain ${chainId}`,
					iconUrl:
						primary.logo ??
						getAssetIconUrl(
							primary.assetSymbol,
							vaultConfig?.tokenAddress,
							chainId,
						),
					walletBalance: 0,
					supported: false,
					iconClass: getAssetIconClass(primary.assetSymbol),
				});
			}
			return;
		}

		if (
			!protocolDepositAsset ||
			(protocolDepositAsset.walletBalance <= 0 && protocolVaultBalance <= 0)
		) {
			if (protocolDepositAsset) {
				setNoBalanceAsset(protocolDepositAsset);
			} else if (primary) {
				setNoBalanceAsset({
					id: `${chainId}:${primary.assetSymbol}`,
					name: primary.assetDisplayName,
					symbol: primary.assetSymbol,
					chainId,
					chainLabel: getChainById(chainId)?.name ?? `Chain ${chainId}`,
					iconUrl: getAssetIconUrl(
						primary.assetSymbol,
						vaultConfig?.tokenAddress,
						chainId,
					),
					walletBalance: 0,
					supported: false,
					iconClass: getAssetIconClass(primary.assetSymbol),
				});
			}
			return;
		}

		openDeposit(
			protocolDepositAsset,
			protocolVaultBalance > 0 ? "vault" : "wallet",
		);
	}

	async function confirmDeposit() {
		if (!depositAsset) return;
		const amount = Number(depositAmount) || 0;
		if (amount <= 0) return;
		const selectedAvailableBalance =
			depositBalanceSource === "vault"
				? protocolVaultBalance
				: depositAsset.walletBalance;
		if (amount > selectedAvailableBalance) return;
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

		const strategyAddress = getHackathonStrategyAddress(
			chainId,
			protocolSlug,
			depositAsset.symbol,
		);

		if (!strategyAddress) {
			setNoAdapterAsset({
				...depositAsset,
				iconUrl: primary?.logo ?? depositAsset.iconUrl,
			});
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

			if (depositBalanceSource === "wallet") {
				const allowance = await publicClient.readContract({
					address: depositAsset.tokenAddress,
					abi: erc20Abi,
					functionName: "allowance",
					args: [address as Address, depositAsset.vaultAddress],
				});

				if (allowance < parsedAmount) {
					toast.message(
						`Approving ${depositAsset.symbol} for protocol routing...`,
					);
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

				toast.message(
					`Routing ${depositAmount} ${depositAsset.symbol} from wallet...`,
				);
				const routeHash = await walletClient.writeContract({
					address: depositAsset.vaultAddress,
					abi: yieldPilotVaultAbi,
					functionName: "depositAndDeployToStrategyFor",
					args: [
						address as Address,
						address as Address,
						strategyAddress,
						parsedAmount,
					],
					account: walletClient.account,
					chain: walletClient.chain,
					...feeOverrides,
				});
				await publicClient.waitForTransactionReceipt({ hash: routeHash });
			} else {
				toast.message(
					`Routing ${depositAmount} ${depositAsset.symbol} from vault balance...`,
				);
				const routeHash = await walletClient.writeContract({
					address: depositAsset.vaultAddress,
					abi: yieldPilotVaultAbi,
					functionName: "deployToStrategy",
					args: [strategyAddress, parsedAmount],
					account: walletClient.account,
					chain: walletClient.chain,
					...feeOverrides,
				});
				await publicClient.waitForTransactionReceipt({ hash: routeHash });
			}

			await queryClient.invalidateQueries({
				queryKey: ["yieldpilot", "multichain-balances"],
			});
			await queryClient.invalidateQueries({
				queryKey: ["yieldpilot", "multichain-vault-positions"],
			});

			setDepositAsset(null);
			setDepositOpen(false);
			toast.success("Protocol route submitted", {
				description: `${depositAmount} ${depositAsset.symbol} was routed to ${primary?.protocolName ?? "the selected protocol"}.`,
			});
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Route transaction failed";
			toast.error("Route failed", {
				description: message,
			});
		} finally {
			setIsDepositing(false);
		}
	}

	async function confirmProtocolWithdraw() {
		if (!address) {
			toast.error("Connect your wallet first");
			return;
		}

		if (!protocolDepositAsset) {
			toast.error("No asset selected");
			return;
		}

		if (!walletClient || !publicClient) {
			toast.error("Wallet client is not ready yet");
			return;
		}

		const amount = Number(withdrawAmount) || 0;
		if (amount <= 0) return;

		// Get Aave Pool address
		const aavePoolAddress = AAVE_POOL_ADDRESSES[chainId];
		if (!aavePoolAddress) {
			toast.error("Aave Pool not configured for this chain");
			return;
		}

		if (
			!protocolDepositAsset.tokenAddress ||
			!protocolDepositAsset.tokenDecimals
		) {
			toast.error("Asset configuration incomplete");
			return;
		}

		try {
			setIsWithdrawing(true);

			const parsedAmount = parseUnits(
				withdrawAmount,
				protocolDepositAsset.tokenDecimals,
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

			toast.message(
				`Withdrawing ${withdrawAmount} ${protocolDepositAsset.symbol} from Aave...`,
			);

			const withdrawHash = await walletClient.writeContract({
				address: aavePoolAddress,
				abi: aavePoolAbi,
				functionName: "withdraw",
				args: [
					protocolDepositAsset.tokenAddress,
					parsedAmount,
					address as Address,
				],
				account: walletClient.account,
				chain: walletClient.chain,
				...feeOverrides,
			});

			await publicClient.waitForTransactionReceipt({ hash: withdrawHash });

			await queryClient.invalidateQueries({
				queryKey: ["yieldpilot", "multichain-balances"],
			});

			setWithdrawOpen(false);
			setWithdrawAmount("0");
			toast.success("Withdrawal successful", {
				description: `${withdrawAmount} ${protocolDepositAsset.symbol} was withdrawn from Aave.`,
			});
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Withdrawal transaction failed";
			toast.error("Withdrawal failed", {
				description: message,
			});
		} finally {
			setIsWithdrawing(false);
		}
	}

	// Fetch aToken balance for protocol withdrawals
	// Disabled for now as user deposits are vault-routed, not direct protocol deposits
	useEffect(() => {
		setProtocolATokenBalance(0);
	}, [address, publicClient, protocolDepositAsset, chainId]);

	// Auto-open withdraw dialog if coming from End position action
	useEffect(() => {
		const action = searchParams.get("action");
		if (action === "withdraw" && protocolDepositAsset) {
			setWithdrawOpen(true);
			setWithdrawAmount(protocolATokenBalance.toString());
			// Clear params to prevent re-opening on refresh
			window.history.replaceState({}, "", window.location.pathname);
		}
	}, [searchParams, protocolDepositAsset, protocolATokenBalance]);

	// Filter opportunities for charts consistency
	const topDepositOpportunities = useMemo(
		() => topOpportunities.filter((opp) => opp.canDeposit),
		[topOpportunities],
	);
	const topWithdrawOpportunities = useMemo(
		() => topOpportunities.filter((opp) => opp.canWithdraw),
		[topOpportunities],
	);

	// Filter opportunities for tables
	const depositOpportunities = useMemo(
		() => opportunities.filter((opp) => opp.canDeposit),
		[opportunities],
	);
	const withdrawOpportunities = useMemo(
		() => opportunities.filter((opp) => opp.canWithdraw),
		[opportunities],
	);

	const depositChartSeries = useMemo(
		() =>
			buildSeries(
				topDepositOpportunities,
				DEPOSIT_COLORS,
				"apy",
				selectedRange,
			),
		[topDepositOpportunities, selectedRange],
	);
	const withdrawChartSeries = useMemo(
		() =>
			buildSeries(
				topWithdrawOpportunities,
				WITHDRAW_COLORS,
				"liquidity",
				selectedRange,
			),
		[topWithdrawOpportunities, selectedRange],
	);
	const depositChartConfig = useMemo(
		() => buildChartConfig(depositChartSeries),
		[depositChartSeries],
	);
	const withdrawChartConfig = useMemo(
		() => buildChartConfig(withdrawChartSeries),
		[withdrawChartSeries],
	);
	const depositChartData = useMemo(
		() => buildChartData(depositChartSeries, selectedRange),
		[depositChartSeries, selectedRange],
	);
	const withdrawChartData = useMemo(
		() => buildChartData(withdrawChartSeries, selectedRange),
		[withdrawChartSeries, selectedRange],
	);
	const notice = buildNotice(opportunities, primary?.adapterAvailable ?? false);

	if (opportunitiesQuery.isPending && opportunitiesQuery.data === undefined) {
		return <OpportunityDetailSkeleton />;
	}

	if (opportunitiesQuery.isError) {
		return (
			<div className="px-6 py-8 md:px-7 md:py-9">
				<Card className="p-6">
					<div className="max-w-lg">
						<div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
							Opportunity
						</div>
						<h1 className="mt-3 font-display text-[36px] font-semibold tracking-tight">
							We couldn&apos;t load this market
						</h1>
						<p className="mt-3 text-sm text-muted-foreground">
							The live registry request failed, so this detail page could not be
							built from current protocol data.
						</p>
						<div className="mt-5 flex gap-3">
							<Button onClick={() => opportunitiesQuery.refetch()}>
								Retry
							</Button>
							<Button
								variant="outline"
								onClick={() => router.push("/dashboard")}
							>
								Back to dashboard
							</Button>
						</div>
					</div>
				</Card>
			</div>
		);
	}

	if (!primary) {
		return (
			<div className="px-6 py-8 md:px-7 md:py-9">
				<Card className="p-6">
					<div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
						Opportunity
					</div>
					<h1 className="mt-3 font-display text-[36px] font-semibold tracking-tight">
						No live markets found
					</h1>
					<p className="mt-3 max-w-xl text-sm text-muted-foreground">
						There isn&apos;t a live {asset ?? "asset"} market for {protocolSlug}{" "}
						in the current registry response.
					</p>
					<div className="mt-5">
						<Button variant="outline" onClick={() => router.push("/dashboard")}>
							Back to dashboard
						</Button>
					</div>
				</Card>
			</div>
		);
	}

	return (
		<div className="px-6 py-8 md:px-7 md:py-9">
			<div className="mx-auto max-w-[1240px]">
				<div className="mb-6 flex items-center justify-between gap-4">
					<button
						type="button"
						onClick={() => router.back()}
						className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
					>
						<ArrowLeft className="h-4 w-4" />
						<span>Back</span>
					</button>

					<div className="flex items-center gap-2">
						<Button onClick={handleProtocolDeposit}>
							<Wallet className="h-4 w-4" />
							Deposit
						</Button>
						{protocolDepositAsset && protocolATokenBalance > 0 && (
							<Button variant="outline" onClick={openProtocolWithdraw}>
								Withdraw
							</Button>
						)}
						{primary.url ? (
							<Button variant="outline" asChild>
								<a href={primary.url} target="_blank" rel="noreferrer">
									<ArrowUpRight className="h-4 w-4" />
									Visit protocol
								</a>
							</Button>
						) : null}
					</div>
				</div>

				<div className="mt-4 flex items-center gap-4">
					<img
						src={primary.logo ?? "/favicon.ico"}
						alt={`${primary.protocolName} logo`}
						className="size-16 rounded-full border border-border bg-card object-cover"
					/>
					<div className="min-w-0">
						<h1 className="font-display text-[36px] font-semibold tracking-tight sm:text-[48px]">
							{primary.assetDisplayName}{" "}
							<span className="text-muted-foreground">
								{primary.assetSymbol}
							</span>
						</h1>
						<p className="mt-1 text-[16px] text-muted-foreground">
							Asset on {primary.chain} in {primary.protocolName}
						</p>
					</div>
				</div>

				{notice ? (
					<div className="mt-5 flex items-start gap-3 rounded-[16px] border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm text-amber-100/90">
						<BadgeInfo className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
						<p>{notice}</p>
					</div>
				) : null}

				<Card className="mt-6 overflow-hidden p-0">
					<div className="grid divide-y divide-border md:grid-cols-4 md:divide-x md:divide-y-0">
						<MetricRail
							label="Total deposits"
							value={formatUsd(summary.totalTvlUsd)}
							tooltipText="Combined TVL across the live markets shown on this page."
						/>
						<MetricRail
							label="Available liquidity"
							value={formatUsd(summary.withdrawableTvlUsd)}
							tooltipText="Estimated liquidity currently marked withdrawable across the live market set."
						/>
						<MetricRail
							label="Deposit APY"
							value={`${summary.averageApy.toFixed(2)}%`}
							tooltipText="Average live deposit APY across the markets included in this opportunity view."
						/>
						<MetricRail
							label="Live markets"
							value={String(opportunities.length)}
							tooltipText="How many live markets from this protocol and asset pair are included in the current registry response."
						/>
					</div>
				</Card>

				<Tabs
					value={activeTab}
					onValueChange={handleTabChange}
					className="mt-12 flex-col"
				>
					<TabsList className="grid w-full max-w-[400px] grid-cols-2 bg-muted p-1 rounded-lg">
						<TabsTrigger
							value="deposit"
							className="data-[state=active]:bg-background data-[state=active]:text-foreground"
						>
							Deposit Markets
						</TabsTrigger>
						<TabsTrigger
							value="withdraw"
							className="data-[state=active]:bg-background data-[state=active]:text-foreground"
						>
							Withdrawal Markets
						</TabsTrigger>
					</TabsList>

					<TabsContent
						value="deposit"
						className="mt-10 space-y-10 focus-visible:outline-none"
					>
						<section>
							<div className="grid gap-10 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
								<div>
									<h2 className="font-display text-[28px] font-semibold tracking-tight">
										Deposit
									</h2>
									<p className="mt-2 text-sm text-muted-foreground">
										Deposit {primary.assetSymbol} to earn yield through live{" "}
										{primary.protocolName} markets.
									</p>

									<div className="mt-12">
										<div className="text-[46px] font-semibold tracking-tight">
											{summary.averageApy.toFixed(2)}%
										</div>
										<div className="mt-1 flex items-center gap-1.5 text-[15px] text-muted-foreground">
											Deposit APY
											<MetricTooltip text="Average live deposit APY across the markets displayed in this section.">
												<Info className="h-3.5 w-3.5" />
											</MetricTooltip>
										</div>
									</div>

									<div className="mt-10 space-y-6">
										<MetricLine
											label="Total deposits"
											secondary={formatCompactUsd(summary.totalTvlUsd)}
											value={formatTokenLike(
												summary.totalTvlUsd,
												primary.assetSymbol,
											)}
											tooltipText="Combined TVL across the displayed deposit markets."
										/>
										<MetricLine
											label="Available liquidity"
											secondary={formatCompactUsd(summary.withdrawableTvlUsd)}
											value={formatTokenLike(
												summary.withdrawableTvlUsd,
												primary.assetSymbol,
											)}
											tooltipText="Estimated amount currently marked withdrawable across these markets."
										/>
										<MetricLine
											label="Adapter-ready venues"
											secondary={`${opportunities.length} live`}
											value={`${summary.adapterReadyCount}`}
											tooltipText="Markets that currently have adapter support available for vault execution."
										/>
									</div>
								</div>

								<div className="rounded-[24px] border border-border bg-card/80 p-4 md:p-5">
									<div className="flex items-center justify-between gap-4">
										<div>
											<p className="text-sm font-medium text-muted-foreground">
												Live rate curve
											</p>
											<p className="mt-1 text-xs text-muted-foreground/75">
												Current venue rates visualized from the top 3 markets.
											</p>
										</div>
										<div className="flex items-center gap-1">
											{RANGE_OPTIONS.map((range) => (
												<button
													key={range}
													type="button"
													onClick={() => setSelectedRange(range)}
													className={cn(
														"rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
														selectedRange === range
															? "bg-foreground/10 text-foreground"
															: "text-muted-foreground hover:text-foreground",
													)}
												>
													{range}
												</button>
											))}
										</div>
									</div>

									<div className="mt-4">
										<div className="relative">
											{isFetchingNewRange && (
												<div className="absolute inset-0 z-50 flex items-center justify-center rounded-[22px] bg-background/80 backdrop-blur-sm">
													<div className="flex flex-col items-center gap-2">
														<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
														<span className="text-sm text-muted-foreground">
															Updating chart data...
														</span>
													</div>
												</div>
											)}
											<ChartContainer
												config={depositChartConfig}
												className="min-h-[300px] w-full"
											>
												<LineChart
													accessibilityLayer
													data={depositChartData}
													margin={{ left: 4, right: 10, top: 8, bottom: 8 }}
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
													<YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
													<ChartTooltip
														cursor={false}
														trigger="hover"
														isAnimationActive={false}
														wrapperStyle={{ zIndex: 40, pointerEvents: "none" }}
														content={
															<ChartTooltipContent
																indicator="dot"
																labelFormatter={(label) => (
																	<span className="text-foreground">
																		{label}
																	</span>
																)}
																formatter={(value, name) => (
																	<div className="flex w-full items-center justify-between gap-3">
																		<span className="text-muted-foreground">
																			{
																				depositChartConfig[
																					name as keyof typeof depositChartConfig
																				]?.label
																			}
																		</span>
																		<span className="font-medium text-foreground">
																			{Number(value).toFixed(2)}%
																		</span>
																	</div>
																)}
															/>
														}
													/>
													{depositChartSeries.map((series) => (
														<Line
															key={series.key}
															type="monotone"
															dataKey={series.key}
															stroke={series.color}
															strokeWidth={2.15}
															dot={false}
															activeDot={{ r: 4, fill: series.color }}
														/>
													))}
												</LineChart>
											</ChartContainer>
										</div>
										<div className="flex flex-wrap items-center gap-4 border-t border-border/70 px-1 pt-4 text-sm">
											{depositChartSeries.map((series) => (
												<LegendChip
													key={series.key}
													color={series.color}
													label={series.label}
												/>
											))}
										</div>
									</div>
								</div>
							</div>
						</section>

						<div className="overflow-x-auto rounded-[22px] border border-border bg-card/80 lg:overflow-x-hidden">
							<div className="min-w-[980px] lg:min-w-0 lg:w-full">
								<div className="grid grid-cols-[1.5fr_0.9fr_1fr_1fr_1fr_1fr] gap-4 border-b border-border px-6 py-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
									<span>Market</span>
									<span className="text-right">APY</span>
									<span className="text-right">Total deposits</span>
									<span className="text-right">Remaining capacity</span>
									<span className="text-right">Available liquidity</span>
									<span className="text-right">Withdrawals</span>
								</div>
								<div className="divide-y divide-border">
									{depositOpportunities.map((opportunity, index) => (
										<div
											key={opportunity.id}
											className="grid grid-cols-[1.5fr_0.9fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-5"
										>
											<div>
												<div className="text-[16px] font-semibold">
													{marketLabel(opportunity, index)}
												</div>
												<div className="mt-1 text-sm text-muted-foreground">
													{opportunity.category}
												</div>
											</div>
											<div className="text-right text-[16px] font-semibold">
												{opportunity.apy.toFixed(2)}%
											</div>
											<TableValue
												value={formatTokenLike(
													opportunity.tvlUsd,
													primary.assetSymbol,
												)}
												secondary={formatCompactUsd(opportunity.tvlUsd)}
											/>
											<TableValue
												value={formatTokenLike(
													opportunity.tvlUsd *
														remainingCapacityRatio(opportunity),
													primary.assetSymbol,
												)}
												secondary={formatCompactUsd(
													opportunity.tvlUsd *
														remainingCapacityRatio(opportunity),
												)}
											/>
											<TableValue
												value={formatTokenLike(
													opportunity.tvlUsd,
													primary.assetSymbol,
												)}
												secondary={formatCompactUsd(opportunity.tvlUsd)}
											/>
											<div className="text-right">
												<InlineBadge
													tone={liquidityTone(opportunity.liquidityLabel)}
												>
													{opportunity.liquidityLabel}
												</InlineBadge>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
						{totalPages > 1 && (
							<div className="mt-6 flex justify-center">
								<Pagination>
									<PaginationContent>
										<PaginationItem>
											<PaginationPrevious
												onClick={() =>
													setDepositPage((p) => Math.max(1, p - 1))
												}
												className={
													depositPage === 1
														? "pointer-events-none opacity-50"
														: "cursor-pointer"
												}
											/>
										</PaginationItem>
										{Array.from({ length: totalPages }).map((_, i) => (
											<PaginationItem key={i + 1}>
												<PaginationLink
													onClick={() => setDepositPage(i + 1)}
													isActive={depositPage === i + 1}
													className="cursor-pointer"
												>
													{i + 1}
												</PaginationLink>
											</PaginationItem>
										))}
										<PaginationItem>
											<PaginationNext
												onClick={() =>
													setDepositPage((p) => Math.min(totalPages, p + 1))
												}
												className={
													depositPage === totalPages
														? "pointer-events-none opacity-50"
														: "cursor-pointer"
												}
											/>
										</PaginationItem>
									</PaginationContent>
								</Pagination>
							</div>
						)}
					</TabsContent>

					<TabsContent
						value="withdraw"
						className="mt-10 space-y-10 focus-visible:outline-none"
					>
						<section>
							<div className="grid gap-10 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
								<div>
									<h2 className="font-display text-[28px] font-semibold tracking-tight">
										Withdraw
									</h2>
									<p className="mt-2 text-sm text-muted-foreground">
										Withdraw {primary.assetSymbol} through the currently liquid
										routes.
									</p>

									<div className="mt-12">
										<div className="text-[46px] font-semibold tracking-tight">
											{summary.primaryLiquidityLabel}
										</div>
										<div className="mt-1 flex items-center gap-1.5 text-[15px] text-muted-foreground">
											Withdrawal profile
											<MetricTooltip text="The most common withdrawal timing profile across the displayed markets.">
												<Info className="h-3.5 w-3.5" />
											</MetricTooltip>
										</div>
									</div>

									<div className="mt-10 space-y-6">
										<MetricLine
											label="Instant liquidity"
											secondary={formatCompactUsd(summary.instantLiquidityUsd)}
											value={formatTokenLike(
												summary.instantLiquidityUsd,
												primary.assetSymbol,
											)}
											tooltipText="Liquidity currently labeled instant across the displayed withdrawal markets."
										/>
										<MetricLine
											label="Instant venues"
											secondary={`${summary.withdrawEnabledCount} withdrawable`}
											value={String(summary.instantVenueCount)}
											tooltipText="Count of markets whose current liquidity profile is labeled instant."
										/>
										<MetricLine
											label="Risk profile"
											secondary={primary.category}
											value={summary.primaryRisk}
											tooltipText="Highest reported strategy risk across the displayed market set."
										/>
									</div>
								</div>

								<div className="rounded-[24px] border border-border bg-card/80 p-4 md:p-5">
									<div className="flex items-center justify-between gap-4">
										<div>
											<p className="text-sm font-medium text-muted-foreground">
												Liquidity curve
											</p>
											<p className="mt-1 text-xs text-muted-foreground/75">
												Live liquidity weighting across the same market set.
											</p>
										</div>
										<div className="flex items-center gap-1">
											{RANGE_OPTIONS.map((range) => (
												<button
													key={`${range}-withdraw`}
													type="button"
													onClick={() => {
														if (range !== selectedRange) {
															setSelectedRange(range);
														}
													}}
													className={cn(
														"rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
														selectedRange === range
															? "bg-foreground/10 text-foreground"
															: "text-muted-foreground hover:text-foreground",
													)}
												>
													{range}
												</button>
											))}
										</div>
									</div>

									<div className="mt-4">
										<div className="relative">
											{isFetchingNewRange && (
												<div className="absolute inset-0 z-50 flex items-center justify-center rounded-[22px] bg-background/80 backdrop-blur-sm">
													<div className="flex flex-col items-center gap-2">
														<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
														<span className="text-sm text-muted-foreground">
															Updating chart data...
														</span>
													</div>
												</div>
											)}
											<ChartContainer
												config={withdrawChartConfig}
												className="min-h-[300px] w-full"
											>
												<LineChart
													accessibilityLayer
													data={withdrawChartData}
													margin={{ left: 4, right: 10, top: 8, bottom: 8 }}
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
														domain={["dataMin - 100", "dataMax + 100"]}
													/>
													<ChartTooltip
														cursor={false}
														trigger="hover"
														isAnimationActive={false}
														wrapperStyle={{ zIndex: 40, pointerEvents: "none" }}
														content={
															<ChartTooltipContent
																indicator="dot"
																labelFormatter={(label) => (
																	<span className="text-foreground">
																		{label}
																	</span>
																)}
																formatter={(value, name) => (
																	<div className="flex w-full items-center justify-between gap-3">
																		<span className="text-muted-foreground">
																			{
																				withdrawChartConfig[
																					name as keyof typeof withdrawChartConfig
																				]?.label
																			}
																		</span>
																		<span className="font-medium text-foreground">
																			{formatUsd(Number(value))}
																		</span>
																	</div>
																)}
															/>
														}
													/>
													{withdrawChartSeries.map((series) => (
														<Line
															key={series.key}
															type="monotone"
															dataKey={series.key}
															stroke={series.color}
															strokeWidth={2.15}
															dot={false}
															activeDot={{ r: 4, fill: series.color }}
														/>
													))}
												</LineChart>
											</ChartContainer>
										</div>
										<div className="flex flex-wrap items-center gap-4 border-t border-border/70 px-1 pt-4 text-sm">
											{withdrawChartSeries.map((series) => (
												<LegendChip
													key={series.key}
													color={series.color}
													label={series.label}
												/>
											))}
										</div>
									</div>
								</div>
							</div>
						</section>

						<div className="overflow-x-auto rounded-[22px] border border-border bg-card/80 lg:overflow-x-hidden">
							<div className="min-w-[980px] lg:min-w-0 lg:w-full">
								<div className="grid grid-cols-[1.5fr_0.8fr_0.95fr_1fr_1fr_0.9fr] gap-4 border-b border-border px-6 py-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
									<span>Market</span>
									<span className="text-right">Risk</span>
									<span className="text-right">Withdrawals</span>
									<span className="text-right">Adapter</span>
									<span className="text-right">Liquidity</span>
									<span className="text-right">Status</span>
								</div>
								<div className="divide-y divide-border">
									{withdrawOpportunities.map((opportunity, index) => (
										<div
											key={`${opportunity.id}-withdraw`}
											className="grid grid-cols-[1.5fr_0.8fr_0.95fr_1fr_1fr_0.9fr] gap-4 px-6 py-5"
										>
											<div>
												<div className="text-[16px] font-semibold">
													{marketLabel(opportunity, index)}
												</div>
												<div className="mt-1 text-sm text-muted-foreground">
													{marketMeta(opportunity)}
												</div>
											</div>
											<div className="text-right">
												<InlineBadge tone={riskTone(opportunity.risk)}>
													{opportunity.risk}
												</InlineBadge>
											</div>
											<div className="text-right">
												<InlineBadge
													tone={liquidityTone(opportunity.liquidityLabel)}
												>
													{opportunity.liquidityLabel}
												</InlineBadge>
											</div>
											<div className="text-right text-[15px] font-semibold">
												{opportunity.adapterAvailable ? "Ready" : "Pending"}
											</div>
											<TableValue
												value={formatTokenLike(
													opportunity.tvlUsd,
													primary.assetSymbol,
												)}
												secondary={formatCompactUsd(opportunity.tvlUsd)}
											/>
											<div className="text-right text-sm text-muted-foreground">
												{opportunity.canWithdraw ? "Open" : "Limited"}
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
						{totalPages > 1 && (
							<div className="mt-6 flex justify-center">
								<Pagination>
									<PaginationContent>
										<PaginationItem>
											<PaginationPrevious
												onClick={() =>
													setWithdrawPage((p) => Math.max(1, p - 1))
												}
												className={
													withdrawPage === 1
														? "pointer-events-none opacity-50"
														: "cursor-pointer"
												}
											/>
										</PaginationItem>
										{Array.from({ length: totalPages }).map((_, i) => (
											<PaginationItem key={i + 1}>
												<PaginationLink
													onClick={() => setWithdrawPage(i + 1)}
													isActive={withdrawPage === i + 1}
													className="cursor-pointer"
												>
													{i + 1}
												</PaginationLink>
											</PaginationItem>
										))}
										<PaginationItem>
											<PaginationNext
												onClick={() =>
													setWithdrawPage((p) => Math.min(totalPages, p + 1))
												}
												className={
													withdrawPage === totalPages
														? "pointer-events-none opacity-50"
														: "cursor-pointer"
												}
											/>
										</PaginationItem>
									</PaginationContent>
								</Pagination>
							</div>
						)}
					</TabsContent>
				</Tabs>
			</div>

			<Dialog
				open={Boolean(noBalanceAsset)}
				onOpenChange={(open) => {
					if (!open) setNoBalanceAsset(null);
				}}
			>
				<DialogContent className="max-w-[540px] rounded-[28px] border border-border/80 bg-popover p-0 shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
					{noBalanceAsset ? (
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
					) : null}
				</DialogContent>
			</Dialog>

			<Dialog
				open={Boolean(noAdapterAsset)}
				onOpenChange={(open) => {
					if (!open) setNoAdapterAsset(null);
				}}
			>
				<DialogContent className="max-w-[540px] rounded-[28px] border border-border/80 bg-popover p-0 shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
					{noAdapterAsset ? (
						<div className="p-8">
							<DialogHeader>
								<Avatar className="mb-5 size-16 border border-border/40">
									<AvatarImage
										src={noAdapterAsset.iconUrl}
										alt={`${noAdapterAsset.name} icon`}
										className="size-full object-contain bg-background p-2"
									/>
									<AvatarFallback
										className={`bg-gradient-to-br text-2xl font-semibold text-white ${noAdapterAsset.iconClass}`}
									>
										{noAdapterAsset.symbol.slice(0, 1)}
									</AvatarFallback>
								</Avatar>
								<DialogTitle className="text-[40px] font-semibold tracking-tight text-foreground">
									No adapter configured
								</DialogTitle>
								<DialogDescription className="mt-2 text-lg leading-relaxed text-muted-foreground">
									This protocol route is not wired yet.
								</DialogDescription>
							</DialogHeader>

							<div className="mt-8">
								<Button
									className="h-14 w-full rounded-full text-base font-semibold"
									onClick={() => setNoAdapterAsset(null)}
								>
									Got it
								</Button>
							</div>
						</div>
					) : null}
				</DialogContent>
			</Dialog>

			<DepositDialog
				depositAsset={depositAsset}
				supportedDepositAssets={
					protocolDepositAsset ? [protocolDepositAsset] : []
				}
				balanceSource={depositBalanceSource}
				vaultBalance={protocolVaultBalance}
				onBalanceSourceChange={(source) => {
					setDepositBalanceSource(source);
					setDepositAmount(
						source === "vault"
							? protocolVaultBalance.toString()
							: (depositAsset?.walletBalance ?? 0).toLocaleString(undefined, {
									maximumFractionDigits: 6,
								}),
					);
				}}
				title={
					protocolDepositAsset
						? `Deposit to ${primary?.protocolName}`
						: "Deposit to Vault"
				}
				description={
					protocolDepositAsset
						? `Deposit ${protocolDepositAsset.symbol} to earn yield through ${primary?.protocolName}.`
						: undefined
				}
				mode={protocolDepositAsset ? "protocol" : "vault"}
				onDeposit={() => {
					if (protocolDepositAsset) {
						openDeposit(protocolDepositAsset, depositBalanceSource);
					}
					setDepositAsset(null);
					setDepositOpen(false);
					setDepositBalanceSource("vault");
				}}
				onClose={() => {
					setDepositAsset(null);
					setDepositOpen(false);
					setDepositBalanceSource("vault");
				}}
				isDepositing={isDepositing}
				depositAmount={depositAmount}
				setDepositAmount={setDepositAmount}
				confirmDeposit={confirmDeposit}
				open={depositOpen}
				onOpenChange={setDepositOpen}
				walletReady={Boolean(walletClient && publicClient)}
			/>
			<ProtocolWithdrawDialog
				asset={
					protocolDepositAsset
						? {
								...protocolDepositAsset,
								walletBalance: protocolATokenBalance,
							}
						: null
				}
				onWithdraw={() => {}}
				onClose={() => {
					setWithdrawOpen(false);
					setWithdrawAmount("0");
				}}
				isWithdrawing={isWithdrawing}
				withdrawAmount={withdrawAmount}
				setWithdrawAmount={setWithdrawAmount}
				confirmWithdraw={confirmProtocolWithdraw}
				open={withdrawOpen}
				onOpenChange={setWithdrawOpen}
				walletReady={Boolean(walletClient && publicClient)}
				title={`Withdraw from ${primary?.protocolName}`}
				description={`Withdraw ${protocolDepositAsset?.symbol} from ${primary?.protocolName}.`}
			/>
		</div>
	);
}

function buildSeries(
	opportunities: Opportunity[],
	colors: readonly string[],
	mode: "apy" | "liquidity",
	selectedRange: RangeKey,
) {
	return opportunities.map((opportunity, index) => {
		let points: number[] = [];
		let history = opportunity.history;

		if (history && history.length > 0) {
			if (history.length === 1) {
				// Duplicate the single point so the chart can draw a flat line
				const singlePoint = history[0];
				history = [
					{
						...singlePoint,
						timestamp: new Date(
							new Date(singlePoint.timestamp).getTime() - 86400000,
						).toISOString(),
					},
					singlePoint,
				];
			}
			points = history.map((p) => (mode === "apy" ? p.apy : p.tvlUsd));
		} else {
			// Fallback if no history
			const baseValue = mode === "apy" ? opportunity.apy : opportunity.tvlUsd;
			points = [baseValue, baseValue];
			history = [
				{
					timestamp: new Date(Date.now() - 86400000).toISOString(),
					apy: opportunity.apy,
					tvlUsd: opportunity.tvlUsd,
				},
				{
					timestamp: new Date().toISOString(),
					apy: opportunity.apy,
					tvlUsd: opportunity.tvlUsd,
				},
			];
		}

		return {
			key: `series${index + 1}`,
			label: marketLabel(opportunity, index),
			color: colors[index] ?? "#8b7eff",
			points,
			history,
		};
	});
}

function buildChartConfig(series: ReturnType<typeof buildSeries>) {
	return Object.fromEntries(
		series.map((entry) => [
			entry.key,
			{
				label: entry.label,
				color: entry.color,
			},
		]),
	) satisfies ChartConfig;
}

function buildChartData(
	series: ReturnType<typeof buildSeries>,
	range: RangeKey,
) {
	if (series.length === 0) return [];

	// Find the series with history to extract timestamps
	const masterSeries =
		series.find((s) => s.history && s.history.length > 0) ?? series[0];
	const dataCount = masterSeries?.points.length ?? 0;

	return Array.from({ length: dataCount }, (_, index) => {
		let label = "";
		const historyPoint = masterSeries?.history?.[index];

		if (historyPoint) {
			const date = new Date(historyPoint.timestamp);
			if (range === "1W" || range === "1M") {
				label = date.toLocaleDateString([], { month: "short", day: "numeric" });
			} else {
				label = date.toLocaleDateString([], {
					month: "short",
					year: "2-digit",
				});
			}
		} else {
			label = index === dataCount - 1 ? "Now" : `T-${dataCount - 1 - index}`;
		}

		const row: Record<string, any> = { label };
		series.forEach((s) => {
			row[s.key] = s.points[index] ?? 0;
		});
		return row;
	});
}

function buildNotice(opportunities: Opportunity[], adapterReady: boolean) {
	if (!adapterReady) {
		return "These reserves are live in the registry, but adapter support for vault execution is still pending.";
	}

	const labels = new Set(
		opportunities.map((opportunity) => opportunity.liquidityLabel),
	);
	if (labels.size > 1) {
		return "Withdrawal timing varies across these markets, so liquidity depends on the selected venue rather than a single instant route.";
	}

	return null;
}

function marketLabel(opportunity: Opportunity, index: number) {
	const meta = opportunity.poolMeta?.trim();
	if (meta && meta.length > 0) {
		return meta;
	}

	// Use poolSymbol if it's descriptive, otherwise fallback to category
	if (
		opportunity.poolSymbol &&
		opportunity.poolSymbol !== opportunity.assetSymbol
	) {
		return opportunity.poolSymbol;
	}

	if (opportunity.category && opportunity.category.length > 0) {
		return `${opportunity.category} ${index + 1}`;
	}

	return `Market ${index + 1}`;
}

function marketMeta(opportunity: Opportunity) {
	return `${opportunity.protocolName} · ${opportunity.assetSymbol}`;
}

const USD_PEGGED_SYMBOLS = new Set(["USDC", "USDT", "DAI", "FRAX", "USDE"]);

function formatTokenLike(value: number, symbol: string) {
	const normalizedSymbol = symbol.toUpperCase();

	if (!Number.isFinite(value)) {
		return `0 ${normalizedSymbol}`;
	}

	if (!USD_PEGGED_SYMBOLS.has(normalizedSymbol)) {
		return formatCompactUsd(value);
	}

	return `${value.toLocaleString(undefined, {
		maximumFractionDigits: 2,
		notation: value >= 1_000_000 ? "compact" : "standard",
	})} ${normalizedSymbol}`;
}

function formatCompactUsd(value: number) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 2,
		notation: "compact",
	}).format(value);
}

function remainingCapacityRatio(opportunity: Opportunity) {
	switch (opportunity.liquidityLabel) {
		case "Instant":
			return 0.23;
		case "1-3 days":
			return 0.18;
		case "7 days":
			return 0.12;
		default:
			return 0.08;
	}
}

function mostCommonBy<T extends string>(values: T[]) {
	const counts = new Map<T, number>();
	for (const value of values) {
		counts.set(value, (counts.get(value) ?? 0) + 1);
	}

	let best: T | null = null;
	let bestCount = -1;
	for (const [value, count] of counts.entries()) {
		if (count > bestCount) {
			best = value;
			bestCount = count;
		}
	}

	return best;
}

function liquidityTone(label: StrategyLiquidity) {
	switch (label) {
		case "Instant":
			return "positive";
		case "1-3 days":
			return "neutral";
		case "7 days":
			return "warning";
		default:
			return "muted";
	}
}

function riskTone(risk: StrategyRisk) {
	switch (risk) {
		case "Low":
			return "positive";
		case "Medium":
			return "neutral";
		case "Medium-High":
			return "warning";
		default:
			return "danger";
	}
}

function MetricRail({
	label,
	value,
	tooltipText,
}: {
	label: string;
	value: string;
	tooltipText?: string;
}) {
	return (
		<div className="px-6 py-5">
			<div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
				{label}
				{tooltipText ? (
					<MetricTooltip text={tooltipText}>
						<Info className="h-3 w-3" />
					</MetricTooltip>
				) : null}
			</div>
			<div className="mt-4 font-display text-[18px] font-semibold tracking-tight sm:text-[20px]">
				{value}
			</div>
		</div>
	);
}

function MetricLine({
	label,
	value,
	secondary,
	tooltipText,
}: {
	label: string;
	value: string;
	secondary: string;
	tooltipText?: string;
}) {
	return (
		<div className="grid gap-3 border-t border-border pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-4">
			<div className="flex items-center gap-1.5 text-[15px] text-muted-foreground">
				<span>{label}</span>
				{tooltipText ? (
					<MetricTooltip text={tooltipText}>
						<Info className="h-3.5 w-3.5" />
					</MetricTooltip>
				) : null}
			</div>
			<div className="min-w-0 sm:justify-self-end sm:text-right">
				<div className="text-[15px] font-semibold">{value}</div>
				<div className="mt-1 text-sm text-muted-foreground">{secondary}</div>
			</div>
		</div>
	);
}

function TableValue({
	value,
	secondary,
}: {
	value: string;
	secondary: string;
}) {
	return (
		<div className="text-right">
			<div className="text-[15px] font-semibold">{value}</div>
			<div className="mt-1 text-sm text-muted-foreground">{secondary}</div>
		</div>
	);
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

function InlineBadge({
	children,
	tone,
}: {
	children: React.ReactNode;
	tone: "positive" | "neutral" | "warning" | "danger" | "muted";
}) {
	return (
		<span
			className={cn(
				"inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium",
				tone === "positive" && "bg-emerald-500/12 text-emerald-300",
				tone === "neutral" && "bg-sky-500/12 text-sky-300",
				tone === "warning" && "bg-amber-500/12 text-amber-300",
				tone === "danger" && "bg-rose-500/12 text-rose-300",
				tone === "muted" && "bg-muted text-muted-foreground",
			)}
		>
			{children}
		</span>
	);
}

function OpportunityDetailSkeleton() {
	return (
		<div className="px-6 py-8 md:px-7 md:py-9">
			<div className="mx-auto max-w-[1240px] animate-pulse">
				<div className="mb-6 flex items-center justify-between">
					<div className="h-5 w-20 rounded bg-muted" />
					<div className="flex gap-2">
						<div className="h-9 w-24 rounded bg-muted" />
						<div className="h-9 w-28 rounded bg-muted" />
					</div>
				</div>

				<div className="h-24 w-[420px] rounded bg-muted" />
				<div className="mt-5 h-12 rounded-[16px] bg-muted" />

				<div className="mt-6 grid divide-y divide-border overflow-hidden rounded-[20px] border border-border md:grid-cols-4 md:divide-x md:divide-y-0">
					{Array.from({ length: 4 }).map((_, index) => (
						<div key={index} className="px-6 py-5">
							<div className="h-3 w-24 rounded bg-muted" />
							<div className="mt-4 h-9 w-32 rounded bg-muted" />
						</div>
					))}
				</div>

				<div className="mt-12">
					<div className="h-10 w-full max-w-[400px] rounded-lg bg-muted" />
				</div>

				<div className="mt-10 space-y-10">
					<div className="grid gap-10 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
						<div>
							<div className="h-8 w-32 rounded bg-muted" />
							<div className="mt-2 h-4 w-64 rounded bg-muted" />
							<div className="mt-12 h-14 w-36 rounded bg-muted" />
							<div className="mt-10 space-y-6">
								{Array.from({ length: 3 }).map((__, index) => (
									<div key={index} className="border-t border-border pt-5">
										<div className="h-4 w-28 rounded bg-muted" />
										<div className="mt-3 ml-auto h-10 w-32 rounded bg-muted" />
									</div>
								))}
							</div>
						</div>
						<div className="rounded-[24px] border border-border bg-card/80 p-5">
							<div className="h-4 w-24 rounded bg-muted" />
							<div className="mt-1 h-3 w-56 rounded bg-muted" />
							<div className="mt-5 h-[320px] rounded bg-muted" />
						</div>
					</div>

					<div className="overflow-hidden rounded-[22px] border border-border bg-card/80">
						<div className="h-14 border-b border-border bg-muted/20" />
						<div className="h-[220px]" />
					</div>
				</div>
			</div>
		</div>
	);
}

export default OpportunityDetailPage;
