import { AuthProvider, PortalLogin, useAuth } from "@obragoito/ui";
import { Dashboard } from "./pages/Dashboard";

function DevLogin() {
  return (
    <PortalLogin
      brandSub="Desenvolvimento"
      title="Entrar no portal dev"
      subtitle="Acesso reservado à conta de desenvolvimento da Obragoito."
      asideImage="/media/projects/rotunda-benfica.jpg"
      asideAlt="Rotunda de Benfica, obra de infraestruturas da Obragoito"
      asideTitle="Monitorizar, corrigir, evoluir."
      asideText="Estado da API, erros em produção, integrações e manutenção — num só painel."
      footer={
        <p>
          Conta de desenvolvimento: <a href="mailto:simaodev@obragoito.pt">simaodev@obragoito.pt</a>
        </p>
      }
    />
  );
}

function DevShell() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <main className="dev-main">A validar a sessão…</main>;
  }

  if (!user) return <DevLogin />;

  if (!user.isDeveloper) {
    return (
      <main className="dev-main">
        <h1 className="dev-title">Acesso restrito</h1>
        <p className="dev-sub">Este portal é exclusivo da conta de desenvolvimento.</p>
        <div className="dev-actions" style={{ marginTop: 16 }}>
          <button type="button" className="dev-btn" onClick={logout}>
            Terminar sessão
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="dev-shell">
      <aside className="dev-sidebar">
        <div className="dev-brand">
          Obragoito
          <strong>Desenvolvimento</strong>
        </div>

        <div className="dev-user">
          <span>{user.fullName}</span>
          <span>{user.email}</span>
          <div className="dev-actions" style={{ marginTop: 8 }}>
            <a className="dev-btn" href="/admin">
              Gestão
            </a>
            <a className="dev-btn" href="/">
              Site
            </a>
          </div>
          <button type="button" className="dev-btn" style={{ marginTop: 8 }} onClick={logout}>
            Terminar sessão
          </button>
        </div>
      </aside>

      <Dashboard userName={user.fullName} />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider portal="dev">
      <DevShell />
    </AuthProvider>
  );
}
