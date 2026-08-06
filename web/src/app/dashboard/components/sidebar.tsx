"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  KeyIcon,
  ArrowLeftRightIcon,
  ScrollTextIcon,
  SettingsIcon,
  RadioIcon,
  SmartphoneIcon,
} from "lucide-react";
import { RxDashboard } from "react-icons/rx";
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
import { useActiveProjectStore } from "@/store/active-project";
import { cn, stripTrailingSlash } from "@/lib/utils";

const navGroups = [
  {
    label: "Testing",
    items: [
      {
        label: "Overview",
        href: "/dashboard",
        icon: RxDashboard,
      },
      {
        label: "STK Push",
        href: "/dashboard/stk",
        icon: SmartphoneIcon,
      },
      {
        label: "C2B",
        href: "/dashboard/c2b",
        icon: ArrowLeftRightIcon,
      },
    ],
  },
  {
    label: "Monitor",
    items: [
      {
        label: "Request log",
        href: "/dashboard/logs",
        icon: ScrollTextIcon,
      },
      {
        label: "Credentials",
        href: "/dashboard/credentials",
        icon: KeyIcon,
      },
    ],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const name = useActiveProjectStore((s) => s.name);

  const normalizedPath = pathname ? stripTrailingSlash(pathname) : "";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-13 justify-center border-b border-border">
        <div className="flex items-center gap-2.5 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="relative flex size-7 shrink-0 items-center justify-center rounded-lg border border-green-mid bg-green-light">
            <RadioIcon className="size-3.75 text-green" />
            <span className="absolute -right-0.5 -top-0.5 flex size-1.75 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-60" />
              <span className="relative inline-flex size-1.75 rounded-full bg-green ring-2 ring-sidebar" />
            </span>
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-[13.5px] font-medium leading-tight text-foreground">
              {name}
            </p>
            <p className="truncate font-mono text-[11px] leading-tight text-muted-foreground">
              daraja-local
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? normalizedPath === item.href
                      : normalizedPath?.startsWith(item.href);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        render={<Link href={item.href} />}
                        className={cn(
                          "relative h-9 gap-2.5 pl-3 text-[13.5px] transition-colors hover:bg-surface-2/60 [&_svg]:size-4.5 group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pl-0",
                          isActive &&
                            "bg-green-light/40 text-green hover:bg-green-light/40 hover:text-green data-active:bg-green-light/40 data-active:text-green before:absolute before:inset-y-1 before:left-0 before:w-[2.5px] before:rounded-r-full before:bg-green group-data-[collapsible=icon]:before:hidden",
                        )}>
                        <item.icon />
                        <span className="group-data-[collapsible=icon]:hidden">
                          {item.label}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={normalizedPath === "/dashboard/settings"}
              tooltip="Settings"
              render={<Link href="/dashboard/settings" />}
              className={cn(
                "relative h-9 gap-2.5 pl-3 text-[13.5px] transition-colors hover:bg-surface-2/60 [&_svg]:size-4.5 group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pl-0",
                normalizedPath === "/dashboard/settings" &&
                  "bg-green-light/40 text-green hover:bg-green-light/40 hover:text-green data-active:bg-green-light/40 data-active:text-green before:absolute before:inset-y-1 before:left-0 before:w-[2.5px] before:rounded-r-full before:bg-green group-data-[collapsible=icon]:before:hidden",
              )}>
              <SettingsIcon />
              <span className="group-data-[collapsible=icon]:hidden">
                Settings
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
