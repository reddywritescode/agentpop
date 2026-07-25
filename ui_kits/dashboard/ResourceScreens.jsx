const { Button, Icon, Input, Textarea, StatusBadge, Badge } = window.AgentPopDesignSystem_47afa4;

function TemplatesScreen() {
  const d = window.AGENTPOP_DESIGN;
  const [modal, setModal] = React.useState(false);
  return (
    <React.Fragment>
      <PageHeader title="Templates" desc="Reusable rootfs images built from a Dockerfile.">
        <Button leadingIcon={<Icon name="plus" />} onClick={() => setModal(true)}>New template</Button>
      </PageHeader>
      <div className="rows">
        {d.templates.map((t) => (
          <div className="rrow" key={t.name}>
            <div className="rrow-main">
              <span className="ricon"><Icon name="layers" size={17} /></span>
              <div className="rcol">
                <div className="rname">{t.name}</div>
                <div className="rmeta"><span>{t.arch}</span><span>{t.size}</span><span>used by {t.used} sandboxes</span></div>
              </div>
              <span className="spacer"></span>
              <Badge tone="outline" size="sm">{t.version}</Badge>
              <StatusBadge status={t.status} label={t.status === "healthy" ? "Build ok" : "Build failed"} />
              <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)" }}>{t.updated}</span>
              <div className="racts">
                <Button variant="ghost" size="icon-sm" aria-label="Build logs" title="Build logs"><Icon name="scroll-text" size={15} /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Deprecate" title="Deprecate"><Icon name="ban" size={15} /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {modal ? (
        <Modal title="Create template" desc="Build a reusable rootfs image." onClose={() => setModal(false)}
          footer={<React.Fragment>
            <span className="spacer"></span>
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={() => setModal(false)}>Build template</Button>
          </React.Fragment>}>
          <Field label="Name" help="Lowercase letters, digits and dashes only.">
            <Input placeholder="my-toolbox" />
          </Field>
          <Field label="Dockerfile" help="Use a single-stage Dockerfile. Avoid COPY/ADD; install packages through RUN.">
            <Textarea mono rows={8} defaultValue={"FROM agentpop-base:debian-1\n\n# Add packages you want available in every sandbox booted from this image.\nRUN apt-get update && apt-get install -y --no-install-recommends \\\n    ripgrep jq sqlite3 \\\n && rm -rf /var/lib/apt/lists/*"} />
          </Field>
        </Modal>
      ) : null}
    </React.Fragment>
  );
}

