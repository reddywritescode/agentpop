import * as React from "react";
import { Badge, Button, Input, Select, StatusBadge } from "@agentpop/ui";
import { Icon } from "../../components/icon";
import { Check, Field, Modal, PageHeader } from "../../components/primitives";
import { useMutation, useResource } from "../../api/provider";
import type { Storage as StorageResource } from "../../api/types";

export function Storage() {
  const { data: storages = [] } = useResource((c) => c.listStorages(), []);
  const { data: sandboxes = [] } = useResource((c) => c.listSandboxes(), []);
  const runMutation = useMutation();
  const [modal, setModal] = React.useState(false);
  const [manage, setManage] = React.useState<StorageResource | null>(null);
  const [pathStyle, setPathStyle] = React.useState(true);
  const [name, setName] = React.useState("");
  const [bucket, setBucket] = React.useState("");
  const [endpoint, setEndpoint] = React.useState("https://s3.amazonaws.com");
  const [region, setRegion] = React.useState("us-east-1");
  const [accessKey, setAccessKey] = React.useState("");
  const [secretKey, setSecretKey] = React.useState("");
  const [sandboxId, setSandboxId] = React.useState("");
  React.useEffect(() => {
    if (!sandboxId && sandboxes[0]) setSandboxId(sandboxes[0].id);
  }, [sandboxes, sandboxId]);
  return (
    <>
      <PageHeader title="Storage" desc="S3-compatible disks you register and attach to sandboxes.">
        <Button leadingIcon={<Icon name="plus" />} onClick={() => setModal(true)}>Register storage</Button>
      </PageHeader>
      <div className="rows">
        {storages.map((s) => (
          <div className="rrow" key={s.name}>
            <div className="rrow-main">
              <span className="ricon"><Icon name="database" size={17} /></span>
              <div className="rcol">
                <div className="rname">{s.name}</div>
                <div className="rmeta"><span>{s.endpoint}</span><span>{s.bucket}</span><span>{s.region}</span></div>
              </div>
              <span className="spacer" />
              <Badge tone="outline" size="sm">{s.attached} attached</Badge>
              <StatusBadge
                status={s.health === "healthy" ? "healthy" : s.health === "error" ? "error" : "inactive"}
                label={s.health === "registered" ? "Registered" : undefined}
              />
              <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)" }}>checked {s.checked}</span>
              <div className="racts">
                <Button variant="ghost" size="icon-sm" aria-label="Manage attachments" title="Manage attachments" onClick={() => setManage(s)}><Icon name="unplug" size={15} /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Remove" title={s.attached ? "Detach sandboxes before removing" : "Remove"} disabled={s.attached > 0} onClick={() => {
                  if (window.confirm(`Remove storage ${s.name}?`)) void runMutation((c) => c.deleteStorage(s.id));
                }}><Icon name="trash-2" size={15} /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {modal ? (
        <Modal
          title="Register storage"
          desc="Add an S3-compatible disk."
          onClose={() => setModal(false)}
          footer={
            <>
              <span className="spacer" />
              <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
              <Button disabled={!name || !bucket || !endpoint} onClick={async () => {
                await runMutation((c) => c.createStorage({ name, bucket, endpoint, region, pathStyle, accessKey, secretKey }));
                setModal(false); setName(""); setBucket(""); setAccessKey(""); setSecretKey("");
              }}>Register storage</Button>
            </>
          }
        >
          <Field label="A name for this storage" help="Used to recognise it later. Lowercase letters, digits and dashes only.">
            <Input placeholder="my-data" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Bucket name" help="The exact bucket name in your cloud account.">
            <Input mono placeholder="my-bucket" value={bucket} onChange={(event) => setBucket(event.target.value)} />
          </Field>
          <Field label="Service address" help="For Amazon S3 use https://s3.amazonaws.com. Cloudflare R2, MinIO and Backblaze each have their own URL.">
            <Input mono placeholder="https://s3.amazonaws.com" value={endpoint} onChange={(event) => setEndpoint(event.target.value)} />
          </Field>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Region" optional><Input mono placeholder="us-east-1" value={region} onChange={(event) => setRegion(event.target.value)} /></Field>
            </div>
            <div className="optrow" style={{ flex: 1.2, marginBottom: 16 }}>
              <Check on={pathStyle} onChange={setPathStyle} label="Older URL style" />
              <div>
                <div className="t" style={{ fontSize: 13 }}>Older URL style</div>
                <div className="d">Leave on for MinIO and most self-hosted setups. Turn off only for Amazon S3.</div>
              </div>
            </div>
          </div>
          <Field label="Access key" help="From your cloud provider's &quot;access keys&quot; page.">
            <Input mono value={accessKey} onChange={(event) => setAccessKey(event.target.value)} />
          </Field>
          <Field label="Secret key" help="Saved in encrypted form. We never show it to you again - keep a copy if you need it.">
            <Input mono type="password" value={secretKey} onChange={(event) => setSecretKey(event.target.value)} />
          </Field>
        </Modal>
      ) : null}
      {manage ? (
        <Modal title={manage.name + " attachments"} desc="Attach this registered bucket to sandbox metadata." onClose={() => setManage(null)} footer={<><span className="spacer" /><Button variant="secondary" onClick={() => setManage(null)}>Close</Button></>}>
          <Field label="Attach sandbox">
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}><Select value={sandboxId} onChange={(event) => setSandboxId(event.target.value)}>{sandboxes.map((sandbox) => <option key={sandbox.id} value={sandbox.id}>{sandbox.name}</option>)}</Select></div>
              <Button disabled={!sandboxId || (manage.attachedSandboxIds ?? []).includes(sandboxId)} onClick={async () => {
                await runMutation((c) => c.attachStorage(manage.id, sandboxId));
                setManage(null);
              }}>Attach</Button>
            </div>
          </Field>
          {(manage.attachedSandboxIds ?? []).map((id) => <div className="kv" key={id}><Icon name="box" size={14} /><span>{sandboxes.find((item) => item.id === id)?.name ?? id}</span><span className="spacer" /><Button size="sm" variant="danger-outline" onClick={async () => {
            await runMutation((c) => c.detachStorage(manage.id, id));
            setManage(null);
          }}>Detach</Button></div>)}
        </Modal>
      ) : null}
    </>
  );
}
