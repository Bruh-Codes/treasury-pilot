// Mapping of strategy addresses to protocol names, icons, and APY sources
export const STRATEGY_PROTOCOLS: Record<
	string,
	{
		name: string;
		icon?: string;
		apySource?: string;
		asset?: string;
		assetIcon?: string;
	}
> = {
	"0xc9d2e20859020375c8c7517464a2ee890ff0864f": {
		name: "Aave V3",
		icon: "https://icons.llama.fi/aave-v3.png",
		apySource: "aave",
		asset: "USDC",
		assetIcon:
			"https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
	},
};

export function getStrategyInfo(strategyAddress: string) {
	const normalizedAddress = strategyAddress.toLowerCase();
	const strategy = STRATEGY_PROTOCOLS[normalizedAddress];

	if (strategy) {
		return strategy;
	}

	// If not found in mapping, return the address as name so user can see it
	return {
		name: strategyAddress.slice(0, 8) + "..." + strategyAddress.slice(-6),
		apySource: undefined,
	};
}
