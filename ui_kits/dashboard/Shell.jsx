const { Button, Icon } = window.AgentPopDesignSystem_47afa4;

function useStore() { return React.useSyncExternalStore(window.AGENTPOP_DESIGNStore.sub, window.AGENTPOP_DESIGNStore.get); }

const NAV = [
  { id: "overview", label: "Overview", icon: "house" },
  { id: "sandboxes", label: "Sandboxes", icon: "box" },
  { id: "agents", label: "Agents", icon: "bot" },
  { id: "connectors", label: "Connectors", icon: "plug" },
  { id: "templates", label: "Templates", icon: "layers" },
  { id: "networks", label: "Networks", icon: "network" },
  { id: "storage", label: "Storage", icon: "database" },
  { id: "webhooks", label: "Webhooks", icon: "webhook" },
  { id: "audit", label: "Audit logs", icon: "scroll-text" },
  { id: "developer", label: "Developer", icon: "code" },
  { id: "settings", label: "Settings", icon: "settings" },
];

function Shell({ route, onRoute, children }) {
  const d = window.AGENTPOP_DESIGN;
  const st = useStore();
  return (
    <div className="kit">
      <aside className="sb">
        <button className="sb-org" type="button">
          <span className="mark">P</span>
          <span className="uinfo"><span className="nm">{d.org.name}</span><br /><span className="pr">{d.org.project}</span></span>
          <span className="spacer"></span>
          <Icon name="chevrons-up-down" size={14} style={{ color: "var(--text-tertiary)" }} />
        </button>
        <nav className="sb-nav">
          {NAV.map((n) => (
            <button key={n.id} type="button" className={"sb-item" + (route === n.id ? " active" : "")} onClick={() => onRoute(n.id)}>
              <Icon name={n.icon} size={16} /><span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="sb-foot">
          <div className="credits">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="amt">{st.credits.toFixed(2)}</span><span className="cap">credits left</span>
            </div>
            <Button size="sm" variant="secondary" style={{ width: "100%", marginTop: 8 }} onClick={() => window.AGENTPOP_DESIGNNav("settings", { tab: "billing", addCredits: true })}>Add credits</Button>
          </div>
          <div className="userrow">
            <span className="avatar">SO</span>
            <span className="uinfo" style={{ minWidth: 0 }}>
              <span style={{ font: "500 12px/15px var(--font-sans)", display: "block" }}>{d.user.name}</span>
              <span style={{ font: "11px/14px var(--font-sans)", color: "var(--text-tertiary)", display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>{d.user.email}</span>
            </span>
            <span className="spacer"></span>
            <Button variant="ghost" size="icon-sm" aria-label="Sign out" title="Sign out" onClick={() => { location.href = "auth.html?mode=signin"; }}><Icon name="log-out" size={14} /></Button>
          </div>
        </div>
      </aside>
      <div className="main">
        <div className="content as-scroll">{children}</div>
      </div>
    </div>
  );
}

function PageHeader({ title, desc, children }) {
  return (
    <header className="page-h">
      <div><h1>{title}</h1>{desc ? <p>{desc}</p> : null}</div>
      <span className="spacer"></span>
      {children}
    </header>
  );
}

function Field({ label, optional, help, error, children }) {
  return (
    <div className="field">
      {label ? <label>{label} {optional ? <em>(optional)</em> : null}</label> : null}
      {children}
      {help ? <div className={"help" + (error ? " err" : "")}>{help}</div> : null}
    </div>
  );
}

function Select({ options, value, onChange, ...props }) {
  return (
    <span className="selwrap" style={{ display: "block" }}>
      <select value={value} onChange={onChange} {...props}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <Icon name="chevron-down" size={16} />
    </span>
  );
}

function Toggle({ on, onChange, label }) {
  return <button type="button" role="switch" aria-checked={!!on} aria-label={label} className={"tgl" + (on ? " on" : "")} onClick={() => onChange(!on)}></button>;
}

function Check({ on, onChange, label }) {
  return (
    <button type="button" role="checkbox" aria-checked={!!on} aria-label={label} className={"chk" + (on ? " on" : "")} onClick={() => onChange(!on)}>
      {on ? <Icon name="check" size={12} strokeWidth={3} /> : null}
    </button>
  );
}

function Sheet({ title, desc, footer, onClose, children }) {
  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-label={title}>
        <div className="sheet-h">
          <div><h2>{title}</h2>{desc ? <p>{desc}</p> : null}</div>
          <span className="spacer"></span>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></Button>
        </div>
        <div className="sheet-b as-scroll">{children}</div>
        {footer ? <div className="sheet-f">{footer}</div> : null}
      </div>
    </div>
  );
}

function Modal({ title, desc, footer, onClose, children, width }) {
  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-label={title} style={width ? { width } : null}>
        <div className="sheet-h">
          <div><h2>{title}</h2>{desc ? <p>{desc}</p> : null}</div>
          <span className="spacer"></span>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></Button>
        </div>
        <div className="sheet-b as-scroll">{children}</div>
        {footer ? <div className="sheet-f">{footer}</div> : null}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, desc, children }) {
  return (
    <div className="emptybox">
      <span className="eic"><Icon name={icon} size={20} /></span>
      <span className="et">{title}</span>
      <span className="ed">{desc}</span>
      {children ? <div style={{ marginTop: 10 }}>{children}</div> : null}
    </div>
  );
}

function CopyBtn({ text }) {
  const [ok, setOk] = React.useState(false);
  return (
    <button type="button" className="copybtn" aria-label="Copy"
      onClick={() => { try { navigator.clipboard.writeText(text); } catch (e) {} setOk(true); setTimeout(() => setOk(false), 1200); }}>
      <Icon name={ok ? "check" : "copy"} size={14} />
    </button>
  );
}

function CodeBlock({ lines }) {
  const text = lines.map((l) => (typeof l === "string" ? l : l.text)).join("\n");
  return (
    <div className="codebl">
      <button type="button" className="cpy" aria-label="Copy" onClick={() => { try { navigator.clipboard.writeText(text); } catch (e) {} }}><Icon name="copy" size={14} /></button>
      {lines.map((l, i) => typeof l === "string"
        ? <div key={i}>{l}</div>
        : <div key={i}>{l.text} {l.cmt ? <span className="cmt"># {l.cmt}</span> : null}</div>)}
    </div>
  );
}

function Stub({ what }) {
  return <div className="stub">{what} is not defined in the source material — intentionally left blank rather than invented.</div>;
}

Object.assign(window, { Shell, PageHeader, Field, Select, Toggle, Check, Sheet, Modal, EmptyState, CopyBtn, CodeBlock, Stub, useStore });
