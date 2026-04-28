"use client";

import { ArrowLeftRightIcon, Search } from "lucide-react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { reownEnabled } from "@/lib/reown";
import { toast } from "sonner";
import Link from "next/link";
import AppKitButton from "./ui/appkit-button";

export function TopBar() {
	const { open } = useAppKit();
	const { address } = useAppKitAccount();

	return (
		<div className="flex h-16 items-center gap-2.5 border-b border-border bg-background px-3 md:px-6">
			<SidebarTrigger className="-ml-1 size-9 rounded-full border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground" />

			<div className="relative hidden max-w-3xl flex-1 md:block">
				<Search
					size={20}
					className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					placeholder="Search assets"
					className="h-10 rounded-full border-border bg-background pl-12 text-sm shadow-none placeholder:text-muted-foreground/65 focus-visible:ring-0"
				/>
			</div>

			<Button
				asChild
				variant="secondary"
				className="h-10 rounded-full flex px-3 text-sm font-semibold"
			>
				<Link href="/swap">
					<ArrowLeftRightIcon data-icon="inline-start" />
					Swap
				</Link>
			</Button>
			<div className="ml-auto flex items-center gap-2.5">
				{address ? (
					<AppKitButton />
				) : (
					<Button
						size="lg"
						className="h-10 rounded-full px-4 text-sm"
						onClick={() => {
							if (!reownEnabled) {
								toast.error(
									"Set NEXT_PUBLIC_REOWN_PROJECT_ID to enable Reown wallet connect.",
								);
								return;
							}
							open();
						}}
					>
						Connect Wallet
					</Button>
				)}
			</div>
		</div>
	);
}
