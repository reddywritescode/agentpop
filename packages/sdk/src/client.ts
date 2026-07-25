import { Sandbox } from "./sandbox.js";
import type {
  AgentPopClientOptions,
  AgentView,
  AgentSecretsView,
  APIKeyView,
  ConnectorView,
  ConnectorAuthorizationView,
  ConnectorInvocationView,
  ConnectorToolView,
  CreateAgentInput,
  CreateEvalSuiteInput,
  CreateSandboxInput,
  CreateStorageInput,
  CreateTemplateInput,
  EvalRunView,
  EvalSuiteView,
  HostInfo,
  MemberView,
  MarketplaceRecipeView,
  GeneratedRecipeView,
  NetworkView,
  ProjectSettingsView,
  RequestOptions,
  SandboxView,
  StorageView,
  SubscriptionView,
  TemplateBuildView,
  TemplateView,
  WebhookView,
} from "./types.js";

interface Items<T> {
  items: T[];
}

export class AgentPopError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "AgentPopError";
  }
}

export class AgentPopClient {
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly fetcher: typeof fetch;
  readonly timeoutMs: number;

  constructor(options: AgentPopClientOptions = {}) {
    const env = (
      globalThis as unknown as {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process?.env;
    this.baseUrl = (options.baseUrl ?? env?.AGENTPOP_BASE_URL ?? "http://127.0.0.1:8080").replace(/\/+$/, "");
    this.apiKey = options.apiKey ?? env?.AGENTPOP_API_KEY;
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 60_000;
    if (!this.fetcher) throw new AgentPopError("A fetch implementation is required");
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const timeout = timeoutMs > 0 ? setTimeout(() => controller.abort("request timed out"), timeoutMs) : undefined;
    const signal = options.signal
      ? AbortSignal.any([options.signal, controller.signal])
      : controller.signal;
    const headers = new Headers({ Accept: "application/json" });
    if (body !== undefined) headers.set("Content-Type", "application/json");
    if (this.apiKey) headers.set("Authorization", `Bearer ${this.apiKey}`);
    if (method !== "GET") {
      headers.set("Idempotency-Key", options.idempotencyKey ?? crypto.randomUUID());
    }
    try {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      });
      const requestId = response.headers.get("x-request-id") ?? undefined;
      if (response.status === 204) return undefined as T;
      const text = await response.text();
      const data = text ? (JSON.parse(text) as unknown) : undefined;
      if (!response.ok) {
        const error = data as { message?: string; error?: string } | undefined;
        throw new AgentPopError(
          error?.message ?? `${response.status} ${response.statusText}`,
          response.status,
          error?.error,
          requestId,
        );
      }
      return data as T;
    } catch (error) {
      if (error instanceof AgentPopError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new AgentPopError("Request timed out or was aborted");
      }
      throw new AgentPopError(error instanceof Error ? error.message : "Network request failed");
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  }

  async requestRaw(
    method: string,
    path: string,
    body?: BodyInit,
    options: RequestOptions = {},
  ): Promise<Uint8Array> {
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const timeout = timeoutMs > 0 ? setTimeout(() => controller.abort("request timed out"), timeoutMs) : undefined;
    const signal = options.signal
      ? AbortSignal.any([options.signal, controller.signal])
      : controller.signal;
    const headers = new Headers({ Accept: "application/octet-stream" });
    if (body !== undefined) headers.set("Content-Type", "application/octet-stream");
    if (this.apiKey) headers.set("Authorization", `Bearer ${this.apiKey}`);
    if (method !== "GET") {
      headers.set("Idempotency-Key", options.idempotencyKey ?? crypto.randomUUID());
    }
    try {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        method,
        headers,
        body,
        signal,
      });
      const requestId = response.headers.get("x-request-id") ?? undefined;
      if (!response.ok) {
        const text = await response.text();
        let message = `${response.status} ${response.statusText}`;
        let code: string | undefined;
        try {
          const error = JSON.parse(text) as { message?: string; error?: string };
          message = error.message ?? message;
          code = error.error;
        } catch {
          if (text) message = text;
        }
        throw new AgentPopError(message, response.status, code, requestId);
      }
      return response.status === 204
        ? new Uint8Array()
        : new Uint8Array(await response.arrayBuffer());
    } catch (error) {
      if (error instanceof AgentPopError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new AgentPopError("Request timed out or was aborted");
      }
      throw new AgentPopError(error instanceof Error ? error.message : "Network request failed");
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  }

