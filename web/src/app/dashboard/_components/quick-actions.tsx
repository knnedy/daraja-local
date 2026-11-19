import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { pageIcons } from "@/lib/page-icons";
import { ArrowUpRightIcon } from "lucide-react";

type Action = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

const actions: Action[] = [
  {
    href: "/dashboard/stk",
    label: "STK Push",
    description: "Trigger and resolve a payment prompt",
    icon: pageIcons.stk,
  },
  {
    href: "/dashboard/c2b",
    label: "C2B",
    description: "Register URLs, simulate a payment",
    icon: pageIcons.c2b,
  },
  {
    href: "/dashboard/b2c",
    label: "B2C",
    description: "Pay out to a phone, watch the result",
    icon: pageIcons.b2c,
  },
  {
    href: "/dashboard/transactions",
    label: "Transactions",
    description: "Check a status, reverse a payment",
    icon: pageIcons.transactions,
  },
  {
    href: "/dashboard/logs",
    label: "Request Log",
    description: "Browse and search past requests",
    icon: pageIcons.logs,
  },
  {
    href: "/dashboard/credentials",
    label: "Credentials",
    description: "Keys, shortcode, passkey",
    icon: pageIcons.credentials,
  },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="group flex items-start gap-3 panel p-3.5 transition-[border-color,background-color] duration-150 hover:border-green-mid hover:bg-surface-2/50 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 transition-colors duration-150 group-hover:border-green-mid/60 group-hover:bg-green-light">
            <action.icon className="size-3.75 text-muted-foreground transition-colors duration-150 group-hover:text-green" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[13px] font-medium text-foreground">
                {action.label}
              </span>
              <ArrowUpRightIcon className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
              {action.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
