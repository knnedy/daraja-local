"use client";

import { motion } from "framer-motion";
import {
  HashIcon,
  KeyIcon,
  LockIcon,
  FingerprintIcon,
  FileDownIcon,
  SmartphoneIcon,
} from "lucide-react";

const rows = [
  { icon: HashIcon, label: "Shortcode" },
  { icon: KeyIcon, label: "Consumer key" },
  { icon: LockIcon, label: "Consumer secret" },
  { icon: FingerprintIcon, label: "Passkey" },
];

export function CredentialPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
      className="relative flex flex-col justify-center gap-4 bg-background px-8 py-10">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Generated on creation
      </span>

      <div className="flex flex-col rounded-md bg-surface-2 px-4">
        {rows.map((row, i) => (
          <div key={row.label}>
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <row.icon className="size-3.75 text-muted-foreground" />
                <span className="textsize-3.75t-sub">{row.label}</span>
              </div>
              <span className="font-mono text-[13px] text-muted-foreground">
                •••••••••••••••
              </span>
            </div>
            {i < rows.length - 1 && <div className="h-px bg-border" />}
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-md bg-green-light px-3 py-2.5">
        <FileDownIcon className="mt-px size-4 shrink-0 text-green" />
        <span className="text-xs leading-relaxed text-green">
          A ready-to-use .env file is generated alongside your credentials.
        </span>
      </div>

      <div className="absolute bottom-4 right-5 flex items-center gap-1.5 opacity-50">
        <SmartphoneIcon className="size-3.25 text-muted-foreground" />
        <span className="font-mono text-[11px] text-muted-foreground">
          STK Push ready
        </span>
      </div>
    </motion.div>
  );
}
