import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@agentpop/ui";
import { Icon } from "../../components/icon";
import { authApiBase } from "../../auth/session";

export function AuthPage({ mode }: { mode: "signin" | "signup" }) {
  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get("error");

  const signup = mode === "signup";

  return (
    <div className="mkt auth">
      <Link className="authtop" to="/">
        <span className="mark">P</span>AgentPop
      </Link>
      <main className="authwrap">
        <div className="authcard">
          <h1>{signup ? "Create your account" : "Welcome back"}</h1>
          <div className="sub">{signup ? "AgentPop Pro is a fixed $20/month. The open-source core is free to self-host." : "Sign in to your organization."}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Button
              variant="primary"
              leadingIcon={<Icon name="github" />}
              onClick={() => {
                window.location.href = `${authApiBase()}/v1/auth/github/start`;
              }}
            >{signup ? "Create account with GitHub" : "Continue with GitHub"}</Button>
            <Button
              variant="secondary"
              leadingIcon={<Icon name="chrome" />}
              disabled
              title="Google sign-in is not configured yet."
            >Continue with Google</Button>
          </div>
          {oauthError ? (
            <div className="help err" style={{ marginTop: 8 }}>
              GitHub sign-in failed ({oauthError.replaceAll("_", " ")}). Ask the AgentPop owner to allow your GitHub account if needed.
            </div>
          ) : null}
          <div className="divider">secure customer access</div>
          <div className="selfhost" style={{ marginTop: 0 }}>
            <Icon name="shield-check" size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            Password sign-in is intentionally unavailable until server-side password identity and verification ship. The dashboard never accepts browser-local credentials.
          </div>
          {signup ? (
            <div style={{ font: "11.5px/16px var(--font-sans)", color: "var(--text-tertiary)", marginTop: 10 }}>
              By continuing you agree to the <a href="#terms" onClick={(e) => e.preventDefault()}>Terms</a> and{" "}
              <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.
            </div>
          ) : null}
          <div className="swap">
            {signup ? "Already have an account? " : "New to AgentPop? "}
            <Link
              to={signup ? "/signin" : "/signup"}
              style={{ font: "500 13px/18px var(--font-sans)", color: "var(--accent-text)" }}
            >
              {signup ? "Sign in" : "Create an account"}
            </Link>
          </div>
          <div className="selfhost">
            <Icon name="server" size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            Self-hosting? Point the CLI at your control plane:{" "}
            <span style={{ fontFamily: "var(--font-mono)" }}>agentpop login --api https://your-host</span>
          </div>
        </div>
      </main>
      <footer className="authfoot">
        <Link to="/">← Back to site</Link>
        <a href="#terms" onClick={(e) => e.preventDefault()}>Terms</a>
        <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy</a>
        <a href="#status" onClick={(e) => e.preventDefault()}>Status</a>
      </footer>
    </div>
  );
}
