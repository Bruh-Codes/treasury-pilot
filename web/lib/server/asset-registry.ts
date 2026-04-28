import "server-only";

import { and, eq } from "drizzle-orm";

import { assetRegistry } from "@/drizzle/schema";
import { db } from "@/lib/db";
import type {
	AssetRegistryEntry,
	AssetRegistryStatus,
	AssetRegistryType,
} from "@/lib/yieldpilot-types";

type ChainKey = "arbitrum" | "robinhood-chain-testnet";

type RegistryFilters = {
	chainKey?: ChainKey;
	reviewedOnly?: boolean;
	recommendationEnabled?: boolean;
	executionEnabled?: boolean;
	depositEnabled?: boolean;
};

type UpsertAssetRegistryInput = {
	chainId: number;
	chainKey: ChainKey;
	address: string;
	symbol: string;
	name: string;
	decimals: number;
	assetType: AssetRegistryType;
	status?: AssetRegistryStatus;
	isReviewed?: boolean;
	recommendationEnabled?: boolean;
	executionEnabled?: boolean;
	depositEnabled?: boolean;
	hasTransferRestrictions?: boolean;
	canBeFrozen?: boolean;
	isCanonical?: boolean;
	issuer?: string | null;
	sourceOfTruthUrl?: string | null;
	iconUrl?: string | null;
	notes?: string | null;
	reviewedBy?: string | null;
};

