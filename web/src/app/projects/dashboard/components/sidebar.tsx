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
  RadioIcon,
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
import { useActiveProjectStore } from "@/store/active-project";
import { cn, stripTrailingSlash } from "@/lib/utils";

const navGroups = [
  {
    label: "Testing",
    items: [
      {
        label: "Overview",
        href: "/projects/dashboard",
        icon: LayoutDashboardIcon,
      },
      {
        label: "STK Push",
        href: "/projects/dashboard/stk",
        icon: SmartphoneIcon,
      },
      {
        label: "C2B",
        href: "/projects/dashboard/c2b",
        icon: ArrowLeftRightIcon,
      },
    ],
  },
  {
    label: "Monitor",
    items: [
      {
        label: "Request log",
        href: "/projects/dashboard/logs",
        icon: ScrollTextIcon,
      },
      {
        label: "Credentials",
        href: "/projects/dashboard/credentials",
        icon: KeyIcon,
      },
    ],
  },
];

export function ProjectSidebar() {
  const pathname = usePathname();
  const name = useActiveProjectStore((s) => s.name);

  const normalizedPath = pathname ? stripTrailingSlash(pathname) : "";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-13 justify-center border-b border-border">
        <div className="flex items-center gap-2.5 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="relative flex size-7 shrink-0 items-center justify-center rounded-lg border border-green-mid bg-green-light">
            <RadioIcon className="size-3.75 text-green" />
            <span className="absolute -right-0.5 -top-0.5 size-1.75 rounded-full bg-green ring-2 ring-sidebar" />
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
                    item.href === "/projects/dashboard"
                      ? normalizedPath === item.href
                      : normalizedPath?.startsWith(item.href);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        render={<Link href={item.href} />}
                        className={cn(
                          "relative h-9 gap-2.5 pl-3 text-[13.5px] [&_svg]:size-[18px] group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pl-0",
                          isActive &&
                            "text-green hover:text-green data-active:bg-transparent data-active:text-green before:absolute before:inset-y-1 before:left-0 before:w-[2.5px] before:rounded-r-full before:bg-green group-data-[collapsible=icon]:before:hidden",
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
              tooltip="Settings"
              render={<Link href="/projects/dashboard/settings" />}
              className="h-9 gap-2.5 pl-3 text-[13.5px] [&_svg]:size-[18px] group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pl-0">
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
