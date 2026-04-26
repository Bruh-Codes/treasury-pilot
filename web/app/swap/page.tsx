"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useClient } from "wagmi";
import { createRpcUrlMap, isChainSupported } from "@/lib/chains-config";
import { providers } from "ethers";

// Load the Uniswap widget only on the client side.
// This is critical: @uniswap/widgets uses styled-components which must initialise
// at runtime. SSR causes CSS class mismatches that break internal z-index / overlay stacking.
const UniswapWidget = dynamic(() => import("./UniswapWidget"), {
	ssr: false,
	loading: () => (
		<div
			style={{ width: 360 }}
			className="h-[360px] rounded-2xl bg-white/5 animate-pulse"
		/>
	),
});

export default function SwapPage() {
	const { address, connector, chainId } = useAccount();
	const client = useClient();
	const [provider, setProvider] = useState<any>(undefined);

	if (typeof window !== "undefined") {
		// @ts-ignore
		window.Browser = {
			T: () => {},
		};
	}

	const jsonRpcUrlMap = useMemo(() => createRpcUrlMap(), []);

	useEffect(() => {
		if (connector) {
			// Try different methods to get provider from connector
			if (typeof connector.getProvider === "function") {
				connector
					.getProvider()
					.then((provider: any) => {
						const ethersProvider = new providers.Web3Provider(provider, "any");
						setProvider(ethersProvider);
					})
					.catch((error) => {
						console.error(
							"Failed to get provider from connector.getProvider():",
							error,
						);
						// Try fallback method
						tryFallbackProvider();
					});
			} else {
				tryFallbackProvider();
			}
		} else {
			setProvider(undefined);
		}

		function tryFallbackProvider() {
			if (client) {
				try {
					const transport = client.transport;
					const customProvider = {
						request: transport.request.bind(transport),
						on: () => {},
						removeListener: () => {},
						removeAllListeners: () => {},
					};
					const ethersProvider = new providers.Web3Provider(
						customProvider,
						"any",
					);
					setProvider(ethersProvider);
				} catch (error) {
					console.error("Fallback provider also failed:", error);
					setProvider(undefined);
				}
			} else {
				setProvider(undefined);
			}
		}
	}, [connector, client]);

	const isSupportedChain = useMemo(() => isChainSupported(chainId), [chainId]);
	const convenienceFee = parseFloat(
		process.env.NEXT_PUBLIC_CONVENIENCE_FEE || "0.01",
	);
	const convenienceFeeRecipient =
		process.env.NEXT_PUBLIC_CONVENIENCE_FEE_RECIPIENT;

	return (
		<div className="px-6 md:px-7 grid place-content-center flex flex-col items-center min-h-[80vh]">
			<UniswapWidget
				provider={provider}
				jsonRpcUrlMap={jsonRpcUrlMap}
				convenienceFee={
					convenienceFee ? Math.floor(convenienceFee * 10000) : undefined
				}
				convenienceFeeRecipient={convenienceFeeRecipient || undefined}
			/>

			{!address ? (
				<p className="mt-6 text-sm text-muted-foreground">
					Please connect your wallet in the top right to enable swapping.
				</p>
			) : !isSupportedChain ? (
				<p className="mt-6 text-sm text-red-400">
					Your currently connected network is not supported for swapping. Please
					switch to a supported chain.
				</p>
			) : null}
		</div>
	);
}
