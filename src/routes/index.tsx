import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ArrowRight, ArrowUpRight, Check, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { STRATEGIES, formatUsd } from "@/lib/yieldpilot-data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Markets · YieldPilot" },
      {
        name: "description",
        content:
          "Whitelisted yield strategies on Arbitrum. Deposit USDC into a policy-controlled vault and let the agent allocate within your rules.",
      },
    ],
  }),
  component: MarketsPage,
});

// Demo TVL/deposits per strategy (mocked for the demo)
const MARKET_META: Record<string, { tvl: number; deposits: string }> = {
  "aave-v3": { tvl: 184_300_000, deposits: "184.30M USDC" },
  "compound-v3": { tvl: 92_400_000, deposits: "92.40M USDC" },
  "gmx-glp": { tvl: 41_700_000, deposits: "41.70M USDC" },
};

function MarketsPage() {
  const [q, setQ] = useState("");
  const live = STRATEGIES.filter((s) => s.id !== "idle");
  const filtered = live.filter(
    (s) =>
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      s.protocol.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="px-6 py-8 md:px-10 md:py-10">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[34px] font-semibold tracking-tight">
          Deposit
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Deposit USDC into a policy-controlled vault on Arbitrum. The agent
          recommends allocations across whitelisted strategies — you approve
          before any funds move.
        </p>
      </div>

      {/* Filter row */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter assets"
            className="h-10 rounded-full border-hairline bg-surface pl-9 text-sm shadow-none"
          />
        </div>
        <FilterChip label="All Hubs" />
        <FilterChip label="All Markets" />
        <FilterChip label="In Wallet" toggle />
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Button asChild size="sm" variant="outline" className="h-10 rounded-full border-hairline bg-surface">
            <Link to="/dashboard">View vault</Link>
          </Button>
          <Button asChild size="sm" className="h-10 rounded-full">
            <Link to="/policy">
              Configure & deposit
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Strategies table */}
      <div className="mt-6 overflow-hidden rounded-xl border hairline bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-hairline hover:bg-transparent">
              <TableHead className="h-12 pl-6 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Asset
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Protocol
              </TableHead>
              <TableHead className="text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                APY
              </TableHead>
              <TableHead className="text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Liquidity
              </TableHead>
              <TableHead className="text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Risk
              </TableHead>
              <TableHead className="text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Total Deposits
              </TableHead>
              <TableHead className="pr-6 text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => {
              const meta = MARKET_META[s.id];
              return (
                <TableRow
                  key={s.id}
                  className="group cursor-pointer border-hairline transition-colors hover:bg-surface"
                >
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border hairline bg-surface font-mono text-[10px] font-semibold uppercase">
                        USDC
                      </div>
                      <div>
                        <div className="text-[14px] font-medium">{s.name}</div>
                        <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                          {s.asset}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-[13px] text-foreground/90">
                      {s.protocol}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-mono text-[14px] font-medium tabular-nums">
                      {s.apy.toFixed(2)}%
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-mono text-[12px] tabular-nums text-muted-foreground">
                      {s.liquidity}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <RiskTag risk={s.risk} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-mono text-[13px] tabular-nums">
                      {meta ? formatUsd(meta.tvl) : "—"}
                    </div>
                    <div className="font-mono text-[10.5px] text-muted-foreground">
                      {meta?.deposits}
                    </div>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="inline-flex items-center gap-1.5 rounded-full border hairline bg-surface px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      <Check className="h-3 w-3" />
                      Whitelisted
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Bottom callout */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Callout
          step="01"
          title="Policy-controlled"
          body="Risk and liquidity presets are enforced by the vault. The agent can only recommend within your rules."
        />
        <Callout
          step="02"
          title="Off-chain agent. On-chain guardrails."
          body="The agent never holds keys. It explains an allocation; you approve the single execute transaction."
        />
        <Callout
          step="03"
          title="Withdraw anytime"
          body="Idle balance settles instantly. Allocated positions unwind from supported strategies on demand."
        />
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border hairline bg-surface p-6">
        <div>
          <div className="font-display text-lg font-semibold tracking-tight">
            Ready to put idle USDC to work?
          </div>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Configure a policy, deposit USDC, and review your first
            recommendation in under two minutes.
          </p>
        </div>
        <Button asChild size="lg" className="rounded-full">
          <Link to="/policy">
            Configure vault
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function FilterChip({ label, toggle }: { label: string; toggle?: boolean }) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full border hairline bg-surface px-3.5 text-[13px] text-foreground/80 transition-colors hover:text-foreground",
      )}
    >
      {label}
      {toggle ? (
        <span className="ml-1 inline-flex h-4 w-7 items-center rounded-full border hairline bg-background">
          <span className="ml-0.5 h-3 w-3 rounded-full bg-muted-foreground/60" />
        </span>
      ) : (
        <ArrowUpRight className="h-3.5 w-3.5 opacity-50" />
      )}
    </button>
  );
}

function RiskTag({ risk }: { risk: string }) {
  return (
    <Badge
      variant="outline"
      className="rounded-full border-hairline bg-surface px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-foreground/80"
    >
      {risk}
    </Badge>
  );
}

function Callout({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border hairline bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {step}
        </span>
        <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
      </div>
      <div className="mt-3 font-display text-[15px] font-semibold">{title}</div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}
