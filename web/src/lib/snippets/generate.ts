/** A variable from the .env file Settings exports. */
export type EnvName =
  "DARAJA_SHORTCODE" | "DARAJA_CALLBACK_URL" | "DARAJA_INITIATOR_NAME";

/** A body value: a literal, an env variable (plus a suffix), or something worked out at run time. */
export type Value =
  | string
  | number
  | { env: EnvName; suffix?: string }
  | {
      computed: "timestamp" | "password" | "securityCredential" | "uniqueId";
    };

/** One Daraja request, described once and rendered in every language. */
export interface RequestSpec {
  path: string;
  body: Record<string, Value>;
}

export type Language = "body" | "curl" | "node" | "python" | "php" | "go";

export const languages: { id: Language; label: string }[] = [
  { id: "body", label: "Body" },
  { id: "curl", label: "cURL" },
  { id: "node", label: "Node" },
  { id: "python", label: "Python" },
  { id: "php", label: "PHP" },
  { id: "go", label: "Go" },
];

/** What the Body view shows for env values; real project values replace these when known. */
export type BodyValues = Partial<Record<EnvName, string>>;

const placeholders: Record<EnvName, string> = {
  DARAJA_SHORTCODE: "<shortcode>",
  DARAJA_CALLBACK_URL: "https://your-app.com",
  DARAJA_INITIATOR_NAME: "testapi",
};

const computedPlaceholders = {
  timestamp: "20261119103000",
  password: "<base64(shortcode + passkey + timestamp)>",
  securityCredential: "<initiator password, RSA-encrypted, base64>",
  uniqueId: "<unique per request, e.g. a UUID>",
};

type Needs = { password: boolean; credential: boolean; uniqueId: boolean };

function needs(spec: RequestSpec): Needs {
  const computed = Object.values(spec.body).flatMap((v) =>
    typeof v === "object" && "computed" in v ? [v.computed] : [],
  );
  return {
    password: computed.includes("password") || computed.includes("timestamp"),
    credential: computed.includes("securityCredential"),
    uniqueId: computed.includes("uniqueId"),
  };
}

const q = (s: string) => JSON.stringify(s);

function body(spec: RequestSpec, values: BodyValues): string {
  const out: Record<string, string | number> = {};
  for (const [key, v] of Object.entries(spec.body)) {
    if (typeof v !== "object") out[key] = v;
    else if ("env" in v)
      out[key] = (values[v.env] ?? placeholders[v.env]) + (v.suffix ?? "");
    else out[key] = computedPlaceholders[v.computed];
  }
  return JSON.stringify(out, null, 2);
}

function curl(spec: RequestSpec): string {
  const n = needs(spec);
  const value = (v: Value) => {
    if (typeof v === "number") return String(v);
    if (typeof v === "string") return q(v);
    if ("env" in v) return `"$${v.env}${v.suffix ?? ""}"`;
    return {
      timestamp: `"$TIMESTAMP"`,
      password: `"$PASSWORD"`,
      securityCredential: `"$SECURITY_CREDENTIAL"`,
      uniqueId: `"$(uuidgen)"`,
    }[v.computed];
  };
  const lines = Object.entries(spec.body).map(
    ([k, v], i, all) =>
      `  ${q(k)}: ${value(v)}${i < all.length - 1 ? "," : ""}`,
  );
  return [
    `# bash with curl, jq${n.credential ? " and openssl" : ""}. Load your .env first: set -a; . ./.env; set +a`,
    `TOKEN=$(curl -s -u "$DARAJA_CONSUMER_KEY:$DARAJA_CONSUMER_SECRET" \\`,
    `  "$DARAJA_BASE_URL/oauth/v1/generate?grant_type=client_credentials" | jq -r .access_token)`,
    ...(n.password
      ? [
          `TIMESTAMP=$(TZ=Africa/Nairobi date +%Y%m%d%H%M%S)`,
          `PASSWORD=$(printf '%s' "$DARAJA_SHORTCODE$DARAJA_PASSKEY$TIMESTAMP" | base64 | tr -d '\\n')`,
        ]
      : []),
    ...(n.credential
      ? [
          `SECURITY_CREDENTIAL=$(printf '%s' "$DARAJA_INITIATOR_PASSWORD" \\`,
          `  | openssl pkeyutl -encrypt -certin -inkey "$DARAJA_CERT_PATH" -pkeyopt rsa_padding_mode:pkcs1 \\`,
          `  | base64 | tr -d '\\n')`,
        ]
      : []),
    ``,
    `curl -s -X POST "$DARAJA_BASE_URL${spec.path}" \\`,
    `  -H "Authorization: Bearer $TOKEN" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d @- <<EOF`,
    `{`,
    ...lines,
    `}`,
    `EOF`,
  ].join("\n");
}

