"use client";

import { useChainId } from "wagmi";
import { X } from "lucide-react";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { APP_SUPPORTED_CHAINS } from "@/lib/app-chains";
import { getSupportedVaultAssets } from "@/lib/vault-registry";
import { SupportedChainIcon } from "./chain-icons";
import { VaultQrCode } from "./qr-code";

interface ReceiveDialogProps {
	receiveOpen: boolean;
	setReceiveOpen: (open: boolean) => void;
	chainsOpen: boolean;
	setChainsOpen: (open: boolean) => void;
	copyVaultAddress: () => void;
}

export function ReceiveDialog({
	receiveOpen,
	setReceiveOpen,
	chainsOpen,
	setChainsOpen,
	copyVaultAddress,
}: ReceiveDialogProps) {
	const chainId = useChainId();
	const supportedVaultAssets = getSupportedVaultAssets(chainId);
	const receiveVaultAsset = supportedVaultAssets[0];

	return (
		<Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
			<DialogContent
				showCloseButton={false}
				className="w-[92vw] max-w-[280px] rounded-[26px] border border-border/80 bg-popover p-0 shadow-[0_24px_80px_rgba(0,0,0,0.44)] sm:w-[280px] sm:max-w-[280px]"
			>
				<div className="p-4">
					<DialogHeader>
						<div className="flex items-center justify-between">
							<DialogTitle className="text-[18px] font-semibold tracking-tight text-foreground">
								{receiveVaultAsset
									? `Fund ${receiveVaultAsset.symbol} vault`
									: "Fund your account"}
							</DialogTitle>
							<DialogClose className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground">
								<X className="size-5" />
							</DialogClose>
						</div>
						<DialogDescription className="sr-only">
							Scan this QR code or copy vault address to receive assets.
						</DialogDescription>
					</DialogHeader>

					<div className="mt-3 rounded-[22px] border border-border/70 bg-card/90">
						<div className="overflow-hidden rounded-[20px] border border-border/60 bg-[#1f1e1e]">
							<VaultQrCode vaultAddress={receiveVaultAsset?.vaultAddress} />
						</div>

						<div className="p-2">
							<div className="border-t border-border/60 px-2 text-center">
								<div className="break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
									{receiveVaultAsset?.vaultAddress ??
										"No vault address configured for this network"}
								</div>
							</div>

							<div className="mt-2 flex flex-col items-center">
								<button
									type="button"
									onClick={() => setChainsOpen(true)}
									className="flex flex-col items-center gap-2 text-center transition-opacity hover:opacity-90"
								>
									<SupportedChainIcon kind="arbitrum" />
									<div className="text-[15px] font-medium text-muted-foreground">
										Supported Chains
									</div>
								</button>
							</div>

							<Button
								className="my-2 h-11 w-full rounded-full text-sm font-semibold"
								onClick={copyVaultAddress}
								disabled={!receiveVaultAsset?.vaultAddress}
							>
								Copy Address
							</Button>
						</div>
					</div>

					{/* Supported Chains Dialog */}
					<Dialog open={chainsOpen} onOpenChange={setChainsOpen}>
						<DialogContent
							showCloseButton={false}
							className="w-[92vw] max-w-[500px] rounded-[30px] border border-border/80 bg-popover p-0 shadow-[0_24px_80px_rgba(0,0,0,0.44)] sm:w-[500px] sm:max-w-[500px]"
						>
							<div className="p-6">
								<div className="flex items-center justify-between">
									<DialogTitle className="text-[22px] font-semibold tracking-tight text-foreground">
										Supported Chains
									</DialogTitle>
									<DialogClose className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground">
										<X className="size-5" />
									</DialogClose>
								</div>

								<div className="mt-5 rounded-[22px] border border-border/60 bg-card px-5 py-4 text-base leading-relaxed text-muted-foreground">
									Receive into this vault only from supported networks.
								</div>

								<div className="mt-5 rounded-[22px] border border-border/60 bg-card px-5 py-4">
									<div className="space-y-4">
										{APP_SUPPORTED_CHAINS.map((chain) => (
											<div
												key={chain.id}
												className="flex items-center justify-between gap-3"
											>
												<div className="flex items-center gap-3">
													<SupportedChainIcon kind={chain.icon} />
													<div>
														<div className="text-[16px] font-semibold text-foreground">
															{chain.name}
														</div>
														<div className="text-[12px] text-muted-foreground">
															{chain.badge}
														</div>
													</div>
												</div>
											</div>
										))}
									</div>
								</div>

								<Button
									className="mt-6 h-12 w-full rounded-full text-sm font-semibold"
									onClick={() => setChainsOpen(false)}
								>
									Got it
								</Button>
							</div>
						</DialogContent>
					</Dialog>
				</div>
			</DialogContent>
		</Dialog>
	);
}
