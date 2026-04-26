import {
	supportedChains,
	supportedChainIds,
	getChainById,
	isChainSupported,
} from "./chains-config";
import { APP_SUPPORTED_CHAINS, PRIMARY_CHAIN_LABEL } from "./app-chains";

// Re-export for convenience
export { supportedChains, supportedChainIds, getChainById, isChainSupported };
export { APP_SUPPORTED_CHAINS, PRIMARY_CHAIN_LABEL };

export type ChainOption = {
	id: number;
	name: string;
	badge: string;
	icon: (typeof APP_SUPPORTED_CHAINS)[number]["icon"];
	testnet: boolean;
};

// Get chain display name by ID
export const getChainDisplayName = (chainId: number): string => {
	const chain = getChainById(chainId);
	return chain?.name || `Chain ${chainId}`;
};

// Get chain badge text by ID
export const getChainBadge = (chainId: number): string => {
	const appChain = APP_SUPPORTED_CHAINS.find(
		(c) => supportedChains.find((s) => s.id === chainId)?.name === c.name
	);
	return appChain?.badge || "";
};

// Get chain icon name by ID
export const getChainIcon = (chainId: number): string => {
	const appChain = APP_SUPPORTED_CHAINS.find(
		(c) => supportedChains.find((s) => s.id === chainId)?.name === c.name
	);
	return appChain?.icon || "";
};

// Get primary chain (for default selections, etc.)
export const getPrimaryChain = () => {
	const primaryAppChain = APP_SUPPORTED_CHAINS.find(
		(chain) => chain.name === PRIMARY_CHAIN_LABEL
	);
	if (!primaryAppChain) return supportedChains[0];

	return (
		supportedChains.find((chain) => chain.name === primaryAppChain.name) ||
		supportedChains[0]
	);
};

// Format chain list for UI components
export const getChainOptions = (): ChainOption[] => {
	return APP_SUPPORTED_CHAINS.flatMap((appChain): ChainOption[] => {
		const chain = supportedChains.find((s) => s.name === appChain.name);
		if (!chain) return [];

		return [
			{
				id: Number(chain.id),
				name: appChain.name,
				badge: appChain.badge,
				icon: appChain.icon as ChainOption["icon"],
				testnet: chain.testnet ?? false,
			},
		];
	});
};
