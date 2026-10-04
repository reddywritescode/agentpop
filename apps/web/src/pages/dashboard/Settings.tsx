import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Badge, Button, Input, Select } from "@agentpop/ui";
import { Icon } from "../../components/icon";
import { Field, Meter, Modal, PageHeader } from "../../components/primitives";
import { useMutation, useResource } from "../../api/provider";
import { useAuth } from "../../auth/session";

function ProjectTab() {
  const { session } = useAuth();
  const runMutation = useMutation();
  const { data: project } = useResource((c) => c.getProject(), []);
  const [name, setName] = React.useState(session?.project ?? "production");
  const [region, setRegion] = React.useState("local");
  const [idle, setIdle] = React.useState(900);
  const [ttl, setTtl] = React.useState(0);
  React.useEffect(() => {
    if (!project) return;
    setName(project.name);
    setRegion(project.region);
    setIdle(project.defaultIdleSeconds);
    setTtl(project.defaultTtlSeconds);
  }, [project]);
  const slug = `${session?.org ?? "acme-labs"}/${name}`;
  const [saved, setSaved] = React.useState(false);
  const [del, setDel] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  return (
    <div className="settwrap">
      <Field label="Project name"><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
      <Field label="Project slug" help="Used in API paths and preview hostnames."><Input mono defaultValue={slug} disabled /></Field>
      <Field label="Region" help="New sandboxes are placed in this region by default.">
        <Select options={["local", "us-east", "eu-central"]} value={region} onChange={(event) => setRegion(event.target.value)} />
      </Field>
      <Field label="Default idle policy">
        <Select value={String(idle)} onChange={(event) => setIdle(Number(event.target.value))}>
          <option value="0">no idle pause</option><option value="300">pause after 5 min</option><option value="900">pause after 15 min</option><option value="3600">pause after 1 h</option>
        </Select>
      </Field>
      <Field label="Default sandbox TTL">
        <Select value={String(ttl)} onChange={(event) => setTtl(Number(event.target.value))}>
          <option value="0">none</option><option value="7200">2 h</option><option value="86400">24 h</option><option value="604800">7 days</option>
        </Select>
      </Field>
      <Button leadingIcon={saved ? <Icon name="check" /> : undefined} onClick={async () => {
        await runMutation((c) => c.updateProject({ name, region, defaultIdleSeconds: idle, defaultTtlSeconds: ttl }));
        setSaved(true); setTimeout(() => setSaved(false), 1600);
      }}>{saved ? "Saved" : "Save changes"}</Button>
      <div className="dangerp" style={{ marginTop: 28 }}>
        <div style={{ flex: 1 }}>
          <div className="t">Delete this project</div>
          <div className="d">Destroys every sandbox, connector grant, and key in {slug}.</div>
        </div>
        <Button variant="danger" onClick={() => setDel(true)}>Delete project</Button>
      </div>
      {del ? (
        <Modal
          title="Delete project"
          desc="This destroys all resources in the project. This cannot be undone."
          onClose={() => { setDel(false); setTyped(""); }}
          footer={
            <>
              <span className="spacer" />
              <Button variant="secondary" onClick={() => { setDel(false); setTyped(""); }}>Cancel</Button>
              <Button variant="danger" disabled={typed !== name} leadingIcon={<Icon name="trash-2" />} onClick={async () => {
                await runMutation((c) => c.deleteProject());
                setDel(false); setTyped("");
              }}>Delete project</Button>
            </>
          }
        >
          <Field label={<span>Type <b>{name}</b> to confirm</span>}>
            <Input mono placeholder={name} value={typed} onChange={(e) => setTyped(e.target.value)} />
          </Field>
        </Modal>
      ) : null}
    </div>
  );
}

function MembersTab() {
  const runMutation = useMutation();
  const { data: members = [] } = useResource((c) => c.listMembers(), []);
  const { data: catalog } = useResource((c) => c.getCatalog(), []);
  const roles = catalog?.roles ?? [];
  const [invite, setInvite] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState("Developer");

  const send = () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    void runMutation((c) => c.inviteMember(email, role));
    setInvite(false);
    setEmail("");
  };

  return (
    <>
      <div className="toolbar">
        <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)" }}>{members.length} members · roles follow the org → project hierarchy</span>
        <span className="spacer" />
        <Button size="sm" leadingIcon={<Icon name="user-plus" />} onClick={() => setInvite(true)}>Invite member</Button>
      </div>
      <div className="rows">
        {members.map((m) => (
          <div className="rrow" key={m.email}>
            <div className="rrow-main" style={{ padding: "10px 16px" }}>
              <span className="avatar">{m.name.split(".").map((x) => x[0]).join("").toUpperCase().slice(0, 2)}</span>
              <div className="rcol" style={{ minWidth: 200 }}>
                <div className="rname" style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
                  {m.name}
                  {m.pending ? <Badge tone="warning" size="sm">pending</Badge> : null}
                  {m.mfa ? <Badge tone="success" size="sm">MFA</Badge> : <Badge tone="neutral" size="sm">no MFA</Badge>}
                </div>
                <div className="rmeta" style={{ fontFamily: "var(--font-sans)" }}><span>{m.email}</span><span>{m.joined}</span></div>
              </div>
              <span className="spacer" />
              <div style={{ width: 210 }}>
                <Select options={roles} value={m.role} disabled={m.role.toLowerCase().includes("owner")} onChange={(e) => void runMutation((c) => c.updateMember(m.email, { role: e.target.value }))} aria-label={"Role for " + m.name} />
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Remove member" title={m.role.toLowerCase().includes("owner") ? "The owner cannot be removed" : "Remove"} disabled={m.role.toLowerCase().includes("owner")} onClick={() => void runMutation((c) => c.removeMember(m.email))}>
                <Icon name="user-minus" size={15} />
              </Button>
            </div>
          </div>
        ))}
      </div>
      {invite ? (
        <Modal
          title="Invite member"
          desc="Invites expire after 7 days."
          onClose={() => setInvite(false)}
          footer={
            <>
              <span className="spacer" />
              <Button variant="secondary" onClick={() => setInvite(false)}>Cancel</Button>
              <Button leadingIcon={<Icon name="send" />} onClick={send}>Send invite</Button>
            </>
          }
        >
          <Field label="Email"><Input placeholder="teammate@acmelabs.dev" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Role" help="Owner and admin act at the organization level; developer, operator, and viewer are per-project.">
            <Select options={roles.slice(1)} value={role} onChange={(e) => setRole(e.target.value)} />
          </Field>
        </Modal>
      ) : null}
    </>
  );
}

