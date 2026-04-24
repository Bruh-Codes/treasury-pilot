import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export function Stat({
	label,
	value,
	hint,
	className,
}: {
	label: React.ReactNode;
	value: React.ReactNode;
	hint?: React.ReactNode;
	className?: string;
}) {
	return (
		<TooltipProvider>
			<div className={cn("flex flex-col gap-1.5", className)}>
				<div className="flex items-center gap-1.5">
					<span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
						{label}
					</span>
					{hint && (
						<Tooltip>
							<TooltipTrigger>
								<HelpCircle className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
							</TooltipTrigger>
							<TooltipContent>
								<p>{hint}</p>
							</TooltipContent>
						</Tooltip>
					)}
				</div>
				<span className="font-display text-[18px] font-semibold tracking-tight tabular-nums">
					{value}
				</span>
			</div>
		</TooltipProvider>
	);
}
