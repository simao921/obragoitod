import { Alert, LoadingBlock, useApi } from "@obragoito/ui";
import { api, formatDateTime, type WorkerReport } from "@obragoito/core";

export function Reports() {
  const { data, loading, error, reload } = useApi<{ reports: WorkerReport[] }>("/admin/reports");

  async function setStatus(id: string, status: "submitted" | "reviewed") {
    await api.patch(`/admin/reports/${id}`, { status }).catch(() => undefined);
    await reload();
  }

  return (
    <>
      <div className="p-page-head">
        <div>
          <h1 className="p-title">Relatórios de obra</h1>
          <p className="p-subtitle">
            Relatórios enviados pela equipa. Marque como revisto depois de analisar cada registo.
          </p>
        </div>
      </div>

      {loading ? <LoadingBlock label="A carregar relatórios…" /> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      {data && data.reports.length === 0 ? (
        <p className="p-empty-state">Sem relatórios. A equipa envia relatórios a partir do portal de campo.</p>
      ) : null}

      {data && data.reports.length > 0 ? (
        <div className="p-list">
          {data.reports.map((report) => (
            <div className="p-list__row" key={report.id}>
              <div className="p-list__main">
                <p className="p-list__title">
                  {report.workerName} · {report.projectName}
                  {report.progress !== null ? ` · ${report.progress}%` : ""}
                </p>
                <p className="p-list__meta" style={{ whiteSpace: "normal" }}>
                  {report.body}
                </p>
                <p className="p-list__meta">{formatDateTime(report.createdAt)}</p>
              </div>
              <div className="p-list__actions">
                <span className={`badge ${report.status === "submitted" ? "badge--accent" : "badge--success"}`}>
                  {report.status === "submitted" ? "Por rever" : "Revisto"}
                </span>
                <select
                  className="p-select-inline"
                  value={report.status}
                  onChange={(event) => setStatus(report.id, event.target.value as "submitted" | "reviewed")}
                  aria-label={`Estado do relatório de ${report.workerName}`}
                >
                  <option value="submitted">Por rever</option>
                  <option value="reviewed">Revisto</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
