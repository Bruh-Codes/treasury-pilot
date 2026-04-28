"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";
import { ArrowUpDown, CircleArrowDown, EllipsisVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface FinancialAssetRow {
	id: string;
	name: string;
	symbol: string;
	chainLabel?: string;
	walletBalance: string;
	deposited: string;
	apy: string;
	totalDeposits: string;
	availableLiquidity: string;
	supported: boolean;
	iconClass: string;
	iconUrl?: string;
	copilot?: {
		state: "loading" | "actionable" | "hold" | "blocked" | "error";
		label: string;
	};
}

interface FinancialMarketsTableProps {
	title?: string;
	rows: FinancialAssetRow[];
	onRowSelect?: (rowId: string) => void;
	onAction?: (rowId: string) => void;
	onCopilotClick?: (rowId: string) => void;
	className?: string;
}

const TABLE_HEADERS = [
	"Asset",
	"Balance",
	"Deposited",
	"APY",
	"Total Deposits",
	"Available Liquidity",
	"Copilot",
] as const;

export function FinancialMarketsTable({
	title = "Asset",
	rows,
	onRowSelect,
	onAction,
	onCopilotClick,
	className = "",
}: FinancialMarketsTableProps) {
	const [selectedRow, setSelectedRow] = useState<string | null>(
		rows[0]?.id ?? null,
	);
	const [mounted, setMounted] = useState(false);
	const shouldReduceMotion = useReducedMotion();
	const { theme } = useTheme();
	const isDark = theme === "dark";

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!rows.some((row) => row.id === selectedRow)) {
			setSelectedRow(rows[0]?.id ?? null);
		}
	}, [rows, selectedRow]);

	const visibleRows = useMemo(() => rows, [rows]);

	const handleRowSelect = (rowId: string) => {
		setSelectedRow(rowId);
		onRowSelect?.(rowId);
	};

	const getRowTone = (isSelected: boolean) => {
		if (!mounted) {
			return isSelected ? "bg-muted/45 border-border/40" : "hover:bg-muted/25";
		}

		if (isDark) {
			return isSelected ? "bg-muted/45 border-border/40" : "hover:bg-muted/25";
		}

		return isSelected ? "bg-muted/70 border-border/50" : "hover:bg-muted/40";
	};

	const containerVariants = {
		visible: {
			transition: {
				staggerChildren: shouldReduceMotion ? 0 : 0.04,
				delayChildren: shouldReduceMotion ? 0 : 0.08,
			},
		},
	};

	const rowVariants = {
		hidden: {
			opacity: 0,
			y: shouldReduceMotion ? 0 : 16,
			scale: shouldReduceMotion ? 1 : 0.985,
			filter: shouldReduceMotion ? "blur(0px)" : "blur(4px)",
		},
		visible: {
			opacity: 1,
			y: 0,
			scale: 1,
			filter: "blur(0px)",
			transition: {
				type: "spring" as const,
				stiffness: 420,
				damping: 28,
				mass: 0.7,
			},
		},
	};

	return (
		<div className={cn("w-full", className)}>
			<div className="overflow-hidden">
				<div className="overflow-x-auto">
					<div className="min-w-[860px] xl:min-w-0">
						<div
							className="border-b border-border/30 bg-muted/15 px-6 py-3 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/80"
							style={{
								display: "grid",
								gridTemplateColumns:
									"220px minmax(90px,1fr) minmax(90px,1fr) minmax(72px,1fr) minmax(108px,1fr) minmax(112px,1fr) minmax(150px,1fr) 74px",
								columnGap: "10px",
							}}
						>
							<HeaderCell label={title} />
							{TABLE_HEADERS.slice(1).map((header) => (
								<HeaderCell key={header} label={header} />
							))}
							<div />
						</div>

						<motion.div
							initial="hidden"
							animate="visible"
							variants={containerVariants}
						>
							{visibleRows.length === 0 ? (
								<div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-16 text-center">
									<div className="text-lg font-medium text-foreground">
										No wallet assets found
									</div>
									<p className="mt-2 max-w-md text-sm text-muted-foreground">
										Connect a wallet with supported assets on this chain to see
										depositable balances here.
									</p>
								</div>
							) : (
								visibleRows.map((row, index) => {
									const isSelected = selectedRow === row.id;
									return (
										<motion.div key={row.id} variants={rowVariants}>
											<div
												role="button"
												tabIndex={0}
												onClick={() => handleRowSelect(row.id)}
												onKeyDown={(event) => {
													if (event.key === "Enter" || event.key === " ") {
														event.preventDefault();
														handleRowSelect(row.id);
													}
												}}
												className={cn(
													"group/row relative cursor-pointer px-6 py-4 transition-all duration-200",
													getRowTone(isSelected),
													index < visibleRows.length - 1 &&
														"border-b border-border/20",
												)}
												style={{
													display: "grid",
													gridTemplateColumns:
														"220px minmax(90px,1fr) minmax(90px,1fr) minmax(72px,1fr) minmax(108px,1fr) minmax(112px,1fr) minmax(150px,1fr) 74px",
													columnGap: "10px",
												}}
											>
												<div className="flex items-center gap-3">
													<AssetAvatar row={row} />
									<div className="min-w-0">
										<div className="truncate font-medium text-foreground/95">
											{row.name}
										</div>
										<div className="mt-1 text-xs text-muted-foreground/75">
											{row.symbol}
											{row.chainLabel ? ` • ${row.chainLabel}` : ""}
										</div>
									</div>
								</div>

												<TableValue value={row.walletBalance} />
												<TableValue value={row.deposited} />
												<TableValue value={row.apy} strong />
												<TableValue value={row.totalDeposits} />
												<TableValue value={row.availableLiquidity} />
												<div className="flex items-center">
													<CopilotPill
														row={row}
														onClick={() => onCopilotClick?.(row.id)}
													/>
												</div>

												<div className="flex items-center justify-end">
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button
																variant="secondary"
																size="icon-sm"
																className="rounded-full"
																onClick={(event) => event.stopPropagation()}
																aria-label={`Open options for ${row.name}`}
															>
																<EllipsisVertical />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent
															align="end"
															className="min-w-36"
															onClick={(event) => event.stopPropagation()}
														>
															<DropdownMenuItem
																onClick={() => onAction?.(row.id)}
																className="gap-2"
															>
																<CircleArrowDown />
																Deposit
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											</div>
										</motion.div>
									);
								})
							)}
						</motion.div>
					</div>
				</div>
			</div>
		</div>
	);
}

