export const aavePoolAbi = [
	{
		name: "withdraw",
		type: "function",
		stateMutability: "nonpayable",
		inputs: [
			{ name: "asset", type: "address" },
			{ name: "amount", type: "uint256" },
			{ name: "to", type: "address" },
		],
		outputs: [{ name: "", type: "uint256" }],
	},
] as const;

export const AAVE_POOL_ADDRESSES: Record<number, `0x${string}`> = {
	421614: "0x794a61358D6845594F94dc1DB02A252b5b4814aD" as `0x${string}`, // Arbitrum Sepolia
};
