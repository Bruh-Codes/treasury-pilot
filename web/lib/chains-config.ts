import { defineChain } from "viem/chains/utils";
import type { AppKitNetwork } from "@reown/appkit-common";
import { arbitrum, arbitrumSepolia } from "@reown/appkit/networks";
import { APP_SUPPORTED_CHAINS } from "./app-chains";

// Define Robinhood Chain Testnet (not in @reown/appkit/networks)
export const robinhoodChainTestnet = defineChain({
	id: 46_630,
	name: "Robinhood Chain Testnet",
	network: "robinhood-chain-testnet",
	nativeCurrency: {
		name: "Ether",
		symbol: "ETH",
		decimals: 18,
	},
	rpcUrls: {
		default: {
			http: ["https://rpc.testnet.chain.robinhood.com"],
		},
	},
	blockExplorers: {
		default: {
			name: "Robinhood Explorer",
			url: "https://explorer.testnet.chain.robinhood.com",
		},
	},
	testnet: true,
}) satisfies AppKitNetwork;

// Map chain IDs to their configurations
const chainConfigMap = {
	arbitrum: arbitrum,
	"arbitrum-sepolia": arbitrumSepolia,
	"robinhood-chain-testnet": robinhoodChainTestnet,
} as const;

// Get supported chains based on APP_SUPPORTED_CHAINS
const supportedChainsArray = APP_SUPPORTED_CHAINS.map(
	(chain) => chainConfigMap[chain.id],
).filter(Boolean) as AppKitNetwork[];

export const supportedChains = supportedChainsArray as [
	AppKitNetwork,
	...AppKitNetwork[],
];

// Get supported chain IDs for easy checking
export const supportedChainIds = new Set(
	supportedChains.map((chain) => chain.id),
);

// Create RPC URL map for Uniswap
export const createRpcUrlMap = () => {
	const map: Record<number, string> = {};
	supportedChains.forEach((network) => {
		const rpcUrl = network.rpcUrls.default.http[0];
		if (rpcUrl) {
			map[network.id as number] = rpcUrl;
		}
	});
	return map;
};

// Helper function to check if a chain is supported
export const isChainSupported = (chainId: number | undefined): boolean => {
	if (!chainId) return false;
	return supportedChainIds.has(chainId);
};

// Get chain info by ID
export const getChainById = (chainId: number) => {
	return supportedChains.find((chain) => chain.id === chainId);
};
