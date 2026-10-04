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
  ProjectSettings,
  Port,
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

/** The typed surface every screen uses to reach the real control-plane API. */
export interface ApiClient {
  // Reference / catalog
  getCatalog(): Promise<Catalog>;
  listMarketplace(input?: { q?: string; kind?: "all" | "agent" | "sandbox" }): Promise<MarketplaceRecipe[]>;
  generateMarketplaceRecipe(input: { prompt: string; kind: "agent" | "sandbox"; name?: string }): Promise<GeneratedRecipe>;
  installMarketplaceRecipe(id: string): Promise<MarketplaceRecipe>;
  deployMarketplaceRecipe(id: string, input: CreateSandboxInput): Promise<Sandbox>;

  // Sandboxes
  listSandboxes(): Promise<Sandbox[]>;
  getSandbox(id: string): Promise<Sandbox | null>;
  createSandbox(input: CreateSandboxInput): Promise<Sandbox>;
  updateSandbox(id: string, patch: Partial<Sandbox>): Promise<Sandbox>;
  pauseSandbox(id: string): Promise<void>;
  resumeSandbox(id: string): Promise<void>;
  forkSandbox(id: string): Promise<Sandbox>;
  destroySandbox(id: string): Promise<void>;
  exposePort(id: string, port: number, mode: Port["mode"]): Promise<Sandbox>;
  removePort(id: string, port: number): Promise<Sandbox>;
  execSandbox(
    id: string,
    command: string,
    timeoutSeconds?: number,
    label?: string,
  ): Promise<{ exitCode: number; stdout: string; stderr: string; durationMs: number }>;
  getSandboxLogs(id: string, limit?: number): Promise<SandboxLogEntry[]>;
  getSandboxSSH(id: string): Promise<SSHAccess>;
  listSandboxSecrets(id: string): Promise<AgentSecrets>;
  setSandboxSecrets(id: string, secrets: Record<string, string>, replace?: boolean): Promise<AgentSecrets>;
  deleteSandboxSecret(id: string, key: string): Promise<AgentSecrets>;

  // Agents
  listAgents(): Promise<Agent[]>;
  deployAgent(input: DeployAgentInput): Promise<Agent>;
  stopAgent(name: string): Promise<void>;
  restartAgent(name: string): Promise<void>;
  deleteAgent(name: string): Promise<void>;
  getAgentLogs(name: string): Promise<string[]>;
  listAgentSecrets(name: string): Promise<AgentSecrets>;
  setAgentSecrets(name: string, secrets: Record<string, string>, replace?: boolean): Promise<AgentSecrets>;
  deleteAgentSecret(name: string, key: string): Promise<AgentSecrets>;
  listEvalSuites(name: string): Promise<EvalSuite[]>;
  createEvalSuite(name: string, input: CreateEvalSuiteInput): Promise<EvalSuite>;
  deleteEvalSuite(id: string): Promise<void>;
  listEvalRuns(input: { agent?: string; suiteId?: string }): Promise<EvalRun[]>;
  runEvalSuite(id: string, environment?: EvalRun["environment"]): Promise<EvalRun>;
  getEvalRun(id: string): Promise<EvalRun>;

  // Connectors
  listConnectors(input?: { q?: string }): Promise<Connector[]>;
  listConnectorTools(name: string, input?: { q?: string }): Promise<ConnectorTool[]>;
  connectConnector(name: string): Promise<ConnectorAuthorization>;
  updateConnector(name: string, patch: { account?: string; actions?: string[] }): Promise<Connector>;
  disconnectConnector(name: string): Promise<void>;
  invokeConnector(
    name: string,
    tool: string,
    input: { arguments?: Record<string, unknown>; thought?: string; agent?: string },
  ): Promise<ConnectorInvocation>;

  // Agent + sandbox-image marketplace
  listAgentCatalog(): Promise<AgentPackage[]>;
  installAgentPackage(id: string): Promise<AgentPackage>;
  listSandboxCatalog(): Promise<AgentPackage[]>;
  installSandboxImage(id: string): Promise<AgentPackage>;

  // Resource catalogs
  listTemplates(): Promise<Template[]>;
  createTemplate(input: CreateTemplateInput): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;
  buildTemplate(id: string): Promise<TemplateBuild>;
  getTemplateBuild(id: string): Promise<TemplateBuild>;
  listTemplateBuilds(templateId: string): Promise<TemplateBuild[]>;
  deprecateTemplate(id: string): Promise<Template>;
  restoreTemplate(id: string): Promise<Template>;
  listNetworks(): Promise<Network[]>;
  createNetwork(input: { name: string; cidr?: string; region?: string }): Promise<Network>;
  deleteNetwork(id: string): Promise<void>;
  attachNetworkSandbox(id: string, sandboxId: string): Promise<Network>;
  detachNetworkSandbox(id: string, sandboxId: string): Promise<Network>;
  listStorages(): Promise<Storage[]>;
  createStorage(input: CreateStorageInput): Promise<Storage>;
  deleteStorage(id: string): Promise<void>;
  attachStorage(id: string, sandboxId: string): Promise<Storage>;
  detachStorage(id: string, sandboxId: string): Promise<Storage>;
  listWebhooks(): Promise<Webhook[]>;
  createWebhook(url: string, events: string[]): Promise<{ webhook: Webhook; secret: string }>;
  deleteWebhook(id: string): Promise<void>;
  testWebhook(id: string): Promise<{ delivered: boolean; status: number }>;
  listAuditEvents(): Promise<AuditEvent[]>;

  // Team & keys
  listMembers(): Promise<Member[]>;
  inviteMember(email: string, role: string): Promise<Member>;
  updateMember(email: string, patch: Partial<Member>): Promise<Member>;
  removeMember(email: string): Promise<void>;
  listApiKeys(): Promise<ApiKey[]>;
  createApiKey(name: string, scopes: string[]): Promise<{ key: ApiKey; secret: string }>;
  revokeApiKey(name: string): Promise<void>;

  // Billing / usage / quotas
  getBilling(): Promise<Billing>;
  getQuotas(): Promise<Quota[]>;
  requestQuotaIncrease(message?: string): Promise<{ id: string; status: string }>;
  addCredits(amount: number): Promise<number>;
  getSubscription(): Promise<Subscription>;
  createSubscriptionCheckout(): Promise<{ url: string }>;
  getProject(): Promise<ProjectSettings>;
  updateProject(patch: Partial<ProjectSettings>): Promise<ProjectSettings>;
  deleteProject(): Promise<void>;

  // Files (guest runtime)
  listFiles(id: string): Promise<{ name: string; dir?: boolean; size: string; mtime: string }[]>;
  uploadFile(id: string, path: string, data: Blob): Promise<void>;
  downloadFile(id: string, path: string): Promise<Blob>;
  createDirectory(id: string, path: string): Promise<void>;
  deleteFile(id: string, path: string): Promise<void>;
  getSandboxMetrics(id: string): Promise<SandboxMetrics>;
  listSandboxEvents(id: string): Promise<SandboxEvent[]>;

  // Platform health & capacity (control plane + data plane)
  getPlatformHealth(): Promise<PlatformHealth>;
}
