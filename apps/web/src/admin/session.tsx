import * as React from "react";
import { AdminApiError, adminLogin, adminRequest, type AdminSession } from "./api";

interface AdminSessionContextValue {
  session: AdminSession | null;
  token: string | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const STORAGE_KEY = "agentpop.owner-session";
const AdminSessionContext = React.createContext<AdminSessionContextValue | null>(null);

function readToken() {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(STORAGE_KEY, token);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // An in-memory session still works when browser storage is unavailable.
  }
}

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(() => readToken());
  const [session, setSession] = React.useState<AdminSession | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    if (!token) {
      setReady(true);
      return;
    }
    adminRequest<AdminSession>(token, "/private/v1/auth/session")
      .then((next) => {
        if (active) setSession(next);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof AdminApiError && error.status === 401) {
          writeToken(null);
          setToken(null);
          setSession(null);
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const signIn = React.useCallback(async (email: string, password: string) => {
    const result = await adminLogin(email, password);
    const next: AdminSession = { ...result.owner, expiresAt: result.expiresAt };
    writeToken(result.token);
    setToken(result.token);
    setSession(next);
  }, []);

  const signOut = React.useCallback(async () => {
    if (token) {
      await adminRequest<void>(token, "/private/v1/auth/logout", { method: "POST" }).catch(() => undefined);
    }
    writeToken(null);
    setToken(null);
    setSession(null);
  }, [token]);

  const value = React.useMemo(
    () => ({ session, token, ready, signIn, signOut }),
    [session, token, ready, signIn, signOut],
  );
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession() {
  const value = React.useContext(AdminSessionContext);
  if (!value) throw new Error("useAdminSession must be used within AdminSessionProvider");
  return value;
}
