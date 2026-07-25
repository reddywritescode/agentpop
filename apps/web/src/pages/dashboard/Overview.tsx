import { useNavigate } from "react-router-dom";
import { Badge, Button } from "@agentpop/ui";
import { Icon } from "../../components/icon";
import { PageHeader } from "../../components/primitives";
import { useResource } from "../../api/provider";
import { useAuth } from "../../auth/session";

const auditIcon = (k: string) =>
  k === "destroy" ? "trash-2" : k === "exec" ? "terminal" : k === "update" ? "settings" : "box";

export function Overview() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { data: sandboxes = [] } = useResource((c) => c.listSandboxes(), []);
  const { data: connectors = [] } = useResource((c) => c.listConnectors(), []);
  const { data: audit = [] } = useResource((c) => c.listAuditEvents(), []);

  const running = sandboxes.filter((s) => s.status === "running").length;
  const agents = sandboxes.filter((s) => s.kind === "agent");
  const connected = connectors.filter((connector) => connector.connected).length;

  const stats = [
    { l: "Running sandboxes", icon: "box", v: running, d: sandboxes.length + " total environments", to: "/app/sandboxes" },
    { l: "Agent sandboxes", icon: "bot", v: agents.length, d: "same runtime, agent recipe", to: "/app/marketplace?kind=agent" },
    { l: "Connected providers", icon: "plug", v: connected, d: connectors.length + " integrations available", to: "/app/connectors" },
    { l: "Subscription", icon: "badge-dollar-sign", v: "$20", d: "fixed monthly plan · no credits", to: "/app/settings?tab=billing" },
  ];
  const quick = [
    { icon: "sparkles", t: "Browse the marketplace", d: "Install or generate an agent/environment recipe, then deploy it as a sandbox.", to: "/app/marketplace" },
    { icon: "box", t: "Create a blank sandbox", d: "Boot an isolated Firecracker microVM with SSH, files, logs, ports, and exec.", to: "/app/sandboxes?create=1" },
    { icon: "plug", t: "Connect a provider", d: "GitHub, Slack, Gmail, Drive — brokered, tokens never enter VMs.", to: "/app/connectors" },
  ];

  return (
    <>
      <PageHeader title="Overview" desc={`${session?.org ?? "acme-labs"} / ${session?.project ?? "production"} · us-east`}>
        <Button leadingIcon={<Icon name="plus" />} onClick={() => navigate("/app/sandboxes?create=1")}>New sandbox</Button>
      </PageHeader>
      <div className="statgrid">
        {stats.map((s) => (
          <button key={s.l} type="button" className="statcard" onClick={() => navigate(s.to)}>
            <span className="sl"><Icon name={s.icon} size={14} />{s.l}</span>
            <div className="sv">{s.v}</div>
            <div className="sd">{s.d}</div>
          </button>
        ))}
      </div>
      <div className="panelgrid">
        <div className="panel">
          <h3>
            One runtime primitive<span className="spacer" />
            <button className="linkbtn" onClick={() => navigate("/app/developer")}>API &amp; MCP →</button>
          </h3>
          <div className="grantnote">
            <Icon name="box" size={16} style={{ flexShrink: 0 }} />
            <span>
              An “agent” is a sandbox created from an agent recipe. It gets the same SSH, terminal, files,
              logs, ports, pause, fork, network policy, encrypted secrets, API, CLI, SDK, and MCP controls.
            </span>
          </div>
          <div className="ftable" style={{ boxShadow: "none", marginTop: 10 }}>
            {[
              ["Recipe", "Dockerfile + metadata"],
              ["Runtime", "Firecracker microVM"],
              ["Automation", "REST · SDK · CLI · MCP"],
            ].map(([label, value]) => (
              <div className="frow" key={label}>
                <span style={{ flex: 1, font: "500 13px/18px var(--font-sans)" }}>{label}</span>
                <span className="mono" style={{ color: "var(--text-secondary)", fontSize: 12 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h3>
            Recent activity<span className="spacer" />
            <button className="linkbtn" onClick={() => navigate("/app/audit")}>Audit logs →</button>
          </h3>
          {audit.slice(0, 5).map((a, i) => (
            <button key={i} type="button" className="actline" onClick={() => navigate("/app/audit")}>
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
          <button key={q.t} type="button" className="qcard" onClick={() => navigate(q.to)}>
            <span className="ricon" style={{ width: 32, height: 32 }}><Icon name={q.icon} size={16} /></span>
            <span style={{ flex: 1 }}>
              <span style={{ font: "500 13.5px/19px var(--font-sans)", display: "block" }}>{q.t}</span>
              <span style={{ font: "12px/17px var(--font-sans)", color: "var(--text-secondary)", display: "block", marginTop: 2 }}>{q.d}</span>
            </span>
            <Icon name="arrow-right" size={15} style={{ color: "var(--text-tertiary)", marginTop: 2 }} />
          </button>
        ))}
      </div>
    </>
  );
}
