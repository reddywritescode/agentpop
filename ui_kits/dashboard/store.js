// Shared mock store + actions: lets list, detail, overview, settings, and sidebar stay in sync.
(function () {
  var AGENTPOP_DESIGN = window.AGENTPOP_DESIGN;
  AGENTPOP_DESIGN.roles = ["Organization owner", "Organization admin", "Project developer", "Project operator", "Project viewer"];
  AGENTPOP_DESIGN.members = [
    { name: "sam.ortiz", email: "sam@acmelabs.dev", role: "Organization owner", mfa: true, joined: "Nov 2025" },
    { name: "mara.chen", email: "mara@acmelabs.dev", role: "Organization admin", mfa: true, joined: "Dec 2025" },
    { name: "dev.patel", email: "dev@acmelabs.dev", role: "Project developer", mfa: true, joined: "Jan 2026" },
    { name: "rio.tanaka", email: "rio@acmelabs.dev", role: "Project operator", mfa: false, joined: "Mar 2026" },
    { name: "ana.silva", email: "ana@acmelabs.dev", role: "Project viewer", mfa: true, joined: "Jun 2026" },
  ];
  AGENTPOP_DESIGN.meters = [
    { label: "vCPU-seconds", used: "412,806", pct: 61, cost: 24.77, unit: "0.00006 cr/s" },
    { label: "Memory GiB-seconds", used: "1,651,224", pct: 48, cost: 41.28, unit: "0.000025 cr/GiB-s" },
    { label: "Disk GiB-hours", used: "8,140", pct: 33, cost: 16.28, unit: "0.002 cr/GiB-h" },
    { label: "Snapshot GiB-months", used: "22.4", pct: 18, cost: 5.6, unit: "0.25 cr/GiB-mo" },
    { label: "Internet egress GiB", used: "64.2", pct: 26, cost: 30.19, unit: "0.47 cr/GiB" },
  ];
  AGENTPOP_DESIGN.quotas = [
    { label: "Active sandboxes", used: 12, cap: 40, note: "running + provisioning" },
    { label: "vCPU in use", used: 9, cap: 32 },
    { label: "Active memory", used: 18, cap: 64, unit: "GiB" },
    { label: "Sandbox disk", used: 310, cap: 1024, unit: "GB" },
    { label: "Preview URLs", used: 6, cap: 25 },
    { label: "Webhook endpoints", used: 1, cap: 10 },
  ];
  AGENTPOP_DESIGN.files = [
    { name: "workdir", dir: true, size: "—", mtime: "2 minutes ago" },
    { name: "node_modules", dir: true, size: "—", mtime: "2 hours ago" },
    { name: "agent.js", size: "4.1 KB", mtime: "2 minutes ago" },
    { name: "package.json", size: "1.2 KB", mtime: "2 hours ago" },
    { name: "package-lock.json", size: "182 KB", mtime: "2 hours ago" },
    { name: ".env", size: "96 B", mtime: "2 hours ago" },
  ];
  AGENTPOP_DESIGN.agentLogs = [
    "[06:12:04] agent booted · openclaw-compatible v1",
    "[06:12:05] model claude-sonnet-4-5 · secret/anthropic-prod (reference, never injected)",
    "[06:12:05] connector grant ok: github (repo:read, issues:write) via broker",
    "[06:12:06] connector grant ok: slack (chat:write #ops)",
    "[06:12:11] watching #ops for triage requests",
    "[06:14:32] task complete · acme/api#4812 labeled needs-repro",
    "[06:41:07] idle · heartbeat ok · generation 3",
  ];

  var state = { sandboxes: AGENTPOP_DESIGN.sandboxes.slice(), agents: AGENTPOP_DESIGN.agents.slice(), members: AGENTPOP_DESIGN.members.slice(), credits: 412.06 };
  var subs = [];
  function emit() { subs.forEach(function (f) { f(); }); }
  window.AGENTPOP_DESIGNStore = {
    get: function () { return state; },
    set: function (patch) { state = Object.assign({}, state, typeof patch === "function" ? patch(state) : patch); emit(); },
    sub: function (f) { subs.push(f); return function () { subs = subs.filter(function (x) { return x !== f; }); }; },
  };

  var S = window.AGENTPOP_DESIGNStore;
  function setSb(id, patch) { S.set(function (s) { return { sandboxes: s.sandboxes.map(function (x) { return x.id === id ? Object.assign({}, x, patch) : x; }) }; }); }
  function agentSet(name, patch) { S.set(function (s) { return { agents: s.agents.map(function (a) { return a.name === name ? Object.assign({}, a, patch) : a; }) }; }); }
  function newId() { return "sb-01" + Math.random().toString(36).slice(2, 26); }
  function create(props) {
    var nb = Object.assign({ id: newId(), name: "sandbox", status: "provisioning", size: "1 vCPU · 2 GiB", disk: "10 GB", template: "devbox:1", ip: "—", age: "just now", idle: "pause after 15 min", ports: [] }, props);
    S.set(function (s) { return { sandboxes: [nb].concat(s.sandboxes) }; });
    setTimeout(function () { setSb(nb.id, { status: "running", ip: "10.64.0." + (20 + Math.floor(Math.random() * 60)) }); }, 2600);
    return nb;
  }
  window.AGENTPOP_DESIGNActions = {
    setSb: setSb,
    agentSet: agentSet,
    create: create,
    pause: function (id) { setSb(id, { status: "pausing" }); setTimeout(function () { setSb(id, { status: "paused" }); }, 1500); },
    resume: function (id) { setSb(id, { status: "resuming" }); setTimeout(function () { setSb(id, { status: "running" }); }, 1700); },
    destroy: function (id) { S.set(function (s) { return { sandboxes: s.sandboxes.filter(function (x) { return x.id !== id; }) }; }); },
    fork: function (sb) {
      var nb = Object.assign({}, sb, { id: newId(), name: (sb.name + "-fork").slice(0, 22), status: "provisioning", ip: "—", age: "just now", ports: [] });
      S.set(function (s) { return { sandboxes: [nb].concat(s.sandboxes) }; });
      setTimeout(function () { setSb(nb.id, { status: "running", ip: "10.64.0." + (20 + Math.floor(Math.random() * 60)) }); }, 2600);
      return nb;
    },
    deployAgent: function (o) {
      var vm = create({ name: (o.name + "-vm").slice(0, 22), template: "openclaw:1", size: o.size || "1 vCPU · 2 GiB" });
      var a = { name: o.name, template: "openclaw-compatible", model: o.model || "claude-sonnet-4-5", status: "deploying", sandbox: vm.id, connectors: o.connectors || [], age: "just now" };
      S.set(function (s) { return { agents: [a].concat(s.agents) }; });
      setTimeout(function () { agentSet(o.name, { status: "running", age: "up 1 minute" }); }, 3000);
      return a;
    },
    stopAgent: function (name) { agentSet(name, { status: "stopped", age: "stopped just now" }); },
    restartAgent: function (name) { agentSet(name, { status: "deploying", age: "just now" }); setTimeout(function () { agentSet(name, { status: "running", age: "up 1 minute" }); }, 2200); },
    addCredits: function (n) { S.set(function (s) { return { credits: +(s.credits + n).toFixed(2) }; }); },
  };
})();
