"use client";

import Link from "next/link";
import { Card, CardHead, PageHeader } from "@/components/page-primitives";
import { Button } from "@/components/ui/button";
import { ArrowRight, Wallet } from "lucide-react";

function WithdrawPage() {
	return (
		<div className="px-6 py-8 md:px-10 md:py-10">
			<PageHeader
				title="Withdraw"
				description="Withdrawals will appear here once your live vault balance and queue status are connected."
			/>

			<div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
				<Card>
					<div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
						<div className="mb-5 flex size-12 items-center justify-center rounded-full border border-border bg-background">
							<Wallet className="size-5 text-muted-foreground" />
						</div>
						<h2 className="text-xl font-semibold text-foreground">
							No live withdrawal data yet
						</h2>
						<p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
							This page will show your available withdrawal amount, any queued
							withdrawals, and settlement progress.
						</p>
					</div>
				</Card>

				<aside className="space-y-6">
					<Card>
						<CardHead title="What will show here" />
						<div className="space-y-3 text-sm text-muted-foreground">
							<p>Your withdrawable balance.</p>
							<p>Any pending withdrawal queue or settlement status.</p>
							<p>Confirmation once assets are returned to your wallet.</p>
						</div>
					</Card>

					<Button className="w-full" size="lg" asChild>
						<Link href="/dashboard">
							View live markets
							<ArrowRight className="ml-1 h-4 w-4" />
						</Link>
					</Button>
				</aside>
			</div>
		</div>
	);
}

export default WithdrawPage;
