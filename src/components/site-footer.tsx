export function SiteFooter() {
  return (
    <footer className="border-t hairline">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <div className="flex h-4 w-4 items-center justify-center rounded-sm bg-foreground">
            <div className="h-1.5 w-1.5 rounded-[1px] bg-background" />
          </div>
          <span className="font-mono">YieldPilot · v0.1 · Arbitrum Sepolia</span>
        </div>
        <div className="flex items-center gap-6">
          <span>Policy-controlled vault</span>
          <span>Off-chain agent · On-chain guardrails</span>
        </div>
      </div>
    </footer>
  );
}
