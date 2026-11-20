"use client";

import { useApiPort } from "@/hooks/use-api-port";
import { useProject } from "@/hooks/use-projects";
import { CodeBlock } from "@/components/code-block";
import { C, Endpoint, IntegrateCard, Note, Prose } from "../../_components/integrate";

const tabs = [
  { id: "curl", label: "cURL" },
  { id: "node", label: "Node" },
  { id: "python", label: "Python" },
  { id: "use", label: "Using it" },
] as const;

const invalid = `HTTP/1.1 404 Not Found

{
  "requestId": "…",
  "errorCode": "404.001.03",
  "errorMessage": "Invalid Access Token"
}`;

/** How an app fetches a token, with this project's real keys filled in. */
export default function TokenSnippetCard({ slug }: { slug: string }) {
  const { data: project } = useProject(slug);
  const base = `http://127.0.0.1:${useApiPort()}`;
  const key = project?.consumerKey ?? "<consumer key>";
  const secret = project?.consumerSecret ?? "<consumer secret>";
  const basic = typeof window === "undefined" ? "" : btoa(`${key}:${secret}`);
  const url = `${base}/oauth/v1/generate?grant_type=client_credentials`;

  const code = {
    curl: `curl "${url}" \\
  -H "Authorization: Basic ${basic}"`,
    node: `const auth = Buffer.from(\`\${process.env.DARAJA_CONSUMER_KEY}:\${process.env.DARAJA_CONSUMER_SECRET}\`).toString("base64");

const res = await fetch("${url}", {
  headers: { Authorization: \`Basic \${auth}\` },
});
const { access_token, expires_in } = await res.json(); // expires_in is "3599", a string`,
    python: `import base64, os, requests

auth = base64.b64encode(f"{os.environ['DARAJA_CONSUMER_KEY']}:{os.environ['DARAJA_CONSUMER_SECRET']}".encode()).decode()
res = requests.get("${base}/oauth/v1/generate",
                   params={"grant_type": "client_credentials"},
                   headers={"Authorization": f"Basic {auth}"})
access_token = res.json()["access_token"]`,
  };

  return (
    <IntegrateCard
      title="Get a token from your app"
      description="Basic auth with the consumer key and secret; the only Daraja call that doesn't take a Bearer token."
      tabs={tabs}
      render={(tab) =>
        tab === "use" ? (
          <>
            <Prose>
              Send the token as <C>Authorization: Bearer &lt;token&gt;</C> on every other endpoint. It lasts 3599
              seconds; cache it, and get a new one when it expires or a call answers with this:
            </Prose>
            <CodeBlock code={invalid} lang="http" lineNumbers={false} />
            <Note>A token from Daraja Local only works here, and a sandbox token only works on the sandbox.</Note>
          </>
        ) : (
          <>
            <Endpoint method="GET" url={url} />
            <CodeBlock code={code[tab]} lang={tab === "curl" ? "bash" : tab === "node" ? "javascript" : "python"} />
          </>
        )
      }
    />
  );
}
