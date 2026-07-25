const { Button, Icon, Input, Badge } = window.AgentPopDesignSystem_47afa4;

function ProjectTab() {
  const [saved, setSaved] = React.useState(false);
  const [del, setDel] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  return (
    <div className="settwrap">
      <Field label="Project name"><Input defaultValue="production" /></Field>
      <Field label="Project slug" help="Used in API paths and preview hostnames."><Input mono defaultValue="acme-labs/production" disabled /></Field>
      <Field label="Region" help="New sandboxes are placed in this region by default.">
        <Select options={["us-east", "eu-central"]} defaultValue="us-east" />
      </Field>
      <Field label="Default idle policy">
        <Select options={["no idle pause", "pause after 5 min", "pause after 15 min", "pause after 1 h"]} defaultValue="pause after 15 min" />
      </Field>
      <Field label="Default sandbox TTL">
        <Select options={["none", "2 h", "24 h", "7 days"]} defaultValue="none" />
      </Field>
      <Button leadingIcon={saved ? <Icon name="check" /> : null} onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1600); }}>{saved ? "Saved" : "Save changes"}</Button>
      <div className="dangerp" style={{ marginTop: 28 }}>
        <div style={{ flex: 1 }}>
          <div className="t">Delete this project</div>
          <div className="d">Destroys every sandbox, agent, grant, and key in acme-labs/production.</div>
        </div>
        <Button variant="danger" onClick={() => setDel(true)}>Delete project</Button>
      </div>
      {del ? (
        <Modal title="Delete project" desc="This destroys all resources in the project. This cannot be undone." onClose={() => { setDel(false); setTyped(""); }}
          footer={<React.Fragment>
            <span className="spacer"></span>
            <Button variant="secondary" onClick={() => { setDel(false); setTyped(""); }}>Cancel</Button>
            <Button variant="danger" disabled={typed !== "production"} leadingIcon={<Icon name="trash-2" />} onClick={() => { setDel(false); setTyped(""); }}>Delete project</Button>
          </React.Fragment>}>
          <Field label={<span>Type <b>production</b> to confirm</span>}>
            <Input mono placeholder="production" value={typed} onChange={(e) => setTyped(e.target.value)} />
          </Field>
        </Modal>
      ) : null}
    </div>
  );
}

function MembersTab() {
  const st = useStore();
  const d = window.AGENTPOP_DESIGN;
  const [invite, setInvite] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState("Project developer");
  const setMember = (em, patch) => ASXStore.set((s) => ({ members: s.members.map((m) => m.email === em ? { ...m, ...patch } : m) }));
  const send = () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    ASXStore.set((s) => ({ members: s.members.concat({ name: email.split("@")[0], email, role, mfa: false, pending: true, joined: "invited just now" }) }));
    setInvite(false); setEmail("");
  };
  return (
    <React.Fragment>
      <div className="toolbar">
        <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)" }}>{st.members.length} members · roles follow the org → project hierarchy</span>
        <span className="spacer"></span>
        <Button size="sm" leadingIcon={<Icon name="user-plus" />} onClick={() => setInvite(true)}>Invite member</Button>
      </div>
      <div className="rows">
        {st.members.map((m) => (
          <div className="rrow" key={m.email}>
            <div className="rrow-main" style={{ padding: "10px 16px" }}>
              <span className="avatar">{m.name.split(".").map((x) => x[0]).join("").toUpperCase().slice(0, 2)}</span>
              <div className="rcol" style={{ minWidth: 200 }}>
                <div className="rname" style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>{m.name}
                  {m.pending ? <Badge tone="warning" size="sm">pending</Badge> : null}
                  {m.mfa ? <Badge tone="success" size="sm">MFA</Badge> : <Badge tone="neutral" size="sm">no MFA</Badge>}
                </div>
                <div className="rmeta" style={{ fontFamily: "var(--font-sans)" }}><span>{m.email}</span><span>{m.joined}</span></div>
              </div>
              <span className="spacer"></span>
              <div style={{ width: 210 }}>
                <Select options={d.roles} value={m.role} disabled={m.role === "Organization owner"} onChange={(e) => setMember(m.email, { role: e.target.value })} aria-label={"Role for " + m.name} />
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Remove member" title={m.role === "Organization owner" ? "The owner cannot be removed" : "Remove"} disabled={m.role === "Organization owner"}
                onClick={() => ASXStore.set((s) => ({ members: s.members.filter((x) => x.email !== m.email) }))}><Icon name="user-minus" size={15} /></Button>
            </div>
          </div>
        ))}
      </div>
      {invite ? (
        <Modal title="Invite member" desc="Invites expire after 7 days." onClose={() => setInvite(false)}
          footer={<React.Fragment>
            <span className="spacer"></span>
            <Button variant="secondary" onClick={() => setInvite(false)}>Cancel</Button>
            <Button leadingIcon={<Icon name="send" />} onClick={send}>Send invite</Button>
          </React.Fragment>}>
          <Field label="Email"><Input placeholder="teammate@acmelabs.dev" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Role" help="Owner and admin act at the organization level; developer, operator, and viewer are per-project.">
            <Select options={window.AGENTPOP_DESIGN.roles.slice(1)} value={role} onChange={(e) => setRole(e.target.value)} />
          </Field>
        </Modal>
      ) : null}
    </React.Fragment>
  );
}

