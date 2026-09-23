import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRightIcon,
  ArrowUpRightIcon,
  KeyRoundIcon,
  ScrollTextIcon,
  SmartphoneIcon,
} from "lucide-react";

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
    icon: SmartphoneIcon,
  },
  {
    href: "/dashboard/c2b",
    label: "C2B",
    description: "Register URLs, simulate a payment",
    icon: ArrowLeftRightIcon,
  },
  {
    href: "/dashboard/logs",
    label: "Request Log",
    description: "Browse and search past requests",
    icon: ScrollTextIcon,
  },
  {
    href: "/dashboard/credentials",
    label: "Credentials",
    description: "Keys, shortcode, passkey",
    icon: KeyRoundIcon,
  },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="group flex items-start gap-3 rounded-lg border border-border-strong bg-surface-1 p-3.5 shadow-sm transition-colors hover:bg-surface-2/60">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2">
            <action.icon className="size-3.75 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[12.5px] font-medium text-foreground">
                {action.label}
              </span>
              <ArrowUpRightIcon className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
              {action.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
