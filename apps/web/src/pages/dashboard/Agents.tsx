import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge, Button, Input, Select, StatusBadge, Textarea } from "@agentpop/ui";
import { Icon } from "../../components/icon";
import { Check, CodeBlock, EmptyState, Field, Modal, PageHeader, Sheet } from "../../components/primitives";
import { MarketplaceCard } from "../../components/marketplace";
import { useMutation, useResource } from "../../api/provider";
import type { Agent, CreateEvalSuiteInput, DeployAgentInput, EvalRun } from "../../api/types";

const modelProviders = {
  Anthropic: {
    secretName: "ANTHROPIC_API_KEY",
    models: ["claude-sonnet-4-5", "claude-haiku-4-5"],
  },
  OpenAI: {
    secretName: "OPENAI_API_KEY",
    models: ["gpt-4.1", "gpt-4.1-mini"],
  },
  Google: {
    secretName: "GEMINI_API_KEY",
    models: ["gemini-2.5-pro", "gemini-2.5-flash"],
  },
  OpenRouter: {
    secretName: "OPENROUTER_API_KEY",
    models: ["openrouter/auto", "anthropic/claude-sonnet-4"],
  },
} as const;

type ModelProvider = keyof typeof modelProviders;

function DeployAgentSheet({ onClose, onDeploy, initialTemplate }: { onClose: () => void; onDeploy: (o: DeployAgentInput) => Promise<void> | void; initialTemplate?: string }) {
  const { data: catalog } = useResource((c) => c.getCatalog(), []);
  const { data: connectors = [] } = useResource((c) => c.listConnectors(), []);
  const { data: templates = [] } = useResource((c) => c.listTemplates(), []);
  const sizes = catalog?.sizes ?? [];
  const readyTemplates = templates.filter((t) => t.status === "ready" && !t.deprecated && t.source === "custom").map((t) => t.name);
  const templateOptions = ["openclaw-compatible", ...readyTemplates.filter((t) => t !== "openclaw-compatible")];
  const [name, setName] = React.useState("");
  const [template, setTemplate] = React.useState(initialTemplate ?? "openclaw-compatible");
  const [size, setSize] = React.useState("");
  const [provider, setProvider] = React.useState<ModelProvider>("Anthropic");
  const [model, setModel] = React.useState<string>(modelProviders.Anthropic.models[0]);
  const [modelKey, setModelKey] = React.useState("");
  const [conns, setConns] = React.useState<string[]>(["GitHub"]);
  const [deploying, setDeploying] = React.useState(false);
  React.useEffect(() => {
    if (!size && sizes[2]) setSize(sizes[2].id);
  }, [sizes, size]);
  React.useEffect(() => {
    setModel(modelProviders[provider].models[0]);
  }, [provider]);
  const toggle = (c: string) => setConns((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const selected = sizes.find((s) => s.id === size);
  return (
    <Sheet
      title="Deploy agent"
      desc="A declarative profile over a long-running sandbox."
      onClose={onClose}
      footer={
        <>
          <span className="est"><b>{selected ? `${selected.cpu} · ${selected.ram}` : ""}</b> · restart on failure</span>
          <span className="spacer" />
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            loading={deploying}
            onClick={async () => {
              if (!selected || !modelKey) return;
              setDeploying(true);
              await onDeploy({
                name: name || "my-agent",
                template,
                model,
                size: `${selected.cpu} · ${selected.ram}`,
                connectors: conns,
                secrets: { [modelProviders[provider].secretName]: modelKey },
              });
            }}
          >
            {deploying ? "Deploying…" : "Deploy agent"}
          </Button>
        </>
      }
    >
      <Field label="Name" help="Lowercase letters, digits, hyphens. Max 22 chars.">
        <Input placeholder="issue-triage" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Agent template" help="Ready template images boot the agent with its package preinstalled.">
        <Select options={templateOptions} value={template} onChange={(e) => setTemplate(e.target.value)} />
      </Field>
      <Field label="Model">
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Select
              options={Object.keys(modelProviders)}
              value={provider}
              onChange={(e) => setProvider(e.target.value as ModelProvider)}
            />
          </div>
          <div style={{ flex: 1.4 }}>
            <Select options={[...modelProviders[provider].models]} value={model} onChange={(e) => setModel(e.target.value)} />
          </div>
        </div>
      </Field>
      <Field
        label="Model API key"
        help={`Stored encrypted and exposed only inside this agent as ${modelProviders[provider].secretName}. The value is never shown again.`}
      >
        <Input
          type="password"
          autoComplete="new-password"
          placeholder={`Enter ${modelProviders[provider].secretName}`}
          value={modelKey}
          onChange={(e) => setModelKey(e.target.value)}
        />
      </Field>
      <Field label="Command" optional>
        <Input mono placeholder="node agent.js --channel ops" />
      </Field>
      <Field label="Resources">
        <div className="sizegrid">
          {sizes.map((s) => (
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
        {connectors.filter((c) => c.connected).map((c) => (
          <div className="kv" key={c.id}>
            <Check on={conns.includes(c.id)} onChange={() => toggle(c.id)} label={c.name} />
            <Icon name={c.icon} size={15} style={{ color: "var(--text-secondary)" }} />
            <span style={{ font: "13px/18px var(--font-sans)" }}>{c.name}</span>
            <span className="spacer" />
            <Badge tone="outline" size="sm">{c.account}</Badge>
          </div>
        ))}
      </Field>
    </Sheet>
  );
}

function AgentSecretsModal({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const runMutation = useMutation();
  const { data } = useResource((c) => c.listAgentSecrets(agent.name), [agent.name]);
  const [keyName, setKeyName] = React.useState("ANTHROPIC_API_KEY");
  const [keyValue, setKeyValue] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const names = data?.items.map((item) => item.name) ?? agent.secretNames;
  return (
    <Modal
      title={`${agent.name} — model keys`}
      desc="Write-only environment secrets scoped to this agent. Existing values cannot be revealed."
      width={640}
      onClose={onClose}
      footer={
        <>
          <span className="est">
            <b>{data?.status ?? (names.length ? "applied" : "not configured")}</b>
            {data ? ` · generation ${data.appliedGeneration}/${data.generation}` : ""}
          </span>
          <span className="spacer" />
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </>
      }
    >
      <Field label="Configured keys">
        {names.length ? names.map((name) => (
          <div className="kv" key={name}>
            <Icon name="key" size={15} />
            <span className="mono">{name}</span>
            <span className="spacer" />
            <Badge tone="success" size="sm">configured</Badge>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${name}`}
              title={`Delete ${name}`}
              onClick={() => void runMutation((c) => c.deleteAgentSecret(agent.name, name))}
            >
              <Icon name="trash-2" size={14} />
            </Button>
          </div>
        )) : <span style={{ color: "var(--text-tertiary)" }}>No model keys configured.</span>}
      </Field>
      <Field label="Add or rotate a key" help="Saving the same environment name rotates its value.">
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 8 }}>
          <Input mono value={keyName} onChange={(e) => setKeyName(e.target.value.toUpperCase())} />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="Paste a new key"
            value={keyValue}
            onChange={(e) => setKeyValue(e.target.value)}
          />
        </div>
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          loading={saving}
          onClick={async () => {
            if (!keyName || !keyValue) return;
            setSaving(true);
            try {
              await runMutation((c) => c.setAgentSecrets(agent.name, { [keyName]: keyValue }));
              setKeyValue("");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving…" : "Save write-only key"}
        </Button>
      </div>
    </Modal>
  );
}

function AgentEvalsModal({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const runMutation = useMutation();
  const { data: suites = [] } = useResource((c) => c.listEvalSuites(agent.name), [agent.name]);
  const { data: runs = [] } = useResource((c) => c.listEvalRuns({ agent: agent.name }), [agent.name]);
  const [scenario, setScenario] = React.useState("smoke_test");
  const [command, setCommand] = React.useState("python3 /workspace/agent.py");
  const [prompt, setPrompt] = React.useState("Reply with a concise readiness confirmation.");
  const [contains, setContains] = React.useState("ready");
  const [rubric, setRubric] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [runningSuite, setRunningSuite] = React.useState<string | null>(null);
  const [selectedRun, setSelectedRun] = React.useState<EvalRun | null>(null);

  const createSuite = async () => {
    const input: CreateEvalSuiteInput = {
      version: 1,
      scenario,
      description: "SDK-compatible release check executed inside this agent sandbox.",
      runner: {
        type: "command",
        command,
        timeoutSeconds: 60,
        judgeProvider: "auto",
      },
      gate: { minScore: 1 },
      source: "agentpop",
      tests: [
        {
          id: "primary_path",
          input: { user: prompt },
          assert: {
            limits: { max_duration_ms: 60_000, max_agent_errors: 0 },
            final_answer: {
              contains: contains ? [contains] : [],
            },
            secrets: { forbidden: true, inspect: ["final_answer"] },
          },
          judges: rubric
            ? [{
                type: "llm",
                check_type: "judge_based",
                rubric,
                min_score: 0.8,
              }]
            : [{ type: "deterministic" }],
        },
      ],
    };
    setSaving(true);
    try {
      await runMutation((c) => c.createEvalSuite(agent.name, input));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`${agent.name} — evaluations`}
      desc="Open AgentOps-compatible suites run inside this agent's isolated sandbox with its own write-only model key."
      width={900}
      onClose={onClose}
      footer={
        <>
          <span className="est"><b>{suites.length} suite{suites.length === 1 ? "" : "s"}</b> · {runs.length} saved run{runs.length === 1 ? "" : "s"}</span>
          <span className="spacer" />
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div>
          <Field label="Create a lightweight suite" help="The command receives each case input as JSON on stdin.">
            <div style={{ display: "grid", gap: 8 }}>
              <Input value={scenario} onChange={(e) => setScenario(e.target.value)} placeholder="support_release_gate" />
              <Input mono value={command} onChange={(e) => setCommand(e.target.value)} placeholder="python3 /workspace/agent.py" />
              <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Test input" />
              <Input value={contains} onChange={(e) => setContains(e.target.value)} placeholder="Required output text" />
              <Textarea
                value={rubric}
                onChange={(e) => setRubric(e.target.value)}
                placeholder="Optional semantic rubric; scored using this agent's model key"
              />
            </div>
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button loading={saving} disabled={!scenario || !command} onClick={() => void createSuite()}>
              {saving ? "Creating…" : "Create eval suite"}
            </Button>
          </div>
        </div>
        <div>
          <Field label="Saved suites">
            <div style={{ display: "grid", gap: 8 }}>
              {suites.length ? suites.map((suite) => (
                <div className="kv" key={suite.id}>
                  <Icon name="flask-conical" size={15} />
                  <div>
                    <div style={{ font: "600 13px/18px var(--font-sans)" }}>{suite.scenario}</div>
                    <div style={{ font: "11px/15px var(--font-mono)", color: "var(--text-tertiary)" }}>
                      {suite.tests.length} case{suite.tests.length === 1 ? "" : "s"} · {suite.source ?? "agentpop"}
                    </div>
                  </div>
                  <span className="spacer" />
                  <Button
                    size="sm"
                    loading={runningSuite === suite.id}
                    onClick={async () => {
                      setRunningSuite(suite.id);
                      try {
                        const run = await runMutation((c) => c.runEvalSuite(suite.id, "sandbox"));
                        setSelectedRun(run);
                      } finally {
                        setRunningSuite(null);
                      }
                    }}
                  >
                    Run
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete eval suite"
                    onClick={() => void runMutation((c) => c.deleteEvalSuite(suite.id))}
                  >
                    <Icon name="trash-2" size={14} />
                  </Button>
                </div>
              )) : (
                <span style={{ color: "var(--text-tertiary)" }}>
                  No suites yet. You can also import generated Open AgentOps YAML through the Python SDK.
                </span>
              )}
            </div>
          </Field>
          <Field label="Recent runs">
            <div style={{ display: "grid", gap: 8 }}>
              {runs.slice(0, 6).map((run) => (
                <button
                  className="kv"
                  key={run.id}
                  style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
                  onClick={() => setSelectedRun(run)}
                >
                  <Badge tone={run.passed ? "success" : "danger"} size="sm">{run.passed ? "passed" : "failed"}</Badge>
                  <span>{run.scenario}</span>
                  <span className="spacer" />
                  <span className="mono">{Math.round(run.score * 100)}%</span>
                </button>
              ))}
            </div>
          </Field>
        </div>
      </div>
      {selectedRun ? (
        <Field label={`Run ${selectedRun.id}`} help={`${selectedRun.cases.length} case(s) · ${selectedRun.environment}`}>
          <div style={{ display: "grid", gap: 8 }}>
            {selectedRun.cases.map((result) => (
              <div className="kv" key={result.id} style={{ alignItems: "flex-start" }}>
                <Badge tone={result.passed ? "success" : "danger"} size="sm">{result.passed ? "pass" : "fail"}</Badge>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ font: "600 13px/18px var(--font-sans)" }}>{result.id} · {Math.round(result.score * 100)}%</div>
                  <pre style={{ margin: "5px 0 0", whiteSpace: "pre-wrap", color: "var(--text-secondary)", font: "11px/16px var(--font-mono)" }}>
                    {result.output || result.error || "No output"}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </Field>
      ) : null}
    </Modal>
  );
}

export function Agents() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const runMutation = useMutation();
  const { data: list = [] } = useResource((c) => c.listAgents(), []);
  const { data: sandboxes = [] } = useResource((c) => c.listSandboxes(), []);
  const [tab, setTab] = React.useState<"agents" | "marketplace">("agents");
  const { data: packages = [], reload: reloadPackages } = useResource((c) => c.listAgentCatalog(), []);
  const [deployTemplate, setDeployTemplate] = React.useState<string | undefined>(undefined);
  const anyBuilding = packages.some((p) => p.installState === "building" || p.installState === "queued");
  React.useEffect(() => {
    if (!anyBuilding) return undefined;
    const timer = window.setInterval(() => reloadPackages(), 3000);
    return () => window.clearInterval(timer);
  }, [anyBuilding, reloadPackages]);
  const [sheet, setSheet] = React.useState(params.get("deploy") === "1");
  const [logs, setLogs] = React.useState<Agent | null>(null);
  const [secretAgent, setSecretAgent] = React.useState<Agent | null>(null);
  const [evalAgent, setEvalAgent] = React.useState<Agent | null>(null);
  const { data: logLines = [] } = useResource((c) => (logs ? c.getAgentLogs(logs.name) : Promise.resolve([])), [logs?.name]);

  const closeSheet = () => {
    setSheet(false);
    if (params.get("deploy")) {
      params.delete("deploy");
      setParams(params, { replace: true });
    }
  };

  const onDeploy = async (o: DeployAgentInput) => {
    await runMutation((c) => c.deployAgent(o));
    closeSheet();
  };

  return (
    <>
      <PageHeader title="Agents" desc="Long-running agents in managed sandboxes with granted connectors.">
        <Button leadingIcon={<Icon name="plus" />} onClick={() => setSheet(true)}>Deploy agent</Button>
      </PageHeader>
      <div className="tabs">
        <button className={"tab" + (tab === "agents" ? " active" : "")} onClick={() => setTab("agents")}>My agents</button>
        <button className={"tab" + (tab === "marketplace" ? " active" : "")} onClick={() => setTab("marketplace")}>Marketplace</button>
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
                    <div className="rname"><button className="linkbtn" style={{ font: "inherit", color: "inherit", cursor: "pointer" }} onClick={() => navigate(`/app/agents/${encodeURIComponent(a.name)}`)}>{a.name}</button></div>
                    <div className="rmeta">
                      <span>{a.template}</span><span>{a.model}</span>
                      {sandboxes.some((s) => s.id === a.sandbox) ? (
                        <button className="linkbtn" style={{ font: "12px/16px var(--font-mono)" }} title="Open sandbox" onClick={() => navigate(`/app/sandboxes/${a.sandbox}`)}>{a.sandbox.slice(0, 14)}…</button>
                      ) : (
                        <span>{a.sandbox.slice(0, 14)}…</span>
                      )}
                    </div>
                  </div>
                  <span className="spacer" />
                  {a.connectors.map((c) => <Badge key={c} tone="outline" size="sm">{c}</Badge>)}
                  {a.secretNames.length ? <Badge tone="success" size="sm">{a.secretNames.length} model key{a.secretNames.length === 1 ? "" : "s"}</Badge> : <Badge tone="warning" size="sm">model key required</Badge>}
                  <StatusBadge status={a.status} />
                  <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)" }}>{a.age}</span>
                  <div className="racts">
                    <Button variant="ghost" size="icon-sm" aria-label="Evaluations" title="Evaluations" onClick={() => setEvalAgent(a)}><Icon name="flask-conical" size={15} /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Model keys" title="Model keys" onClick={() => setSecretAgent(a)}><Icon name="key" size={15} /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Logs" title="Logs" onClick={() => setLogs(a)}><Icon name="scroll-text" size={15} /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Restart" title="Restart" onClick={() => void runMutation((c) => c.restartAgent(a.name))}><Icon name="refresh-cw" size={15} /></Button>
                    {a.status === "stopped" ? (
                      <Button variant="ghost" size="icon-sm" aria-label="Start" title="Start" onClick={() => void runMutation((c) => c.restartAgent(a.name))}><Icon name="play" size={15} /></Button>
                    ) : (
                      <Button variant="ghost" size="icon-sm" aria-label="Stop" title="Stop" onClick={() => void runMutation((c) => c.stopAgent(a.name))}><Icon name="ban" size={15} /></Button>
                    )}
                    <Button variant="ghost" size="icon-sm" aria-label="Delete agent" title="Delete agent and sandbox" onClick={() => void runMutation((c) => c.deleteAgent(a.name))}><Icon name="trash-2" size={15} /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="rows">
          {packages.map((pkg) => (
            <MarketplaceCard
              key={pkg.id}
              pkg={pkg}
              primaryLabel="Deploy"
              onInstall={() => {
                void runMutation((c) => c.installAgentPackage(pkg.id)).catch((err: unknown) => {
                  window.alert(err instanceof Error ? err.message : String(err));
                });
              }}
              onPrimary={() => {
                setDeployTemplate(pkg.id);
                setSheet(true);
              }}
            />
          ))}
        </div>
      )}
      {sheet ? <DeployAgentSheet onClose={() => { closeSheet(); setDeployTemplate(undefined); }} onDeploy={onDeploy} initialTemplate={deployTemplate} /> : null}
      {logs ? (
        <Modal
          title={logs.name + " — logs"}
          desc="Persisted lifecycle and sandbox events for this managed agent."
          width={640}
          onClose={() => setLogs(null)}
          footer={<><span className="spacer" /><Button variant="secondary" onClick={() => setLogs(null)}>Close</Button></>}
        >
          <CodeBlock lines={logLines} />
        </Modal>
      ) : null}
      {secretAgent ? <AgentSecretsModal agent={secretAgent} onClose={() => setSecretAgent(null)} /> : null}
      {evalAgent ? <AgentEvalsModal agent={evalAgent} onClose={() => setEvalAgent(null)} /> : null}
    </>
  );
}
