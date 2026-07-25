import type { ApiClient } from "./client";
import type {
  Agent,
  AgentPackage,
  AgentSecrets,
  ApiKey,
  AuditEvent,
  Billing,
  Catalog,
  Connector,
  ConnectorTool,
  ConnectorAuthorization,
  ConnectorInvocation,
  CreateSandboxInput,
  CreateEvalSuiteInput,
  CreateStorageInput,
  CreateTemplateInput,
  DeployAgentInput,
  Member,
  MarketplaceRecipe,
  GeneratedRecipe,
  Network,
  EvalRun,
  EvalSuite,
  PlatformHealth,
  Port,
  ProjectSettings,
  Quota,
  Sandbox,
  SandboxEvent,
  SandboxLogEntry,
  SandboxMetrics,
  SSHAccess,
  Storage,
  Template,
  TemplateBuild,
  Subscription,
  Webhook,
} from "./types";

export interface HttpClientOptions {
  baseUrl: string;
  token?: string;
}

interface ItemEnvelope<T> {
  items: T[];
}

interface WireRuntime {
  privateIp?: string;
}

interface WireSandbox {
  id: string;
  name: string;
  kind?: "agent" | "sandbox";
  recipeId?: string;
  secretNames?: string[];
  status: Sandbox["status"];
  image: string;
  region: string;
  vcpu: number;
  memoryMb: number;
  diskGb: number;
  pauseWhenIdle: boolean;
  publicWeb: boolean;
  idleTimeoutSec?: number;
  ttlSeconds?: number;
  lifecycle?: "persistent" | "ephemeral";
  runtime?: WireRuntime;
  ports?: Port[];
  createdAt: string;
}

interface WireAgent {
  name: string;
  template: string;
  model: string;
  status: Agent["status"];
  sandboxId: string;
  connectors?: string[];
  secretNames?: string[];
  createdAt: string;
}

interface WireConnector {
  id: string;
  name: string;
  category?: string;
  description: string;
  logoUrl?: string;
  toolsCount?: number;
  configured: boolean;
  connected: boolean;
  status?: string;
  account?: string;
  actions: string[];
  availableActions?: string[];
}

interface WireTemplate {
  id: string;
  name: string;
  description?: string;
  version: number;
  versionLabel: string;
  architecture?: string;
  status: string;
  source: Template["source"];
  deprecated: boolean;
  imageRef?: string;
  sizeMb?: number;
  latestBuildId?: string;
  error?: string;
  definition?: string;
  usedBy?: number;
  updatedAt?: string;
}

const mapTemplate = (template: WireTemplate): Template => ({
  id: template.id,
  name: template.name,
  description: template.description,
  version: template.version,
  versionLabel: template.versionLabel,
  arch: template.architecture || "multi-arch",
  size: template.sizeMb ? `${template.sizeMb} MB` : "—",
  sizeMb: template.sizeMb,
  status: template.status,
  source: template.source,
  deprecated: template.deprecated,
  imageRef: template.imageRef,
  latestBuildId: template.latestBuildId,
  error: template.error,
  definition: template.definition,
  updated: template.updatedAt ? relativeAge(template.updatedAt) : "built-in",
  used: template.usedBy ?? 0,
});

interface WireAuditEvent {
  action: string;
  resource: string;
  resourceId: string;
  actor: string;
  result: string;
  createdAt: string;
}

const relativeAge = (value: string) => {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  if (elapsed < 60_000) return "now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m`;
  return `${Math.floor(elapsed / 3_600_000)}h`;
};

