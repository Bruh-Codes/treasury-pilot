import type { Address } from "viem";
import generatedVaultAddresses from "./generated/vault-addresses.json";

export type SupportedVaultAsset = {
	symbol: string;
	name: string;
	tokenAddress: Address;
	tokenDecimals: number;
	vaultAddress: Address;
	vaultLabel: string;
};

type GeneratedVaultRegistry = {
	generatedAt?: string;
	deployments?: Record<
		string,
		Record<
			string,
			{
				symbol: string;
				name: string;
				tokenAddress: string;
				tokenDecimals: number;
				vaultAddress: string;
				vaultLabel: string;
			}
		>
	>;
};

function readAddress(value: string | undefined): Address | undefined {
	if (!value) return undefined;
	if (!/^0x[a-fA-F0-9]{40}$/.test(value)) return undefined;
	return /^0x0{40}$/i.test(value) ? undefined : (value as Address);
}

const arbitrumUsdcVaultAddress = readAddress(
	process.env.NEXT_PUBLIC_ARBITRUM_USDC_VAULT_ADDRESS,
);
const arbitrumSepoliaUsdcTokenAddress = readAddress(
	process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_USDC_TOKEN_ADDRESS,
);
const arbitrumSepoliaUsdcVaultAddress = readAddress(
	process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_USDC_VAULT_ADDRESS,
);
const robinhoodChainUsdcTokenAddress = readAddress(
	process.env.NEXT_PUBLIC_ROBINHOOD_USDC_TOKEN_ADDRESS,
);
const robinhoodChainUsdcVaultAddress = readAddress(
	process.env.NEXT_PUBLIC_ROBINHOOD_USDC_VAULT_ADDRESS,
);

const ENV_VAULT_REGISTRY: Partial<Record<number, SupportedVaultAsset[]>> = {
	42161: arbitrumUsdcVaultAddress
		? [
				{
					symbol: "USDC",
					name: "USD Coin",
					tokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
					tokenDecimals: 6,
					vaultAddress: arbitrumUsdcVaultAddress,
					vaultLabel: "Kabon USDC Vault",
				},
			]
		: [],
	421614:
		arbitrumSepoliaUsdcTokenAddress && arbitrumSepoliaUsdcVaultAddress
			? [
					{
						symbol: "USDC",
						name: "USD Coin",
						tokenAddress: arbitrumSepoliaUsdcTokenAddress,
						tokenDecimals: 6,
						vaultAddress: arbitrumSepoliaUsdcVaultAddress,
						vaultLabel: "Kabon USDC Vault",
					},
				]
			: [],
	46630:
		robinhoodChainUsdcTokenAddress && robinhoodChainUsdcVaultAddress
			? [
					{
						symbol: "USDC",
						name: "USD Coin",
						tokenAddress: robinhoodChainUsdcTokenAddress,
						tokenDecimals: 6,
						vaultAddress: robinhoodChainUsdcVaultAddress,
						vaultLabel: "Kabon USDC Vault",
					},
				]
			: [],
};

function normalizeGeneratedVaultRegistry() {
	const source = generatedVaultAddresses as GeneratedVaultRegistry;
	const next: Partial<Record<number, SupportedVaultAsset[]>> = {};

	for (const [chainId, assetsBySymbol] of Object.entries(
		source.deployments ?? {},
	)) {
		const numericChainId = Number(chainId);
		next[numericChainId] = Object.values(assetsBySymbol ?? {})
			.map((asset) => {
				const tokenAddress = readAddress(asset.tokenAddress);
				const vaultAddress = readAddress(asset.vaultAddress);
				if (!tokenAddress || !vaultAddress) {
					return null;
				}

				return {
					symbol: asset.symbol,
					name: asset.name,
					tokenAddress,
					tokenDecimals: asset.tokenDecimals,
					vaultAddress,
					vaultLabel: asset.vaultLabel,
				} satisfies SupportedVaultAsset;
			})
			.filter((asset): asset is SupportedVaultAsset => asset !== null);
	}

	return next;
}

function mergeVaultRegistries(
	primary: Partial<Record<number, SupportedVaultAsset[]>>,
	fallback: Partial<Record<number, SupportedVaultAsset[]>>,
) {
	const chainIds = new Set([
		...Object.keys(primary),
		...Object.keys(fallback),
	].map(Number));
	const merged: Partial<Record<number, SupportedVaultAsset[]>> = {};

	for (const chainId of chainIds) {
		const next = new Map<string, SupportedVaultAsset>();
		for (const asset of primary[chainId] ?? []) {
			next.set(asset.symbol, asset);
		}
		for (const asset of fallback[chainId] ?? []) {
			if (!next.has(asset.symbol)) {
				next.set(asset.symbol, asset);
			}
		}
		merged[chainId] = Array.from(next.values());
	}

	return merged;
}

const VAULT_REGISTRY = mergeVaultRegistries(
	normalizeGeneratedVaultRegistry(),
	ENV_VAULT_REGISTRY,
);

export function getSupportedVaultAssets(chainId: number) {
	return VAULT_REGISTRY[chainId] ?? [];
}

export function getSupportedVaultAsset(chainId: number, symbol: string) {
	return getSupportedVaultAssets(chainId).find((asset) => asset.symbol === symbol);
}
