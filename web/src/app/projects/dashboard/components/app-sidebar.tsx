"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  KeyIcon,
  SmartphoneIcon,
  ArrowLeftRightIcon,
  ScrollTextIcon,
  SettingsIcon,
  PlugZapIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { label: "Overview", href: "", icon: LayoutDashboardIcon },
  { label: "Credentials", href: "credentials", icon: KeyIcon },
  { label: "STK Push", href: "stk", icon: SmartphoneIcon },
  { label: "C2B", href: "c2b", icon: ArrowLeftRightIcon },
  { label: "Request log", href: "logs", icon: ScrollTextIcon },
];

export function AppSidebar({ slug }: { slug: string }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-green">
            <PlugZapIcon className="size-3.5 text-white" />
          </div>
          <span className="truncate font-mono text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            {slug}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const href = item.href
                  ? `/projects/${slug}/${item.href}`
                  : `/projects/${slug}`;
                const isActive = pathname?.startsWith(href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={<Link href={href} />}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Settings"
              render={<Link href={`/projects/${slug}/settings`} />}>
              <SettingsIcon />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