const mapSandbox = (sandbox: WireSandbox): Sandbox => ({
  id: sandbox.id,
  name: sandbox.name,
  kind: sandbox.kind,
  recipeId: sandbox.recipeId,
  secretNames: sandbox.secretNames ?? [],
  status: sandbox.status,
  size: `${sandbox.vcpu} vCPU · ${sandbox.memoryMb >= 1024 ? `${sandbox.memoryMb / 1024} GiB` : `${sandbox.memoryMb} MiB`}`,
  disk: `${sandbox.diskGb} GB`,
  template: sandbox.image,
  ip: sandbox.runtime?.privateIp ?? "pending",
  age: relativeAge(sandbox.createdAt),
  idle: sandbox.pauseWhenIdle ? `${sandbox.idleTimeoutSec ?? 900}s` : "Never",
  pauseWhenIdle: sandbox.pauseWhenIdle,
  publicWeb: sandbox.publicWeb,
  idleTimeoutSec: sandbox.idleTimeoutSec ?? 0,
  ttlSeconds: sandbox.ttlSeconds ?? 0,
  lifecycle: sandbox.lifecycle ?? (sandbox.ttlSeconds ? "ephemeral" : "persistent"),
  region: sandbox.region,
  ports: sandbox.ports ?? [],
});

const resourcesForSize = (size: string) => {
  const known: Record<string, { vcpu: number; memoryMb: number }> = {
    "s-0.25vcpu-512mb": { vcpu: 0.25, memoryMb: 512 },
    "s-0.5vcpu-1gb": { vcpu: 0.5, memoryMb: 1024 },
    "s-1vcpu-1gb": { vcpu: 1, memoryMb: 1024 },
    "s-2vcpu-4gb": { vcpu: 2, memoryMb: 4096 },
  };
  return known[size] ?? resourcesForLabel(size);
};

const resourcesForLabel = (label: string) => {
  const cpu = Number.parseFloat(label.match(/([\d.]+)\s*vCPU/i)?.[1] ?? "1");
  const memoryValue = Number.parseFloat(label.match(/([\d.]+)\s*(GiB|MiB)/i)?.[1] ?? "1");
  const memoryUnit = label.match(/[\d.]+\s*(GiB|MiB)/i)?.[1]?.toLowerCase();
  return { vcpu: cpu, memoryMb: memoryUnit === "mib" ? memoryValue : memoryValue * 1024 };
};

const mapConnector = (connector: WireConnector): Connector => ({
  id: connector.id,
  name: connector.name,
  icon: connector.id,
  desc: connector.description,
  category: connector.category,
  logoUrl: connector.logoUrl,
  toolsCount: connector.toolsCount,
  configured: connector.configured,
  connected: connector.connected,
  status: connector.status,
  account: connector.account,
  grants: connector.actions.includes("*") ? connector.toolsCount ?? connector.actions.length : connector.actions.length,
  actions: connector.actions,
  availableActions: connector.availableActions ?? connector.actions,
  health: connector.connected ? "healthy" : undefined,
});

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * REST client for a real control-plane API (docs §5). Every resource operation
 * is HTTPS JSON; mutations send an Idempotency-Key. Streaming (terminal/exec via
 * WebSocket, logs/events via SSE) is out of scope for this typed CRUD layer and
 * is layered on separately when the backend lands.
 *
 * This is intentionally thin and side-effect-free: no caching, no global state.
 */
export class HttpApiClient implements ApiClient {
  private readonly baseUrl: string;
  private readonly token?: string;

  constructor(opts: HttpClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.token = opts.token;
  }

