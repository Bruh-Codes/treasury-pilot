import { createAppKit } from "@reown/appkit/react";
import type { AppKitNetwork } from "@reown/appkit-common";
import { arbitrum, arbitrumSepolia } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

export const reownProjectId =
	process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ??
	process.env.NEXT_PUBLIC_PROJECT_ID ??
	"reown-project-id";

export const reownEnabled =
	Boolean(process.env.NEXT_PUBLIC_REOWN_PROJECT_ID) ||
	Boolean(process.env.NEXT_PUBLIC_PROJECT_ID);

export const reownNetworks = [
	arbitrum,
	arbitrumSepolia,
] as [AppKitNetwork, ...AppKitNetwork[]];

export const wagmiAdapter = new WagmiAdapter({
	projectId: reownProjectId,
	networks: reownNetworks,
	ssr: false,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

const metadata = {
	name: "YieldPilot",
	description: "AI treasury copilot for deposits and withdrawals on Arbitrum",
	url: "http://localhost:3000",
	icons: ["http://localhost:3000/favicon.ico"],
};

let appKitCreated = false;

export function ensureReownAppKit() {
	if (appKitCreated) return;

	createAppKit({
		adapters: [wagmiAdapter],
		projectId: reownProjectId,
		networks: reownNetworks,
		metadata,
		features: {
			analytics: false,
		},
	});

	appKitCreated = true;
}
