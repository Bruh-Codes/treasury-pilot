"use client";

import { useMemo, useState } from "react";
import {
	CircleArrowDown,
	ChevronDown,
	Copy,
	Info,
	LayoutList,
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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useVault, vaultStore } from "@/lib/vault-store";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

type AssetItem = {
	id: string;
	name: string;
	symbol: string;
	iconUrl: string;
	walletBalance: number;
	deposited: string;
	apy: string;
	totalDeposits: string;
	availableLiquidity: string;
	supported: boolean;
	iconClass: string;
};

type RangeKey = "1D" | "1W" | "1M" | "6M" | "1Y" | "All";

const RANGE_OPTIONS: RangeKey[] = ["1D", "1W", "1M", "6M", "1Y", "All"];

const ASSETS: AssetItem[] = [
	{
		id: "usdc",
		name: "USD Coin",
		symbol: "USDC",
		iconUrl:
			"https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdc.png",
		walletBalance: 15000,
		deposited: "-",
		apy: "2.89% - 4.42%",
		totalDeposits: "3.43M USDC",
		availableLiquidity: "351.84K USDC",
		supported: true,
		iconClass: "from-sky-400 to-blue-600",
	},
	{
		id: "usdt",
		name: "Tether USD",
		symbol: "USDT",
		iconUrl:
			"https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png",
		walletBalance: 0,
		deposited: "-",
		apy: "0.15% - 2.23%",
		totalDeposits: "2.08M USDT",
		availableLiquidity: "735.14K USDT",
		supported: false,
		iconClass: "from-emerald-400 to-teal-600",
	},
	{
		id: "rlusd",
		name: "RLUSD",
		symbol: "RLUSD",
		iconUrl: "https://cryptologos.cc/logos/ripple-usd-rlusd-logo.png?v=040",
		walletBalance: 0,
		deposited: "-",
		apy: "0%",
		totalDeposits: "10.00 RLUSD",
		availableLiquidity: "9.85 RLUSD",
		supported: false,
		iconClass: "from-blue-400 to-indigo-600",
	},
	{
		id: "eth",
		name: "Ether",
		symbol: "ETH",
		iconUrl:
			"https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png",
		walletBalance: 0,
		deposited: "-",
		apy: "4.64%",
		totalDeposits: "4.02K ETH",
		availableLiquidity: "613.97 ETH",
		supported: false,
		iconClass: "from-slate-500 to-slate-700",
	},
	{
		id: "wsteth",
		name: "Wrapped stETH",
		symbol: "wstETH",
		iconUrl: "https://assets.coingecko.com/coins/images/18834/large/wstETH.png",
		walletBalance: 0,
		deposited: "-",
		apy: "0%",
		totalDeposits: "669.82 wstETH",
		availableLiquidity: "669.82 wstETH",
		supported: false,
		iconClass: "from-cyan-400 to-sky-600",
	},
	{
		id: "weeth",
		name: "Wrapped eETH",
		symbol: "weETH",
		iconUrl: "https://assets.coingecko.com/coins/images/33033/large/weETH.png",
		walletBalance: 0,
		deposited: "-",
		apy: "0%",
		totalDeposits: "1.96K weETH",
		availableLiquidity: "1.96K weETH",
		supported: false,
		iconClass: "from-fuchsia-400 to-violet-600",
	},
	{
		id: "wbtc",
		name: "Wrapped BTC",
		symbol: "WBTC",
		iconUrl:
			"https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/wbtc.png",
		walletBalance: 0,
		deposited: "-",
		apy: "0.01%",
		totalDeposits: "69.91 WBTC",
		availableLiquidity: "68.91 WBTC",
		supported: false,
		iconClass: "from-orange-400 to-amber-500",
	},
	{
		id: "usde",
		name: "USDe",
		symbol: "USDe",
		iconUrl: "https://assets.coingecko.com/coins/images/33613/large/usde.png",
		walletBalance: 0,
		deposited: "-",
		apy: "1.42%",
		totalDeposits: "12.49K USDe",
		availableLiquidity: "4.80K USDe",
		supported: false,
		iconClass: "from-zinc-300 to-zinc-500",
	},
	{
		id: "link",
		name: "ChainLink Token",
		symbol: "LINK",
		iconUrl:
			"https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/link.png",
		walletBalance: 0,
		deposited: "-",
		apy: "0%",
		totalDeposits: "53.62K LINK",
		availableLiquidity: "53.40K LINK",
		supported: false,
		iconClass: "from-blue-500 to-blue-700",
	},
	{
		id: "aave",
		name: "Aave Token",
		symbol: "AAVE",
		iconUrl:
			"https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/aave.png",
		walletBalance: 0,
		deposited: "-",
		apy: "0%",
		totalDeposits: "4.51K AAVE",
		availableLiquidity: "4.50K AAVE",
		supported: false,
		iconClass: "from-violet-400 to-purple-600",
	},
];

