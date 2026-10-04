import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Badge, Button, Input, Select, StatusBadge } from "@agentpop/ui";
import { Icon } from "../../components/icon";
import { CopyButton, EmptyState, Field, Modal, PageHeader } from "../../components/primitives";
import { useApi, useMutation, useResource } from "../../api/provider";
import { Terminal as Term } from "../../components/terminal";
import type { PreviewMode, Sandbox, SandboxLogEntry } from "../../api/types";

function FilesTab({ sb }: { sb: Sandbox }) {
  const { data: files = [], reload } = useResource((c) => c.listFiles(sb.id), [sb.id]);
  const runMutation = useMutation();
  const uploadInput = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const [folderDialog, setFolderDialog] = React.useState(false);
  const [folderName, setFolderName] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<{ name: string; dir?: boolean } | null>(null);
  const upload = async (file: File) => {
    setBusy(file.name);
    setError("");
    try {
      await runMutation((client) => client.uploadFile(sb.id, `/workspace/${file.name}`, file));
      reload();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : String(uploadError));
    } finally {
      setBusy("");
      if (uploadInput.current) uploadInput.current.value = "";
    }
  };
  const download = async (name: string) => {
    setBusy(name);
    setError("");
    try {
      const blob = await runMutation((client) => client.downloadFile(sb.id, `/workspace/${name}`));
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 5_000);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : String(downloadError));
    } finally {
      setBusy("");
    }
  };
  const createDirectory = async () => {
    const name = folderName.trim().replace(/^\/+|\/+$/g, "");
    if (!name) return;
    setBusy(name);
    setError("");
    try {
      await runMutation((client) => client.createDirectory(sb.id, `/workspace/${name}`));
      setFolderDialog(false);
      setFolderName("");
      reload();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setBusy("");
    }
  };
  const remove = async () => {
    if (!deleteTarget) return;
    setBusy(deleteTarget.name);
    setError("");
    try {
      await runMutation((client) => client.deleteFile(sb.id, `/workspace/${deleteTarget.name}`));
      setDeleteTarget(null);
      reload();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    } finally {
      setBusy("");
    }
  };
  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <span className="chip"><Icon name="folder" size={12} />/workspace</span>
        <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)" }}>{files.length} entries</span>
        <span className="spacer" />
        <Button variant="secondary" size="sm" leadingIcon={<Icon name="folder-plus" />} onClick={() => setFolderDialog(true)}>New folder</Button>
        <input
          ref={uploadInput}
          type="file"
          hidden
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button size="sm" leadingIcon={<Icon name="upload" />} loading={Boolean(busy)} onClick={() => uploadInput.current?.click()}>Upload</Button>
      </div>
      {error ? <div style={{ color: "var(--danger-text)", font: "12px/17px var(--font-sans)", marginBottom: 10 }}>{error}</div> : null}
      <div className="ftable">
        {files.map((f, i) => (
          <div className="frow" key={f.name + i}>
            <span className="fn"><Icon name={f.dir ? "folder" : "file-text"} size={15} style={{ color: f.dir ? "var(--accent-text)" : "var(--text-tertiary)" }} />{f.name}{f.dir ? "/" : ""}</span>
            <span className="fs">{f.size}</span>
            <span className="fm">{f.mtime}</span>
            <div className="racts">
              <Button variant="ghost" size="icon-sm" aria-label={`Download ${f.name}`} title="Download" disabled={f.dir || Boolean(busy)} onClick={() => void download(f.name)}><Icon name="download" size={14} /></Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Delete ${f.name}`} title="Delete" disabled={Boolean(busy)} onClick={() => setDeleteTarget(f)}><Icon name="trash-2" size={14} /></Button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ font: "12px/17px var(--font-sans)", color: "var(--text-tertiary)", marginTop: 10 }}>
        Files go through the authenticated control-plane API (<span className="mono">/v1/sandboxes/{"{id}"}/files</span>) so the browser never receives a guest private key.
      </div>
      {folderDialog ? (
        <Modal
          title="Create folder"
          desc="Create a directory under /workspace."
          onClose={() => setFolderDialog(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setFolderDialog(false)}>Cancel</Button>
              <span className="spacer" />
              <Button loading={Boolean(busy)} onClick={() => void createDirectory()}>Create folder</Button>
            </>
          }
        >
          <Field label="Folder name" help="Nested names such as output/reports are supported.">
            <Input autoFocus value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="output" />
          </Field>
        </Modal>
      ) : null}
      {deleteTarget ? (
        <Modal
          title={`Delete ${deleteTarget.dir ? "folder" : "file"}`}
          desc={`Remove /workspace/${deleteTarget.name}${deleteTarget.dir ? " and everything inside it" : ""}.`}
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <span className="spacer" />
              <Button variant="danger" loading={Boolean(busy)} onClick={() => void remove()}>Delete permanently</Button>
            </>
          }
        >
          <div className="dangerp">
            <Icon name="triangle-alert" size={18} />
            <div><div className="t">This cannot be undone</div><div className="d mono">{deleteTarget.name}</div></div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function PortsTab({ sb }: { sb: Sandbox }) {
  const runMutation = useMutation();
  const localPreview = ["127.0.0.1", "localhost"].includes(window.location.hostname);
  const [port, setPort] = React.useState("3000");
  const [mode, setMode] = React.useState<PreviewMode>("public");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const expose = async () => {
    const p = parseInt(port, 10);
    if (!p || p > 65535 || sb.ports.some((x) => x.port === p)) return;
    setBusy(true);
    setError("");
    try {
      await runMutation((c) => c.exposePort(sb.id, p, mode));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {!sb.publicWeb ? (
        <div className="dangerp" style={{ marginBottom: 14 }}>
          <Icon name="lock" size={18} />
          <div style={{ flex: 1 }}>
            <div className="t">Public web access is disabled</div>
            <div className="d">Enable it before creating a customer preview URL. The control plane rejects port exposure while this policy is off.</div>
          </div>
          <Button
            size="sm"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await runMutation((client) => client.updateSandbox(sb.id, { publicWeb: true }));
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : String(reason));
              } finally {
                setBusy(false);
              }
            }}
          >
            Enable public URLs
          </Button>
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
        <div style={{ width: 110 }}><Input mono value={port} onChange={(e) => setPort(e.target.value.replace(/\D/g, ""))} aria-label="Port" placeholder="8080" /></div>
        <div style={{ width: 160 }}><Select options={["public", "organization", "signed-link"]} value={mode} onChange={(e) => setMode(e.target.value as PreviewMode)} /></div>
        <Button leadingIcon={<Icon name="globe" />} loading={busy} onClick={() => void expose()} disabled={sb.status !== "running" || !sb.publicWeb}>Expose port</Button>
      </div>
      {error ? <div className="help err" style={{ marginBottom: 12 }}>{error}</div> : null}
      {sb.ports.length === 0 ? (
        <EmptyState icon="globe" title="No ports exposed" desc={localPreview ? "Expose a port through the local control-plane proxy." : "Expose a port to get a public HTTPS preview URL routed through the regional gateway."} />
      ) : (
        <div className="ftable">
          {sb.ports.map((p) => (
            <div className="frow" key={p.port}>
              <span className="portno">{p.port}</span>
              <a className="urlbox" style={{ flex: 1 }} href={p.url} target="_blank" rel="noreferrer">
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{p.url}</span>
                <Icon name="external-link" size={13} />
              </a>
              <Badge tone={p.mode === "signed-link" ? "warning" : p.mode === "organization" ? "info" : "success"} size="sm">{p.mode || "public"}</Badge>
              <CopyButton text={p.url} />
              <Button variant="ghost" size="icon-sm" aria-label="Stop exposing" title="Stop exposing" onClick={() => void runMutation((c) => c.removePort(sb.id, p.port))}><Icon name="x" size={14} /></Button>
            </div>
          ))}
        </div>
      )}
      <div style={{ font: "12px/17px var(--font-sans)", color: "var(--text-tertiary)", marginTop: 10 }}>
        {localPreview ? "Local proxy transport: requests are forwarded into the sandbox without publishing a Docker host port." : <>Managed TLS gateway: https://preview.agentpop.cloud/preview/&lt;sandbox&gt;/&lt;port&gt;/</>}
      </div>
    </>
  );
}

function LogsTab({ sb }: { sb: Sandbox }) {
  const runMutation = useMutation();
  const [runLabel, setRunLabel] = React.useState("customer tests");
  const [runCommand, setRunCommand] = React.useState("if [ -f package.json ]; then npm test; elif [ -f pyproject.toml ] || [ -d tests ]; then python3 -m pytest; else echo 'No test runner detected'; fi");
  const [running, setRunning] = React.useState(false);
  const { data: logs = [], loading, error, reload } = useResource(
    (client) => client.getSandboxLogs(sb.id, 500),
    [sb.id],
  );
  React.useEffect(() => {
    if (sb.status !== "running") return;
    const timer = window.setInterval(reload, 3_000);
    return () => window.clearInterval(timer);
  }, [reload, sb.status]);
  const text = logs.map((entry) => `${entry.createdAt} [${entry.source}/${entry.stream}] ${entry.message}`).join("\n");
  const download = () => {
    const href = URL.createObjectURL(new Blob([text + (text ? "\n" : "")], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = `${sb.name}-logs.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 5_000);
  };
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span className="chip"><Icon name="scroll-text" size={12} />{logs.length} entries</span>
        <span className="help">Real control-plane events and runtime stdout/stderr · refreshes every 3 seconds</span>
        <span className="spacer" />
        <Button variant="secondary" size="sm" leadingIcon={<Icon name="refresh-cw" />} onClick={reload}>Refresh</Button>
        <CopyButton text={text} />
        <Button variant="secondary" size="sm" leadingIcon={<Icon name="download" />} onClick={download} disabled={!logs.length}>Download</Button>
      </div>
      <div className="panel" style={{ padding: 12, display: "grid", gridTemplateColumns: "180px 1fr auto", gap: 8 }}>
        <Input aria-label="Run label" value={runLabel} onChange={(event) => setRunLabel(event.target.value)} placeholder="customer tests" />
        <Input mono aria-label="Test command" value={runCommand} onChange={(event) => setRunCommand(event.target.value)} />
        <Button
          loading={running}
          disabled={sb.status !== "running" || !runCommand.trim()}
          leadingIcon={<Icon name="play" />}
          onClick={async () => {
            setRunning(true);
            try {
              await runMutation((client) => client.execSandbox(sb.id, runCommand, 600, runLabel));
              reload();
            } finally {
              setRunning(false);
            }
          }}
        >
          Run and capture
        </Button>
      </div>
      {error ? <div className="help err">{error.message}</div> : null}
      {loading && !logs.length ? <div className="help">Loading runtime logs…</div> : null}
      {!loading && !logs.length ? (
        <EmptyState icon="scroll-text" title="No runtime logs yet" desc="Run a command in Terminal. Actual stdout, stderr, exit status, and lifecycle events will appear here." />
      ) : null}
      {logs.length ? (
        <div
          aria-label="Sandbox runtime logs"
          style={{
            background: "#0d1117",
            border: "1px solid #263142",
            borderRadius: 10,
            color: "#d5deeb",
            font: "12px/19px var(--font-mono)",
            maxHeight: 520,
            overflow: "auto",
            padding: "12px 14px",
          }}
        >
          {logs.map((entry: SandboxLogEntry) => (
            <div key={entry.id} style={{ display: "grid", gridTemplateColumns: "168px 128px minmax(0, 1fr)", gap: 10 }}>
              <span style={{ color: "#718096" }}>{new Date(entry.createdAt).toLocaleString()}</span>
              <span style={{ color: entry.stream === "stderr" ? "#ff9292" : entry.stream === "stdout" ? "#7ee2a8" : "#8bb9fe" }}>
                {entry.source}/{entry.stream}
              </span>
              <span style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{entry.label ? <b>{entry.label}: </b> : null}{entry.message}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Spark({ label, value, data, max }: { label: string; value: string; data: number[]; max?: number }) {
  const m = max || Math.max(...data) * 1.25 || 1;
  const pts = data.map((v, i) => (i * (120 / (data.length - 1))).toFixed(1) + "," + (30 - (v / m) * 26 + 1).toFixed(1)).join(" ");
  return (
    <div className="panel" style={{ padding: "12px 14px" }}>
      <div style={{ font: "500 12px/16px var(--font-sans)", color: "var(--text-secondary)" }}>{label}</div>
      <div style={{ font: "600 17px/25px var(--font-sans)", fontVariantNumeric: "tabular-nums", margin: "2px 0 8px" }}>{value}</div>
      <svg viewBox="0 0 120 32" preserveAspectRatio="none" style={{ width: "100%", height: 34, display: "block" }} aria-hidden="true">
        <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function MetricsTab({ sb }: { sb: Sandbox }) {
  const { client } = useApi();
  const zeros = () => Array.from({ length: 40 }, () => 0);
  const [m, setM] = React.useState(() => ({ cpu: zeros(), mem: zeros(), disk: zeros(), net: zeros() }));
  const [totals, setTotals] = React.useState({ memory: 0, disk: 0, processes: 0 });
  const [error, setError] = React.useState("");
  const previousNetwork = React.useRef<{ bytes: number; at: number }>();
  React.useEffect(() => {
    if (sb.status !== "running") return;
    let active = true;
    const sample = async () => {
      try {
        const next = await client.getSandboxMetrics(sb.id);
        if (!active) return;
        const now = new Date(next.sampledAt).getTime();
        const networkBytes = next.networkRxBytes + next.networkTxBytes;
        const previous = previousNetwork.current;
        const networkKBps = previous && now > previous.at ? Math.max(0, (networkBytes - previous.bytes) / 1024 / ((now - previous.at) / 1000)) : 0;
        previousNetwork.current = { bytes: networkBytes, at: now };
        const push = (values: number[], value: number) => values.slice(1).concat(Number.isFinite(value) ? value : 0);
        setM((old) => ({
          cpu: push(old.cpu, next.cpuPercent),
          mem: push(old.mem, next.memoryUsedMb),
          disk: push(old.disk, next.diskUsedMb),
          net: push(old.net, networkKBps),
        }));
        setTotals({ memory: next.memoryTotalMb, disk: next.diskTotalMb, processes: next.processCount });
        setError("");
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      }
    };
    void sample();
    const timer = window.setInterval(() => void sample(), 2000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [client, sb.id, sb.status]);
  if (sb.status !== "running") return <EmptyState icon="activity" title="No live metrics" desc="Metrics stream from the host agent while the sandbox is running." />;
  const last = (a: number[]) => a[a.length - 1] ?? 0;
  return (
    <>
      {error ? <div className="help err" style={{ marginBottom: 10 }}>{error}</div> : null}
      <div className="statgrid" style={{ marginBottom: 12 }}>
        <Spark label="CPU" value={last(m.cpu).toFixed(1) + "%"} data={m.cpu} max={100} />
        <Spark label="Memory" value={Math.round(last(m.mem)) + " MiB / " + Math.round(totals.memory || 0) + " MiB"} data={m.mem} max={totals.memory || 1} />
        <Spark label="Disk used" value={last(m.disk).toFixed(1) + " MiB / " + Math.round(totals.disk || 0) + " MiB"} data={m.disk} max={totals.disk || 1} />
        <Spark label="Network" value={Math.round(last(m.net)) + " KB/s"} data={m.net} />
      </div>
      <div style={{ font: "12px/17px var(--font-sans)", color: "var(--text-tertiary)" }}>Live guest sample every 2 seconds · {totals.processes} processes · no generated chart data.</div>
    </>
  );
}

function SecretsTab({ sb }: { sb: Sandbox }) {
  const runMutation = useMutation();
  const { data, reload } = useResource((client) => client.listSandboxSecrets(sb.id), [sb.id]);
  const [name, setName] = React.useState("");
  const [value, setValue] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const validName = /^[A-Z_][A-Z0-9_]*$/.test(name);
  const save = async () => {
    if (!validName || !value) return;
    setBusy(true);
    setError("");
    try {
      await runMutation((client) => client.setSandboxSecrets(sb.id, { [name]: value }));
      setName("");
      setValue("");
      reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="panel" style={{ padding: 20, display: "grid", gap: 16 }}>
      <div>
        <div style={{ font: "600 16px/22px var(--font-sans)" }}>Runtime secrets</div>
        <div className="help">Add model keys after deployment. Values are encrypted, injected into the running computer, and never returned by the API.</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, .7fr) minmax(280px, 1.3fr) auto", gap: 8 }}>
        <Input mono placeholder="ANTHROPIC_API_KEY" value={name} onChange={(e) => setName(e.target.value.toUpperCase())} invalid={Boolean(name) && !validName} />
        <Input mono type="password" placeholder="secret value" value={value} onChange={(e) => setValue(e.target.value)} />
        <Button loading={busy} disabled={!validName || !value} onClick={() => void save()}>Save secret</Button>
      </div>
      {error ? <div className="help err">{error}</div> : null}
      <div className="ftable">
        {(data?.items ?? []).map((secret) => (
          <div className="frow" key={secret.name}>
            <span className="fn mono"><Icon name="key-round" size={14} />{secret.name}</span>
            <Badge tone="success" size="sm">configured</Badge>
            <span className="spacer" />
            <Button
              variant="danger-outline"
              size="sm"
              onClick={async () => {
                await runMutation((client) => client.deleteSandboxSecret(sb.id, secret.name));
                reload();
              }}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
      {!data?.items.length ? <EmptyState icon="key-round" title="No secrets configured" desc="The computer can still run. Add a provider key now or later." /> : null}
    </div>
  );
}

function EventsTab({ sb }: { sb: Sandbox }) {
  const { data: events = [], loading, error } = useResource((client) => client.listSandboxEvents(sb.id), [sb.id]);
  if (loading) return <div className="help">Loading resource events…</div>;
  if (error) return <div className="help err">{error.message}</div>;
  if (!events.length) return <EmptyState icon="scroll-text" title="No resource events" desc="Lifecycle, file, exec, and policy operations for this sandbox appear here." />;
  return (
    <div className="tl">
      {events.map((event) => (
        <div className={"tlrow " + (event.result === "ok" ? "ok" : "bad")} key={event.id}>
          <span className="dot" />
          <div className="tt">{event.action}<span className="tm">{new Date(event.createdAt).toLocaleString()}</span></div>
          <div className="td">Actor {event.actor} · result {event.result}{event.metadata ? " · " + JSON.stringify(event.metadata) : ""}</div>
        </div>
      ))}
    </div>
  );
}

function SSHAccessTab({ sb }: { sb: Sandbox }) {
  const { data: access, loading, error } = useResource((client) => client.getSandboxSSH(sb.id), [sb.id]);
  if (loading) return <div className="help">Loading SSH access…</div>;
  if (error) return <EmptyState icon="terminal" title="SSH unavailable" desc={error.message} />;
  if (!access) return null;
  const laptopReady = Boolean(access.hostCommand);
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="dangerp">
        <Icon name={laptopReady ? "shield-check" : "triangle-alert"} size={18} />
        <div>
          <div className="t">{laptopReady ? "Bastion command available" : "Host-local command only"}</div>
          <div className="d">
            {laptopReady
              ? "This command first connects to the configured data-plane gateway, then enters the microVM."
              : "The runtime returned a private guest address and a key path on the data-plane host. It will not work directly from a customer laptop. Use the browser terminal until an SSH bastion or customer public-key flow is configured."}
          </div>
        </div>
      </div>
      <div className="field">
        <label>SSH command</label>
        <div className="urlbox" style={{ minHeight: 42, padding: "8px 10px" }}>
          <code style={{ overflowWrap: "anywhere" }}>{access.command}</code>
          <span className="spacer" />
          <CopyButton text={access.command} />
        </div>
      </div>
      <div className="panelgrid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", marginBottom: 0 }}>
        <div className="panel"><div className="help">User</div><div className="mono">{access.user}</div></div>
        <div className="panel"><div className="help">Host</div><div className="mono">{access.host}</div></div>
        <div className="panel"><div className="help">Port</div><div className="mono">{access.port}</div></div>
      </div>
      <div className="help">
        AgentPop never returns private-key material through this API. A returned key path identifies a file owned by the data-plane host.
      </div>
    </div>
  );
}

function SbSettingsTab({ sb, onDestroy }: { sb: Sandbox; onDestroy: () => void }) {
  const { data: catalog } = useResource((c) => c.getCatalog(), []);
  const { data: networks = [] } = useResource((c) => c.listNetworks(), []);
  const { data: storages = [] } = useResource((c) => c.listStorages(), []);
  const runMutation = useMutation();
  const sizes = catalog?.sizes ?? [];
  const cur = sizes.find((s) => s.cpu + " · " + s.ram === sb.size);
  const [size, setSize] = React.useState("");
  const [idleSeconds, setIdleSeconds] = React.useState(sb.pauseWhenIdle ? sb.idleTimeoutSec ?? 900 : 0);
  const [ttlSeconds, setTtlSeconds] = React.useState(sb.ttlSeconds ?? 0);
  const [networkId, setNetworkId] = React.useState("");
  const [storageId, setStorageId] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  React.useEffect(() => {
    if (!size) setSize(cur ? cur.id : sizes[2]?.id ?? "");
  }, [cur, sizes, size]);
  React.useEffect(() => {
    setNetworkId(networks.find((network) => network.attachedSandboxIds?.includes(sb.id))?.id ?? "");
    setStorageId(storages.find((storage) => storage.attachedSandboxIds?.includes(sb.id))?.id ?? "");
  }, [networks, storages, sb.id]);
  const apply = async () => {
    const shape = sizes.find((x) => x.id === size);
    if (!shape) return;
    await runMutation((c) => c.updateSandbox(sb.id, {
      size: shape.cpu + " · " + shape.ram,
      pauseWhenIdle: idleSeconds > 0,
      idleTimeoutSec: idleSeconds,
      ttlSeconds,
    }));
    for (const network of networks) {
      const attached = network.attachedSandboxIds?.includes(sb.id) ?? false;
      if (attached && network.id !== networkId) await runMutation((c) => c.detachNetworkSandbox(network.id, sb.id));
      if (!attached && network.id === networkId) await runMutation((c) => c.attachNetworkSandbox(network.id, sb.id));
    }
    for (const storage of storages) {
      const attached = storage.attachedSandboxIds?.includes(sb.id) ?? false;
      if (attached && storage.id !== storageId) await runMutation((c) => c.detachStorage(storage.id, sb.id));
      if (!attached && storage.id === storageId) await runMutation((c) => c.attachStorage(storage.id, sb.id));
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };
  return (
    <div className="settwrap">
      <Field label="Shape" help="Docker applies cgroup limits in place. Firecracker reports when a stop/snapshot/restore is required.">
        <div className="sizegrid">
          {sizes.map((s) => (
            <div key={s.id} className={"sizecard" + (size === s.id ? " sel" : "")} onClick={() => setSize(s.id)} role="radio" aria-checked={size === s.id}>
              <div className="t">{s.id}</div>
              <div className="d"><span>{s.cpu}</span><span>{s.ram}</span></div>
            </div>
          ))}
        </div>
      </Field>
      <Field label="Idle policy">
        <Select value={String(idleSeconds)} onChange={(event) => setIdleSeconds(Number(event.target.value))}>
          <option value="0">no idle pause</option><option value="300">pause after 5 min</option><option value="900">pause after 15 min</option><option value="3600">pause after 1 h</option>
        </Select>
      </Field>
      <Field label="TTL" help="The sandbox is destroyed automatically when the TTL elapses.">
        <Select value={String(ttlSeconds)} onChange={(event) => setTtlSeconds(Number(event.target.value))}>
          <option value="0">none</option><option value="7200">2 h</option><option value="86400">24 h</option><option value="604800">7 days</option>
        </Select>
      </Field>
      <Field label="Private network" help="Persists network membership in the control plane; enforcement state is visible in the operator console.">
        <Select value={networkId} onChange={(event) => setNetworkId(event.target.value)}>
          <option value="">none</option>{networks.map((network) => <option key={network.id} value={network.id}>{network.name} ({network.cidr})</option>)}
        </Select>
      </Field>
      <Field label="Storage" help="Credentials remain encrypted in the control plane; this records the sandbox attachment.">
        <Select value={storageId} onChange={(event) => setStorageId(event.target.value)}>
          <option value="">none</option>{storages.map((storage) => <option key={storage.id} value={storage.id}>{storage.name} ({storage.bucket})</option>)}
        </Select>
      </Field>
      <Button size="sm" leadingIcon={saved ? <Icon name="check" /> : undefined} onClick={apply}>{saved ? "Configuration updated" : "Apply configuration"}</Button>
      <div className="dangerp" style={{ marginTop: 24 }}>
        <div style={{ flex: 1 }}>
          <div className="t">Destroy this sandbox</div>
          <div className="d">Stops the microVM and deletes its writable disk. Cannot be undone.</div>
        </div>
        <Button variant="danger" leadingIcon={<Icon name="trash-2" />} onClick={onDestroy}>Destroy</Button>
      </div>
    </div>
  );
}

const TABS: [string, string][] = [
  ["terminal", "Terminal"],
  ["logs", "Logs"],
  ["files", "Files"],
  ["ports", "Ports"],
  ["metrics", "Metrics"],
  ["ssh", "SSH access"],
  ["events", "Events"],
  ["secrets", "Secrets"],
  ["settings", "Settings"],
];

export function SandboxDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const runMutation = useMutation();
  const { version } = useApi();
  const { data: sb, loading } = useResource((c) => c.getSandbox(id), [id, version]);
  const [tab, setTab] = React.useState(params.get("tab") || "terminal");
  const [confirm, setConfirm] = React.useState(false);

  if (loading && !sb) return <PageHeader title="Loading…" />;
  if (!sb)
    return (
      <>
        <PageHeader title="Sandbox not found" />
        <EmptyState icon="box" title="This sandbox no longer exists" desc="It may have been destroyed or removed by a lifecycle policy.">
          <Button size="sm" variant="secondary" leadingIcon={<Icon name="arrow-left" />} onClick={() => navigate("/app/sandboxes")}>Back to sandboxes</Button>
        </EmptyState>
      </>
    );

  const busy = sb.status === "pausing" || sb.status === "resuming" || sb.status === "provisioning";

  return (
    <>
      <div className="crumb">
        <button className="linkbtn" onClick={() => navigate("/app/sandboxes")}>Sandboxes</button>
        <Icon name="chevron-right" size={13} />
        <span>{sb.name}</span>
      </div>
      <div className="dhead">
        <h1>{sb.name}</h1>
        <StatusBadge status={sb.status} />
        <span className="chip">{sb.id}<CopyButton text={sb.id} /></span>
        <CopyButton text={window.location.href} />
        <span className="spacer" />
        {sb.status === "paused" ? (
          <Button leadingIcon={<Icon name="play" />} onClick={() => void runMutation((c) => c.resumeSandbox(sb.id))}>Resume</Button>
        ) : (
          <Button variant="secondary" loading={sb.status === "pausing" || sb.status === "resuming"} disabled={busy || sb.status === "failed"} leadingIcon={<Icon name="pause" />} onClick={() => void runMutation((c) => c.pauseSandbox(sb.id))}>Pause</Button>
        )}
        <Button variant="secondary" disabled={busy || sb.status === "failed"} leadingIcon={<Icon name="git-fork" />} onClick={async () => { const nb = await runMutation((c) => c.forkSandbox(sb.id)); navigate(`/app/sandboxes/${nb.id}`); }}>Fork</Button>
        <Button variant="danger" leadingIcon={<Icon name="trash-2" />} onClick={() => setConfirm(true)}>Destroy</Button>
      </div>
      <div className="dmeta">
        <span className="chip"><Icon name="cpu" size={12} />{sb.size}</span>
        <span className="chip"><Icon name="hard-drive" size={12} />{sb.disk}</span>
        <span className="chip"><Icon name="layers" size={12} />{sb.template}</span>
        <span className="chip"><Icon name="map-pin" size={12} />{sb.region}</span>
        <span className="chip"><Icon name="network" size={12} />{sb.ip}</span>
        <span className="chip"><Icon name="git-commit-horizontal" size={12} />gen 3</span>
        <span className="chip"><Icon name="clock" size={12} />{sb.age}</span>
        <span className="chip"><Icon name="moon" size={12} />{sb.idle || "no idle pause"}</span>
        <span className="chip"><Icon name={sb.lifecycle === "ephemeral" ? "timer" : "database"} size={12} />{sb.lifecycle}</span>
      </div>
      <div className="tabs">
        {TABS.map(([k, l]) => (
          <button key={k} className={"tab" + (tab === k ? " active" : "")} onClick={() => setTab(k)}>
            {l}{k === "ports" && sb.ports.length ? " (" + sb.ports.length + ")" : ""}
          </button>
        ))}
      </div>
      {tab === "terminal" ? <Term sb={sb} /> : null}
      {tab === "logs" ? <LogsTab sb={sb} /> : null}
      {tab === "files" ? (sb.status === "running" ? <FilesTab sb={sb} /> : <EmptyState icon="files" title="Files unavailable" desc="The file API is reachable while the sandbox is running." />) : null}
      {tab === "ports" ? <PortsTab sb={sb} /> : null}
      {tab === "metrics" ? <MetricsTab sb={sb} /> : null}
      {tab === "ssh" ? <SSHAccessTab sb={sb} /> : null}
      {tab === "events" ? <EventsTab sb={sb} /> : null}
      {tab === "secrets" ? <SecretsTab sb={sb} /> : null}
      {tab === "settings" ? <SbSettingsTab sb={sb} onDestroy={() => setConfirm(true)} /> : null}
      {confirm ? (
        <Modal
          title="Destroy sandbox"
          desc="This stops the microVM and deletes its disk. This cannot be undone."
          onClose={() => setConfirm(false)}
          footer={
            <>
              <span className="est mono">{sb.id.slice(0, 18)}…</span>
              <span className="spacer" />
              <Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button>
              <Button variant="danger" leadingIcon={<Icon name="trash-2" />} onClick={async () => { await runMutation((c) => c.destroySandbox(sb.id)); navigate("/app/sandboxes"); }}>Destroy sandbox</Button>
            </>
          }
        >
          <div style={{ font: "13px/19px var(--font-sans)", color: "var(--text-secondary)" }}>
            Anything running inside <b style={{ color: "var(--text-primary)" }}>{sb.name}</b> is terminated immediately. Attached storage registrations are kept; the writable disk is not.
          </div>
        </Modal>
      ) : null}
    </>
  );
}
