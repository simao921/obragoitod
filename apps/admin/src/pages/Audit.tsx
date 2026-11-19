import { Alert, LoadingBlock, useApi } from "@obragoito/ui";
import { formatDateTime, type AuditEntry } from "@obragoito/core";

export function Audit() {
  const { data, loading, error } = useApi<{ entries: AuditEntry[] }>("/admin/audit");

  return (
    <>
      <div className="p-page-head">
        <div>
          <h1 className="p-title">Registo de auditoria</h1>
          <p className="p-subtitle">
            Ações relevantes no sistema. Nunca são registadas palavras-passe nem conteúdo de áudio.
          </p>
        </div>
      </div>

      {loading ? <LoadingBlock label="A carregar registos…" /> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      {data && data.entries.length === 0 ? <p className="p-empty-state">Sem registos.</p> : null}

      {data && data.entries.length > 0 ? (
        <div className="table-wrap panel">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Ação</th>
                <th>Responsável</th>
                <th>Entidade</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDateTime(entry.createdAt)}</td>
                  <td className="table__strong">{entry.action}</td>
                  <td>{entry.actorName ?? "sistema"}</td>
                  <td>
                    {entry.entity ?? "—"}
                    {entry.entityId ? <span className="p-list__meta"> · {entry.entityId.slice(0, 8)}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
