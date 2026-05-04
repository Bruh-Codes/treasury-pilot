"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Sparkles, Wallet } from "lucide-react";
import {
  useUserDeposits,
  useUserWithdrawals,
  useStrategyAllocations,
  useStrategyRecalls,
} from "@/lib/subgraph/hooks";
import { getStrategyInfo } from "@/lib/subgraph/strategy-mapping";
import { Card } from "@/components/page-primitives";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMemo } from "react";

type PositionsCardProps = {
  copilotRecommendation?: {
    label: string;
    summary: string;
    onReview: () => void;
  };
};

export function PositionsCard({ copilotRecommendation }: PositionsCardProps) {
  const { address } = useAppKitAccount();
  const router = useRouter();
  const { data: deposits } = useUserDeposits(address ?? null);
  const { data: withdrawals } = useUserWithdrawals(address ?? null);
  const { data: allocations, fetching } = useStrategyAllocations();
  const { data: recalls } = useStrategyRecalls();

  // Calculate net position per strategy
  const netPositions = useMemo(() => {
    if (!allocations || !recalls) return [];

    const strategyMap = new Map<string, bigint>();

    // Sum all allocations
    allocations.forEach((alloc) => {
      const current = strategyMap.get(alloc.strategy) || 0n;
      strategyMap.set(alloc.strategy, current + BigInt(alloc.assets));
    });

    // Subtract all recalls
    recalls.forEach((recall) => {
      const current = strategyMap.get(recall.strategy) || 0n;
      strategyMap.set(recall.strategy, current - BigInt(recall.assets));
    });

    // Filter out positions with 0 or negative balance, or very small amounts (< 0.000001 USDC)
    const MIN_BALANCE = 10n; // 10 units = 0.00001 USDC (6 decimals)
    const filtered = Array.from(strategyMap.entries())
      .filter(([_, assets]) => assets > MIN_BALANCE)
      .map(([strategy, assets]) => ({
        strategy,
        assets: assets.toString(),
      }));

    return filtered;
  }, [allocations, recalls]);

  const handleEndPosition = (allocation: {
    strategy: string;
    assets: string;
  }) => {
    const strategyInfo = getStrategyInfo(allocation.strategy as string);
    const params = new URLSearchParams({
      action: "end-position",
      asset: strategyInfo.asset ?? "USDC",
    });
    router.push(`/withdraw?${params.toString()}`);
  };

  if (fetching) {
    return (
      <Card>
        <div className="mb-4">
          <h2 className="font-display text-[24px] font-semibold tracking-tight flex items-center gap-2">
            Vault Positions
          </h2>
        </div>
        <div className="space-y-3">
          <div className="h-10 w-full bg-muted/30 rounded-md animate-pulse" />
          <div className="h-10 w-full bg-muted/30 rounded-md animate-pulse" />
          <div className="h-10 w-full bg-muted/30 rounded-md animate-pulse" />
        </div>
      </Card>
    );
  }

  const hasPositions = netPositions && netPositions.length > 0;

  return (
    <Card>
      <div className="mb-4">
        <h2 className="font-display text-[24px] font-semibold tracking-tight flex items-center gap-2">
          Vault Positions
        </h2>
      </div>
      <div>
        {!hasPositions ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            {copilotRecommendation ? (
              <>
                <Sparkles className="mb-2 size-8 text-emerald-300" />
                <p className="text-sm font-medium text-foreground">
                  {copilotRecommendation.label}
                </p>
                <p className="mt-1 max-w-md text-xs text-muted-foreground/70">
                  {copilotRecommendation.summary}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-4 h-9 rounded-full px-4 text-xs font-semibold"
                  onClick={copilotRecommendation.onReview}
                >
                  Review recommendation
                </Button>
              </>
            ) : (
              <>
                <Wallet className="mb-2 size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No active strategy deployments
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Vault funds will be deployed to protocols when strategies are
                  allocated
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="border-b border-border/30 bg-muted/15 px-3 py-2 text-left text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
              <div className="grid grid-cols-[1.5fr_0.8fr_1fr_1fr_0.8fr_40px] gap-2">
                <span>Protocol</span>
                <span>Asset</span>
                <span>Strategy</span>
                <span>Amount</span>
                <span>APY</span>
                <span />
              </div>
            </div>
            <div className="divide-y divide-border/20">
              {netPositions?.map((allocation) => {
                const strategyInfo = getStrategyInfo(allocation.strategy);
                const assets = parseFloat(allocation.assets) / 1_000_000;

                return (
                  <div
                    key={allocation.strategy}
                    className="grid grid-cols-[1.5fr_0.8fr_1fr_1fr_0.8fr_40px] gap-2 px-3 py-3 transition-colors hover:bg-muted/25"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6 border border-border/30">
                        <AvatarImage
                          src={strategyInfo.icon}
                          alt={strategyInfo.name}
                          className="size-full object-contain bg-background"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-[10px] font-semibold">
                          {strategyInfo.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">
                        {strategyInfo.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {strategyInfo.assetIcon && (
                        <Avatar className="size-4 border border-border/30">
                          <AvatarImage
                            src={strategyInfo.assetIcon}
                            alt={strategyInfo.asset}
                            className="size-full object-contain bg-background"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white text-[8px] font-semibold">
                            {strategyInfo.asset?.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {strategyInfo.asset ?? "-"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {allocation.strategy.slice(0, 8)}...
                      {allocation.strategy.slice(-6)}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {assets.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {strategyInfo.apySource ? "Variable" : "-"}
                    </span>
                    <div className="flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex size-8 items-center justify-center rounded-md hover:bg-muted/50 transition-colors"
                          >
                            <MoreHorizontal className="size-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEndPosition(allocation)}
                          >
                            End position
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
