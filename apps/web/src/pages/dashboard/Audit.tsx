import * as React from "react";
import { Badge, Button } from "@agentpop/ui";
import { Icon } from "../../components/icon";
import { PageHeader } from "../../components/primitives";
import { useResource } from "../../api/provider";

const kindIcon = (k: string) =>
  k === "destroy" ? "trash-2" : k === "exec" ? "terminal" : k === "update" ? "settings" : "box";

export function Audit() {
  const { data: audit = [] } = useResource((c) => c.listAuditEvents(), []);
  const [page, setPage] = React.useState(0);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(audit.length / pageSize));
  React.useEffect(() => {
    if (page >= pageCount) setPage(pageCount - 1);
  }, [page, pageCount]);
  const visible = audit.slice(page * pageSize, (page + 1) * pageSize);
  return (
    <>
      <PageHeader title="Audit logs" desc="Every actor, action, and result — humans and agents alike." />
      <div className="rows">
        {visible.map((a, i) => (
          <div className="rrow" key={i}>
            <div className="rrow-main" style={{ padding: "10px 16px" }}>
              <span className="ricon" style={{ width: 32, height: 32 }}><Icon name={kindIcon(a.kind)} size={15} /></span>
              <div className="rcol" style={{ minWidth: 220 }}>
                <div className="rname" style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
                  {a.action} <Badge tone={a.tone === "danger" ? "danger" : a.tone === "info" ? "info" : a.tone === "success" ? "success" : "neutral"} size="sm">{a.kind}</Badge>
                </div>
                <div className="rmeta"><span>{a.resource}</span></div>
              </div>
              <span className="spacer" />
              <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-secondary)" }}>{a.actor}</span>
              <span className="mono" style={{ font: "12px/16px var(--font-mono)", color: "var(--text-tertiary)" }}>{a.ip}</span>
              {a.result === "ok" ? <Badge tone="success" size="sm">ok</Badge> : <Badge tone="danger" size="sm">denied</Badge>}
              <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)", display: "inline-flex", gap: 5, alignItems: "center" }}><Icon name="clock" size={13} />{a.time}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="pager">
        <span className="mono" style={{ color: "var(--text-tertiary)", fontSize: 12 }}>
          Page {page + 1} of {pageCount}
        </span>
        <Button
          variant="secondary"
          size="sm"
          leadingIcon={<Icon name="chevron-left" />}
          disabled={page === 0}
          onClick={() => setPage((value) => Math.max(0, value - 1))}
        >
          Prev
        </Button>
        <Button
          variant="secondary"
          size="sm"
          trailingIcon={<Icon name="chevron-right" />}
          disabled={page + 1 >= pageCount}
          onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
        >
          Next
        </Button>
      </div>
    </>
  );
}
