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

const STATIC_USD_PRICES: Record<string, number> = {
	RLUSD: 1,
	USDC: 1,
	USDE: 1,
	USDT: 1,
};

type CoinGeckoSimplePriceResponse = Record<
	string,
	{
		usd?: number;
	}
>;
type YahooQuoteResponse = {
	quoteResponse?: {
		result?: Array<{
			symbol?: string;
			regularMarketPrice?: number;
		}>;
	};
};

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
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
			prices: {},
			generatedAt: new Date().toISOString(),
		});
	}

	const prices: Record<string, number | null> = {};
	for (const symbol of symbols) {
		prices[symbol] = STATIC_USD_PRICES[symbol] ?? null;
	}

	const requestedIds = symbols
		.map((symbol) => COINGECKO_IDS[symbol])
		.filter((id): id is string => Boolean(id));

	if (requestedIds.length > 0) {
		try {
			const response = await fetch(
				`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
					requestedIds.join(","),
				)}&vs_currencies=usd`,
				{
					next: {
						revalidate: 60,
					},
					headers: {
						accept: "application/json",
					},
				},
			);

			if (response.ok) {
				const payload =
					(await response.json()) as CoinGeckoSimplePriceResponse;
				for (const symbol of symbols) {
					const coinId = COINGECKO_IDS[symbol];
					if (!coinId) continue;
					const usd = payload[coinId]?.usd;
					if (typeof usd === "number" && Number.isFinite(usd)) {
						prices[symbol] = usd;
					}
				}
			}
		} catch {
			// Keep any static prices already assigned and leave the rest as null.
		}
	}

	const yahooSymbols = symbols
		.map((symbol) => YAHOO_FINANCE_SYMBOLS[symbol])
		.filter((symbol): symbol is string => Boolean(symbol));

	if (yahooSymbols.length > 0) {
		try {
			const response = await fetch(
				`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
					yahooSymbols.join(","),
				)}`,
				{
					next: {
						revalidate: 60,
					},
					headers: {
						accept: "application/json",
					},
				},
			);

			if (response.ok) {
				const payload = (await response.json()) as YahooQuoteResponse;
				for (const quote of payload.quoteResponse?.result ?? []) {
					const symbol = (quote.symbol ?? "").toUpperCase();
					const price = quote.regularMarketPrice;
					if (
						symbol &&
						typeof price === "number" &&
						Number.isFinite(price)
					) {
						prices[symbol] = price;
					}
				}
			}
		} catch {
			// Leave unsupported or temporarily unavailable stock quotes as null.
		}
	}

	return NextResponse.json({
		prices,
		generatedAt: new Date().toISOString(),
	});
}