  private idempotencyKey(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return "idem-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  private async request<T>(path: string, init: RequestInit = {}, mutation = false): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body) headers.set("Content-Type", "application/json");
    if (this.token) headers.set("Authorization", `Bearer ${this.token}`);
    if (mutation) headers.set("Idempotency-Key", this.idempotencyKey());

    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers, credentials: "include" });
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    let body: unknown;
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        const preview = text.replace(/\s+/g, " ").slice(0, 160);
        throw new ApiError(
          res.status,
          `AgentPop endpoint returned a non-JSON response${preview ? `: ${preview}` : ""}`,
          text,
        );
      }
    }
    if (!res.ok) {
      const message =
        body && typeof body === "object" && "message" in body
          ? String((body as { message: unknown }).message)
          : body && typeof body === "object" && "error" in body
            ? String((body as { error: unknown }).error)
          : `${res.status} ${res.statusText}`;
      throw new ApiError(res.status, message, body);
    }
    return body as T;
  }

  private get<T>(path: string) {
    return this.request<T>(path);
  }
  private post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }, true);
  }
  private patch<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: "PATCH", body: JSON.stringify(body) }, true);
  }
  private put<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: "PUT", body: JSON.stringify(body) }, true);
  }
  private del<T = void>(path: string) {
    return this.request<T>(path, { method: "DELETE" }, true);
  }
  private async raw(path: string, init: RequestInit = {}, mutation = false): Promise<Blob> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/octet-stream");
    if (this.token) headers.set("Authorization", `Bearer ${this.token}`);
    if (mutation) headers.set("Idempotency-Key", this.idempotencyKey());
    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers, credentials: "include" });
    if (!res.ok) {
      const text = await res.text();
      let message = `${res.status} ${res.statusText}`;
      try {
        const body = JSON.parse(text) as { message?: string; error?: string };
        message = body.message ?? body.error ?? message;
      } catch {
        if (text) message = text;
      }
      throw new ApiError(res.status, message);
    }
    return res.status === 204 ? new Blob() : res.blob();
  }

  // ---- Catalog ----
  getCatalog() {
    return this.get<Catalog>("/v1/catalog");
  }
  async listMarketplace(input: { q?: string; kind?: "all" | "agent" | "sandbox" } = {}) {
    const params = new URLSearchParams();
    if (input.q) params.set("q", input.q);
    if (input.kind && input.kind !== "all") params.set("kind", input.kind);
    const suffix = params.size ? `?${params.toString()}` : "";
    return (await this.get<ItemEnvelope<MarketplaceRecipe>>(`/v1/images${suffix}`)).items;
  }
  generateMarketplaceRecipe(input: { prompt: string; kind: "agent" | "sandbox"; name?: string }) {
    return this.post<GeneratedRecipe>("/v1/images/generate", input);
  }
  installMarketplaceRecipe(id: string) {
    return this.post<MarketplaceRecipe>(`/v1/images/${encodeURIComponent(id)}/build`);
  }
  async deployMarketplaceRecipe(id: string, input: CreateSandboxInput) {
    const resources = resourcesForSize(input.size);
    return mapSandbox(await this.post<WireSandbox>(`/v1/images/${encodeURIComponent(id)}/deploy`, {
      name: input.name,
      diskGb: Number.parseInt(input.disk, 10) || 10,
      region: input.region ?? "local",
      publicWeb: input.publicWeb ?? false,
      pauseWhenIdle: input.pauseWhenIdle ?? false,
      idleTimeoutSec: input.pauseWhenIdle ? input.idleTimeoutSec ?? 900 : 0,
      lifecycle: input.lifecycle ?? "persistent",
      ttlSeconds: input.lifecycle === "ephemeral" ? input.ttlSeconds ?? 3600 : 0,
      allowedEgress: input.allowedEgress ?? [],
      environment: input.environment ?? {},
      secrets: input.secrets ?? {},
      ...resources,
    }));
  }

  // ---- Sandboxes ----
  async listSandboxes() {
    const response = await this.get<ItemEnvelope<WireSandbox>>("/v1/sandboxes");
    return response.items.map(mapSandbox);
  }
  async getSandbox(id: string) {
    try {
      return mapSandbox(await this.get<WireSandbox>(`/v1/sandboxes/${id}`));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }
  async createSandbox(input: CreateSandboxInput) {
    const resources = resourcesForSize(input.size);
    const diskGb = Number.parseInt(input.disk, 10) || 10;
    const response = await this.post<WireSandbox>("/v1/sandboxes", {
      name: input.name,
      kind: input.kind ?? "sandbox",
      recipeId: input.recipeId,
      image: input.template === "devbox:1" ? "agentpop/devbox:local" : input.template,
      diskGb,
      region: input.region ?? "local",
      publicWeb: input.publicWeb ?? false,
      pauseWhenIdle: input.pauseWhenIdle ?? false,
      idleTimeoutSec: input.pauseWhenIdle ? input.idleTimeoutSec ?? 900 : 0,
      lifecycle: input.lifecycle ?? "persistent",
      ttlSeconds: input.lifecycle === "ephemeral" ? input.ttlSeconds ?? 3600 : 0,
      allowedEgress: input.allowedEgress ?? [],
      environment: input.environment ?? {},
      secrets: input.secrets ?? {},
      ...resources,
    });
    if (input.publicWeb && input.previewPort) {
      return mapSandbox(
        await this.post<WireSandbox>(`/v1/sandboxes/${response.id}/ports`, {
          port: input.previewPort,
          mode: input.previewMode ?? "public",
        }),
      );
    }
    return mapSandbox(response);
  }
  async updateSandbox(id: string, patch: Partial<Sandbox>) {
    const wirePatch: Record<string, unknown> = {};
    if (patch.name !== undefined) wirePatch.name = patch.name;
    if (patch.size !== undefined) Object.assign(wirePatch, resourcesForLabel(patch.size));
    if (patch.pauseWhenIdle !== undefined) wirePatch.pauseWhenIdle = patch.pauseWhenIdle;
    if (patch.publicWeb !== undefined) wirePatch.publicWeb = patch.publicWeb;
    if (patch.idleTimeoutSec !== undefined) wirePatch.idleTimeoutSec = patch.idleTimeoutSec;
    if (patch.ttlSeconds !== undefined) wirePatch.ttlSeconds = patch.ttlSeconds;
    const response = await this.patch<WireSandbox>(`/v1/sandboxes/${id}`, wirePatch);
    return mapSandbox(response);
  }
  async pauseSandbox(id: string) {
    await this.post(`/v1/sandboxes/${id}/pause`);
  }
  async resumeSandbox(id: string) {
    await this.post(`/v1/sandboxes/${id}/resume`);
  }
  async forkSandbox(id: string) {
    return mapSandbox(await this.post<WireSandbox>(`/v1/sandboxes/${id}:fork`));
  }
  async destroySandbox(id: string) {
    await this.del(`/v1/sandboxes/${id}`);
  }
  async exposePort(id: string, port: number, mode: Port["mode"]) {
    return mapSandbox(await this.post<WireSandbox>(`/v1/sandboxes/${id}/ports`, { port, mode }));
  }
  async removePort(id: string, port: number) {
    return mapSandbox(await this.del<WireSandbox>(`/v1/sandboxes/${id}/ports/${port}`));
  }
  execSandbox(id: string, command: string, timeoutSeconds = 120, label?: string) {
    return this.post<{ exitCode: number; stdout: string; stderr: string; durationMs: number }>(
      `/v1/sandboxes/${id}/exec`,
      { command, timeoutSeconds, label },
    );
  }
  async getSandboxLogs(id: string, limit = 200) {
    const response = await this.get<ItemEnvelope<SandboxLogEntry>>(
      `/v1/sandboxes/${id}/logs?limit=${encodeURIComponent(String(limit))}`,
    );
    return response.items;
  }
  getSandboxSSH(id: string) {
    return this.get<SSHAccess>(`/v1/sandboxes/${id}/ssh`);
  }
  listSandboxSecrets(id: string) {
    return this.get<AgentSecrets>(`/v1/sandboxes/${encodeURIComponent(id)}/secrets`);
  }
  setSandboxSecrets(id: string, secrets: Record<string, string>, replace = false) {
    return this.put<AgentSecrets>(`/v1/sandboxes/${encodeURIComponent(id)}/secrets`, { secrets, replace });
  }
  deleteSandboxSecret(id: string, key: string) {
    return this.del<AgentSecrets>(
      `/v1/sandboxes/${encodeURIComponent(id)}/secrets/${encodeURIComponent(key)}`,
    );
  }

  // ---- Agents ----
  async listAgents() {
    const response = await this.get<ItemEnvelope<WireAgent>>("/v1/agents");
    return response.items.map((agent): Agent => ({
      name: agent.name,
      template: agent.template,
      model: agent.model,
      status: agent.status,
      sandbox: agent.sandboxId,
      connectors: agent.connectors ?? [],
      secretNames: agent.secretNames ?? [],
      age: relativeAge(agent.createdAt),
    }));
  }
  async deployAgent(input: DeployAgentInput) {
    const response = await this.post<WireAgent>("/v1/agents", {
      name: input.name,
      template: input.template,
      model: input.model,
      connectors: input.connectors,
      secrets: input.secrets,
      ...resourcesForSize(input.size),
    });
    return {
      name: response.name,
      template: response.template,
      model: response.model,
      status: response.status,
      sandbox: response.sandboxId,
      connectors: response.connectors ?? [],
      secretNames: response.secretNames ?? [],
      age: relativeAge(response.createdAt),
    };
  }
  async stopAgent(name: string) {
    await this.post(`/v1/agents/${name}:stop`);
  }
  async restartAgent(name: string) {
    await this.post(`/v1/agents/${name}:restart`);
  }
  async deleteAgent(name: string) {
    await this.del(`/v1/agents/${encodeURIComponent(name)}`);
  }
  getAgentLogs(name: string) {
    return this.get<string[]>(`/v1/agents/${name}/logs`);
  }
  listAgentSecrets(name: string) {
    return this.get<AgentSecrets>(`/v1/agents/${encodeURIComponent(name)}/secrets`);
  }
  setAgentSecrets(name: string, secrets: Record<string, string>, replace = false) {
    return this.put<AgentSecrets>(`/v1/agents/${encodeURIComponent(name)}/secrets`, { secrets, replace });
  }
  deleteAgentSecret(name: string, key: string) {
    return this.del<AgentSecrets>(
      `/v1/agents/${encodeURIComponent(name)}/secrets/${encodeURIComponent(key)}`,
    );
  }
  async listEvalSuites(name: string) {
    return (
      await this.get<ItemEnvelope<EvalSuite>>(
        `/v1/agents/${encodeURIComponent(name)}/eval-suites`,
      )
    ).items;
  }
  createEvalSuite(name: string, input: CreateEvalSuiteInput) {
    return this.post<EvalSuite>(
      `/v1/agents/${encodeURIComponent(name)}/eval-suites`,
      input,
    );
  }
  async deleteEvalSuite(id: string) {
    await this.del(`/v1/eval-suites/${encodeURIComponent(id)}`);
  }
  async listEvalRuns(input: { agent?: string; suiteId?: string }) {
    const path = input.suiteId
      ? `/v1/eval-suites/${encodeURIComponent(input.suiteId)}/runs`
      : `/v1/agents/${encodeURIComponent(input.agent ?? "")}/eval-runs`;
    return (await this.get<ItemEnvelope<EvalRun>>(path)).items;
  }
  runEvalSuite(id: string, environment: EvalRun["environment"] = "sandbox") {
    return this.post<EvalRun>(
      `/v1/eval-suites/${encodeURIComponent(id)}/runs`,
      { environment },
    );
  }
  getEvalRun(id: string) {
    return this.get<EvalRun>(`/v1/eval-runs/${encodeURIComponent(id)}`);
  }

  // ---- Connectors ----
  async listConnectors(input: { q?: string } = {}) {
    const query = input.q?.trim() ? `?q=${encodeURIComponent(input.q.trim())}` : "";
    const response = await this.get<ItemEnvelope<WireConnector>>(`/v1/connectors${query}`);
    return response.items.map(mapConnector);
  }
  async listConnectorTools(name: string, input: { q?: string } = {}) {
    const query = input.q?.trim() ? `?q=${encodeURIComponent(input.q.trim())}` : "";
    return (await this.get<ItemEnvelope<ConnectorTool>>(
      `/v1/connectors/${encodeURIComponent(name)}/tools${query}`,
    )).items;
  }
  async connectConnector(name: string) {
    return this.post<ConnectorAuthorization>(`/v1/connectors/${encodeURIComponent(name)}/authorize`);
  }
  async updateConnector(name: string, patch: { account?: string; actions?: string[] }) {
    return mapConnector(await this.patch<WireConnector>(`/v1/connectors/${encodeURIComponent(name)}/connections`, patch));
  }
  async disconnectConnector(name: string) {
    await this.del(`/v1/connectors/${encodeURIComponent(name)}/connections`);
  }
  invokeConnector(name: string, tool: string, input: { arguments?: Record<string, unknown>; thought?: string; agent?: string }) {
    return this.post<ConnectorInvocation>(
      `/v1/connectors/${encodeURIComponent(name)}/tools/${encodeURIComponent(tool)}`,
      input,
    );
  }

  // ---- Agent + sandbox-image marketplace ----
  async listAgentCatalog() {
    return (await this.get<ItemEnvelope<AgentPackage>>("/v1/agent-catalog")).items;
  }
  installAgentPackage(id: string) {
    return this.post<AgentPackage>(`/v1/agent-catalog/${encodeURIComponent(id)}/install`);
  }
  async listSandboxCatalog() {
    return (await this.get<ItemEnvelope<AgentPackage>>("/v1/sandbox-catalog")).items;
  }
  installSandboxImage(id: string) {
    return this.post<AgentPackage>(`/v1/sandbox-catalog/${encodeURIComponent(id)}/install`);
  }

  // ---- Resource catalogs ----
  async listTemplates() {
    const response = await this.get<ItemEnvelope<WireTemplate>>("/v1/templates");
    return response.items.map(mapTemplate);
  }
  async createTemplate(input: CreateTemplateInput) {
    return mapTemplate(await this.post<WireTemplate>("/v1/templates", input));
  }
  async deleteTemplate(id: string) {
    await this.del(`/v1/templates/${encodeURIComponent(id)}`);
  }
  buildTemplate(id: string) {
    return this.post<TemplateBuild>(`/v1/templates/${encodeURIComponent(id)}/builds`);
  }
  getTemplateBuild(id: string) {
    return this.get<TemplateBuild>(`/v1/template-builds/${encodeURIComponent(id)}`);
  }
  async listTemplateBuilds(templateId: string) {
    return (await this.get<ItemEnvelope<TemplateBuild>>(`/v1/templates/${encodeURIComponent(templateId)}/builds`)).items;
  }
  async deprecateTemplate(id: string) {
    return mapTemplate(await this.post<WireTemplate>(`/v1/templates/${encodeURIComponent(id)}/deprecate`));
  }
  async restoreTemplate(id: string) {
    return mapTemplate(await this.post<WireTemplate>(`/v1/templates/${encodeURIComponent(id)}/restore`));
  }
  async listNetworks() {
    return (await this.get<ItemEnvelope<Network>>("/v1/networks")).items;
  }
  createNetwork(input: { name: string; cidr?: string; region?: string }) {
    return this.post<Network>("/v1/networks", input);
  }
  async deleteNetwork(id: string) {
    await this.del(`/v1/networks/${id}`);
  }
  attachNetworkSandbox(id: string, sandboxId: string) {
    return this.post<Network>(`/v1/networks/${id}/members`, { sandboxId });
  }
  detachNetworkSandbox(id: string, sandboxId: string) {
    return this.del<Network>(`/v1/networks/${id}/members/${sandboxId}`);
  }
  async listStorages() {
    return (await this.get<ItemEnvelope<Storage>>("/v1/storages")).items;
  }
  createStorage(input: CreateStorageInput) {
    return this.post<Storage>("/v1/storages", input);
  }
  async deleteStorage(id: string) {
    await this.del(`/v1/storages/${id}`);
  }
  attachStorage(id: string, sandboxId: string) {
    return this.post<Storage>(`/v1/storages/${id}/attachments`, { sandboxId });
  }
  detachStorage(id: string, sandboxId: string) {
    return this.del<Storage>(`/v1/storages/${id}/attachments/${sandboxId}`);
  }
  async listWebhooks() {
    return (await this.get<ItemEnvelope<Webhook>>("/v1/webhooks")).items;
  }
  createWebhook(url: string, events: string[]) {
    return this.post<{ webhook: Webhook; secret: string }>("/v1/webhooks", { url, events });
  }
  async deleteWebhook(id: string) {
    await this.del(`/v1/webhooks/${id}`);
  }
  testWebhook(id: string) {
    return this.post<{ delivered: boolean; status: number }>(`/v1/webhooks/${id}/test`);
  }
  async listAuditEvents() {
    const response = await this.get<ItemEnvelope<WireAuditEvent>>("/v1/audit-events");
    return response.items.map((event): AuditEvent => ({
      action: event.action,
      kind: event.resource,
      tone: event.result === "ok" ? "success" : "danger",
      resource: event.resourceId,
      actor: event.actor,
      ip: "local",
      result: event.result === "ok" ? "ok" : "denied",
      time: relativeAge(event.createdAt),
    }));
  }

  // ---- Team & keys ----
  listMembers() {
    return this.get<Member[]>("/v1/members");
  }
  inviteMember(email: string, role: string) {
    return this.post<Member>("/v1/members", { email, role });
  }
  updateMember(email: string, patch: Partial<Member>) {
    return this.patch<Member>(`/v1/members/${encodeURIComponent(email)}`, patch);
  }
  async removeMember(email: string) {
    await this.del(`/v1/members/${encodeURIComponent(email)}`);
  }
  listApiKeys() {
    return this.get<ApiKey[]>("/v1/api-keys");
  }
  createApiKey(name: string, scopes: string[]) {
    return this.post<{ key: ApiKey; secret: string }>("/v1/api-keys", { name, scopes });
  }
  async revokeApiKey(name: string) {
    await this.del(`/v1/api-keys/${encodeURIComponent(name)}`);
  }

  // ---- Billing / usage / quotas ----
  getBilling() {
    return this.get<Billing>("/v1/usage");
  }
  getQuotas() {
    return this.get<Quota[]>("/v1/quotas");
  }
  requestQuotaIncrease(message = "Increase project sandbox, vCPU, and memory quotas.") {
    return this.post<{ id: string; status: string }>("/v1/quota-requests", { message });
  }
  async addCredits(amount: number) {
    const res = await this.post<{ credits: number }>("/v1/billing/credits", { amount });
    return res.credits;
  }
  getSubscription() {
    return this.get<Subscription>("/v1/subscription");
  }
  createSubscriptionCheckout() {
    return this.post<{ url: string }>("/v1/subscription/checkout");
  }
  getProject() {
    return this.get<ProjectSettings>("/v1/project");
  }
  updateProject(patch: Partial<ProjectSettings>) {
    return this.patch<ProjectSettings>("/v1/project", patch);
  }
  async deleteProject() {
    await this.del("/v1/project");
  }

  // ---- Files ----
  listFiles(id: string) {
    return this.get<{ name: string; dir?: boolean; size: string; mtime: string }[]>(`/v1/sandboxes/${id}/files`);
  }
  async uploadFile(id: string, path: string, data: Blob) {
    await this.raw(
      `/v1/sandboxes/${id}/files?path=${encodeURIComponent(path)}`,
      { method: "PUT", body: data, headers: { "Content-Type": "application/octet-stream" } },
      true,
    );
  }
  downloadFile(id: string, path: string) {
    return this.raw(`/v1/sandboxes/${id}/files?path=${encodeURIComponent(path)}`);
  }
  async createDirectory(id: string, path: string) {
    await this.post(`/v1/sandboxes/${id}/directories`, { path });
  }
  async deleteFile(id: string, path: string) {
    await this.del(`/v1/sandboxes/${id}/files?path=${encodeURIComponent(path)}`);
  }
  getSandboxMetrics(id: string) {
    return this.get<SandboxMetrics>(`/v1/sandboxes/${id}/metrics`);
  }
  async listSandboxEvents(id: string) {
    const response = await this.get<ItemEnvelope<SandboxEvent>>(`/v1/sandboxes/${id}/events`);
    return response.items;
  }

  // ---- Platform health ----
  getPlatformHealth() {
    return this.get<PlatformHealth>("/v1/platform/health");
  }
}
