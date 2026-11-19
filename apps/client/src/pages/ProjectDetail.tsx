import { Link, useParams } from "react-router-dom";
import { Alert, LoadingBlock, useApi } from "@obragoito/ui";
import { formatBytes, formatDate, formatDateTime, SERVICE_CATEGORIES, type ClientProject } from "@obragoito/core";

export function ProjectDetail() {
  const { id = "" } = useParams();
  const { data, loading, error } = useApi<{ project: ClientProject }>(`/client/projects/${id}`);

  if (loading) return <LoadingBlock label="A carregar a obra…" />;
  if (error) {
    return (
      <>
        <Alert tone="error">{error}</Alert>
        <div style={{ marginTop: "var(--space-5)" }}>
          <Link to="/" className="btn btn--sm">
            Voltar às minhas obras
          </Link>
        </div>
      </>
    );
  }
  if (!data) return null;

  const { project } = data;
  const nextStep =
    project.progress === null
      ? "A equipa ainda não publicou um estado de progresso."
      : project.progress >= 100
        ? "Obra concluída."
        : project.progress >= 75
          ? "Fase de acabamentos e verificação final."
          : project.progress >= 40
            ? "Execução em curso."
            : "Trabalhos iniciais em curso.";

  return (
    <>
      <div className="p-page-head">
        <div>
          <Link to="/" className="mono-label">
            ← As minhas obras
          </Link>
          <h1 className="p-title" style={{ marginTop: 8 }}>
            {project.name}
          </h1>
          <p className="p-subtitle">
            {SERVICE_CATEGORIES[project.category]}
            {project.location ? ` · ${project.location}` : ""}
            {project.year ? ` · ${project.year}` : ""}
          </p>
        </div>
        <Link to="/mensagens" className="btn btn--sm">
          Falar com a equipa
        </Link>
      </div>

      {project.progress !== null ? (
        <section className="panel">
          <div className="panel__body">
            <div className="progress">
              <div className="progress__bar" style={{ width: `${project.progress}%` }} />
            </div>
            <div className="progress-meta">
              <span>{nextStep}</span>
              <span>{project.progress}%</span>
            </div>
          </div>
        </section>
      ) : null}

      {project.description ? (
        <section className="p-section">
          <div className="panel">
            <div className="panel__head">
              <h2 className="panel__title">Sobre a obra</h2>
            </div>
            <div className="panel__body">
              <p style={{ color: "var(--ink-muted)", whiteSpace: "pre-line" }}>{project.description}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="p-section">
        <div className="p-section__head">
          <h2 className="p-section__title">Atualizações</h2>
          <span className="p-note">{project.updates.length} publicada(s)</span>
        </div>
        {project.updates.length === 0 ? (
          <p className="p-empty-state">
            Ainda não existem atualizações publicadas. A equipa publica aqui o progresso da obra.
          </p>
        ) : (
          <div className="timeline">
            {project.updates.map((update) => (
              <div className="timeline__item" key={update.id}>
                <p className="timeline__date">
                  {formatDate(update.createdAt)}
                  {update.progress !== null ? ` · ${update.progress}%` : ""}
                </p>
                <h3 className="timeline__title">{update.title}</h3>
                <p className="timeline__body">{update.body}</p>
                {update.authorName ? <p className="p-note" style={{ marginTop: 6 }}>{update.authorName}</p> : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="p-section">
        <div className="p-section__head">
          <h2 className="p-section__title">Fotografias</h2>
        </div>
        {project.photos.length === 0 ? (
          <p className="p-empty-state">Sem fotografias partilhadas.</p>
        ) : (
          <div className="p-gallery">
            {project.photos.map((photo) =>
              photo.url ? (
                <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer noopener">
                  <img src={photo.url} alt={photo.alt ?? photo.caption ?? "Fotografia da obra"} loading="lazy" />
                  {photo.caption ? <figcaption>{photo.caption}</figcaption> : null}
                </a>
              ) : null,
            )}
          </div>
        )}
      </section>

      <section className="p-section">
        <div className="p-section__head">
          <h2 className="p-section__title">Documentos</h2>
        </div>
        {project.documents.length === 0 ? (
          <p className="p-empty-state">Sem documentos partilhados.</p>
        ) : (
          <div className="p-docs">
            {project.documents.map((document) => (
              <div className="p-doc" key={document.id}>
                <span className="p-doc__name">{document.title}</span>
                <span className="p-doc__meta">
                  {formatBytes(document.sizeBytes)} · {formatDateTime(document.createdAt)}
                  {document.url ? (
                    <a href={document.url} target="_blank" rel="noreferrer noopener" className="link-underline" style={{ marginLeft: 12 }}>
                      Abrir
                    </a>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
