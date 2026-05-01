import { parseArgs } from "node:util";

import { network } from "hardhat";

const { values } = parseArgs({
	options: {
		vault: { type: "string" },
		asset: { type: "string" },
	},
	strict: false,
	allowPositionals: true,
});

const vaultAddress =
	(values.vault as `0x${string}` | undefined) ??
	(process.env.VAULT_ADDRESS as `0x${string}` | undefined);
if (!vaultAddress) {
	throw new Error(
		"Missing vault address. Pass --vault with direct script execution or set VAULT_ADDRESS.",
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
	(values.asset as `0x${string}` | undefined) ??
	(process.env.ASSET_ADDRESS as `0x${string}` | undefined) ??
	((await vault.read.asset()) as `0x${string}`);

console.log("Deployer:", deployer.account.address);
console.log("Vault:", vaultAddress);
console.log("Asset:", assetAddress);

const strategy = await viem.deployContract("MockStrategyAdapter", [
	assetAddress,
]);
console.log("MockStrategyAdapter deployed:", strategy.address);

const setVaultHash = await strategy.write.setVault([vaultAddress], {
	account: deployer.account,
});
await publicClient.waitForTransactionReceipt({ hash: setVaultHash });
console.log("setVault tx:", setVaultHash);

const whitelistHash = await vault.write.whitelistStrategy([strategy.address], {
	account: deployer.account,
});
await publicClient.waitForTransactionReceipt({ hash: whitelistHash });
console.log("whitelistStrategy tx:", whitelistHash);

const isWhitelisted = await vault.read.isWhitelistedStrategy([
	strategy.address,
]);
console.log("Whitelisted:", isWhitelisted);

const allStrategies = await vault.read.strategies();
console.log("Total strategies:", allStrategies.length);
console.log("Latest strategy:", allStrategies[allStrategies.length - 1]);
