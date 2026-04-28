import { NextResponse } from "next/server";

import { listAssetRegistryEntries } from "@/lib/server/asset-registry";

export async function GET() {
	try {
		const { assets, source } = await listAssetRegistryEntries();
		return NextResponse.json({
			assets,
			source,
			generatedAt: new Date().toISOString(),
		});
	} catch (error) {
		return NextResponse.json(
			{
				error: "Failed to load asset registry",
				detail: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 502 },
		);
	}
}
