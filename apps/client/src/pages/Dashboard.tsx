import { Link } from "react-router-dom";
import { Alert, LoadingBlock, useApi, useAuth } from "@obragoito/ui";
import { formatDateTime, SERVICE_CATEGORIES, type ProjectSummary } from "@obragoito/core";

type ClientProjectCard = ProjectSummary & { progress: number | null; lastUpdateAt: string | null };

export function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useApi<{ projects: ClientProjectCard[] }>("/client/projects");

  return (
    <>
      <div className="p-page-head">
        <div>
          <h1 className="p-title">Olá, {user?.fullName.split(" ")[0]}.</h1>
          <p className="p-subtitle">
            Aqui encontra o estado das suas obras, as atualizações publicadas pela equipa e os documentos
            partilhados.
          </p>
        </div>
      </div>

      {loading ? <LoadingBlock label="A carregar as suas obras…" /> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      {data && data.projects.length === 0 ? (
        <div className="p-empty-state">
          <p style={{ marginBottom: 8 }}>Ainda não tem obras atribuídas.</p>
          <p>
            Quando a Obragoito associar uma obra à sua conta, ela aparece aqui com o progresso e as
            atualizações da equipa.
          </p>
        </div>
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
                <span>{project.location ?? "—"}</span>
              </div>
              <h2 className="p-card__title">{project.name}</h2>
              {project.progress !== null ? (
                <div>
                  <div className="progress">
                    <div className="progress__bar" style={{ width: `${project.progress}%` }} />
                  </div>
                  <div className="progress-meta">
                    <span>Progresso</span>
                    <span>{project.progress}%</span>
                  </div>
                </div>
              ) : (
                <p className="p-note">Progresso ainda não publicado.</p>
              )}
              <p className="p-note">
                {project.lastUpdateAt
                  ? `Última atualização: ${formatDateTime(project.lastUpdateAt)}`
                  : "Sem atualizações publicadas."}
              </p>
            </Link>
          ))}
        </div>
      ) : null}
    </>
  );
}