function node(spec: RequestSpec): string {
  const n = needs(spec);
  const value = (v: Value) => {
    if (typeof v === "number") return String(v);
    if (typeof v === "string") return q(v);
    if ("env" in v)
      return v.suffix ? `env.${v.env} + ${q(v.suffix)}` : `env.${v.env}`;
    return v.computed === "uniqueId" ? "crypto.randomUUID()" : v.computed;
  };
  return [
    `// Node 20+, no packages. Run with: node --env-file=.env pay.mjs`,
    ...(n.credential
      ? [
          `import { publicEncrypt, constants } from "node:crypto";`,
          `import { readFileSync } from "node:fs";`,
        ]
      : []),
    ``,
    `const env = process.env;`,
    `const basic = Buffer.from(\`\${env.DARAJA_CONSUMER_KEY}:\${env.DARAJA_CONSUMER_SECRET}\`).toString("base64");`,
    `const { access_token } = await (`,
    `  await fetch(\`\${env.DARAJA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials\`, {`,
    `    headers: { Authorization: \`Basic \${basic}\` },`,
    `  })`,
    `).json();`,
    ...(n.password
      ? [
          ``,
          `// Kenya time (UTC+3), as YYYYMMDDHHmmss.`,
          `const timestamp = new Date(Date.now() + 3 * 3600_000).toISOString().replace(/\\D/g, "").slice(0, 14);`,
          `const password = Buffer.from(env.DARAJA_SHORTCODE + env.DARAJA_PASSKEY + timestamp).toString("base64");`,
        ]
      : []),
    ...(n.credential
      ? [
          ``,
          `const securityCredential = publicEncrypt(`,
          `  { key: readFileSync(env.DARAJA_CERT_PATH), padding: constants.RSA_PKCS1_PADDING },`,
          `  Buffer.from(env.DARAJA_INITIATOR_PASSWORD),`,
          `).toString("base64");`,
        ]
      : []),
    ``,
    `const res = await fetch(\`\${env.DARAJA_BASE_URL}${spec.path}\`, {`,
    `  method: "POST",`,
    `  headers: { Authorization: \`Bearer \${access_token}\`, "Content-Type": "application/json" },`,
    `  body: JSON.stringify({`,
    ...Object.entries(spec.body).map(([k, v]) => `    ${k}: ${value(v)},`),
    `  }),`,
    `});`,
    `console.log(res.status, await res.json());`,
  ].join("\n");
}

function python(spec: RequestSpec): string {
  const n = needs(spec);
  const value = (v: Value) => {
    if (typeof v === "number") return String(v);
    if (typeof v === "string") return q(v);
    if ("env" in v)
      return v.suffix
        ? `env[${q(v.env)}] + ${q(v.suffix)}`
        : `env[${q(v.env)}]`;
    return {
      timestamp: "timestamp",
      password: "password",
      securityCredential: "security_credential",
      uniqueId: "str(uuid.uuid4())",
    }[v.computed];
  };
  return [
    `# Python 3 with requests${n.credential ? " and cryptography" : ""}. Export your .env first.`,
    `import base64`,
    `import os`,
    ...(n.uniqueId ? [`import uuid`] : []),
    ...(n.password
      ? [`from datetime import datetime, timedelta, timezone`]
      : []),
    ``,
    `import requests`,
    ...(n.credential
      ? [
          `from cryptography import x509`,
          `from cryptography.hazmat.primitives.asymmetric import padding`,
        ]
      : []),
    ``,
    `env = os.environ`,
    `base_url = env["DARAJA_BASE_URL"]`,
    `token = requests.get(`,
    `    f"{base_url}/oauth/v1/generate",`,
    `    params={"grant_type": "client_credentials"},`,
    `    auth=(env["DARAJA_CONSUMER_KEY"], env["DARAJA_CONSUMER_SECRET"]),`,
    `).json()["access_token"]`,
    ...(n.password
      ? [
          ``,
          `timestamp = datetime.now(timezone(timedelta(hours=3))).strftime("%Y%m%d%H%M%S")  # Kenya time`,
          `password = base64.b64encode(`,
          `    (env["DARAJA_SHORTCODE"] + env["DARAJA_PASSKEY"] + timestamp).encode()`,
          `).decode()`,
        ]
      : []),
    ...(n.credential
      ? [
          ``,
          `with open(env["DARAJA_CERT_PATH"], "rb") as f:`,
          `    cert = x509.load_pem_x509_certificate(f.read())`,
          `security_credential = base64.b64encode(`,
          `    cert.public_key().encrypt(env["DARAJA_INITIATOR_PASSWORD"].encode(), padding.PKCS1v15())`,
          `).decode()`,
        ]
      : []),
    ``,
    `res = requests.post(`,
    `    f"{base_url}${spec.path}",`,
    `    headers={"Authorization": f"Bearer {token}"},`,
    `    json={`,
    ...Object.entries(spec.body).map(
      ([k, v]) => `        ${q(k)}: ${value(v)},`,
    ),
    `    },`,
    `)`,
    `print(res.status_code, res.json())`,
  ].join("\n");
}

