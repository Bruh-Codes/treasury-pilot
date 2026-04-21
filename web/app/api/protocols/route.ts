import { NextResponse } from "next/server";

import { getArbitrumProtocolRegistry } from "@/lib/server/arbitrum-market-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const asset = searchParams.get("asset") ?? undefined;

  try {
    const protocols = await getArbitrumProtocolRegistry(asset ?? undefined);
    return NextResponse.json({
      chain: "Arbitrum",
      asset: asset ?? null,
      count: protocols.length,
      protocols,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load Arbitrum protocol registry",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
