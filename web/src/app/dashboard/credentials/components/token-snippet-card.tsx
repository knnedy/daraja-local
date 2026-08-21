"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveProjectStore } from "@/store/active-project";
import { useAppConfigStore } from "@/store/app-config";
import { useProject } from "@/hooks/use-projects";

function buildSnippets(
  baseUrl: string,
  consumerKey: string,
  consumerSecret: string,
) {
  const basicAuth =
    typeof window !== "undefined"
      ? btoa(`${consumerKey}:${consumerSecret}`)
      : "";

  return {
    curl: `curl "${baseUrl}/oauth/v1/generate?grant_type=client_credentials" \\
  -H "Authorization: Basic ${basicAuth}"`,
    node: `const res = await fetch(
  "${baseUrl}/oauth/v1/generate?grant_type=client_credentials",
  {
    headers: {
      Authorization: "Basic " + Buffer.from(
        "${consumerKey}:${consumerSecret}"
      ).toString("base64"),
    },
  }
);
const { access_token } = await res.json();`,
    python: `import base64, requests

auth = base64.b64encode(b"${consumerKey}:${consumerSecret}").decode()
res = requests.get(
    "${baseUrl}/oauth/v1/generate",
    params={"grant_type": "client_credentials"},
    headers={"Authorization": f"Basic {auth}"},
)
access_token = res.json()["access_token"]`,
  };
}

function SnippetBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="group relative rounded-md bg-[#0B120D] p-3.5">
      <button
        type="button"
        onClick={copy}
        className="absolute right-2.5 top-2.5 text-muted-foreground opacity-0 transition-opacity hover:text-green group-hover:opacity-100">
        {copied ? (
          <CheckIcon className="size-3.5 text-green" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </button>
      <pre className="overflow-x-auto pr-6 font-mono text-[11.5px] leading-relaxed text-green/80">
        {code}
      </pre>
    </div>
  );
}

export default function TokenSnippetCard() {
  const slug = useActiveProjectStore((s) => s.slug) ?? "";
  const { data: project } = useProject(slug);
  const port = useAppConfigStore((s) => s.port);

  if (!project) {
    return <div className="h-64 animate-pulse rounded-lg bg-surface-1" />;
  }

  const baseUrl = `http://127.0.0.1:${port}`;
  const snippets = buildSnippets(
    baseUrl,
    project.consumerKey,
    project.consumerSecret,
  );

  return (
    <div className="rounded-lg border border-border-strong bg-surface-1 p-4 shadow-sm">
      <span className="text-[13px] font-medium text-foreground">
        Get an access token
      </span>
      <p className="mb-3 mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
        Test your app&apos;s token-fetch step against daraja-local — the same
        request your code will make against the real Daraja sandbox, using this
        project&apos;s actual credentials.
      </p>

      <Tabs defaultValue="curl">
        <TabsList className="mb-2">
          <TabsTrigger value="curl">cURL</TabsTrigger>
          <TabsTrigger value="node">Node</TabsTrigger>
          <TabsTrigger value="python">Python</TabsTrigger>
        </TabsList>
        <TabsContent value="curl">
          <SnippetBlock code={snippets.curl} />
        </TabsContent>
        <TabsContent value="node">
          <SnippetBlock code={snippets.node} />
        </TabsContent>
        <TabsContent value="python">
          <SnippetBlock code={snippets.python} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
