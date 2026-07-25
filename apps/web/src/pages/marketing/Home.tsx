import { useNavigate } from "react-router-dom";
import { Badge, Button } from "@agentpop/ui";
import { Icon } from "../../components/icon";

const FEATURES = [
  { i: "box", t: "Firecracker microVMs", d: "Every sandbox is a jailed microVM with its own kernel, cgroups, and nftables chain — not a container." },
  { i: "zap", t: "Ready in seconds", d: "Launch a clean runtime on demand, execute immediately, then pause or destroy it when the job is done." },
  { i: "bot", t: "Agents are sandbox recipes", d: "Deploy long-running agents from the same Dockerfile-backed marketplace and manage them with the same terminal, files, logs, ports, and SSH workflow." },
  { i: "plug", t: "Connector broker", d: "Agents get scoped, audited access to GitHub, Slack, Gmail, and Drive — OAuth tokens never enter the VM." },
  { i: "network", t: "Networks, storage, previews", d: "Private WireGuard networks, encrypted S3-compatible volumes, and public HTTPS preview URLs per port." },
  { i: "scroll-text", t: "Audit everything", d: "Every create, exec, and connector call lands in the audit log with HMAC-signed webhooks." },
];

const TIERS = [
  {
    n: "Open source",
    p: "$0",
    e: "self-hosted",
    items: ["Apache-2.0 control and data planes", "Dashboard, API, MCP, CLI, and SDKs", "You operate the infrastructure"],
    cta: "Self-host AgentPop",
    v: "secondary" as const,
    mode: "#opensource",
  },
  {
    n: "AgentPop Pro",
    p: "$20",
    e: "/ month, fixed",
    hi: true,
    items: ["No prepaid credits or usage currency", "Managed sandbox and agent marketplace", "Hosted connectors, previews, and developer APIs"],
    cta: "Get AgentPop Pro",
    v: "primary" as const,
    mode: "/signup",
  },
];

const check = <Icon name="check" size={16} style={{ color: "var(--success-fg)", flexShrink: 0, marginTop: 2 }} />;