function php(spec: RequestSpec): string {
  const n = needs(spec);
  const sq = (s: string) =>
    `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
  const value = (v: Value) => {
    if (typeof v === "number") return String(v);
    if (typeof v === "string") return sq(v);
    if ("env" in v)
      return v.suffix
        ? `getenv(${sq(v.env)}) . ${sq(v.suffix)}`
        : `getenv(${sq(v.env)})`;
    return v.computed === "uniqueId"
      ? "bin2hex(random_bytes(16))"
      : `$${v.computed}`;
  };
  return [
    `<?php`,
    `// PHP 8 with the curl${n.credential ? " and openssl" : ""} extension${n.credential ? "s" : ""}. Export your .env first.`,
    `$baseUrl = getenv('DARAJA_BASE_URL');`,
    ``,
    `$ch = curl_init("$baseUrl/oauth/v1/generate?grant_type=client_credentials");`,
    `curl_setopt_array($ch, [`,
    `    CURLOPT_RETURNTRANSFER => true,`,
    `    CURLOPT_USERPWD => getenv('DARAJA_CONSUMER_KEY') . ':' . getenv('DARAJA_CONSUMER_SECRET'),`,
    `]);`,
    `$token = json_decode(curl_exec($ch), true)['access_token'];`,
    ...(n.password
      ? [
          ``,
          `$timestamp = (new DateTime('now', new DateTimeZone('Africa/Nairobi')))->format('YmdHis');`,
          `$password = base64_encode(getenv('DARAJA_SHORTCODE') . getenv('DARAJA_PASSKEY') . $timestamp);`,
        ]
      : []),
    ...(n.credential
      ? [
          ``,
          `$certificate = file_get_contents(getenv('DARAJA_CERT_PATH'));`,
          `openssl_public_encrypt(getenv('DARAJA_INITIATOR_PASSWORD'), $encrypted, $certificate, OPENSSL_PKCS1_PADDING);`,
          `$securityCredential = base64_encode($encrypted);`,
        ]
      : []),
    ``,
    `$ch = curl_init("$baseUrl${spec.path}");`,
    `curl_setopt_array($ch, [`,
    `    CURLOPT_RETURNTRANSFER => true,`,
    `    CURLOPT_POST => true,`,
    `    CURLOPT_HTTPHEADER => ["Authorization: Bearer $token", 'Content-Type: application/json'],`,
    `    CURLOPT_POSTFIELDS => json_encode([`,
    ...Object.entries(spec.body).map(
      ([k, v]) => `        ${sq(k)} => ${value(v)},`,
    ),
    `    ]),`,
    `]);`,
    `$response = curl_exec($ch);`,
    `echo curl_getinfo($ch, CURLINFO_RESPONSE_CODE), ' ', $response, PHP_EOL;`,
  ].join("\n");
}

