import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Button, StatusBadge } from "@agentpop/ui";
import { Icon } from "../../components/icon";
import { CopyButton, EmptyState } from "../../components/primitives";
import { Terminal } from "../../components/terminal";
import { useMutation, useResource } from "../../api/provider";

/**
 * Agent detail — the fused agent view (identity + its managed sandbox's live
 * terminal), mirroring how a hosted agent surfaces its runtime. The terminal
 * runs commands inside the agent's own sandbox.
 */
const cardStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 12,
  background: "var(--surface, var(--bg-elevated, #fff))",
};

export function AgentDetail() {
  const { name = "" } = useParams();
  const navigate = useNavigate();
  const runMutation = useMutation();
  const { data: agents = [], loading } = useResource((c) => c.listAgents(), []);
  const agent = agents.find((a) => a.name === name);
  const { data: sandbox } = useResource(
    (c) => (agent ? c.getSandbox(agent.sandbox) : Promise.resolve(null)),
    [agent?.sandbox],
  );
  const { data: logs = [] } = useResource((c) => (agent ? c.getAgentLogs(agent.name) : Promise.resolve([])), [agent?.name]);
  const { data: secrets } = useResource((c) => (agent ? c.listAgentSecrets(agent.name) : Promise.resolve(null)), [agent?.name]);

  if (!loading && !agent)
    return (
      <EmptyState icon="bot" title="Agent not found" desc="This agent may have been deleted.">
        <Button size="sm" onClick={() => navigate("/app/agents")}>Back to agents</Button>
      </EmptyState>
    );
  if (!agent) return null;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <button className="linkbtn" onClick={() => navigate("/app/agents")} style={{ font: "13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>Agents</button>
        <span style={{ color: "var(--text-tertiary)" }}>/</span>
        <span style={{ font: "13px/18px var(--font-sans)" }}>{agent.name}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <span className="ricon"><Icon name="bot" size={20} /></span>
        <h1 style={{ margin: 0, font: "600 22px/28px var(--font-sans)" }}>{agent.name}</h1>
        <StatusBadge status={agent.status} />
        <span className="spacer" />
        <Button variant="secondary" size="sm" leadingIcon={<Icon name="refresh-cw" />} onClick={() => void runMutation((c) => c.restartAgent(agent.name))}>Restart</Button>
        {agent.status === "stopped" ? (
          <Button variant="secondary" size="sm" leadingIcon={<Icon name="play" />} onClick={() => void runMutation((c) => c.restartAgent(agent.name))}>Start</Button>
        ) : (
          <Button variant="secondary" size="sm" leadingIcon={<Icon name="ban" />} onClick={() => void runMutation((c) => c.stopAgent(agent.name))}>Stop</Button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) 1fr", gap: 18, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ ...cardStyle, padding: 16 }}>
            <div style={{ font: "600 13px/18px var(--font-sans)", marginBottom: 10 }}>Configuration</div>
            <div className="kv"><Icon name="layers" size={14} /><span>Template</span><span className="spacer" /><Badge tone="outline" size="sm">{agent.template}</Badge></div>
            <div className="kv"><Icon name="cpu" size={14} /><span>Model</span><span className="spacer" /><span className="mono" style={{ font: "12px/16px var(--font-mono)" }}>{agent.model}</span></div>
            <div className="kv">
              <Icon name="box" size={14} /><span>Sandbox</span><span className="spacer" />
              <button className="linkbtn mono" style={{ font: "12px/16px var(--font-mono)" }} onClick={() => navigate(`/app/sandboxes/${agent.sandbox}`)}>{agent.sandbox.slice(0, 16)}…</button>
            </div>
            {sandbox ? (
              <div className="kv"><Icon name="server" size={14} /><span>Resources</span><span className="spacer" /><span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-secondary)" }}>{sandbox.size} · {sandbox.disk}</span></div>
            ) : null}
          </div>

          <div style={{ ...cardStyle, padding: 16 }}>
            <div style={{ font: "600 13px/18px var(--font-sans)", marginBottom: 10 }}>Model keys</div>
            {(secrets?.items ?? []).length ? (
              (secrets?.items ?? []).map((s) => (
                <div className="kv" key={s.name}><Icon name="key" size={14} /><span className="mono" style={{ font: "12px/16px var(--font-mono)" }}>{s.name}</span><span className="spacer" /><Badge tone="success" size="sm">write-only</Badge></div>
              ))
            ) : (
              <div style={{ font: "12px/18px var(--font-sans)", color: "var(--text-tertiary)" }}>No model keys configured.</div>
            )}
          </div>

          <div style={{ ...cardStyle, padding: 16 }}>
            <div style={{ font: "600 13px/18px var(--font-sans)", marginBottom: 10 }}>Connector grants</div>
            {agent.connectors.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{agent.connectors.map((c) => <Badge key={c} tone="outline" size="sm">{c}</Badge>)}</div>
            ) : (
              <div style={{ font: "12px/18px var(--font-sans)", color: "var(--text-tertiary)" }}>No connectors granted.</div>
            )}
          </div>

          <div style={{ ...cardStyle, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <span style={{ font: "600 13px/18px var(--font-sans)" }}>Lifecycle logs</span>
              <span className="spacer" />
              {logs.length ? <CopyButton text={logs.join("\n")} /> : null}
            </div>
            <pre className="mono ap-scroll" style={{ margin: 0, maxHeight: 160, overflowY: "auto", whiteSpace: "pre-wrap", font: "11px/16px var(--font-mono)", color: "var(--text-secondary)" }}>
              {logs.length ? logs.join("\n") : "No logs yet."}
            </pre>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 16, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Icon name="terminal" size={16} />
            <span style={{ font: "600 14px/18px var(--font-sans)" }}>Live terminal</span>
            <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)" }}>({agent.name})</span>
          </div>
          {sandbox ? (
            <Terminal sb={sandbox} label={agent.name} />
          ) : (
            <div className="term" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#8f8b83" }}>Attaching to the agent runtime…</div>
          )}
        </div>
      </div>
    </>
  );
}
