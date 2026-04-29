import "server-only";

export type TokenPriceMap = Record<string, number | null>;
export type TokenHistoryPoint = { timestamp: number; priceUsd: number };
export type TokenHistoryMap = Record<string, TokenHistoryPoint[]>;
export type HistoryRange = "1D" | "1W" | "1M" | "6M" | "1Y" | "All";

const COINGECKO_IDS: Record<string, string> = {
	AAVE: "aave",
	ARB: "arbitrum",
	ETH: "ethereum",
	LINK: "chainlink",
	RLUSD: "ripple-usd",
	USDC: "usd-coin",
	USDE: "ethena-usde",
	USDT: "tether",
	WBTC: "wrapped-bitcoin",
	WETH: "weth",
};

const STOCK_TICKERS: Record<string, string> = {
	AAPL: "AAPL",
	AMD: "AMD",
	AMZN: "AMZN",
	GOOGL: "GOOGL",
	MSFT: "MSFT",
	NFLX: "NFLX",
	PLTR: "PLTR",
	TSLA: "TSLA",
};

const STATIC_USD_PRICES: Record<string, number> = {
	RLUSD: 1,
	USDC: 1,
	USDE: 1,
	USDT: 1,
};

const RANGE_TO_DAYS = {
	"1D": "1",
	"1W": "7",
	"1M": "30",
	"6M": "180",
	"1Y": "365",
	All: "max",
} as const;

const YAHOO_RANGE_CONFIG: Record<
	HistoryRange,
	{ range: string; interval: string }
> = {
	"1D": { range: "1d", interval: "5m" },
	"1W": { range: "7d", interval: "1h" },
	"1M": { range: "1mo", interval: "1d" },
	"6M": { range: "6mo", interval: "1d" },
	"1Y": { range: "1y", interval: "1wk" },
	All: { range: "max", interval: "1mo" },
};

const POLYGON_RANGE_CONFIG: Record<
	HistoryRange,
	{
		multiplier: string;
		timespan: string;
		lookbackDays: number;
	}
> = {
	"1D": { multiplier: "5", timespan: "minute", lookbackDays: 2 },
	"1W": { multiplier: "1", timespan: "hour", lookbackDays: 8 },
	"1M": { multiplier: "1", timespan: "day", lookbackDays: 31 },
	"6M": { multiplier: "1", timespan: "day", lookbackDays: 186 },
	"1Y": { multiplier: "1", timespan: "week", lookbackDays: 370 },
	All: { multiplier: "1", timespan: "month", lookbackDays: 3650 },
};

type CoinGeckoSimplePriceResponse = Record<string, { usd?: number }>;
type CoinGeckoMarketChartResponse = { prices?: Array<[number, number]> };

type PolygonSnapshotResponse = {
	tickers?: Array<{
		ticker?: string;
		day?: { c?: number };
		min?: { c?: number };
		lastTrade?: { p?: number };
		prevDay?: { c?: number };
	}>;
};

type PolygonAggsResponse = {
	results?: Array<{
		t?: number;
		c?: number;
	}>;
};

type YahooQuoteResponse = {
	quoteResponse?: {
		result?: Array<{
			symbol?: string;
			regularMarketPrice?: number;
		}>;
	};
};

type YahooChartResponse = {
	chart?: {
		result?: Array<{
			timestamp?: number[];
			indicators?: {
				quote?: Array<{
					close?: Array<number | null>;
				}>;
			};
		}>;
	};
};

function getPreferredStockProvider() {
	const configured = (
		process.env.STOCK_MARKET_DATA_PROVIDER ?? "auto"
	).toLowerCase();

	if (configured === "polygon" && process.env.POLYGON_API_KEY) {
		return "polygon" as const;
	}
	if (configured === "yahoo") {
		return "yahoo" as const;
	}
	if (configured === "auto" && process.env.POLYGON_API_KEY) {
		return "polygon" as const;
	}
	return "yahoo" as const;
}

function getStockTickers(symbols: string[]) {
	return symbols
		.map((symbol) => STOCK_TICKERS[symbol])
		.filter((ticker): ticker is string => Boolean(ticker));
}

function toIsoDate(date: Date) {
	return date.toISOString().slice(0, 10);
}

