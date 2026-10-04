import * as React from "react";
import type { ApiClient } from "./client";
import { createApiClient, resolveApiConfigFromEnv } from "./index";

interface ApiContextValue {
  client: ApiClient;
  mode: "http";
  /** Bumps on every mutation or live event; resources re-fetch when it changes. */
  version: number;
  /** Force a re-fetch of all resource hooks. */
  refresh: () => void;
}

const ApiContext = React.createContext<ApiContextValue | null>(null);

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [{ client, mode }] = React.useState(() => createApiClient(resolveApiConfigFromEnv()));
  const [version, setVersion] = React.useState(0);
  const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

  const value = React.useMemo<ApiContextValue>(
    () => ({ client, mode, version, refresh }),
    [client, mode, version, refresh],
  );
  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiContextValue {
  const ctx = React.useContext(ApiContext);
  if (!ctx) throw new Error("useApi must be used within <ApiProvider>");
  return ctx;
}

export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

/**
 * Fetches from the API client and re-runs whenever the global version bumps
 * (mutation or live event) or the provided deps change.
 */
export function useResource<T>(fetcher: (client: ApiClient) => Promise<T>, deps: React.DependencyList = []): AsyncState<T> {
  const { client, version } = useApi();
  const [data, setData] = React.useState<T>();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [nonce, setNonce] = React.useState(0);
  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    fetcherRef.current(client)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, version, nonce, ...deps]);

  const reload = React.useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload };
}

/**
 * Wraps a mutation so screens can `await run(...)` and have the UI refresh
 * automatically afterwards.
 */
export function useMutation() {
  const { client, refresh } = useApi();
  return React.useCallback(
    async <T,>(fn: (client: ApiClient) => Promise<T>): Promise<T> => {
      const result = await fn(client);
      refresh();
      return result;
    },
    [client, refresh],
  );
}
