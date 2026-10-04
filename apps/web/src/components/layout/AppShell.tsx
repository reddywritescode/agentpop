import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@agentpop/ui";
import { Icon } from "../icon";
import { useAuth } from "../../auth/session";
import { useResource } from "../../api/provider";

const NAV = [
  { to: "overview", label: "Overview", icon: "house" },
  { to: "marketplace", label: "Marketplace", icon: "sparkles" },
  { to: "sandboxes", label: "Sandboxes", icon: "box" },
  { to: "connectors", label: "Connectors", icon: "plug" },
  { to: "developer", label: "Developer", icon: "code" },
  { to: "settings", label: "Settings", icon: "settings" },
];

function initials(name: string) {
  return name
    .split(/[.\s]/)
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AppShell() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: subscription } = useResource((c) => c.getSubscription(), []);

  const doSignOut = () => {
    signOut();
    navigate("/signin");
  };

  return (
    <div className="kit">
      <aside className="sb">
        <button className="sb-org" type="button">
          <span className="mark">P</span>
          <span className="uinfo">
            <span className="nm">{session?.org ?? "agentpop"}</span>
            <br />
            <span className="pr">{session?.project ?? "production"}</span>
          </span>
          <span className="spacer" />
          <Icon name="chevrons-up-down" size={14} style={{ color: "var(--text-tertiary)" }} />
        </button>
        <nav className="sb-nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => "sb-item" + (isActive ? " active" : "")}>
              <Icon name={n.icon} size={16} />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sb-foot">
          <div className="credits">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="amt">$20</span>
              <span className="cap">per month</span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              style={{ width: "100%", marginTop: 8 }}
              onClick={() => navigate("/app/settings?tab=billing")}
            >
              {subscription?.plan.name ?? "AgentPop Pro"}
            </Button>
          </div>
          <div className="userrow">
            <span className="avatar">{initials(session?.name ?? "user")}</span>
            <span className="uinfo" style={{ minWidth: 0 }}>
              <span style={{ font: "500 12px/15px var(--font-sans)", display: "block" }}>{session?.name}</span>
              <span
                style={{
                  font: "11px/14px var(--font-sans)",
                  color: "var(--text-tertiary)",
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {session?.email}
              </span>
            </span>
            <span className="spacer" />
            <Button variant="ghost" size="icon-sm" aria-label="Sign out" title="Sign out" onClick={doSignOut}>
              <Icon name="log-out" size={14} />
            </Button>
          </div>
        </div>
      </aside>
      <div className="main">
        <div className="content ap-scroll">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
