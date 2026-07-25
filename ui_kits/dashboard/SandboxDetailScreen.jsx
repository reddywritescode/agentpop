const { Button, Icon, Input, StatusBadge, Badge } = window.AgentPopDesignSystem_47afa4;

function Term({ sb }) {
  const [hist, setHist] = React.useState([{ out: "Connected to " + sb.name + " · guest agent over vsock · type `help`" }]);
  const [val, setVal] = React.useState("");
  const box = React.useRef(null); const inp = React.useRef(null);
  React.useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; });
  const run = (cmd) => {
    const c = cmd.trim();
    if (c === "clear") { setHist([]); return; }
    let out = null;
    if (c === "") out = null;
    else if (c === "help") out = "Available: ls, pwd, whoami, uname -a, cat <file>, echo <text>, node -v, python3 --version, top, clear";
    else if (c === "ls") out = "agent.js  node_modules  package.json  package-lock.json  workdir";
    else if (c === "pwd") out = "/home/user";
    else if (c === "whoami") out = "user";
    else if (c === "uname -a") out = "Linux " + sb.name + " 6.1.102-agentpop #1 SMP x86_64 GNU/Linux";
    else if (c === "node -v") out = "v22.11.0";
    else if (c === "python3 --version") out = "Python 3.12.4";
    else if (c === "top") out = "CPU 4.2%  MEM 512 MiB / 2 GiB  tasks 24  load 0.08 0.11 0.06";
    else if (c.indexOf("echo ") === 0) out = c.slice(5);
    else if (c.indexOf("cat ") === 0) out = c === "cat package.json" ? '{ "name": "' + sb.name + '", "private": true }' : "cat: " + c.slice(4) + ": No such file or directory";
    else out = "bash: " + c.split(" ")[0] + ": command not found";
    setHist((h) => h.concat([{ cmd: c }], out !== null ? [{ out }] : []));
  };
  if (sb.status !== "running") return (
    <div className="term" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "#8f8b83" }}>
        {sb.status === "paused" ? "Sandbox is paused — resume to attach a shell." : sb.status === "failed" ? "Sandbox failed — no shell available. See Events." : "Shell attaches once the sandbox is running…"}
        {sb.status === "paused" ? <div style={{ marginTop: 14 }}><Button size="sm" leadingIcon={<Icon name="play" />} onClick={() => ASXActions.resume(sb.id)}>Resume sandbox</Button></div> : null}
      </div>
    </div>
  );
  return (
    <React.Fragment>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <span className="chip"><Icon name="cable" size={12} />wss …/v1/sandboxes/{sb.id.slice(0, 11)}/shell</span>
        <span className="chip">first byte 212 ms</span>
        <span className="spacer"></span>
        <Button variant="ghost" size="sm" leadingIcon={<Icon name="eraser" />} onClick={() => setHist([])}>Clear</Button>
      </div>
      <div className="term as-scroll" ref={box} onClick={() => inp.current && inp.current.focus()}>
        {hist.map((l, i) => l.cmd !== undefined
          ? <div key={i}><span className="p">user@{sb.name}</span>:<span className="path">~</span>$ {l.cmd}</div>
          : <div key={i} style={{ whiteSpace: "pre-wrap" }}>{l.out}</div>)}
        <div className="in"><span className="p">user@{sb.name}</span>:<span className="path">~</span>$&nbsp;
          <input ref={inp} value={val} autoFocus spellCheck={false} aria-label="Terminal input" onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { run(val); setVal(""); } }} />
        </div>
      </div>
    </React.Fragment>
  );
}

function FilesTab({ sb }) {
  const [files, setFiles] = React.useState(window.AGENTPOP_DESIGN.files);
  const up = () => setFiles((f) => [{ name: "upload-" + (f.length - 5) + ".bin", size: "1.4 MB", mtime: "just now" }].concat(f));
  return (
    <React.Fragment>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <span className="chip"><Icon name="folder" size={12} />/home/user</span>
        <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)" }}>{files.length} entries</span>
        <span className="spacer"></span>
        <Button variant="secondary" size="sm" leadingIcon={<Icon name="folder-plus" />} onClick={() => setFiles((f) => [{ name: "new-folder", dir: true, size: "—", mtime: "just now" }].concat(f))}>New folder</Button>
        <Button size="sm" leadingIcon={<Icon name="upload" />} onClick={up}>Upload</Button>
      </div>
      <div className="ftable">
        {files.map((f, i) => (
          <div className="frow" key={f.name + i}>
            <span className="fn"><Icon name={f.dir ? "folder" : "file-text"} size={15} style={{ color: f.dir ? "var(--accent-text)" : "var(--text-tertiary)" }} />{f.name}{f.dir ? "/" : ""}</span>
            <span className="fs">{f.size}</span>
            <span className="fm">{f.mtime}</span>
            <div className="racts">
              <Button variant="ghost" size="icon-sm" aria-label="Download" title="Download"><Icon name="download" size={14} /></Button>
              <Button variant="ghost" size="icon-sm" aria-label="Delete" title="Delete" onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}><Icon name="trash-2" size={14} /></Button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ font: "12px/17px var(--font-sans)", color: "var(--text-tertiary)", marginTop: 10 }}>Files go through the guest agent (`/v1/sandboxes/{"{id}"}/files`) — no SSH daemon inside the VM.</div>
    </React.Fragment>
  );
}

