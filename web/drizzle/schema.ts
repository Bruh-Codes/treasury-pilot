import {
	boolean,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: serial("id").primaryKey(),
	wallet_address: text("wallet_address"),
});

export const assetRegistry = pgTable(
	"asset_registry",
	{
		id: serial("id").primaryKey(),
		chainId: integer("chain_id").notNull(),
		chainKey: text("chain_key").notNull(),
		address: text("address").notNull(),
		symbol: text("symbol").notNull(),
		name: text("name").notNull(),
		decimals: integer("decimals").notNull(),
		assetType: text("asset_type").notNull(),
		status: text("status").notNull().default("discovered"),
		isReviewed: boolean("is_reviewed").notNull().default(false),
		recommendationEnabled: boolean("recommendation_enabled")
			.notNull()
			.default(false),
		executionEnabled: boolean("execution_enabled").notNull().default(false),
		depositEnabled: boolean("deposit_enabled").notNull().default(false),
		hasTransferRestrictions: boolean("has_transfer_restrictions")
			.notNull()
			.default(false),
		canBeFrozen: boolean("can_be_frozen").notNull().default(false),
		isCanonical: boolean("is_canonical").notNull().default(false),
		issuer: text("issuer"),
		sourceOfTruthUrl: text("source_of_truth_url"),
		iconUrl: text("icon_url"),
		notes: text("notes"),
		reviewedBy: text("reviewed_by"),
		reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		chainAddressUnique: uniqueIndex("asset_registry_chain_address_idx").on(
			table.chainId,
			table.address,
		),
	}),
);
