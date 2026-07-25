import * as React from "react";
import { resolveApiConfigFromEnv } from "../api";

/**
 * Customer authentication.
 *
 * The control plane is the only source of customer identity. GitHub OAuth
 * creates a signed HttpOnly cookie; local development can opt into a
 * server-side local identity with ALLOW_INSECURE_LOCAL_AUTH=1. There is no
 * compile-time or localStorage bypass in the production application.
 */

export interface Session {
  name: string;
  email: string;
  org: string;
  project: string;
  provider?: string;
  avatarUrl?: string;
}

/** Base URL for auth endpoints; "" means same-origin. */
export function authApiBase(): string {
  return (resolveApiConfigFromEnv().apiUrl ?? "").trim().replace(/\/+$/, "");
}

interface AuthContextValue {
  session: Session | null;
  ready: boolean;
  signOut: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch(`${authApiBase()}/v1/auth/session`, { credentials: "include" });
        if (res.ok) {
          const data = (await res.json()) as {
            user: { name?: string; providerLogin: string; email?: string; provider: string; avatarUrl?: string };
            org: string;
            project: string;
          };
          if (active) {
            const next: Session = {
              name: data.user.name || data.user.providerLogin,
              email: data.user.email ?? "",
              org: data.org,
              project: data.project,
              provider: data.user.provider,
              avatarUrl: data.user.avatarUrl,
            };
            setSession(next);
          }
        } else if (active) {
          setSession(null);
        }
      } catch {
        if (active) setSession(null);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signOut = React.useCallback(() => {
    void fetch(`${authApiBase()}/v1/auth/logout`, { method: "POST", credentials: "include" }).catch(() => undefined);
    setSession(null);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({ session, ready, signOut }),
    [session, ready, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
