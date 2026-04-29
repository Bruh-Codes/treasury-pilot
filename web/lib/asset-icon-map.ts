const STOCK_TOKEN_ICON_MAP: Record<string, string> = {
	AMZN: "https://s3-symbol-logo.tradingview.com/amazon--big.svg",
	AMD: "https://s3-symbol-logo.tradingview.com/advanced-micro-devices--big.svg",
	NFLX: "https://s3-symbol-logo.tradingview.com/netflix--big.svg",
	PLTR: "https://s3-symbol-logo.tradingview.com/palantir--big.svg",
	TSLA: "https://s3-symbol-logo.tradingview.com/tesla--big.svg",
	AAPL: "https://s3-symbol-logo.tradingview.com/apple--big.svg",
	GOOGL: "https://s3-symbol-logo.tradingview.com/alphabet--big.svg",
	MSFT: "https://s3-symbol-logo.tradingview.com/microsoft--big.svg",
};

export function getKnownAssetIcon(symbol?: string | null) {
	if (!symbol) return undefined;
	return STOCK_TOKEN_ICON_MAP[symbol.trim().toUpperCase()];
}
