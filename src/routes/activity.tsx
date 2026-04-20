import { createFileRoute } from "@tanstack/react-router";
import { useVault } from "@/lib/vault-store";
import { Activity as ActivityIcon } from "lucide-react";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity · YieldPilot" },
      {
        name: "description",
        content:
          "Vault activity log: deposits, withdrawals, allocations, and unwinds.",
      },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const v = useVault();

  return (
    <div className="px-6 py-8 md:px-10 md:py-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[34px] font-semibold tracking-tight">
          Activity
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          A chronological log of vault actions. Each entry corresponds to a
          single on-chain transaction emitted by the vault contract.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border hairline bg-card">
        {v.history.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border hairline bg-surface">
              <ActivityIcon className="h-4 w-4" />
            </div>
            <div className="font-display text-base font-semibold">
              No activity yet
            </div>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Once you set a policy, deposit, or approve an allocation, events
              will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {v.history.map((h) => (
              <li
                key={h.ts}
                className="flex items-center justify-between gap-4 px-6 py-4"
              >
                <div className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                  <span className="text-[14px]">{h.label}</span>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {new Date(h.ts).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
