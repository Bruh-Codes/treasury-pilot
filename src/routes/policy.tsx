import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  LIQUIDITY_PRESETS,
  RISK_PRESETS,
  STRATEGIES,
  type LiquidityPreset,
  type RiskPreset,
} from "@/lib/yieldpilot-data";
import { vaultStore, useVault } from "@/lib/vault-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { ArrowRight, Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHead, PageHeader } from "@/components/page-primitives";

export const Route = createFileRoute("/policy")({
  head: () => ({
    meta: [
      { title: "Policy · YieldPilot" },
      {
        name: "description",
        content:
          "Configure your vault policy: risk preset, liquidity preference, and per-strategy allocation caps.",
      },
    ],
  }),
  component: PolicyPage,
});

function PolicyPage() {
  const v = useVault();
  const router = useRouter();
  const [risk, setRisk] = useState<RiskPreset>(v.policy?.risk ?? "balanced");
  const [liquidity, setLiquidity] = useState<LiquidityPreset>(
    v.policy?.liquidity ?? "instant",
  );
  const [perStrategy, setPerStrategy] = useState<number>(
    Math.round((v.policy?.perStrategyMax ?? RISK_PRESETS[risk].perStrategyMax) * 100),
  );
  const [depositAmount, setDepositAmount] = useState<string>("10000");

  function save() {
    if (!v.connected) {
      vaultStore.connect();
    }
    vaultStore.setPolicy({ risk, liquidity, perStrategyMax: perStrategy / 100 });
    const amt = Number(depositAmount);
    if (amt > 0 && amt <= v.walletUsdc) {
      vaultStore.deposit(amt);
      toast.success("Policy saved & USDC deposited");
    } else {
      toast.success("Policy saved");
    }
    router.navigate({ to: "/recommendation" });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <PageHeader
        eyebrow="Step 1 of 3"
        title="Configure your vault policy"
        description="Set the rules the vault enforces. The agent only recommends allocations that satisfy this policy."
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Risk */}
          <Card>
            <CardHead title="Risk preset" sub="How aggressively to deploy idle capital." />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(Object.keys(RISK_PRESETS) as RiskPreset[]).map((k) => {
                const p = RISK_PRESETS[k];
                const active = risk === k;
                return (
                  <button
                    key={k}
                    onClick={() => {
                      setRisk(k);
                      setPerStrategy(Math.round(p.perStrategyMax * 100));
                    }}
                    className={cn(
                      "group relative flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all",
                      active
                        ? "border-foreground bg-accent"
                        : "hairline hover:border-foreground/40",
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-medium">{p.label}</span>
                      {active && <Check className="h-4 w-4" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                    <div className="mt-2 flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      <span>Idle {(p.idle * 100).toFixed(0)}%</span>
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                      <span>Max {(p.perStrategyMax * 100).toFixed(0)}%/strat</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Liquidity */}
          <Card>
            <CardHead
              title="Liquidity preference"
              sub="The maximum unwind window you tolerate per strategy."
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(Object.keys(LIQUIDITY_PRESETS) as LiquidityPreset[]).map((k) => {
                const p = LIQUIDITY_PRESETS[k];
                const active = liquidity === k;
                return (
                  <button
                    key={k}
                    onClick={() => setLiquidity(k)}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all",
                      active
                        ? "border-foreground bg-accent"
                        : "hairline hover:border-foreground/40",
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-medium">{p.label}</span>
                      {active && <Check className="h-4 w-4" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Per-strategy cap */}
          <Card>
            <CardHead
              title="Maximum allocation per strategy"
              sub="Hard cap enforced by the vault contract."
            />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">0%</span>
                <span className="font-display text-2xl font-semibold tabular-nums">
                  {perStrategy}%
                </span>
                <span className="font-mono text-xs text-muted-foreground">100%</span>
              </div>
              <Slider
                value={[perStrategy]}
                onValueChange={([n]) => setPerStrategy(n)}
                min={10}
                max={100}
                step={5}
              />
            </div>
          </Card>

          {/* Whitelist preview */}
          <Card>
            <CardHead
              title="Whitelisted strategies"
              sub="Only these adapters can ever be called by the vault."
            />
            <div className="divide-y divide-border overflow-hidden rounded-lg border hairline">
              {STRATEGIES.filter((s) => s.id !== "idle").map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      {s.protocol}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <Cell label="APY" value={`${s.apy.toFixed(2)}%`} />
                    <Cell label="Liquidity" value={s.liquidity} />
                    <Cell label="Risk" value={s.risk} />
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <Card>
            <CardHead title="Initial deposit" sub="USDC to fund the vault." />
            <div className="space-y-3">
              <div className="relative">
                <Input
                  inputMode="decimal"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="h-12 pr-16 font-mono text-lg tabular-nums"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">
                  USDC
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Wallet balance</span>
                <span className="font-mono tabular-nums">
                  {v.walletUsdc.toLocaleString()} USDC
                </span>
              </div>
              <div className="flex gap-2">
                {[1000, 5000, 10000, "Max"].map((p) => (
                  <button
                    key={String(p)}
                    onClick={() =>
                      setDepositAmount(String(p === "Max" ? v.walletUsdc : p))
                    }
                    className="flex-1 rounded-md border hairline px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHead title="Summary" />
            <dl className="space-y-2 text-sm">
              <Row k="Risk" v={RISK_PRESETS[risk].label} />
              <Row k="Liquidity" v={LIQUIDITY_PRESETS[liquidity].label} />
              <Row k="Per-strategy cap" v={`${perStrategy}%`} />
              <Row
                k="Idle reserve"
                v={`${(RISK_PRESETS[risk].idle * 100).toFixed(0)}%`}
              />
            </dl>
          </Card>

          <Button onClick={save} className="w-full" size="lg">
            Save policy & continue
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            By continuing, you authorize the vault to enforce this policy on-chain. The
            agent never moves funds without your approval.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-mono tabular-nums">{v}</dd>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="hidden flex-col items-end sm:flex">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-sm tabular-nums">{value}</span>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      {eyebrow && (
        <div className="mb-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {eyebrow}
        </div>
      )}
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      {description && (
        <p className="mt-3 text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border hairline bg-card p-6 shadow-[0_1px_0_0_var(--color-hairline)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}
