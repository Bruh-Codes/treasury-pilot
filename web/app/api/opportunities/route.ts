import { NextResponse } from "next/server";
import { getArbitrumOpportunities } from "@/lib/server/arbitrum-market-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const asset = searchParams.get("asset") ?? undefined;
  const protocol = searchParams.get("protocol") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "10");
  const range = searchParams.get("range") ?? "1W";

  try {
    const result = await getArbitrumOpportunities(asset, {
      protocol,
      page,
      pageSize,
      range,
    });

    let opportunities = result.opportunities;
    let total = result.total;
    let summary = result.summary;
    let topOpportunities = result.topOpportunities;

    return NextResponse.json({
      chain: "Arbitrum",
      asset: asset ?? null,
      protocol: protocol ?? null,
      total,
      page,
      pageSize,
      range,
      opportunities,
      summary,
      topOpportunities,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load Arbitrum opportunities",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
