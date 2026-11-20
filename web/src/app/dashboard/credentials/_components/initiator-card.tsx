"use client";

import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import { api } from "@/lib/api";
import { useInitiator } from "@/hooks/use-projects";
import { buttonVariants } from "@/components/ui/button";
import { CodeBlock, type CodeLang } from "@/components/code-block";
import { SegmentedControl } from "@/components/form";
import { C, Note, Prose } from "../../_components/integrate";
import KeyField from "./key-field";

const snippets: Record<"node" | "python" | "go", { label: string; lang: CodeLang; code: string }> = {
  node: {
    label: "Node",
    lang: "javascript",
    code: `import { publicEncrypt, constants } from "node:crypto";
import { readFileSync } from "node:fs";

const cert = readFileSync(process.env.DARAJA_CERT_PATH);
const securityCredential = publicEncrypt(
  { key: cert, padding: constants.RSA_PKCS1_PADDING },
  Buffer.from(process.env.DARAJA_INITIATOR_PASSWORD),
).toString("base64");`,
  },
  python: {
    label: "Python",
    lang: "python",
    code: `import base64, os
from cryptography import x509
from cryptography.hazmat.primitives.asymmetric import padding

cert = x509.load_pem_x509_certificate(open(os.environ["DARAJA_CERT_PATH"], "rb").read())
security_credential = base64.b64encode(
    cert.public_key().encrypt(os.environ["DARAJA_INITIATOR_PASSWORD"].encode(), padding.PKCS1v15())
).decode()`,
  },
  go: {
    label: "Go",
    lang: "go",
    code: `raw, _ := os.ReadFile(os.Getenv("DARAJA_CERT_PATH"))
block, _ := pem.Decode(raw)
cert, _ := x509.ParseCertificate(block.Bytes)
ciphertext, _ := rsa.EncryptPKCS1v15(rand.Reader, cert.PublicKey.(*rsa.PublicKey),
	[]byte(os.Getenv("DARAJA_INITIATOR_PASSWORD")))
securityCredential := base64.StdEncoding.EncodeToString(ciphertext)`,
  },
};

type Language = keyof typeof snippets;

/** The initiator that signs B2C, B2B, balance, status and reversal requests. */
export default function InitiatorCard({ slug }: { slug: string }) {
  const { data: initiator } = useInitiator(slug);
  const [language, setLanguage] = useState<Language>("node");

  return (
    <section className="panel overflow-hidden" aria-labelledby="initiator-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 id="initiator-title" className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            Initiator
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Signs B2C, B2B, Account Balance, Transaction Status and Reversal requests.
          </p>
        </div>
        <a
          href={slug ? api.projects.initiatorCertificateUrl(slug) : undefined}
          download
          className={buttonVariants({ variant: "outline" })}>
          <DownloadIcon className="size-3.5" />
          Certificate (.cer)
        </a>
      </div>

      <div className="divide-y divide-border">
        <KeyField label="InitiatorName" hint="Sent as-is in every request." value={initiator?.name} />
        <KeyField label="Initiator password" hint="Encrypted into SecurityCredential." value={initiator?.password} secret />
      </div>

      <div className="flex flex-col gap-3 border-t border-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Prose>
            <C>SecurityCredential</C> is the password, RSA-encrypted (PKCS#1 v1.5) with the certificate, then base64.
          </Prose>
          <SegmentedControl
            label="Language"
            value={language}
            options={(Object.keys(snippets) as Language[]).map((l) => ({ value: l, label: snippets[l].label }))}
            onChange={setLanguage}
            className="w-max"
          />
        </div>
        <CodeBlock code={snippets[language].code} lang={snippets[language].lang} />
        <Note>
          Real Daraja gives you Safaricom&apos;s certificate and your own initiator. Going live means swapping the
          certificate file and password, nothing else.
        </Note>
      </div>
    </section>
  );
}
