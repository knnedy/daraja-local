import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";

interface EnvVar {
  key: string;
  value: string;
  secret?: boolean;
}

const envVars: EnvVar[] = [
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

function EnvVarRow({ envVar }: { envVar: EnvVar }) {
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
            type="button"
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
          type="button"
          onClick={copy}
          className="text-muted-foreground opacity-0 transition-opacity hover:text-emerald-500 group-hover:opacity-100">
          {copied ? (
            <CheckIcon className="size-3.5 text-emerald-500" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function EnvCard() {
  return (
    <div className="rounded-lg border border-border bg-surface-1">
      {envVars.map((envVar) => (
        <EnvVarRow key={envVar.key} envVar={envVar} />
      ))}
    </div>
  );
}
