import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutGrid,
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Globe,
  Landmark,
  FileCode2,
  ExternalLink,
  Lock,
  Sparkles,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const main = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/activity", label: "Activity", icon: Activity },
] as const;

const explore = [
  { to: "/", label: "Markets", icon: ArrowDownToLine },
  { to: "/policy", label: "Deposit", icon: ArrowDownToLine },
  { to: "/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { to: "/recommendation", label: "Recommend", icon: Sparkles },
] as const;

const protocolLocked = [
  { label: "Insights", icon: BarChart3 },
  { label: "Protocol", icon: Globe, external: true },
  { label: "Governance", icon: Landmark, external: true },
  { label: "Developer Docs", icon: FileCode2, external: true },
  { label: "Access Vault V1", icon: ExternalLink, external: true },
] as const;

export function AppSidebar() {
  const location = useLocation();
  const path = location.pathname;
  const isActive = (to: string) =>
    to === "/" ? path === "/" : path === to || path.startsWith(to + "/");

  return (
    <Sidebar collapsible="icon" className="border-r hairline">
      <SidebarHeader className="px-3 pt-4 pb-2">
        <Link to="/" className="flex items-center gap-2 px-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border hairline bg-foreground/95">
            <div className="h-2 w-2 rounded-[2px] bg-background" />
          </div>
          <span className="font-display text-[15px] font-semibold tracking-tight">
            YieldPilot
          </span>
          <span className="ml-1 rounded-md border hairline bg-surface px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            Pro
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Main */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.to)}
                    tooltip={item.label}
                    className={cn(
                      "h-10 rounded-md text-[13.5px] data-[active=true]:bg-sidebar-accent data-[active=true]:text-foreground data-[active=true]:font-semibold",
                    )}
                  >
                    <Link to={item.to}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Explore */}
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground/70">
            EXPLORE
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {explore.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.to)}
                    tooltip={item.label}
                    className="h-10 rounded-md text-[13.5px] data-[active=true]:bg-sidebar-accent data-[active=true]:text-foreground data-[active=true]:font-semibold"
                  >
                    <Link to={item.to}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Locked Protocol section */}
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground/70">
            PROTOCOL
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {protocolLocked.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    tooltip={`${item.label} — coming soon`}
                    aria-disabled
                    className="h-10 cursor-not-allowed rounded-md text-[13.5px] text-muted-foreground/70 hover:bg-transparent hover:text-muted-foreground/70"
                  >
                    <item.icon className="h-4 w-4 opacity-70" />
                    <span className="flex-1">{item.label}</span>
                    {"external" in item && item.external ? (
                      <Lock className="h-3 w-3 opacity-60" />
                    ) : (
                      <Lock className="h-3 w-3 opacity-60" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 pb-4">
        <div className="rounded-lg border hairline bg-surface px-3 py-2.5">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
            Arbitrum Sepolia
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted-foreground/70">
            v0.1 · demo network
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
