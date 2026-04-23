import { createAppKit } from "@reown/appkit/react";
import type { AppKitNetwork } from "@reown/appkit-common";
import { arbitrum, arbitrumSepolia } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { defineChain } from "viem/chains/utils";

export const reownProjectId =
	process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ??
	process.env.NEXT_PUBLIC_PROJECT_ID ??
	"reown-project-id";

export const reownEnabled =
	Boolean(process.env.NEXT_PUBLIC_REOWN_PROJECT_ID) ||
	Boolean(process.env.NEXT_PUBLIC_PROJECT_ID);

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

export const reownNetworks = [
	arbitrum,
	arbitrumSepolia,
	robinhoodChainTestnet,
] as [AppKitNetwork, ...AppKitNetwork[]];

export const wagmiAdapter = new WagmiAdapter({
	projectId: reownProjectId,
	networks: reownNetworks,
	ssr: false,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

const metadata = {
	name: "Kabon",
	description: "AI treasury copilot for deposits and withdrawals on Arbitrum",
	url: "http://localhost:3000",
	icons: ["http://localhost:3000/favicon.ico"],
};

let appKitCreated = false;

export function ensureReownAppKit() {
	if (appKitCreated) return;

	createAppKit({
		adapters: [wagmiAdapter],
		projectId: reownProjectId,
		networks: reownNetworks,
		metadata,
		features: {
			analytics: false,
			swaps: false,
			onramp: false,
			send: false,
		},
	});

	appKitCreated = true;
}
