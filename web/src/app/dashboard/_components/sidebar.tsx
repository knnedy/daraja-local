"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import {
  CheckIcon,
  ChevronsUpDownIcon,
  LayoutGridIcon,
  PlusIcon,
  SettingsIcon,
} from "lucide-react";
import { pageIcons } from "@/lib/page-icons";
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
import {
  useProject,
  useProjects,
  useSetActiveProject,
} from "@/hooks/use-projects";
import { usePendingSessions } from "@/hooks/use-stk";
import { ProjectMark } from "@/components/project-mark";
import { useApiPort } from "@/hooks/use-api-port";
import { cn, stripTrailingSlash } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: "stk";
};

const navGroups: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { label: "Overview", href: "/dashboard", icon: pageIcons.overview },
    ],
  },
  {
    label: "Payments",
    items: [
      { label: "STK Push", href: "/dashboard/stk", icon: pageIcons.stk, badge: "stk" },
      { label: "C2B", href: "/dashboard/c2b", icon: pageIcons.c2b },
      { label: "B2C", href: "/dashboard/b2c", icon: pageIcons.b2c },
      { label: "B2B", href: "/dashboard/b2b", icon: pageIcons.b2b },
      { label: "Transactions", href: "/dashboard/transactions", icon: pageIcons.transactions },
    ],
  },
  {
    label: "Developer",
    items: [
      { label: "Request log", href: "/dashboard/logs", icon: pageIcons.logs },
      { label: "Credentials", href: "/dashboard/credentials", icon: pageIcons.credentials },
      { label: "Settings", href: "/dashboard/settings", icon: SettingsIcon },
    ],
  },
];

const itemClass =
  "relative h-8 gap-2.5 rounded-md px-2.5 text-[13px] font-normal text-sidebar-foreground/80 transition-[background-color,color,box-shadow] duration-150 hover:bg-foreground/[0.045] hover:text-foreground [&_svg]:size-4 [&_svg]:text-muted-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0";

const activeClass =
  "bg-sidebar-accent! font-medium text-foreground! shadow-(--raised-shadow) ring-1 ring-border/70 [&_svg]:text-green dark:ring-white/[0.06]";

function ProjectSwitcher() {
  const router = useRouter();
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: project } = useProject(slug);
  const { data: projects = [] } = useProjects();
  const setActive = useSetActiveProject();
  const name = project?.name ?? "";

  return (
    <Menu.Root>
      <Menu.Trigger
        className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left outline-none transition-colors hover:bg-foreground/[0.045] focus-visible:ring-2 focus-visible:ring-ring/40 data-popup-open:bg-foreground/[0.045] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
        {project ? <ProjectMark name={name} /> : <Skeleton className="size-8 rounded-lg" />}
        {project ? (
          <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-[13px] leading-tight font-semibold text-foreground">{name}</span>
            <span className="block truncate font-mono text-[11px] leading-tight text-muted-foreground">
              Shortcode {project.shortCode}
            </span>
          </span>
        ) : (
          <span className="flex min-w-0 flex-1 flex-col gap-1.5 group-data-[collapsible=icon]:hidden" aria-label="Loading project">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-20" />
          </span>
        )}
        <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="start" className="z-50">
          <Menu.Popup className="w-64 origin-(--transform-origin) rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-[0_12px_32px_-8px_oklch(0_0_0/0.18),0_2px_6px_oklch(0_0_0/0.06)] transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0">
            <p className="px-2 pt-1.5 pb-1 text-[11px] font-medium text-muted-foreground">
              Projects
            </p>
            {projects.map((p) => (
              <Menu.Item
                key={p.slug}
                onClick={() => p.slug !== slug && setActive.mutate(p.slug)}
                className="flex cursor-default items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] outline-none data-highlighted:bg-foreground/[0.05]">
                <ProjectMark name={p.name} className="size-6 rounded-md text-[9.5px]" />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                {p.slug === slug && <CheckIcon className="size-3.5 text-green" />}
              </Menu.Item>
            ))}
            <div className="my-1 h-px bg-border" />
            <Menu.Item
              onClick={() => router.push("/")}
              className="flex cursor-default items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-muted-foreground outline-none data-highlighted:bg-foreground/[0.05] data-highlighted:text-foreground">
              <LayoutGridIcon className="size-4" />
              All projects
            </Menu.Item>
            <Menu.Item
              onClick={() => router.push("/new")}
              className="flex cursor-default items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-muted-foreground outline-none data-highlighted:bg-foreground/[0.05] data-highlighted:text-foreground">
              <PlusIcon className="size-4" />
              New project
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function ServerStatus() {
  const port = useApiPort();
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/60 px-2.5 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
      <span className="relative flex size-2 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-2 opacity-50 motion-reduce:hidden" />
        <span className="relative inline-flex size-2 rounded-full bg-green-2" />
      </span>
      <span className="min-w-0 group-data-[collapsible=icon]:hidden">
        <span className="block text-[12px] leading-tight font-medium text-foreground">
          Emulator running
        </span>
        <span className="block font-mono text-[11px] leading-tight text-muted-foreground">
          127.0.0.1:{port}
        </span>
      </span>
    </div>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: pending = [] } = usePendingSessions(slug);
  const path = pathname ? stripTrailingSlash(pathname) : "";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-2.5 pt-2.5 pb-1">
        <ProjectSwitcher />
      </SidebarHeader>

      <SidebarContent className="gap-0 px-1">
        {navGroups.map((group, gi) => (
          <SidebarGroup key={group.label ?? gi} className="py-1.5">
            {group.label && (
              <SidebarGroupLabel className="h-7 px-2.5 text-[11.5px] font-medium text-muted-foreground/90">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const active =
                    item.href === "/dashboard"
                      ? path === item.href
                      : path.startsWith(item.href);
                  const count = item.badge === "stk" ? pending.length : 0;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.label}
                        render={<Link href={item.href} />}
                        className={cn(itemClass, active && activeClass)}>
                        <item.icon strokeWidth={1.75} />
                        <span className="flex-1 group-data-[collapsible=icon]:hidden">
                          {item.label}
                        </span>
                        {count > 0 && (
                          <span
                            aria-label={`${count} waiting`}
                            className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-green-2 px-1.5 font-mono text-[10.5px] font-semibold text-[oklch(0.22_0.05_155)] tabular-nums group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:-top-1 group-data-[collapsible=icon]:-right-1 group-data-[collapsible=icon]:h-3.5 group-data-[collapsible=icon]:min-w-3.5 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:text-[9px]">
                            {count}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-2.5">
        <ServerStatus />
      </SidebarFooter>
    </Sidebar>
  );
}