function PortsTab({ sb }) {
  const [port, setPort] = React.useState("3000");
  const [mode, setMode] = React.useState("public");
  const expose = () => {
    const p = parseInt(port, 10);
    if (!p || sb.ports.some((x) => x.port === p)) return;
    ASXActions.setSb(sb.id, { ports: sb.ports.concat({ port: p, mode, url: "https://" + sb.id.slice(0, 11) + "-" + p + ".preview.agentpop.cloud" }) });
  };
  return (
    <React.Fragment>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
        <div style={{ width: 110 }}><Input mono value={port} onChange={(e) => setPort(e.target.value.replace(/\D/g, ""))} aria-label="Port" placeholder="8080" /></div>
        <div style={{ width: 160 }}><Select options={["public", "organization", "signed-link"]} value={mode} onChange={(e) => setMode(e.target.value)} /></div>
        <Button leadingIcon={<Icon name="globe" />} onClick={expose} disabled={sb.status !== "running"}>Expose port</Button>
      </div>
      {sb.ports.length === 0 ? (
        <EmptyState icon="globe" title="No ports exposed" desc="Expose a port to get a public HTTPS preview URL routed through the regional gateway." />
      ) : (
        <div className="ftable">
          {sb.ports.map((p) => (
            <div className="frow" key={p.port}>
              <span className="portno">{p.port}</span>
              <span className="urlbox" style={{ flex: 1 }}><span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{p.url}</span></span>
              <Badge tone={p.mode === "signed-link" ? "warning" : p.mode === "organization" ? "info" : "success"} size="sm">{p.mode || "public"}</Badge>
              <CopyBtn text={p.url} />
              <Button variant="ghost" size="icon-sm" aria-label="Stop exposing" title="Stop exposing" onClick={() => ASXActions.setSb(sb.id, { ports: sb.ports.filter((x) => x.port !== p.port) })}><Icon name="x" size={14} /></Button>
            </div>
          ))}
        </div>
      )}
      <div style={{ font: "12px/17px var(--font-sans)", color: "var(--text-tertiary)", marginTop: 10 }}>Wildcard DNS + TLS: https://&lt;sandbox&gt;-&lt;port&gt;.preview.agentpop.cloud</div>
    </React.Fragment>
  );
}

function Spark({ label, value, data, max }) {
  const m = max || Math.max.apply(null, data) * 1.25 || 1;
  const pts = data.map((v, i) => (i * (120 / (data.length - 1))).toFixed(1) + "," + (30 - (v / m) * 26 + 1).toFixed(1)).join(" ");
  return (
    <div className="panel" style={{ padding: "12px 14px" }}>
      <div style={{ font: "500 12px/16px var(--font-sans)", color: "var(--text-secondary)" }}>{label}</div>
      <div style={{ font: "600 17px/25px var(--font-sans)", fontVariantNumeric: "tabular-nums", margin: "2px 0 8px" }}>{value}</div>
      <svg viewBox="0 0 120 32" preserveAspectRatio="none" style={{ width: "100%", height: 34, display: "block" }} aria-hidden="true">
        <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke"></polyline>
      </svg>
    </div>
  );
}

function MetricsTab({ sb }) {
  const gen = (base, j) => Array.from({ length: 40 }, () => Math.max(0.1, base + (Math.random() - 0.5) * j));
  const [m, setM] = React.useState(() => ({ cpu: gen(4.5, 4), mem: gen(512, 60), io: gen(2.8, 2.5), net: gen(420, 380) }));
  React.useEffect(() => {
    if (sb.status !== "running") return;
    const t = setInterval(() => setM((old) => {
      const push = (a, base, j) => a.slice(1).concat(Math.max(0.1, base + (Math.random() - 0.5) * j));
      return { cpu: push(old.cpu, 4.5, 4), mem: push(old.mem, 512, 60), io: push(old.io, 2.8, 2.5), net: push(old.net, 420, 380) };
    }), 1200);
    return () => clearInterval(t);
  }, [sb.status]);
  if (sb.status !== "running") return <EmptyState icon="activity" title="No live metrics" desc="Metrics stream from the host agent while the sandbox is running." />;
  const last = (a) => a[a.length - 1];
  return (
    <React.Fragment>
      <div className="statgrid" style={{ marginBottom: 12 }}>
        <Spark label="CPU" value={last(m.cpu).toFixed(1) + "%"} data={m.cpu} max={20} />
        <Spark label="Memory" value={Math.round(last(m.mem)) + " MiB / 2 GiB"} data={m.mem} max={2048} />
        <Spark label="Disk I/O" value={last(m.io).toFixed(1) + " MB/s"} data={m.io} />
        <Spark label="Network" value={Math.round(last(m.net)) + " KB/s"} data={m.net} />
      </div>
      <div style={{ font: "12px/17px var(--font-sans)", color: "var(--text-tertiary)" }}>Sampled every second by the host agent · billed as vCPU-seconds and GiB-seconds of active memory.</div>
    </React.Fragment>
  );
}

