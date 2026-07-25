import * as React from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Select } from "@agentpop/ui";
import { Icon } from "../../components/icon";
import { Check, CodeBlock, CopyButton, EmptyState, Field, Modal, PageHeader, type CodeLine } from "../../components/primitives";
import { useMutation, useResource } from "../../api/provider";

function CreateKeyModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, scopes: string[]) => void }) {
  const { data: catalog } = useResource((c) => c.getCatalog(), []);
  const allScopes = catalog?.scopes ?? [];
  const [name, setName] = React.useState("");
  const [scopes, setScopes] = React.useState<string[]>(["sandbox:write"]);
  const toggle = (s: string) => setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  return (
    <Modal
      title="Create API key"
      desc="Scoped to one project. Shown once, hashed at rest."
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onCreate(name || "ci-deploys", scopes)}>Create key</Button>
        </>
      }
    >
      <Field label="Name" help="What is this key for? e.g. ci-deploys.">
        <Input placeholder="ci-deploys" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Project"><Select options={["production", "staging"]} defaultValue="production" /></Field>
      <Field label="Expiry"><Select options={["30 days", "90 days", "1 year"]} defaultValue="90 days" /></Field>
      <Field label="Scopes">
        {allScopes.map((s) => (
          <div className="kv" key={s}>
            <Check on={scopes.includes(s)} onChange={() => toggle(s)} label={s} />
            <span className="mono" style={{ fontSize: 13 }}>{s}</span>
          </div>
        ))}
      </Field>
    </Modal>
  );
}

const SNIPPETS: Record<string, CodeLine[]> = {
  TypeScript: [
    "npm install @agentpop/sdk",
    "",
    'import { AgentPopClient } from "@agentpop/sdk";',
    "const client = new AgentPopClient({ baseUrl, apiKey });",
    'const images = await client.listImages({ kind: "agent" });',
    'const sb = await client.deployImage("aider", {',
    '  name: "coding-agent", lifecycle: "persistent"',
    "});",
    'await sb.setSecrets({ ANTHROPIC_API_KEY }); // optional; add later',
    'await sb.sh("python train.py");',
  ],
  Python: [
    "pip install agentpop",
    "",
    "from agentpop import AgentPopClient",
    "client = AgentPopClient(base_url=base_url, api_key=key)",
    'images = client.list_images(kind="agent")',
    'sb = client.deploy_image("aider", name="coding-agent", lifecycle="persistent")',
    'sb.set_secrets({"ANTHROPIC_API_KEY": key})  # optional; add later',
    'sb.sh("python train.py")',
  ],
  Go: [
    'go get github.com/reddywritescode/agentpop/sdk/go/agentpop',
    "",
    'client := agentpop.New(baseURL, apiKey)',
    'images, _ := client.ListImages(ctx, "agent", "")',
    'sandbox, _ := client.DeployImage(ctx, images[0].ID, agentpop.CreateSandboxRequest{',
    '  Name: "coding-agent", Lifecycle: "persistent",',
    "})",
  ],
  CLI: [{ text: "brew install agentpop/tap/agentpop", cmt: "or download a release binary" }, "", { text: "agentpop sandbox create --size s-1vcpu-2gb" }, { text: "agentpop exec sb-01ky47 -- python train.py" }],
};

