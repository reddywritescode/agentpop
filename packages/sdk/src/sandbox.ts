import type { AgentPopClient } from "./client.js";
import type {
  ExecResult,
  FileEntry,
  RequestOptions,
  SSHAccess,
  SandboxEvent,
  SandboxLogEntry,
  SandboxMetrics,
  SandboxSecretsView,
  SandboxView,
  PreviewPort,
} from "./types.js";

export class Sandbox {
  constructor(
    private readonly client: AgentPopClient,
    private view: SandboxView,
  ) {}

  get id() {
    return this.view.id;
  }

  get status() {
    return this.view.status;
  }

  get data(): Readonly<SandboxView> {
    return this.view;
  }

  toJSON() {
    return this.view;
  }

  private path(suffix = "") {
    return `/v1/sandboxes/${encodeURIComponent(this.id)}${suffix}`;
  }

  async refresh(options?: RequestOptions): Promise<this> {
    this.view = await this.client.request<SandboxView>("GET", this.path(), undefined, options);
    return this;
  }

  exec(command: string, options?: RequestOptions & { timeoutSeconds?: number; label?: string }): Promise<ExecResult> {
    return this.client.request<ExecResult>(
      "POST",
      this.path("/exec"),
      { command, timeoutSeconds: options?.timeoutSeconds, label: options?.label },
      options,
    );
  }

  async sh(command: string, options?: RequestOptions & { timeoutSeconds?: number }): Promise<ExecResult> {
    const result = await this.exec(command, options);
    if (result.exitCode !== 0) {
      throw new Error(`Command exited ${result.exitCode}\n${result.stderr || result.stdout}`);
    }
    return result;
  }

  ssh(options?: RequestOptions): Promise<SSHAccess> {
    return this.client.request<SSHAccess>("GET", this.path("/ssh"), undefined, options);
  }

  async logs(limit = 200, options?: RequestOptions): Promise<SandboxLogEntry[]> {
    const response = await this.client.request<{ items: SandboxLogEntry[] }>(
      "GET",
      `${this.path("/logs")}?limit=${encodeURIComponent(String(limit))}`,
      undefined,
      options,
    );
    return response.items;
  }

  secrets(options?: RequestOptions): Promise<SandboxSecretsView> {
    return this.client.request<SandboxSecretsView>("GET", this.path("/secrets"), undefined, options);
  }

  setSecrets(
    secrets: Record<string, string>,
    replace = false,
    options?: RequestOptions,
  ): Promise<SandboxSecretsView> {
    return this.client.request<SandboxSecretsView>(
      "PUT",
      this.path("/secrets"),
      { secrets, replace },
      options,
    );
  }

  deleteSecret(name: string, options?: RequestOptions): Promise<SandboxSecretsView> {
    return this.client.request<SandboxSecretsView>(
      "DELETE",
      this.path(`/secrets/${encodeURIComponent(name)}`),
      undefined,
      options,
    );
  }

  listFiles(options?: RequestOptions): Promise<FileEntry[]> {
    return this.client.request<FileEntry[]>("GET", this.path("/files"), undefined, options);
  }

  async uploadFile(path: string, data: BodyInit, options?: RequestOptions): Promise<void> {
    await this.client.requestRaw(
      "PUT",
      `${this.path("/files")}?path=${encodeURIComponent(path)}`,
      data,
      options,
    );
  }

  downloadFile(path: string, options?: RequestOptions): Promise<Uint8Array> {
    return this.client.requestRaw(
      "GET",
      `${this.path("/files")}?path=${encodeURIComponent(path)}`,
      undefined,
      options,
    );
  }

  async createDirectory(path: string, options?: RequestOptions): Promise<void> {
    await this.client.request("POST", this.path("/directories"), { path }, options);
  }

  async deleteFile(path: string, options?: RequestOptions): Promise<void> {
    await this.client.request(
      "DELETE",
      `${this.path("/files")}?path=${encodeURIComponent(path)}`,
      undefined,
      options,
    );
  }

  metrics(options?: RequestOptions): Promise<SandboxMetrics> {
    return this.client.request<SandboxMetrics>("GET", this.path("/metrics"), undefined, options);
  }

  async events(options?: RequestOptions): Promise<SandboxEvent[]> {
    const response = await this.client.request<{ items: SandboxEvent[] }>(
      "GET",
      this.path("/events"),
      undefined,
      options,
    );
    return response.items;
  }

  async pause(options?: RequestOptions): Promise<this> {
    this.view = await this.client.request<SandboxView>("POST", this.path("/pause"), {}, options);
    return this;
  }

  async resume(options?: RequestOptions): Promise<this> {
    this.view = await this.client.request<SandboxView>("POST", this.path("/resume"), {}, options);
    return this;
  }

  async update(
    patch: Partial<Pick<SandboxView, "name" | "vcpu" | "memoryMb" | "publicWeb" | "pauseWhenIdle" | "idleTimeoutSec" | "ttlSeconds" | "lifecycle" | "allowedEgress" | "environment">>,
    options?: RequestOptions,
  ): Promise<this> {
    this.view = await this.client.request<SandboxView>("PATCH", this.path(), patch, options);
    return this;
  }

  async fork(options?: RequestOptions): Promise<Sandbox> {
    const view = await this.client.request<SandboxView>("POST", this.path(":fork"), {}, options);
    return new Sandbox(this.client, view);
  }

  async exposePort(port: number, mode: PreviewPort["mode"] = "public", options?: RequestOptions): Promise<this> {
    this.view = await this.client.request<SandboxView>("POST", this.path("/ports"), { port, mode }, options);
    return this;
  }

  async removePort(port: number, options?: RequestOptions): Promise<this> {
    this.view = await this.client.request<SandboxView>("DELETE", this.path(`/ports/${port}`), undefined, options);
    return this;
  }

  async destroy(options?: RequestOptions): Promise<void> {
    await this.client.request<void>("DELETE", this.path(), undefined, options);
  }

  async waitUntil(
    status: SandboxView["status"],
    options: RequestOptions & { timeoutMs?: number; intervalMs?: number } = {},
  ): Promise<this> {
    const deadline = Date.now() + (options.timeoutMs ?? 60_000);
    while (Date.now() < deadline) {
      await this.refresh(options);
      if (this.status === status) return this;
      if (this.status === "failed") throw new Error(this.view.error ?? "Sandbox failed");
      await new Promise((resolve) => setTimeout(resolve, options.intervalMs ?? 500));
    }
    throw new Error(`Timed out waiting for sandbox ${this.id} to become ${status}`);
  }
}
