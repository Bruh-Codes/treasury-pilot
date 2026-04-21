import { NextResponse } from "next/server";

import { getArbitrumOpportunities } from "@/lib/server/arbitrum-market-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const asset = searchParams.get("asset") ?? undefined;
  const protocol = searchParams.get("protocol");

  try {
    const opportunities = (await getArbitrumOpportunities(asset)).filter(
      (opportunity) =>
        !protocol ||
        opportunity.protocolSlug === protocol ||
        opportunity.protocolName.toLowerCase() === protocol.toLowerCase(),
    );

    return NextResponse.json({
      chain: "Arbitrum",
      asset: asset ?? null,
      protocol: protocol ?? null,
      count: opportunities.length,
      opportunities,
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