function go(spec: RequestSpec): string {
  const n = needs(spec);
  const value = (v: Value) => {
    if (typeof v === "number") return String(v);
    if (typeof v === "string") return q(v);
    if ("env" in v)
      return v.suffix
        ? `os.Getenv(${q(v.env)}) + ${q(v.suffix)}`
        : `os.Getenv(${q(v.env)})`;
    return v.computed === "uniqueId"
      ? "fmt.Sprint(time.Now().UnixNano())"
      : v.computed;
  };
  const imports = [
    "bytes",
    ...(n.credential ? ["crypto/rand", "crypto/rsa", "crypto/x509"] : []),
    ...(n.password || n.credential ? ["encoding/base64"] : []),
    "encoding/json",
    ...(n.credential ? ["encoding/pem"] : []),
    "fmt",
    "io",
    "net/http",
    "os",
    ...(n.password || n.uniqueId ? ["time"] : []),
  ];
  const entries = Object.entries(spec.body);
  const width = Math.max(...entries.map(([k]) => q(k).length + 1));
  return [
    `// Go 1.21+, standard library only. Export your .env first, then: go run .`,
    `package main`,
    ``,
    `import (`,
    ...imports.map((i) => `\t${q(i)}`),
    `)`,
    ``,
    `func main() {`,
    `\tbaseURL := os.Getenv("DARAJA_BASE_URL")`,
    ``,
    `\ttokenReq, _ := http.NewRequest("GET", baseURL+"/oauth/v1/generate?grant_type=client_credentials", nil)`,
    `\ttokenReq.SetBasicAuth(os.Getenv("DARAJA_CONSUMER_KEY"), os.Getenv("DARAJA_CONSUMER_SECRET"))`,
    `\ttokenRes, err := http.DefaultClient.Do(tokenReq)`,
    `\tif err != nil {`,
    `\t\tpanic(err)`,
    `\t}`,
    `\tdefer tokenRes.Body.Close()`,
    `\tvar token struct {`,
    `\t\tAccessToken string \`json:"access_token"\``,
    `\t}`,
    `\tif err := json.NewDecoder(tokenRes.Body).Decode(&token); err != nil {`,
    `\t\tpanic(err)`,
    `\t}`,
    ...(n.password
      ? [
          ``,
          `\ttimestamp := time.Now().In(time.FixedZone("EAT", 3*60*60)).Format("20060102150405")`,
          `\tpassword := base64.StdEncoding.EncodeToString([]byte(os.Getenv("DARAJA_SHORTCODE") + os.Getenv("DARAJA_PASSKEY") + timestamp))`,
        ]
      : []),
    ...(n.credential
      ? [
          ``,
          `\traw, err := os.ReadFile(os.Getenv("DARAJA_CERT_PATH"))`,
          `\tif err != nil {`,
          `\t\tpanic(err)`,
          `\t}`,
          `\tblock, _ := pem.Decode(raw)`,
          `\tcert, err := x509.ParseCertificate(block.Bytes)`,
          `\tif err != nil {`,
          `\t\tpanic(err)`,
          `\t}`,
          `\tciphertext, err := rsa.EncryptPKCS1v15(rand.Reader, cert.PublicKey.(*rsa.PublicKey), []byte(os.Getenv("DARAJA_INITIATOR_PASSWORD")))`,
          `\tif err != nil {`,
          `\t\tpanic(err)`,
          `\t}`,
          `\tsecurityCredential := base64.StdEncoding.EncodeToString(ciphertext)`,
        ]
      : []),
    ``,
    `\tbody, _ := json.Marshal(map[string]any{`,
    ...entries.map(
      ([k, v]) => `\t\t${(q(k) + ":").padEnd(width)} ${value(v)},`,
    ),
    `\t})`,
    `\treq, _ := http.NewRequest("POST", baseURL+${q(spec.path)}, bytes.NewReader(body))`,
    `\treq.Header.Set("Authorization", "Bearer "+token.AccessToken)`,
    `\treq.Header.Set("Content-Type", "application/json")`,
    `\tres, err := http.DefaultClient.Do(req)`,
    `\tif err != nil {`,
    `\t\tpanic(err)`,
    `\t}`,
    `\tdefer res.Body.Close()`,
    `\tout, _ := io.ReadAll(res.Body)`,
    `\tfmt.Println(res.Status, string(out))`,
    `}`,
    ``,
  ].join("\n");
}

/** The request in one language, ready to paste. */
export function generate(
  language: Language,
  spec: RequestSpec,
  values: BodyValues = {},
): string {
  switch (language) {
    case "body":
      return `POST ${spec.path}\n\n${body(spec, values)}`;
    case "curl":
      return curl(spec);
    case "node":
      return node(spec);
    case "python":
      return python(spec);
    case "php":
      return php(spec);
    case "go":
      return go(spec);
  }
}
