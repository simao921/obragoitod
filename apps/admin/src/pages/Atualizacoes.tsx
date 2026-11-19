import { Link } from "react-router-dom";
import { Alert, Badge, EmptyState, LoadingBlock, useApi } from "@obragoito/ui";

type AdminUpdate = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  body: string;
  progress: number | null;
  visibleToClient: boolean;
  authorName: string | null;
  createdAt: string;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}

export function Atualizacoes() {
  const { data, loading, error } = useApi<{ updates: AdminUpdate[] }>("/admin/updates");
  const updates = data?.updates ?? [];

  return (
    <>
      <div className="p-page-head">
        <div>
          <h1 className="p-title">Atualizações das obras</h1>
          <p className="p-subtitle">
            Tudo o que foi publicado para os clientes. As atualizações marcadas como visíveis aparecem no portal do
            cliente e no resumo diário.
          </p>
        </div>
      </div>

      {loading ? <LoadingBlock label="A carregar atualizações…" /> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      {!loading && !error && (updates?.length ?? 0) === 0 ? (
        <EmptyState
          title="Ainda sem atualizações"
          text="Publique a primeira atualização dentro do detalhe de uma obra."
        />
      ) : null}

      {updates && updates.length > 0 ? (
        <ul className="p-list">
          {updates.map((update) => (
            <li key={update.id} className="p-list__row" style={{ display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <p className="mono-label">{formatDate(update.createdAt)}</p>
                <Badge tone={update.visibleToClient ? "success" : "default"}>
                  {update.visibleToClient ? "Visível ao cliente" : "Interna"}
                </Badge>
              </div>
              <p className="p-list__title" style={{ marginTop: 6 }}>
                {update.title}
              </p>
              <p className="p-list__meta">
                <Link to={`/obras/${update.projectId}`}>{update.projectName}</Link>
                {typeof update.progress === "number" ? ` · ${update.progress}%` : ""}
                {update.authorName ? ` · ${update.authorName}` : ""}
              </p>
              <p style={{ marginTop: 8, color: "var(--ink-muted)" }}>{update.body}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
