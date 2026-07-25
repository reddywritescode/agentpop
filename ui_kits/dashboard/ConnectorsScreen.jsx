const { Button, Icon, StatusBadge, Badge, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } = window.AgentPopDesignSystem_47afa4;

function ConnectorCard({ c, onConnect }) {
  return (
    <Card>
      <CardHeader>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="ricon"><Icon name={c.icon} size={17} /></span>
          <div>
            <CardTitle>{c.name}</CardTitle>
            <CardDescription>{c.desc}</CardDescription>
          </div>
          <span className="spacer"></span>
          {c.connected ? <StatusBadge status="healthy" size="sm" /> : null}
        </div>
      </CardHeader>
      <CardContent>
        {c.connected ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Badge tone="outline" size="sm">{c.account}</Badge>
            <Badge tone="accent" size="sm">{c.grants} grant{c.grants === 1 ? "" : "s"}</Badge>
          </div>
        ) : (
          <span style={{ font: "12px/17px var(--font-sans)", color: "var(--text-tertiary)" }}>Not connected</span>
        )}
      </CardContent>
      <CardFooter>
        {c.connected ? (
          <React.Fragment>
            <Button size="sm" variant="secondary">Edit grants</Button>
            <Button size="sm" variant="ghost">Reconnect</Button>
            <span className="spacer"></span>
            <Button size="sm" variant="danger-outline">Revoke</Button>
          </React.Fragment>
        ) : (
          <Button size="sm" onClick={() => onConnect(c.name)} leadingIcon={<Icon name="plug" />}>Connect</Button>
        )}
      </CardFooter>
    </Card>
  );
}

function ConnectorsScreen() {
  const [list, setList] = React.useState(window.AGENTPOP_DESIGN.connectors);
  const onConnect = (name) => setList((ls) => ls.map((c) => c.name === name ? { ...c, connected: true, account: "sam@acmelabs.dev", grants: 0 } : c));
  const connected = list.filter((c) => c.connected), available = list.filter((c) => !c.connected);
  return (
    <React.Fragment>
      <PageHeader title="Connectors" desc="Centrally governed credentials and tools for your agents." />
      <div className="grantnote">
        <Icon name="shield-check" size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>Agents receive scoped, expiring grants through the connector broker. Provider OAuth tokens never enter a sandbox, and every invocation lands in the audit log.</span>
      </div>
      <h2 style={{ font: "600 15px/22px var(--font-sans)", margin: "0 0 10px" }}>Connected</h2>
      <div className="conngrid" style={{ marginBottom: 24 }}>
        {connected.map((c) => <ConnectorCard key={c.name} c={c} onConnect={onConnect} />)}
      </div>
      <h2 style={{ font: "600 15px/22px var(--font-sans)", margin: "0 0 10px" }}>Available</h2>
      {available.length === 0 ? (
        <EmptyState icon="plug" title="Everything is connected" desc="GitHub, Slack, Gmail, and Google Drive are the launch catalog." />
      ) : (
        <div className="conngrid">
          {available.map((c) => <ConnectorCard key={c.name} c={c} onConnect={onConnect} />)}
        </div>
      )}
    </React.Fragment>
  );
}

Object.assign(window, { ConnectorsScreen });