export default function DepositPage() {
	const vault = useVault();
	const [search, setSearch] = useState("");
	const [noBalanceAsset, setNoBalanceAsset] = useState<AssetItem | null>(null);
	const [depositAsset, setDepositAsset] = useState<AssetItem | null>(null);
	const [depositAmount, setDepositAmount] = useState("0");
	const [receiveOpen, setReceiveOpen] = useState(false);
	const [chainsOpen, setChainsOpen] = useState(false);
	const [selectedRange, setSelectedRange] = useState<RangeKey>("1W");
	const vaultAddress = "0x8F3A...C2E7";

	const assets = useMemo(
		() =>
			ASSETS.map((asset) =>
				asset.id === "usdc"
					? { ...asset, walletBalance: vault.walletUsdc }
					: asset,
			),
		[vault.walletUsdc],
	);

	const filtered = useMemo(() => {
		const term = search.trim().toLowerCase();
		return assets.filter((asset) => {
			const matchesSearch =
				term.length === 0 ||
				asset.name.toLowerCase().includes(term) ||
				asset.symbol.toLowerCase().includes(term);
			return matchesSearch;
		});
	}, [assets, search]);

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
		const base = Math.max(vault.vaultBalance || 0, 25000);
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
					usdc: base * 0.44,
					eth: base * 0.19,
					wbtc: base * 0.11,
					aave: base * 0.06,
				},
				{
					label: "04:00",
					usdc: base * 0.45,
					eth: base * 0.2,
					wbtc: base * 0.111,
					aave: base * 0.062,
				},
				{
					label: "08:00",
					usdc: base * 0.455,
					eth: base * 0.205,
					wbtc: base * 0.114,
					aave: base * 0.064,
				},
				{
					label: "12:00",
					usdc: base * 0.461,
					eth: base * 0.211,
					wbtc: base * 0.116,
					aave: base * 0.067,
				},
				{
					label: "16:00",
					usdc: base * 0.468,
					eth: base * 0.217,
					wbtc: base * 0.12,
					aave: base * 0.069,
				},
				{
					label: "20:00",
					usdc: base * 0.474,
					eth: base * 0.221,
					wbtc: base * 0.123,
					aave: base * 0.071,
				},
			],
			"1W": [
				{
					label: "Mon",
					usdc: base * 0.41,
					eth: base * 0.15,
					wbtc: base * 0.1,
					aave: base * 0.05,
				},
				{
					label: "Tue",
					usdc: base * 0.425,
					eth: base * 0.161,
					wbtc: base * 0.104,
					aave: base * 0.054,
				},
				{
					label: "Wed",
					usdc: base * 0.439,
					eth: base * 0.176,
					wbtc: base * 0.108,
					aave: base * 0.058,
				},
				{
					label: "Thu",
					usdc: base * 0.452,
					eth: base * 0.192,
					wbtc: base * 0.113,
					aave: base * 0.062,
				},
				{
					label: "Fri",
					usdc: base * 0.463,
					eth: base * 0.204,
					wbtc: base * 0.118,
					aave: base * 0.066,
				},
				{
					label: "Sat",
					usdc: base * 0.47,
					eth: base * 0.214,
					wbtc: base * 0.121,
					aave: base * 0.069,
				},
				{
					label: "Sun",
					usdc: base * 0.478,
					eth: base * 0.224,
					wbtc: base * 0.124,
					aave: base * 0.072,
				},
			],
			"1M": [
				{
					label: "W1",
					usdc: base * 0.33,
					eth: base * 0.1,
					wbtc: base * 0.08,
					aave: base * 0.03,
				},
				{
					label: "W2",
					usdc: base * 0.372,
					eth: base * 0.126,
					wbtc: base * 0.091,
					aave: base * 0.041,
				},
				{
					label: "W3",
					usdc: base * 0.421,
					eth: base * 0.163,
					wbtc: base * 0.106,
					aave: base * 0.055,
				},
				{
					label: "W4",
					usdc: base * 0.458,
					eth: base * 0.198,
					wbtc: base * 0.118,
					aave: base * 0.066,
				},
				{
					label: "Now",
					usdc: base * 0.478,
					eth: base * 0.224,
					wbtc: base * 0.124,
					aave: base * 0.072,
				},
			],
			"6M": [
				{
					label: "Nov",
					usdc: base * 0.18,
					eth: base * 0.04,
					wbtc: base * 0.03,
					aave: base * 0.012,
				},
				{
					label: "Dec",
					usdc: base * 0.23,
					eth: base * 0.06,
					wbtc: base * 0.042,
					aave: base * 0.017,
				},
				{
					label: "Jan",
					usdc: base * 0.29,
					eth: base * 0.085,
					wbtc: base * 0.058,
					aave: base * 0.025,
				},
				{
					label: "Feb",
					usdc: base * 0.36,
					eth: base * 0.122,
					wbtc: base * 0.08,
					aave: base * 0.037,
				},
				{
					label: "Mar",
					usdc: base * 0.43,
					eth: base * 0.174,
					wbtc: base * 0.103,
					aave: base * 0.055,
				},
				{
					label: "Apr",
					usdc: base * 0.478,
					eth: base * 0.224,
					wbtc: base * 0.124,
					aave: base * 0.072,
				},
			],
			"1Y": [
				{
					label: "Q2",
					usdc: base * 0.11,
					eth: base * 0.02,
					wbtc: base * 0.015,
					aave: base * 0.006,
				},
				{
					label: "Q3",
					usdc: base * 0.19,
					eth: base * 0.043,
					wbtc: base * 0.031,
					aave: base * 0.012,
				},
				{
					label: "Q4",
					usdc: base * 0.29,
					eth: base * 0.086,
					wbtc: base * 0.055,
					aave: base * 0.026,
				},
				{
					label: "Q1",
					usdc: base * 0.4,
					eth: base * 0.153,
					wbtc: base * 0.091,
					aave: base * 0.047,
				},
				{
					label: "Now",
					usdc: base * 0.478,
					eth: base * 0.224,
					wbtc: base * 0.124,
					aave: base * 0.072,
				},
			],
			All: [
				{
					label: "Start",
					usdc: base * 0.05,
					eth: base * 0.008,
					wbtc: base * 0.005,
					aave: base * 0.002,
				},
				{
					label: "Phase 1",
					usdc: base * 0.14,
					eth: base * 0.028,
					wbtc: base * 0.017,
					aave: base * 0.007,
				},
				{
					label: "Phase 2",
					usdc: base * 0.26,
					eth: base * 0.071,
					wbtc: base * 0.043,
					aave: base * 0.019,
				},
				{
					label: "Phase 3",
					usdc: base * 0.39,
					eth: base * 0.149,
					wbtc: base * 0.085,
					aave: base * 0.043,
				},
				{
					label: "Now",
					usdc: base * 0.478,
					eth: base * 0.224,
					wbtc: base * 0.124,
					aave: base * 0.072,
				},
			],
		};
		return series[selectedRange];
	}, [selectedRange, vault.vaultBalance]);

	function openDeposit(asset: AssetItem) {
		setDepositAsset(asset);
		setDepositAmount(
			asset.walletBalance > 0
				? Math.min(asset.walletBalance, 5000).toString()
				: "0",
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

	function confirmDeposit() {
		if (!depositAsset) return;
		const amount = Number(depositAmount) || 0;
		if (amount <= 0 || amount > depositAsset.walletBalance) return;
		if (!vault.connected) {
			vaultStore.connect();
		}
		vaultStore.deposit(amount);
		setDepositAsset(null);
		toast.success("Deposit received in the vault");
	}

	function copyVaultAddress() {
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
									{vault.vaultBalance.toLocaleString(undefined, {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									})}
								</div>
								<div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
									Balance
									<MetricTooltip text="Total funds currently attributed to your position in the shared vault.">
										<Info className="size-3.5" />
									</MetricTooltip>
								</div>
							</div>

							<div className="border-t border-border pt-4">
								<div className="flex items-center justify-between py-2.5 text-sm">
									<div className="flex items-center gap-1.5 text-muted-foreground">
										Position APY
										<MetricTooltip text="Estimated annualized yield for your current deposited position based on active allocations.">
											<Info className="size-3.5" />
										</MetricTooltip>
									</div>
									<span className="font-semibold text-foreground">
										{vault.vaultBalance > 0 ? "4.12%" : "0.00%"}
									</span>
								</div>
								<div className="flex items-center justify-between py-2.5 text-sm">
									<div className="flex items-center gap-1.5 text-muted-foreground">
										Total earnings
										<MetricTooltip text="Net yield accrued so far from your participation in the shared vault.">
											<Info className="size-3.5" />
										</MetricTooltip>
									</div>
									<span className="font-semibold text-foreground">
										$
										{Math.max(vault.vaultBalance * 0.021, 0).toLocaleString(
											undefined,
											{ minimumFractionDigits: 2, maximumFractionDigits: 2 },
										)}
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
									onClick={() => openDeposit(assets[0]!)}
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
													Asset flows
												</p>
												<p className="mt-1 text-xs text-muted-foreground/75">
													Each deposited or received asset tracks as its own
													line.
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
										Market board
									</CardTitle>
									<p className="mt-1 text-sm text-muted-foreground">
										One asset table and live deposit metrics
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
					className="w-[92vw] max-w-[520px] rounded-[28px] border border-border/80 bg-popover p-0 shadow-[0_24px_80px_rgba(0,0,0,0.42)] sm:w-[520px] sm:max-w-[520px]"
				>
					{depositAsset && (
						<div className="p-4">
							<div className="mb-2 flex items-center justify-end">
								<DialogClose className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground">
									<X className="size-5" />
								</DialogClose>
							</div>
							<div className="space-y-3">
								<div className="rounded-[22px] border border-border/70 bg-card px-4 py-4">
									<div className="flex items-start justify-between gap-4">
										<div>
											<div className="text-sm text-muted-foreground">
												Deposit
											</div>
											<Input
												value={depositAmount}
												onChange={(event) =>
													setDepositAmount(
														event.target.value.replace(/[^0-9.]/g, ""),
													)
												}
												inputMode="decimal"
												placeholder="0"
												className="mt-2 h-auto border-0 bg-transparent px-0 py-0 text-[40px] font-semibold leading-none tracking-tight text-foreground shadow-none placeholder:text-foreground/40 focus-visible:ring-0"
											/>
										</div>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<button
													type="button"
													className="flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-2 text-sm font-semibold text-foreground"
												>
													<Avatar className="size-7 border border-border/40">
														<AvatarImage
															src={depositAsset.iconUrl}
															alt={`${depositAsset.name} icon`}
															className="object-contain bg-background p-1.5"
														/>
														<AvatarFallback
															className={`bg-gradient-to-br text-sm font-semibold text-white ${depositAsset.iconClass}`}
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
												className="w-56 rounded-2xl border border-border/80 bg-popover p-2"
											>
												{assets.map((asset) => (
													<DropdownMenuItem
														key={asset.id}
														onClick={() => openDeposit(asset)}
														className="rounded-xl px-2 py-2"
													>
														<Avatar className="size-7 border border-border/40">
															<AvatarImage
																src={asset.iconUrl}
																alt={`${asset.name} icon`}
																className="object-contain bg-background p-1.5"
															/>
															<AvatarFallback
																className={`bg-gradient-to-br text-xs font-semibold text-white ${asset.iconClass}`}
															>
																{asset.symbol.slice(0, 1)}
															</AvatarFallback>
														</Avatar>
														<div className="flex min-w-0 flex-1 items-center justify-between gap-3">
															<div className="min-w-0">
																<div className="truncate font-medium text-foreground">
																	{asset.symbol}
																</div>
																<div className="truncate text-xs text-muted-foreground">
																	{asset.name}
																</div>
															</div>
															<div className="text-xs text-muted-foreground">
																{asset.walletBalance.toLocaleString()}
															</div>
														</div>
													</DropdownMenuItem>
												))}
											</DropdownMenuContent>
										</DropdownMenu>
									</div>

									<div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
										<div>
											~ $
											{(Number(depositAmount || 0) || 0).toLocaleString(
												undefined,
												{
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												},
											)}
										</div>
										<div className="flex items-center gap-3">
											<span>
												Balance:{" "}
												<span className="text-foreground">
													{depositAsset.walletBalance.toLocaleString()}
												</span>
											</span>
											<Button
												type="button"
												variant="secondary"
												className="h-7 rounded-full px-2.5 text-xs font-semibold"
												onClick={() =>
													setDepositAmount(
														depositAsset.walletBalance.toString(),
													)
												}
											>
												Max
											</Button>
										</div>
									</div>
								</div>

								<div className="rounded-[22px] border border-border/70 bg-card px-4 py-3">
									<CompactDepositRow
										label="Network"
										right={
											<span className="text-sm font-semibold text-foreground">
												Arbitrum
											</span>
										}
									/>
									<CompactDepositRow
										label="Destination"
										right={
											<span className="text-sm font-semibold text-foreground">
												Shared vault
											</span>
										}
									/>
								</div>

								<div className="grid gap-3 pt-1 sm:grid-cols-2">
									<Button
										variant="secondary"
										className="h-12 rounded-full text-sm font-semibold"
										onClick={() => setDepositAsset(null)}
									>
										Cancel
									</Button>
									<Button
										className="h-12 rounded-full text-sm font-semibold"
										onClick={confirmDeposit}
										disabled={
											(Number(depositAmount) || 0) <= 0 ||
											(Number(depositAmount) || 0) > depositAsset.walletBalance
										}
									>
										Deposit
									</Button>
								</div>
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
									Fund your account
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
									0x8F4A4458BC8d2684A452C0C57531731410F3f4
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
							<div className="flex items-center gap-3">
								<ArbitrumIcon />
								<div className="text-[18px] font-semibold text-foreground">
									Arbitrum
								</div>
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
						) : null,
					),
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
				<path d="M15.6 8.8l-5.1 12.8 2.1 1.2 5.1-12.8-2.1-1.2z" fill="#FFFFFF" />
				<path d="M13.7 17.6h4.8l.8 2.2h-4.8l-.8-2.2z" fill="#9DCCED" />
			</svg>
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
