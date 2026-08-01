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
import { useActiveProjectStore } from "@/store/active-project";

const navItems = [
  { label: "Overview", href: "/projects/dashboard", icon: LayoutDashboardIcon },
  {
    label: "Credentials",
    href: "/projects/dashboard/credentials",
    icon: KeyIcon,
  },
  { label: "STK Push", href: "/projects/dashboard/stk", icon: SmartphoneIcon },
  { label: "C2B", href: "/projects/dashboard/c2b", icon: ArrowLeftRightIcon },
  {
    label: "Request log",
    href: "/projects/dashboard/logs",
    icon: ScrollTextIcon,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const name = useActiveProjectStore((s) => s.name);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-green">
            <PlugZapIcon className="size-3.5 text-white" />
          </div>
          <span className="truncate font-mono text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            {name}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === "/projects/dashboard"
                    ? pathname === item.href
                    : pathname?.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={<Link href={item.href} />}>
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
              render={<Link href="/projects/dashboard/settings" />}>
              <SettingsIcon />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
