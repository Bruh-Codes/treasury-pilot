import { parseArgs } from "node:util";

import { network } from "hardhat";

type Address = `0x${string}`;

const { values } = parseArgs({
	options: {
		vault: { type: "string" },
		asset: { type: "string" },
		pool: { type: "string" },
		aToken: { type: "string" },
	},
	strict: false,
	allowPositionals: true,
});

const vaultAddress =
	(values.vault as Address | undefined) ??
	(process.env.VAULT_ADDRESS as Address | undefined);
if (!vaultAddress) {
	throw new Error(
		"Missing vault address. Pass --vault with direct script execution or set VAULT_ADDRESS.",
	);
}

const poolAddress =
	(values.pool as Address | undefined) ??
	(process.env.AAVE_POOL_ADDRESS as Address | undefined);
if (!poolAddress) {
	throw new Error(
		"Missing Aave pool address. Pass --pool or set AAVE_POOL_ADDRESS.",
	);
}

const aTokenAddress =
	(values.aToken as Address | undefined) ??
	(process.env.AAVE_ATOKEN_ADDRESS as Address | undefined);
if (!aTokenAddress) {
	throw new Error(
		"Missing Aave aToken address. Pass --aToken or set AAVE_ATOKEN_ADDRESS.",
	);
}

const connection = await network.create();
const { viem } = connection;
const [deployer] = await viem.getWalletClients();
const publicClient = await viem.getPublicClient();

if (!deployer?.account?.address) {
	throw new Error("No deployer wallet configured for selected network");
}

const vault = await viem.getContractAt("YieldPilotVault", vaultAddress);

const assetAddress =
	(values.asset as Address | undefined) ??
	(process.env.ASSET_ADDRESS as Address | undefined) ??
	((await vault.read.asset()) as Address);

console.log("Deployer:", deployer.account.address);
console.log("Vault:", vaultAddress);
console.log("Asset:", assetAddress);
console.log("Aave Pool:", poolAddress);
console.log("Aave aToken:", aTokenAddress);

const strategy = await viem.deployContract("AaveV3StrategyAdapter", [
	assetAddress,
	poolAddress,
	aTokenAddress,
	vaultAddress,
]);
console.log("AaveV3StrategyAdapter deployed:", strategy.address);

const whitelistHash = await vault.write.whitelistStrategy([strategy.address], {
	account: deployer.account,
});
await publicClient.waitForTransactionReceipt({ hash: whitelistHash });
console.log("whitelistStrategy tx:", whitelistHash);

const isWhitelisted = await vault.read.isWhitelistedStrategy([strategy.address]);
console.log("Whitelisted:", isWhitelisted);

const allStrategies = await vault.read.strategies();
console.log("Total strategies:", allStrategies.length);
console.log("Latest strategy:", allStrategies[allStrategies.length - 1]);
