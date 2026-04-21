import { NextResponse } from "next/server";

import { getArbitrumAssetSummaries } from "@/lib/server/arbitrum-market-data";

export async function GET() {
  try {
    const assets = await getArbitrumAssetSummaries();
    return NextResponse.json({
      chain: "Arbitrum",
      count: assets.length,
      assets,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load Arbitrum asset summaries",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