export function Developer() {
  const runMutation = useMutation();
  const { data: keys = [] } = useResource((c) => c.listApiKeys(), []);
  const [mode, setMode] = React.useState<"humans" | "agents">("humans");
  const [modal, setModal] = React.useState(false);
  const [revealed, setRevealed] = React.useState<string | null>(null);
  const [sdk, setSdk] = React.useState("TypeScript");
  const [mcp, setMcp] = React.useState("Claude Code");

  const onCreate = async (name: string, scopes: string[]) => {
    const { secret } = await runMutation((c) => c.createApiKey(name, scopes));
    setRevealed(secret);
    setModal(false);
  };

  return (
    <>
      <PageHeader title="Developer" desc="API-first and MCP-first access to the same sandbox runtime used by the dashboard.">
        <div className="seg" role="tablist">
          <button className={mode === "humans" ? "active" : ""} onClick={() => setMode("humans")}>For humans</button>
          <button className={mode === "agents" ? "active" : ""} onClick={() => setMode("agents")}>For agents</button>
        </div>
      </PageHeader>
      {mode === "agents" ? (
        <div className="codebl" style={{ marginBottom: 20 }}>
          <div><span className="cmt"># machine-readable overview for agent consumption · GET /llms.txt for the full API map</span></div>
          <div>GET https://api.agentpop.cloud/v1/sandboxes  Authorization: Bearer $AGENTPOP_API_KEY</div>
          <div>GET /v1/images?kind=agent&amp;q=coding  <span className="cmt"># discover inspectable images</span></div>
          <div>POST /v1/images/aider/deploy {"{"}"name":"coder","lifecycle":"persistent"{"}"}  Idempotency-Key: uuid</div>
          <div>PUT /v1/sandboxes/sb-.../secrets {"{"}"secrets":{"{"}"ANTHROPIC_API_KEY":"…"{"}"}{"}"}  <span className="cmt"># optional after deploy</span></div>
          <div>States: queued→provisioning→running→(pausing↔paused)→deleting→deleted | failed</div>
          <div>MCP: npx -y @agentpop/mcp  <span className="cmt"># tools map 1:1 to the REST API, scoped by your key</span></div>
        </div>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        <Card>
          <CardHeader>
            <CardTitle>API keys</CardTitle>
            <CardDescription>Manage your API keys for programmatic access.</CardDescription>
          </CardHeader>
          <CardContent>
            {revealed ? (
              <div className="grantnote" style={{ marginBottom: 12 }}>
                <Icon name="key" size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Copy your key now — we never show it again.<br /><span className="mono" style={{ fontSize: 12 }}>{revealed}</span> <CopyButton text={revealed} /></span>
              </div>
            ) : null}
            {keys.length === 0 ? (
              <EmptyState icon="key" title="No API keys created" desc="Create an API key to access the platform programmatically.">
                <Button size="sm" leadingIcon={<Icon name="plus" />} onClick={() => setModal(true)}>Create your first API key</Button>
              </EmptyState>
            ) : (
              <div className="rows">
                {keys.map((k) => (
                  <div className="rrow" key={k.name}>
                    <div className="rrow-main" style={{ padding: "10px 14px" }}>
                      <span className="ricon" style={{ width: 30, height: 30 }}><Icon name="key" size={14} /></span>
                      <div className="rcol">
                        <div className="rname" style={{ fontSize: 13 }}>{k.name}</div>
                        <div className="rmeta">{k.scopes.map((s) => <span key={s}>{s}</span>)}</div>
                      </div>
                      <span className="spacer" />
                      <span style={{ font: "11px/15px var(--font-sans)", color: "var(--text-tertiary)" }}>expires {k.expires}</span>
                      <Button size="sm" variant="danger-outline" onClick={() => void runMutation((c) => c.revokeApiKey(k.name))}>Revoke</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          {keys.length > 0 ? (
            <CardFooter>
              <Button size="sm" variant="secondary" leadingIcon={<Icon name="plus" />} onClick={() => setModal(true)}>Create key</Button>
            </CardFooter>
          ) : null}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quickstart</CardTitle>
            <CardDescription>TypeScript, Python, and Go SDKs, plus the Go CLI.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="tabs" style={{ marginBottom: 12 }}>
              {Object.keys(SNIPPETS).map((s) => (
                <button key={s} className={"tab" + (sdk === s ? " active" : "")} onClick={() => setSdk(s)}>{s}</button>
              ))}
            </div>
            <CodeBlock lines={SNIPPETS[sdk] ?? []} />
            <div className="help" style={{ marginTop: 10 }}>Webhooks are HMAC-signed — verify <span className="mono">X-AgentPop-Signature</span> before trusting a delivery.</div>
          </CardContent>
        </Card>
      </div>
      {modal ? <CreateKeyModal onClose={() => setModal(false)} onCreate={onCreate} /> : null}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start", marginTop: 16 }}>
        <Card>
          <CardHeader>
            <CardTitle>MCP server</CardTitle>
            <CardDescription>Give Claude and other MCP clients scoped sandbox tools — every call is audited.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="tabs" style={{ marginBottom: 12 }}>
              {["Claude Code", "claude_desktop_config.json"].map((s) => (
                <button key={s} className={"tab" + (mcp === s ? " active" : "")} onClick={() => setMcp(s)}>{s}</button>
              ))}
            </div>
            {mcp === "Claude Code" ? (
              <CodeBlock lines={[{ text: "claude mcp add agentpop \\" }, "  --env AGENTPOP_API_KEY=pop_… \\", "  -- npx -y @agentpop/mcp"]} />
            ) : (
              <CodeBlock lines={['{ "mcpServers": { "agentpop": {', '  "command": "npx", "args": ["-y", "@agentpop/mcp"],', '  "env": { "AGENTPOP_API_KEY": "pop_…" } } } }']} />
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
              {["image_list", "image_get", "image_generate", "image_build", "image_fork", "image_deploy", "sandbox_create", "sandbox_exec", "sandbox_secret_set", "connector_tools", "file_put", "port_expose", "sandbox_destroy"].map((t) => (
                <Badge key={t} tone="outline" size="sm"><span className="mono">{t}</span></Badge>
              ))}
            </div>
            <div className="help" style={{ marginTop: 10 }}>Tools inherit the key's scopes — a key without <span className="mono">sandbox:exec</span> can't run commands.</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Webhook verification</CardTitle>
            <CardDescription>Deliveries are HMAC-signed; reject anything you can't verify.</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock lines={[{ text: 'import { verifyWebhook } from "@agentpop/sdk";' }, "", 'const ok = verifyWebhook(rawBody, req.headers["x-agentpop-signature"],', "  process.env.AGENTPOP_WEBHOOK_SECRET);", { text: "if (!ok) return res.status(401).end();", cmt: "HMAC-SHA256(ts + '.' + body), 5 min tolerance" }]} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <Button size="sm" variant="secondary" leadingIcon={<Icon name="file-json" />} onClick={() => window.open("/openapi.yaml", "_blank", "noopener")}>OpenAPI 3.1 spec</Button>
              <Button size="sm" variant="secondary" leadingIcon={<Icon name="book-open" />} onClick={() => window.open("https://github.com/reddywritescode/agentpop/tree/main/docs", "_blank", "noopener")}>API reference</Button>
              <Button size="sm" variant="secondary" leadingIcon={<Icon name="github" />} onClick={() => window.open("https://github.com/reddywritescode/agentpop", "_blank", "noopener")}>Source and SDKs</Button>
              <Button size="sm" variant="secondary" leadingIcon={<Icon name="download" />} onClick={() => window.open("https://github.com/reddywritescode/agentpop/releases", "_blank", "noopener")}>CLI releases</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
