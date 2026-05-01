import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
	plugins: [hardhatToolboxViemPlugin],
	verify: {
		etherscan: {
			apiKey: configVariable("ARBISCAN_API_KEY"),
		},
	},
	solidity: {
		npmFilesToBuild: [
			"@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol",
			"@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol",
		],
		profiles: {
			default: {
				version: "0.8.28",
				settings: {
					optimizer: {
						enabled: true,
						runs: 200,
					},
				},
			},
			production: {
				version: "0.8.28",
				settings: {
					optimizer: {
						enabled: true,
						runs: 200,
					},
				},
			},
		},
	},
	networks: {
		arbitrum: {
			type: "http",
			chainType: "generic",
			url: configVariable("ARBITRUM_RPC_URL"),
			accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
		},
		arbitrumSepolia: {
			type: "http",
			chainType: "generic",
			url: configVariable("ARBITRUM_SEPOLIA_RPC_URL"),
			accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
		},
		robinhoodChainTestnet: {
			type: "http",
			chainType: "op",
			url: configVariable("ROBINHOOD_CHAIN_TESTNET_RPC_URL"),
			accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
		},
		hardhatMainnet: {
			type: "edr-simulated",
			chainType: "l1",
		},
		hardhatOp: {
			type: "edr-simulated",
			chainType: "op",
		},
		sepolia: {
			type: "http",
			chainType: "l1",
			url: configVariable("SEPOLIA_RPC_URL"),
			accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
		},
	},
});
