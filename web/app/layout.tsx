import "./globals.css";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { Toaster } from "@/components/ui/sonner";
import { Metadata } from "next";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReownProvider } from "@/components/providers/reown-provider";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
	title: "YieldPilot — AI Treasury Copilot on Arbitrum",
	description:
		"Policy-driven AI treasury copilot for stablecoin allocation on Arbitrum. Deposit USDC, set policy, approve allocations, withdraw on demand.",
	openGraph: {
		title: "YieldPilot — AI Treasury Copilot on Arbitrum",
		description:
			"Policy-driven AI treasury copilot for stablecoin allocation on Arbitrum.",
		type: "website",
	},
	twitter: {
		card: "summary",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={cn("font-sans", geist.variable)}>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
			</head>
			<body>
				<ReownProvider>
					<TooltipProvider>
						<SidebarProvider defaultOpen>
							<div className="flex min-h-screen w-full bg-background text-foreground">
								<AppSidebar />
								<SidebarInset className="flex min-h-screen flex-1 flex-col bg-background">
									<TopBar />
									<main className="flex-1">{children}</main>
								</SidebarInset>
								<Toaster />
							</div>
						</SidebarProvider>
					</TooltipProvider>
				</ReownProvider>
			</body>
		</html>
	);
}
