"use client";

import type { LogGroup } from "@/lib/request-log/group";
import { parse, pretty, toAttempt, type RawAttempt } from "@/lib/request-log/delivery";
import type { RequestLogEntry } from "@/lib/types/request-log";
import { formatDateTime } from "@/lib/format";
import {
  CallDetail,
  CopyId,
  JsonDisclosure,
  StatusPill,
  Step,
  at,
  elapsed,
} from "../../_components/activity";
import { PATHS, kindLabel, sessionStatus, stepTitle, stepTone, summaryOf } from "../lib/describe";

type Wrapped = { payload?: unknown; url?: string; attempts?: RawAttempt[] };

function EntryBody({ e, first }: { e: RequestLogEntry; first: boolean }) {
  const raw = parse<unknown>(e.payload);
  const wrapped = raw && typeof raw === "object" && "url" in raw ? (raw as Wrapped) : null;

  if (e.direction === "inbound") {
    return (
      <>
        <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">POST {PATHS[e.operation] ?? "—"}</p>
        <JsonDisclosure label="Request body" code={pretty(raw) || e.payload} defaultOpen={first} />
      </>
    );
  }
  if (wrapped) {
    const attempts = (wrapped.attempts ?? []).map(toAttempt);
    return (
      <CallDetail
        url={wrapped.url ?? ""}
        attempts={attempts}
        sent={pretty(wrapped.payload)}
        ok={e.status !== "failed"}
        sentLabel="Body sent"
      />
    );
  }
  return <JsonDisclosure label="Response body" code={pretty(raw) || e.payload} />;
}

/** Every entry of one session, oldest first, with its bodies. */
export default function SessionDetail({ group }: { group: LogGroup }) {
  const status = sessionStatus(group);
  const rows = [...group.entries].reverse();
  const start = rows[0]?.createdAt ?? group.createdAt;
  const end = rows[rows.length - 1]?.createdAt ?? start;
  const real = !group.id.startsWith("row-");

  return (
    <div className="flex min-w-0 flex-col gap-5 p-5">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="text-[19px] leading-tight font-semibold tracking-[-0.02em] text-foreground">
            {kindLabel(group.kind)}
          </p>
          <StatusPill tone={status.tone} label={status.label} />
        </div>
        <p className="text-[12.5px] text-muted-foreground">
          {formatDateTime(start)} · {rows.length} {rows.length === 1 ? "entry" : "entries"}
          {rows.length > 1 && <> · {elapsed(start, end)} end to end</>}
          {group.summary && <> · {summaryOf(group)}</>}
        </p>
        {real && <CopyId value={group.id} label="ConversationID" />}
      </div>

      <ol>
        {rows.map((e, i) => (
          <Step
            key={e.id}
            tone={stepTone(e)}
            title={
              <>
                {stepTitle(e)}
                {e.outcome && (
                  <span className="ml-2 rounded bg-surface-2 px-1.5 py-px font-mono text-[11px] font-normal text-muted-foreground ring-1 ring-border">
                    {e.outcome}
                  </span>
                )}
              </>
            }
            time={at(e.createdAt)}
            delta={i > 0 ? elapsed(start, e.createdAt) : undefined}
            last={i === rows.length - 1}>
            <EntryBody e={e} first={i === 0} />
            <JsonDisclosure label="Raw log entry" code={pretty(e)} maxHeight="16rem" />
          </Step>
        ))}
      </ol>
    </div>
  );
}
