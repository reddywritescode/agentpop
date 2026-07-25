import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  StatusBadge,
  Textarea,
} from "@agentpop/ui";
import * as React from "react";
import { Icon } from "../../components/icon";
import { Check, EmptyState, Field, Modal, PageHeader } from "../../components/primitives";
import { useApi, useMutation, useResource } from "../../api/provider";
import type { Connector, ConnectorTool } from "../../api/types";

function ConnectorCard({
  connector,
  busy,
  onConnect,
  onEdit,
  onTest,
  onRevoke,
}: {
  connector: Connector;
  busy: boolean;
  onConnect: (connector: Connector) => void;
  onEdit: (connector: Connector) => void;
  onTest: (connector: Connector) => void;
  onRevoke: (connector: Connector) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="ricon">
            {connector.logoUrl ? (
              <img src={connector.logoUrl} alt="" width={19} height={19} style={{ objectFit: "contain" }} />
            ) : (
              <Icon name={connector.icon} size={17} />
            )}
          </span>
          <div>
            <CardTitle>{connector.name}</CardTitle>
            <CardDescription>{connector.desc}</CardDescription>
          </div>
          <span className="spacer" />
          {connector.connected ? <StatusBadge status="healthy" size="sm" /> : null}
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: connector.connected ? 8 : 0 }}>
          {connector.category ? <Badge tone="outline" size="sm">{connector.category}</Badge> : null}
          {typeof connector.toolsCount === "number" ? (
            <Badge tone="outline" size="sm">{connector.toolsCount.toLocaleString()} tools</Badge>
          ) : null}
        </div>
        {connector.connected ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Badge tone="outline" size="sm">{connector.account}</Badge>
            <Badge tone="accent" size="sm">{connector.grants ?? 0} tool grant{connector.grants === 1 ? "" : "s"}</Badge>
          </div>
        ) : (
          <span style={{ font: "12px/17px var(--font-sans)", color: "var(--text-tertiary)" }}>
            {connector.configured ? "OAuth connection required" : "Platform key not configured"}
          </span>
        )}
      </CardContent>
      <CardFooter>
        {connector.connected ? (
          <>
            <Button size="sm" variant="secondary" onClick={() => onEdit(connector)}>Edit grants</Button>
            <Button size="sm" variant="secondary" onClick={() => onTest(connector)}>Test tool</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onConnect(connector)}>
              {busy ? "Opening…" : "Reconnect"}
            </Button>
            <span className="spacer" />
            <Button size="sm" variant="danger-outline" disabled={busy} onClick={() => onRevoke(connector)}>Revoke</Button>
          </>
        ) : (
          <Button
            size="sm"
            disabled={!connector.configured || busy}
            onClick={() => onConnect(connector)}
            leadingIcon={<Icon name="plug" />}
          >
            {busy ? "Creating Connect Link…" : "Connect with OAuth"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export function Connectors() {
  const { client } = useApi();
  const runMutation = useMutation();
  const [search, setSearch] = React.useState("");
  const { data: list = [], loading, error, reload } = useResource(
    (api) => api.listConnectors({ q: search }),
    [search],
  );
  const [busy, setBusy] = React.useState<string>();
  const [message, setMessage] = React.useState<string>();
  const [edit, setEdit] = React.useState<Connector | null>(null);
  const [account, setAccount] = React.useState("");
  const [actions, setActions] = React.useState<string[]>([]);
  const [testing, setTesting] = React.useState<Connector | null>(null);
  const [tool, setTool] = React.useState("");
  const [argumentsJSON, setArgumentsJSON] = React.useState("{}");
  const [toolResult, setToolResult] = React.useState("");
  const [toolError, setToolError] = React.useState("");
  const [toolCatalog, setToolCatalog] = React.useState<ConnectorTool[]>([]);
  const [toolCatalogLoading, setToolCatalogLoading] = React.useState(false);
  const [toolSearch, setToolSearch] = React.useState("");

  React.useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const connectedID = query.get("connector_connected");
    const connectorError = query.get("connector_error");
    if (connectedID) setMessage(`${connectedID} connected successfully. Its provider token remains in Composio.`);
    if (connectorError) setMessage(`Connector authorization failed: ${connectorError.replaceAll("_", " ")}.`);
  }, []);

  React.useEffect(() => {
    setAccount(edit?.account ?? "");
    setActions(edit?.actions ?? []);
    setToolSearch("");
  }, [edit]);

  React.useEffect(() => {
    setTool(testing?.actions?.find((action) => action !== "*") ?? "");
    setArgumentsJSON("{}");
    setToolResult("");
    setToolError("");
  }, [testing]);

  React.useEffect(() => {
    const connector = edit ?? testing;
    if (!connector) {
      setToolCatalog([]);
      return;
    }
    let active = true;
    setToolCatalogLoading(true);
    client.listConnectorTools(connector.id)
      .then((items) => {
        if (!active) return;
        setToolCatalog(items);
        const firstTool = items[0];
        if (testing && firstTool) setTool((current) => current || firstTool.slug);
      })
      .catch((reason: unknown) => {
        if (active) setMessage(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (active) setToolCatalogLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client, edit, testing]);

  const onConnect = async (connector: Connector) => {
    setBusy(connector.id);
    setMessage(undefined);
    try {
      const authorization = await runMutation((client) => client.connectConnector(connector.id));
      window.location.assign(authorization.authorizationUrl);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : String(reason));
      setBusy(undefined);
    }
  };

  const onRevoke = async (connector: Connector) => {
    if (!window.confirm(`Revoke ${connector.name}? The upstream provider account will be deleted and every agent grant removed.`)) return;
    setBusy(connector.id);
    setMessage(undefined);
    try {
      await runMutation((client) => client.disconnectConnector(connector.id));
      setMessage(`${connector.name} was revoked upstream and removed from every agent.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(undefined);
    }
  };

  const connected = list.filter((connector) => connector.connected);
  const available = list.filter((connector) => !connector.connected);
  const platformConfigured = list.some((connector) => connector.configured);

  return (
    <>
      <PageHeader title="Connectors" desc="Real provider OAuth, centrally governed tool grants, and audited execution.">
        <Button variant="secondary" size="sm" onClick={reload} leadingIcon={<Icon name="refresh-cw" />}>Refresh status</Button>
      </PageHeader>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search 1,000+ Composio connectors"
          aria-label="Search connectors"
        />
        <Badge tone="outline" size="sm">{list.length.toLocaleString()} shown</Badge>
      </div>
      <div className="grantnote">
        <Icon name="shield-check" size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>Agents call the AgentPop broker. Provider OAuth tokens and the Composio platform key never enter a sandbox or browser.</span>
      </div>
      {!platformConfigured && !loading ? (
        <div className="grantnote" style={{ borderColor: "var(--status-warning, #e8a317)" }}>
          <Icon name="alert-triangle" size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span><strong>Connector broker is not configured.</strong> Set the server-only <code>COMPOSIO_API_KEY</code> and restart the connector-broker service.</span>
        </div>
      ) : null}
      {message || error ? (
        <div className="grantnote" role="status">
          <Icon name={error ? "alert-circle" : "info"} size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{message ?? error?.message}</span>
        </div>
      ) : null}

      <h2 style={{ font: "600 15px/22px var(--font-sans)", margin: "0 0 10px" }}>Connected</h2>
      {connected.length === 0 ? (
        <EmptyState icon="plug" title="No provider accounts connected" desc="Choose a provider below. AgentPop will open a Composio Connect Link for its real OAuth flow." />
      ) : (
        <div className="conngrid" style={{ marginBottom: 24 }}>
          {connected.map((connector) => (
            <ConnectorCard
              key={connector.id}
              connector={connector}
              busy={busy === connector.id}
              onConnect={onConnect}
              onEdit={setEdit}
              onTest={setTesting}
              onRevoke={onRevoke}
            />
          ))}
        </div>
      )}

      <h2 style={{ font: "600 15px/22px var(--font-sans)", margin: "24px 0 10px" }}>Available</h2>
      <div className="conngrid">
        {available.map((connector) => (
          <ConnectorCard
            key={connector.id}
            connector={connector}
            busy={busy === connector.id}
            onConnect={onConnect}
            onEdit={setEdit}
            onTest={setTesting}
            onRevoke={onRevoke}
          />
        ))}
      </div>

      {edit ? (
        <Modal
          title={`${edit.name} tool grants`}
          desc="Only checked tools may pass through the broker. Provider credentials remain server-side."
          onClose={() => setEdit(null)}
          footer={
            <>
              <span className="spacer" />
              <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
              <Button onClick={async () => {
                try {
                  await runMutation((client) => client.updateConnector(edit.id, { account, actions }));
                  setEdit(null);
                } catch (reason) {
                  setMessage(reason instanceof Error ? reason.message : String(reason));
                }
              }}>Save grants</Button>
            </>
          }
        >
          <Field label="Connected account label" help="A display label only; OAuth credentials are never returned.">
            <Input value={account} onChange={(event) => setAccount(event.target.value)} />
          </Field>
          <Field label="Allowed Composio tools" help="New connections receive every live tool. Restrict the grant only when an agent needs a smaller capability set.">
            <div style={{ display: "grid", gap: 10 }}>
              <Check
                on={actions.includes("*")}
                onChange={() => setActions((current) => current.includes("*") ? [] : ["*"])}
                label={`Allow every ${edit.toolsCount?.toLocaleString() ?? ""} tool`}
              />
              <Input
                value={toolSearch}
                onChange={(event) => setToolSearch(event.target.value)}
                placeholder="Search tools"
                disabled={actions.includes("*")}
              />
              {toolCatalogLoading ? <span className="help">Loading the live Composio tool catalog…</span> : null}
              <div style={{ display: "grid", gap: 8, maxHeight: 360, overflow: "auto" }}>
              {toolCatalog
                .filter((item) =>
                  !toolSearch.trim() ||
                  `${item.slug} ${item.name} ${item.description ?? ""}`.toLowerCase().includes(toolSearch.trim().toLowerCase()),
                )
                .map((item) => (
                <Check
                  key={item.slug}
                  on={actions.includes("*") || actions.includes(item.slug)}
                  onChange={() => setActions((current) =>
                    current.includes(item.slug)
                      ? current.filter((action) => action !== item.slug)
                      : [...current.filter((action) => action !== "*"), item.slug],
                  )}
                  label={`${item.name} — ${item.slug}`}
                />
              ))}
              </div>
            </div>
          </Field>
        </Modal>
      ) : null}

      {testing ? (
        <Modal
          title={`Test ${testing.name}`}
          desc="This invokes the selected provider tool through the exact broker path used by agents and SDK clients."
          width={680}
          onClose={() => setTesting(null)}
          footer={
            <>
              <span className="spacer" />
              <Button variant="secondary" onClick={() => setTesting(null)}>Close</Button>
              <Button onClick={async () => {
                setToolResult("");
                setToolError("");
                try {
                  const parsed = JSON.parse(argumentsJSON) as Record<string, unknown>;
                  const result = await runMutation((client) =>
                    client.invokeConnector(testing.id, tool, {
                      arguments: parsed,
                      thought: `Manual verification of ${tool} from the AgentPop dashboard`,
                    }),
                  );
                  setToolResult(JSON.stringify(result.result, null, 2));
                } catch (reason) {
                  setToolError(reason instanceof Error ? reason.message : String(reason));
                }
              }}>Run tool</Button>
            </>
          }
        >
          <Field label="Granted tool">
            <select
              value={tool}
              onChange={(event) => setTool(event.target.value)}
              style={{ width: "100%", minHeight: 40, borderRadius: 8, padding: "0 10px", border: "1px solid var(--border-default)", background: "var(--surface-primary)" }}
            >
              {toolCatalog
                .filter((item) => testing.actions?.includes("*") || testing.actions?.includes(item.slug))
                .map((item) => <option key={item.slug} value={item.slug}>{item.name} — {item.slug}</option>)}
            </select>
          </Field>
          <Field label="Arguments JSON" help="Use a harmless read operation for the first live test.">
            <Textarea value={argumentsJSON} onChange={(event) => setArgumentsJSON(event.target.value)} rows={7} />
          </Field>
          {toolError ? <div className="help err">{toolError}</div> : null}
          {toolResult ? (
            <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", borderRadius: 8, padding: 12, background: "var(--surface-secondary)", font: "12px/18px var(--font-mono)" }}>{toolResult}</pre>
          ) : null}
        </Modal>
      ) : null}
    </>
  );
}
