import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, PasswordBanner, PortalShell, useAuth } from "@obragoito/ui";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Projects } from "./pages/Projects";
import { ObrasAtuais } from "./pages/ObrasAtuais";
import { ObrasAntigas } from "./pages/ObrasAntigas";
import { Atualizacoes } from "./pages/Atualizacoes";
import { Clientes } from "./pages/Clientes";
import { Trabalhadores } from "./pages/Trabalhadores";
import { RegistoDiario } from "./pages/RegistoDiario";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Messages } from "./pages/Messages";
import { Reports } from "./pages/Reports";
import { Quotes } from "./pages/Quotes";
import { Manutencao } from "./pages/Manutencao";
import { Settings } from "./pages/Settings";
import { Audit } from "./pages/Audit";

const NAV = [
  { to: "/", label: "Painel", end: true },
  { to: "/obras-atuais", label: "Obras atuais" },
  { to: "/obras-antigas", label: "Obras antigas" },
  { to: "/atualizacoes", label: "Atualizações" },
  { to: "/clientes", label: "Clientes" },
  { to: "/trabalhadores", label: "Trabalhadores" },
  { to: "/registo-diario", label: "Registo diário" },
  { to: "/mensagens", label: "Mensagens" },
  { to: "/pedidos", label: "Pedidos de orçamento" },
  { to: "/manutencao", label: "Manutenção" },
  { to: "/definicoes", label: "Definições" },
  { to: "/auditoria", label: "Auditoria" },
];

const TITLES: Record<string, string> = {
  "/": "Painel de gestão",
  "/obras-atuais": "Obras atuais",
  "/obras-antigas": "Obras antigas",
  "/atualizacoes": "Atualizações das obras",
  "/clientes": "Clientes",
  "/trabalhadores": "Trabalhadores",
  "/registo-diario": "Registo diário",
  "/mensagens": "Mensagens",
  "/pedidos": "Pedidos de orçamento",
  "/manutencao": "Manutenção",
  "/definicoes": "Definições",
  "/auditoria": "Registo de auditoria",
};

function AdminShell() {
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

  const title =
    TITLES[location.pathname] ??
    (location.pathname.startsWith("/obras/") ? "Detalhe da obra" : "Gestão");

  return (
    <PortalShell
      brandSub="Gestão"
      nav={NAV}
      title={title}
      user={{ fullName: user.fullName, roleLabel: user.isDeveloper ? "Desenvolvimento" : "Administração" }}
      onLogout={logout}
      actions={
        user.isDeveloper ? (
          <a className="btn btn--quiet btn--sm" href="/dev">
            Portal dev
          </a>
        ) : null
      }
    >
      <PasswordBanner />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/obras" element={<Projects />} />
        <Route path="/obras/:id" element={<ProjectDetail />} />
        <Route path="/obras-atuais" element={<ObrasAtuais />} />
        <Route path="/obras-antigas" element={<ObrasAntigas />} />
        <Route path="/atualizacoes" element={<Atualizacoes />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/trabalhadores" element={<Trabalhadores />} />
        <Route path="/registo-diario" element={<RegistoDiario />} />
        <Route path="/mensagens" element={<Messages />} />
        <Route path="/relatorios" element={<Reports />} />
        <Route path="/pedidos" element={<Quotes />} />
        <Route path="/manutencao" element={<Manutencao />} />
        <Route path="/definicoes" element={<Settings />} />
        <Route path="/auditoria" element={<Audit />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PortalShell>
  );
}

export function App() {
  return (
    <AuthProvider portal="admin">
      <AdminShell />
    </AuthProvider>
  );
}
