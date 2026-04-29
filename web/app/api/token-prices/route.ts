import { NextResponse } from "next/server";
import { fetchTokenPrices } from "@/lib/server/market-data";

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

	const prices = await fetchTokenPrices(symbols);

	return NextResponse.json({
		prices,
		generatedAt: new Date().toISOString(),
	});
}
