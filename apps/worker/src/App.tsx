import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, MaintenanceGate, PasswordBanner, PortalShell, useAuth } from "@obragoito/ui";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Messages } from "./pages/Messages";
import { Daily } from "./pages/Daily";

const NAV = [
  { to: "/", label: "As minhas obras", end: true },
  { to: "/registo-diario", label: "Registo diário" },
  { to: "/mensagens", label: "Mensagens" },
];

function WorkerShell() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="p-empty-state" style={{ margin: "var(--space-7) var(--gutter)" }}>
        A validar a sessão…
      </div>
    );
  }

  if (!user) return <Login />;

  const title = location.pathname.startsWith("/obras/")
    ? "Obra"
    : location.pathname === "/mensagens"
      ? "Mensagens"
      : location.pathname === "/registo-diario"
        ? "Registo diário"
        : "As minhas obras";

  return (
    <PortalShell
      brandSub="Equipa"
      nav={NAV}
      title={title}
      user={{ fullName: user.fullName, roleLabel: "Trabalhador" }}
      onLogout={logout}
    >
      <PasswordBanner />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/obras/:id" element={<ProjectDetail />} />
        <Route path="/registo-diario" element={<Daily />} />
        <Route path="/mensagens" element={<Messages />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PortalShell>
  );
}

export function App() {
  return (
    <MaintenanceGate portal="Portal da equipa">
      <AuthProvider portal="worker">
        <WorkerShell />
      </AuthProvider>
    </MaintenanceGate>
  );
}
