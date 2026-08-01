"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  PlayIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const stats = [
  { label: "Requests today", value: "0" },
  { label: "Success rate", value: "—" },
  { label: "Active sessions", value: "0" },
];

const envVars = [
  { key: "DARAJA_BASE_URL", value: "http://localhost:8080" },
  { key: "DARAJA_CONSUMER_KEY", value: "dl_ck_9f2a1e7c4b8d3f60" },
  {
    key: "DARAJA_CONSUMER_SECRET",
    value: "dl_cs_7e0b2c9a5f1d8e34a6c2",
    secret: true,
  },
  { key: "DARAJA_SHORTCODE", value: "174379" },
  {
    key: "DARAJA_PASSKEY",
    value: "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919",
    secret: true,
  },
];

function EnvRow({ envVar }: { envVar: (typeof envVars)[number] }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const display = envVar.secret && !revealed ? "•".repeat(24) : envVar.value;

  function copy() {
    navigator.clipboard.writeText(envVar.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="group flex items-center justify-between border-b border-border/60 px-4 py-2.5 font-mono text-[12.5px] last:border-0">
      <span className="text-muted-foreground">{envVar.key}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-foreground">{display}</span>
        {envVar.secret && (
          <button
            onClick={() => setRevealed((v) => !v)}
            className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100">
            {revealed ? (
              <EyeOffIcon className="size-3.5" />
            ) : (
              <EyeIcon className="size-3.5" />
            )}
          </button>
        )}
        <button
          onClick={copy}
          className="text-muted-foreground opacity-0 transition-opacity hover:text-green group-hover:opacity-100">
          {copied ? (
            <CheckIcon className="size-3.5 text-green" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-0.5 font-heading text-[21px] font-medium text-foreground">
            Overview
          </h1>
          <p className="text-[13px] text-muted-foreground">
            Environment values for this project&apos;s local Daraja instance.
          </p>
        </div>
        <Button
          className="gap-1.5 bg-green text-white hover:bg-green/90"
          render={<Link href="/projects/dashboard/stk" />}>
          <PlayIcon className="size-3.75" />
          Trigger STK Push
        </Button>
      </div>

      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[13px] font-medium text-foreground">
            Environment
          </span>
          <span className="text-xs text-muted-foreground">
            Generated on init — rotate from Credentials
          </span>
        </div>
        <div className="rounded-lg border border-border bg-surface-1">
          {envVars.map((envVar) => (
            <EnvRow key={envVar.key} envVar={envVar} />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-8 rounded-lg border border-border bg-surface-1 px-5 py-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground">{stat.label}</span>
            <span className="font-mono text-[15px] font-medium text-foreground">
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