async function fetchCryptoPrices(symbols: string[], prices: TokenPriceMap) {
	const requestedIds = symbols
		.map((symbol) => COINGECKO_IDS[symbol])
		.filter((id): id is string => Boolean(id));

	if (requestedIds.length === 0) return;

	try {
		const response = await fetch(
			`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
				requestedIds.join(","),
			)}&vs_currencies=usd`,
			{
				next: { revalidate: 60 },
				headers: { accept: "application/json" },
			},
		);

		if (!response.ok) return;

		const payload = (await response.json()) as CoinGeckoSimplePriceResponse;
		for (const symbol of symbols) {
			const coinId = COINGECKO_IDS[symbol];
			if (!coinId) continue;
			const usd = payload[coinId]?.usd;
			if (typeof usd === "number" && Number.isFinite(usd)) {
				prices[symbol] = usd;
			}
		}
	} catch {
		// Leave existing values intact.
	}
}

async function fetchPolygonStockPrices(
	symbols: string[],
	prices: TokenPriceMap,
) {
	const apiKey = process.env.POLYGON_API_KEY;
	const tickers = getStockTickers(symbols);
	if (!apiKey || tickers.length === 0) return;

	try {
		const response = await fetch(
			`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${encodeURIComponent(
				tickers.join(","),
			)}&apiKey=${encodeURIComponent(apiKey)}`,
			{
				next: { revalidate: 60 },
				headers: { accept: "application/json" },
			},
		);

		if (!response.ok) return;

		const payload = (await response.json()) as PolygonSnapshotResponse;
		for (const snapshot of payload.tickers ?? []) {
			const symbol = (snapshot.ticker ?? "").toUpperCase();
			const price =
				snapshot.min?.c ??
				snapshot.day?.c ??
				snapshot.lastTrade?.p ??
				snapshot.prevDay?.c;
			if (symbol && typeof price === "number" && Number.isFinite(price)) {
				prices[symbol] = price;
			}
		}
	} catch {
		// Fall through to other providers.
	}
}

async function fetchPolygonStockPricesFromAggs(
	symbols: string[],
	prices: TokenPriceMap,
) {
	const unresolvedSymbols = symbols.filter(
		(symbol) => STOCK_TICKERS[symbol] && prices[symbol] == null,
	);
	if (unresolvedSymbols.length === 0) return;

	const results = await Promise.all(
		unresolvedSymbols.map(async (symbol) => {
			const history = await fetchPolygonStockHistory(symbol, "1W");
			const latestPoint = history[history.length - 1];
			return [
				symbol,
				latestPoint && Number.isFinite(latestPoint.priceUsd)
					? latestPoint.priceUsd
					: null,
			] as const;
		}),
	);

	for (const [symbol, price] of results) {
		if (typeof price === "number" && Number.isFinite(price)) {
			prices[symbol] = price;
		}
	}
}

async function fetchYahooStockPrices(symbols: string[], prices: TokenPriceMap) {
	const yahooSymbols = getStockTickers(symbols);
	if (yahooSymbols.length === 0) return;

	try {
		const response = await fetch(
			`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
				yahooSymbols.join(","),
			)}`,
			{
				next: { revalidate: 60 },
				headers: { accept: "application/json" },
			},
		);

		if (!response.ok) return;

		const payload = (await response.json()) as YahooQuoteResponse;
		for (const quote of payload.quoteResponse?.result ?? []) {
			const symbol = (quote.symbol ?? "").toUpperCase();
			const price = quote.regularMarketPrice;
			if (
				symbol &&
				typeof price === "number" &&
				Number.isFinite(price) &&
				prices[symbol] == null
			) {
				prices[symbol] = price;
			}
		}
	} catch {
		// Leave missing prices unresolved.
	}
}

async function fetchCryptoHistory(symbol: string, range: HistoryRange) {
	const coinId = COINGECKO_IDS[symbol];
	if (!coinId) return [];

	try {
		const response = await fetch(
			`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${RANGE_TO_DAYS[range]}`,
			{
				next: { revalidate: 60 },
				headers: { accept: "application/json" },
			},
		);

		if (!response.ok) return [];

		const payload = (await response.json()) as CoinGeckoMarketChartResponse;
		return (
			payload.prices?.map(([timestamp, priceUsd]) => ({
				timestamp,
				priceUsd,
			})) ?? []
		);
	} catch {
		return [];
	}
}

