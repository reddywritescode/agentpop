/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the control-plane API. Empty/undefined means same origin. */
  readonly VITE_API_URL?: string;
  /** Optional bearer token for the HTTP client during local development. */
  readonly VITE_API_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