export function Home() {
  const navigate = useNavigate();
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="mkt" id="top">
      <header className="topbar">
        <div className="wrap">
          <a href="#top" className="wordmark" style={{ textDecoration: "none" }} onClick={(e) => { e.preventDefault(); scrollTo("top"); }}>
            <span className="mark">P</span>AgentPop
          </a>
          <nav className="navlinks">
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo("features"); }}>Features</a>
            <a href="#opensource" onClick={(e) => { e.preventDefault(); scrollTo("opensource"); }}>Open source</a>
            <a href="#pricing" onClick={(e) => { e.preventDefault(); scrollTo("pricing"); }}>Pricing</a>
          </nav>
          <Button variant="ghost" size="sm" leadingIcon={<Icon name="github" />} onClick={() => scrollTo("opensource")}>Source & setup</Button>
          <Button variant="secondary" size="sm" onClick={() => navigate("/signin")}>Sign in</Button>
          <Button size="sm" onClick={() => navigate("/signup")}>Get started</Button>
        </div>
      </header>
      <main>
        <section className="hero wrap">
          <Badge tone="accent" icon={<Icon name="sparkles" size={12} />}>Open source · hosted alpha</Badge>
          <h1>Run untrusted and agent-generated code in isolated microVMs</h1>
          <p>An open-source execution platform: Firecracker sandboxes with private networks, persistent storage, preview URLs, and a connector broker that never hands your OAuth tokens to an agent.</p>
          <div className="ctas">
            <Button size="lg" leadingIcon={<Icon name="box" />} onClick={() => navigate("/signup")}>Create a sandbox</Button>
            <Button size="lg" variant="secondary" leadingIcon={<Icon name="terminal" />} onClick={() => scrollTo("opensource")}>Self-host it</Button>
          </div>
          <div className="termcard">
            <div className="th"><span /><span /><span /></div>
            <pre>{"$ "}<span className="g">agentpop</span> sandbox create --image devbox:1 --size s-1vcpu-2gb{"\n"}<span className="c">sb-01ky47z9f7  provisioning → running</span>{"\n"}{"$ "}<span className="g">agentpop</span> exec sb-01ky47z9f7 -- python3 untrusted.py{"\n"}<span className="c"># runs jailed: own kernel, controlled egress, full audit trail</span>{"\n"}{"$ "}<span className="g">agentpop</span> port expose sb-01ky47z9f7 8080{"\n"}<span className="b">https://preview.agentpop.cloud/preview/sb-01ky47z9f7/8080/</span></pre>
          </div>
        </section>
        <section className="sect" id="features">
          <div className="wrap">
            <h2>Isolation first, everything else attached</h2>
            <p className="lead">The platform runs one Firecracker process per tenant behind a jailer, with host-side network policy — because agents will run code you didn't review.</p>
            <div className="fgrid">
              {FEATURES.map((f) => (
                <div className="fcard" key={f.t}>
                  <span className="fi"><Icon name={f.i} size={17} /></span>
                  <div className="ft">{f.t}</div>
                  <div className="fd">{f.d}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="sect" id="opensource">
          <div className="wrap oss">
            <div>
              <h2>Open core, honestly drawn</h2>
              <p className="lead">The runtime, dashboard, CLI, SDKs, templates, and connector spec are Apache-2.0. You pay us to operate it — or run the same core yourself.</p>
              <ul>
                <li>{check}API, scheduler, host agent, and Firecracker lifecycle in the community repo</li>
                <li>{check}Docker Compose, systemd, Caddy, and GCP reference deployments</li>
                <li>{check}TypeScript, Python, and Go SDKs generated from OpenAPI 3.1</li>
                <li>{check}Hosted cloud adds managed operations, TLS routing, connector brokering, and the fixed subscription</li>
              </ul>
              <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
                <Button variant="secondary" leadingIcon={<Icon name="terminal" />} onClick={() => navigate("/signup")}>Start hosted</Button>
                <Button variant="ghost" leadingIcon={<Icon name="book-open" />} onClick={() => window.location.assign("/openapi.yaml")}>Read the API</Button>
              </div>
            </div>
            <div className="termcard" style={{ margin: 0 }}>
              <div className="th"><span /><span /><span /></div>
              <pre><span className="c"># single-host community deployment</span>{"\n"}{"$ "}git clone https://github.com/reddywritescode/agentpop{"\n"}{"$ "}cd agentpop && docker compose up -d{"\n"}<span className="c"># dashboard + API, using Docker locally</span>{"\n"}{"$ "}<span className="g">agentpop</span> host list</pre>
            </div>
          </div>
        </section>
        <section className="sect" id="pricing">
          <div className="wrap">
            <h2>One hosted price. The open-source core stays free.</h2>
            <p className="lead">AgentPop Pro is a fixed $20 monthly subscription. There are no prepaid credits and no customer-facing usage currency. Self-hosters only pay their own infrastructure provider.</p>
            <div className="pgrid">
              {TIERS.map((t) => (
                <div className={"pcard" + (t.hi ? " hi" : "")} key={t.n}>
                  <div className="pn">{t.n}{t.hi ? <Badge tone="accent" size="sm">popular</Badge> : null}</div>
                  <div className="pp">{t.p} <em>{t.e}</em></div>
                  <ul>{t.items.map((x) => <li key={x}>{check}{x}</li>)}</ul>
                  <Button
                    variant={t.v}
                    style={{ width: "100%" }}
                    onClick={() => t.mode.startsWith("#") ? scrollTo(t.mode.slice(1)) : navigate(t.mode)}
                  >
                    {t.cta}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="foot">
        <div className="wrap">
          <span className="wordmark" style={{ font: "600 13px/18px var(--font-sans)" }}>
            <span className="mark" style={{ width: 20, height: 20, fontSize: 10 }}>P</span>AgentPop
          </span>
          <span>Apache-2.0 core · © 2026</span>
          <span style={{ flex: 1 }} />
          <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo("features"); }}>Features</a>
          <a href="#pricing" onClick={(e) => { e.preventDefault(); scrollTo("pricing"); }}>Pricing</a>
          <a href="/signin" onClick={(e) => { e.preventDefault(); navigate("/signin"); }}>Sign in</a>
        </div>
      </footer>
    </div>
  );
}
