const ASSET_ICON_MAP: Record<string, string> = {
	AMZN: "https://s3-symbol-logo.tradingview.com/amazon--big.svg",
	AMD: "https://s3-symbol-logo.tradingview.com/advanced-micro-devices--big.svg",
	NFLX: "https://s3-symbol-logo.tradingview.com/netflix--big.svg",
	PLTR: "https://s3-symbol-logo.tradingview.com/palantir--big.svg",
	TSLA: "https://s3-symbol-logo.tradingview.com/tesla--big.svg",
	AAPL: "https://s3-symbol-logo.tradingview.com/apple--big.svg",
	GOOGL: "https://s3-symbol-logo.tradingview.com/alphabet--big.svg",
	MSFT: "https://s3-symbol-logo.tradingview.com/microsoft--big.svg",
	USDC: "https://assets.coingecko.com/coins/images/6319/large/usdc.png",
	USDT: "https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png",
	ETH: "https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/ethereum/info/logo.png",
	WETH: "https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
	WBTC: "https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png",
	LINK: "https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png",
	AAVE: "https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/ethereum/assets/0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DdAe9/logo.png",
	ARB: "https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/arbitrum/assets/0x912CE59144191C1204E64559FE8253a0e49E6548/logo.png",
};

export function getKnownAssetIcon(symbol?: string | null) {
	if (!symbol) return undefined;
	return ASSET_ICON_MAP[symbol.trim().toUpperCase()];
}
