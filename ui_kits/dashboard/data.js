window.AGENTPOP_DESIGN = {
  org: { name: "acme-labs", project: "production" },
  user: { name: "sam.ortiz", email: "sam@acmelabs.dev", credits: "412.06" },
  sizes: [
    { id: "s-0.25vcpu-512mb", cpu: "0.25 vCPU", ram: "512 MiB" },
    { id: "s-0.5vcpu-1gb", cpu: "0.5 vCPU", ram: "1 GiB" },
    { id: "s-1vcpu-2gb", cpu: "1 vCPU", ram: "2 GiB" },
    { id: "s-2vcpu-4gb", cpu: "2 vCPU", ram: "4 GiB" },
  ],
  sandboxes: [
    { id: "sb-01ky47z9f7xww4gmqjxj69s6wy", name: "api-smoke-tests", status: "running", size: "1 vCPU · 2 GiB", disk: "10 GB", template: "devbox:1", ip: "10.64.0.14", age: "21 seconds ago", idle: "pause after 15 min", ports: [{ port: 8080, url: "https://sb-01ky47z9f7-8080.preview.agentpop.cloud" }] },
    { id: "sb-01ky3vq2mlh8trwd0p4c9xn2ee", name: "agent-workdir", status: "running", size: "2 vCPU · 4 GiB", disk: "20 GB", template: "python-ml:3", ip: "10.64.0.9", age: "2 hours ago", idle: "no idle pause", ports: [] },
    { id: "sb-01ky2rr8vbn5jqzc7t1m3ka9od", name: "pr-4812-preview", status: "provisioning", size: "0.5 vCPU · 1 GiB", disk: "10 GB", template: "devbox:1", ip: "—", age: "just now", idle: "TTL 2 h", ports: [] },
    { id: "sb-01kxzt5dwqp2necx8g6f0hj4ma", name: "nightly-scraper", status: "paused", size: "0.25 vCPU · 512 MiB", disk: "5 GB", template: "node-lts:2", ip: "10.64.0.31", age: "3 days ago", idle: "pause after 5 min", ports: [] },
    { id: "sb-01kxy0b3rfm9uslz2w7q5vd8ct", name: "gpu-eval", status: "failed", size: "2 vCPU · 4 GiB", disk: "40 GB", template: "custom-cuda:1", ip: "—", age: "5 days ago", idle: "no idle pause", ports: [] },
  ],
  templates: [
    { name: "devbox", version: "v1", arch: "x86_64", size: "412 MB", status: "healthy", updated: "2 days ago", used: 38 },
    { name: "python-ml", version: "v3", arch: "x86_64", size: "1.9 GB", status: "healthy", updated: "6 days ago", used: 12 },
    { name: "node-lts", version: "v2", arch: "arm64", size: "608 MB", status: "healthy", updated: "2 weeks ago", used: 9 },
    { name: "custom-cuda", version: "v1", arch: "x86_64", size: "4.2 GB", status: "failed", updated: "5 days ago", used: 1 },
  ],
  networks: [
    { name: "agents-internal", id: "net-01ky480q3k3wt5nrgyjvg0x7vw", cidr: "10.72.0.0/24", region: "us-east", members: 3, updated: "1 minute ago" },
    { name: "scraper-pool", id: "net-01kx9m2dfe8bqal4c5rz7ws3hn", cidr: "10.72.1.0/24", region: "us-east", members: 1, updated: "4 days ago" },
  ],
  storages: [
    { name: "my-data", endpoint: "https://s3.amazonaws.com", bucket: "acme-agent-artifacts", region: "us-east-1", attached: 2, health: "healthy", checked: "5 minutes ago" },
  ],
  webhooks: [
    { url: "https://ops.acmelabs.dev/hooks/sandbox", events: ["sandbox.created", "sandbox.failed", "agent.stopped"], status: "active", last: "delivered 12 min ago" },
  ],
  audit: [
    { action: "Sandbox create", kind: "create", tone: "success", resource: "sb-01ky47z9f7xww4gmqjxj69s6wy", actor: "sam.ortiz", ip: "203.0.113.7", result: "ok", time: "2 minutes ago" },
    { action: "API key create", kind: "create", tone: "success", resource: "key-ci-deploys", actor: "sam.ortiz", ip: "203.0.113.7", result: "ok", time: "1 hour ago" },
    { action: "Connector grant update", kind: "update", tone: "info", resource: "grant-github-issues", actor: "mara.chen", ip: "198.51.100.23", result: "ok", time: "3 hours ago" },
    { action: "Sandbox destroy", kind: "destroy", tone: "danger", resource: "sb-01kxv8p1qgd4hjwm6y2t9zb5rk", actor: "agent:issue-triage", ip: "10.64.0.9", result: "ok", time: "yesterday" },
    { action: "Sandbox exec", kind: "exec", tone: "neutral", resource: "sb-01ky3vq2mlh8trwd0p4c9xn2ee", actor: "agent:issue-triage", ip: "10.64.0.9", result: "denied", time: "yesterday" },
  ],
  agents: [
    { name: "issue-triage", template: "openclaw-compatible", model: "claude-sonnet-4-5", status: "running", sandbox: "sb-01ky3vq2mlh8trwd0p4c9xn2ee", connectors: ["GitHub", "Slack"], age: "up 6 days" },
    { name: "inbox-digest", template: "openclaw-compatible", model: "claude-haiku-4-5", status: "deploying", sandbox: "sb-01ky2rr8vbn5jqzc7t1m3ka9od", connectors: ["Gmail"], age: "just now" },
  ],
  connectors: [
    { name: "GitHub", icon: "github", desc: "Repos, issues, pull requests", connected: true, account: "acme-labs (org)", grants: 2, health: "healthy" },
    { name: "Slack", icon: "slack", desc: "Channels and messages", connected: true, account: "acmelabs.slack.com", grants: 1, health: "healthy" },
    { name: "Gmail", icon: "mail", desc: "Read and send mail", connected: false },
    { name: "Google Drive", icon: "hard-drive", desc: "Files and folders", connected: false },
  ],
  events: ["sandbox.created", "sandbox.running", "sandbox.paused", "sandbox.resumed", "sandbox.destroyed", "sandbox.failed", "agent.deployed", "agent.stopped", "agent.failed", "connector.grant.changed"],
  scopes: ["sandbox:write", "sandbox:exec", "connector:invoke", "audit:read"],
};
