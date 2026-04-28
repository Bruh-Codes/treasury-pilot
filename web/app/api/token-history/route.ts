import { NextResponse } from "next/server";

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
const YAHOO_FINANCE_SYMBOLS: Record<string, string> = {
	AMD: "AMD",
	AMZN: "AMZN",
	NFLX: "NFLX",
	PLTR: "PLTR",
	TSLA: "TSLA",
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
	keyof typeof RANGE_TO_DAYS,
	{ range: string; interval: string }
> = {
	"1D": { range: "1d", interval: "5m" },
	"1W": { range: "7d", interval: "1h" },
	"1M": { range: "1mo", interval: "1d" },
	"6M": { range: "6mo", interval: "1d" },
	"1Y": { range: "1y", interval: "1wk" },
	All: { range: "max", interval: "1mo" },
};

type CoinGeckoMarketChartResponse = {
	prices?: Array<[number, number]>;
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

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const rawRange = searchParams.get("range") ?? "1W";
	const range =
		rawRange in RANGE_TO_DAYS
			? (rawRange as keyof typeof RANGE_TO_DAYS)
			: "1W";
	const symbols = Array.from(
		new Set(
			(searchParams.get("symbols") ?? "")
				.split(",")
				.map((symbol) => symbol.trim().toUpperCase())
				.filter(Boolean),
		),
	);

	if (symbols.length === 0) {
		return NextResponse.json({
			history: {},
			generatedAt: new Date().toISOString(),
		});
	}

	const historyEntries = await Promise.all(
		symbols.map(async (symbol) => {
			const coinId = COINGECKO_IDS[symbol];
			if (!coinId) {
				const yahooSymbol = YAHOO_FINANCE_SYMBOLS[symbol];
				if (!yahooSymbol) {
					return [symbol, []] as const;
				}

				try {
					const yahooConfig = YAHOO_RANGE_CONFIG[range];
					const response = await fetch(
						`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
							yahooSymbol,
						)}?range=${yahooConfig.range}&interval=${yahooConfig.interval}&includePrePost=false&events=div%2Csplits`,
						{
							next: {
								revalidate: 60,
							},
							headers: {
								accept: "application/json",
							},
						},
					);

					if (!response.ok) {
						return [symbol, []] as const;
					}

					const payload = (await response.json()) as YahooChartResponse;
					const result = payload.chart?.result?.[0];
					const timestamps = result?.timestamp ?? [];
					const closes = result?.indicators?.quote?.[0]?.close ?? [];
					const prices = timestamps
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
							(
								point,
							): point is { timestamp: number; priceUsd: number } => point !== null,
						);

					return [symbol, prices] as const;
				} catch {
					return [symbol, []] as const;
				}
			}

			try {
				const response = await fetch(
					`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${RANGE_TO_DAYS[range]}`,
					{
						next: {
							revalidate: 60,
						},
						headers: {
							accept: "application/json",
						},
					},
				);

				if (!response.ok) {
					return [symbol, []] as const;
				}

				const payload =
					(await response.json()) as CoinGeckoMarketChartResponse;
				const prices =
					payload.prices?.map(([timestamp, priceUsd]) => ({
						timestamp,
						priceUsd,
					})) ?? [];

				return [symbol, prices] as const;
			} catch {
				return [symbol, []] as const;
			}
		}),
	);

	return NextResponse.json({
		history: Object.fromEntries(historyEntries),
		generatedAt: new Date().toISOString(),
	});
}
