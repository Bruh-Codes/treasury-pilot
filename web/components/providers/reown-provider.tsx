"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { WagmiProvider } from "wagmi";
import { ensureReownAppKit, wagmiConfig } from "@/lib/reown";

export function ReownProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						refetchOnReconnect: true,
					},
				},
			}),
	);
	ensureReownAppKit();

	return (
		<WagmiProvider config={wagmiConfig}>
			<QueryClientProvider client={queryClient}>
				{children}
				<ReactQueryDevtools initialIsOpen={false} />
			</QueryClientProvider>
		</WagmiProvider>
	);
}
