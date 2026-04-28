export type SupportedDeploymentNetwork =
	| "arbitrum"
	| "arbitrumSepolia"
	| "robinhoodChainTestnet";

export type SupportedAssetConfig = {
	symbol: string;
	name: string;
	address: `0x${string}`;
	decimals: number;
	sourceOfTruthUrl: string;
};

export const SUPPORTED_NETWORKS: Record<
	SupportedDeploymentNetwork,
	{
		chainId: number;
		label: string;
	}
> = {
	arbitrum: {
		chainId: 42161,
		label: "Arbitrum One",
	},
	arbitrumSepolia: {
		chainId: 421614,
		label: "Arbitrum Sepolia",
	},
	robinhoodChainTestnet: {
		chainId: 46630,
		label: "Robinhood Chain Testnet",
	},
};

export const SUPPORTED_ASSETS: Record<
	SupportedDeploymentNetwork,
	Record<string, SupportedAssetConfig>
> = {
	arbitrum: {
		USDC: {
			symbol: "USDC",
			name: "USD Coin",
			address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
			decimals: 6,
			sourceOfTruthUrl:
				"https://developers.circle.com/stablecoins/usdc-contract-addresses",
		},
	},
	arbitrumSepolia: {
		USDC: {
			symbol: "USDC",
			name: "USD Coin",
			address: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
			decimals: 6,
			sourceOfTruthUrl:
				"https://developers.circle.com/stablecoins/usdc-contract-addresses",
		},
	},
	robinhoodChainTestnet: {
		WETH: {
			symbol: "WETH",
			name: "Wrapped Ether",
			address: "0x7943e237c7F95DA44E0301572D358911207852Fa",
			decimals: 18,
			sourceOfTruthUrl: "https://docs.robinhood.com/chain/contracts/",
		},
		TSLA: {
			symbol: "TSLA",
			name: "Tesla Stock Token",
			address: "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
			decimals: 18,
			sourceOfTruthUrl: "https://docs.robinhood.com/chain/contracts/",
		},
		AMZN: {
			symbol: "AMZN",
			name: "Amazon Stock Token",
			address: "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
			decimals: 18,
			sourceOfTruthUrl: "https://docs.robinhood.com/chain/contracts/",
		},
		PLTR: {
			symbol: "PLTR",
			name: "Palantir Stock Token",
			address: "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
			decimals: 18,
			sourceOfTruthUrl: "https://docs.robinhood.com/chain/contracts/",
		},
		NFLX: {
			symbol: "NFLX",
			name: "Netflix Stock Token",
			address: "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
			decimals: 18,
			sourceOfTruthUrl: "https://docs.robinhood.com/chain/contracts/",
		},
		AMD: {
			symbol: "AMD",
			name: "AMD Stock Token",
			address: "0x71178BAc73cBeb415514eB542a8995b82669778d",
			decimals: 18,
			sourceOfTruthUrl: "https://docs.robinhood.com/chain/contracts/",
		},
	},
};

export function getSupportedAsset(
	network: SupportedDeploymentNetwork,
	symbol: string,
) {
	return SUPPORTED_ASSETS[network][symbol.toUpperCase()];
}
