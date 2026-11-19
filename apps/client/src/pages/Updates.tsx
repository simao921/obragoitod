import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type ProjectUpdate } from "@obragoito/core";
import { EmptyState, LoadingBlock } from "@obragoito/ui";

type UpdateWithProject = ProjectUpdate & { projectName: string };

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}

export function Updates() {
  const [updates, setUpdates] = useState<UpdateWithProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<{ updates: UpdateWithProject[] }>("/client/updates")
      .then((payload) => {
        if (active) setUpdates(payload.updates);
      })
      .catch((problem) => {
        if (active) setError(problem instanceof Error ? problem.message : "Não foi possível carregar as atualizações.");
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) return <div className="p-note">{error}</div>;
  if (!updates) return <LoadingBlock label="A carregar atualizações…" />;
  if (updates.length === 0) {
    return (
      <EmptyState
        title="Ainda sem atualizações"
        text="Assim que a equipa publicar novidades sobre as suas obras, aparecem aqui."
      />
    );
  }

  return (
    <section className="p-section" aria-labelledby="atualizacoes-titulo">
      <div className="p-section__head">
        <h2 id="atualizacoes-titulo" className="p-section__title">
          Atualizações das obras
        </h2>
      </div>

      <ul className="p-list">
        {updates.map((update) => (
          <li key={update.id} className="p-list__row" style={{ display: "block" }}>
            <p className="mono-label">{formatDate(update.createdAt)}</p>
            <p className="p-list__title" style={{ marginTop: 6 }}>
              {update.title}
            </p>
            <p className="p-list__meta">
              <Link to={`/obras/${update.projectId}`}>{update.projectName}</Link>
              {typeof update.progress === "number" ? ` · ${update.progress}% concluído` : ""}
            </p>
            <p style={{ marginTop: 8, color: "var(--ink-muted)" }}>{update.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