function BillingTab() {
  const runMutation = useMutation();
  const { data: subscription } = useResource((c) => c.getSubscription(), []);
  const plan = subscription?.plan;
  const [checkoutError, setCheckoutError] = React.useState("");
  return (
    <div className="settwrap" style={{ maxWidth: 720 }}>
      <div className="panel">
        <h3>
          {plan?.name ?? "AgentPop Pro"}
          <span className="spacer" />
          <Badge tone="accent" size="sm">fixed subscription</Badge>
        </h3>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "8px 0 4px" }}>
          <span style={{ font: "650 36px/42px var(--font-sans)" }}>${plan?.price ?? 20}</span>
          <span style={{ color: "var(--text-secondary)", font: "13px/18px var(--font-sans)" }}>/ month</span>
        </div>
        <div style={{ color: "var(--text-secondary)", font: "13px/19px var(--font-sans)", marginBottom: 16 }}>
          One simple plan for the hosted product. There are no prepaid credits and no customer-facing usage currency.
        </div>
        <div className="ftable" style={{ boxShadow: "none", marginBottom: 16 }}>
          {(plan?.includes ?? [
            "Agent and environment marketplace",
            "Firecracker sandbox orchestration",
            "API, MCP, CLI, and SDK access",
            "Connector broker and encrypted secrets",
          ]).map((item) => (
            <div className="frow" key={item}>
              <Icon name="check" size={15} style={{ color: "var(--success)" }} />
              <span style={{ font: "500 13px/18px var(--font-sans)" }}>{item}</span>
            </div>
          ))}
        </div>
        <Button
          leadingIcon={<Icon name="credit-card" />}
          onClick={() => {
            setCheckoutError("");
            void runMutation((c) => c.createSubscriptionCheckout())
              .then(({ url }) => window.location.assign(url))
              .catch((error: unknown) => setCheckoutError(error instanceof Error ? error.message : String(error)));
          }}
        >
          Subscribe for $20/month
        </Button>
        {checkoutError ? <div className="help err" style={{ marginTop: 10 }}>{checkoutError}</div> : null}
        {subscription?.status === "development" ? (
          <div className="grantnote" style={{ marginTop: 14 }}>
            <Icon name="wrench" size={15} />
            Local development mode: set <span className="mono">STRIPE_CHECKOUT_URL</span> to enable hosted checkout.
          </div>
        ) : null}
      </div>
      <div className="help" style={{ marginTop: 12 }}>
        Self-hosters can run the open-source control plane without AgentPop billing. Infrastructure costs remain their responsibility.
      </div>
    </div>
  );
}

function QuotasTab() {
  const { data: quotas = [] } = useResource((c) => c.getQuotas(), []);
  const runMutation = useMutation();
  const [sent, setSent] = React.useState(false);
  return (
    <div className="settwrap" style={{ maxWidth: 640 }}>
      <div className="grantnote">
        <Icon name="shield" size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        Quotas cap concurrent workloads to protect platform capacity. Hard caps live at the organization level; this shows the current project.
      </div>
      <div className="panel">
        {quotas.map((q) => {
          const pct = Math.round((q.used / q.cap) * 100);
          return (
            <Meter
              key={q.label}
              label={<>{q.label}{q.note ? <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}> · {q.note}</span> : null}</>}
              value={`${q.used}${q.unit ? " " + q.unit : ""} / ${q.cap}${q.unit ? " " + q.unit : ""}`}
              pct={pct}
              warn={pct > 75}
            />
          );
        })}
      </div>
      <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
        <Button size="sm" variant="secondary" leadingIcon={<Icon name={sent ? "check" : "arrow-up-right"} />} disabled={sent} onClick={async () => {
          await runMutation((c) => c.requestQuotaIncrease());
          setSent(true);
        }}>{sent ? "Request sent" : "Request an increase"}</Button>
        <span style={{ font: "12px/16px var(--font-sans)", color: "var(--text-tertiary)" }}>Reviewed within one business day.</span>
      </div>
    </div>
  );
}

const TABS: [string, string][] = [
  ["project", "Project"],
  ["members", "Members"],
  ["billing", "Subscription"],
  ["quotas", "Quotas"],
];

export function Settings() {
  const [params] = useSearchParams();
  const { session } = useAuth();
  const [tab, setTab] = React.useState(params.get("tab") || "project");
  return (
    <>
      <PageHeader title="Settings" desc={`Project configuration, membership, subscription, and quotas for ${session?.org ?? "acme-labs"}/${session?.project ?? "production"}.`} />
      <div className="tabs">
        {TABS.map(([k, l]) => (
          <button key={k} className={"tab" + (tab === k ? " active" : "")} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === "project" ? <ProjectTab /> : null}
      {tab === "members" ? <MembersTab /> : null}
      {tab === "billing" ? <BillingTab /> : null}
      {tab === "quotas" ? <QuotasTab /> : null}
    </>
  );
}