  async createSandbox(input: CreateSandboxInput, options?: RequestOptions): Promise<Sandbox> {
    const view = await this.request<SandboxView>("POST", "/v1/sandboxes", input, options);
    return new Sandbox(this, view);
  }

  async getSandbox(id: string, options?: RequestOptions): Promise<Sandbox> {
    const view = await this.request<SandboxView>("GET", `/v1/sandboxes/${encodeURIComponent(id)}`, undefined, options);
    return new Sandbox(this, view);
  }

  async listSandboxes(options?: RequestOptions): Promise<Sandbox[]> {
    const response = await this.request<Items<SandboxView>>("GET", "/v1/sandboxes", undefined, options);
    return response.items.map((view) => new Sandbox(this, view));
  }

  async listMarketplace(
    filter: { kind?: "all" | "agent" | "sandbox"; q?: string } = {},
    options?: RequestOptions,
  ): Promise<MarketplaceRecipeView[]> {
    const query = new URLSearchParams();
    if (filter.kind && filter.kind !== "all") query.set("kind", filter.kind);
    if (filter.q) query.set("q", filter.q);
    const suffix = query.size ? `?${query.toString()}` : "";
    return (
      await this.request<Items<MarketplaceRecipeView>>("GET", `/v1/marketplace${suffix}`, undefined, options)
    ).items;
  }

  generateMarketplaceRecipe(
    input: { prompt: string; kind?: "agent" | "sandbox"; name?: string },
    options?: RequestOptions,
  ): Promise<GeneratedRecipeView> {
    return this.request<GeneratedRecipeView>("POST", "/v1/marketplace/generate", input, options);
  }

  installMarketplaceRecipe(id: string, options?: RequestOptions): Promise<MarketplaceRecipeView> {
    return this.request<MarketplaceRecipeView>(
      "POST",
      `/v1/marketplace/${encodeURIComponent(id)}/install`,
      {},
      options,
    );
  }

  async listImages(
    filter: { kind?: "all" | "agent" | "sandbox"; q?: string } = {},
    options?: RequestOptions,
  ): Promise<MarketplaceRecipeView[]> {
    const query = new URLSearchParams();
    if (filter.kind && filter.kind !== "all") query.set("kind", filter.kind);
    if (filter.q) query.set("q", filter.q);
    const suffix = query.size ? `?${query.toString()}` : "";
    return (
      await this.request<Items<MarketplaceRecipeView>>("GET", `/v1/images${suffix}`, undefined, options)
    ).items;
  }

  generateImage(
    input: { prompt: string; kind?: "agent" | "sandbox"; name?: string },
    options?: RequestOptions,
  ): Promise<GeneratedRecipeView> {
    return this.request<GeneratedRecipeView>("POST", "/v1/images/generate", input, options);
  }

  getImage(id: string, options?: RequestOptions): Promise<MarketplaceRecipeView> {
    return this.request<MarketplaceRecipeView>("GET", `/v1/images/${encodeURIComponent(id)}`, undefined, options);
  }

  buildImage(id: string, options?: RequestOptions): Promise<MarketplaceRecipeView> {
    return this.request<MarketplaceRecipeView>("POST", `/v1/images/${encodeURIComponent(id)}/build`, {}, options);
  }

