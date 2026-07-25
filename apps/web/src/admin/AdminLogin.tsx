import * as React from "react";
import { Button, Input } from "@agentpop/ui";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Icon } from "../components/icon";
import { useAdminSession } from "./session";

export function AdminLogin() {
  const { session, ready, signIn } = useAdminSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  if (!ready) return null;
  if (session) return <Navigate to="/admin/overview" replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(email, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from?.startsWith("/admin") ? from : "/admin/overview", { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Owner login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="admin-login">
      <section className="admin-login-card">
        <div className="admin-login-mark"><Icon name="shield-check" size={22} /></div>
        <p className="admin-eyebrow">Private operations surface</p>
        <h1>AgentPop operator console</h1>
        <p className="admin-muted">Owner credentials are validated by the control plane. This route is not part of the customer dashboard.</p>
        <form onSubmit={submit}>
          <label className="admin-field">
            <span>Owner email</span>
            <Input autoComplete="username" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="owner@company.com" required />
          </label>
          <label className="admin-field">
            <span>Password</span>
            <Input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error ? <div className="admin-error" role="alert">{error}</div> : null}
          <Button type="submit" loading={busy} style={{ width: "100%" }} leadingIcon={<Icon name="lock-keyhole" />}>
            Sign in to operations
          </Button>
        </form>
        <button className="admin-back" type="button" onClick={() => navigate("/")}>
          <Icon name="arrow-left" size={14} /> Return to customer site
        </button>
      </section>
    </main>
  );
}
