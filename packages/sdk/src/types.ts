export type SandboxStatus =
  | "queued"
  | "provisioning"
  | "running"
  | "pausing"
  | "paused"
  | "resuming"
  | "deleting"
  | "deleted"
  | "failed";

export interface SSHAccess {
  host: string;
  port: number;
  user: string;
  privateKeyPath?: string;
  command: string;
  hostCommand?: string;
}

export interface RuntimeSandbox {
  id: string;
  runtimeId: string;
  runtimeName: string;
  driver: "docker" | "firecracker" | string;
  status: SandboxStatus;
  privateIp?: string;
  ssh?: SSHAccess;
  startedAt?: string;
}

export interface SandboxView {
  id: string;
  projectId: string;
  name: string;
  kind?: "agent" | "sandbox";
  recipeId?: string;
  secretNames?: string[];
  status: SandboxStatus;
  desiredStatus: SandboxStatus;
  generation: number;
  observedGeneration: number;
  image: string;
  region: string;
  vcpu: number;
  memoryMb: number;
  diskGb: number;
  publicWeb: boolean;
  pauseWhenIdle: boolean;
  idleTimeoutSec?: number;
  ttlSeconds?: number;
  lifecycle?: "persistent" | "ephemeral";
  allowedEgress?: string[];
  environment?: Record<string, string>;
  ports?: PreviewPort[];
  hostId?: string;
  runtime?: RuntimeSandbox;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PreviewPort {
  port: number;
  mode: "public" | "organization" | "signed-link";
  url: string;
}

export interface CreateSandboxInput {
  name?: string;
  projectId?: string;
  kind?: "agent" | "sandbox";
  recipeId?: string;
  image?: string;
  region?: string;
  vcpu?: number;
  memoryMb?: number;
  diskGb?: number;
  publicWeb?: boolean;
  pauseWhenIdle?: boolean;
  idleTimeoutSec?: number;
  ttlSeconds?: number;
  lifecycle?: "persistent" | "ephemeral";
  allowedEgress?: string[];
  environment?: Record<string, string>;
  /** Write-only values. Responses contain secret names only. */
  secrets?: Record<string, string>;
}

export interface MarketplaceRecipeView {
  id: string;
  kind: "agent" | "sandbox";
  name: string;
  tagline: string;
  description: string;
  category: string;
  useCases: string[];
  definition: string;
  defaultModel?: string;
  requiredSecret?: string;
  credentials?: Array<{
    name: string;
    label: string;
    provider?: string;
    required: boolean;
    description?: string;
  }>;
  requiredConnectors?: string[];
  files?: Array<{ path: string; language?: string; content: string }>;
  persistenceModes?: Array<"persistent" | "ephemeral">;
  defaultCommand?: string;
  programmable?: boolean;
  forkable?: boolean;
  sourceUrl?: string;
  license?: string;
  heavyBuild?: boolean;
  installed: boolean;
  installState: string;
  selfHost: string;
  templateId?: string;
  imageRef?: string;
}

export interface GeneratedRecipeView {
  id: string;
  kind: "agent" | "sandbox";
  name: string;
  tagline: string;
  description: string;
  category: string;
  useCases: string[];
  definition: string;
  generatedBy: string;
  credentials?: MarketplaceRecipeView["credentials"];
  files?: MarketplaceRecipeView["files"];
  persistenceModes?: MarketplaceRecipeView["persistenceModes"];
  defaultCommand?: string;
}

export interface SubscriptionView {
  plan: {
    id: string;
    name: string;
    price: number;
    currency: string;
    interval: "month";
    includes: string[];
  };
  status: string;
  billingModel: "fixed-subscription";
  usageCredits: false;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  startedAt: string;
  finishedAt: string;
}

export interface SandboxLogEntry {
  id: string;
  sandboxId: string;
  source: "exec" | "control-plane" | string;
  stream: "stdout" | "stderr" | "system" | "event" | string;
  runId?: string;
  label?: string;
  message: string;
  exitCode?: number;
  durationMs?: number;
  createdAt: string;
}

export interface SandboxSecretsView {
  items: AgentSecretView[];
  status: "not_configured" | "pending" | "applied";
  generation: number;
  appliedGeneration: number;
  updatedAt?: string;
}

export interface FileEntry {
  name: string;
  dir?: boolean;
  size: string;
  mtime: string;
}

export interface SandboxMetrics {
  cpuLoad: number;
  cpuPercent: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  diskUsedMb: number;
  diskTotalMb: number;
  networkRxBytes: number;
  networkTxBytes: number;
  processCount: number;
  sampledAt: string;
}

export interface SandboxEvent {
  id: string;
  action: string;
  actor: string;
  resource: string;
  resourceId: string;
  result: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface HostInfo {
  id: string;
  name: string;
  region: string;
  driver: string;
  os: string;
  architecture: string;
  healthy: boolean;
  kvmAvailable: boolean;
  firecrackerVersion?: string;
  message?: string;
  sshCommand?: string;
  capacity: {
    cpuCores: number;
    memoryMb: number;
    diskGb: number;
    allocatedVcpu: number;
    allocatedMemoryMb: number;
    sandboxes: number;
  };
  updatedAt: string;
}

export interface AgentView {
  id: string;
  name: string;
  status: string;
  sandboxId: string;
  template: string;
  model: string;
  connectors?: string[];
  secretNames?: string[];
  secretsGeneration?: number;
  appliedSecretsGeneration?: number;
  secretsUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
}

export interface CreateAgentInput {
  name: string;
  template?: string;
  model?: string;
  connectors?: string[];
  vcpu?: number;
  memoryMb?: number;
  diskGb?: number;
  environment?: Record<string, string>;
  /** Write-only values. AgentPop never returns these in an API response. */
  secrets?: Record<string, string>;
}

export interface AgentSecretView {
  name: string;
  configured: true;
  updatedAt?: string;
}

export interface AgentSecretsView {
  items: AgentSecretView[];
  status: "not_configured" | "pending" | "applied";
  generation: number;
  appliedGeneration: number;
  updatedAt?: string;
}

export interface EvalRunnerInput {
  type?: "command";
  /** Runs inside the agent sandbox and receives case input as JSON on stdin. */
  command: string;
  timeoutSeconds?: number;
  judgeProvider?: "auto" | "openai" | "anthropic";
  judgeModel?: string;
}

export interface EvalJudgeInput {
  type: "deterministic" | "llm";
  check_type?: "deterministic" | "judge_based";
  rubric?: string;
  min_score?: number;
  model?: string;
}

export interface EvalAssertionsInput {
  tools_called?: string[];
  tools_not_called?: string[];
  approval_required_for?: string[];
  tool_modes?: Record<string, string>;
  simulator_contains?: Array<Record<string, unknown>>;
  limits?: Record<string, number>;
  metrics?: {
    min?: Record<string, number>;
    max?: Record<string, number>;
  };
  business_metrics?: Record<string, unknown>;
  privacy?: {
    forbidden_pii?: string[];
    inspect?: string[];
  };
  secrets?: {
    forbidden?: boolean | string[];
    inspect?: string[];
  };
  final_answer?: {
    contains?: string[];
    must_not_contain?: string[];
  };
}

export interface EvalCaseInput {
  id: string;
  input: Record<string, unknown>;
  assert: EvalAssertionsInput;
  judges?: EvalJudgeInput[];
  tags?: string[];
  enabled?: boolean;
}

/**
 * Open AgentOps-compatible scenario payload. The same tests can be committed
 * as YAML, imported through the Python SDK, or supplied as JSON here.
 */
export interface CreateEvalSuiteInput {
  version?: 1;
  scenario: string;
  description?: string;
  runner: EvalRunnerInput;
  gate?: { minScore: number };
  tests: EvalCaseInput[];
  source?: "agentpop" | "open-agentops" | string;
  generated?: boolean;
  review_required?: boolean;
  generation?: Record<string, unknown>;
  check_profile?: Record<string, unknown>;
}

export interface EvalSuiteView extends CreateEvalSuiteInput {
  id: string;
  version: 1;
  agentId: string;
  agent: string;
  gate: { minScore: number };
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvalCheckView {
  name: string;
  checkType: "deterministic" | "judge_based";
  passed: boolean;
  skipped?: boolean;
  expected?: unknown;
  actual?: unknown;
  reason?: string;
}

export interface EvalCaseResultView {
  id: string;
  passed: boolean;
  score: number;
  output: string;
  error?: string;
  exitCode: number;
  durationMs: number;
  checks: EvalCheckView[];
  blocking?: string[];
  metrics?: Record<string, unknown>;
}

export interface EvalRunView {
  id: string;
  suiteId: string;
  scenario: string;
  agentId: string;
  agent: string;
  status: "running" | "completed";
  environment: "ci" | "sandbox" | "staging";
  score: number;
  minScore: number;
  passed: boolean;
  blocking?: string[];
  cases: EvalCaseResultView[];
  metrics: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
}

export interface ConnectorView {
  id: string;
  name: string;
  category: string;
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

export interface ConnectorToolView {
  slug: string;
  name: string;
  description?: string;
  toolkit?: string;
  inputSchema?: Record<string, unknown>;
  tags?: string[];
  scopes?: string[];
  version?: string;
}

export interface ConnectorAuthorizationView {
  pendingId: string;
  authorizationUrl: string;
  expiresInSeconds: number;
}

export interface ConnectorInvocationView {
  toolkit: string;
  toolSlug: string;
  result: unknown;
}

export type TemplateStatus = "draft" | "queued" | "building" | "ready" | "failed" | "deprecated" | "planned";

export interface TemplateView {
  id: string;
  name: string;
  description?: string;
  version: number;
  versionLabel: string;
  architecture?: string;
  status: TemplateStatus;
  source: "custom" | "builtin";
  baseImage?: string;
  steps?: string[];
  definition?: string;
  imageRef?: string;
  sizeMb?: number;
  latestBuildId?: string;
  deprecated: boolean;
  error?: string;
  usedBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  definition: string;
}

export type TemplateBuildStatus = "queued" | "building" | "succeeded" | "failed";

export interface TemplateBuildLogEntry {
  at: string;
  stream: "system" | "stdout" | "stderr";
  line: string;
}

export interface TemplateBuildView {
  id: string;
  templateId: string;
  templateName: string;
  version: number;
  status: TemplateBuildStatus;
  baseImage: string;
  steps?: string[];
  imageRef?: string;
  sizeMb?: number;
  sandboxId?: string;
  error?: string;
  logs: TemplateBuildLogEntry[];
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface NetworkView {
  id: string;
  name: string;
  cidr: string;
  region: string;
  attachedSandboxIds?: string[];
  members: number;
  updated: string;
}

export interface StorageView {
  id: string;
  name: string;
  endpoint: string;
  bucket: string;
  region: string;
  pathStyle: boolean;
  attached: number;
  health: string;
  checked: string;
  attachedSandboxIds?: string[];
}

export interface CreateStorageInput {
  name: string;
  endpoint: string;
  bucket: string;
  region?: string;
  pathStyle?: boolean;
  accessKey?: string;
  secretKey?: string;
}

export interface WebhookView {
  id: string;
  url: string;
  events: string[];
  status: string;
  last: string;
}

export interface MemberView {
  name: string;
  email: string;
  role: string;
  mfa: boolean;
  pending?: boolean;
  joined: string;
}

export interface APIKeyView {
  id: string;
  name: string;
  scopes: string[];
  prefix: string;
  created: string;
  expires: string;
}

export interface ProjectSettingsView {
  name: string;
  region: string;
  defaultIdleSeconds: number;
  defaultTtlSeconds: number;
  updatedAt?: string;
}

export interface AgentPopClientOptions {
  baseUrl?: string;
  apiKey?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  idempotencyKey?: string;
}