function BillingTab({ autoOpen }) {
  const st = useStore();
  const d = window.AGENTPOP_DESIGN;
  const [add, setAdd] = React.useState(!!autoOpen);
  const [amt, setAmt] = React.useState(100);
  const total = d.meters.reduce((n, m) => n + m.cost, 0);
  return (
    <React.Fragment>
      <div className="panelgrid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="panel">
          <h3>Prepaid credits</h3>
          <div style={{ font: "600 28px/36px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{st.credits.toFixed(2)}</div>
          <div style={{ font: "12px/17px var(--font-sans)", color: "var(--text-tertiary)", margin: "2px 0 14px" }}>Usage is metered against credits — spend stops when they run out.</div>
          <Button size="sm" leadingIcon={<Icon name="plus" />} onClick={() => setAdd(true)}>Add credits</Button>
        </div>
        <div className="panel">
          <h3>Plan<span className="spacer"></span><Badge tone="accent" size="sm">current</Badge></h3>
          <div style={{ font: "600 15px/22px var(--font-sans)" }}>Developer</div>
          <div style={{ font: "12px/17px var(--font-sans)", color: "var(--text-secondary)", margin: "2px 0 14px" }}>$20/mo platform fee + metered compute, storage, and egress.</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button size="sm" variant="secondary">Compare plans</Button>
            <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="credit-card" size={14} />Visa ···· 4242</span>
          </div>
        </div>
      </div>
      <div className="panel">
        <h3>Usage this month<span className="spacer"></span><span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)", fontWeight: 400 }}>day 22 of cycle</span></h3>
        <div className="ftable" style={{ boxShadow: "none" }}>
          {d.meters.map((m) => (
            <div className="frow" key={m.label}>
              <span style={{ flex: 1, font: "500 13px/18px var(--font-sans)" }}>{m.label}</span>
              <span className="fs" style={{ width: 110 }}>{m.used}</span>
              <span className="fm" style={{ width: 150 }}>{m.unit}</span>
              <span className="fs" style={{ width: 90, color: "var(--text-primary)" }}>{m.cost.toFixed(2)} cr</span>
            </div>
          ))}
          <div className="frow" style={{ background: "var(--surface-2)" }}>
            <span style={{ flex: 1, font: "600 13px/18px var(--font-sans)" }}>Total</span>
            <span className="fs" style={{ width: 90, font: "600 13px/18px var(--font-mono)", color: "var(--text-primary)" }}>{total.toFixed(2)} cr</span>
          </div>
        </div>
      </div>
      {add ? (
        <Modal title="Add credits" desc="Prepaid credits are charged to the payment method on file." onClose={() => setAdd(false)}
          footer={<React.Fragment>
            <span className="est"><b>{amt} cr</b> · ${amt}.00 + tax</span>
            <span className="spacer"></span>
            <Button variant="secondary" onClick={() => setAdd(false)}>Cancel</Button>
            <Button leadingIcon={<Icon name="plus" />} onClick={() => { ASXActions.addCredits(amt); setAdd(false); }}>Add {amt} credits</Button>
          </React.Fragment>}>
          <Field label="Amount">
            <div style={{ display: "flex", gap: 8 }}>
              {[25, 100, 500].map((n) => <Button key={n} size="sm" variant={amt === n ? "primary" : "outline"} onClick={() => setAmt(n)}>{n}</Button>)}
              <div style={{ width: 120 }}><Input mono value={String(amt)} onChange={(e) => setAmt(parseInt(e.target.value.replace(/\D/g, ""), 10) || 0)} aria-label="Custom amount" /></div>
            </div>
          </Field>
        </Modal>
      ) : null}
    </React.Fragment>
  );
}

function QuotasTab() {
  const d = window.AGENTPOP_DESIGN;
  const [sent, setSent] = React.useState(false);
  return (
    <div className="settwrap" style={{ maxWidth: 640 }}>
      <div className="grantnote"><Icon name="shield" size={16} style={{ flexShrink: 0, marginTop: 1 }} />Quotas cap concurrent usage to protect the platform and your bill. Hard caps live at the organization level; this shows acme-labs/production.</div>
      <div className="panel">
        {d.quotas.map((q) => {
          const pct = Math.round((q.used / q.cap) * 100);
          return (
            <div className="meter" key={q.label}>
              <div className="mrow">
                <span className="ml">{q.label}{q.note ? <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}> · {q.note}</span> : null}</span>
                <span className="mv mono">{q.used}{q.unit ? " " + q.unit : ""} / {q.cap}{q.unit ? " " + q.unit : ""}</span>
              </div>
              <div className="mbar"><div className={"mfill" + (pct > 75 ? " warn" : "")} style={{ width: pct + "%" }}></div></div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
        <Button size="sm" variant="secondary" leadingIcon={<Icon name={sent ? "check" : "arrow-up-right"} />} disabled={sent} onClick={() => setSent(true)}>{sent ? "Request sent" : "Request an increase"}</Button>
        <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)" }}>Reviewed within one business day.</span>
      </div>
    </div>
  );
}

function SettingsScreen({ param }) {
  const p = param || {};
  const [tab, setTab] = React.useState(p.tab || "project");
  const TABS = [["project", "Project"], ["members", "Members"], ["billing", "Billing & usage"], ["quotas", "Quotas"]];
  return (
    <React.Fragment>
      <PageHeader title="Settings" desc="Project configuration, membership, billing, and quotas for acme-labs/production." />
      <div className="tabs">
        {TABS.map(([k, l]) => <button key={k} className={"tab" + (tab === k ? " active" : "")} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === "project" ? <ProjectTab /> : null}
      {tab === "members" ? <MembersTab /> : null}
      {tab === "billing" ? <BillingTab autoOpen={p.addCredits} /> : null}
      {tab === "quotas" ? <QuotasTab /> : null}
    </React.Fragment>
  );
}

Object.assign(window, { SettingsScreen });
