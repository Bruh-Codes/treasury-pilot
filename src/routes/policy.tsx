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
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Check,
  Clock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardHead, PageHeader } from "@/components/page-primitives";

export const Route = createFileRoute("/policy")({
  head: () => ({
    meta: [
      { title: "Set up your vault · YieldPilot" },
      {
        name: "description",
        content:
          "Pick how cautious you want to be and how quickly you need access to your money. YieldPilot handles the rest.",
      },
    ],
  }),
  component: PolicyPage,
});

// Friendly plan cards — map to the underlying risk/liquidity presets.
type Plan = {
  id: RiskPreset;
  liquidity: LiquidityPreset;
  name: string;
  tagline: string;
  icon: typeof ShieldCheck;
  estApy: string;
  points: string[];
};

const PLANS: Plan[] = [
  {
    id: "conservative",
    liquidity: "instant",
    name: "Keep it safe",
    tagline: "Steady returns. Your money, always available.",
    icon: ShieldCheck,
    estApy: "~3.5%",
    points: [
      "Lower-risk lending markets only",
      "Withdraw anytime — no waiting",
      "Half your balance stays as cash",
    ],
  },
  {
    id: "balanced",
    liquidity: "instant",
    name: "Balanced",
    tagline: "A mix of safety and yield. The popular choice.",
    icon: Sparkles,
    estApy: "~4.8%",
    points: [
      "Split across trusted lending markets",
      "Withdraw anytime — no waiting",
      "Smaller cash buffer, more earning",
    ],
  },
  {
    id: "yield",
    liquidity: "weekly",
    name: "Earn more",
    tagline: "Higher yield. Small wait if you withdraw a lot.",
    icon: TrendingUp,
    estApy: "~7.2%",
    points: [
      "Adds one higher-yield strategy",
      "Instant withdraw from cash buffer",
      "Up to 3 days to unwind the rest",
    ],
  },
];

function PolicyPage() {
  const v = useVault();
  const router = useRouter();
  const [planId, setPlanId] = useState<RiskPreset>(v.policy?.risk ?? "balanced");
  const [depositAmount, setDepositAmount] = useState<string>("10000");

  const plan = PLANS.find((p) => p.id === planId)!;
  const amt = Number(depositAmount) || 0;
  const preset = RISK_PRESETS[plan.id];
  const idleUsd = amt * preset.idle;
  const deployedUsd = amt - idleUsd;

  function save() {
    if (!v.connected) vaultStore.connect();
    vaultStore.setPolicy({
      risk: plan.id,
      liquidity: plan.liquidity,
      perStrategyMax: preset.perStrategyMax,
    });
    if (amt > 0 && amt <= v.walletUsdc) {
      vaultStore.deposit(amt);
      toast.success(`Deposited ${amt.toLocaleString()} USDC · ${plan.name} plan`);
    } else {
      toast.success(`${plan.name} plan saved`);
    }
    router.navigate({ to: "/recommendation" });
  }

  return (
    <div className="px-6 py-8 md:px-10 md:py-10">
      <PageHeader
        eyebrow="Step 1 of 3 · Quick setup"
        title="How would you like to earn?"
        description="Pick the style that fits you. You can change it anytime — and you're always in control of your money."
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Plan cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {PLANS.map((p) => {
              const active = planId === p.id;
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  onClick={() => setPlanId(p.id)}
                  className={cn(
                    "group relative flex flex-col gap-4 rounded-xl border p-5 text-left transition-all",
                    active
                      ? "border-foreground bg-accent shadow-[0_1px_0_0_var(--color-hairline)]"
                      : "hairline hover:border-foreground/40",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border hairline bg-background">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-muted-foreground/30",
                      )}
                    >
                      {active && <Check className="h-3 w-3" />}
                    </div>
                  </div>

                  <div>
                    <div className="font-display text-lg font-semibold">{p.name}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
                  </div>

                  <div className="flex items-baseline gap-2 border-t hairline pt-4">
                    <span className="font-display text-2xl font-semibold tabular-nums">
                      {p.estApy}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      est. yearly
                    </span>
                  </div>

                  <ul className="space-y-2 text-sm">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2 text-muted-foreground">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/60" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {/* What this means — plain language */}
          <Card>
            <CardHead
              title={`What "${plan.name}" means for your money`}
              sub="In plain English, no jargon."
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Explain
                icon={Wallet}
                label="Always cash"
                value={`${(preset.idle * 100).toFixed(0)}%`}
                sub="Ready to withdraw instantly"
              />
              <Explain
                icon={TrendingUp}
                label="Put to work"
                value={`${((1 - preset.idle) * 100).toFixed(0)}%`}
                sub="Earning yield in trusted markets"
              />
              <Explain
                icon={Clock}
                label="Withdraw time"
                value={
                  plan.liquidity === "instant"
                    ? "Instant"
                    : plan.liquidity === "weekly"
                      ? "Up to 3 days"
                      : "Flexible"
                }
                sub={
                  plan.liquidity === "instant"
                    ? "Any time, no delays"
                    : "Only if you pull a large amount"
                }
              />
            </div>
          </Card>

          {/* Where it goes */}
          <Card>
            <CardHead
              title="Where your money can go"
              sub="These are the only places YieldPilot is allowed to use. Nothing else."
            />
            <div className="divide-y divide-border overflow-hidden rounded-lg border hairline">
              {STRATEGIES.filter((s) => s.id !== "idle").map((s) => {
                const allowed =
                  plan.liquidity === "flexible" ||
                  (plan.liquidity === "weekly" && s.liquidity !== "7 days") ||
                  (plan.liquidity === "instant" && s.liquidity === "Instant");
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "flex items-center justify-between gap-4 p-4 transition-opacity",
                      !allowed && "opacity-40",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.name}</span>
                        {allowed ? (
                          <span className="rounded-full border hairline px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                            Allowed
                          </span>
                        ) : (
                          <span className="rounded-full border hairline px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                            Not in this plan
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                        {s.protocol}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-6">
                      <MiniCell label="Yield" value={`${s.apy.toFixed(2)}%`} />
                      <MiniCell label="Access" value={s.liquidity} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Sidebar: deposit + summary */}
        <aside className="space-y-6">
          <Card>
            <CardHead title="How much to start with?" sub="You can add or withdraw anytime." />
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
                <span>In your wallet</span>
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
            <CardHead title="Your setup" />
            <dl className="space-y-3 text-sm">
              <Row k="Plan" v={plan.name} />
              <Row
                k="Kept as cash"
                v={`${idleUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDC`}
              />
              <Row
                k="Put to work"
                v={`${deployedUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDC`}
              />
              <Row
                k="Est. yearly earnings"
                v={`~${((amt * parseFloat(plan.estApy.replace(/[^0-9.]/g, ""))) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} USDC`}
              />
            </dl>
          </Card>

          <Button onClick={save} className="w-full" size="lg">
            Continue
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            You'll see exactly where your money goes before anything happens. Nothing
            moves without your approval.
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

function MiniCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="hidden flex-col items-end sm:flex">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-sm tabular-nums">{value}</span>
    </div>
  );
}

function Explain({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg border hairline p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="font-mono text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-2 font-display text-xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
