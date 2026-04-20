import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardHead, PageHeader } from "@/components/page-primitives";
import { Stat } from "@/components/stat";
import { Button } from "@/components/ui/button";
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
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Wallet,
  Clock,
  Activity,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Vault · YieldPilot" },
      {
        name: "description",
        content:
          "Live vault overview: total value, idle vs allocated, current strategies, expected APY, and recent activity.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const v = useVault();
  const idle = idleValue(v);
  const deployed = deployedValue(v);
  const allocated = allocatedStrategies(v);
  const blendedApy = allocated.reduce(
    (acc, a) => acc + a.percent * a.strategy.apy,
    0,
  );

  if (!v.connected || v.vaultBalance === 0) {
    return <EmptyState />;
  }

  return (
    <div className="px-6 py-8 md:px-10 md:py-10">
      <PageHeader
        eyebrow="Vault overview"
        title="Good afternoon."
        description="A live view of your on-chain vault, allocations, and pending actions."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/withdraw">Withdraw</Link>
            </Button>
            <Button
              onClick={() => {
                if (!v.policy) return;
                vaultStore.setRecommendation(
                  generateRecommendation(v.policy.risk, v.policy.liquidity),
                );
              }}
              asChild
            >
              <Link to="/recommendation">
                <Sparkles className="mr-1 h-4 w-4" />
                Get recommendation
              </Link>
            </Button>
          </>
        }
      />

      {/* Stats */}
      <Card className="mt-10 p-0">
        <div className="grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-4 md:divide-y-0">
          <div className="p-6">
            <Stat label="Total Value" value={formatUsd(v.vaultBalance)} />
          </div>
          <div className="p-6">
            <Stat
              label="Idle (instant)"
              value={formatUsd(idle)}
              hint={formatPct(idle / Math.max(v.vaultBalance, 1))}
            />
          </div>
          <div className="p-6">
            <Stat
              label="Allocated"
              value={formatUsd(deployed)}
              hint={formatPct(deployed / Math.max(v.vaultBalance, 1))}
            />
          </div>
          <div className="p-6">
            <Stat
              label="Blended APY"
              value={`${blendedApy.toFixed(2)}%`}
              hint={
                v.policy
                  ? `${RISK_PRESETS[v.policy.risk].label} policy`
                  : "No policy"
              }
            />
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Allocations */}
        <Card>
          <CardHead
            title="Current allocations"
            sub="Funds are held by vault logic. Only whitelisted adapters can be called."
          />

          {/* Bar */}
          <div className="mb-5 flex h-2 overflow-hidden rounded-full border hairline">
            <div
              className="bg-foreground"
              style={{
                width: `${(idle / Math.max(v.vaultBalance, 1)) * 100}%`,
              }}
            />
            {allocated.map((a, i) => (
              <div
                key={a.strategyId}
                className="border-l border-background"
                style={{
                  width: `${a.percent * 100}%`,
                  backgroundColor:
                    i % 2 === 0
                      ? "var(--color-chart-3)"
                      : "var(--color-chart-2)",
                }}
              />
            ))}
          </div>

          <div className="divide-y divide-border overflow-hidden rounded-lg border hairline">
            <Row
              name="Idle Reserve"
              sub="Vault Cash · USDC"
              percent={idle / Math.max(v.vaultBalance, 1)}
              usd={idle}
              apy="0.00%"
              liquidity="Instant"
            />
            {allocated.map((a) => (
              <Row
                key={a.strategyId}
                name={a.strategy.name}
                sub={a.strategy.protocol}
                percent={a.percent}
                usd={a.usd}
                apy={`${a.strategy.apy.toFixed(2)}%`}
                liquidity={a.strategy.liquidity}
              />
            ))}
          </div>
        </Card>

        {/* Side */}
        <div className="space-y-6">
          <Card>
            <CardHead title="Wallet" />
            <div className="space-y-4">
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
                <span className="font-mono text-xs">Arbitrum Sepolia</span>
              </div>
              {v.pendingWithdraw && (
                <div className="rounded-lg border hairline bg-surface p-3">
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
            <ul className="space-y-3">
              {v.history.length === 0 && (
                <li className="text-sm text-muted-foreground">No activity yet.</li>
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
}: {
  name: string;
  sub: string;
  percent: number;
  usd: number;
  apy: string;
  liquidity: string;
}) {
  return (
    <div className="grid grid-cols-12 items-center gap-4 p-4">
      <div className="col-span-5">
        <div className="font-medium">{name}</div>
        <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {sub}
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
        Configure a policy and make your first USDC deposit to begin. The agent will then
        recommend a policy-compliant allocation.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link to="/policy">
            Create vault
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/">Back to overview</Link>
        </Button>
      </div>

      <div className="mt-14 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        {STRATEGIES.filter((s) => s.id !== "idle").map((s) => (
          <div
            key={s.id}
            className="rounded-xl border hairline bg-card p-5 text-left"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{s.name}</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {s.protocol}
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="font-display text-2xl font-semibold tabular-nums">
                {s.apy.toFixed(2)}%
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {s.liquidity}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function timeAgo(ts: number) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
