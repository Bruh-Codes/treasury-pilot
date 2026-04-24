"use client";
import "./widget.css";
import { SwapWidget, darkTheme } from "@uniswap/widgets";

interface UniswapWidgetProps {
	provider: any;
	jsonRpcUrlMap: Record<number, string>;
}

// This component is only ever loaded client-side (via dynamic import with ssr:false)
// so styled-components initialises correctly and the widget's internal z-index/CSS works.
export default function UniswapWidget({
	provider,
	jsonRpcUrlMap,
}: UniswapWidgetProps) {
	return (
		<div className="relative z-10 w-[360px] rounded-2xl bg-[#100f0f] shadow-2xl">
			<SwapWidget
				provider={provider}
				jsonRpcUrlMap={jsonRpcUrlMap}
				tokenList="https://unpkg.com/@uniswap/default-token-list@11.0.0/build/uniswap-default.tokenlist.json"
				theme={{
					...darkTheme,
					accent: "#8b7eff",
					primary: "#ffffff",
					secondary: "rgba(255,255,255,0.7)",
					interactive: "rgba(255,255,255,0.08)",
					container: "#151414",
					module: "#1a1919",
					dialog: "#100f0f",
					outline: "rgba(255,255,255,0.08)",
					active: "rgba(255,255,255,0.08)",
				}}
				width={360}
				hideConnectionUI={true}
			/>
		</div>
	);
}
