import { parseArgs } from "node:util";

import type { SupportedDeploymentNetwork } from "../config/supported-assets.js";
import { deploySupportedVault } from "./deploy-supported-vault-lib.js";

const { values } = parseArgs({
	options: {
		asset: {
			type: "string",
		},
		network: {
			type: "string",
		},
		"fee-recipient": {
			type: "string",
		},
		"unwind-fee-bps": {
			type: "string",
		},
		name: {
			type: "string",
		},
		"vault-symbol": {
			type: "string",
		},
		"write-frontend": {
			type: "boolean",
			default: true,
		},
	},
	strict: false,
	allowPositionals: true,
});

const assetArg = typeof values.asset === "string" ? values.asset : undefined;
const networkArg =
	typeof values.network === "string" ? values.network : undefined;
const feeRecipientArg =
	typeof values["fee-recipient"] === "string"
		? (values["fee-recipient"] as `0x${string}`)
		: undefined;
const unwindFeeBpsArg =
	typeof values["unwind-fee-bps"] === "string"
		? values["unwind-fee-bps"]
		: undefined;
const vaultNameArg = typeof values.name === "string" ? values.name : undefined;
const vaultSymbolArg =
	typeof values["vault-symbol"] === "string"
		? values["vault-symbol"]
		: undefined;
const writeFrontendArg =
	typeof values["write-frontend"] === "boolean"
		? values["write-frontend"]
		: true;

const assetSymbol = assetArg ?? process.env.DEPLOY_ASSET;
if (!assetSymbol) {
	throw new Error(
		"Missing asset selection. Set DEPLOY_ASSET=USDC or pass --asset when running the script directly with tsx/node.",
	);
}

const networkName = (networkArg ??
	process.env.DEPLOY_NETWORK ??
	process.env.HARDHAT_NETWORK) as SupportedDeploymentNetwork | undefined;
if (!networkName) {
	throw new Error(
		"Missing network selection. Use --network with Hardhat, or set DEPLOY_NETWORK.",
	);
}

const unwindFeeBpsRaw = unwindFeeBpsArg ?? process.env.DEPLOY_UNWIND_FEE_BPS;

await deploySupportedVault({
	assetSymbol,
	networkName,
	feeRecipient:
		feeRecipientArg ??
		(process.env.DEPLOY_FEE_RECIPIENT as `0x${string}` | undefined),
	unwindFeeBps: unwindFeeBpsRaw ? BigInt(unwindFeeBpsRaw) : undefined,
	vaultName: vaultNameArg ?? process.env.DEPLOY_VAULT_NAME,
	vaultSymbol: vaultSymbolArg ?? process.env.DEPLOY_VAULT_SYMBOL,
	writeFrontend: writeFrontendArg,
});
