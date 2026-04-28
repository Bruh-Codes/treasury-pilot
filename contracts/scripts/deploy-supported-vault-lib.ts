import fs from "node:fs/promises";
import path from "node:path";

import { network as hardhatNetwork } from "hardhat";
import { encodeFunctionData } from "viem";

import {
	getSupportedAsset,
	SUPPORTED_NETWORKS,
	type SupportedDeploymentNetwork,
} from "../config/supported-assets.js";

type GeneratedVaultRegistry = {
	generatedAt: string;
	deployments: Record<
		string,
		Record<
			string,
			{
				symbol: string;
				name: string;
				tokenAddress: `0x${string}`;
				tokenDecimals: number;
				vaultAddress: `0x${string}`;
				vaultLabel: string;
				network: string;
				sourceOfTruthUrl: string;
				deployedAt: string;
			}
		>
	>;
};

export type DeploySupportedVaultOptions = {
	assetSymbol: string;
	networkName: SupportedDeploymentNetwork;
	feeRecipient?: `0x${string}`;
	unwindFeeBps?: bigint;
	vaultName?: string;
	vaultSymbol?: string;
	writeFrontend?: boolean;
};

export async function deploySupportedVault({
	assetSymbol,
	networkName,
	feeRecipient,
	unwindFeeBps = 500n,
	vaultName,
	vaultSymbol,
	writeFrontend = true,
}: DeploySupportedVaultOptions) {
	if (!(networkName in SUPPORTED_NETWORKS)) {
		throw new Error(
			`Unsupported network "${networkName}". Expected one of: ${Object.keys(
				SUPPORTED_NETWORKS,
			).join(", ")}`,
		);
	}

	const normalizedAssetSymbol = assetSymbol.toUpperCase();
	const asset = getSupportedAsset(networkName, normalizedAssetSymbol);
	if (!asset) {
		throw new Error(
			`Unsupported asset "${normalizedAssetSymbol}" on ${networkName}. Add it to contracts/config/supported-assets.ts first.`,
		);
	}

	if (unwindFeeBps > 1_000n) {
		throw new Error("Unwind fee bps must be 1000 or less.");
	}

	const connection = await hardhatNetwork.create({
		network: networkName,
	});
	const { viem } = connection;
	const [deployer] = await viem.getWalletClients();
	if (!deployer?.account?.address) {
		throw new Error("No deployer account available for the selected network.");
	}

	const owner = deployer.account.address;
	const resolvedFeeRecipient = feeRecipient ?? owner;
	const resolvedVaultName = vaultName ?? `Kabon ${asset.symbol} Vault`;
	const resolvedVaultSymbol = vaultSymbol ?? `kb${asset.symbol}`;

	console.log(
		`Deploying ${resolvedVaultName} (${resolvedVaultSymbol}) for ${asset.symbol} to ${SUPPORTED_NETWORKS[networkName].label} (${SUPPORTED_NETWORKS[networkName].chainId})`,
	);
	console.log(`Underlying token: ${asset.address}`);
	console.log(`Source: ${asset.sourceOfTruthUrl}`);

	const implementation = await viem.deployContract("YieldPilotVault");
	const initializeCall = encodeFunctionData({
		abi: implementation.abi,
		functionName: "initialize",
		args: [asset.address, resolvedVaultName, resolvedVaultSymbol, owner],
	});

	const proxy = await viem.deployContract("TransparentUpgradeableProxy", [
		implementation.address,
		owner,
		initializeCall,
	]);

	const vault = await viem.getContractAt("YieldPilotVault", proxy.address);
	const setFeeHash = await vault.write.setWithdrawalFee(
		[resolvedFeeRecipient, Number(unwindFeeBps)],
		{
			account: deployer.account,
		},
	);
	const publicClient = await viem.getPublicClient();
	await publicClient.waitForTransactionReceipt({ hash: setFeeHash });

	console.log(`Implementation: ${implementation.address}`);
	console.log(`Vault proxy: ${proxy.address}`);
	console.log(`Fee recipient: ${resolvedFeeRecipient}`);
	console.log(`Unwind fee bps: ${unwindFeeBps}`);

	if (writeFrontend) {
		const generatedPath = path.resolve(
			process.cwd(),
			"../web/lib/generated/vault-addresses.json",
		);

		const existing = await readGeneratedVaultRegistry(generatedPath);
		const chainIdKey = String(SUPPORTED_NETWORKS[networkName].chainId);
		const next: GeneratedVaultRegistry = {
			generatedAt: new Date().toISOString(),
			deployments: {
				...existing.deployments,
				[chainIdKey]: {
					...(existing.deployments[chainIdKey] ?? {}),
					[asset.symbol]: {
						symbol: asset.symbol,
						name: asset.name,
						tokenAddress: asset.address,
						tokenDecimals: asset.decimals,
						vaultAddress: proxy.address,
						vaultLabel: resolvedVaultName,
						network: SUPPORTED_NETWORKS[networkName].label,
						sourceOfTruthUrl: asset.sourceOfTruthUrl,
						deployedAt: new Date().toISOString(),
					},
				},
			},
		};

		await fs.mkdir(path.dirname(generatedPath), { recursive: true });
		await fs.writeFile(generatedPath, JSON.stringify(next, null, 2) + "\n", "utf8");
		console.log(`Updated frontend vault registry: ${generatedPath}`);
	}

	return {
		implementationAddress: implementation.address,
		vaultAddress: proxy.address,
		feeRecipient: resolvedFeeRecipient,
		unwindFeeBps,
		asset,
		network: SUPPORTED_NETWORKS[networkName],
	};
}

async function readGeneratedVaultRegistry(
	filePath: string,
): Promise<GeneratedVaultRegistry> {
	try {
		const raw = await fs.readFile(filePath, "utf8");
		const parsed = JSON.parse(raw) as Partial<GeneratedVaultRegistry>;
		return {
			generatedAt: parsed.generatedAt ?? new Date(0).toISOString(),
			deployments: parsed.deployments ?? {},
		};
	} catch {
		return {
			generatedAt: new Date(0).toISOString(),
			deployments: {},
		};
	}
}
