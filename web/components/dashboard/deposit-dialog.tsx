"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import { useChainId, useWalletClient } from "wagmi";
import { ChevronDown, X } from "lucide-react";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { getChainById } from "@/lib/chain-utils";
import { yieldPilotVaultAbi } from "@/lib/vault-abi";
import { useYieldpilotQueryClient } from "@/lib/use-yieldpilot-market-data";
import { SupportedChainIcon } from "./chain-icons";
import { VaultQrCode } from "./qr-code";

interface DepositDialogProps {
	depositAsset: any;
	supportedDepositAssets: any[];
	onDeposit: (assetId: string) => void;
	onClose: () => void;
	isDepositing: boolean;
	depositAmount: string;
	setDepositAmount: (amount: string) => void;
	confirmDeposit: () => void;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function DepositDialog({
	depositAsset,
	supportedDepositAssets,
	onDeposit,
	onClose,
	isDepositing,
	depositAmount,
	setDepositAmount,
	confirmDeposit,
	open,
	onOpenChange,
}: DepositDialogProps) {
	const { address } = useAppKitAccount();
	const chainId = useChainId();
	const { data: walletClient } = useWalletClient();
	const queryClient = useYieldpilotQueryClient();

	const selectedDepositUsd = Number(depositAmount || 0) || 0;
	const selectedDepositApy =
		depositAsset?.marketApy && depositAsset.marketApy !== "-"
			? depositAsset.marketApy.replace(" avg", "")
			: "0.00%";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="w-[92vw] max-w-[420px] overflow-hidden rounded-[24px] border border-border/80 bg-background p-0 shadow-[0_24px_80px_rgba(0,0,0,0.38)] sm:w-[420px] sm:max-w-[420px]"
			>
				<div className="p-6">
					<div className="mb-6 flex items-center justify-between">
						<DialogTitle className="text-xl font-semibold text-foreground">
							Deposit to Vault
						</DialogTitle>
						<DialogClose className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground">
							<X className="size-5" />
						</DialogClose>
					</div>

					{/* Connected Chain Display */}
					<div className="mb-6 rounded-xl border border-border/60 bg-muted/30 p-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="flex items-center justify-center rounded-lg border border-border/50 bg-background px-3 py-2">
									<SupportedChainIcon
										kind={
											getChainById(chainId)
												?.name.toLowerCase()
												.includes("robinhood")
												? "robinhood"
												: "arbitrum"
										}
									/>
									<span className="ml-2 text-sm font-medium text-foreground">
										{getChainById(chainId)?.name || "Unknown Network"}
									</span>
								</div>
							</div>
							<div className="text-xs text-muted-foreground">
								Connected Chain
							</div>
						</div>
					</div>

					{/* Asset Selection and Amount Input */}
					<div className="mb-6 rounded-xl border border-border/60 bg-card p-4">
						<div className="mb-4 flex items-center justify-between">
							<span className="text-sm font-medium text-muted-foreground">
								Select Asset
							</span>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/70"
									>
										<Avatar className="size-6 border border-border/30">
											<AvatarImage
												src={depositAsset?.iconUrl}
												alt={`${depositAsset?.name ?? "asset"} icon`}
												className="object-contain bg-transparent p-1"
											/>
											<AvatarFallback
												className={`bg-gradient-to-br text-xs font-semibold text-white ${depositAsset?.iconClass}`}
											>
												{depositAsset?.symbol?.slice(0, 1)}
											</AvatarFallback>
										</Avatar>
										{depositAsset?.symbol ?? "Select asset"}
										<ChevronDown className="size-4 text-muted-foreground" />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="end"
									className="w-56 rounded-xl border-border/60 bg-card p-1"
								>
									{supportedDepositAssets.map((asset) => (
										<DropdownMenuItem
											key={asset.id}
											onClick={() => onDeposit(asset.id)}
											className="rounded-lg px-3 py-2.5 text-sm focus:bg-muted/50"
										>
											<Avatar className="size-6 border border-border/30">
												<AvatarImage
													src={asset?.iconUrl}
													alt={`${asset.name} icon`}
													className="object-contain bg-transparent p-1"
												/>
												<AvatarFallback
													className={`bg-gradient-to-br text-xs font-semibold text-white ${asset.iconClass}`}
												>
													{asset.symbol.slice(0, 1)}
												</AvatarFallback>
											</Avatar>
											<div className="ml-3 min-w-0 flex-1">
												<div className="truncate font-medium text-foreground">
													{asset.symbol}
												</div>
												<div className="truncate text-xs text-muted-foreground">
													Balance: {(asset.walletBalance ?? 0).toLocaleString()}
												</div>
											</div>
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>

						<div className="space-y-3">
							<div>
								<label className="text-sm font-medium text-muted-foreground">
									Amount
								</label>
								<div className="mt-2 flex items-center gap-3">
									<Input
										value={depositAmount}
										onChange={(event) =>
											setDepositAmount(
												event.target.value.replace(/[^0-9.]/g, ""),
											)
										}
										inputMode="decimal"
										placeholder="0.00"
										className="flex-1 border-0 bg-muted/50 text-2xl font-semibold placeholder:text-muted-foreground/50 focus-visible:ring-0"
									/>
									<span className="text-lg font-medium text-muted-foreground">
										{depositAsset?.symbol}
									</span>
								</div>
							</div>

							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">
									Available:{" "}
									{(depositAsset?.walletBalance ?? 0).toLocaleString()}{" "}
									{depositAsset?.symbol}
								</span>
								<Button
									variant="ghost"
									size="sm"
									className="h-auto p-0 text-sm font-medium text-primary hover:text-primary/80"
									onClick={() =>
										setDepositAmount(
											(depositAsset?.walletBalance ?? 0).toString(),
										)
									}
								>
									Max
								</Button>
							</div>
						</div>
					</div>

					{/* Deposit Summary */}
					<div className="mb-6 rounded-xl border border-border/60 bg-muted/30 p-4">
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Deposit APY</span>
								<span className="font-medium text-foreground">
									{selectedDepositApy}
								</span>
							</div>
							{Number(depositAmount) > 0 && (
								<div className="flex items-center justify-between text-sm">
									<span className="text-muted-foreground">USD Value</span>
									<span className="font-medium text-foreground">
										$
										{selectedDepositUsd.toLocaleString(undefined, {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}
									</span>
								</div>
							)}
						</div>
					</div>

					{/* Action Buttons */}
					<div className="flex gap-3">
						<Button
							variant="outline"
							className="flex-1 h-12 rounded-lg font-medium"
							onClick={onClose}
						>
							Cancel
						</Button>
						<Button
							className="flex-1 h-12 rounded-lg bg-primary font-medium text-primary-foreground hover:bg-primary/90"
							onClick={confirmDeposit}
							disabled={
								isDepositing ||
								(Number(depositAmount) || 0) <= 0 ||
								(depositAsset?.walletBalance !== undefined &&
									(Number(depositAmount) || 0) > depositAsset?.walletBalance) ||
								!depositAsset?.vaultAddress
							}
						>
							{isDepositing ? "Depositing..." : "Deposit"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
