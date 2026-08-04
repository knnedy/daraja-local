"use client";

import { useState } from "react";
import { useAppConfigStore } from "@/store/app-config";

export default function ProjectIdentityCard() {
  const [name, setName] = useState("my ticketing app");
  const port = useAppConfigStore((s) => s.port);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-strong bg-surface-1 p-4 shadow-sm">
      <span className="text-[13px] font-medium text-foreground">Project</span>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-border bg-surface-2 px-3 py-2 text-[13px] text-foreground outline-none focus:border-ring"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Created
          </label>
          <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-[13px] text-muted-foreground">
            1 Aug 2026
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Local server
          </label>
          <p className="rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-[12.5px] text-muted-foreground">
            localhost:{port}
          </p>
        </div>
      </div>

      <button
        type="button"
        className="self-start rounded-lg bg-green px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green/90">
        Save changes
      </button>
    </div>
  );
}
