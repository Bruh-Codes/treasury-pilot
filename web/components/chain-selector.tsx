"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import {
	getChainOptions,
	getChainDisplayName,
	isChainSupported,
} from "@/lib/chain-utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ChainSelector() {
	const { chainId } = useAccount();
	const currentChainId = useChainId();
	const { switchChain } = useSwitchChain();

	const chainOptions = getChainOptions();
	const isCurrentSupported = isChainSupported(currentChainId);

	const handleSwitchChain = (targetChainId: number) => {
		switchChain({ chainId: targetChainId });
	};

	if (!isCurrentSupported) {
		return (
			<div className="flex flex-col gap-2 p-4 border border-red-200 bg-red-50 rounded-lg">
				<p className="text-sm text-red-700">
					Current chain ({getChainDisplayName(currentChainId)}) is not supported
				</p>
				<div className="flex flex-wrap gap-2">
					{chainOptions.map((option) => (
						<Button
							key={option.id}
							variant="outline"
							size="sm"
							onClick={() => handleSwitchChain(Number(option.id))}
						>
							Switch to {option.name}
						</Button>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="text-sm text-muted-foreground">
			Connected to {getChainDisplayName(currentChainId)}
		</div>
	);
}
