import { Badge, Button, StatusBadge } from "@agentpop/ui";
import { Icon } from "../../components/icon";
import { EmptyState, Meter, PageHeader } from "../../components/primitives";
import { useApi, useResource } from "../../api/provider";
import type { ControlPlaneService, DataPlaneHost, ServiceHealth } from "../../api/types";

const healthStatus = (h: ServiceHealth) => (h === "healthy" ? "healthy" : h === "degraded" ? "degraded" : "error");

function ServiceRow({ s }: { s: ControlPlaneService }) {
  return (
    <div className="svc">
      <span className="ricon" style={{ width: 30, height: 30 }}><Icon name="server" size={15} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="sn">{s.name}</span>
          <Badge tone="outline" size="sm"><span className="mono">{s.mode}</span></Badge>
        </div>
        <div className="sd">{s.detail}</div>
        <div className="sm">
          {s.instances} instance{s.instances === 1 ? "" : "s"}
          {s.latencyMs != null ? ` · p50 ${s.latencyMs} ms` : ""}
        </div>
      </div>
      <StatusBadge status={healthStatus(s.health)} size="sm" />
    </div>
  );
}

function HostRow({ h }: { h: DataPlaneHost }) {
  const vcpuPct = Math.round((h.vcpuUsed / h.vcpuTotal) * 100);
  const memPct = Math.round((h.memUsedGiB / h.memTotalGiB) * 100);
  const sbPct = Math.round((h.sandboxes / h.sandboxCap) * 100);
  return (
    <div className="rrow">
      <div className="rrow-main" style={{ alignItems: "flex-start" }}>
        <span className="ricon"><Icon name="cpu" size={17} /></span>
        <div className="rcol" style={{ minWidth: 190 }}>
          <div className="rname" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {h.id}
            {h.draining ? <Badge tone="warning" size="sm">draining</Badge> : null}
          </div>
          <div className="rmeta"><span>{h.instance}</span><span>{h.az}</span><span>heartbeat {h.heartbeat}</span></div>
        </div>
        <div className="hostmeters">
          <Meter label="vCPU" value={`${h.vcpuUsed} / ${h.vcpuTotal}`} pct={vcpuPct} warn={vcpuPct > 80} />
          <Meter label="Memory GiB" value={`${h.memUsedGiB} / ${h.memTotalGiB}`} pct={memPct} warn={memPct > 80} />
          <Meter label="Sandboxes" value={`${h.sandboxes} / ${h.sandboxCap}`} pct={sbPct} warn={sbPct > 80} />
        </div>
        <StatusBadge status={healthStatus(h.health)} size="sm" />
      </div>
    </div>
  );
}

export function Health() {
  useApi();
  const { data: health, loading } = useResource((c) => c.getPlatformHealth(), []);

  if (loading && !health) return <PageHeader title="Platform health" desc="Loading…" />;
  if (!health)
    return (
      <>
        <PageHeader title="Platform health" />
        <EmptyState icon="activity" title="Health data unavailable" desc="The platform health endpoint could not be reached." />
      </>
    );

  const cap = health.capacity;
  const stats = [
    { l: "Active sandboxes", icon: "box", v: `${cap.activeSandboxes}`, d: `of ${cap.sandboxCap} schedulable cap` },
    { l: "Hosts up", icon: "server", v: `${cap.hostsUp} / ${cap.hostsTotal}`, d: `region ${cap.region}` },
    { l: "Create p95", icon: "zap", v: `${(cap.createP95Ms / 1000).toFixed(2)} s`, d: "cached create-to-ready" },
    { l: "API availability", icon: "activity", v: `${cap.apiAvailability.toFixed(2)}%`, d: "control-plane, trailing 30 d" },
  ];

  return (
    <>
      <PageHeader title="Platform health" desc="Control-plane services and data-plane host capacity for this region.">
        <Badge tone="success" size="sm" icon={<Icon name="cloud" size={12} />}>
          live API
        </Badge>
      </PageHeader>

      <div className="caprow">
        {stats.map((s) => (
          <div key={s.l} className="statcard" style={{ cursor: "default" }}>
            <span className="sl"><Icon name={s.icon} size={14} />{s.l}</span>
            <div className="sv">{s.v}</div>
            <div className="sd">{s.d}</div>
          </div>
        ))}
      </div>

      <div className="section-h">Control plane</div>
      <div className="svcgrid">
        {health.controlPlane.map((s) => <ServiceRow key={s.name} s={s} />)}
      </div>

      <div className="section-h">
        Data plane · exec first byte p95 {cap.execFirstByteP95Ms} ms
      </div>
      <div className="hostgrid">
        {health.dataPlane.map((h) => <HostRow key={h.id} h={h} />)}
      </div>
      <div style={{ font: "12px/17px var(--font-sans)", color: "var(--text-tertiary)", marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <Icon name="info" size={13} />
        Host agents report capacity and health over mTLS. Density caps start at 40 active 1-GiB sandboxes per host and are lowered by I/O and CPU benchmarks — never sold as guaranteed overcommit.
        <span className="spacer" />
        <Button size="sm" variant="secondary" leadingIcon={<Icon name="refresh-cw" />} onClick={() => location.reload()}>Refresh</Button>
      </div>
    </>
  );
}
