"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardHead, PageHeader } from "@/components/page-primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	allocatedStrategies,
	idleValue,
	useVault,
	vaultStore,
} from "@/lib/vault-store";
import { formatUsd } from "@/lib/yieldpilot-data";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

function WithdrawPage() {
	const v = useVault();
	const router = useRouter();
	const [amount, setAmount] = useState("");
	const idle = idleValue(v);
	const allocated = allocatedStrategies(v);

	const amt = Number(amount) || 0;
	const fromIdle = Math.min(amt, idle);
	const needsUnwind = Math.max(0, amt - idle);

	function submit() {
		if (amt <= 0 || amt > v.vaultBalance) {
			toast.error("Invalid amount");
			return;
		}

		vaultStore.withdraw(amt);
		if (needsUnwind > 0) {
			toast.message("Unwind initiated", {
				description: `~12 hours to settle ${formatUsd(needsUnwind)}.`,
			});
		} else {
			toast.success(`Withdrew ${formatUsd(amt)}`);
		}

		setAmount("");
		router.push("/dashboard");
	}

	if (v.vaultBalance === 0) {
		return (
			<div className="mx-auto max-w-2xl px-6 py-24 text-center">
				<h1 className="font-display text-3xl font-semibold">
					Nothing to withdraw
				</h1>
				<p className="mt-3 text-muted-foreground">
					Your vault is empty. Deposit into the shared vault to begin.
				</p>
				<Button className="mt-6" asChild>
					<Link href="/">Go to deposit</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="px-6 py-8 md:px-10 md:py-10">
			<PageHeader
				eyebrow="Withdraw"
				title="Withdraw your assets"
				description="Available funds are sent first. The rest is settled after active positions unwind."
			/>

			<div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
				<div className="space-y-6">
					<Card>
						<CardHead title="Amount" />
						<div className="space-y-4">
							<div className="relative">
								<Input
									inputMode="decimal"
									value={amount}
									onChange={(e) => setAmount(e.target.value)}
									placeholder="0.00"
									className="h-16 pr-20 font-display text-2xl font-semibold tabular-nums"
								/>
								<span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">
									USDC
								</span>
							</div>
							<div className="flex items-center justify-between text-xs text-muted-foreground">
								<span>Vault balance</span>
								<span className="font-mono tabular-nums">
									{formatUsd(v.vaultBalance)}
								</span>
							</div>
							<div className="flex gap-2">
								{[0.25, 0.5, 0.75, 1].map((p) => (
									<button
										key={p}
										onClick={() => setAmount((v.vaultBalance * p).toFixed(2))}
										className="flex-1 rounded-md border hairline px-2 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
									>
										{p === 1 ? "Max" : `${p * 100}%`}
									</button>
								))}
							</div>
						</div>
					</Card>

					{v.pendingWithdraw && (
						<Card>
							<CardHead
								title="Pending unwind"
								sub="Waiting for strategies to settle."
							/>
							<div className="flex items-center justify-between rounded-lg border hairline bg-surface p-4">
								<div>
									<div className="font-display text-2xl font-semibold tabular-nums">
										{formatUsd(v.pendingWithdraw.amount)}
									</div>
									<div className="font-mono text-[11px] text-muted-foreground">
										ETA {v.pendingWithdraw.eta}
									</div>
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										vaultStore.finalizeUnwind();
										toast.success("Unwind complete - USDC sent to wallet");
									}}
								>
									Simulate settlement
								</Button>
							</div>
						</Card>
					)}
				</div>

				<aside className="space-y-6">
					<Card>
						<CardHead title="Settlement summary" />
						<div className="space-y-3 text-sm">
							<RowK k="Available now" v={formatUsd(fromIdle)} />
							<RowK k="Needs unwind" v={formatUsd(needsUnwind)} />
							<RowK
								k="Est. time"
								v={needsUnwind > 0 ? "~12 hours" : "Instant"}
								bold
							/>
						</div>
					</Card>

					<Button
						className="w-full"
						size="lg"
						onClick={submit}
						disabled={amt <= 0 || amt > v.vaultBalance}
					>
						{needsUnwind > 0 ? "Initiate withdraw" : "Withdraw now"}
						<ArrowRight className="ml-1 h-4 w-4" />
					</Button>
					<p className="text-center text-[11px] text-muted-foreground">
						You receive the same asset back. YieldPilot handles the unwind for
						you.
					</p>
				</aside>
			</div>
		</div>
	);
}

function RowK({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
	return (
		<div className="flex items-center justify-between">
			<span className={bold ? "font-medium" : "text-muted-foreground"}>
				{k}
			</span>
			<span className={`font-mono tabular-nums ${bold ? "font-medium" : ""}`}>
				{v}
			</span>
		</div>
	);
}

export default WithdrawPage;
