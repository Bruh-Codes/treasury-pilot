import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
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
      {actions && <div className="flex items-center gap-2">{actions}</div>}
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

export function CardHead({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
