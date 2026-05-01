import { parseArgs } from "node:util";

import { network } from "hardhat";
import { getAddress, hexToBigInt, toFunctionSelector } from "viem";

const { values } = parseArgs({
	options: {
		proxy: { type: "string" },
	},
	strict: false,
	allowPositionals: true,
});

const proxy =
	(values.proxy as `0x${string}` | undefined) ??
	(process.env.PROXY_ADDRESS as `0x${string}` | undefined);
if (!proxy) {
	throw new Error(
		"Missing proxy address. Pass --proxy with direct script execution or set PROXY_ADDRESS.",
	);
}

const connection = await network.create();
const { viem } = connection;
const publicClient = await viem.getPublicClient();

const IMPLEMENTATION_SLOT =
	"0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const ADMIN_SLOT =
	"0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";

function slotWordToAddress(word: `0x${string}`): `0x${string}` {
	const asBigInt = hexToBigInt(word);
	const mask160 = (1n << 160n) - 1n;
	const lower160 = asBigInt & mask160;
	const hex = lower160.toString(16).padStart(40, "0");
	return getAddress(`0x${hex}`);
}

const implementationWord = await publicClient.getStorageAt({
	address: proxy,
	slot: IMPLEMENTATION_SLOT,
});
const adminWord = await publicClient.getStorageAt({
	address: proxy,
	slot: ADMIN_SLOT,
});

if (!implementationWord) {
	throw new Error("Failed to read implementation slot from proxy");
}

if (!adminWord) {
	throw new Error("Failed to read admin slot from proxy");
}

const implementation = slotWordToAddress(implementationWord);
const admin = slotWordToAddress(adminWord);

const proxyCode = await publicClient.getBytecode({ address: proxy });
const implementationCode = await publicClient.getBytecode({
	address: implementation,
});

const implementationCodeHex = implementationCode?.toLowerCase() ?? "";
const deployToStrategySelector = toFunctionSelector(
	"deployToStrategy(address,uint256)",
)
	.slice(2)
	.toLowerCase();
const depositAndDeploySelector = toFunctionSelector(
	"depositAndDeployToStrategyFor(address,address,address,uint256)",
)
	.slice(2)
	.toLowerCase();

const hasDeployToStrategy = implementationCodeHex.includes(
	deployToStrategySelector,
);
const hasDepositAndDeploy = implementationCodeHex.includes(
	depositAndDeploySelector,
);

console.log("Proxy:", getAddress(proxy));
console.log("Implementation slot:", IMPLEMENTATION_SLOT);
console.log("Implementation raw:", implementationWord);
console.log("Implementation:", implementation);
console.log(
	"Implementation code bytes:",
	implementationCode ? (implementationCode.length - 2) / 2 : 0,
);
console.log("Admin slot:", ADMIN_SLOT);
console.log("Admin raw:", adminWord);
console.log("Admin:", admin);
console.log("Proxy code bytes:", proxyCode ? (proxyCode.length - 2) / 2 : 0);
console.log("Has deployToStrategy selector:", hasDeployToStrategy);
console.log("Has depositAndDeployToStrategyFor selector:", hasDepositAndDeploy);
