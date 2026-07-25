import * as React from "react";
import { Badge, Button, Input, Select } from "@agentpop/ui";
import { Icon } from "../../components/icon";
import { Field, Modal, PageHeader } from "../../components/primitives";
import { useMutation, useResource } from "../../api/provider";
import type { Network } from "../../api/types";

export function Networks() {
  const { data: networks = [] } = useResource((c) => c.listNetworks(), []);
  const { data: sandboxes = [] } = useResource((c) => c.listSandboxes(), []);
  const runMutation = useMutation();
  const [create, setCreate] = React.useState(false);
  const [attach, setAttach] = React.useState<Network | null>(null);
  const [view, setView] = React.useState<Network | null>(null);
  const [name, setName] = React.useState("");
  const [cidr, setCidr] = React.useState("");
  const [region, setRegion] = React.useState("local");
  const [sandboxId, setSandboxId] = React.useState("");
  React.useEffect(() => {
    if (!sandboxId && sandboxes[0]) setSandboxId(sandboxes[0].id);
  }, [sandboxes, sandboxId]);
  return (
    <>
      <PageHeader title="Networks" desc="Private tenant subnets connecting sandboxes across hosts.">
        <Button leadingIcon={<Icon name="plus" />} onClick={() => setCreate(true)}>New network</Button>
      </PageHeader>
      <div className="rows">
        {networks.map((n) => (
          <div className="rrow" key={n.id}>
            <div className="rrow-main">
              <span className="ricon"><Icon name="network" size={17} /></span>
              <div className="rcol">
                <div className="rname">{n.name}</div>
                <div className="rmeta"><span>{n.id.slice(0, 18)}…</span><span>{n.cidr}</span><span>{n.region}</span></div>
              </div>
              <span className="spacer" />
              <Badge tone="outline" size="sm" icon={<Icon name="box" size={12} />}>{n.members} member{n.members === 1 ? "" : "s"}</Badge>
              <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)" }}>{n.updated}</span>
              <div className="racts">
                <Button variant="ghost" size="icon-sm" aria-label="View members" title="View members" onClick={() => setView(n)}><Icon name="eye" size={15} /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Attach sandbox" title="Attach sandbox" onClick={() => setAttach(n)}><Icon name="plus" size={15} /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Delete" title={n.members ? "Detach members before deleting" : "Delete"} disabled={n.members > 0} onClick={() => {
                  if (window.confirm(`Delete network ${n.name}?`)) void runMutation((c) => c.deleteNetwork(n.id));
                }}><Icon name="trash-2" size={15} /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {create ? (
        <Modal
          title="Create network"
          desc="Create a project-scoped private network."
          onClose={() => setCreate(false)}
          footer={<><span className="spacer" /><Button variant="secondary" onClick={() => setCreate(false)}>Cancel</Button><Button disabled={!name} onClick={async () => {
            await runMutation((c) => c.createNetwork({ name, cidr: cidr || undefined, region }));
            setCreate(false); setName(""); setCidr("");
          }}>Create network</Button></>}
        >
          <Field label="Name"><Input placeholder="agents-internal" value={name} onChange={(event) => setName(event.target.value)} /></Field>
          <Field label="CIDR" optional help="Leave empty to allocate the next local /24."><Input mono placeholder="10.64.1.0/24" value={cidr} onChange={(event) => setCidr(event.target.value)} /></Field>
          <Field label="Region"><Select options={["local", "us-east", "eu-central"]} value={region} onChange={(event) => setRegion(event.target.value)} /></Field>
        </Modal>
      ) : null}
      {attach ? (
        <Modal
          title="Add sandbox"
          desc={"Attach to " + attach.name}
          onClose={() => setAttach(null)}
          footer={
            <>
              <span className="spacer" />
              <Button variant="secondary" onClick={() => setAttach(null)}>Cancel</Button>
              <Button disabled={!sandboxId} onClick={async () => {
                await runMutation((c) => c.attachNetworkSandbox(attach.id, sandboxId));
                setAttach(null);
              }}>Add sandbox</Button>
            </>
          }
        >
          <Field label="Sandbox" help="Members reach each other by private name and IP; cross-network traffic is denied.">
            <Select value={sandboxId} onChange={(event) => setSandboxId(event.target.value)}>
              {sandboxes.map((sandbox) => <option key={sandbox.id} value={sandbox.id}>{sandbox.name}</option>)}
            </Select>
          </Field>
        </Modal>
      ) : null}
      {view ? (
        <Modal title={view.name + " members"} desc="Attached sandboxes recorded in the network topology." onClose={() => setView(null)} footer={<><span className="spacer" /><Button variant="secondary" onClick={() => setView(null)}>Close</Button></>}>
          {(view.attachedSandboxIds ?? []).length === 0 ? <div className="help">No sandboxes attached.</div> : (view.attachedSandboxIds ?? []).map((id) => {
            const sandbox = sandboxes.find((item) => item.id === id);
            return <div className="kv" key={id}><Icon name="box" size={14} /><span>{sandbox?.name ?? id}</span><span className="spacer" /><Button size="sm" variant="danger-outline" onClick={async () => {
              await runMutation((c) => c.detachNetworkSandbox(view.id, id));
              setView(null);
            }}>Detach</Button></div>;
          })}
        </Modal>
      ) : null}
    </>
  );
}
