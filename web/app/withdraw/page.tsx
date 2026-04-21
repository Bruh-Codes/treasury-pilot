"use client";

import Link from "next/link";
import { Card, CardHead, PageHeader } from "@/components/page-primitives";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/yieldpilot-data";
import { useAssetSummaries, useOpportunities } from "@/lib/use-yieldpilot-market-data";
import { ArrowRight } from "lucide-react";

function WithdrawPage() {
	const assetQuery = useAssetSummaries();
	const opportunityQuery = useOpportunities("USDC");

	const usdcSummary = assetQuery.data?.assets.find((asset) => asset.symbol === "USDC");
	const opportunities = opportunityQuery.data?.opportunities ?? [];
	const instantLiquidity = opportunities
		.filter((opportunity) => opportunity.liquidityLabel === "Instant")
		.reduce((sum, opportunity) => sum + opportunity.tvlUsd, 0);

	return (
		<div className="px-6 py-8 md:px-10 md:py-10">
			<PageHeader
				eyebrow="Withdraw"
				title="Withdrawal routing"
				description="This page now reflects live market liquidity only. Local placeholder withdrawal flows have been removed."
			/>

			<div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
				<div className="space-y-6">
					<Card>
						<CardHead title="Live liquidity snapshot" />
						<div className="space-y-4 text-sm">
							<RowK
								k="USDC market liquidity"
								v={formatUsd(usdcSummary?.availableLiquidityUsd ?? 0)}
							/>
							<RowK
								k="Instant-liquidity venues"
								v={String(
									opportunities.filter(
										(opportunity) => opportunity.liquidityLabel === "Instant",
									).length,
								)}
							/>
							<RowK k="Instant-liquidity TVL" v={formatUsd(instantLiquidity)} />
						</div>
					</Card>

					<Card>
						<CardHead title="What comes next" />
						<div className="space-y-3 text-sm text-muted-foreground">
							<p>
								To support real withdrawals, this page needs a live vault
								balance, your wallet position, and contract-driven unwind status.
							</p>
							<p>
								Those should come from the deployed vault plus indexed strategy
								queue state, not local placeholder storage.
							</p>
						</div>
					</Card>
				</div>

				<aside className="space-y-6">
					<Card>
						<CardHead title="Execution status" />
						<div className="space-y-3 text-sm">
							<RowK k="UI mode" v="Live data only" />
							<RowK k="User balance" v="Not wired" />
							<RowK k="Withdraw execution" v="Pending contract integration" bold />
						</div>
					</Card>

					<Button className="w-full" size="lg" asChild>
						<Link href="/dashboard">
							View protocol dashboard
							<ArrowRight className="ml-1 h-4 w-4" />
						</Link>
					</Button>
				</aside>
			</div>
		</div>
	);
}

function RowK({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
	return (
		<div className="flex items-center justify-between">
			<span className={bold ? "font-medium" : "text-muted-foreground"}>{k}</span>
			<span className={`font-mono tabular-nums ${bold ? "font-medium" : ""}`}>
				{v}
			</span>
		</div>
	);
}

export default WithdrawPage;
