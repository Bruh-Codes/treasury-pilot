"use client";

import { Card, CardHead, PageHeader } from "@/components/page-primitives";
import { Stat } from "@/components/stat";
import { formatUsd } from "@/lib/yieldpilot-data";
import {
	useAssetSummaries,
	useOpportunities,
	useProtocols,
} from "@/lib/use-yieldpilot-market-data";
import { Activity, ArrowUpRight, Clock, Waves, Wallet } from "lucide-react";

function DashboardPage() {
	const protocolQuery = useProtocols("USDC");
	const opportunityQuery = useOpportunities("USDC");
	const assetQuery = useAssetSummaries();

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

	return (
		<div className="px-6 py-8 md:px-7 md:py-9">
			<PageHeader
				eyebrow="Live Arbitrum registry"
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
						sub="Real Arbitrum yield venues replacing the old static strategy cards."
					/>

					<div className="overflow-hidden rounded-[18px] border hairline">
						<div className="grid grid-cols-12 items-center gap-4 border-b border-border px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
							<div className="col-span-4">Protocol</div>
							<div className="col-span-2 text-right">Asset</div>
							<div className="col-span-2 text-right">APY</div>
							<div className="col-span-2 text-right">TVL</div>
							<div className="col-span-2 text-right">Liquidity</div>
						</div>
						<div className="divide-y divide-border">
							{opportunities.slice(0, 8).map((opportunity) => (
								<div
									key={opportunity.id}
									className="grid grid-cols-12 items-center gap-4 px-4 py-3.5"
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
							))}
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
								value={
									protocolQuery.data?.generatedAt
										? new Date(protocolQuery.data.generatedAt).toLocaleTimeString()
										: "-"
								}
							/>
						</div>
					</Card>

					<Card>
						<CardHead title="Execution status" />
						<div className="space-y-3 text-sm text-muted-foreground">
							<p>
								Local placeholder allocations and wallet balances have been removed from
								the dashboard.
							</p>
							<p>
								The next integration step is reading live vault balances and
								history from your deployed contracts and wallet.
							</p>
						</div>
					</Card>
				</div>
			</div>
		</div>
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
