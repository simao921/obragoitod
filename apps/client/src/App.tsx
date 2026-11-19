import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, MaintenanceGate, PasswordBanner, PortalShell, useAuth } from "@obragoito/ui";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Messages } from "./pages/Messages";
import { Updates } from "./pages/Updates";

const NAV = [
  { to: "/", label: "As minhas obras", end: true },
  { to: "/atualizacoes", label: "Atualizações" },
  { to: "/mensagens", label: "Mensagens" },
];

const TITLES: Record<string, string> = {
  "/": "As minhas obras",
  "/atualizacoes": "Atualizações das obras",
  "/mensagens": "Mensagens",
};

function ClientShell() {
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

  return (
    <PortalShell
      brandSub="Área de cliente"
      nav={NAV}
      title={TITLES[location.pathname] ?? (location.pathname.startsWith("/obras/") ? "Detalhe da obra" : "Área de cliente")}
      user={{ fullName: user.fullName, roleLabel: "Cliente" }}
      onLogout={logout}
    >
      <PasswordBanner />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/obras/:id" element={<ProjectDetail />} />
        <Route path="/atualizacoes" element={<Updates />} />
        <Route path="/mensagens" element={<Messages />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PortalShell>
  );
}

export function App() {
  return (
    <MaintenanceGate portal="Área de cliente">
      <AuthProvider portal="client">
        <ClientShell />
      </AuthProvider>
    </MaintenanceGate>
  );
}
