"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface VaultQrCodeProps {
	vaultAddress?: string;
}

export function VaultQrCode({ vaultAddress }: VaultQrCodeProps) {
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!vaultAddress) return;

		const generateQR = async () => {
			try {
				// Generate QR code with the vault address
				const qrDataUrl = await QRCode.toDataURL(vaultAddress, {
					width: 140,
					margin: 2,
					color: {
						dark: "#111111",
						light: "#FFFFFF",
					},
				});
				setQrDataUrl(qrDataUrl);
			} catch (error) {
				console.error("Failed to generate QR code:", error);
			}
		};

		generateQR();
	}, [vaultAddress]);

	if (!qrDataUrl) {
		return (
			<div className="flex size-full w-full items-center justify-center rounded-[18px] bg-muted">
				<div className="text-xs text-muted-foreground">Loading QR...</div>
			</div>
		);
	}

	return (
		<img
			src={qrDataUrl}
			alt="Vault address QR code"
			className="size-full w-full rounded-[18px]"
		/>
	);
}
