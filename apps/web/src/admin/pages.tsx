import * as React from "react";
import { Badge, Button } from "@agentpop/ui";
import { Icon } from "../components/icon";
import {
  adminRequest,
  type AdminAuditEvent,
  type AdminHost,
  type AdminOverview,
  type ControlPlaneDetail,
  type ReconcileReport,
  type RuntimeSandbox,
  type SafeConfig,
} from "./api";
import { useAdminSession } from "./session";

function useAdminResource<T>(path: string, interval = 0) {
  const { token } = useAdminSession();
  const [data, setData] = React.useState<T>();
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [version, setVersion] = React.useState(0);
  const reload = React.useCallback(() => setVersion((value) => value + 1), []);

  React.useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    adminRequest<T>(token, path)
      .then((next) => {
        if (!active) return;
        setData(next);
        setError("");
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, path, version]);

  React.useEffect(() => {
    if (!interval) return;
    const timer = window.setInterval(reload, interval);
    return () => window.clearInterval(timer);
  }, [interval, reload]);

  return { data, error, loading, reload };
}

function AdminHeader({ title, desc, children }: { title: string; desc: string; children?: React.ReactNode }) {
  return (
    <header className="admin-page-header">
      <div><h1>{title}</h1><p>{desc}</p></div>
      <span className="spacer" />
      {children}
    </header>
  );
}

function LoadState({ loading, error }: { loading: boolean; error: string }) {
  if (error) return <div className="admin-callout error"><Icon name="circle-alert" /> {error}</div>;
  if (loading) return <div className="admin-callout"><Icon name="loader-circle" /> Reading private API…</div>;
  return null;
}

