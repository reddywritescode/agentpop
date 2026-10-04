const { Button, Icon, Input, StatusBadge } = window.AgentPopDesignSystem_47afa4;

function SandboxRow({ sb, expanded, onToggle, onAction }) {
  const go = window.AGENTPOP_DESIGNNav;
  const canExpand = sb.ports.length > 0;
  const stop = (e) => e.stopPropagation();
  return (
    <div className="rrow click">
      <div className="rrow-main" onClick={() => go("sandbox", { id: sb.id })}>
        <span className="ricon"><Icon name="box" size={17} /></span>
        <div className="rcol">
          <div className="rname">{sb.name}</div>
          <div className="rmeta">
            <span>{sb.size}</span><span>{sb.template}</span><span>{sb.ip}</span>
            <span title="Sandbox ID">{sb.id.slice(0, 14)}…</span>
          </div>
        </div>
        <span className="spacer"></span>
        <StatusBadge status={sb.status} />
        <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="hard-drive" size={13} />{sb.disk}</span>
        <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="clock" size={13} />{sb.age}</span>
        <div className="racts" onClick={stop}>
          <Button variant="ghost" size="icon-sm" aria-label="Terminal" title="Terminal" onClick={() => go("sandbox", { id: sb.id, tab: "terminal" })}><Icon name="terminal" size={15} /></Button>
          <Button variant="ghost" size="icon-sm" aria-label={sb.status === "paused" ? "Resume" : "Pause"} title={sb.status === "paused" ? "Resume" : "Pause"} onClick={() => onAction(sb, sb.status === "paused" ? "resume" : "pause")}><Icon name={sb.status === "paused" ? "play" : "pause"} size={15} /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Files" title="Files" onClick={() => go("sandbox", { id: sb.id, tab: "files" })}><Icon name="files" size={15} /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Fork" title="Fork" onClick={() => { const nb = ASXActions.fork(sb); go("sandbox", { id: nb.id }); }}><Icon name="git-fork" size={15} /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Destroy" title="Destroy" onClick={() => onAction(sb, "destroy")}><Icon name="trash-2" size={15} /></Button>
          {canExpand ? (
            <Button variant="ghost" size="icon-sm" aria-label="Ports" onClick={onToggle}><Icon name={expanded ? "chevron-up" : "chevron-down"} size={15} /></Button>
          ) : null}
        </div>
      </div>
      {expanded && canExpand ? sb.ports.map((p) => (
        <div className="rports" key={p.port}>
          <span className="portlbl">Public URL</span>
          <span className="portno">{p.port}</span>
          <span className="urlbox"><span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{p.url}</span></span>
          <CopyBtn text={p.url} />
        </div>
      )) : null}
    </div>
  );
}

function SandboxesScreen({ param }) {
  const st = useStore();
  const list = st.sandboxes;
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("All states");
  const [expanded, setExpanded] = React.useState(list[0] ? list[0].id : null);
  const [sheet, setSheet] = React.useState(!!(param && param.create));
  const [confirm, setConfirm] = React.useState(null);

  const shown = list.filter((s) =>
    (q === "" || s.name.includes(q) || s.id.includes(q)) &&
    (status === "All states" || s.status === status));

  const onAction = (sb, act) => {
    if (act === "destroy") { setConfirm(sb); return; }
    ASXActions[act === "pause" ? "pause" : "resume"](sb.id);
  };

  const onCreate = (props) => {
    const nb = ASXActions.create(props);
    setSheet(false);
    window.AGENTPOP_DESIGNNav("sandbox", { id: nb.id, tab: "events" });
  };

  return (
    <React.Fragment>
      <PageHeader title="Sandboxes" desc="Isolated Firecracker microVMs for untrusted and agent-generated code.">
        <Button leadingIcon={<Icon name="plus" />} onClick={() => setSheet(true)}>New sandbox</Button>
      </PageHeader>
      <div className="toolbar">
        <div style={{ width: 280 }}><Input leading={<Icon name="search" />} placeholder="Search sandboxes" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div style={{ width: 170 }}><Select options={["All states", "running", "provisioning", "paused", "failed"]} value={status} onChange={(e) => setStatus(e.target.value)} /></div>
        <div style={{ width: 140 }}><Select options={["us-east", "eu-central"]} defaultValue="us-east" /></div>
        <span className="spacer"></span>
        <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)" }}>{shown.length} of {list.length}</span>
      </div>
      {shown.length === 0 ? (
        <EmptyState icon="box" title="No sandboxes match" desc="Adjust the search or state filter, or create a new sandbox.">
          <Button size="sm" leadingIcon={<Icon name="plus" />} onClick={() => setSheet(true)}>New sandbox</Button>
        </EmptyState>
      ) : (
        <div className="rows">
          {shown.map((sb) => (
            <SandboxRow key={sb.id} sb={sb} expanded={expanded === sb.id} onToggle={() => setExpanded(expanded === sb.id ? null : sb.id)} onAction={onAction} />
          ))}
        </div>
      )}
      {sheet ? <CreateSandboxSheet onClose={() => setSheet(false)} onCreate={onCreate} /> : null}
      {confirm ? (
        <Modal title="Destroy sandbox" desc="This stops the microVM and deletes its disk. This cannot be undone." onClose={() => setConfirm(null)}
          footer={<React.Fragment>
            <span className="est mono">{confirm.id.slice(0, 18)}…</span>
            <span className="spacer"></span>
            <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" leadingIcon={<Icon name="trash-2" />} onClick={() => { ASXActions.destroy(confirm.id); setConfirm(null); }}>Destroy sandbox</Button>
          </React.Fragment>}>
          <div style={{ font: "13px/19px var(--font-sans)", color: "var(--text-secondary)" }}>
            Anything running inside <b style={{ color: "var(--text-primary)" }}>{confirm.name}</b> is terminated immediately. Attached storage registrations are kept; the writable disk is not.
          </div>
        </Modal>
      ) : null}
    </React.Fragment>
  );
}

Object.assign(window, { SandboxesScreen });
