"use client";

import { Activity as ActivityIcon } from "lucide-react";

function ActivityPage() {
  return (
    <div className="px-6 py-8 md:px-10 md:py-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[34px] font-semibold tracking-tight">
          Activity
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Indexed vault activity will land here once we connect the frontend to
          deployed contract events and wallet-specific history.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border hairline bg-card">
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border hairline bg-surface">
            <ActivityIcon className="h-4 w-4" />
          </div>
          <div className="font-display text-base font-semibold">No indexed activity yet</div>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Demo event history has been removed. The next step is to source
            onchain events from the live vault and wallet address.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ActivityPage;