function EventsTab({ sb }) {
  const boot = [
    { cls: "ok", t: "sandbox.created", tm: "t+0.00 s", d: "API accepted the request · Idempotency-Key 9f2c-… · desired state persisted" },
    { cls: "ok", t: "provisioning", tm: "t+0.42 s", d: "Scheduler placed generation 1 on host ip-10-2-4-11 (us-east-1a) over mTLS" },
  ];
  const rows = sb.status === "failed"
    ? boot.concat({ cls: "bad", t: "sandbox.failed", tm: "t+9.81 s", d: "microVM exited during boot · exit code 137 · 3 retries exhausted — see audit log" })
    : boot.concat(
      { cls: "ok", t: "sandbox.running", tm: "t+1.78 s", d: "Guest agent ready over vsock · IP " + (sb.ip === "—" ? "10.64.0.x" : sb.ip) + " · webhook sandbox.running delivered" },
      sb.status === "paused" || sb.status === "pausing" ? [
        { cls: "warn", t: "pausing", tm: sb.age, d: "Snapshot + disk checkpoint uploading to object storage" },
        { cls: "warn", t: "sandbox.paused", tm: sb.age, d: "CPU and RAM released · resume restores the same generation" },
      ] : []
    ).flat();
  return (
    <div className="tl">
      {rows.map((r) => (
        <div className={"tlrow " + r.cls} key={r.t}>
          <span className="dot"></span>
          <div className="tt">{r.t}<span className="tm">{r.tm}</span></div>
          <div className="td">{r.d}</div>
        </div>
      ))}
    </div>
  );
}