const FALLBACK_REGISTRY: AssetRegistryEntry[] = [
	{
		chainId: 42161,
		chainKey: "arbitrum",
		address: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
		symbol: "USDC",
		name: "USD Coin",
		decimals: 6,
		assetType: "stablecoin",
		status: "whitelisted",
		isReviewed: true,
		recommendationEnabled: true,
		executionEnabled: true,
		depositEnabled: true,
		hasTransferRestrictions: false,
		canBeFrozen: true,
		isCanonical: true,
		issuer: "Circle",
		sourceOfTruthUrl: "https://www.circle.com/usdc",
		iconUrl:
			"https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdc.png",
		notes:
			"Primary vault asset. Review freeze and blacklist semantics before production custody policies.",
		reviewedBy: "Kabon",
		reviewedAt: new Date().toISOString(),
	},
	{
		chainId: 42161,
		chainKey: "arbitrum",
		address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
		symbol: "WETH",
		name: "Wrapped Ether",
		decimals: 18,
		assetType: "wrapped-native",
		status: "reviewed",
		isReviewed: true,
		recommendationEnabled: true,
		executionEnabled: false,
		depositEnabled: false,
		hasTransferRestrictions: false,
		canBeFrozen: false,
		isCanonical: true,
		issuer: "Arbitrum canonical wrapped ether",
		sourceOfTruthUrl: "https://bridge.arbitrum.io/",
		iconUrl:
			"https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png",
		notes:
			"Reviewed for discovery and recommendations. Execution stays off until strategy support is live.",
		reviewedBy: "Kabon",
		reviewedAt: new Date().toISOString(),
	},
	{
		chainId: 46630,
		chainKey: "robinhood-chain-testnet",
		address: "0x7943e237c7f95da44e0301572d358911207852fa",
		symbol: "WETH",
		name: "Wrapped Ether",
		decimals: 18,
		assetType: "wrapped-native",
		status: "reviewed",
		isReviewed: true,
		recommendationEnabled: true,
		executionEnabled: false,
		depositEnabled: false,
		hasTransferRestrictions: false,
		canBeFrozen: false,
		isCanonical: true,
		issuer: "Robinhood Chain canonical wrapped ether",
		sourceOfTruthUrl: "https://docs.robinhood.com/chain/contracts/",
		iconUrl:
			"https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png",
		notes:
			"Official Robinhood Chain testnet WETH contract from Robinhood documentation.",
		reviewedBy: "Kabon",
		reviewedAt: new Date().toISOString(),
	},
	{
		chainId: 46630,
		chainKey: "robinhood-chain-testnet",
		address: "0x5884ad2f920c162cfbbacc88c9c51aa75ec09e02",
		symbol: "AMZN",
		name: "Amazon Stock Token",
		decimals: 18,
		assetType: "tokenized-equity",
		status: "reviewed",
		isReviewed: true,
		recommendationEnabled: true,
		executionEnabled: false,
		depositEnabled: false,
		hasTransferRestrictions: true,
		canBeFrozen: true,
		isCanonical: true,
		issuer: "Robinhood Chain Testnet",
		sourceOfTruthUrl: "https://docs.robinhood.com/chain/contracts/",
		notes:
			"Official Robinhood Chain testnet stock-token contract from Robinhood documentation.",
		reviewedBy: "Kabon",
		reviewedAt: new Date().toISOString(),
	},
	{
		chainId: 46630,
		chainKey: "robinhood-chain-testnet",
		address: "0x71178bac73cbeb415514eb542a8995b82669778d",
		symbol: "AMD",
		name: "AMD Stock Token",
		decimals: 18,
		assetType: "tokenized-equity",
		status: "reviewed",
		isReviewed: true,
		recommendationEnabled: true,
		executionEnabled: false,
		depositEnabled: false,
		hasTransferRestrictions: true,
		canBeFrozen: true,
		isCanonical: true,
		issuer: "Robinhood Chain Testnet",
		sourceOfTruthUrl: "https://docs.robinhood.com/chain/contracts/",
		notes:
			"Official Robinhood Chain testnet stock-token contract from Robinhood documentation.",
		reviewedBy: "Kabon",
		reviewedAt: new Date().toISOString(),
	},
	{
		chainId: 46630,
		chainKey: "robinhood-chain-testnet",
		address: "0x3b8262a63d25f0477c4dde23f83cfe22cb768c93",
		symbol: "NFLX",
		name: "Netflix Stock Token",
		decimals: 18,
		assetType: "tokenized-equity",
		status: "reviewed",
		isReviewed: true,
		recommendationEnabled: true,
		executionEnabled: false,
		depositEnabled: false,
		hasTransferRestrictions: true,
		canBeFrozen: true,
		isCanonical: true,
		issuer: "Robinhood Chain Testnet",
		sourceOfTruthUrl: "https://docs.robinhood.com/chain/contracts/",
		notes:
			"Official Robinhood Chain testnet stock-token contract from Robinhood documentation.",
		reviewedBy: "Kabon",
		reviewedAt: new Date().toISOString(),
	},
	{
		chainId: 46630,
		chainKey: "robinhood-chain-testnet",
		address: "0x1fbe1a0e43594b3455993b5de5fd0a7a266298d0",
		symbol: "PLTR",
		name: "Palantir Stock Token",
		decimals: 18,
		assetType: "tokenized-equity",
		status: "reviewed",
		isReviewed: true,
		recommendationEnabled: true,
		executionEnabled: false,
		depositEnabled: false,
		hasTransferRestrictions: true,
		canBeFrozen: true,
		isCanonical: true,
		issuer: "Robinhood Chain Testnet",
		sourceOfTruthUrl: "https://docs.robinhood.com/chain/contracts/",
		notes:
			"Official Robinhood Chain testnet stock-token contract from Robinhood documentation.",
		reviewedBy: "Kabon",
		reviewedAt: new Date().toISOString(),
	},
	{
		chainId: 46630,
		chainKey: "robinhood-chain-testnet",
		address: "0xc9f9c86933092bbbfff3ccb4b105a4a94bf3bd4e",
		symbol: "TSLA",
		name: "Tesla Stock Token",
		decimals: 18,
		assetType: "tokenized-equity",
		status: "reviewed",
		isReviewed: true,
		recommendationEnabled: true,
		executionEnabled: false,
		depositEnabled: false,
		hasTransferRestrictions: true,
		canBeFrozen: true,
		isCanonical: true,
		issuer: "Robinhood Chain Testnet",
		sourceOfTruthUrl: "https://docs.robinhood.com/chain/contracts/",
		notes:
			"Official Robinhood Chain testnet stock-token contract from Robinhood documentation.",
		reviewedBy: "Kabon",
		reviewedAt: new Date().toISOString(),
	},
];

function normalizeAddress(address: string) {
	return address.trim().toLowerCase();
}

