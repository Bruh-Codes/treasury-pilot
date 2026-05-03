"use client";

import {
	Activity as ActivityIcon,
	ArrowDownCircle,
	ArrowUpCircle,
	TrendingUp,
	ExternalLink,
} from "lucide-react";
import { useAccount } from "wagmi";
import {
	useUserDeposits,
	useUserWithdrawals,
	useAllDeposits,
	useAllWithdrawals,
	useStrategyAllocations,
} from "@/lib/subgraph/hooks";
import { formatDistanceToNow } from "date-fns";
import { formatUnits } from "viem";

function ActivityPage() {
	const { address } = useAccount();
	const { data: userDeposits, fetching: fetchingUserDeposits } =
		useUserDeposits(address || null);
	const { data: userWithdrawals, fetching: fetchingUserWithdrawals } =
		useUserWithdrawals(address || null);
	const { data: allDeposits, fetching: fetchingAllDeposits } = useAllDeposits();
	const { data: allWithdrawals, fetching: fetchingAllWithdrawals } =
		useAllWithdrawals();
	const { data: strategyAllocations, fetching: fetchingAllocations } =
		useStrategyAllocations();

	const isFetching =
		fetchingUserDeposits ||
		fetchingUserWithdrawals ||
		fetchingAllDeposits ||
		fetchingAllWithdrawals ||
		fetchingAllocations;
	const hasUserActivity =
		address && (userDeposits?.length || 0) + (userWithdrawals?.length || 0) > 0;
	const hasGlobalActivity =
		(allDeposits?.length || 0) + (allWithdrawals?.length || 0) > 0;

	const formatAddress = (addr: string) =>
		`${addr.slice(0, 6)}...${addr.slice(-4)}`;

	const formatTimestamp = (timestamp: string) => {
		const date = new Date(Number(timestamp) * 1000);
		return formatDistanceToNow(date, { addSuffix: true });
	};

	const formatAmount = (amount: string, decimals: number = 6) => {
		return parseFloat(formatUnits(BigInt(amount), decimals)).toLocaleString(
			undefined,
			{
				minimumFractionDigits: 2,
				maximumFractionDigits: 6,
			},
		);
	};

	const openBlockscan = (txHash: string) => {
		window.open(`https://sepolia.arbiscan.io/tx/${txHash}`, "_blank");
	};

	return (
		<div className="px-6 py-8 md:px-10 md:py-10">
			<div className="flex flex-col gap-1">
				<h1 className="font-display text-[34px] font-semibold tracking-tight">
					Activity
				</h1>
				<p className="max-w-2xl text-sm text-muted-foreground">
					Real-time vault activity indexed from the blockchain. Double-click
					transactions to view on blockscan.
				</p>
			</div>

			{isFetching ? (
				<div className="mt-8 overflow-hidden rounded-xl border hairline bg-card">
					<div className="flex items-center justify-center px-6 py-20 text-center">
						<div className="text-sm text-muted-foreground">
							Loading activity...
						</div>
					</div>
				</div>
			) : hasUserActivity ? (
				<div className="mt-8 space-y-6">
					<div className="overflow-hidden rounded-xl border hairline bg-card">
						<div className="border-b hairline px-6 py-4">
							<h2 className="font-display text-base font-semibold">
								Your Deposits
							</h2>
						</div>
						<div className="divide-y hairline">
							{userDeposits?.map((deposit) => (
								<div
									key={deposit.id}
									className="group flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/50 cursor-pointer"
									onDoubleClick={() => openBlockscan(deposit.transactionHash)}
								>
									<div className="flex items-center gap-4">
										<div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 text-green-500">
											<ArrowDownCircle className="h-5 w-5" />
										</div>
										<div>
											<div className="font-medium">Deposit</div>
											<div className="text-sm text-muted-foreground">
												{formatAddress(deposit.sender)} →{" "}
												{formatAddress(deposit.owner)}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-4">
										<div className="text-right">
											<div className="font-medium">
												{formatAmount(deposit.assets)} USDC
											</div>
											<div className="text-sm text-muted-foreground">
												{formatTimestamp(deposit.timestamp)}
											</div>
										</div>
										<ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="overflow-hidden rounded-xl border hairline bg-card">
						<div className="border-b hairline px-6 py-4">
							<h2 className="font-display text-base font-semibold">
								Your Withdrawals
							</h2>
						</div>
						<div className="divide-y hairline">
							{userWithdrawals?.map((withdraw) => (
								<div
									key={withdraw.id}
									className="group flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/50 cursor-pointer"
									onDoubleClick={() => openBlockscan(withdraw.transactionHash)}
								>
									<div className="flex items-center gap-4">
										<div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-500">
											<ArrowUpCircle className="h-5 w-5" />
										</div>
										<div>
											<div className="font-medium">Withdraw</div>
											<div className="text-sm text-muted-foreground">
												{formatAddress(withdraw.sender)} →{" "}
												{formatAddress(withdraw.receiver)}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-4">
										<div className="text-right">
											<div className="font-medium">
												{formatAmount(withdraw.assets)} USDC
											</div>
											<div className="text-sm text-muted-foreground">
												{formatTimestamp(withdraw.timestamp)}
											</div>
										</div>
										<ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			) : hasGlobalActivity ? (
				<div className="mt-8 space-y-6">
					<div className="overflow-hidden rounded-xl border hairline bg-card">
						<div className="border-b hairline px-6 py-4">
							<h2 className="font-display text-base font-semibold">
								Recent Deposits
							</h2>
						</div>
						<div className="divide-y hairline">
							{allDeposits?.slice(0, 10).map((deposit) => (
								<div
									key={deposit.id}
									className="group flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/50 cursor-pointer"
									onDoubleClick={() => openBlockscan(deposit.transactionHash)}
								>
									<div className="flex items-center gap-4">
										<div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 text-green-500">
											<ArrowDownCircle className="h-5 w-5" />
										</div>
										<div>
											<div className="font-medium">Deposit</div>
											<div className="text-sm text-muted-foreground">
												{formatAddress(deposit.sender)} →{" "}
												{formatAddress(deposit.owner)}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-4">
										<div className="text-right">
											<div className="font-medium">
												{formatAmount(deposit.assets)} USDC
											</div>
											<div className="text-sm text-muted-foreground">
												{formatTimestamp(deposit.timestamp)}
											</div>
										</div>
										<ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="overflow-hidden rounded-xl border hairline bg-card">
						<div className="border-b hairline px-6 py-4">
							<h2 className="font-display text-base font-semibold">
								Recent Withdrawals
							</h2>
						</div>
						<div className="divide-y hairline">
							{allWithdrawals?.slice(0, 10).map((withdraw) => (
								<div
									key={withdraw.id}
									className="group flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/50 cursor-pointer"
									onDoubleClick={() => openBlockscan(withdraw.transactionHash)}
								>
									<div className="flex items-center gap-4">
										<div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-500">
											<ArrowUpCircle className="h-5 w-5" />
										</div>
										<div>
											<div className="font-medium">Withdraw</div>
											<div className="text-sm text-muted-foreground">
												{formatAddress(withdraw.sender)} →{" "}
												{formatAddress(withdraw.receiver)}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-4">
										<div className="text-right">
											<div className="font-medium">
												{formatAmount(withdraw.assets)} USDC
											</div>
											<div className="text-sm text-muted-foreground">
												{formatTimestamp(withdraw.timestamp)}
											</div>
										</div>
										<ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
									</div>
								</div>
							))}
						</div>
					</div>

					{strategyAllocations && strategyAllocations.length > 0 && (
						<div className="overflow-hidden rounded-xl border hairline bg-card">
							<div className="border-b hairline px-6 py-4">
								<h2 className="font-display text-base font-semibold">
									Strategy Allocations
								</h2>
							</div>
							<div className="divide-y hairline">
								{strategyAllocations.slice(0, 10).map((allocation) => (
									<div
										key={allocation.id}
										className="group flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/50 cursor-pointer"
										onDoubleClick={() =>
											openBlockscan(allocation.transactionHash)
										}
									>
										<div className="flex items-center gap-4">
											<div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
												<TrendingUp className="h-5 w-5" />
											</div>
											<div>
												<div className="font-medium">Strategy Allocation</div>
												<div className="text-sm text-muted-foreground">
													{formatAddress(allocation.strategy)}
												</div>
											</div>
										</div>
										<div className="flex items-center gap-4">
											<div className="text-right">
												<div className="font-medium">
													{formatAmount(allocation.assets)} USDC
												</div>
												<div className="text-sm text-muted-foreground">
													{formatTimestamp(allocation.timestamp)}
												</div>
											</div>
											<ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			) : (
				<div className="mt-8 overflow-hidden rounded-xl border hairline bg-card">
					<div className="flex flex-col items-center justify-center px-6 py-20 text-center">
						<div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border hairline bg-surface">
							<ActivityIcon className="h-4 w-4" />
						</div>
						<div className="font-display text-base font-semibold">
							No indexed activity yet
						</div>
						<p className="mt-1 max-w-sm text-sm text-muted-foreground">
							{address
								? "No activity found for your wallet. Make a deposit to see it indexed here."
								: "Connect your wallet to see your activity, or view global activity below."}
						</p>
					</div>
				</div>
			)}
		</div>
	);
}

export default ActivityPage;