function SbSettingsTab({ sb, onDestroy }) {
  const d = window.AGENTPOP_DESIGN;
  const cur = d.sizes.find((s) => s.cpu + " · " + s.ram === sb.size);
  const [size, setSize] = React.useState(cur ? cur.id : d.sizes[2].id);
  const [saved, setSaved] = React.useState(false);
  const changed = !cur || size !== cur.id;
  const apply = () => {
    const s = d.sizes.find((x) => x.id === size);
    ASXActions.setSb(sb.id, { size: s.cpu + " · " + s.ram });
    setSaved(true); setTimeout(() => setSaved(false), 1600);
  };
  return (
    <div className="settwrap">
      <Field label="Shape" help={changed ? "Applying a new shape restarts the microVM with the same disk." : "Current shape."}>
        <div className="sizegrid">
          {d.sizes.map((s) => (
            <div key={s.id} className={"sizecard" + (size === s.id ? " sel" : "")} onClick={() => setSize(s.id)} role="radio" aria-checked={size === s.id}>
              <div className="t">{s.id}</div>
              <div className="d"><span>{s.cpu}</span><span>{s.ram}</span></div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10 }}>
          <Button size="sm" disabled={!changed && !saved} leadingIcon={saved ? <Icon name="check" /> : null} onClick={apply}>{saved ? "Shape updated" : "Update shape"}</Button>
        </div>
      </Field>
      <Field label="Idle policy">
        <Select options={["no idle pause", "pause after 5 min", "pause after 15 min", "pause after 1 h"]} defaultValue={sb.idle || "pause after 15 min"} />
      </Field>
      <Field label="TTL" help="The sandbox is destroyed automatically when the TTL elapses.">
        <Select options={["none", "2 h", "24 h", "7 days"]} defaultValue="none" />
      </Field>
      <Field label="Private network">
        <Select options={["none", "agents-internal", "scraper-pool"]} defaultValue="none" />
      </Field>
      <Field label="Storage" help="Encrypted S3-compatible volumes registered under Storage.">
        <Select options={["none", "my-data (acme-agent-artifacts)"]} defaultValue="none" />
      </Field>
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

function SandboxDetailScreen({ id, tab: tab0 }) {
  const st = useStore();
  const go = window.AGENTPOP_DESIGNNav;
  const sb = st.sandboxes.find((x) => x.id === id);
  const [tab, setTab] = React.useState(tab0 || "terminal");
  const [confirm, setConfirm] = React.useState(false);
  if (!sb) return (
    <React.Fragment>
      <PageHeader title="Sandbox not found" />
      <EmptyState icon="box" title="This sandbox no longer exists" desc="It may have been destroyed, or it was created in a previous session of this demo.">
        <Button size="sm" variant="secondary" leadingIcon={<Icon name="arrow-left" />} onClick={() => go("sandboxes")}>Back to sandboxes</Button>
      </EmptyState>
    </React.Fragment>
  );
  const busy = sb.status === "pausing" || sb.status === "resuming" || sb.status === "provisioning";
  const TABS = [["terminal", "Terminal"], ["files", "Files"], ["ports", "Ports"], ["metrics", "Metrics"], ["events", "Events"], ["settings", "Settings"]];
  return (
    <React.Fragment>
      <div className="crumb"><button className="linkbtn" onClick={() => go("sandboxes")}>Sandboxes</button><Icon name="chevron-right" size={13} /><span>{sb.name}</span></div>
      <div className="dhead">
        <h1>{sb.name}</h1>
        <StatusBadge status={sb.status} />
        <span className="chip">{sb.id}<CopyBtn text={sb.id} /></span>
        <span className="spacer"></span>
        {sb.status === "paused" ? (
          <Button leadingIcon={<Icon name="play" />} onClick={() => ASXActions.resume(sb.id)}>Resume</Button>
        ) : (
          <Button variant="secondary" loading={sb.status === "pausing" || sb.status === "resuming"} disabled={busy || sb.status === "failed"} leadingIcon={<Icon name="pause" />} onClick={() => ASXActions.pause(sb.id)}>Pause</Button>
        )}
        <Button variant="secondary" disabled={busy || sb.status === "failed"} leadingIcon={<Icon name="git-fork" />} onClick={() => { const nb = ASXActions.fork(sb); go("sandbox", { id: nb.id }); }}>Fork</Button>
        <Button variant="danger" leadingIcon={<Icon name="trash-2" />} onClick={() => setConfirm(true)}>Destroy</Button>
      </div>
      <div className="dmeta">
        <span className="chip"><Icon name="cpu" size={12} />{sb.size}</span>
        <span className="chip"><Icon name="hard-drive" size={12} />{sb.disk}</span>
        <span className="chip"><Icon name="layers" size={12} />{sb.template}</span>
        <span className="chip"><Icon name="map-pin" size={12} />us-east</span>
        <span className="chip"><Icon name="network" size={12} />{sb.ip}</span>
        <span className="chip"><Icon name="git-commit-horizontal" size={12} />gen 3</span>
        <span className="chip"><Icon name="clock" size={12} />{sb.age}</span>
        <span className="chip"><Icon name="moon" size={12} />{sb.idle || "no idle pause"}</span>
      </div>
      <div className="tabs">
        {TABS.map(([k, l]) => <button key={k} className={"tab" + (tab === k ? " active" : "")} onClick={() => setTab(k)}>{l}{k === "ports" && sb.ports.length ? " (" + sb.ports.length + ")" : ""}</button>)}
      </div>
      {tab === "terminal" ? <Term sb={sb} /> : null}
      {tab === "files" ? (sb.status === "running" ? <FilesTab sb={sb} /> : <EmptyState icon="files" title="Files unavailable" desc="The file API is reachable while the sandbox is running." />) : null}
      {tab === "ports" ? <PortsTab sb={sb} /> : null}
      {tab === "metrics" ? <MetricsTab sb={sb} /> : null}
      {tab === "events" ? <EventsTab sb={sb} /> : null}
      {tab === "settings" ? <SbSettingsTab sb={sb} onDestroy={() => setConfirm(true)} /> : null}
      {confirm ? (
        <Modal title="Destroy sandbox" desc="This stops the microVM and deletes its disk. This cannot be undone." onClose={() => setConfirm(false)}
          footer={<React.Fragment>
            <span className="est mono">{sb.id.slice(0, 18)}…</span>
            <span className="spacer"></span>
            <Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button variant="danger" leadingIcon={<Icon name="trash-2" />} onClick={() => { ASXActions.destroy(sb.id); go("sandboxes"); }}>Destroy sandbox</Button>
          </React.Fragment>}>
          <div style={{ font: "13px/19px var(--font-sans)", color: "var(--text-secondary)" }}>
            Anything running inside <b style={{ color: "var(--text-primary)" }}>{sb.name}</b> is terminated immediately. Attached storage registrations are kept; the writable disk is not.
          </div>
        </Modal>
      ) : null}
    </React.Fragment>
  );
}

Object.assign(window, { SandboxDetailScreen });
