const { Button, Icon, Input, StatusBadge, Badge } = window.AgentPopDesignSystem_47afa4;

function DeployAgentSheet({ onClose, onDeploy }) {
  const d = window.AGENTPOP_DESIGN;
  const [name, setName] = React.useState("");
  const [size, setSize] = React.useState(d.sizes[2].id);
  const [model, setModel] = React.useState("claude-sonnet-4-5");
  const [conns, setConns] = React.useState(["GitHub"]);
  const [deploying, setDeploying] = React.useState(false);
  const toggle = (c) => setConns(conns.includes(c) ? conns.filter((x) => x !== c) : [...conns, c]);
  return (
    <Sheet title="Deploy agent" desc="A declarative profile over a long-running sandbox." onClose={onClose}
      footer={<React.Fragment>
        <span className="est"><b>{size}</b> · restart on failure</span>
        <span className="spacer"></span>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={deploying} onClick={() => { setDeploying(true); const s = d.sizes.find((x) => x.id === size); setTimeout(() => onDeploy({ name: name || "my-agent", model, size: s.cpu + " · " + s.ram, connectors: conns }), 900); }}>{deploying ? "Deploying…" : "Deploy agent"}</Button>
      </React.Fragment>}>
      <Field label="Name" help="Lowercase letters, digits, hyphens. Max 22 chars.">
        <Input placeholder="issue-triage" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Agent template">
        <Select options={["openclaw-compatible", "custom image…"]} defaultValue="openclaw-compatible" />
      </Field>
      <Field label="Model">
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><Select options={["Anthropic", "OpenAI"]} defaultValue="Anthropic" /></div>
          <div style={{ flex: 1.4 }}><Select options={["claude-sonnet-4-5", "claude-haiku-4-5"]} value={model} onChange={(e) => setModel(e.target.value)} /></div>
        </div>
      </Field>
      <Field label="Model secret" help="A secret reference — the raw key is never injected into the VM.">
        <Select options={["secret/anthropic-prod", "secret/anthropic-dev"]} defaultValue="secret/anthropic-prod" />
      </Field>
      <Field label="Command" optional>
        <Input mono placeholder="node agent.js --channel ops" />
      </Field>
      <Field label="Resources">
        <div className="sizegrid">
          {d.sizes.map((s) => (
            <div key={s.id} className={"sizecard" + (size === s.id ? " sel" : "")} onClick={() => setSize(s.id)} role="radio" aria-checked={size === s.id}>
              <div className="t">{s.id}</div>
              <div className="d"><span>{s.cpu}</span><span>{s.ram}</span></div>
            </div>
          ))}
        </div>
      </Field>
      <Field label="Restart policy">
        <Select options={["on failure", "always", "never"]} defaultValue="on failure" />
      </Field>
      <Field label="Connector grants" help="Agents receive scoped grants, not your OAuth credentials.">
        {d.connectors.filter((c) => c.connected).map((c) => (
          <div className="kv" key={c.name}>
            <Check on={conns.includes(c.name)} onChange={() => toggle(c.name)} label={c.name} />
            <Icon name={c.icon} size={15} style={{ color: "var(--text-secondary)" }} />
            <span style={{ font: "13px/18px var(--font-sans)" }}>{c.name}</span>
            <span className="spacer"></span>
            <Badge tone="outline" size="sm">{c.account}</Badge>
          </div>
        ))}
      </Field>
    </Sheet>
  );
}

