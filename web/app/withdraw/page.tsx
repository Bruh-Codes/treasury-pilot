"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useChainId, usePublicClient, useWalletClient } from "wagmi";
import { parseUnits, type Address } from "viem";
import { EllipsisVertical, Search, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Card, PageHeader } from "@/components/page-primitives";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getKnownAssetIcon } from "@/lib/asset-icon-map";
import { getChainById, getChainOptions } from "@/lib/chain-utils";
import {
	useAssetRegistry,
	useAssetSummaries,
	useMultichainBalances,
	useMultichainVaultPositions,
	useTokenPrices,
	useYieldpilotQueryClient,
} from "@/lib/use-yieldpilot-market-data";
import { yieldPilotVaultAbi } from "@/lib/vault-abi";
import { getSupportedVaultAssets } from "@/lib/vault-registry";

type VaultAssetItem = {
	id: string;
	name: string;
	symbol: string;
	chainId: number;
	chainLabel: string;
	iconUrl?: string;
	iconClass: string;
	tokenAddress: Address;
	tokenDecimals: number;
	vaultAddress: Address;
	vaultLabel: string;
	walletBalance: number;
	depositedAssets: number;
	depositedShares: number;
	unitPriceUsd: number | null;
	valueUsd: number | null;
};

type WithdrawalPreview = {
	availableNow: number;
	needsUnwind: number;
	feeAssets: number;
	sharesToBurn: number;
};