function NetworksScreen() {
  const d = window.AGENTPOP_DESIGN;
  const [attach, setAttach] = React.useState(null);
  return (
    <React.Fragment>
      <PageHeader title="Networks" desc="Private tenant subnets connecting sandboxes across hosts.">
        <Button leadingIcon={<Icon name="plus" />}>New network</Button>
      </PageHeader>
      <div className="rows">
        {d.networks.map((n) => (
          <div className="rrow" key={n.id}>
            <div className="rrow-main">
              <span className="ricon"><Icon name="network" size={17} /></span>
              <div className="rcol">
                <div className="rname">{n.name}</div>
                <div className="rmeta"><span>{n.id.slice(0, 18)}…</span><span>{n.cidr}</span><span>{n.region}</span></div>
              </div>
              <span className="spacer"></span>
              <Badge tone="outline" size="sm" icon={<Icon name="box" size={12} />}>{n.members} member{n.members === 1 ? "" : "s"}</Badge>
              <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)" }}>{n.updated}</span>
              <div className="racts">
                <Button variant="ghost" size="icon-sm" aria-label="View members" title="View members"><Icon name="eye" size={15} /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Attach sandbox" title="Attach sandbox" onClick={() => setAttach(n)}><Icon name="plus" size={15} /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Delete" title="Delete"><Icon name="trash-2" size={15} /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {attach ? (
        <Modal title="Add sandbox" desc={"Attach to " + attach.name} onClose={() => setAttach(null)}
          footer={<React.Fragment>
            <span className="spacer"></span>
            <Button variant="secondary" onClick={() => setAttach(null)}>Cancel</Button>
            <Button onClick={() => setAttach(null)}>Add sandbox</Button>
          </React.Fragment>}>
          <Field label="Sandbox" help="Members reach each other by private name and IP; cross-network traffic is denied.">
            <Select options={window.AGENTPOP_DESIGN.sandboxes.map((s) => s.name)} />
          </Field>
        </Modal>
      ) : null}
    </React.Fragment>
  );
}

function StorageScreen() {
  const d = window.AGENTPOP_DESIGN;
  const [modal, setModal] = React.useState(false);
  return (
    <React.Fragment>
      <PageHeader title="Storage" desc="S3-compatible disks you register and attach to sandboxes.">
        <Button leadingIcon={<Icon name="plus" />} onClick={() => setModal(true)}>Register storage</Button>
      </PageHeader>
      <div className="rows">
        {d.storages.map((s) => (
          <div className="rrow" key={s.name}>
            <div className="rrow-main">
              <span className="ricon"><Icon name="database" size={17} /></span>
              <div className="rcol">
                <div className="rname">{s.name}</div>
                <div className="rmeta"><span>{s.endpoint}</span><span>{s.bucket}</span><span>{s.region}</span></div>
              </div>
              <span className="spacer"></span>
              <Badge tone="outline" size="sm">{s.attached} attached</Badge>
              <StatusBadge status={s.health} />
              <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)" }}>checked {s.checked}</span>
              <div className="racts">
                <Button variant="ghost" size="icon-sm" aria-label="Detach all" title="Detach all"><Icon name="unplug" size={15} /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Remove" title="Remove"><Icon name="trash-2" size={15} /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {modal ? (
        <Modal title="Register storage" desc="Add an S3-compatible disk." onClose={() => setModal(false)}
          footer={<React.Fragment>
            <span className="spacer"></span>
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={() => setModal(false)}>Register storage</Button>
          </React.Fragment>}>
          <Field label="A name for this storage" help="Used to recognise it later. Lowercase letters, digits and dashes only.">
            <Input placeholder="my-data" />
          </Field>
          <Field label="Bucket name" help="The exact bucket name in your cloud account.">
            <Input mono placeholder="my-bucket" />
          </Field>
          <Field label="Service address" help="For Amazon S3 use https://s3.amazonaws.com. Cloudflare R2, MinIO and Backblaze each have their own URL.">
            <Input mono placeholder="https://s3.amazonaws.com" />
          </Field>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Region" optional><Input mono placeholder="us-east-1" /></Field>
            </div>
            <div className="optrow" style={{ flex: 1.2, marginBottom: 16 }}>
              <Check on={true} onChange={() => {}} label="Older URL style" />
              <div><div className="t" style={{ fontSize: 13 }}>Older URL style</div><div className="d">Leave on for MinIO and most self-hosted setups. Turn off only for Amazon S3.</div></div>
            </div>
          </div>
          <Field label="Access key" help='From your cloud provider&apos;s "access keys" page.'>
            <Input mono />
          </Field>
          <Field label="Secret key" help="Saved in encrypted form. We never show it to you again - keep a copy if you need it.">
            <Input mono type="password" />
          </Field>
        </Modal>
      ) : null}
    </React.Fragment>
  );
}

function WebhooksScreen() {
  const d = window.AGENTPOP_DESIGN;
  const [modal, setModal] = React.useState(false);
  const [events, setEvents] = React.useState(["sandbox.created"]);
  const toggle = (ev) => setEvents(events.includes(ev) ? events.filter((x) => x !== ev) : [...events, ev]);
  return (
    <React.Fragment>
      <PageHeader title="Webhooks" desc="Signed POST deliveries when platform events occur.">
        <Button leadingIcon={<Icon name="plus" />} onClick={() => setModal(true)}>New webhook</Button>
      </PageHeader>
      <div className="rows">
        {d.webhooks.map((w) => (
          <div className="rrow" key={w.url}>
            <div className="rrow-main">
              <span className="ricon"><Icon name="webhook" size={17} /></span>
              <div className="rcol">
                <div className="rname mono" style={{ fontSize: 13 }}>{w.url}</div>
                <div className="rmeta">{w.events.map((e) => <span key={e}>{e}</span>)}</div>
              </div>
              <span className="spacer"></span>
              <StatusBadge status={w.status} />
              <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)" }}>{w.last}</span>
              <div className="racts">
                <Button variant="ghost" size="icon-sm" aria-label="Send test" title="Send test"><Icon name="send" size={15} /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Delete" title="Delete"><Icon name="trash-2" size={15} /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {modal ? (
        <Modal title="Create webhook" desc="Receive a POST request when sandbox events occur." onClose={() => setModal(false)}
          footer={<React.Fragment>
            <span className="spacer"></span>
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={() => setModal(false)}>Create webhook</Button>
          </React.Fragment>}>
          <Field label="Endpoint URL" help="Must be a public http or https URL. We sign every delivery so you can verify it came from us.">
            <Input mono placeholder="https://example.com/webhook" />
          </Field>
          <Field label="Events">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px" }}>
              {d.events.map((ev) => (
                <div className="kv" key={ev} style={{ marginBottom: 0 }}>
                  <Check on={events.includes(ev)} onChange={() => toggle(ev)} label={ev} />
                  <span className="mono" style={{ fontSize: 12 }}>{ev}</span>
                </div>
              ))}
            </div>
          </Field>
        </Modal>
      ) : null}
    </React.Fragment>
  );
}

function AuditScreen() {
  const d = window.AGENTPOP_DESIGN;
  return (
    <React.Fragment>
      <PageHeader title="Audit logs" desc="Every actor, action, and result — humans and agents alike." />
      <div className="rows">
        {d.audit.map((a, i) => (
          <div className="rrow" key={i}>
            <div className="rrow-main" style={{ padding: "10px 16px" }}>
              <span className="ricon" style={{ width: 32, height: 32 }}><Icon name={a.kind === "destroy" ? "trash-2" : a.kind === "exec" ? "terminal" : a.kind === "update" ? "settings" : "box"} size={15} /></span>
              <div className="rcol" style={{ minWidth: 220 }}>
                <div className="rname" style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>{a.action} <Badge tone={a.tone} size="sm">{a.kind}</Badge></div>
                <div className="rmeta"><span>{a.resource}</span></div>
              </div>
              <span className="spacer"></span>
              <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-secondary)" }}>{a.actor}</span>
              <span className="mono" style={{ font: "12px/16px var(--font-mono)", color: "var(--text-tertiary)" }}>{a.ip}</span>
              {a.result === "ok" ? <Badge tone="success" size="sm">ok</Badge> : <Badge tone="danger" size="sm">denied</Badge>}
              <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)", display: "inline-flex", gap: 5, alignItems: "center" }}><Icon name="clock" size={13} />{a.time}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="pager">
        <Button variant="secondary" size="sm" leadingIcon={<Icon name="chevron-left" />}>Prev</Button>
        <Button variant="secondary" size="sm" trailingIcon={<Icon name="chevron-right" />}>Next</Button>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { TemplatesScreen, NetworksScreen, StorageScreen, WebhooksScreen, AuditScreen });