function AgentsScreen({ param }) {
  const st = useStore();
  const list = st.agents;
  const [tab, setTab] = React.useState("agents");
  const [sheet, setSheet] = React.useState(!!(param && param.deploy));
  const [logs, setLogs] = React.useState(null);
  const onDeploy = (o) => { ASXActions.deployAgent(o); setSheet(false); };
  return (
    <React.Fragment>
      <PageHeader title="Agents" desc="Long-running agents in managed sandboxes with granted connectors.">
        <Button leadingIcon={<Icon name="plus" />} onClick={() => setSheet(true)}>Deploy agent</Button>
      </PageHeader>
      <div className="tabs">
        <button className={"tab" + (tab === "agents" ? " active" : "")} onClick={() => setTab("agents")}>My agents</button>
        <button className={"tab" + (tab === "templates" ? " active" : "")} onClick={() => setTab("templates")}>Templates</button>
      </div>
      {tab === "agents" ? (
        list.length === 0 ? (
          <EmptyState icon="bot" title="No agents deployed" desc="Deploy an agent to run long-lived work in a sandbox with scoped connector access.">
            <Button size="sm" leadingIcon={<Icon name="plus" />} onClick={() => setSheet(true)}>Deploy agent</Button>
          </EmptyState>
        ) : (
          <div className="rows">
            {list.map((a) => (
              <div className="rrow" key={a.name}>
                <div className="rrow-main">
                  <span className="ricon"><Icon name="bot" size={17} /></span>
                  <div className="rcol">
                    <div className="rname">{a.name}</div>
                    <div className="rmeta"><span>{a.template}</span><span>{a.model}</span>
                      {st.sandboxes.some((s) => s.id === a.sandbox)
                        ? <button className="linkbtn" style={{ font: "12px/16px var(--font-mono)" }} title="Open sandbox" onClick={() => window.AGENTPOP_DESIGNNav("sandbox", { id: a.sandbox })}>{a.sandbox.slice(0, 14)}…</button>
                        : <span>{a.sandbox.slice(0, 14)}…</span>}
                    </div>
                  </div>
                  <span className="spacer"></span>
                  {a.connectors.map((c) => <Badge key={c} tone="outline" size="sm">{c}</Badge>)}
                  <StatusBadge status={a.status} />
                  <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)" }}>{a.age}</span>
                  <div className="racts">
                    <Button variant="ghost" size="icon-sm" aria-label="Logs" title="Logs" onClick={() => setLogs(a)}><Icon name="scroll-text" size={15} /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Restart" title="Restart" onClick={() => ASXActions.restartAgent(a.name)}><Icon name="refresh-cw" size={15} /></Button>
                    {a.status === "stopped"
                      ? <Button variant="ghost" size="icon-sm" aria-label="Start" title="Start" onClick={() => ASXActions.restartAgent(a.name)}><Icon name="play" size={15} /></Button>
                      : <Button variant="ghost" size="icon-sm" aria-label="Stop" title="Stop" onClick={() => ASXActions.stopAgent(a.name)}><Icon name="ban" size={15} /></Button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="rows">
          <div className="rrow">
            <div className="rrow-main">
              <span className="ricon"><Icon name="layers" size={17} /></span>
              <div className="rcol">
                <div className="rname">openclaw-compatible</div>
                <div className="rmeta"><span>reference agent template</span><span>framework-neutral</span></div>
              </div>
              <span className="spacer"></span>
              <Badge tone="accent" size="sm">v1</Badge>
              <Button size="sm" variant="secondary" onClick={() => { setTab("agents"); setSheet(true); }}>Use template</Button>
            </div>
          </div>
        </div>
      )}
      {sheet ? <DeployAgentSheet onClose={() => setSheet(false)} onDeploy={onDeploy} /> : null}
      {logs ? (
        <Modal title={logs.name + " — logs"} desc="Streamed over SSE from the agent sandbox." width={640} onClose={() => setLogs(null)}
          footer={<React.Fragment><span className="spacer"></span><Button variant="secondary" onClick={() => setLogs(null)}>Close</Button></React.Fragment>}>
          <CodeBlock lines={window.AGENTPOP_DESIGN.agentLogs} />
        </Modal>
      ) : null}
    </React.Fragment>
  );
}

Object.assign(window, { AgentsScreen, DeployAgentSheet });
