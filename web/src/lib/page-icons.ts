import {
  BanknoteArrowDownIcon,
  BanknoteArrowUpIcon,
  Building2Icon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LogsIcon,
  ReceiptTextIcon,
  SettingsIcon,
  SmartphoneNfcIcon,
  type LucideIcon,
} from "lucide-react";

/** One icon per dashboard page, shared by every place that names the page. */
export const pageIcons = {
  overview: LayoutDashboardIcon,
  stk: SmartphoneNfcIcon,
  // Money in from a customer, money out to one.
  c2b: BanknoteArrowDownIcon,
  b2c: BanknoteArrowUpIcon,
  b2b: Building2Icon,
  transactions: ReceiptTextIcon,
  logs: LogsIcon,
  credentials: KeyRoundIcon,
  settings: SettingsIcon,
} satisfies Record<string, LucideIcon>;
