"use client";

import { ArrowLeftRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useVault, vaultStore } from "@/lib/vault-store";

export function TopBar() {
	const v = useVault();
	const router = useRouter();

	return (
		<div className="flex h-16 items-center gap-2.5 border-b border-border bg-background px-3 md:px-6">
			<SidebarTrigger className="-ml-1 size-9 rounded-full border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground" />

			<div className="relative hidden max-w-3xl flex-1 md:block">
				<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Search assets"
					className="h-10 rounded-full border-border bg-background pl-12 text-sm shadow-none placeholder:text-muted-foreground/65 focus-visible:ring-0"
				/>
			</div>

			<div className="ml-auto flex items-center gap-2.5">
				<Button
					variant="secondary"
					size="lg"
					className="h-10 rounded-full px-4 text-sm"
				>
					<ArrowLeftRight data-icon="inline-start" />
					Swap
				</Button>

				{v.connected ? (
					<Button
						variant="secondary"
						size="lg"
						className="h-10 rounded-full px-3 text-sm"
						onClick={() => vaultStore.disconnect()}
					>
						<Avatar className="size-7">
							<AvatarFallback className="bg-[radial-gradient(circle_at_35%_35%,#3772ff_0%,#7c3aed_100%)] text-white">
								0x
							</AvatarFallback>
						</Avatar>
						<span className="font-mono text-xs">{v.address}</span>
					</Button>
				) : (
					<Button
						size="lg"
						className="h-10 rounded-full px-4 text-sm"
						onClick={() => {
							vaultStore.connect();
							router.push("/policy");
						}}
					>
						Connect Wallet
					</Button>
				)}
			</div>
		</div>
	);
}
