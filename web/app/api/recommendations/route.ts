import { NextResponse } from "next/server";
import { z } from "zod";

import { buildRecommendation } from "@/lib/server/arbitrum-market-data";

const recommendationRequestSchema = z.object({
  asset: z.string().min(2),
  amount: z.coerce.number().positive(),
  riskProfile: z.enum(["conservative", "balanced", "yield"]).default("balanced"),
  liquidityPreference: z.enum(["instant", "weekly", "flexible"]).default("instant"),
  allowedProtocols: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = recommendationRequestSchema.parse(await request.json());
    const recommendation = await buildRecommendation({
      assetSymbol: body.asset,
      amount: body.amount,
      risk: body.riskProfile,
      liquidity: body.liquidityPreference,
      allowedProtocols: body.allowedProtocols,
    });

    return NextResponse.json({
      asset: body.asset.toUpperCase(),
      amount: body.amount,
      recommendation,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate recommendation",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}
