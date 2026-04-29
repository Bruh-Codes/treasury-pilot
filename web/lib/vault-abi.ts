export const yieldPilotVaultAbi = [
	{
		type: "function",
		name: "previewWithdrawalFee",
		stateMutability: "view",
		inputs: [{ name: "requestedAssets", type: "uint256" }],
		outputs: [
			{ name: "availableNow", type: "uint256" },
			{ name: "needsUnwind", type: "uint256" },
			{ name: "feeAssets", type: "uint256" },
		],
	},
	{
		type: "function",
		name: "previewWithdraw",
		stateMutability: "view",
		inputs: [{ name: "assets", type: "uint256" }],
		outputs: [{ name: "shares", type: "uint256" }],
	},
	{
		type: "function",
		name: "previewRedeem",
		stateMutability: "view",
		inputs: [{ name: "shares", type: "uint256" }],
		outputs: [{ name: "assets", type: "uint256" }],
	},
	{
		type: "function",
		name: "deposit",
		stateMutability: "nonpayable",
		inputs: [
			{ name: "assets", type: "uint256" },
			{ name: "receiver", type: "address" },
		],
		outputs: [{ name: "shares", type: "uint256" }],
	},
	{
		type: "function",
		name: "withdraw",
		stateMutability: "nonpayable",
		inputs: [
			{ name: "assets", type: "uint256" },
			{ name: "receiver", type: "address" },
			{ name: "owner", type: "address" },
		],
		outputs: [{ name: "shares", type: "uint256" }],
	},
	{
		type: "function",
		name: "redeem",
		stateMutability: "nonpayable",
		inputs: [
			{ name: "shares", type: "uint256" },
			{ name: "receiver", type: "address" },
			{ name: "owner", type: "address" },
		],
		outputs: [{ name: "assets", type: "uint256" }],
	},
] as const;
