"use client";

import { forwardRef } from "react";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const KIND_OPTIONS = [
  { value: "all", label: "All" },
  { value: "stk_push", label: "STK" },
  { value: "c2b", label: "C2B" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "success", label: "Success" },
  { value: "error", label: "Error" },
  { value: "pending", label: "Pending" },
] as const;

export type KindFilter = (typeof KIND_OPTIONS)[number]["value"];
export type StatusFilter = (typeof STATUS_OPTIONS)[number]["value"];

const FilterBar = forwardRef<
  HTMLInputElement,
  {
    kind: KindFilter;
    onKindChange: (kind: KindFilter) => void;
    status: StatusFilter;
    onStatusChange: (status: StatusFilter) => void;
    search: string;
    onSearchChange: (value: string) => void;
  }
>(function FilterBar(
  { kind, onKindChange, status, onStatusChange, search, onSearchChange },
  ref,
) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 rounded-lg border border-border-strong bg-surface-1 p-1">
          {KIND_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onKindChange(opt.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                kind === opt.value
                  ? "bg-surface-2 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}>
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 rounded-lg border border-border-strong bg-surface-1 p-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onStatusChange(opt.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                status === opt.value
                  ? "bg-surface-2 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex-1 sm:max-w-xs">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={ref}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Phone, ref, or ID…  ( / )"
          className="w-full rounded-lg border border-border-strong bg-surface-1 py-2 pr-3 pl-8 text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
        />
      </div>
    </div>
  );
});

export default FilterBar;
