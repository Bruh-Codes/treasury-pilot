export const yieldPilotVaultAbi = [
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
] as const;