function CopilotPill({
	row,
	onClick,
}: {
	row: FinancialAssetRow;
	onClick: () => void;
}) {
	const copilot = row.copilot;
	const base =
		"inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors";

	if (!copilot) {
		return (
			<button
				type="button"
				onClick={onClick}
				className={cn(
					base,
					"border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/30 hover:text-foreground cursor-pointer",
				)}
			>
				Not analyzed
			</button>
		);
	}

	if (copilot.state === "loading") {
		return (
			<span
				className={cn(
					base,
					"border-border/60 bg-muted/30 text-muted-foreground",
				)}
			>
				Analyzing...
			</span>
		);
	}

	const tone =
		copilot.state === "actionable"
			? "border-emerald-500/35 bg-emerald-500/12 text-emerald-300"
			: copilot.state === "hold"
				? "border-sky-500/35 bg-sky-500/12 text-sky-300"
				: copilot.state === "blocked"
					? "border-amber-500/35 bg-amber-500/12 text-amber-300"
					: "border-red-500/35 bg-red-500/12 text-red-300";

	return (
		<button type="button" onClick={onClick} className={cn(base, tone)}>
			{copilot.label}
		</button>
	);
}

function HeaderCell({ label }: { label: string }) {
	return (
		<div className="flex items-center gap-1.5 whitespace-nowrap">
			<span className="truncate">{label}</span>
			<Button
				variant="ghost"
				size="icon-xs"
				className="size-5 rounded-full text-muted-foreground/70 hover:bg-transparent hover:text-foreground"
				aria-label={`Sort by ${label}`}
			>
				<ArrowUpDown className="size-3" />
			</Button>
		</div>
	);
}

function AssetAvatar({ row }: { row: FinancialAssetRow }) {
	if (row.iconUrl) {
		return (
			<Avatar className="size-11 border border-border/30">
				<AvatarImage
					src={row.iconUrl}
					alt={`${row.name} icon`}
					className="size-full object-contain bg-background"
				/>
				<AvatarFallback
					className={cn(
						"bg-gradient-to-br font-semibold text-white",
						row.iconClass,
					)}
				>
					{row.symbol.slice(0, 1)}
				</AvatarFallback>
			</Avatar>
		);
	}

	return (
		<Avatar className="size-11 border border-border/30">
			<AvatarFallback
				className={cn(
					"bg-gradient-to-br font-semibold text-white",
					row.iconClass,
				)}
			>
				{row.symbol.slice(0, 1)}
			</AvatarFallback>
		</Avatar>
	);
}

function TableValue({ value, strong }: { value: string; strong?: boolean }) {
	return (
		<div
			className={cn(
				"flex items-center text-sm font-medium text-foreground/90",
				!strong && "font-normal text-muted-foreground",
			)}
		>
			{value}
		</div>
	);
}
