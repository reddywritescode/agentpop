const { Button, Icon, Input, Badge, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } = window.AgentPopDesignSystem_47afa4;

function CreateKeyModal({ onClose, onCreate }) {
  const d = window.AGENTPOP_DESIGN;
  const [name, setName] = React.useState("");
  const [scopes, setScopes] = React.useState(["sandbox:write"]);
  const toggle = (s) => setScopes(scopes.includes(s) ? scopes.filter((x) => x !== s) : [...scopes, s]);
  return (
    <Modal title="Create API key" desc="Scoped to one project. Shown once, hashed at rest." onClose={onClose}
      footer={<React.Fragment>
        <span className="spacer"></span>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onCreate({ name: name || "ci-deploys", scopes })}>Create key</Button>
      </React.Fragment>}>
      <Field label="Name" help="What is this key for? e.g. ci-deploys.">
        <Input placeholder="ci-deploys" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Project">
        <Select options={["production", "staging"]} defaultValue="production" />
      </Field>
      <Field label="Expiry">
        <Select options={["30 days", "90 days", "1 year"]} defaultValue="90 days" />
      </Field>
      <Field label="Scopes">
        {d.scopes.map((s) => (
          <div className="kv" key={s}>
            <Check on={scopes.includes(s)} onChange={() => toggle(s)} label={s} />
            <span className="mono" style={{ fontSize: 13 }}>{s}</span>
          </div>
        ))}
      </Field>
    </Modal>
  );
}

function DeveloperScreen() {
  const [mode, setMode] = React.useState("humans");
  const [keys, setKeys] = React.useState([]);
  const [modal, setModal] = React.useState(false);
  const [revealed, setRevealed] = React.useState(null);
  const [sdk, setSdk] = React.useState("TypeScript");
  const [mcp, setMcp] = React.useState("Claude Code");
  const onCreate = ({ name, scopes }) => {
    const secret = "pop_" + Math.random().toString(36).slice(2, 10) + "…redacted";
    setKeys((ks) => [{ name, scopes, created: "just now", expires: "in 90 days" }, ...ks]);
    setRevealed(secret); setModal(false);
  };
  const snippets = {
    TypeScript: ["npm install @agentpop/sdk", "", { text: 'import { AgentPopClient } from "@agentpop/sdk";', cmt: "" }, "const client = new AgentPopClient({ baseUrl, apiKey });", "const sb = await client.createSandbox({ name: \"training\", vcpu: 1, memoryMb: 2048 });", "await sb.sh(\"python train.py\");"],
    Python: ["pip install agentpop", "", "from agentpop import AgentPopClient", "client = AgentPopClient(base_url=base_url, api_key=key)", "sb = client.create_sandbox(name=\"training\", vcpu=1, memory_mb=2048)", "sb.sh(\"python train.py\")"],
    CLI: [{ text: "brew install agentpop/tap/agentpop", cmt: "or curl installer" }, "", { text: "agentpop login", cmt: "sign in via browser" }, { text: "agentpop sandbox create --size s-1vcpu-2gb", cmt: "" }, { text: "agentpop sandbox exec sb-01ky47 -- python train.py", cmt: "" }],
  };
  return (
    <React.Fragment>
      <PageHeader title="Developer" desc="API keys, SDK quickstarts, the agentpop CLI, and the MCP server.">
        <div className="seg" role="tablist">
          <button className={mode === "humans" ? "active" : ""} onClick={() => setMode("humans")}>For humans</button>
          <button className={mode === "agents" ? "active" : ""} onClick={() => setMode("agents")}>For agents</button>
        </div>
      </PageHeader>
      {mode === "agents" ? (
        <div className="codebl" style={{ marginBottom: 20 }}>
          <div><span className="cmt"># machine-readable overview for agent consumption · GET /llms.txt for the full API map</span></div>
          <div>GET https://api.agentpop.cloud/v1/sandboxes  Authorization: Bearer $AGENTPOP_API_KEY</div>
          <div>POST /v1/sandboxes {"{"}"size":"s-1vcpu-2gb","image":"devbox:1"{"}"}  Idempotency-Key: uuid</div>
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
                <span>Copy your key now — we never show it again.<br /><span className="mono" style={{ fontSize: 12 }}>{revealed}</span> <CopyBtn text={revealed} /></span>
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
                      <span className="spacer"></span>
                      <span style={{ font: "11px/15px var(--font-sans)", color: "var(--text-tertiary)" }}>expires {k.expires}</span>
                      <Button size="sm" variant="danger-outline" onClick={() => setKeys((ks) => ks.filter((x) => x !== k))}>Revoke</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          {keys.length > 0 ? <CardFooter><Button size="sm" variant="secondary" leadingIcon={<Icon name="plus" />} onClick={() => setModal(true)}>Create key</Button></CardFooter> : null}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quickstart</CardTitle>
            <CardDescription>TypeScript and Python SDKs, or the Go CLI.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="tabs" style={{ marginBottom: 12 }}>
              {Object.keys(snippets).map((s) => (
                <button key={s} className={"tab" + (sdk === s ? " active" : "")} onClick={() => setSdk(s)}>{s}</button>
              ))}
            </div>
            <CodeBlock lines={snippets[sdk]} />
            <div className="help" style={{ marginTop: 10 }}>Webhooks are HMAC-signed — verify <span className="mono">X-AgentPop-Signature</span> before trusting a delivery. <a href="docs.html#webhooks">API reference</a></div>
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
              <CodeBlock lines={[{ text: "claude mcp add agentpop \\", cmt: "" }, "  --env AGENTPOP_API_KEY=pop_… \\", "  -- npx -y @agentpop/mcp"]} />
            ) : (
              <CodeBlock lines={['{ "mcpServers": { "agentpop": {', '  "command": "npx", "args": ["-y", "@agentpop/mcp"],', '  "env": { "AGENTPOP_API_KEY": "pop_…" } } } }']} />
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
              {["sandbox_create", "sandbox_exec", "file_put", "file_get", "port_expose", "sandbox_pause", "sandbox_resume", "sandbox_fork", "sandbox_destroy", "agent_logs"].map((t) => <Badge key={t} tone="outline" size="sm"><span className="mono">{t}</span></Badge>)}
            </div>
            <div className="help" style={{ marginTop: 10 }}>Tools inherit the key’s scopes — a key without <span className="mono">sandbox:exec</span> can’t run commands.</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Webhook verification</CardTitle>
            <CardDescription>Deliveries are HMAC-signed; reject anything you can’t verify.</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock lines={[{ text: 'import { verifyWebhook } from "@agentpop/sdk";', cmt: "" }, "", 'const ok = verifyWebhook(rawBody, req.headers["x-agentpop-signature"],', "  process.env.AGENTPOP_WEBHOOK_SECRET);", { text: "if (!ok) return res.status(401).end();", cmt: "HMAC-SHA256(ts + '.' + body), 5 min tolerance" }]} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <Button size="sm" variant="secondary" leadingIcon={<Icon name="file-json" />} onClick={() => { location.href = "docs.html#api"; }}>OpenAPI 3.1 spec</Button>
              <Button size="sm" variant="secondary" leadingIcon={<Icon name="book-open" />} onClick={() => { location.href = "docs.html"; }}>API reference</Button>
              <Button size="sm" variant="secondary" leadingIcon={<Icon name="github" />} onClick={() => { location.href = "docs.html#opensource"; }}>SDK repos</Button>
              <Button size="sm" variant="secondary" leadingIcon={<Icon name="download" />} onClick={() => { location.href = "docs.html#cli"; }}>CLI releases</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { DeveloperScreen });
