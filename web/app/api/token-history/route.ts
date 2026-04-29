import { NextResponse } from "next/server";
import {
	fetchTokenHistory,
	type HistoryRange,
} from "@/lib/server/market-data";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const rawRange = searchParams.get("range") ?? "1W";
	const range = (
		["1D", "1W", "1M", "6M", "1Y", "All"].includes(rawRange)
			? rawRange
			: "1W"
	) as HistoryRange;
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

	const history = await fetchTokenHistory(symbols, range);

	return NextResponse.json({
		history,
		generatedAt: new Date().toISOString(),
	});
}