  forkImage(
    id: string,
    input: { name: string; definition?: string; build?: boolean },
    options?: RequestOptions,
  ): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("POST", `/v1/images/${encodeURIComponent(id)}/fork`, input, options);
  }

  async deployImage(
    id: string,
    input: CreateSandboxInput,
    options?: RequestOptions,
  ): Promise<Sandbox> {
    const view = await this.request<SandboxView>(
      "POST",
      `/v1/images/${encodeURIComponent(id)}/deploy`,
      input,
      options,
    );
    return new Sandbox(this, view);
  }

  async deployMarketplaceRecipe(
    id: string,
    input: CreateSandboxInput,
    options?: RequestOptions,
  ): Promise<Sandbox> {
    const view = await this.request<SandboxView>(
      "POST",
      `/v1/marketplace/${encodeURIComponent(id)}/deploy`,
      input,
      options,
    );
    return new Sandbox(this, view);
  }

  subscription(options?: RequestOptions): Promise<SubscriptionView> {
    return this.request<SubscriptionView>("GET", "/v1/subscription", undefined, options);
  }

  async listHosts(options?: RequestOptions): Promise<HostInfo[]> {
    return (await this.request<Items<HostInfo>>("GET", "/v1/data-plane/hosts", undefined, options)).items;
  }

  controlPlaneStatus(options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("GET", "/v1/control-plane/status", undefined, options);
  }

  platformHealth(options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("GET", "/v1/platform/health", undefined, options);
  }

  catalog(options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("GET", "/v1/catalog", undefined, options);
  }

  async templates(options?: RequestOptions): Promise<TemplateView[]> {
    return (await this.request<Items<TemplateView>>("GET", "/v1/templates", undefined, options)).items;
  }

  createTemplate(input: CreateTemplateInput, options?: RequestOptions): Promise<TemplateView> {
    return this.request<TemplateView>("POST", "/v1/templates", input, options);
  }

  getTemplate(idOrName: string, options?: RequestOptions): Promise<TemplateView> {
    return this.request<TemplateView>("GET", `/v1/templates/${encodeURIComponent(idOrName)}`, undefined, options);
  }

  deleteTemplate(idOrName: string, options?: RequestOptions): Promise<void> {
    return this.request<void>("DELETE", `/v1/templates/${encodeURIComponent(idOrName)}`, undefined, options);
  }

  buildTemplate(idOrName: string, options?: RequestOptions): Promise<TemplateBuildView> {
    return this.request<TemplateBuildView>("POST", `/v1/templates/${encodeURIComponent(idOrName)}/builds`, {}, options);
  }

  async listTemplateBuilds(idOrName: string, options?: RequestOptions): Promise<TemplateBuildView[]> {
    return (
      await this.request<Items<TemplateBuildView>>(
        "GET",
        `/v1/templates/${encodeURIComponent(idOrName)}/builds`,
        undefined,
        options,
      )
    ).items;
  }

  getTemplateBuild(buildId: string, options?: RequestOptions): Promise<TemplateBuildView> {
    return this.request<TemplateBuildView>("GET", `/v1/template-builds/${encodeURIComponent(buildId)}`, undefined, options);
  }

  deprecateTemplate(idOrName: string, options?: RequestOptions): Promise<TemplateView> {
    return this.request<TemplateView>("POST", `/v1/templates/${encodeURIComponent(idOrName)}/deprecate`, {}, options);
  }

  restoreTemplate(idOrName: string, options?: RequestOptions): Promise<TemplateView> {
    return this.request<TemplateView>("POST", `/v1/templates/${encodeURIComponent(idOrName)}/restore`, {}, options);
  }

  async agentCatalog(options?: RequestOptions): Promise<Record<string, unknown>[]> {
    return (await this.request<Items<Record<string, unknown>>>("GET", "/v1/agent-catalog", undefined, options)).items;
  }

  async sandboxCatalog(options?: RequestOptions): Promise<Record<string, unknown>[]> {
    return (await this.request<Items<Record<string, unknown>>>("GET", "/v1/sandbox-catalog", undefined, options)).items;
  }

  getCatalogPackage(packageId: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("GET", `/v1/agent-catalog/${encodeURIComponent(packageId)}`, undefined, options);
  }

  installCatalogPackage(packageId: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("POST", `/v1/agent-catalog/${encodeURIComponent(packageId)}/install`, {}, options);
  }

  async createAgent(input: CreateAgentInput, options?: RequestOptions): Promise<AgentView> {
    return this.request<AgentView>("POST", "/v1/agents", input, options);
  }

  async listAgents(options?: RequestOptions): Promise<AgentView[]> {
    return (await this.request<Items<AgentView>>("GET", "/v1/agents", undefined, options)).items;
  }

  stopAgent(name: string, options?: RequestOptions): Promise<AgentView> {
    return this.request<AgentView>("POST", `/v1/agents/${encodeURIComponent(name)}:stop`, {}, options);
  }

  restartAgent(name: string, options?: RequestOptions): Promise<AgentView> {
    return this.request<AgentView>("POST", `/v1/agents/${encodeURIComponent(name)}:restart`, {}, options);
  }

  deleteAgent(name: string, options?: RequestOptions): Promise<void> {
    return this.request<void>("DELETE", `/v1/agents/${encodeURIComponent(name)}`, undefined, options);
  }

  agentLogs(name: string, options?: RequestOptions): Promise<string[]> {
    return this.request<string[]>("GET", `/v1/agents/${encodeURIComponent(name)}/logs`, undefined, options);
  }

  listAgentSecrets(name: string, options?: RequestOptions): Promise<AgentSecretsView> {
    return this.request<AgentSecretsView>(
      "GET",
      `/v1/agents/${encodeURIComponent(name)}/secrets`,
      undefined,
      options,
    );
  }

  setAgentSecrets(
    name: string,
    secrets: Record<string, string>,
    config: { replace?: boolean } = {},
    options?: RequestOptions,
  ): Promise<AgentSecretsView> {
    return this.request<AgentSecretsView>(
      "PUT",
      `/v1/agents/${encodeURIComponent(name)}/secrets`,
      { secrets, replace: config.replace ?? false },
      options,
    );
  }

  deleteAgentSecret(name: string, key: string, options?: RequestOptions): Promise<AgentSecretsView> {
    return this.request<AgentSecretsView>(
      "DELETE",
      `/v1/agents/${encodeURIComponent(name)}/secrets/${encodeURIComponent(key)}`,
      undefined,
      options,
    );
  }

  async listEvalSuites(name: string, options?: RequestOptions): Promise<EvalSuiteView[]> {
    return (
      await this.request<Items<EvalSuiteView>>(
        "GET",
        `/v1/agents/${encodeURIComponent(name)}/eval-suites`,
        undefined,
        options,
      )
    ).items;
  }

  createEvalSuite(
    name: string,
    suite: CreateEvalSuiteInput,
    options?: RequestOptions,
  ): Promise<EvalSuiteView> {
    return this.request<EvalSuiteView>(
      "POST",
      `/v1/agents/${encodeURIComponent(name)}/eval-suites`,
      suite,
      options,
    );
  }

  getEvalSuite(id: string, options?: RequestOptions): Promise<EvalSuiteView> {
    return this.request<EvalSuiteView>(
      "GET",
      `/v1/eval-suites/${encodeURIComponent(id)}`,
      undefined,
      options,
    );
  }

  deleteEvalSuite(id: string, options?: RequestOptions): Promise<void> {
    return this.request<void>(
      "DELETE",
      `/v1/eval-suites/${encodeURIComponent(id)}`,
      undefined,
      options,
    );
  }

  async listEvalRuns(
    input: { agent?: string; suiteId?: string },
    options?: RequestOptions,
  ): Promise<EvalRunView[]> {
    const path = input.suiteId
      ? `/v1/eval-suites/${encodeURIComponent(input.suiteId)}/runs`
      : `/v1/agents/${encodeURIComponent(input.agent ?? "")}/eval-runs`;
    return (await this.request<Items<EvalRunView>>("GET", path, undefined, options)).items;
  }

  runEvalSuite(
    id: string,
    input: { environment?: "ci" | "sandbox" | "staging" } = {},
    options?: RequestOptions,
  ): Promise<EvalRunView> {
    return this.request<EvalRunView>(
      "POST",
      `/v1/eval-suites/${encodeURIComponent(id)}/runs`,
      input,
      { timeoutMs: 10 * 60_000, ...options },
    );
  }

  getEvalRun(id: string, options?: RequestOptions): Promise<EvalRunView> {
    return this.request<EvalRunView>(
      "GET",
      `/v1/eval-runs/${encodeURIComponent(id)}`,
      undefined,
      options,
    );
  }

  async listConnectors(filter: { q?: string } = {}, options?: RequestOptions): Promise<ConnectorView[]> {
    const query = filter.q ? `?q=${encodeURIComponent(filter.q)}` : "";
    return (await this.request<Items<ConnectorView>>("GET", `/v1/connectors${query}`, undefined, options)).items;
  }

  async listConnectorTools(
    id: string,
    filter: { q?: string } = {},
    options?: RequestOptions,
  ): Promise<ConnectorToolView[]> {
    const query = filter.q ? `?q=${encodeURIComponent(filter.q)}` : "";
    return (await this.request<Items<ConnectorToolView>>(
      "GET",
      `/v1/connectors/${encodeURIComponent(id)}/tools${query}`,
      undefined,
      options,
    )).items;
  }

  authorizeConnector(id: string, options?: RequestOptions): Promise<ConnectorAuthorizationView> {
    return this.request<ConnectorAuthorizationView>("POST", `/v1/connectors/${encodeURIComponent(id)}/authorize`, {}, options);
  }

  /** @deprecated Use authorizeConnector; this now starts real provider OAuth. */
  connectConnector(id: string, _input: { account?: string; actions?: string[] } = {}, options?: RequestOptions): Promise<ConnectorAuthorizationView> {
    return this.authorizeConnector(id, options);
  }

  updateConnector(id: string, input: { account?: string; actions?: string[] }, options?: RequestOptions): Promise<ConnectorView> {
    return this.request<ConnectorView>("PATCH", `/v1/connectors/${encodeURIComponent(id)}/connections`, input, options);
  }

  disconnectConnector(id: string, options?: RequestOptions): Promise<void> {
    return this.request<void>("DELETE", `/v1/connectors/${encodeURIComponent(id)}/connections`, undefined, options);
  }

  invokeConnector(
    id: string,
    tool: string,
    input: { arguments?: Record<string, unknown>; thought?: string; currentStep?: string; currentStepMetric?: string; agent?: string } = {},
    options?: RequestOptions,
  ): Promise<ConnectorInvocationView> {
    return this.request<ConnectorInvocationView>(
      "POST",
      `/v1/connectors/${encodeURIComponent(id)}/tools/${encodeURIComponent(tool)}`,
      input,
      options,
    );
  }

  async listNetworks(options?: RequestOptions): Promise<NetworkView[]> {
    return (await this.request<Items<NetworkView>>("GET", "/v1/networks", undefined, options)).items;
  }

  createNetwork(input: { name: string; cidr?: string; region?: string }, options?: RequestOptions): Promise<NetworkView> {
    return this.request<NetworkView>("POST", "/v1/networks", input, options);
  }

  deleteNetwork(id: string, options?: RequestOptions): Promise<void> {
    return this.request<void>("DELETE", `/v1/networks/${encodeURIComponent(id)}`, undefined, options);
  }

  attachNetworkSandbox(id: string, sandboxId: string, options?: RequestOptions): Promise<NetworkView> {
    return this.request<NetworkView>("POST", `/v1/networks/${encodeURIComponent(id)}/members`, { sandboxId }, options);
  }

  detachNetworkSandbox(id: string, sandboxId: string, options?: RequestOptions): Promise<NetworkView> {
    return this.request<NetworkView>("DELETE", `/v1/networks/${encodeURIComponent(id)}/members/${encodeURIComponent(sandboxId)}`, undefined, options);
  }

  async listStorages(options?: RequestOptions): Promise<StorageView[]> {
    return (await this.request<Items<StorageView>>("GET", "/v1/storages", undefined, options)).items;
  }

  createStorage(input: CreateStorageInput, options?: RequestOptions): Promise<StorageView> {
    return this.request<StorageView>("POST", "/v1/storages", input, options);
  }

  deleteStorage(id: string, options?: RequestOptions): Promise<void> {
    return this.request<void>("DELETE", `/v1/storages/${encodeURIComponent(id)}`, undefined, options);
  }

  attachStorage(id: string, sandboxId: string, options?: RequestOptions): Promise<StorageView> {
    return this.request<StorageView>("POST", `/v1/storages/${encodeURIComponent(id)}/attachments`, { sandboxId }, options);
  }

  detachStorage(id: string, sandboxId: string, options?: RequestOptions): Promise<StorageView> {
    return this.request<StorageView>("DELETE", `/v1/storages/${encodeURIComponent(id)}/attachments/${encodeURIComponent(sandboxId)}`, undefined, options);
  }

  async listWebhooks(options?: RequestOptions): Promise<WebhookView[]> {
    return (await this.request<Items<WebhookView>>("GET", "/v1/webhooks", undefined, options)).items;
  }

  createWebhook(url: string, events: string[], options?: RequestOptions): Promise<{ webhook: WebhookView; secret: string }> {
    return this.request<{ webhook: WebhookView; secret: string }>("POST", "/v1/webhooks", { url, events }, options);
  }

  testWebhook(id: string, options?: RequestOptions): Promise<{ delivered: boolean; status: number }> {
    return this.request<{ delivered: boolean; status: number }>("POST", `/v1/webhooks/${encodeURIComponent(id)}/test`, {}, options);
  }

  deleteWebhook(id: string, options?: RequestOptions): Promise<void> {
    return this.request<void>("DELETE", `/v1/webhooks/${encodeURIComponent(id)}`, undefined, options);
  }

  listMembers(options?: RequestOptions): Promise<MemberView[]> {
    return this.request<MemberView[]>("GET", "/v1/members", undefined, options);
  }

  inviteMember(email: string, role: string, options?: RequestOptions): Promise<MemberView> {
    return this.request<MemberView>("POST", "/v1/members", { email, role }, options);
  }

  updateMember(email: string, role: string, options?: RequestOptions): Promise<MemberView> {
    return this.request<MemberView>("PATCH", `/v1/members/${encodeURIComponent(email)}`, { role }, options);
  }

  removeMember(email: string, options?: RequestOptions): Promise<void> {
    return this.request<void>("DELETE", `/v1/members/${encodeURIComponent(email)}`, undefined, options);
  }

  listAPIKeys(options?: RequestOptions): Promise<APIKeyView[]> {
    return this.request<APIKeyView[]>("GET", "/v1/api-keys", undefined, options);
  }

  createAPIKey(name: string, scopes: string[], options?: RequestOptions): Promise<{ key: APIKeyView; secret: string }> {
    return this.request<{ key: APIKeyView; secret: string }>("POST", "/v1/api-keys", { name, scopes }, options);
  }

  revokeAPIKey(idOrName: string, options?: RequestOptions): Promise<void> {
    return this.request<void>("DELETE", `/v1/api-keys/${encodeURIComponent(idOrName)}`, undefined, options);
  }

  getProject(options?: RequestOptions): Promise<ProjectSettingsView> {
    return this.request<ProjectSettingsView>("GET", "/v1/project", undefined, options);
  }

  updateProject(patch: Partial<ProjectSettingsView>, options?: RequestOptions): Promise<ProjectSettingsView> {
    return this.request<ProjectSettingsView>("PATCH", "/v1/project", patch, options);
  }

  requestQuotaIncrease(message?: string, options?: RequestOptions): Promise<{ id: string; status: string }> {
    return this.request<{ id: string; status: string }>("POST", "/v1/quota-requests", { message: message ?? "Increase project quotas." }, options);
  }

  auditEvents(options?: RequestOptions): Promise<Record<string, unknown>[]> {
    return this.request<Items<Record<string, unknown>>>("GET", "/v1/audit-events", undefined, options).then((response) => response.items);
  }

  usage(options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("GET", "/v1/usage", undefined, options);
  }

  quotas(options?: RequestOptions): Promise<Record<string, unknown>[]> {
    return this.request<Record<string, unknown>[]>("GET", "/v1/quotas", undefined, options);
  }

  addLocalCredits(amount: number, options?: RequestOptions): Promise<{ credits: number }> {
    return this.request<{ credits: number }>("POST", "/v1/billing/credits", { amount }, options);
  }

  deleteProject(options?: RequestOptions): Promise<void> {
    return this.request<void>("DELETE", "/v1/project", undefined, options);
  }
}
