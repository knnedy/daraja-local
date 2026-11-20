"use client";

import { Popover } from "@base-ui/react/popover";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** The primary "send a test request" action: a button that opens a small form. */
export function TestPopover({
  label,
  title,
  description,
  open,
  onOpenChange,
  children,
}: {
  label: string;
  title: string;
  description: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger render={<Button size="lg" className="px-3.5" />}>
        <SendIcon className="size-3.5" />
        {label}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="w-[340px] origin-(--transform-origin) rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-[0_16px_40px_-12px_oklch(0_0_0/0.22),0_2px_6px_oklch(0_0_0/0.06)] transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0">
            <Popover.Title className="text-[14px] font-semibold text-foreground">{title}</Popover.Title>
            <Popover.Description className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              {description}
            </Popover.Description>
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function FormError({ message }: { message: string }) {
  return (
    <p className="rounded-lg bg-red-bg px-3 py-2 text-[12px] text-red" aria-live="polite">
      {message}
    </p>
  );
}
