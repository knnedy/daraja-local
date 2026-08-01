import { SignalHighIcon } from "lucide-react";

function VirtualPhone() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface-1 p-8">
      <div className="w-52.5 overflow-hidden rounded-[26px] border-[5px] border-neutral-900 bg-[#0B120D] shadow-xl">
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 font-mono text-[9px] tracking-wide text-green/60">
          <span>SAFARICOM</span>
          <span className="flex items-center gap-1">
            <SignalHighIcon className="size-2.5" />
            4G
          </span>
        </div>
        <div className="flex min-h-67.5 flex-col items-center justify-center gap-3 px-5 text-center">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-40" />
            <span className="relative inline-flex size-2.5 rounded-full bg-green" />
          </span>
          <p className="font-mono text-[11px] leading-relaxed text-green/70">
            No active prompt.
            <br />
            Waiting for STK Push…
          </p>
        </div>
        <div className="flex divide-x divide-white/10 border-t border-white/10">
          <button
            disabled
            className="flex-1 py-2.5 font-mono text-[10px] uppercase tracking-wide text-white/25">
            Cancel
          </button>
          <button
            disabled
            className="flex-1 py-2.5 font-mono text-[10px] uppercase tracking-wide text-white/25">
            Approve
          </button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Idle — simulated handset
      </p>
    </div>
  );
}

function PayloadConsole() {
  return (
    <div className="flex h-full flex-col rounded-lg border border-green-mid/40 bg-[#0B120D] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wide text-green/50">
          live session
        </span>
        <span className="text-[10px] text-green/40">View all →</span>
      </div>
      <div className="flex-1 font-mono text-[12.5px] leading-relaxed">
        <p className="text-green/50">$ waiting for a request…</p>
        <p className="text-green/50">$ trigger an STK Push to open a session</p>
        <p className="text-green">
          <span className="animate-pulse">█</span>
        </p>
      </div>
    </div>
  );
}

export default function StkPushPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="mb-0.5 font-heading text-[21px] font-medium text-foreground">
          STK Push
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Simulate the customer prompt for /mpesa/stkpush/v1/processrequest.
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,260px)_1fr] gap-4">
        <VirtualPhone />
        <PayloadConsole />
      </div>
    </div>
  );
}
