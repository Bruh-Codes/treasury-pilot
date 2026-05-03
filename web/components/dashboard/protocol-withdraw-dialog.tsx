"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import { useChainId } from "wagmi";
import { X } from "lucide-react";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getKnownAssetIcon } from "@/lib/asset-icon-map";
import { cn } from "@/lib/utils";

interface ProtocolWithdrawDialogProps {
	asset: {
		name: string;
		symbol: string;
		iconUrl?: string;
		tokenAddress?: string;
		tokenDecimals?: number;
		walletBalance?: number;
	} | null;
	onWithdraw: () => void;
	onClose: () => void;
	isWithdrawing: boolean;
	withdrawAmount: string;
	setWithdrawAmount: (amount: string) => void;
	confirmWithdraw: () => void;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	walletReady: boolean;
	title?: string;
	description?: string;
}

export function ProtocolWithdrawDialog({
	asset,
	onWithdraw,
	onClose,
	isWithdrawing,
	withdrawAmount,
	setWithdrawAmount,
	confirmWithdraw,
	open,
	onOpenChange,
	walletReady,
	title = "Withdraw from Protocol",
	description,
}: ProtocolWithdrawDialogProps) {
	const { address } = useAppKitAccount();
	const chainId = useChainId();

	const selectedAssetIconUrl =
		getKnownAssetIcon(asset?.symbol) ?? asset?.iconUrl;
	const selectedAvailableBalance = asset?.walletBalance ?? 0;
	const withdrawDisabled =
		isWithdrawing ||
		!address ||
		!walletReady ||
		(withdrawAmount && Number(withdrawAmount) <= 0) ||
		(withdrawAmount && Number(withdrawAmount) > selectedAvailableBalance) ||
		!asset?.tokenAddress;
	const withdrawButtonLabel = !address
		? "Connect wallet"
		: !walletReady
			? "Preparing wallet..."
			: isWithdrawing
				? "Withdrawing..."
				: "Withdraw";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<div className="flex items-center justify-between mb-4">
					<DialogTitle>{title}</DialogTitle>
					<DialogClose asChild>
						<Button variant="ghost" size="icon" className="h-8 w-8">
							<X className="h-4 w-4" />
						</Button>
					</DialogClose>
				</div>

				{description && (
					<p className="text-sm text-muted-foreground mb-4">{description}</p>
				)}

				{asset ? (
					<div className="space-y-4">
						<div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/20">
							<Avatar className="size-10">
								<AvatarImage src={selectedAssetIconUrl} alt={asset.name} />
								<AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white font-semibold">
									{asset.symbol.slice(0, 2)}
								</AvatarFallback>
							</Avatar>
							<div>
								<div className="font-medium">{asset.name}</div>
								<div className="text-sm text-muted-foreground">
									{asset.symbol}
								</div>
							</div>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Available</span>
								<span className="font-medium">
									{selectedAvailableBalance.toLocaleString(undefined, {
										maximumFractionDigits: 6,
									})}{" "}
									{asset.symbol}
								</span>
							</div>

							<div className="flex items-center gap-2">
								<Input
									value={withdrawAmount}
									onChange={(e) =>
										setWithdrawAmount(e.target.value.replace(/[^0-9.]/g, ""))
									}
									inputMode="decimal"
									placeholder="0.00"
									className="flex-1"
								/>
								<span className="text-sm font-medium text-muted-foreground">
									{asset.symbol}
								</span>
							</div>

							<Button
								variant="ghost"
								size="sm"
								className="w-full"
								onClick={() =>
									setWithdrawAmount(selectedAvailableBalance.toString())
								}
								disabled={!asset || selectedAvailableBalance <= 0}
							>
								Max
							</Button>
						</div>

						<Button
							className="w-full"
							onClick={confirmWithdraw}
							disabled={withdrawDisabled}
						>
							{withdrawButtonLabel}
						</Button>
					</div>
				) : (
					<div className="text-center py-8">
						<p className="text-muted-foreground">No asset selected</p>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
