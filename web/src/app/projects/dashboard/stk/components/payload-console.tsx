export default function PayloadConsole({ logs }: { logs: string[] }) {
  return (
    <div className="flex flex-1 min-h-48 flex-col rounded-lg border border-green-mid/40 bg-[#0B120D] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wide text-green/50">
          live session
        </span>
        <span className="text-[10px] text-green/40">View all →</span>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-[11.5px] leading-relaxed">
        {logs.length === 0 ? (
          <>
            <p className="text-green/50">$ waiting for a request…</p>
            <p className="text-green/50">
              $ trigger an STK Push to open a session
            </p>
          </>
        ) : (
          logs.map((line, i) => (
            <pre key={i} className="whitespace-pre-wrap text-green/70">
              {line}
            </pre>
          ))
        )}
        <p className="text-green">
          <span className="animate-pulse">█</span>
        </p>
      </div>
    </div>
  );
}
