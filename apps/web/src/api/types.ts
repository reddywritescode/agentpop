/**
 * Domain types for the AgentPop control plane.
 *
 * These mirror the public API contract described in
 * docs/product-and-architecture-plan.md §5.
 */

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

export type PreviewMode = "public" | "organization" | "signed-link";

export interface Port {
  port: number;
  url: string;
  mode?: PreviewMode;
}

export interface Sandbox {
  id: string;
  name: string;
  kind?: "agent" | "sandbox";
  recipeId?: string;
  secretNames?: string[];
  status: SandboxStatus;
  size: string;
  disk: string;
  template: string;
  ip: string;
  age: string;
  idle: string;
  pauseWhenIdle?: boolean;
  publicWeb?: boolean;
  idleTimeoutSec?: number;
  ttlSeconds?: number;
  lifecycle: "persistent" | "ephemeral";
  region: string;
  ports: Port[];
}

export interface SandboxLogEntry {
  id: string;
  sandboxId: string;
  runId?: string;
  label?: string;
  source: "exec" | "control-plane" | string;
  stream: "stdout" | "stderr" | "system" | "event" | string;
  message: string;
  exitCode?: number;
  durationMs?: number;
  createdAt: string;
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

export interface SSHAccess {
  host: string;
  port: number;
  user: string;
  command: string;
  hostCommand?: string;
  privateKeyPath?: string;
}

export interface CreateSandboxInput {
  name?: string;
  kind?: "agent" | "sandbox";
  recipeId?: string;
  size: string;
  template: string;
  disk: string;
  region?: string;
  publicWeb?: boolean;
  previewPort?: number;
  previewMode?: PreviewMode;
  pauseWhenIdle?: boolean;
  idleTimeoutSec?: number;
  lifecycle?: "persistent" | "ephemeral";
  ttlSeconds?: number;
  allowedEgress?: string[];
  environment?: Record<string, string>;
  /** Write-only values. Responses contain names only. */
  secrets?: Record<string, string>;
}

export type AgentStatus = "deploying" | "running" | "stopped" | "failed";

export interface Agent {
  name: string;
  template: string;
  model: string;
  status: AgentStatus;
  sandbox: string;
  connectors: string[];
  secretNames: string[];
  age: string;
}

export interface DeployAgentInput {
  name: string;
  template?: string;
  model: string;
  size: string;
  connectors: string[];
  /** Write-only values; API responses contain names only. */
  secrets?: Record<string, string>;
}

export interface AgentPackage {
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
  sizeMb?: number;
  latestBuildId?: string;
}

export type MarketplaceRecipe = AgentPackage;

export interface GeneratedRecipe {
  id: string;
  kind: "agent" | "sandbox";
  name: string;
  tagline: string;
  description: string;
  category: string;
  useCases: string[];
  definition: string;
  generatedBy: string;
  credentials?: AgentPackage["credentials"];
  files?: AgentPackage["files"];
  persistenceModes?: AgentPackage["persistenceModes"];
  defaultCommand?: string;
}

export interface Subscription {
  plan: {
    id: string;
    name: string;
    price: number;
    currency: string;
    interval: "month";
    includes: string[];
  };
  status: "development" | "available" | string;
  billingModel: "fixed-subscription";
  usageCredits: false;
}

export interface AgentSecrets {
  items: { name: string; configured: true; updatedAt?: string }[];
  status: "not_configured" | "pending" | "applied";
  generation?: number;
  appliedGeneration?: number;
  updatedAt?: string;
}

export interface EvalSuite {
  id: string;
  version: 1;
  scenario: string;
  description?: string;
  agentId: string;
  agent: string;
  runner: {
    type: "command";
    command: string;
    timeoutSeconds?: number;
    judgeProvider?: "auto" | "openai" | "anthropic";
    judgeModel?: string;
  };
  gate: { minScore: number };
  tests: Array<{
    id: string;
    input: Record<string, unknown>;
    assert: Record<string, unknown>;
    judges?: Array<Record<string, unknown>>;
  }>;
  source?: string;
  review_required?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateEvalSuiteInput = Omit<EvalSuite, "id" | "agentId" | "agent" | "createdAt" | "updatedAt">;

export interface EvalRun {
  id: string;
  suiteId: string;
  scenario: string;
  agent: string;
  status: "running" | "completed";
  environment: "ci" | "sandbox" | "staging";
  score: number;
  minScore: number;
  passed: boolean;
  blocking?: string[];
  cases: Array<{
    id: string;
    passed: boolean;
    score: number;
    output: string;
    error?: string;
    durationMs: number;
    checks: Array<{ name: string; checkType: string; passed: boolean; reason?: string }>;
  }>;
  metrics: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
}

export interface Connector {
  id: string;
  name: string;
  icon: string;
  desc: string;
  category?: string;
  logoUrl?: string;
  toolsCount?: number;
  configured: boolean;
  connected: boolean;
  status?: string;
  account?: string;
  grants?: number;
  actions?: string[];
  availableActions?: string[];
  health?: string;
}

export interface ConnectorTool {
  slug: string;
  name: string;
  description?: string;
  toolkit?: string;
  inputSchema?: Record<string, unknown>;
  tags?: string[];
  scopes?: string[];
  version?: string;
}

export interface ConnectorAuthorization {
  pendingId: string;
  authorizationUrl: string;
  expiresInSeconds: number;
}

export interface ConnectorInvocation {
  toolkit: string;
  toolSlug: string;
  result: unknown;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  version: number;
  versionLabel: string;
  arch: string;
  size: string;
  sizeMb?: number;
  status: string;
  source: "custom" | "builtin";
  deprecated: boolean;
  imageRef?: string;
  latestBuildId?: string;
  error?: string;
  definition?: string;
  updated: string;
  used: number;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  definition: string;
}

export interface TemplateBuildLogEntry {
  at: string;
  stream: "system" | "stdout" | "stderr";
  line: string;
}

export interface TemplateBuild {
  id: string;
  templateId: string;
  templateName: string;
  version: number;
  status: "queued" | "building" | "succeeded" | "failed";
  baseImage: string;
  steps?: string[];
  imageRef?: string;
  sizeMb?: number;
  error?: string;
  logs: TemplateBuildLogEntry[];
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface Network {
  name: string;
  id: string;
  cidr: string;
  region: string;
  members: number;
  updated: string;
  attachedSandboxIds?: string[];
}

export interface Storage {
  id: string;
  name: string;
  endpoint: string;
  bucket: string;
  region: string;
  attached: number;
  health: string;
  checked: string;
  attachedSandboxIds?: string[];
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  status: string;
  last: string;
}

export interface CreateStorageInput {
  name: string;
  endpoint: string;
  bucket: string;
  region: string;
  pathStyle: boolean;
  accessKey: string;
  secretKey: string;
}

export interface ProjectSettings {
  name: string;
  region: string;
  defaultIdleSeconds: number;
  defaultTtlSeconds: number;
  updatedAt?: string;
}

export type AuditTone = "success" | "info" | "danger" | "neutral";

export interface AuditEvent {
  action: string;
  kind: string;
  tone: AuditTone;
  resource: string;
  actor: string;
  ip: string;
  result: "ok" | "denied";
  time: string;
}

export interface Member {
  name: string;
  email: string;
  role: string;
  mfa: boolean;
  joined: string;
  pending?: boolean;
}

export interface ApiKey {
  name: string;
  scopes: string[];
  created: string;
  expires: string;
}

export interface Meter {
  label: string;
  used: string;
  pct: number;
  cost: number;
  unit: string;
}

export interface Quota {
  label: string;
  used: number;
  cap: number;
  unit?: string;
  note?: string;
}

export interface Size {
  id: string;
  cpu: string;
  ram: string;
}

export interface Billing {
  credits: number;
  plan: string;
  meters: Meter[];
}

// ---- Platform health & capacity (product plan §3 control plane, §8 data plane) ----

export type ServiceHealth = "healthy" | "degraded" | "error";

export interface ControlPlaneService {
  name: string;
  mode: string; // api | scheduler | worker | connector-broker | edge-gateway | datastore
  health: ServiceHealth;
  instances: number;
  detail: string;
  latencyMs?: number;
}

export interface DataPlaneHost {
  id: string;
  region: string;
  az: string;
  instance: string;
  health: ServiceHealth;
  draining: boolean;
  vcpuTotal: number;
  vcpuUsed: number;
  memTotalGiB: number;
  memUsedGiB: number;
  sandboxes: number;
  sandboxCap: number;
  heartbeat: string;
}

export interface CapacitySummary {
  region: string;
  activeSandboxes: number;
  sandboxCap: number;
  hostsUp: number;
  hostsTotal: number;
  createP95Ms: number;
  execFirstByteP95Ms: number;
  apiAvailability: number; // percent, control-plane API availability
}

export interface PlatformHealth {
  controlPlane: ControlPlaneService[];
  dataPlane: DataPlaneHost[];
  capacity: CapacitySummary;
}

// ---- Reference/catalog data used by forms ----

export interface Catalog {
  sizes: Size[];
  events: string[];
  scopes: string[];
  roles: string[];
  org: { name: string; project: string };
}
