import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth/session";
import { AppShell } from "./components/layout/AppShell";
import { Home } from "./pages/marketing/Home";
import { AuthPage } from "./pages/auth/AuthPage";
import { Overview } from "./pages/dashboard/Overview";
import { Sandboxes } from "./pages/dashboard/Sandboxes";
import { SandboxDetail } from "./pages/dashboard/SandboxDetail";
import { AgentDetail } from "./pages/dashboard/AgentDetail";
import { Marketplace } from "./pages/dashboard/Marketplace";
import { Connectors } from "./pages/dashboard/Connectors";
import { Networks } from "./pages/dashboard/Networks";
import { Storage } from "./pages/dashboard/Storage";
import { Webhooks } from "./pages/dashboard/Webhooks";
import { Audit } from "./pages/dashboard/Audit";
import { Developer } from "./pages/dashboard/Developer";
import { Settings } from "./pages/dashboard/Settings";
import { Health } from "./pages/dashboard/Health";
import { AdminLogin } from "./admin/AdminLogin";
import { AdminShell } from "./admin/AdminShell";
import {
  AdminAuditPage,
  AdminControlPlanePage,
  AdminDataPlanePage,
  AdminOverviewPage,
  AdminSandboxesPage,
  AdminSettingsPage,
} from "./admin/pages";
import { useAdminSession } from "./admin/session";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth();
  const location = useLocation();
  if (!ready) return null;
  if (!session) return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAdminSession();
  const location = useLocation();
  if (!ready) return null;
  if (!session) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signin" element={<AuthPage mode="signin" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminShell />
          </RequireAdmin>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<AdminOverviewPage />} />
        <Route path="control-plane" element={<AdminControlPlanePage />} />
        <Route path="data-plane" element={<AdminDataPlanePage />} />
        <Route path="sandboxes" element={<AdminSandboxesPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="sandboxes" element={<Sandboxes />} />
        <Route path="sandboxes/:id" element={<SandboxDetail />} />
        <Route path="marketplace" element={<Marketplace />} />
        <Route path="agents" element={<Navigate to="../marketplace?kind=agent" replace />} />
        <Route path="agents/:name" element={<AgentDetail />} />
        <Route path="connectors" element={<Connectors />} />
        <Route path="templates" element={<Navigate to="../marketplace?kind=sandbox" replace />} />
        <Route path="networks" element={<Networks />} />
        <Route path="storage" element={<Storage />} />
        <Route path="webhooks" element={<Webhooks />} />
        <Route path="audit" element={<Audit />} />
        <Route path="health" element={<Health />} />
        <Route path="developer" element={<Developer />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
