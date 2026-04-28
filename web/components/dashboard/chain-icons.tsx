"use client";

export function ArbitrumIcon() {
	return (
		<div className="flex size-10 items-center justify-center rounded-full border border-border/60 bg-background">
			<svg viewBox="0 0 32 32" className="size-5">
				<circle cx="16" cy="16" r="16" fill="#1F2937" />
				<path d="M16 5l8 4.6v12.8L16 27l-8-4.6V9.6L16 5z" fill="#213147" />
				<path d="M19.9 10.7l-1.6 4.1 2.7 6.9 2.1-1.2-3.2-9.8z" fill="#12AAFF" />
				<path d="M13.7 17.6h4.8l.8 2.2h-4.8l-.8-2.2z" fill="#9DCCED" />
				<path
					d="M15.6 8.8l-5.1 12.8 2.1 1.2 5.1-12.8-2.1-1.2z"
					fill="#FFFFFF"
				/>
				<path d="M13.7 17.6h4.8l.8 2.2h-4.8l-.8-2.2z" fill="#9DCCED" />
			</svg>
		</div>
	);
}

export function RobinhoodChainIcon() {
	return (
		<div className="flex size-10 items-center justify-center rounded-full border border-border/60 bg-background">
			<div className="flex size-5 items-center justify-center rounded-full bg-[#C8FF5A] text-[10px] font-bold text-black">
				RH
			</div>
		</div>
	);
}

interface SupportedChainIconProps {
	kind: "arbitrum" | "robinhood";
}

export function SupportedChainIcon({ kind }: SupportedChainIconProps) {
	if (kind === "robinhood") {
		return <RobinhoodChainIcon />;
	}

	return <ArbitrumIcon />;
}