async function fetchPolygonStockHistory(symbol: string, range: HistoryRange) {
	const apiKey = process.env.POLYGON_API_KEY;
	const ticker = STOCK_TICKERS[symbol];
	if (!apiKey || !ticker) return [];

	const config = POLYGON_RANGE_CONFIG[range];
	const now = new Date();
	const from = new Date(now);
	from.setUTCDate(now.getUTCDate() - config.lookbackDays);

	try {
		const response = await fetch(
			`https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(
				ticker,
			)}/range/${config.multiplier}/${config.timespan}/${toIsoDate(from)}/${toIsoDate(now)}?adjusted=true&sort=asc&limit=5000&apiKey=${encodeURIComponent(
				apiKey,
			)}`,
			{
				next: { revalidate: 60 },
				headers: { accept: "application/json" },
			},
		);

		if (!response.ok) return [];

		const payload = (await response.json()) as PolygonAggsResponse;
		return (payload.results ?? [])
			.map((bar) => {
				if (
					typeof bar.t !== "number" ||
					typeof bar.c !== "number" ||
					!Number.isFinite(bar.c)
				) {
					return null;
				}

				return {
					timestamp: bar.t,
					priceUsd: bar.c,
				};
			})
			.filter(
				(point): point is TokenHistoryPoint =>
					point !== null,
			);
	} catch {
		return [];
	}
}

async function fetchYahooStockHistory(symbol: string, range: HistoryRange) {
	const yahooSymbol = STOCK_TICKERS[symbol];
	if (!yahooSymbol) return [];

	try {
		const yahooConfig = YAHOO_RANGE_CONFIG[range];
		const response = await fetch(
			`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
				yahooSymbol,
			)}?range=${yahooConfig.range}&interval=${yahooConfig.interval}&includePrePost=false&events=div%2Csplits`,
			{
				next: { revalidate: 60 },
				headers: { accept: "application/json" },
			},
		);

		if (!response.ok) return [];

		const payload = (await response.json()) as YahooChartResponse;
		const result = payload.chart?.result?.[0];
		const timestamps = result?.timestamp ?? [];
		const closes = result?.indicators?.quote?.[0]?.close ?? [];

		return timestamps
			.map((timestamp, index) => {
				const priceUsd = closes[index];
				if (
					typeof timestamp !== "number" ||
					typeof priceUsd !== "number" ||
					!Number.isFinite(priceUsd)
				) {
					return null;
				}

				return {
					timestamp: timestamp * 1000,
					priceUsd,
				};
			})
			.filter(
				(point): point is TokenHistoryPoint =>
					point !== null,
			);
	} catch {
		return [];
	}
}

export async function fetchTokenPrices(symbols: string[]) {
	const normalizedSymbols = Array.from(
		new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)),
	);

	const prices: TokenPriceMap = {};
	for (const symbol of normalizedSymbols) {
		prices[symbol] = STATIC_USD_PRICES[symbol] ?? null;
	}

	await fetchCryptoPrices(normalizedSymbols, prices);

	const provider = getPreferredStockProvider();
	if (provider === "polygon") {
		await fetchPolygonStockPrices(normalizedSymbols, prices);
		await fetchPolygonStockPricesFromAggs(normalizedSymbols, prices);
	}
	await fetchYahooStockPrices(normalizedSymbols, prices);

	return prices;
}

export async function fetchTokenHistory(
	symbols: string[],
	range: HistoryRange,
) {
	const normalizedSymbols = Array.from(
		new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)),
	);

	const provider = getPreferredStockProvider();
	const historyEntries = await Promise.all(
		normalizedSymbols.map(async (symbol) => {
			if (COINGECKO_IDS[symbol]) {
				return [symbol, await fetchCryptoHistory(symbol, range)] as const;
			}

			if (provider === "polygon") {
				const polygonHistory = await fetchPolygonStockHistory(symbol, range);
				if (polygonHistory.length > 0) {
					return [symbol, polygonHistory] as const;
				}
			}

			return [symbol, await fetchYahooStockHistory(symbol, range)] as const;
		}),
	);

	return Object.fromEntries(historyEntries) as TokenHistoryMap;
}
