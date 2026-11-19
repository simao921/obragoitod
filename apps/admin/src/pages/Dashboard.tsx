import { Link } from "react-router-dom";
import { Alert, LoadingBlock, useApi } from "@obragoito/ui";
import { formatDateTime, type AdminDashboard } from "@obragoito/core";

export function Dashboard() {
  const { data, loading, error } = useApi<AdminDashboard>("/admin/dashboard");

  if (loading) return <LoadingBlock label="A carregar o painel…" />;
  if (error) return <Alert tone="error">{error}</Alert>;
  if (!data) return null;

  const { counts } = data;

  return (
    <>
      <div className="p-page-head">
        <div>
          <h1 className="p-title">Painel de gestão</h1>
          <p className="p-subtitle">
            Estado atual das obras, das pessoas e dos pedidos que chegam pelo site.
          </p>
        </div>
        <div className="p-toolbar">
          <Link to="/obras" className="btn btn--sm btn--solid">
            <span>Gerir obras</span>
          </Link>
          <Link to="/pessoas" className="btn btn--sm">
            <span>Adicionar pessoa</span>
          </Link>
        </div>
      </div>

      <div className="p-stats">
        <div className="stat-card">
          <p className="stat-card__value">{counts.projects}</p>
          <p className="stat-card__label">Obras</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__value">{counts.publishedProjects}</p>
          <p className="stat-card__label">Publicadas no site</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__value">{counts.clients}</p>
          <p className="stat-card__label">Clientes</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__value">{counts.workers}</p>
          <p className="stat-card__label">Trabalhadores</p>
        </div>
        <div className={`stat-card ${counts.newQuotes > 0 ? "stat-card--alert" : ""}`.trim()}>
          <p className="stat-card__value">{counts.newQuotes}</p>
          <p className="stat-card__label">Pedidos novos</p>
        </div>
        <div className={`stat-card ${counts.pendingReports > 0 ? "stat-card--alert" : ""}`.trim()}>
          <p className="stat-card__value">{counts.pendingReports}</p>
          <p className="stat-card__label">Relatórios por rever</p>
        </div>
      </div>

      <section className="p-section">
        <div className="p-section__head">
          <h2 className="p-section__title">Pedidos de orçamento recentes</h2>
          <Link to="/pedidos" className="btn btn--quiet btn--sm">
            Ver todos
          </Link>
        </div>
        {data.recentQuotes.length === 0 ? (
          <p className="p-empty-state">
            Ainda não existem pedidos. Os pedidos enviados pelo formulário do site aparecem aqui.
          </p>
        ) : (
          <div className="p-list">
            {data.recentQuotes.map((quote) => (
              <div className="p-list__row" key={quote.id}>
                <div className="p-list__main">
                  <p className="p-list__title">{quote.name}</p>
                  <p className="p-list__meta">
                    {quote.email} · {quote.service ?? "área não indicada"} · {formatDateTime(quote.createdAt)}
                  </p>
                </div>
                <div className="p-list__actions">
                  <a className="btn btn--quiet btn--sm" href={`mailto:${quote.email}`}>
                    Responder
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="p-section">
        <div className="p-section__head">
          <h2 className="p-section__title">Relatórios de trabalhadores</h2>
          <Link to="/relatorios" className="btn btn--quiet btn--sm">
            Ver todos
          </Link>
        </div>
        {data.recentReports.length === 0 ? (
          <p className="p-empty-state">
            Sem relatórios. Os relatórios enviados pela equipa aparecem aqui para revisão.
          </p>
        ) : (
          <div className="p-list">
            {data.recentReports.map((report) => (
              <div className="p-list__row" key={report.id}>
                <div className="p-list__main">
                  <p className="p-list__title">
                    {report.workerName} · {report.projectName}
                  </p>
                  <p className="p-list__meta">{report.body.slice(0, 140)}</p>
                </div>
                <div className="p-list__actions">
                  <span className={`badge ${report.status === "submitted" ? "badge--accent" : ""}`.trim()}>
                    {report.status === "submitted" ? "Por rever" : "Revisto"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="p-section">
        <div className="p-section__head">
          <h2 className="p-section__title">Atividade recente</h2>
          <Link to="/auditoria" className="btn btn--quiet btn--sm">
            Auditoria
          </Link>
        </div>
        {data.recentAudit.length === 0 ? (
          <p className="p-empty-state">Sem registos de auditoria.</p>
        ) : (
          <div className="p-list">
            {data.recentAudit.map((entry) => (
              <div className="p-list__row" key={entry.id}>
                <div className="p-list__main">
                  <p className="p-list__title">{entry.action}</p>
                  <p className="p-list__meta">
                    {entry.actorName ?? "sistema"} · {entry.entity ?? "—"} · {formatDateTime(entry.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
