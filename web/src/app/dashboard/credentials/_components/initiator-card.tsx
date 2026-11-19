"use client";

import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useInitiator } from "@/hooks/use-projects";
import { useActiveProjectStore } from "@/store/active-project";
import CredentialRow from "./credential-row";

const snippets = {
  "Node.js": `import { publicEncrypt, constants } from "node:crypto";
import { readFileSync } from "node:fs";

const cert = readFileSync(process.env.DARAJA_CERT_PATH);
const securityCredential = publicEncrypt(
  { key: cert, padding: constants.RSA_PKCS1_PADDING },
  Buffer.from(process.env.DARAJA_INITIATOR_PASSWORD),
).toString("base64");`,
  Python: `import base64, os
from cryptography import x509
from cryptography.hazmat.primitives.asymmetric import padding

cert = x509.load_pem_x509_certificate(open(os.environ["DARAJA_CERT_PATH"], "rb").read())
security_credential = base64.b64encode(
    cert.public_key().encrypt(os.environ["DARAJA_INITIATOR_PASSWORD"].encode(), padding.PKCS1v15())
).decode()`,
  Go: `raw, _ := os.ReadFile(os.Getenv("DARAJA_CERT_PATH"))
block, _ := pem.Decode(raw)
cert, _ := x509.ParseCertificate(block.Bytes)
ciphertext, _ := rsa.EncryptPKCS1v15(rand.Reader, cert.PublicKey.(*rsa.PublicKey),
	[]byte(os.Getenv("DARAJA_INITIATOR_PASSWORD")))
securityCredential := base64.StdEncoding.EncodeToString(ciphertext)`,
} as const;

type Language = keyof typeof snippets;

/** The Initiator a B2C-style request names, and how to build its SecurityCredential. */
export default function InitiatorCard() {
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: initiator } = useInitiator(slug);
  const [language, setLanguage] = useState<Language>("Node.js");

  return (
    <div className="panel">
      <div className="border-b border-border px-4 py-2.5">
        <span className="text-[13px] font-medium text-foreground">
          Initiator
        </span>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          For B2C. Real Daraja gives you an initiator and Safaricom&apos;s
          certificate; Daraja Local gives you its own, used the same way.
        </p>
      </div>

      <div className="divide-y divide-border/60">
        <CredentialRow label="Initiator name" value={initiator?.name ?? "…"} />
        <CredentialRow
          label="Initiator password"
          value={initiator?.password ?? "…"}
          secret
        />
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs text-muted-foreground">Certificate</span>
          <a
            href={slug ? api.projects.initiatorCertificateUrl(slug) : undefined}
            download
            className="flex items-center gap-1.5 rounded-md border border-border-strong bg-surface-2 px-2.5 py-1 text-[11.5px] font-medium text-foreground transition-colors hover:bg-surface-2/70"
          >
            <DownloadIcon className="size-3.5" />
            Download .cer
          </a>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 border-t border-border p-4">
        <p className="text-[11.5px] leading-relaxed text-muted-foreground">
          SecurityCredential is the password RSA-encrypted (PKCS#1 v1.5) with
          the certificate, base64-encoded. Switching to real Daraja means
          swapping the certificate file and password, nothing else.
        </p>
        <div className="flex self-start rounded-md border border-border bg-surface-2 p-0.5">
          {(Object.keys(snippets) as Language[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLanguage(l)}
              aria-pressed={language === l}
              className={cn(
                "rounded px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:text-foreground",
                language === l && "bg-surface-1 text-foreground shadow-sm",
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <pre className="overflow-x-auto rounded-md border border-terminal-border bg-terminal-bg p-3.5 font-mono text-[11.5px] leading-relaxed text-terminal-green">
          {snippets[language]}
        </pre>
      </div>
    </div>
  );
}