function normalizeRegistryRow(
	row: typeof assetRegistry.$inferSelect,
): AssetRegistryEntry {
	return {
		id: row.id,
		chainId: row.chainId,
		chainKey: row.chainKey as ChainKey,
		address: row.address,
		symbol: row.symbol,
		name: row.name,
		decimals: row.decimals,
		assetType: row.assetType as AssetRegistryType,
		status: row.status as AssetRegistryStatus,
		isReviewed: row.isReviewed,
		recommendationEnabled: row.recommendationEnabled,
		executionEnabled: row.executionEnabled,
		depositEnabled: row.depositEnabled,
		hasTransferRestrictions: row.hasTransferRestrictions,
		canBeFrozen: row.canBeFrozen,
		isCanonical: row.isCanonical,
		issuer: row.issuer,
		sourceOfTruthUrl: row.sourceOfTruthUrl,
		iconUrl: row.iconUrl,
		notes: row.notes,
		reviewedBy: row.reviewedBy,
		reviewedAt: row.reviewedAt?.toISOString() ?? null,
	};
}

export async function listAssetRegistryEntries(
	filters: RegistryFilters = {},
): Promise<{ assets: AssetRegistryEntry[]; source: "database" | "fallback" }> {
	if (!db) {
		return {
			assets: filterFallbackRegistry(filters),
			source: "fallback",
		};
	}

	try {
		const predicates = [];

		if (filters.chainKey) {
			predicates.push(eq(assetRegistry.chainKey, filters.chainKey));
		}
		if (filters.reviewedOnly) {
			predicates.push(eq(assetRegistry.isReviewed, true));
		}
		if (filters.recommendationEnabled) {
			predicates.push(eq(assetRegistry.recommendationEnabled, true));
		}
		if (filters.executionEnabled) {
			predicates.push(eq(assetRegistry.executionEnabled, true));
		}
		if (filters.depositEnabled) {
			predicates.push(eq(assetRegistry.depositEnabled, true));
		}

		const rows = await db
			.select()
			.from(assetRegistry)
			.where(predicates.length ? and(...predicates) : undefined);

		return {
			assets: rows.map(normalizeRegistryRow),
			source: "database",
		};
	} catch {
		return {
			assets: filterFallbackRegistry(filters),
			source: "fallback",
		};
	}
}

function filterFallbackRegistry(filters: RegistryFilters) {
	return FALLBACK_REGISTRY.filter((asset) => {
		if (filters.chainKey && asset.chainKey !== filters.chainKey) {
			return false;
		}
		if (filters.reviewedOnly && !asset.isReviewed) {
			return false;
		}
		if (filters.recommendationEnabled && !asset.recommendationEnabled) {
			return false;
		}
		if (filters.executionEnabled && !asset.executionEnabled) {
			return false;
		}
		if (filters.depositEnabled && !asset.depositEnabled) {
			return false;
		}
		return true;
	});
}

export async function upsertAssetRegistryEntry(
	input: UpsertAssetRegistryInput,
): Promise<AssetRegistryEntry> {
	if (!db) {
		throw new Error(
			"Asset registry writes require DATABASE_URL to be configured.",
		);
	}

	const now = new Date();
	const row = {
		chainId: input.chainId,
		chainKey: input.chainKey,
		address: normalizeAddress(input.address),
		symbol: input.symbol.trim().toUpperCase(),
		name: input.name.trim(),
		decimals: input.decimals,
		assetType: input.assetType,
		status: input.status ?? "discovered",
		isReviewed: input.isReviewed ?? false,
		recommendationEnabled: input.recommendationEnabled ?? false,
		executionEnabled: input.executionEnabled ?? false,
		depositEnabled: input.depositEnabled ?? false,
		hasTransferRestrictions: input.hasTransferRestrictions ?? false,
		canBeFrozen: input.canBeFrozen ?? false,
		isCanonical: input.isCanonical ?? false,
		issuer: input.issuer ?? null,
		sourceOfTruthUrl: input.sourceOfTruthUrl ?? null,
		iconUrl: input.iconUrl ?? null,
		notes: input.notes ?? null,
		reviewedBy: input.reviewedBy ?? null,
		reviewedAt: input.isReviewed ? now : null,
		updatedAt: now,
	};

	const [saved] = await db
		.insert(assetRegistry)
		.values({
			...row,
			createdAt: now,
		})
		.onConflictDoUpdate({
			target: [assetRegistry.chainId, assetRegistry.address],
			set: row,
		})
		.returning();

	return normalizeRegistryRow(saved);
}
