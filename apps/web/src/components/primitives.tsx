import * as React from "react";
import { Button, Checkbox, Switch } from "@agentpop/ui";
import { Icon } from "./icon";

/**
 * App-level compositions that the design system doesn't own: page chrome, form
 * field wrapper, side sheet + modal overlays, empty states, and copy/code
 * helpers. Ported from the dashboard kit's Shell primitives; they consume the
 * same design tokens through plain CSS classes in app.css.
 */

export function PageHeader({
  title,
  desc,
  children,
}: {
  title: React.ReactNode;
  desc?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="page-h">
      <div>
        <h1>{title}</h1>
        {desc ? <p>{desc}</p> : null}
      </div>
      <span className="spacer" />
      {children}
    </header>
  );
}

export function Field({
  label,
  optional,
  help,
  error,
  children,
}: {
  label?: React.ReactNode;
  optional?: boolean;
  help?: React.ReactNode;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      {label ? (
        <label>
          {label} {optional ? <em>(optional)</em> : null}
        </label>
      ) : null}
      {children}
      {help ? <div className={"help" + (error ? " err" : "")}>{help}</div> : null}
    </div>
  );
}

/** Toggle with the kit's `on`/`onChange` prop shape, backed by the DS Switch. */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <Switch checked={on} onCheckedChange={onChange} label={label} />;
}

/** Checkbox with the kit's `on`/`onChange` prop shape, backed by the DS Checkbox. */
export function Check({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <Checkbox checked={on} onCheckedChange={onChange} label={label} />;
}

export function Sheet({
  title,
  desc,
  footer,
  onClose,
  children,
}: {
  title: string;
  desc?: string;
  footer?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEscape(onClose);
  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-label={title} aria-modal="true">
        <div className="sheet-h">
          <div>
            <h2>{title}</h2>
            {desc ? <p>{desc}</p> : null}
          </div>
          <span className="spacer" />
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <Icon name="x" size={16} />
          </Button>
        </div>
        <div className="sheet-b ap-scroll">{children}</div>
        {footer ? <div className="sheet-f">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Modal({
  title,
  desc,
  footer,
  onClose,
  children,
  width,
}: {
  title: string;
  desc?: string;
  footer?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  useEscape(onClose);
  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={title} aria-modal="true" style={width ? { width } : undefined}>
        <div className="sheet-h">
          <div>
            <h2>{title}</h2>
            {desc ? <p>{desc}</p> : null}
          </div>
          <span className="spacer" />
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <Icon name="x" size={16} />
          </Button>
        </div>
        <div className="sheet-b ap-scroll">{children}</div>
        {footer ? <div className="sheet-f">{footer}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  desc,
  children,
}: {
  icon: string;
  title: string;
  desc: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="emptybox">
      <span className="eic">
        <Icon name={icon} size={20} />
      </span>
      <span className="et">{title}</span>
      <span className="ed">{desc}</span>
      {children ? <div style={{ marginTop: 10 }}>{children}</div> : null}
    </div>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = React.useState(false);
  return (
    <button
      type="button"
      className="copybtn"
      aria-label="Copy"
      onClick={() => {
        void navigator.clipboard?.writeText(text).catch(() => {});
        setOk(true);
        setTimeout(() => setOk(false), 1200);
      }}
    >
      <Icon name={ok ? "check" : "copy"} size={14} />
    </button>
  );
}

export type CodeLine = string | { text: string; cmt?: string };

export function CodeBlock({ lines }: { lines: CodeLine[] }) {
  const text = lines.map((l) => (typeof l === "string" ? l : l.text)).join("\n");
  return (
    <div className="codebl">
      <button
        type="button"
        className="cpy"
        aria-label="Copy"
        onClick={() => void navigator.clipboard?.writeText(text).catch(() => {})}
      >
        <Icon name="copy" size={14} />
      </button>
      {lines.map((l, i) =>
        typeof l === "string" ? (
          <div key={i}>{l}</div>
        ) : (
          <div key={i}>
            {l.text} {l.cmt ? <span className="cmt"># {l.cmt}</span> : null}
          </div>
        ),
      )}
    </div>
  );
}

/** Meter/progress bar shared by usage, quotas, and capacity views. */
export function Meter({ label, value, pct, warn }: { label: React.ReactNode; value: React.ReactNode; pct: number; warn?: boolean }) {
  return (
    <div className="meter">
      <div className="mrow">
        <span className="ml">{label}</span>
        <span className="mv mono">{value}</span>
      </div>
      <div className="mbar">
        <div className={"mfill" + (warn ? " warn" : "")} style={{ width: Math.min(100, Math.max(0, pct)) + "%" }} />
      </div>
    </div>
  );
}

function useEscape(onClose: () => void) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
}
