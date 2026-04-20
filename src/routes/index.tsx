import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Cpu, Wallet, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "YieldPilot — AI Treasury Copilot on Arbitrum" },
      {
        name: "description",
        content:
          "Deposit USDC into a policy-controlled vault. An off-chain agent recommends allocations across whitelisted Arbitrum yield strategies. You approve. You withdraw anytime.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b hairline">
        <div className="absolute inset-0 grid-bg opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border hairline bg-surface px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
              Arbitrum Buildathon · MVP
            </div>
            <h1 className="font-display text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
              An AI treasury copilot for{" "}
              <span className="relative whitespace-nowrap">
                idle stablecoins
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-foreground" />
              </span>
              .
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              Deposit USDC into a policy-controlled vault on Arbitrum. An off-chain agent
              recommends how to allocate across whitelisted strategies. You approve. You
              withdraw on demand.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link to="/policy">
                  Launch app
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/dashboard">View vault</Link>
              </Button>
            </div>

            <div className="mx-auto mt-14 grid max-w-xl grid-cols-3 gap-px overflow-hidden rounded-xl border hairline bg-hairline text-left">
              {[
                ["$0.00", "TVL · demo"],
                ["3", "Whitelisted strategies"],
                ["100%", "User-controlled"],
              ].map(([v, l]) => (
                <div key={l} className="bg-background p-5">
                  <div className="font-display text-xl font-semibold tracking-tight tabular-nums">
                    {v}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b hairline">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <div className="mb-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              How it works
            </div>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Off-chain intelligence. On-chain guardrails.
            </h2>
            <p className="mt-4 text-muted-foreground">
              The agent never custodies funds and never moves capital without your
              approval. The vault enforces every rule on-chain.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border hairline bg-hairline md:grid-cols-4">
            {[
              {
                icon: Wallet,
                step: "01",
                title: "Deposit USDC",
                body: "Deposit into an Arbitrum vault. Funds remain owned by vault logic and withdrawable by you.",
              },
              {
                icon: ShieldCheck,
                step: "02",
                title: "Set policy",
                body: "Pick risk and liquidity presets. The vault enforces whitelist and per-strategy caps.",
              },
              {
                icon: Cpu,
                step: "03",
                title: "Get a recommendation",
                body: "The agent ranks whitelisted strategies and explains an allocation plan in plain English.",
              },
              {
                icon: BarChart3,
                step: "04",
                title: "Approve & monitor",
                body: "Approve to execute. Monitor positions. Withdraw anytime — idle first, unwind if needed.",
              },
            ].map((s) => (
              <div key={s.step} className="flex flex-col gap-3 bg-background p-6">
                <div className="flex items-center justify-between">
                  <s.icon className="h-4 w-4 text-foreground" />
                  <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
                    {s.step}
                  </span>
                </div>
                <div className="font-display text-base font-semibold">{s.title}</div>
                <p className="text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="border-b hairline">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2">
          <div>
            <div className="mb-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Principles
            </div>
            <h2 className="font-display text-3xl font-semibold tracking-tight">
              Designed for treasury operators, not degens.
            </h2>
            <p className="mt-4 text-muted-foreground">
              YieldPilot is built for startup founders, DAO operators, and small treasury
              teams holding idle USDC who want safer yield without manually monitoring
              protocols all day.
            </p>
          </div>
          <ul className="grid gap-4">
            {[
              ["Funds are never locked.", "Withdrawals come from idle balance first; remaining positions unwind on supported strategies."],
              ["Whitelist enforcement.", "Only pre-approved adapters can be called. Per-strategy caps are enforced on-chain."],
              ["Explainable allocations.", "Every recommendation comes with rationale, expected APY, and liquidity notes."],
              ["No autonomous trading.", "The agent recommends. You approve. The vault executes within policy."],
            ].map(([t, d]) => (
              <li
                key={t}
                className="flex gap-4 rounded-lg border hairline bg-card p-5"
              >
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
                <div>
                  <div className="font-medium">{t}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{d}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-foreground text-background">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-16 md:flex-row md:items-center">
          <div>
            <h3 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Ready to put idle USDC to work?
            </h3>
            <p className="mt-2 max-w-xl text-sm text-background/70">
              Connect a wallet, set a policy, and review your first recommendation in under
              two minutes.
            </p>
          </div>
          <Button
            size="lg"
            variant="outline"
            className="border-background/30 bg-transparent text-background hover:bg-background hover:text-foreground"
            asChild
          >
            <Link to="/policy">
              Configure vault
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
