"use client";

import Link from "next/link";
import { Card, CardHead, PageHeader } from "@/components/page-primitives";
import { Stat } from "@/components/stat";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	allocatedStrategies,
	deployedValue,
	idleValue,
	useVault,
	vaultStore,
} from "@/lib/vault-store";
import {
	RISK_PRESETS,
	STRATEGIES,
	formatPct,
	formatUsd,
	generateRecommendation,
} from "@/lib/yieldpilot-data";
import { PRIMARY_CHAIN_LABEL } from "@/lib/app-chains";
import {
	Activity,
	ArrowRight,
	ArrowUpRight,
	CircleHelp,
	Clock,
	Sparkles,
	Wallet,
} from "lucide-react";

const AAVE_TOKEN_ICONS: Record<string, string> = {
	usdc: "https://raw.githubusercontent.com/aurora-is-near/bridge-assets/master/tokens/usdc.svg",
	compound:
		"https://raw.githubusercontent.com/aurora-is-near/bridge-assets/master/tokens/comp.svg",
	aave: "https://raw.githubusercontent.com/aurora-is-near/bridge-assets/master/tokens/aave.svg",
	fallback:
		"https://raw.githubusercontent.com/aurora-is-near/bridge-assets/master/tokens/usdc.svg",
};

function DashboardPage() {
	const v = useVault();
	const idle = idleValue(v);
	const deployed = deployedValue(v);
	const allocated = allocatedStrategies(v);
	const blendedApy = allocated.reduce(
		(acc, allocation) => acc + allocation.percent * allocation.strategy.apy,
		0,
	);

	if (!v.connected || v.vaultBalance === 0) {
		return <EmptyState />;
	}

	return (
		<div className="px-6 py-8 md:px-7 md:py-9">
			<PageHeader
				eyebrow="Protocol vault overview"
				title="Good afternoon."
				description="A live view of the shared vault contract, your idle wallet balance, and how protocol capital is currently deployed."
				actions={
					<>
						<Button
							variant="outline"
							className="h-11 rounded-full px-5 text-sm"
							asChild
						>
							<Link href="/withdraw">Withdraw</Link>
						</Button>
					</>
				}
			/>

			<Card className="mt-7 p-0">
				<div className="grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-4 md:divide-y-0">
					<div className="p-4">
						<Stat label="Protocol TVL" value={formatUsd(v.vaultBalance)} />
					</div>
					<div className="p-4">
						<Stat
							label="Your idle assets"
							value={formatUsd(idle)}
							hint={`${formatPct(idle / Math.max(v.vaultBalance, 1))} of your assets are sitting idle`}
						/>
					</div>
					<div className="p-4">
						<Stat
							label="Deployed capital"
							value={formatUsd(deployed)}
							hint={`${formatPct(deployed / Math.max(v.vaultBalance, 1))} of your assets deployed into strategies`}
						/>
					</div>
					<div className="p-4">
						<Stat
							label={
								<span className="inline-flex items-center gap-1.5">
									Blended APY
									<Tooltip>
										<TooltipTrigger asChild>
											<button
												type="button"
												className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
												aria-label="Explain blended APY"
											>
												<CircleHelp className="size-3.5" />
											</button>
										</TooltipTrigger>
										<TooltipContent sideOffset={6}>
											Weighted average APY across all deployed strategies, based
											on how much capital each strategy currently holds.
										</TooltipContent>
									</Tooltip>
								</span>
							}
							value={`${blendedApy.toFixed(2)}%`}
							hint={
								v.policy
									? `${RISK_PRESETS[v.policy.risk].label} policy mix across deployed funds`
									: "No active policy set"
							}
						/>
					</div>
				</div>
			</Card>

			<div className="mt-5 grid gap-4 lg:grid-cols-[1fr_300px]">
				<Card>
					<CardHead
						title="Current allocations"
						sub="Funds are held by vault logic. Only whitelisted adapters can be called."
					/>

					<div className="mb-3 flex h-2 overflow-hidden rounded-full border hairline bg-background">
						<div
							className="bg-[var(--color-chart-1)]"
							style={{
								width: `${(idle / Math.max(v.vaultBalance, 1)) * 100}%`,
							}}
						/>
						{allocated.map((allocation, index) => (
							<div
								key={allocation.strategyId}
								className="border-l border-background"
								style={{
									width: `${allocation.percent * 100}%`,
									backgroundColor:
										index % 3 === 0
											? "var(--color-chart-2)"
											: index % 3 === 1
												? "var(--color-chart-3)"
												: "var(--color-chart-4)",
								}}
							/>
						))}
					</div>

					<div className="overflow-hidden rounded-[18px] border hairline">
						<div className="grid grid-cols-12 items-center gap-4 border-b border-border px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
							<div className="col-span-5">Asset</div>
							<div className="col-span-2 text-right">Allocation</div>
							<div className="col-span-2 text-right">Balance</div>
							<div className="col-span-1 text-right">APY</div>
							<div className="col-span-2 text-right">Liquidity</div>
						</div>
						<div className="divide-y divide-border">
							<Row
								name="Idle Reserve"
								sub="Vault Cash - USDC"
								percent={idle / Math.max(v.vaultBalance, 1)}
								usd={idle}
								apy="0.00%"
								liquidity="Instant"
								iconSrc={AAVE_TOKEN_ICONS.usdc}
							/>
							{allocated.map((allocation) => (
								<Row
									key={allocation.strategyId}
									name={allocation.strategy.name}
									sub={allocation.strategy.protocol}
									percent={allocation.percent}
									usd={allocation.usd}
									apy={`${allocation.strategy.apy.toFixed(2)}%`}
									liquidity={allocation.strategy.liquidity}
									iconSrc={
										allocation.strategyId.includes("compound")
											? AAVE_TOKEN_ICONS.compound
											: AAVE_TOKEN_ICONS.aave
									}
								/>
							))}
						</div>
					</div>
				</Card>

				<div className="space-y-4">
					<Card>
						<CardHead title="Wallet" />
						<div className="flex flex-col gap-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Wallet className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm">USDC available</span>
								</div>
								<span className="font-mono text-sm tabular-nums">
									{formatUsd(v.walletUsdc)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Activity className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm">Network</span>
								</div>
								<span className="font-mono text-xs">{PRIMARY_CHAIN_LABEL}</span>
							</div>
							{v.pendingWithdraw && (
								<div className="rounded-[16px] border hairline bg-background p-3">
									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										<Clock className="h-3.5 w-3.5" />
										Pending unwind
									</div>
									<div className="mt-1 flex items-baseline justify-between">
										<span className="font-mono text-sm tabular-nums">
											{formatUsd(v.pendingWithdraw.amount)}
										</span>
										<span className="font-mono text-[11px] text-muted-foreground">
											ETA {v.pendingWithdraw.eta}
										</span>
									</div>
								</div>
							)}
						</div>
					</Card>

					<Card>
						<CardHead title="Activity" />
						<ul className="flex flex-col gap-3">
							{v.history.length === 0 && (
								<li className="text-sm text-muted-foreground">
									No activity yet.
								</li>
							)}
							{v.history.slice(0, 6).map((h) => (
								<li
									key={h.ts}
									className="flex items-start justify-between gap-4 text-sm"
								>
									<span>{h.label}</span>
									<span className="shrink-0 font-mono text-[11px] text-muted-foreground">
										{timeAgo(h.ts)}
									</span>
								</li>
							))}
						</ul>
					</Card>
				</div>
			</div>
		</div>
	);
}

function Row({
	name,
	sub,
	percent,
	usd,
	apy,
	liquidity,
	iconSrc,
}: {
	name: string;
	sub: string;
	percent: number;
	usd: number;
	apy: string;
	liquidity: string;
	iconSrc: string;
}) {
	return (
		<div className="grid grid-cols-12 items-center gap-4 px-4 py-3.5">
			<div className="col-span-5">
				<div className="flex items-center gap-3">
					{/* Using Aave's public interface token assets keeps the icon treatment aligned with the reference UI. */}
					<img
						src={iconSrc}
						alt={`${name} token icon`}
						className="size-9 rounded-full bg-background object-cover"
						onError={(event) => {
							event.currentTarget.src = AAVE_TOKEN_ICONS.fallback;
						}}
					/>
					<div>
						<div className="text-[14px] font-medium">{name}</div>
						<div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
							{sub}
						</div>
					</div>
				</div>
			</div>
			<div className="col-span-2 text-right">
				<div className="font-mono text-sm tabular-nums">
					{(percent * 100).toFixed(1)}%
				</div>
			</div>
			<div className="col-span-2 text-right">
				<div className="font-mono text-sm tabular-nums">{formatUsd(usd)}</div>
			</div>
			<div className="col-span-1 text-right">
				<div className="font-mono text-sm tabular-nums">{apy}</div>
			</div>
			<div className="col-span-2 text-right">
				<div className="font-mono text-[11px] text-muted-foreground">
					{liquidity}
				</div>
			</div>
		</div>
	);
}

function EmptyState() {
	return (
		<div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
			<div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full border hairline bg-surface">
				<Wallet className="h-5 w-5" />
			</div>
			<h1 className="font-display text-3xl font-semibold tracking-tight">
				No vault yet
			</h1>
			<p className="mt-3 max-w-md text-muted-foreground">
				Make your first USDC deposit to begin. YieldPilot will use the funds in
				the vault to prepare the next recommendation flow from deposit.
			</p>
			<div className="mt-8 flex gap-3">
				<Button asChild>
					<Link href="/">
						Deposit funds
						<ArrowRight className="ml-1 h-4 w-4" />
					</Link>
				</Button>
				<Button variant="outline" asChild>
					<Link href="/">Back to overview</Link>
				</Button>
			</div>

			<div className="mt-14 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
				{STRATEGIES.filter((s) => s.id !== "idle").map((strategy) => (
					<div
						key={strategy.id}
						className="rounded-xl border hairline bg-card p-5 text-left"
					>
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-3">
								<img
									src={
										strategy.id.includes("compound")
											? AAVE_TOKEN_ICONS.compound
											: AAVE_TOKEN_ICONS.aave
									}
									alt={`${strategy.name} token icon`}
									className="size-9 rounded-full bg-background object-cover"
									onError={(event) => {
										event.currentTarget.src = AAVE_TOKEN_ICONS.fallback;
									}}
								/>
								<span className="font-medium">{strategy.name}</span>
							</div>
							<ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
						</div>
						<div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
							{strategy.protocol}
						</div>
						<div className="mt-4 flex items-baseline justify-between">
							<span className="font-display text-2xl font-semibold tabular-nums">
								{strategy.apy.toFixed(2)}%
							</span>
							<span className="font-mono text-[11px] text-muted-foreground">
								{strategy.liquidity}
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function timeAgo(ts: number) {
	const seconds = Math.max(1, Math.floor((Date.now() - ts) / 1000));
	if (seconds < 60) return `${seconds}s ago`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

export default DashboardPage;
