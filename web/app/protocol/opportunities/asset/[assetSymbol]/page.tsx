"use client";

import { useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardHead, PageHeader } from "@/components/page-primitives";
import { Stat } from "@/components/stat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { formatUsd } from "@/lib/yieldpilot-data";
import {
	useAssetSummaries,
	useOpportunities,
	useProtocols,
	useTokenHistory,
} from "@/lib/use-yieldpilot-market-data";
import { Activity, ArrowUpDown, Clock, Waves, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

type SortKey = "protocol" | "apy" | "tvl" | "liquidity";
type SortDirection = "asc" | "desc";
type RangeKey = "1D" | "1W" | "1M" | "6M" | "1Y" | "All";

const RANGE_OPTIONS: RangeKey[] = ["1D", "1W", "1M", "6M", "1Y", "All"];

function getTrustWalletIconUrl(
	tokenAddress?: string,
	symbol?: string,
	currentChainId?: number,
): string | undefined {
	// ETH always uses the Ethereum logo regardless of chain
	if (symbol === "ETH") {
		return "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png";
	}

	if (!tokenAddress) {
		return undefined;
	}

	const blockchain = "arbitrum";
	return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${blockchain}/assets/${tokenAddress}/logo.png`;
}

function AssetOpportunitiesPage() {
	const router = useRouter();
	const params = useParams<{ assetSymbol: string | string[] }>();
	const assetSymbolParam = params.assetSymbol;
	const assetSymbol = decodeURIComponent(
		Array.isArray(assetSymbolParam) ? assetSymbolParam[0] : assetSymbolParam,
	);

	const [selectedRange, setSelectedRange] = useState<RangeKey>("1W");

	const protocolQuery = useProtocols(assetSymbol);
	const opportunityQuery = useOpportunities(assetSymbol);
	const assetQuery = useAssetSummaries();
	const tokenHistory = useTokenHistory([assetSymbol], selectedRange);
	const [sortKey, setSortKey] = useState<SortKey>("apy");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

	const protocols = protocolQuery.data?.protocols ?? [];
	const opportunities = opportunityQuery.data?.opportunities ?? [];
	const assetSummaries = assetQuery.data?.assets ?? [];

	const assetSummary = assetSummaries.find(
		(asset) => asset.symbol === assetSymbol,
	);
	const assetIconUrl =
		assetSymbol === "ETH"
			? "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png"
			: (assetSummary?.iconUrl ??
				(assetSummary?.address
					? getTrustWalletIconUrl(assetSummary.address, assetSymbol, 42161)
					: undefined));
	const instantCount = opportunities.filter(
		(opportunity) => opportunity.liquidityLabel === "Instant",
	).length;
	const averageApy =
		opportunities.length > 0
			? opportunities.reduce((sum, opportunity) => sum + opportunity.apy, 0) /
				opportunities.length
			: 0;
	const lastRefreshLabel = protocolQuery.data?.generatedAt
		? new Date(protocolQuery.data.generatedAt).toLocaleTimeString()
		: "-";

	const history = tokenHistory.data?.history?.[assetSymbol] ?? [];
	const chartData = useMemo(() => {
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

		return history.map((point) => ({
			timestamp: point.timestamp,
			label: labelFormatter.format(new Date(point.timestamp)),
			priceUsd: point.priceUsd,
		}));
	}, [history, selectedRange]);

	const chartConfig: ChartConfig = {
		priceUsd: {
			label: "Price",
			color: "#8b7eff",
		},
	};

	const sortedOpportunities = useMemo(() => {
		const rankedLiquidity = (label: string) => {
			switch (label) {
				case "Instant":
					return 4;
				case "1-3 days":
					return 3;
				case "7 days":
					return 2;
				default:
					return 1;
			}
		};

		return [...opportunities].sort((left, right) => {
			const direction = sortDirection === "asc" ? 1 : -1;
			switch (sortKey) {
				case "protocol":
					return (
						left.protocolName.localeCompare(right.protocolName) * direction
					);
				case "apy":
					return (left.apy - right.apy) * direction;
				case "tvl":
					return (left.tvlUsd - right.tvlUsd) * direction;
				case "liquidity":
					return (
						(rankedLiquidity(left.liquidityLabel) -
							rankedLiquidity(right.liquidityLabel)) *
						direction
					);
			}
		});
	}, [opportunities, sortDirection, sortKey]);

	function toggleSort(nextKey: SortKey) {
		if (sortKey === nextKey) {
			setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
			return;
		}

		setSortKey(nextKey);
		setSortDirection(nextKey === "protocol" ? "asc" : "desc");
	}

	if (
		(protocolQuery.isPending && protocolQuery.data === undefined) ||
		(opportunityQuery.isPending && opportunityQuery.data === undefined)
	) {
		return <AssetOpportunitiesPageSkeleton />;
	}

	return (
		<div className="px-6 py-8 md:px-7 md:py-9">
			<PageHeader
				title={
					<div className="flex items-center gap-3">
						<Avatar className="size-10 border border-border/40">
							<AvatarImage
								src={assetIconUrl}
								alt={`${assetSymbol} icon`}
								className="size-full object-contain bg-background"
							/>
							<AvatarFallback className="bg-gradient-to-br from-neutral-500 to-neutral-700 text-lg font-semibold text-white">
								{assetSymbol.slice(0, 1)}
							</AvatarFallback>
						</Avatar>
						{assetSymbol} Opportunities
					</div>
				}
				description={`Live protocol and opportunity data for ${assetSymbol} on Arbitrum.`}
			/>

			<Card className="mt-7 p-0">
				<div className="grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-4 md:divide-y-0">
					<div className="p-4">
						<Stat
							label="Market TVL"
							value={formatUsd(assetSummary?.totalTvlUsd ?? 0)}
						/>
					</div>
					<div className="p-4">
						<Stat
							label="Opportunities"
							value={String(opportunities.length)}
							hint={`Live Arbitrum opportunities for ${assetSymbol}.`}
						/>
					</div>
					<div className="p-4">
						<Stat
							label="Average APY"
							value={`${averageApy.toFixed(2)}%`}
							hint="Average APY across the current live opportunity set."
						/>
					</div>
					<div className="p-4">
						<Stat
							label="Instant liquidity"
							value={String(instantCount)}
							hint="Opportunities classified as instant withdrawals."
						/>
					</div>
				</div>
			</Card>

			<Card className="mt-5">
				<CardHead
					title="Price history"
					sub={`Historical price data for ${assetSymbol}.`}
				/>
				<div className="px-4 pb-4 md:px-5 md:pb-5">
					<div className="flex flex-wrap items-center gap-2 mb-4">
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
					{chartData.length > 0 ? (
						<ChartContainer
							config={chartConfig}
							className="w-full rounded-[20px] border border-border/70 bg-gradient-to-b from-muted/25 via-transparent to-transparent px-2 py-3"
						>
							<AreaChart
								accessibilityLayer
								data={chartData}
								margin={{ left: 6, right: 10, top: 10, bottom: 8 }}
							>
								<defs>
									<linearGradient
										id="fill-priceUsd"
										x1="0"
										y1="0"
										x2="0"
										y2="1"
									>
										<stop offset="5%" stopColor="#8b7eff" stopOpacity={0.28} />
										<stop offset="95%" stopColor="#8b7eff" stopOpacity={0.04} />
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
										const spread = Math.max(max - min, max * 0.08, 1);
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
											formatter={(value) => (
												<div className="flex w-full items-start justify-between gap-3">
													<div className="flex flex-col gap-1">
														<span className="text-muted-foreground">Price</span>
													</div>
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
								<Area
									type="monotone"
									dataKey="priceUsd"
									fill="url(#fill-priceUsd)"
									fillOpacity={1}
									stroke="#8b7eff"
									strokeWidth={2.6}
									dot={false}
									activeDot={{
										r: 5,
										fill: "#8b7eff",
										stroke: "hsl(var(--background))",
										strokeWidth: 2,
									}}
									connectNulls
								/>
							</AreaChart>
						</ChartContainer>
					) : tokenHistory.isPending ? (
						<div className="rounded-[20px] border border-border/70 bg-gradient-to-b from-muted/25 via-transparent to-transparent px-4 py-5">
							<div className="flex h-[260px] flex-col justify-between">
								{Array.from({ length: 4 }).map((_, index) => (
									<Skeleton key={index} className="h-px w-full rounded-full" />
								))}
							</div>
						</div>
					) : (
						<div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-border/70 text-sm text-muted-foreground">
							Price history is unavailable for this asset right now.
						</div>
					)}
				</div>
			</Card>

			<div className="mt-5 grid gap-4 lg:grid-cols-[1fr_300px]">
				<Card>
					<CardHead
						title="Top live opportunities"
						sub={`Current Arbitrum yield venues for ${assetSymbol}.`}
					/>

					<div className="overflow-hidden rounded-[18px] border hairline">
						<div className="grid grid-cols-12 items-center gap-4 border-b border-border px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
							<SortableHeader
								className="col-span-5"
								label="Protocol"
								active={sortKey === "protocol"}
								onClick={() => toggleSort("protocol")}
							/>
							<SortableHeader
								className="col-span-2 text-right"
								label="APY"
								active={sortKey === "apy"}
								onClick={() => toggleSort("apy")}
							/>
							<SortableHeader
								className="col-span-2 text-right"
								label="TVL"
								active={sortKey === "tvl"}
								onClick={() => toggleSort("tvl")}
							/>
							<SortableHeader
								className="col-span-3 text-right"
								label="Liquidity"
								active={sortKey === "liquidity"}
								onClick={() => toggleSort("liquidity")}
							/>
						</div>
						<div className="divide-y divide-border">
							{sortedOpportunities.length === 0 ? (
								<div className="px-6 py-16 text-center text-sm text-muted-foreground">
									No live opportunities are available right now.
								</div>
							) : (
								sortedOpportunities.slice(0, 8).map((opportunity) => (
									<div
										key={opportunity.id}
										role="button"
										tabIndex={0}
										onClick={() =>
											router.push(
												`/protocol/opportunities/${encodeURIComponent(opportunity.protocolSlug)}?asset=${encodeURIComponent(opportunity.assetSymbol)}`,
											)
										}
										onKeyDown={(event) => {
											if (event.key === "Enter" || event.key === " ") {
												event.preventDefault();
												router.push(
													`/protocol/opportunities/${encodeURIComponent(opportunity.protocolSlug)}?asset=${encodeURIComponent(opportunity.assetSymbol)}`,
												);
											}
										}}
										className={cn(
											"grid grid-cols-12 cursor-pointer items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/30",
										)}
									>
										<div className="col-span-5">
											<div className="flex items-center gap-3">
												<img
													src={opportunity.logo ?? "/favicon.ico"}
													alt={`${opportunity.protocolName} logo`}
													className="size-9 rounded-full bg-background object-cover"
												/>
												<div>
													<div className="text-[14px] font-medium">
														{opportunity.protocolName}
													</div>
													<div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
														{opportunity.category}
													</div>
												</div>
											</div>
										</div>
										<div className="col-span-2 text-right font-mono text-sm">
											{opportunity.apy.toFixed(2)}%
										</div>
										<div className="col-span-2 text-right font-mono text-sm">
											{formatUsd(opportunity.tvlUsd)}
										</div>
										<div className="col-span-3 text-right font-mono text-[11px] text-muted-foreground">
											{opportunity.liquidityLabel}
										</div>
									</div>
								))
							)}
						</div>
					</div>
				</Card>

				<div className="space-y-4">
					<Card>
						<CardHead title="Registry summary" />
						<div className="flex flex-col gap-4">
							<SummaryRow
								icon={Wallet}
								label="Protocols"
								value={String(protocols.length)}
							/>
							<SummaryRow
								icon={Waves}
								label="Supported assets"
								value={String(assetSummary ? 1 : assetSummaries.length)}
							/>
							<SummaryRow
								icon={Activity}
								label="Adapter-ready venues"
								value={String(
									protocols.filter((protocol) => protocol.adapterAvailable)
										.length,
								)}
							/>
							<SummaryRow
								icon={Clock}
								label="Last refresh"
								value={lastRefreshLabel}
							/>
						</div>
					</Card>
				</div>
			</div>
		</div>
	);
}

function SortableHeader({
	label,
	active,
	className,
	onClick,
}: {
	label: string;
	active: boolean;
	className?: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex items-center gap-1.5 text-left text-[10px] uppercase tracking-[0.16em] transition-colors hover:text-foreground",
				className,
				active && "text-foreground",
			)}
		>
			<span>{label}</span>
			<ArrowUpDown className="h-3 w-3" />
		</button>
	);
}

function SummaryRow({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof Wallet;
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-2 text-sm">
				<Icon className="h-4 w-4 text-muted-foreground" />
				<span>{label}</span>
			</div>
			<span className="font-mono text-sm">{value}</span>
		</div>
	);
}

function AssetOpportunitiesPageSkeleton() {
	return (
		<div className="px-6 py-8 md:px-7 md:py-9">
			<div className="animate-pulse">
				<div className="h-9 w-64 rounded bg-muted" />
				<div className="mt-2 h-4 w-96 rounded bg-muted" />

				<div className="mt-7 grid grid-cols-2 overflow-hidden rounded-[20px] border border-border md:grid-cols-4">
					{Array.from({ length: 4 }).map((_, index) => (
						<div
							key={index}
							className="p-4 border-r border-border last:border-r-0"
						>
							<div className="h-3 w-20 rounded bg-muted" />
							<div className="mt-4 h-8 w-32 rounded bg-muted" />
						</div>
					))}
				</div>

				<div className="mt-5 rounded-[24px] border border-border bg-card p-6">
					<div className="flex items-center justify-between mb-6">
						<div>
							<div className="h-6 w-48 rounded bg-muted" />
							<div className="mt-2 h-3 w-64 rounded bg-muted" />
						</div>
					</div>
					<div className="rounded-[20px] border border-border/70 bg-gradient-to-b from-muted/25 via-transparent to-transparent px-4 py-5">
						<div className="flex h-[260px] flex-col justify-between">
							{Array.from({ length: 4 }).map((_, index) => (
								<Skeleton key={index} className="h-px w-full rounded-full" />
							))}
						</div>
					</div>
				</div>

				<div className="mt-5 grid gap-4 lg:grid-cols-[1fr_300px]">
					<div className="rounded-[24px] border border-border bg-card p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<div className="h-6 w-48 rounded bg-muted" />
								<div className="mt-2 h-3 w-64 rounded bg-muted" />
							</div>
						</div>

						<div className="overflow-hidden rounded-[18px] border border-border">
							<div className="h-10 border-b border-border bg-muted/20" />
							<div className="divide-y divide-border">
								{Array.from({ length: 8 }).map((_, i) => (
									<div key={i} className="grid grid-cols-12 gap-4 px-4 py-3.5">
										<div className="col-span-5 flex items-center gap-3">
											<div className="size-9 rounded-full bg-muted" />
											<div className="space-y-2">
												<div className="h-4 w-24 rounded bg-muted" />
												<div className="h-3 w-16 rounded bg-muted" />
											</div>
										</div>
										<div className="col-span-2 flex justify-end items-center">
											<div className="h-4 w-12 rounded bg-muted" />
										</div>
										<div className="col-span-2 flex justify-end items-center">
											<div className="h-4 w-16 rounded bg-muted" />
										</div>
										<div className="col-span-3 flex justify-end items-center">
											<div className="h-3 w-14 rounded bg-muted" />
										</div>
									</div>
								))}
							</div>
						</div>
					</div>

					<div className="rounded-[24px] border border-border bg-card p-6 h-fit">
						<div className="h-5 w-32 rounded bg-muted mb-6" />
						<div className="space-y-4">
							{Array.from({ length: 4 }).map((_, i) => (
								<div key={i} className="flex justify-between">
									<div className="h-4 w-24 rounded bg-muted" />
									<div className="h-4 w-12 rounded bg-muted" />
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default AssetOpportunitiesPage;
