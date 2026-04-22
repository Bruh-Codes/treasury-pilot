"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHead, PageHeader } from "@/components/page-primitives";
import { Stat } from "@/components/stat";
import { formatUsd } from "@/lib/yieldpilot-data";
import {
	useAssetSummaries,
	useOpportunities,
	useProtocols,
} from "@/lib/use-yieldpilot-market-data";
import { Activity, ArrowUpDown, Clock, Waves, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey = "protocol" | "asset" | "apy" | "tvl" | "liquidity";
type SortDirection = "asc" | "desc";

function DashboardPage() {
	const router = useRouter();
	const protocolQuery = useProtocols("USDC");
	const opportunityQuery = useOpportunities("USDC");
	const assetQuery = useAssetSummaries();
	const [sortKey, setSortKey] = useState<SortKey>("apy");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

	const protocols = protocolQuery.data?.protocols ?? [];
	const opportunities = opportunityQuery.data?.opportunities ?? [];
	const assetSummaries = assetQuery.data?.assets ?? [];

	const usdcSummary = assetSummaries.find((asset) => asset.symbol === "USDC");
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
					return left.protocolName.localeCompare(right.protocolName) * direction;
				case "asset":
					return left.assetSymbol.localeCompare(right.assetSymbol) * direction;
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
		setSortDirection(nextKey === "protocol" || nextKey === "asset" ? "asc" : "desc");
	}

	return (
		<div className="px-6 py-8 md:px-7 md:py-9">
			<PageHeader
				title="Protocol dashboard"
				description="Live protocol and opportunity data for Arbitrum assets, ready for frontend filtering and AI recommendation inputs."
			/>

			<Card className="mt-7 p-0">
				<div className="grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-4 md:divide-y-0">
					<div className="p-4">
						<Stat
							label="USDC market TVL"
							value={formatUsd(usdcSummary?.totalTvlUsd ?? 0)}
						/>
					</div>
					<div className="p-4">
						<Stat
							label="USDC opportunities"
							value={String(opportunities.length)}
							hint="Live Arbitrum opportunities for the selected asset."
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

			<div className="mt-5 grid gap-4 lg:grid-cols-[1fr_300px]">
				<Card>
					<CardHead
						title="Top live opportunities"
						sub="Current Arbitrum yield venues for the selected asset."
					/>

					<div className="overflow-hidden rounded-[18px] border hairline">
						<div className="grid grid-cols-12 items-center gap-4 border-b border-border px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
							<SortableHeader
								className="col-span-4"
								label="Protocol"
								active={sortKey === "protocol"}
								onClick={() => toggleSort("protocol")}
							/>
							<SortableHeader
								className="col-span-2 text-right"
								label="Asset"
								active={sortKey === "asset"}
								onClick={() => toggleSort("asset")}
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
								className="col-span-2 text-right"
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
												`/dashboard/opportunities/${encodeURIComponent(opportunity.protocolSlug)}?asset=${encodeURIComponent(opportunity.assetSymbol)}`,
											)
										}
										onKeyDown={(event) => {
											if (event.key === "Enter" || event.key === " ") {
												event.preventDefault();
												router.push(
													`/dashboard/opportunities/${encodeURIComponent(opportunity.protocolSlug)}?asset=${encodeURIComponent(opportunity.assetSymbol)}`,
												);
											}
										}}
										className={cn(
											"grid grid-cols-12 items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/30",
										)}
									>
										<div className="col-span-4">
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
											{opportunity.assetSymbol}
										</div>
										<div className="col-span-2 text-right font-mono text-sm">
											{opportunity.apy.toFixed(2)}%
										</div>
										<div className="col-span-2 text-right font-mono text-sm">
											{formatUsd(opportunity.tvlUsd)}
										</div>
										<div className="col-span-2 text-right font-mono text-[11px] text-muted-foreground">
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
								value={String(usdcSummary ? 1 : assetSummaries.length)}
							/>
							<SummaryRow
								icon={Activity}
								label="Adapter-ready venues"
								value={String(
									protocols.filter((protocol) => protocol.adapterAvailable).length,
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

export default DashboardPage;
