import type { Address } from "viem";

export type SupportedVaultAsset = {
	symbol: string;
	name: string;
	tokenAddress: Address;
	tokenDecimals: number;
	vaultAddress: Address;
	vaultLabel: string;
};

function readAddress(value: string | undefined): Address | undefined {
	if (!value) return undefined;
	return /^0x[a-fA-F0-9]{40}$/.test(value) ? (value as Address) : undefined;
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

const VAULT_REGISTRY: Partial<Record<number, SupportedVaultAsset[]>> = {
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

export function getSupportedVaultAssets(chainId: number) {
	return VAULT_REGISTRY[chainId] ?? [];
}

export function getSupportedVaultAsset(chainId: number, symbol: string) {
	return getSupportedVaultAssets(chainId).find((asset) => asset.symbol === symbol);
}
