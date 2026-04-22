export const APP_SUPPORTED_CHAINS = [
	{
		id: "arbitrum",
		name: "Arbitrum One",
		badge: "Mainnet",
		icon: "arbitrum",
	},
	{
		id: "arbitrum-sepolia",
		name: "Arbitrum Sepolia",
		badge: "Hackathon testnet",
		icon: "arbitrum",
	},
	{
		id: "robinhood-chain-testnet",
		name: "Robinhood Chain Testnet",
		badge: "RWA-focused testnet",
		icon: "robinhood",
	},
] as const;

export const PRIMARY_CHAIN_LABEL = "Arbitrum Sepolia";
