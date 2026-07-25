import type { ApiClient } from "./client";
import { HttpApiClient } from "./http";

export * from "./types";
export * from "./client";
export { HttpApiClient, ApiError } from "./http";

export interface ApiConfig {
  /** Base URL of the control-plane API. Empty means same-origin `/v1`. */
  apiUrl?: string;
  token?: string;
}

/**
 * The product UI always talks to the real control plane. There is deliberately
 * no in-memory fallback: an unavailable API must render an honest error state
 * instead of fabricating successful customer resources.
 */
export function createApiClient(config: ApiConfig = {}): { client: ApiClient; mode: "http" } {
  const apiUrl = config.apiUrl?.trim() || "/";
  return { client: new HttpApiClient({ baseUrl: apiUrl, token: config.token }), mode: "http" };
}

export function resolveApiConfigFromEnv(): ApiConfig {
  return {
    apiUrl: import.meta.env.VITE_API_URL,
    token: import.meta.env.VITE_API_TOKEN,
  };
}