function getTrustWalletIconUrl(
	tokenAddress?: Address,
	symbol?: string,
	currentChainId?: number,
): string | undefined {
	if (!tokenAddress) {
		if (symbol === "ETH") {
			return "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png";
		}
		return undefined;
	}

	const chain = getChainById(currentChainId || 1);
	const blockchain = chain?.name.toLowerCase().includes("arbitrum")
		? "arbitrum"
		: "ethereum";

	return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${blockchain}/assets/${tokenAddress}/logo.png`;
}

function formatWalletBalance(value: number) {
	if (!Number.isFinite(value) || value <= 0) {
		return "-";
	}

	if (value < 0.000001) {
		return "<0.000001";
	}

	return value.toLocaleString(undefined, {
		minimumFractionDigits: value >= 1 ? 0 : 2,
		maximumFractionDigits: value >= 1 ? 4 : 6,
	});
}

function formatUsd(value: number | null) {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return "-";
	}

	return `$${value.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function formatAssetAmount(value: number, symbol: string) {
	if (!Number.isFinite(value) || value <= 0) return "-";
	return `${formatWalletBalance(value)} ${symbol}`;
}

function getAssetIconClass(symbol: string) {
	const map: Record<string, string> = {
		USDC: "from-sky-400 to-blue-600",
		USDT: "from-emerald-400 to-teal-600",
		ETH: "from-slate-500 to-slate-700",
		WETH: "from-slate-500 to-slate-700",
		WBTC: "from-orange-400 to-amber-500",
		LINK: "from-blue-500 to-blue-700",
		AAVE: "from-violet-400 to-purple-600",
		RLUSD: "from-blue-400 to-indigo-600",
	};

	return map[symbol] ?? "from-neutral-500 to-neutral-700";
}

export default function WithdrawPage() {
	const { address } = useAppKitAccount();
	const chainId = useChainId();
	const chainOptions = getChainOptions();
	const assetSummaries = useAssetSummaries();
	const assetRegistry = useAssetRegistry();
	const publicClient = usePublicClient();
	const { data: walletClient } = useWalletClient();
	const queryClient = useYieldpilotQueryClient();

	const [search, setSearch] = useState("");
	const [withdrawAsset, setWithdrawAsset] = useState<VaultAssetItem | null>(
		null,
	);
	const [withdrawAmount, setWithdrawAmount] = useState("");
	const [withdrawOpen, setWithdrawOpen] = useState(false);
	const [isWithdrawing, setIsWithdrawing] = useState(false);
	const [withdrawPreview, setWithdrawPreview] =
		useState<WithdrawalPreview | null>(null);
	const [previewLoading, setPreviewLoading] = useState(false);

	const registryAssets = assetRegistry.data?.assets ?? [];

	const trackedVaultAssets = useMemo(
		() =>
			chainOptions.flatMap((chain) =>
				getSupportedVaultAssets(chain.id).map((asset) => {
					const registryAsset = registryAssets.find(
						(entry) =>
							entry.chainId === chain.id && entry.symbol === asset.symbol,
					);
					const summaryAsset = assetSummaries.data?.assets?.find(
						(entry) => entry.symbol === asset.symbol,
					);
					return {
						key: `${chain.id}:${asset.vaultAddress.toLowerCase()}`,
						chainId: chain.id,
						symbol: asset.symbol,
						name: registryAsset?.name ?? asset.name,
						tokenAddress: asset.tokenAddress,
						tokenDecimals: asset.tokenDecimals,
						vaultAddress: asset.vaultAddress,
						vaultLabel: asset.vaultLabel,
						iconUrl:
							summaryAsset?.iconUrl ??
							registryAsset?.iconUrl ??
							getKnownAssetIcon(asset.symbol) ??
							getTrustWalletIconUrl(asset.tokenAddress, asset.symbol, chain.id),
					};
				}),
			),
		[assetSummaries.data?.assets, chainOptions, registryAssets],
	);

	const multichainBalances = useMultichainBalances(
		address as Address | undefined,
		trackedVaultAssets.map((asset) => ({
			key: `${asset.chainId}:${asset.tokenAddress.toLowerCase()}`,
			chainId: asset.chainId,
			symbol: asset.symbol,
			name: asset.name,
			decimals: asset.tokenDecimals,
			tokenAddress: asset.tokenAddress,
		})),
	);

	const multichainVaultPositions = useMultichainVaultPositions(
		address as Address | undefined,
		trackedVaultAssets.map((asset) => ({
			key: `${asset.chainId}:${asset.vaultAddress.toLowerCase()}`,
			chainId: asset.chainId,
			symbol: asset.symbol,
			vaultAddress: asset.vaultAddress,
			tokenDecimals: asset.tokenDecimals,
		})),
	);

	const depositedSymbols = useMemo(
		() =>
			Array.from(
				new Set(trackedVaultAssets.map((asset) => asset.symbol)),
			).sort(),
		[trackedVaultAssets],
	);
	const tokenPrices = useTokenPrices(depositedSymbols);

	const vaultAssets = useMemo(() => {
		return trackedVaultAssets
			.map((asset) => {
				const position = multichainVaultPositions.data?.positions?.[asset.key];
				const depositedAssets = position?.assets ?? 0;
				const depositedShares = position?.shares ?? 0;
				const walletBalance =
					multichainBalances.data?.balances?.[
						`${asset.chainId}:${asset.tokenAddress.toLowerCase()}`
					]?.balance ?? 0;
				const unitPriceUsd = tokenPrices.data?.prices?.[asset.symbol] ?? null;
				const chainLabel =
					getChainById(asset.chainId)?.name ?? `Chain ${asset.chainId}`;

				return {
					id: asset.key,
					name: asset.name,
					symbol: asset.symbol,
					chainId: asset.chainId,
					chainLabel,
					iconUrl: asset.iconUrl,
					iconClass: getAssetIconClass(asset.symbol),
					tokenAddress: asset.tokenAddress,
					tokenDecimals: asset.tokenDecimals,
					vaultAddress: asset.vaultAddress,
					vaultLabel: asset.vaultLabel,
					walletBalance,
					depositedAssets,
					depositedShares,
					unitPriceUsd,
					valueUsd:
						typeof unitPriceUsd === "number"
							? unitPriceUsd * depositedAssets
							: null,
				} satisfies VaultAssetItem;
			})
			.filter((asset) => asset.depositedAssets > 0)
			.sort((left, right) => right.depositedAssets - left.depositedAssets);
	}, [
		multichainBalances.data?.balances,
		multichainVaultPositions.data?.positions,
		tokenPrices.data?.prices,
		trackedVaultAssets,
	]);

	const filteredAssets = useMemo(() => {
		const term = search.trim().toLowerCase();
		return vaultAssets.filter((asset) => {
			return (
				term.length === 0 ||
				asset.name.toLowerCase().includes(term) ||
				asset.symbol.toLowerCase().includes(term) ||
				asset.chainLabel.toLowerCase().includes(term)
			);
		});
	}, [search, vaultAssets]);

	const totalVaultValueUsd = useMemo(
		() =>
			vaultAssets.reduce((sum, asset) => {
				return sum + (asset.valueUsd ?? 0);
			}, 0),
		[vaultAssets],
	);

	const activeWithdrawAsset = withdrawAsset
		? (vaultAssets.find((asset) => asset.id === withdrawAsset.id) ??
			withdrawAsset)
		: null;
	const activeWithdrawAssetChainId = activeWithdrawAsset?.chainId;
	const activeWithdrawVaultAddress = activeWithdrawAsset?.vaultAddress;
	const activeWithdrawTokenDecimals = activeWithdrawAsset?.tokenDecimals;
	const showPreviewLoading = previewLoading && !withdrawPreview;

	useEffect(() => {
		let cancelled = false;

		async function loadPreview() {
			const vaultAddress = activeWithdrawAsset?.vaultAddress;
			const tokenDecimals = activeWithdrawAsset?.tokenDecimals;

			if (
				!withdrawOpen ||
				!activeWithdrawAsset ||
				chainId !== activeWithdrawAssetChainId ||
				!publicClient ||
				!vaultAddress ||
				tokenDecimals === undefined
			) {
				setWithdrawPreview(null);
				setPreviewLoading(false);
				return;
			}

			const amount = Number(withdrawAmount) || 0;
			if (amount <= 0) {
				setWithdrawPreview(null);
				setPreviewLoading(false);
				return;
			}

			try {
				setPreviewLoading(true);
				const parsedAmount = parseUnits(withdrawAmount, tokenDecimals);
				const [feePreview, sharesToBurn] = await Promise.all([
					publicClient.readContract({
						address: vaultAddress,
						abi: yieldPilotVaultAbi,
						functionName: "previewWithdrawalFee",
						args: [parsedAmount],
					}),
					publicClient.readContract({
						address: vaultAddress,
						abi: yieldPilotVaultAbi,
						functionName: "previewWithdraw",
						args: [parsedAmount],
					}),
				]);

				if (cancelled) return;

				setWithdrawPreview({
					availableNow: Number(feePreview[0]) / 10 ** tokenDecimals,
					needsUnwind: Number(feePreview[1]) / 10 ** tokenDecimals,
					feeAssets: Number(feePreview[2]) / 10 ** tokenDecimals,
					sharesToBurn: Number(sharesToBurn) / 10 ** tokenDecimals,
				});
			} catch {
				if (!cancelled) {
					setWithdrawPreview(null);
				}
			} finally {
				if (!cancelled) {
					setPreviewLoading(false);
				}
			}
		}

		loadPreview();

		return () => {
			cancelled = true;
		};
	}, [
		activeWithdrawAssetChainId,
		activeWithdrawTokenDecimals,
		activeWithdrawVaultAddress,
		chainId,
		publicClient,
		withdrawAmount,
		withdrawOpen,
	]);

	function openWithdraw(asset: VaultAssetItem) {
		setWithdrawAsset(asset);
		setWithdrawAmount(asset.depositedAssets.toString());
		setWithdrawOpen(true);
	}

	async function confirmWithdraw() {
		if (!activeWithdrawAsset || !walletClient || !publicClient || !address) {
			toast.error("Connect your wallet first");
			return;
		}

		if (chainId !== activeWithdrawAsset.chainId) {
			toast.error(
				`Switch to ${activeWithdrawAsset.chainLabel} before withdrawing ${activeWithdrawAsset.symbol}.`,
			);
			return;
		}

		const amount = Number(withdrawAmount) || 0;
		if (amount <= 0 || amount > activeWithdrawAsset.depositedAssets) {
			toast.error("Enter a valid withdrawal amount");
			return;
		}

		try {
			setIsWithdrawing(true);
			const parsedAmount = parseUnits(
				withdrawAmount,
				activeWithdrawAsset.tokenDecimals,
			);

			toast.message(
				`Submitting withdrawal for ${withdrawAmount} ${activeWithdrawAsset.symbol}...`,
			);

			const hash = await walletClient.writeContract({
				address: activeWithdrawAsset.vaultAddress,
				abi: yieldPilotVaultAbi,
				functionName: "withdraw",
				args: [parsedAmount, address as Address, address as Address],
				account: walletClient.account,
				chain: walletClient.chain,
			});

			await publicClient.waitForTransactionReceipt({ hash });

			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: ["yieldpilot", "multichain-balances"],
				}),
				queryClient.invalidateQueries({
					queryKey: ["yieldpilot", "multichain-vault-positions"],
				}),
				queryClient.invalidateQueries({
					queryKey: ["yieldpilot", "token-prices"],
				}),
			]);

			setWithdrawOpen(false);
			setWithdrawAsset(null);
			toast.success("Withdrawal submitted successfully", {
				description: `${withdrawAmount} ${activeWithdrawAsset.symbol} was withdrawn from ${activeWithdrawAsset.vaultLabel}.`,
			});
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Withdrawal transaction failed";
			toast.error("Withdrawal failed", {
				description: message,
			});
		} finally {
			setIsWithdrawing(false);
		}
	}

	const isLoading =
		Boolean(address) &&
		(assetSummaries.isPending ||
			assetRegistry.isPending ||
			multichainBalances.isPending ||
			multichainVaultPositions.isPending);

	return (
		<div className="px-6 py-8 md:px-7 md:py-9">
			<PageHeader
				title="Withdraw"
				description="Withdraw from the vault assets you already hold. Double-click any row or use the action menu to start a withdrawal."
			/>

			<div className="mt-7 grid gap-4 md:grid-cols-3">
				<Card className="p-5">
					<div className="text-sm text-muted-foreground">Vault assets</div>
					<div className="mt-2 text-3xl font-semibold text-foreground">
						{vaultAssets.length}
					</div>
				</Card>
				<Card className="p-5">
					<div className="text-sm text-muted-foreground">Total vault value</div>
					<div className="mt-2 text-3xl font-semibold text-foreground">
						{formatUsd(totalVaultValueUsd)}
					</div>
				</Card>
				<Card className="p-5">
					<div className="text-sm text-muted-foreground">Connected chain</div>
					<div className="mt-2 text-lg font-semibold text-foreground">
						{getChainById(chainId)?.name ?? "Unsupported chain"}
					</div>
				</Card>
			</div>

			<Card className="mt-6 p-0">
				<div className="flex flex-col gap-4 border-b border-border/30 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<h2 className="text-2xl font-semibold tracking-tight text-foreground">
							Vault assets
						</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							Assets currently deposited into Kabon vaults across supported
							chains.
						</p>
					</div>
					<div className="relative w-full max-w-[340px]">
						<Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Filter vault assets"
							className="h-12 rounded-full border-border/60 bg-background pl-12 text-base"
						/>
					</div>
				</div>

				{isLoading ? (
					<div className="space-y-3 px-6 py-6">
						{Array.from({ length: 4 }).map((_, index) => (
							<Skeleton key={index} className="h-16 w-full rounded-2xl" />
						))}
					</div>
				) : filteredAssets.length === 0 ? (
					<div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-16 text-center">
						<div className="mb-5 flex size-12 items-center justify-center rounded-full border border-border bg-background">
							<Wallet className="size-5 text-muted-foreground" />
						</div>
						<h2 className="text-xl font-semibold text-foreground">
							No vault assets available
						</h2>
						<p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
							Deposited positions will appear here once this wallet has shares
							in a supported Kabon vault.
						</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<div className="min-w-[980px]">
							<div className="grid grid-cols-[minmax(260px,2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(140px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_44px] gap-4 border-b border-border/30 bg-muted/15 px-6 py-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80">
								<div>Asset</div>
								<div>Wallet Balance</div>
								<div>Deposited</div>
								<div>Vault Value</div>
								<div>Vault Shares</div>
								<div>Chain</div>
								<div />
							</div>
							<div className="divide-y divide-border/20">
								{filteredAssets.map((asset) => (
									<div
										key={asset.id}
										role="button"
										tabIndex={0}
										onDoubleClick={() => openWithdraw(asset)}
										onKeyDown={(event) => {
											if (event.key === "Enter" || event.key === " ") {
												event.preventDefault();
												openWithdraw(asset);
											}
										}}
										className="grid cursor-pointer grid-cols-[minmax(260px,2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(140px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_44px] gap-4 px-6 py-4 transition-colors hover:bg-muted/20"
									>
										<div className="flex min-w-0 items-center gap-3">
											<Avatar className="size-10 border border-border/30">
												<AvatarImage
													src={asset.iconUrl}
													alt={`${asset.name} icon`}
													className="size-full object-contain bg-background"
												/>
												<AvatarFallback
													className={`bg-gradient-to-br font-semibold text-white ${asset.iconClass}`}
												>
													{asset.symbol.slice(0, 1)}
												</AvatarFallback>
											</Avatar>
											<div className="min-w-0">
												<div className="truncate text-[15px] font-medium text-foreground">
													{asset.name}
												</div>
												<div className="mt-0.5 text-[11px] text-muted-foreground">
													{asset.symbol} | {asset.chainLabel}
												</div>
											</div>
										</div>
										<div className="flex items-center text-sm text-muted-foreground">
											{formatAssetAmount(asset.walletBalance, asset.symbol)}
										</div>
										<div className="flex items-center text-sm font-medium text-foreground">
											{formatAssetAmount(asset.depositedAssets, asset.symbol)}
										</div>
										<div className="flex items-center text-sm text-muted-foreground">
											{formatUsd(asset.valueUsd)}
										</div>
										<div className="flex items-center text-sm text-muted-foreground">
											{formatWalletBalance(asset.depositedShares)}
										</div>
										<div className="flex items-center text-sm text-muted-foreground">
											{asset.chainLabel}
										</div>
										<div className="flex items-center justify-end">
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="secondary"
														size="icon-sm"
														className="rounded-full"
														onClick={(event) => event.stopPropagation()}
														aria-label={`Open options for ${asset.name}`}
													>
														<EllipsisVertical />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent
													align="end"
													onClick={(event) => event.stopPropagation()}
												>
													<DropdownMenuItem onClick={() => openWithdraw(asset)}>
														Withdraw
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				)}
			</Card>

			<Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
				<DialogContent className="max-w-[400px] overflow-y-auto max-h-[500px] rounded-[24px] border border-border/80 bg-background p-0 shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
					<div className="p-6">
						<DialogHeader>
							<DialogTitle className="text-xl font-semibold">
								Withdraw from vault
							</DialogTitle>
							<DialogDescription>
								{activeWithdrawAsset
									? `Withdraw ${activeWithdrawAsset.symbol} from ${activeWithdrawAsset.vaultLabel}.`
									: "Withdraw an asset from your vault position."}
							</DialogDescription>
						</DialogHeader>

						{activeWithdrawAsset ? (
							<div className="mt-5 space-y-3">
								<div className="rounded-xl border border-border/60 bg-muted/20 p-3.5">
									<div className="flex items-center gap-3">
										<Avatar className="size-10 border border-border/30">
											<AvatarImage
												src={activeWithdrawAsset.iconUrl}
												alt={`${activeWithdrawAsset.name} icon`}
												className="size-full object-contain bg-background"
											/>
											<AvatarFallback
												className={`bg-gradient-to-br font-semibold text-white ${activeWithdrawAsset.iconClass}`}
											>
												{activeWithdrawAsset.symbol.slice(0, 1)}
											</AvatarFallback>
										</Avatar>
										<div>
											<div className="font-medium text-foreground">
												{activeWithdrawAsset.name}
											</div>
											<div className="text-sm text-muted-foreground">
												{activeWithdrawAsset.symbol} |{" "}
												{activeWithdrawAsset.chainLabel}
											</div>
										</div>
									</div>
								</div>

								{chainId !== activeWithdrawAsset.chainId ? (
									<div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-2.5 text-sm leading-6 text-amber-100/90">
										Switch your wallet to {activeWithdrawAsset.chainLabel} to
										withdraw this asset.
									</div>
								) : null}

								<div className="rounded-xl border border-border/60 bg-card p-4">
									<div className="mb-2 flex items-center justify-between">
										<label className="text-sm font-medium text-muted-foreground">
											Amount
										</label>
										<Button
											variant="ghost"
											size="sm"
											className="h-auto p-0 text-sm font-medium text-primary"
											onClick={() =>
												setWithdrawAmount(
													activeWithdrawAsset.depositedAssets.toString(),
												)
											}
										>
											Max
										</Button>
									</div>
									<div className="flex items-center gap-3">
										<Input
											value={withdrawAmount}
											onChange={(event) =>
												setWithdrawAmount(
													event.target.value.replace(/[^0-9.]/g, ""),
												)
											}
											inputMode="decimal"
											placeholder="0.00"
											className="h-11 border-0 bg-muted/50 text-xl font-semibold focus-visible:ring-0"
										/>
										<span className="text-base font-medium text-muted-foreground">
											{activeWithdrawAsset.symbol}
										</span>
									</div>
									<div className="mt-2 flex items-center justify-between text-sm">
										<span className="text-muted-foreground">
											Deposited:{" "}
											{formatAssetAmount(
												activeWithdrawAsset.depositedAssets,
												activeWithdrawAsset.symbol,
											)}
										</span>
									</div>
								</div>

								<div className="rounded-xl border border-border/60 bg-muted/20 p-4">
									<div className="space-y-2 text-sm">
										<div className="flex items-center justify-between">
											<span className="text-muted-foreground">
												Estimated vault value
											</span>
											<span className="font-medium text-foreground">
												{formatUsd(
													typeof activeWithdrawAsset.unitPriceUsd === "number"
														? (Number(withdrawAmount) || 0) *
																activeWithdrawAsset.unitPriceUsd
														: null,
												)}
											</span>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-muted-foreground">
												Available now
											</span>
											<span className="font-medium text-foreground">
												{showPreviewLoading
													? "Loading..."
													: formatAssetAmount(
															withdrawPreview?.availableNow ?? 0,
															activeWithdrawAsset.symbol,
														)}
											</span>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-muted-foreground">
												Needs unwind
											</span>
											<span className="font-medium text-foreground">
												{showPreviewLoading
													? "Loading..."
													: formatAssetAmount(
															withdrawPreview?.needsUnwind ?? 0,
															activeWithdrawAsset.symbol,
														)}
											</span>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-muted-foreground">
												Estimated fee
											</span>
											<span className="font-medium text-foreground">
												{showPreviewLoading
													? "Loading..."
													: formatAssetAmount(
															withdrawPreview?.feeAssets ?? 0,
															activeWithdrawAsset.symbol,
														)}
											</span>
										</div>
									</div>
								</div>

								<div className="flex gap-3 pt-1">
									<Button
										variant="outline"
										className="h-11 flex-1"
										onClick={() => setWithdrawOpen(false)}
									>
										Cancel
									</Button>
									<Button
										className="h-11 flex-1"
										onClick={confirmWithdraw}
										disabled={
											isWithdrawing ||
											chainId !== activeWithdrawAsset.chainId ||
											(Number(withdrawAmount) || 0) <= 0 ||
											(Number(withdrawAmount) || 0) >
												activeWithdrawAsset.depositedAssets
										}
									>
										{isWithdrawing ? "Withdrawing..." : "Withdraw"}
									</Button>
								</div>
							</div>
						) : null}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
