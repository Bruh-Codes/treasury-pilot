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
    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
      <div className="max-w-2xl">
        {eyebrow && (
          <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-[36px] font-semibold tracking-tight sm:text-[42px]">
          {title}
        </h1>
        {description && (
          <p className="mt-2.5 text-[15px] text-muted-foreground">{description}</p>
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
        "rounded-[20px] border hairline bg-card p-4 shadow-none",
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
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-[18px] font-semibold">{title}</h3>
        {sub && <p className="mt-1 text-[14px] text-muted-foreground">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