function StatusBadge({ healthy, label }: { healthy: boolean; label?: string }) {
  return <Badge tone={healthy ? "success" : "danger"} size="sm">{label ?? (healthy ? "Healthy" : "Error")}</Badge>;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d`;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "—";
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

function date(value?: string) {
  return value ? new Date(value).toLocaleString() : "Never";
}

export function AdminOverviewPage() {
  const resource = useAdminResource<AdminOverview>("/private/v1/overview", 5000);
  const value = resource.data;
  return (
    <>
      <AdminHeader title="Operations overview" desc="Desired state, runtime state, and host health from the private API.">
        <Button variant="secondary" size="sm" leadingIcon={<Icon name="refresh-cw" />} onClick={resource.reload}>Refresh</Button>
      </AdminHeader>
      <LoadState loading={resource.loading} error={resource.error} />
      {value ? (
        <>
          <div className="admin-stat-grid">
            <article><span>Desired sandboxes</span><strong>{value.desiredSandboxes}</strong><small>{value.statuses.running ?? 0} running</small></article>
            <article><span>Runtime sandboxes</span><strong>{value.runtimeSandboxes}</strong><small>{value.desiredSandboxes === value.runtimeSandboxes ? "Desired and observed match" : "Reconciliation required"}</small></article>
            <article><span>Cloud agents</span><strong>{value.agents}</strong><small>Bound to isolated runtimes</small></article>
            <article><span>Control-plane uptime</span><strong>{formatDuration(value.uptimeSeconds)}</strong><small>v{value.version} · {value.mode}</small></article>
          </div>
          <div className="admin-stat-grid admin-resource-grid">
            <article><span>Private networks</span><strong>{value.resources.networks}</strong><small>Topology records</small></article>
            <article><span>Storage registrations</span><strong>{value.resources.storages}</strong><small>Encrypted credentials</small></article>
            <article><span>Signed webhooks</span><strong>{value.resources.webhooks}</strong><small>Lifecycle delivery</small></article>
            <article><span>Connector grants</span><strong>{value.resources.connectorConnections}</strong><small>{value.resources.apiKeys} API keys · {value.resources.quotaRequests} quota requests</small></article>
          </div>
          <div className="admin-two-col">
            <section className="admin-panel">
              <div className="admin-panel-title"><h2>Data-plane host</h2><StatusBadge healthy={Boolean(value.host?.healthy)} /></div>
              <dl className="admin-kv">
                <div><dt>Host</dt><dd>{value.host?.name ?? "Unavailable"}</dd></div>
                <div><dt>Driver</dt><dd className="mono">{value.host?.driver ?? "—"}</dd></div>
                <div><dt>Region</dt><dd>{value.host?.region ?? "—"}</dd></div>
                <div><dt>Scheduling</dt><dd><Badge tone={value.draining ? "warning" : "success"} size="sm">{value.draining ? "Draining" : "Accepting work"}</Badge></dd></div>
                <div><dt>Last reconcile</dt><dd>{date(value.lastReconcile)}</dd></div>
              </dl>
            </section>
            <section className="admin-panel">
              <div className="admin-panel-title"><h2>Allocated resources</h2><span className="admin-panel-note">Desired state</span></div>
              <div className="admin-resource-pair">
                <div><span>vCPU</span><strong>{value.allocated.vcpu}</strong></div>
                <div><span>Memory</span><strong>{(value.allocated.memoryMb / 1024).toFixed(1)} GiB</strong></div>
              </div>
              <div className="admin-inline-status"><span className={value.runtimeError ? "bad" : ""} /> Runtime registry {value.runtimeError || "reachable"}</div>
              <div className="admin-inline-status"><span className={value.hostError ? "bad" : ""} /> Host heartbeat {value.hostError || "current"}</div>
            </section>
          </div>
        </>
      ) : null}
    </>
  );
}

export function AdminControlPlanePage() {
  const resource = useAdminResource<ControlPlaneDetail>("/private/v1/control-plane", 5000);
  const value = resource.data;
  return (
    <>
      <AdminHeader title="Control plane" desc="Process health, desired-state services, and internal dependencies.">
        {value ? <StatusBadge healthy={value.healthy} /> : null}
      </AdminHeader>
      <LoadState loading={resource.loading} error={resource.error} />
      {value ? (
        <>
          <div className="admin-process-strip">
            <div><span>PID</span><b>{value.process.pid}</b></div>
            <div><span>Go runtime</span><b>{value.process.goVersion}</b></div>
            <div><span>Goroutines</span><b>{value.process.goroutines}</b></div>
            <div><span>Heap</span><b>{formatBytes(value.process.heapBytes)}</b></div>
            <div><span>System memory</span><b>{formatBytes(value.process.sysBytes)}</b></div>
          </div>
          <section className="admin-panel">
            <div className="admin-panel-title"><h2>Components</h2><span className="admin-panel-note">Started {date(value.startedAt)}</span></div>
            <div className="admin-table">
              <div className="admin-table-head"><span>Component</span><span>Health</span><span>Detail</span></div>
              {value.components.map((component) => (
                <div className="admin-table-row" key={component.name}>
                  <span className="admin-cell-primary">{component.name}</span>
                  <span><StatusBadge healthy={component.health === "healthy"} label={component.health} /></span>
                  <span className="mono admin-cell-muted">{component.detail}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}

export function AdminDataPlanePage() {
  const { token } = useAdminSession();
  const resource = useAdminResource<{ items: AdminHost[] }>("/private/v1/data-plane/hosts", 5000);
  const [busy, setBusy] = React.useState("");
  const [report, setReport] = React.useState<ReconcileReport>();
  const [actionError, setActionError] = React.useState("");
  const host = resource.data?.items[0];

  const drain = async () => {
    if (!token || !host) return;
    setBusy("drain");
    setActionError("");
    try {
      await adminRequest(token, `/private/v1/data-plane/hosts/${encodeURIComponent(host.id)}/drain`, {
        method: "POST", body: JSON.stringify({ draining: !host.draining }),
      });
      resource.reload();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy("");
    }
  };

  const reconcile = async () => {
    if (!token) return;
    setBusy("reconcile");
    setActionError("");
    try {
      setReport(await adminRequest<ReconcileReport>(token, "/private/v1/reconcile", { method: "POST" }));
      resource.reload();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <AdminHeader title="Data plane" desc="Authenticated host agents, Firecracker capability, capacity, and scheduling controls.">
        <Button variant="secondary" size="sm" loading={busy === "reconcile"} leadingIcon={<Icon name="refresh-cw" />} onClick={() => void reconcile()}>Reconcile now</Button>
      </AdminHeader>
      <LoadState loading={resource.loading} error={resource.error || actionError} />
      {report ? (
        <div className={"admin-callout " + (report.result === "ok" ? "success" : "warning")}>
          <Icon name={report.result === "ok" ? "circle-check" : "triangle-alert"} />
          Reconcile {report.result}: {report.repaired} state records repaired, {report.recoveredRuntime.length} microVMs recovered, {report.missingRuntime.length} missing, {report.orphanedRuntime.length} orphaned, {Object.keys(report.recoveryFailed).length} recovery failures.
        </div>
      ) : null}
      {host ? (
        <section className="admin-host-card">
          <div className="admin-host-head">
            <div className="admin-host-icon"><Icon name={host.driver === "firecracker" ? "flame" : "container"} size={20} /></div>
            <div><h2>{host.name}</h2><p className="mono">{host.id} · {host.region}</p></div>
            <span className="spacer" />
            <StatusBadge healthy={host.healthy} />
            <Badge tone={host.draining ? "warning" : "success"} size="sm">{host.draining ? "Draining" : "Scheduling"}</Badge>
          </div>
          <div className="admin-host-facts">
            <div><span>Runtime</span><b>{host.driver}</b></div>
            <div><span>Architecture</span><b>{host.architecture}</b></div>
            <div><span>KVM</span><b>{host.kvmAvailable ? "Available" : "Unavailable"}</b></div>
            <div><span>Firecracker</span><b>{host.firecrackerVersion || (host.driver === "firecracker" ? "Detected" : "Not active")}</b></div>
            <div><span>Runtime VMs</span><b>{host.runtimeSandboxes}</b></div>
            <div><span>Last heartbeat</span><b>{date(host.updatedAt)}</b></div>
          </div>
          <div className="admin-capacity">
            <Capacity label="vCPU" used={host.capacity.allocatedVcpu} total={host.capacity.cpuCores} />
            <Capacity label="Memory" used={host.capacity.allocatedMemoryMb} total={host.capacity.memoryMb} unit=" MiB" />
            <Capacity label="Disk" used={0} total={host.capacity.diskGb} unit=" GiB" />
          </div>
          <div className="admin-host-actions">
            <div><b>{host.draining ? "Host is drained" : "Host accepts new workloads"}</b><p>Existing sandboxes continue running. Drain blocks new scheduling on this host.</p></div>
            <Button variant={host.draining ? "secondary" : "danger-outline"} loading={busy === "drain"} onClick={() => void drain()}>
              {host.draining ? "Enable scheduling" : "Drain host"}
            </Button>
          </div>
        </section>
      ) : null}
    </>
  );
}

function Capacity({ label, used, total, unit = "" }: { label: string; used: number; total: number; unit?: string }) {
  const pct = total ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div className="admin-capacity-item">
      <div><span>{label}</span><b>{used}{unit} / {total}{unit}</b></div>
      <div className="admin-capacity-bar"><span style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function AdminSandboxesPage() {
  const resource = useAdminResource<{ items: RuntimeSandbox[] }>("/private/v1/data-plane/sandboxes", 4000);
  const items = resource.data?.items ?? [];
  return (
    <>
      <AdminHeader title="Runtime inventory" desc="Observed sandboxes reported directly by the authenticated data-plane host agent.">
        <Badge tone="outline" size="sm">{items.length} runtime objects</Badge>
      </AdminHeader>
      <LoadState loading={resource.loading} error={resource.error} />
      <section className="admin-panel">
        {items.length ? (
          <div className="admin-table runtime">
            <div className="admin-table-head"><span>Sandbox</span><span>Driver</span><span>Status</span><span>Resources</span><span>Private IP</span><span>Started</span></div>
            {items.map((item) => (
              <div className="admin-table-row" key={item.id}>
                <span><b>{item.runtimeName}</b><small className="mono">{item.id}</small></span>
                <span className="mono">{item.driver}</span>
                <span><StatusBadge healthy={item.status === "running" || item.status === "paused"} label={item.status} /></span>
                <span className="mono">{item.vcpu ?? "—"} vCPU · {item.memoryMb ?? "—"} MiB</span>
                <span className="mono">{item.privateIp || "—"}</span>
                <span>{date(item.startedAt)}</span>
              </div>
            ))}
          </div>
        ) : <div className="admin-empty"><Icon name="boxes" size={24} /><b>No runtime sandboxes</b><p>The host registry is reachable and currently empty.</p></div>}
      </section>
    </>
  );
}

export function AdminAuditPage() {
  const resource = useAdminResource<{ items: AdminAuditEvent[] }>("/private/v1/audit", 5000);
  const items = resource.data?.items ?? [];
  return (
    <>
      <AdminHeader title="Audit & operations" desc="Owner actions and customer resource mutations from the append-only local audit ledger.">
        <Button variant="secondary" size="sm" leadingIcon={<Icon name="refresh-cw" />} onClick={resource.reload}>Refresh</Button>
      </AdminHeader>
      <LoadState loading={resource.loading} error={resource.error} />
      <section className="admin-panel">
        {items.length ? (
          <div className="admin-table audit">
            <div className="admin-table-head"><span>Operation</span><span>Actor</span><span>Resource</span><span>Result</span><span>Time</span></div>
            {items.map((item) => (
              <div className="admin-table-row" key={item.id}>
                <span><b>{item.action}</b><small className="mono">{item.id}</small></span>
                <span className="mono">{item.actor}</span>
                <span className="mono">{item.resourceId || item.resource}</span>
                <span><StatusBadge healthy={item.result === "ok"} label={item.result} /></span>
                <span>{date(item.createdAt)}</span>
              </div>
            ))}
          </div>
        ) : <div className="admin-empty"><Icon name="scroll-text" size={24} /><b>No operations yet</b></div>}
      </section>
    </>
  );
}

export function AdminSettingsPage() {
  const resource = useAdminResource<SafeConfig>("/private/v1/config");
  const value = resource.data;
  return (
    <>
      <AdminHeader title="Private API configuration" desc="Non-secret runtime configuration. Secret values are never returned by this API." />
      <LoadState loading={resource.loading} error={resource.error} />
      {value ? (
        <div className="admin-two-col">
          <section className="admin-panel">
            <div className="admin-panel-title"><h2>Trust boundaries</h2><StatusBadge healthy={!value.secretValuesExposed} label="Secrets redacted" /></div>
            <dl className="admin-kv">
              <div><dt>Owner</dt><dd>{value.ownerEmail}</dd></div>
              <div><dt>Session TTL</dt><dd>{value.ownerSessionTtlHours} hours</dd></div>
              <div><dt>Private prefix</dt><dd className="mono">{value.privateApiPrefix}</dd></div>
              <div><dt>Host-agent auth</dt><dd><StatusBadge healthy={value.hostAgentAuthentication} label={value.hostAgentAuthentication ? "Enabled" : "Disabled in local mode"} /></dd></div>
              <div><dt>Customer API auth</dt><dd><StatusBadge healthy={value.customerApiAuthentication} label={value.customerApiAuthentication ? "Enabled" : "Disabled in local mode"} /></dd></div>
            </dl>
          </section>
          <section className="admin-panel">
            <div className="admin-panel-title"><h2>Internal endpoints</h2><Badge tone="warning" size="sm">Owner only</Badge></div>
            <dl className="admin-kv">
              <div><dt>Mode</dt><dd>{value.mode}</dd></div>
              <div><dt>API version</dt><dd>{value.apiVersion}</dd></div>
              <div><dt>State store</dt><dd className="mono">{value.stateStore}</dd></div>
              <div><dt>Host agent</dt><dd className="mono">{value.hostAgentEndpoint}</dd></div>
            </dl>
          </section>
        </div>
      ) : null}
      <div className="admin-callout warning"><Icon name="shield-alert" /> Hosted mode refuses to boot without explicit owner credentials, a session signing secret, and a protected host-agent token.</div>
    </>
  );
}
