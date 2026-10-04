const { Button, Icon, Badge } = window.AgentPopDesignSystem_47afa4;

function OverviewScreen() {
  const st = useStore();
  const d = window.AGENTPOP_DESIGN;
  const go = window.AGENTPOP_DESIGNNav;
  const running = st.sandboxes.filter((s) => s.status === "running").length;
  const agentsUp = st.agents.filter((a) => a.status === "running").length;
  const spend = d.meters.reduce((n, m) => n + m.cost, 0);
  const burnDays = Math.round(st.credits / (spend / 22));
  const stats = [
    { l: "Active sandboxes", icon: "box", v: running, d: st.sandboxes.length + " total · quota 40", to: ["sandboxes"] },
    { l: "Agents running", icon: "bot", v: agentsUp, d: st.agents.length + " deployed", to: ["agents"] },
    { l: "Credits left", icon: "coins", v: st.credits.toFixed(2), d: "≈ " + burnDays + " days at current burn", to: ["settings", { tab: "billing" }] },
    { l: "Spend this month", icon: "activity", v: spend.toFixed(2) + " cr", d: "day 22 of billing cycle", to: ["settings", { tab: "billing" }] },
  ];
  const auditIcon = (k) => k === "destroy" ? "trash-2" : k === "exec" ? "terminal" : k === "update" ? "settings" : "box";
  const quick = [
    { icon: "box", t: "Create a sandbox", d: "Boot an isolated microVM — cached create-to-ready under 2 s.", to: ["sandboxes", { create: true }] },
    { icon: "bot", t: "Deploy an agent", d: "Long-running agent in a managed sandbox with scoped grants.", to: ["agents", { deploy: true }] },
    { icon: "plug", t: "Connect a provider", d: "GitHub, Slack, Gmail, Drive — brokered, tokens never enter VMs.", to: ["connectors"] },
  ];
  return (
    <React.Fragment>
      <PageHeader title="Overview" desc={d.org.name + " / " + d.org.project + " · us-east"}>
        <Button leadingIcon={<Icon name="plus" />} onClick={() => go("sandboxes", { create: true })}>New sandbox</Button>
      </PageHeader>
      <div className="statgrid">
        {stats.map((s) => (
          <button key={s.l} type="button" className="statcard" onClick={() => go(s.to[0], s.to[1])}>
            <span className="sl"><Icon name={s.icon} size={14} />{s.l}</span>
            <div className="sv">{s.v}</div>
            <div className="sd">{s.d}</div>
          </button>
        ))}
      </div>
      <div className="panelgrid">
        <div className="panel">
          <h3>Usage this month<span className="spacer"></span><button className="linkbtn" onClick={() => go("settings", { tab: "billing" })}>Billing &amp; usage →</button></h3>
          {d.meters.map((m) => (
            <div className="meter" key={m.label}>
              <div className="mrow"><span className="ml">{m.label}</span><span className="mv mono">{m.used} · {m.cost.toFixed(2)} cr</span></div>
              <div className="mbar"><div className="mfill" style={{ width: m.pct + "%" }}></div></div>
            </div>
          ))}
        </div>
        <div className="panel">
          <h3>Recent activity<span className="spacer"></span><button className="linkbtn" onClick={() => go("audit")}>Audit logs →</button></h3>
          {d.audit.slice(0, 5).map((a, i) => (
            <button key={i} type="button" className="actline" onClick={() => go("audit")}>
              <span style={{ color: "var(--text-tertiary)", display: "inline-flex" }}><Icon name={auditIcon(a.kind)} size={15} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 500 }}>{a.action}</span>
                <span className="mono" style={{ color: "var(--text-tertiary)", fontSize: 11.5, marginLeft: 8 }}>{a.actor}</span>
              </span>
              {a.result === "denied" ? <Badge tone="danger" size="sm">denied</Badge> : null}
              <span style={{ font: "11px/16px var(--font-sans)", color: "var(--text-tertiary)", flexShrink: 0 }}>{a.time}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="qgrid">
        {quick.map((q) => (
          <button key={q.t} type="button" className="qcard" onClick={() => go(q.to[0], q.to[1])}>
            <span className="ricon" style={{ width: 32, height: 32 }}><Icon name={q.icon} size={16} /></span>
            <span style={{ flex: 1 }}>
              <span style={{ font: "500 13.5px/19px var(--font-sans)", display: "block" }}>{q.t}</span>
              <span style={{ font: "12px/17px var(--font-sans)", color: "var(--text-secondary)", display: "block", marginTop: 2 }}>{q.d}</span>
            </span>
            <Icon name="arrow-right" size={15} style={{ color: "var(--text-tertiary)", marginTop: 2 }} />
          </button>
        ))}
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { OverviewScreen });
