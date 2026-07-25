import { Button } from "@agentpop/ui";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Icon } from "../components/icon";
import { useAdminSession } from "./session";

const links = [
  { to: "/admin/overview", label: "Overview", icon: "gauge" },
  { to: "/admin/control-plane", label: "Control plane", icon: "server-cog" },
  { to: "/admin/data-plane", label: "Data plane", icon: "network" },
  { to: "/admin/sandboxes", label: "Runtime inventory", icon: "boxes" },
  { to: "/admin/audit", label: "Audit & operations", icon: "scroll-text" },
  { to: "/admin/settings", label: "Private API config", icon: "shield" },
];

export function AdminShell() {
  const { session, signOut } = useAdminSession();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark"><Icon name="shield-check" size={17} /></span>
          <span><b>AgentPop</b><small>Operator console</small></span>
        </div>
        <div className="admin-environment"><span /> Private control surface</div>
        <nav>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => "admin-nav-link" + (isActive ? " active" : "")}>
              <Icon name={link.icon} size={16} />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-foot">
          <div className="admin-owner">
            <span className="admin-owner-avatar">O</span>
            <span><b>Owner</b><small>{session?.email}</small></span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            leadingIcon={<Icon name="log-out" />}
            onClick={() => void signOut().then(() => navigate("/admin/login", { replace: true }))}
          >
            Sign out
          </Button>
        </div>
      </aside>
      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-topbar-label">OWNER ONLY</span>
            <span className="admin-topbar-path">{location.pathname.replace("/admin/", "")}</span>
          </div>
          <div className="admin-live"><span /> Live control plane</div>
        </header>
        <div className="admin-content"><Outlet /></div>
      </section>
    </div>
  );
}
