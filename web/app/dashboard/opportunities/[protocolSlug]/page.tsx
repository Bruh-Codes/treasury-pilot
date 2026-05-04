"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
	ArrowLeft,
	ArrowUpRight,
	BadgeInfo,
	ChartColumn,
	Clock3,
	Droplets,
	Info,
	Loader2,
	ShieldCheck,
	Wallet,
} from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Card } from "@/components/page-primitives";
import { Button } from "@/components/ui/button";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
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
import { useOpportunities } from "@/lib/use-yieldpilot-market-data";
import type {
	Opportunity,
	StrategyLiquidity,
	StrategyRisk,
} from "@/lib/yieldpilot-types";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/lib/yieldpilot-data";

type RangeKey = "1D" | "1W" | "1M" | "6M" | "1Y" | "All";

const RANGE_OPTIONS: RangeKey[] = ["1D", "1W", "1M", "6M", "1Y", "All"];
const CHART_MODIFIERS = [0.97, 0.965, 0.968, 0.975, 0.99, 1.02, 1] as const;
const DEPOSIT_COLORS = ["#8b7eff", "#d38cf5", "#5ec6ff"] as const;
const WITHDRAW_COLORS = ["#76c8ff", "#8b7eff", "#4ecdc4"] as const;
const CHART_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function OpportunityDetailPage() {
	const router = useRouter();
	const params = useParams<{ protocolSlug: string | string[] }>();
	const searchParams = useSearchParams();
	const [selectedRange, setSelectedRange] = useState<RangeKey>("1W");
	const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
	const [depositPage, setDepositPage] = useState(1);
	const [withdrawPage, setWithdrawPage] = useState(1);
	const itemsPerPage = 10;

	const protocolSlugParam = params.protocolSlug;
	const protocolSlug = decodeURIComponent(
		Array.isArray(protocolSlugParam) ? protocolSlugParam[0] : protocolSlugParam,
	);
	const asset = searchParams.get("asset") ?? undefined;

	const currentPage = activeTab === "deposit" ? depositPage : withdrawPage;
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

	const handleTabChange = (value: string) => {
		setActiveTab(value as "deposit" | "withdraw");
	};

	// Filter top opportunities for charts consistency
	const topDepositOpportunities = useMemo(
		() => topOpportunities.filter((opp) => opp.canDeposit),
		[topOpportunities],
	);
	const topWithdrawOpportunities = useMemo(
		() => topOpportunities.filter((opp) => opp.canWithdraw),
		[topOpportunities],
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
						<Button asChild>
							<Link href="/">
								<Wallet className="h-4 w-4" />
								Deposit
							</Link>
						</Button>
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

				<div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
					Opportunity
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
												Current venue rates visualized from the active market
												set.
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

									<div className="mt-4 relative">
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
																<span className="text-foreground">{label}</span>
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
									{topDepositOpportunities.map((opportunity, index) => (
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

									<div className="mt-4 relative">
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
																<span className="text-foreground">{label}</span>
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
									{topWithdrawOpportunities.map((opportunity, index) => (
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

		if (opportunity.history && opportunity.history.length > 0) {
			points = opportunity.history.map((p) =>
				mode === "apy" ? p.apy : p.tvlUsd,
			);
		} else {
			// Fallback if no history
			const baseValue = mode === "apy" ? opportunity.apy : opportunity.tvlUsd;
			points = CHART_MODIFIERS.map((m) => baseValue * m);
		}

		return {
			key: `series${index + 1}`,
			label: marketLabel(opportunity, index),
			color: colors[index] ?? "#8b7eff",
			points,
			history: opportunity.history,
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
			if (range === "1D") {
				label = date.toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				});
			} else {
				label = date.toLocaleDateString([], { month: "short", day: "numeric" });
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
			<div className="mt-4 font-display text-[28px] font-semibold tracking-tight sm:text-[34px]">
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
