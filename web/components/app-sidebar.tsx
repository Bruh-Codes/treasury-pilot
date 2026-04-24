"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Activity,
	CircleArrowDown,
	CircleArrowUp,
	FileCode2,
	LayoutGrid,
	Landmark,
	Lock,
	Globe,
	ArrowLeftRightIcon,
} from "lucide-react";
import Kabon from "@/public/kabon.svg";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import Image from "next/image";

const main = [{ to: "/", label: "Dashboard", icon: LayoutGrid }] as const;

const explore = [
	{ to: "/withdraw", label: "Withdraw", icon: CircleArrowUp },
	{ to: "/swap", label: "Swap", icon: ArrowLeftRightIcon },
	{ to: "/activity", label: "Activity", icon: Activity },
] as const;

const protocolLocked = [
	{ to: "/protocol", label: "Protocol", icon: Globe },
	{ label: "Governance", icon: Landmark },
	{ label: "Developer Docs", icon: FileCode2 },
] as const;

export function AppSidebar() {
	const path = usePathname();
	const isActive = (to: string) => {
		if (to === "/") return path === "/";
		return path === to || path.startsWith(`${to}/`);
	};

	return (
		<Sidebar
			collapsible="icon"
			className="border-r border-sidebar-border bg-sidebar"
		>
			<SidebarHeader className="border-b border-sidebar-border px-4 py-4.5 group-data-[collapsible=icon]:px-2">
				<Link
					href="/"
					className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center"
				>
					<Image className="grayscale" alt="kabon" height={30} src={Kabon} />
				</Link>
			</SidebarHeader>

			<SidebarContent className="px-3 py-4 group-data-[collapsible=icon]:px-2">
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu className="gap-1.5">
							{main.map((item) => {
								const active = isActive(item.to);
								return (
									<SidebarMenuItem key={item.label}>
										<SidebarMenuButton
											asChild
											isActive={active}
											tooltip={item.label}
											className={cn(
												"h-9 rounded-xl px-3 text-[13px] text-sidebar-foreground/78 hover:!bg-transparent hover:text-sidebar-foreground active:!bg-transparent group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
												active &&
													"!bg-sidebar-accent text-sidebar-accent-foreground font-semibold hover:!bg-sidebar-accent",
											)}
										>
											<Link href={item.to}>
												<item.icon className="size-4" />
												<span className="group-data-[collapsible=icon]:hidden">
													{item.label}
												</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup>
					<SidebarGroupLabel className="px-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground/70 group-data-[collapsible=icon]:hidden">
						EXPLORE
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu className="gap-1.5">
							{explore.map((item) => {
								const active = isActive(item.to);
								return (
									<SidebarMenuItem key={item.label}>
										<SidebarMenuButton
											asChild
											isActive={active}
											tooltip={item.label}
											className={cn(
												"h-9 rounded-xl px-3 text-[13px] text-sidebar-foreground/78 hover:!bg-transparent hover:text-sidebar-foreground active:!bg-transparent group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
												active &&
													"!bg-sidebar-accent text-sidebar-accent-foreground font-semibold hover:!bg-sidebar-accent",
											)}
										>
											<Link href={item.to}>
												<item.icon className="size-4" />
												<span className="group-data-[collapsible=icon]:hidden">
													{item.label}
												</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup>
					<SidebarGroupLabel className="px-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground/70 group-data-[collapsible=icon]:hidden">
						PROTOCOL
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu className="gap-1.5">
							{protocolLocked.map((item) => {
								if ("to" in item) {
									const active = isActive(item.to);
									return (
										<SidebarMenuItem key={item.label}>
											<SidebarMenuButton
												asChild
												isActive={active}
												tooltip={item.label}
												className={cn(
													"h-9 rounded-xl px-3 text-[13px] text-sidebar-foreground/78 hover:!bg-transparent hover:text-sidebar-foreground active:!bg-transparent group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
													active &&
														"!bg-sidebar-accent text-sidebar-accent-foreground font-semibold hover:!bg-sidebar-accent",
												)}
											>
												<Link href={item.to}>
													<item.icon className="size-4" />
													<span className="group-data-[collapsible=icon]:hidden">
														{item.label}
													</span>
												</Link>
											</SidebarMenuButton>
										</SidebarMenuItem>
									);
								}
								return (
									<SidebarMenuItem key={item.label}>
										<SidebarMenuButton
											tooltip={`${item.label} - coming soon`}
											aria-disabled
											className="h-9 cursor-not-allowed rounded-xl px-3 text-[13px] text-muted-foreground/60 hover:bg-transparent hover:text-muted-foreground/60 group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
										>
											<item.icon className="size-4" />
											<span className="flex-1 group-data-[collapsible=icon]:hidden">
												{item.label}
											</span>
											<Lock className="size-3 opacity-60 group-data-[collapsible=icon]:hidden" />
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	);
}
