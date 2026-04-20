import { useRouter } from "@tanstack/react-router";
import { Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useVault, vaultStore } from "@/lib/vault-store";

export function TopBar() {
  const v = useVault();
  const router = useRouter();

  return (
    <>
      {/* Announcement strip */}
      <div className="flex h-9 items-center justify-center border-b hairline bg-surface px-4 text-center text-[12.5px] text-muted-foreground">
        <span className="truncate">
          Deposit capacity is limited and will increase under a security-first
          launch strategy.
        </span>
        <button className="ml-2 shrink-0 font-medium text-foreground hover:underline">
          Learn more
        </button>
      </div>

      {/* Top bar */}
      <div className="flex h-16 items-center gap-3 border-b hairline bg-background px-4 md:px-6">
        <SidebarTrigger className="-ml-1 h-9 w-9 rounded-md border hairline bg-surface text-muted-foreground hover:text-foreground" />

        <div className="relative max-w-2xl flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search strategies, protocols, addresses…"
            className="h-10 rounded-full border-hairline bg-surface pl-9 text-sm shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          className="hidden h-10 gap-2 rounded-full border-hairline bg-surface text-sm hover:bg-accent sm:inline-flex"
        >
          <RefreshCw className="h-4 w-4" />
          Swap
        </Button>

        {v.connected ? (
          <button
            onClick={() => vaultStore.disconnect()}
            className="inline-flex h-10 items-center gap-2 rounded-full border hairline bg-surface px-3 text-sm transition-colors hover:bg-accent"
          >
            <span className="h-5 w-5 rounded-full bg-gradient-to-br from-foreground to-muted-foreground" />
            <span className="font-mono text-xs">{v.address}</span>
          </button>
        ) : (
          <Button
            size="sm"
            className="h-10 rounded-full px-4"
            onClick={() => {
              vaultStore.connect();
              router.navigate({ to: "/policy" });
            }}
          >
            Connect Wallet
          </Button>
        )}
      </div>
    </>
  );
}
