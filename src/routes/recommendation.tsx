import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Card, CardHead, PageHeader } from "@/components/page-primitives";
import { Button } from "@/components/ui/button";
import { useVault, vaultStore } from "@/lib/vault-store";
import {
  RISK_PRESETS,
  STRATEGIES,
  formatPct,
  formatUsd,
  generateRecommendation,
} from "@/lib/yieldpilot-data";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/recommendation")({
  head: () => ({
    meta: [
      { title: "Recommendation · YieldPilot" },
      {
        name: "description",
        content:
          "Review the agent's policy-compliant allocation plan, expected APY, risk, and rationale before approving execution.",
      },
    ],
  }),
  component: RecommendationPage,
});

function RecommendationPage() {
  const v = useVault();
  const router = useRouter();

  const rec = useMemo(() => {
    if (!v.policy) return null;
    return v.pendingRecommendation ?? generateRecommendation(v.policy.risk, v.policy.liquidity);
  }, [v.policy, v.pendingRecommendation]);

  useEffect(() => {
    if (v.policy && !v.pendingRecommendation) {
      vaultStore.setRecommendation(generateRecommendation(v.policy.risk, v.policy.liquidity));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!v.policy || !rec) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold">No policy set</h1>
        <p className="mt-3 text-muted-foreground">
          Configure your vault policy first so the agent knows what's allowed.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/policy">Configure policy</Link>
        </Button>
      </div>
    );
  }

  const blended = rec.expectedApy;

  function regenerate() {
    if (!v.policy) return;
    vaultStore.setRecommendation(
      generateRecommendation(v.policy.risk, v.policy.liquidity),
    );
    toast.message("New recommendation generated");
  }

  function approve() {
    vaultStore.approveRecommendation();
    toast.success("Allocation executed on-chain");
    router.navigate({ to: "/dashboard" });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <PageHeader
        eyebrow="Step 2 of 3"
        title="Agent recommendation"
        description="A policy-compliant allocation plan with explainable reasoning. You approve before any funds move."
        actions={
          <Button variant="outline" onClick={regenerate}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Regenerate
          </Button>
        }
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Summary card */}
          <Card>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Plan summary
              </span>
            </div>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight">
              {RISK_PRESETS[v.policy.risk].label} allocation across{" "}
              {rec.allocations.filter((a) => a.percent > 0.001).length} venues
            </h2>

            <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-lg border hairline bg-hairline">
              <Mini label="Expected APY" value={`${blended.toFixed(2)}%`} />
              <Mini label="Risk score" value={`${rec.riskScore.toFixed(1)} / 5`} />
              <Mini
                label="Idle reserve"
                value={formatPct(
                  rec.allocations.find((a) => a.strategyId === "idle")?.percent ?? 0,
                )}
              />
            </div>

            <div className="mt-6 rounded-lg border hairline bg-surface p-4">
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Why this recommendation
              </div>
              <p className="mt-2 text-sm leading-relaxed">{rec.rationale}</p>
            </div>

            {rec.warnings.length > 0 && (
              <div className="mt-4 space-y-2">
                {rec.warnings.map((w) => (
                  <div
                    key={w}
                    className="flex items-start gap-2 rounded-lg border hairline bg-surface p-3 text-sm"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Allocation table */}
          <Card>
            <CardHead
              title="Proposed allocation"
              sub="All venues are whitelisted and within per-strategy caps."
            />
            <div className="divide-y divide-border overflow-hidden rounded-lg border hairline">
              {rec.allocations
                .filter((a) => a.percent > 0.001)
                .map((a) => {
                  const s = STRATEGIES.find((x) => x.id === a.strategyId)!;
                  const usd = a.percent * v.vaultBalance;
                  return (
                    <div key={s.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-medium">{s.name}</div>
                          <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                            {s.protocol}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-xl font-semibold tabular-nums">
                            {(a.percent * 100).toFixed(1)}%
                          </div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {formatUsd(usd)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-foreground"
                          style={{ width: `${a.percent * 100}%` }}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                        <Meta k="APY" v={`${s.apy.toFixed(2)}%`} />
                        <Meta k="Liquidity" v={s.liquidity} />
                        <Meta k="Risk" v={s.risk} />
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {s.description}
                      </p>
                    </div>
                  );
                })}
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHead title="Policy in effect" />
            <dl className="space-y-2 text-sm">
              <Row k="Risk" v={RISK_PRESETS[v.policy.risk].label} />
              <Row k="Liquidity" v={v.policy.liquidity} />
              <Row k="Per-strategy cap" v={`${(v.policy.perStrategyMax * 100).toFixed(0)}%`} />
              <Row k="Vault balance" v={formatUsd(v.vaultBalance)} />
            </dl>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Guardrails
              </span>
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                "Whitelist enforced on-chain",
                "Per-strategy cap enforced on-chain",
                "Reentrancy protection",
                "Withdraw available at any time",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Button
            className="w-full"
            size="lg"
            onClick={approve}
            disabled={v.vaultBalance === 0}
          >
            Approve & execute
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Approving signs a single transaction. The vault performs the allocation
            atomically within policy.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-semibold tabular-nums">
        {value}
      </div>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border hairline bg-surface px-2.5 py-1.5">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {k}
      </div>
      <div className="font-mono tabular-nums">{v}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-mono tabular-nums capitalize">{v}</dd>
    </div>
  );
}
