import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input, Select, StatusBadge } from "@agentpop/ui";
import { Icon } from "../../components/icon";
import { CopyButton, EmptyState, Modal, PageHeader } from "../../components/primitives";
import { useMutation, useResource } from "../../api/provider";
import type { CreateSandboxInput, Sandbox } from "../../api/types";
import { CreateSandboxSheet } from "./CreateSandboxSheet";

function SandboxRow({
  sb,
  expanded,
  onToggle,
  onAction,
  onFork,
}: {
  sb: Sandbox;
  expanded: boolean;
  onToggle: () => void;
  onAction: (sb: Sandbox, act: "pause" | "resume" | "destroy") => void;
  onFork: (sb: Sandbox) => void;
}) {
  const navigate = useNavigate();
  const canExpand = sb.ports.length > 0;
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const deepPath = `/app/sandboxes/${sb.id}`;
  const open = (tab?: string) => navigate(`${deepPath}${tab ? `?tab=${tab}` : ""}`);
  const deepURL = `${window.location.origin}${deepPath}`;
  return (
    <div className="rrow click">
      <div className="rrow-main" onClick={() => open()}>
        <span className="ricon"><Icon name="box" size={17} /></span>
        <div className="rcol">
          <button className="linkbtn rname" onClick={(event) => { event.stopPropagation(); open(); }}>{sb.name}</button>
          <div className="rmeta">
            <span>{sb.size}</span><span>{sb.template}</span><span>{sb.ip}</span>
            <span title="Sandbox ID">{sb.id.slice(0, 14)}…</span>
          </div>
        </div>
        <span className="spacer" />
        <StatusBadge status={sb.status} />
        <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="hard-drive" size={13} />{sb.disk}</span>
        <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="clock" size={13} />{sb.age}</span>
        <div className="racts" onClick={stop}>
          <Button variant="ghost" size="icon-sm" aria-label="Terminal" title="Terminal" onClick={() => open("terminal")}><Icon name="terminal" size={15} /></Button>
          <CopyButton text={deepURL} />
          <Button variant="ghost" size="icon-sm" aria-label={sb.status === "paused" ? "Resume" : "Pause"} title={sb.status === "paused" ? "Resume" : "Pause"} onClick={() => onAction(sb, sb.status === "paused" ? "resume" : "pause")}><Icon name={sb.status === "paused" ? "play" : "pause"} size={15} /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Files" title="Files" onClick={() => open("files")}><Icon name="files" size={15} /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Fork" title="Fork" onClick={() => onFork(sb)}><Icon name="git-fork" size={15} /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Destroy" title="Destroy" onClick={() => onAction(sb, "destroy")}><Icon name="trash-2" size={15} /></Button>
          {canExpand ? (
            <Button variant="ghost" size="icon-sm" aria-label="Ports" onClick={onToggle}><Icon name={expanded ? "chevron-up" : "chevron-down"} size={15} /></Button>
          ) : null}
        </div>
      </div>
      {expanded && canExpand
        ? sb.ports.map((p) => (
            <div className="rports" key={p.port}>
              <span className="portlbl">Public URL</span>
              <span className="portno">{p.port}</span>
              <a className="urlbox" href={p.url} target="_blank" rel="noreferrer"><span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{p.url}</span></a>
              <CopyButton text={p.url} />
            </div>
          ))
        : null}
    </div>
  );
}

export function Sandboxes() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const runMutation = useMutation();
  const { data: list = [] } = useResource((c) => c.listSandboxes(), []);

  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("All states");
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [sheet, setSheet] = React.useState(params.get("create") === "1");
  const [confirm, setConfirm] = React.useState<Sandbox | null>(null);

  React.useEffect(() => {
    if (expanded === null && list[0]) setExpanded(list[0].id);
  }, [list, expanded]);

  const closeSheet = () => {
    setSheet(false);
    if (params.get("create")) {
      params.delete("create");
      setParams(params, { replace: true });
    }
  };

  const shown = list.filter(
    (s) => (q === "" || s.name.includes(q) || s.id.includes(q)) && (status === "All states" || s.status === status),
  );

  const onAction = (sb: Sandbox, act: "pause" | "resume" | "destroy") => {
    if (act === "destroy") {
      setConfirm(sb);
      return;
    }
    void runMutation((c) => (act === "pause" ? c.pauseSandbox(sb.id) : c.resumeSandbox(sb.id)));
  };

  const onFork = async (sb: Sandbox) => {
    const fork = await runMutation((c) => c.forkSandbox(sb.id));
    navigate(`/app/sandboxes/${fork.id}`);
  };

  const onCreate = async (input: CreateSandboxInput) => {
    const sb = await runMutation((c) => c.createSandbox(input));
    closeSheet();
    navigate(`/app/sandboxes/${sb.id}?tab=${sb.ports.length ? "ports" : "events"}`);
  };

  return (
    <>
      <PageHeader title="Sandboxes" desc="Isolated Firecracker microVMs for untrusted and agent-generated code.">
        <Button variant="secondary" leadingIcon={<Icon name="sparkles" />} onClick={() => navigate("/app/marketplace")}>Marketplace</Button>
        <Button leadingIcon={<Icon name="plus" />} onClick={() => setSheet(true)}>New sandbox</Button>
      </PageHeader>
      <div className="toolbar">
        <div style={{ width: 280 }}><Input leading={<Icon name="search" />} placeholder="Search sandboxes" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div style={{ width: 170 }}><Select options={["All states", "running", "provisioning", "paused", "failed"]} value={status} onChange={(e) => setStatus(e.target.value)} /></div>
        <div style={{ width: 140 }}><Select options={["us-east", "eu-central"]} defaultValue="us-east" /></div>
        <span className="spacer" />
        <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)" }}>{shown.length} of {list.length}</span>
      </div>
      {shown.length === 0 ? (
        <EmptyState icon="box" title="No sandboxes match" desc="Adjust the search or state filter, or create a new sandbox.">
          <Button size="sm" leadingIcon={<Icon name="plus" />} onClick={() => setSheet(true)}>New sandbox</Button>
        </EmptyState>
      ) : (
        <div className="rows">
          {shown.map((sb) => (
            <SandboxRow
              key={sb.id}
              sb={sb}
              expanded={expanded === sb.id}
              onToggle={() => setExpanded(expanded === sb.id ? null : sb.id)}
              onAction={onAction}
              onFork={onFork}
            />
          ))}
        </div>
      )}
      {sheet ? <CreateSandboxSheet onClose={closeSheet} onCreate={onCreate} /> : null}
      {confirm ? (
        <Modal
          title="Destroy sandbox"
          desc="This stops the microVM and deletes its disk. This cannot be undone."
          onClose={() => setConfirm(null)}
          footer={
            <>
              <span className="est mono">{confirm.id.slice(0, 18)}…</span>
              <span className="spacer" />
              <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
              <Button
                variant="danger"
                leadingIcon={<Icon name="trash-2" />}
                onClick={() => {
                  void runMutation((c) => c.destroySandbox(confirm.id));
                  setConfirm(null);
                }}
              >
                Destroy sandbox
              </Button>
            </>
          }
        >
          <div style={{ font: "13px/19px var(--font-sans)", color: "var(--text-secondary)" }}>
            Anything running inside <b style={{ color: "var(--text-primary)" }}>{confirm.name}</b> is terminated immediately. Attached storage registrations are kept; the writable disk is not.
          </div>
        </Modal>
      ) : null}
    </>
  );
}
