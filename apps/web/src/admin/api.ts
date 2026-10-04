export interface AdminOwner {
  email: string;
  role: "owner";
}

export interface AdminSession extends AdminOwner {
  expiresAt: string;
}

export interface HostCapacity {
  cpuCores: number;
  memoryMb: number;
  diskGb: number;
  allocatedVcpu: number;
  allocatedMemoryMb: number;
  sandboxes: number;
}

export interface AdminHost {
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
  capacity: HostCapacity;
  updatedAt: string;
  draining: boolean;
  runtimeSandboxes: number;
  runtimeError?: string;
}

export interface RuntimeSandbox {
  id: string;
  runtimeId: string;
  runtimeName: string;
  driver: string;
  status: string;
  vcpu?: number;
  memoryMb?: number;
  diskGb?: number;
  privateIp?: string;
  startedAt?: string;
}

export interface AdminAuditEvent {
  id: string;
  action: string;
  actor: string;
  resource: string;
  resourceId: string;
  result: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AdminOverview {
  version: string;
  mode: string;
  uptimeSeconds: number;
  desiredSandboxes: number;
  runtimeSandboxes: number;
  agents: number;
  auditEvents: number;
  statuses: Record<string, number>;
  allocated: { vcpu: number; memoryMb: number };
  resources: {
    networks: number;
    storages: number;
    webhooks: number;
    connectorConnections: number;
    apiKeys: number;
    quotaRequests: number;
  };
  host: AdminHost;
  hostError?: string;
  runtimeError?: string;
  draining: boolean;
  lastReconcile?: string;
  updatedAt: string;
}

export interface ControlPlaneDetail {
  name: string;
  version: string;
  mode: string;
  healthy: boolean;
  startedAt: string;
  uptimeSeconds: number;
  process: {
    pid: number;
    goVersion: string;
    goroutines: number;
    heapBytes: number;
    sysBytes: number;
  };
  components: Array<{ name: string; health: string; detail: string }>;
  updatedAt: string;
}

export interface ReconcileReport {
  result: string;
  desired: number;
  runtime: number;
  repaired: number;
  recoveredRuntime: string[];
  recoveryFailed: Record<string, string>;
  missingRuntime: string[];
  orphanedRuntime: string[];
  completedAt: string;
}

export interface SafeConfig {
  mode: string;
  apiVersion: string;
  privateApiPrefix: string;
  stateStore: string;
  hostAgentEndpoint: string;
  hostAgentAuthentication: boolean;
  customerApiAuthentication: boolean;
  ownerEmail: string;
  ownerSessionTtlHours: number;
  drainingHosts: Record<string, boolean>;
  secretValuesExposed: boolean;
}

export class AdminApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

const baseUrl = String(import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

async function decode<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : `${response.status} ${response.statusText}`;
    throw new AdminApiError(response.status, message);
  }
  return body as T;
}

export async function adminLogin(email: string, password: string) {
  const response = await fetch(`${baseUrl}/private/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return decode<{ token: string; expiresAt: string; owner: AdminOwner }>(response);
}

export async function adminRequest<T>(token: string, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  return decode<T>(response);
}
