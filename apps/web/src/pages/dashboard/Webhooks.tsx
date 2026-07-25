import * as React from "react";
import { Button, Input, StatusBadge } from "@agentpop/ui";
import { Icon } from "../../components/icon";
import { Check, Field, Modal, PageHeader } from "../../components/primitives";
import { useMutation, useResource } from "../../api/provider";

export function Webhooks() {
  const { data: webhooks = [] } = useResource((c) => c.listWebhooks(), []);
  const runMutation = useMutation();
  const { data: catalog } = useResource((c) => c.getCatalog(), []);
  const eventNames = catalog?.events ?? [];
  const [modal, setModal] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [secret, setSecret] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState("");
  const [events, setEvents] = React.useState<string[]>(["sandbox.create"]);
  const toggle = (ev: string) => setEvents((prev) => (prev.includes(ev) ? prev.filter((x) => x !== ev) : [...prev, ev]));
  return (
    <>
      <PageHeader title="Webhooks" desc="Signed POST deliveries when platform events occur.">
        <Button leadingIcon={<Icon name="plus" />} onClick={() => setModal(true)}>New webhook</Button>
      </PageHeader>
      {notice ? <div className="grantnote" style={{ marginBottom: 12 }}><Icon name="check" size={15} />{notice}</div> : null}
      {secret ? <div className="grantnote" style={{ marginBottom: 12 }}><Icon name="key" size={15} /><span>Copy this signing secret now; it is encrypted and will not be shown again: <span className="mono">{secret}</span></span></div> : null}
      <div className="rows">
        {webhooks.map((w) => (
          <div className="rrow" key={w.url}>
            <div className="rrow-main">
              <span className="ricon"><Icon name="webhook" size={17} /></span>
              <div className="rcol">
                <div className="rname mono" style={{ fontSize: 13 }}>{w.url}</div>
                <div className="rmeta">{w.events.map((e) => <span key={e}>{e}</span>)}</div>
              </div>
              <span className="spacer" />
              <StatusBadge status={w.status as "active"} />
              <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)" }}>{w.last}</span>
              <div className="racts">
                <Button variant="ghost" size="icon-sm" aria-label="Send test" title="Send test" onClick={async () => {
                  const result = await runMutation((c) => c.testWebhook(w.id));
                  setNotice(`Test delivered to ${w.url} with HTTP ${result.status}.`);
                }}><Icon name="send" size={15} /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Delete" title="Delete" onClick={() => {
                  if (window.confirm(`Delete webhook ${w.url}?`)) void runMutation((c) => c.deleteWebhook(w.id));
                }}><Icon name="trash-2" size={15} /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {modal ? (
        <Modal
          title="Create webhook"
          desc="Receive a POST request when sandbox events occur."
          onClose={() => setModal(false)}
          footer={
            <>
              <span className="spacer" />
              <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
              <Button disabled={!url || events.length === 0} onClick={async () => {
                const created = await runMutation((c) => c.createWebhook(url, events));
                setSecret(created.secret);
                setModal(false);
                setUrl("");
              }}>Create webhook</Button>
            </>
          }
        >
          <Field label="Endpoint URL" help="Must be a public http or https URL. We sign every delivery so you can verify it came from us.">
            <Input mono placeholder="https://example.com/webhook" value={url} onChange={(event) => setUrl(event.target.value)} />
          </Field>
          <Field label="Events">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px" }}>
              {eventNames.map((ev) => (
                <div className="kv" key={ev} style={{ marginBottom: 0 }}>
                  <Check on={events.includes(ev)} onChange={() => toggle(ev)} label={ev} />
                  <span className="mono" style={{ fontSize: 12 }}>{ev}</span>
                </div>
              ))}
            </div>
          </Field>
        </Modal>
      ) : null}
    </>
  );
}
