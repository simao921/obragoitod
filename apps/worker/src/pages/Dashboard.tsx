import { Link } from "react-router-dom";
import { Alert, LoadingBlock, useApi, useAuth } from "@obragoito/ui";
import { formatDateTime, SERVICE_CATEGORIES, type WorkerProject } from "@obragoito/core";

export function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useApi<{ projects: WorkerProject[] }>("/worker/projects");

  return (
    <>
      <div className="p-page-head">
        <div>
          <h1 className="p-title">Olá, {user?.fullName.split(" ")[0]}.</h1>
          <p className="p-subtitle">As obras que tem atribuídas. Envie relatórios e fale com a administração.</p>
        </div>
        <Link to="/mensagens" className="btn btn--sm">
          Mensagens
        </Link>
      </div>

      {loading ? <LoadingBlock label="A carregar as suas obras…" /> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      {data && data.projects.length === 0 ? (
        <p className="p-empty-state">
          Ainda não tem obras atribuídas. Quando a administração o associar a uma obra, ela aparece aqui.
        </p>
      ) : null}

      {data && data.projects.length > 0 ? (
        <div className="p-cards">
          {data.projects.map((project) => (
            <Link key={project.id} to={`/obras/${project.id}`} className="p-card">
              <div className="p-card__media">
                {project.coverImage ? (
                  <img src={project.coverImage} alt={project.coverImageAlt ?? project.name} loading="lazy" />
                ) : null}
              </div>
              <div className="p-card__meta">
                <span>{SERVICE_CATEGORIES[project.category]}</span>
                <span>{project.roleOnProject ?? "equipa"}</span>
              </div>
              <h2 className="p-card__title">{project.name}</h2>
              <p className="p-note">
                {project.lastUpdateAt
                  ? `Última atualização: ${formatDateTime(project.lastUpdateAt)}`
                  : "Sem atualizações publicadas."}
              </p>
              <p className="p-note">{project.reportCount} relatório(s) enviado(s)</p>
            </Link>
          ))}
        </div>
      ) : null}
    </>
  );
}
