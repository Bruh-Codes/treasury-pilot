import { Link, useRouter } from "@tanstack/react-router";
import { vaultStore, useVault } from "@/lib/vault-store";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const v = useVault();
  const router = useRouter();

  const navItems = [
    { to: "/", label: "Overview" },
    { to: "/policy", label: "Policy" },
    { to: "/dashboard", label: "Vault" },
    { to: "/recommendation", label: "Recommendation" },
    { to: "/withdraw", label: "Withdraw" },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b hairline bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-foreground">
            <div className="h-2 w-2 rounded-[1px] bg-background" />
          </div>
          <span className="font-display text-sm font-semibold tracking-tight">
            YieldPilot
          </span>
          <span className="ml-2 hidden rounded-sm border hairline px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
            Arbitrum
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "bg-accent text-foreground" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {v.connected ? (
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-md border hairline bg-surface px-2.5 py-1.5 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                <span className="font-mono text-xs">{v.address}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => vaultStore.disconnect()}
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                vaultStore.connect();
                router.navigate({ to: "/policy" });
              }}
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
