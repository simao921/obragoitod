import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Button,
  LoadingBlock,
  TextAreaField,
  TextField,
  VoiceRecorder,
  useApi,
} from "@obragoito/ui";
import {
  api,
  formatDateTime,
  isApiError,
  SERVICE_CATEGORIES,
  type ProjectSummary,
  type ProjectUpdate,
  type WorkerReport,
} from "@obragoito/core";

type WorkerProjectDetail = ProjectSummary & { roleOnProject: string | null; updates: ProjectUpdate[] };

export function ProjectDetail() {
  const { id = "" } = useParams();
  const { data, loading, error, reload } = useApi<{ project: WorkerProjectDetail; reports: WorkerReport[] }>(
    `/worker/projects/${id}`,
  );

  const [body, setBody] = useState("");
  const [progress, setProgress] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

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

  async function submitReport() {
    setSaving(true);
    setFeedback(null);
    try {
      await api.post("/worker/reports", {
        projectId: project.id,
        body,
        progress: progress ? Number(progress) : null,
      });
      setBody("");
      setProgress("");
      setFeedback({ tone: "success", message: "Relatório enviado para a administração." });
      await reload();
    } catch (reportError) {
      setFeedback({
        tone: "error",
        message: isApiError(reportError) ? reportError.message : "Não foi possível enviar o relatório.",
      });
    } finally {
      setSaving(false);
    }
  }

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
            {project.roleOnProject ? ` · ${project.roleOnProject}` : ""}
          </p>
        </div>
      </div>

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Novo relatório de progresso</h2>
        </div>
        <div className="panel__body" style={{ display: "grid", gap: "var(--space-4)" }}>
          {feedback ? <Alert tone={feedback.tone}>{feedback.message}</Alert> : null}
          <VoiceRecorder onText={(text) => setBody((current) => (current ? `${current}\n${text}` : text))} />
          <TextAreaField
            label="O que foi feito hoje?"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            hint="Trabalhos executados, materiais usados, impedimentos e próximos passos."
            rows={5}
          />
          <TextField
            label="Progresso da obra (%)"
            type="number"
            min={0}
            max={100}
            value={progress}
            onChange={(event) => setProgress(event.target.value)}
            optional
          />
          <div>
            <Button size="sm" variant="solid" onClick={submitReport} disabled={saving || body.trim().length < 5}>
              {saving ? "A enviar…" : "Enviar relatório"}
            </Button>
          </div>
        </div>
      </section>

      <section className="p-section">
        <div className="p-section__head">
          <h2 className="p-section__title">Atualizações da obra</h2>
        </div>
        {project.updates.length === 0 ? (
          <p className="p-empty-state">Sem atualizações publicadas.</p>
        ) : (
          <div className="timeline">
            {project.updates.map((update) => (
              <div className="timeline__item" key={update.id}>
                <p className="timeline__date">
                  {formatDateTime(update.createdAt)}
                  {update.progress !== null ? ` · ${update.progress}%` : ""}
                </p>
                <h3 className="timeline__title">{update.title}</h3>
                <p className="timeline__body">{update.body}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="p-section">
        <div className="p-section__head">
          <h2 className="p-section__title">Os meus relatórios</h2>
        </div>
        {data.reports.length === 0 ? (
          <p className="p-empty-state">Ainda não enviou relatórios nesta obra.</p>
        ) : (
          <div className="p-list">
            {data.reports.map((report) => (
              <div className="p-list__row" key={report.id}>
                <div className="p-list__main">
                  <p className="p-list__title">
                    {formatDateTime(report.createdAt)}
                    {report.progress !== null ? ` · ${report.progress}%` : ""}
                  </p>
                  <p className="p-list__meta" style={{ whiteSpace: "normal" }}>
                    {report.body}
                  </p>
                </div>
                <div className="p-list__actions">
                  <span className={`badge ${report.status === "reviewed" ? "badge--success" : ""}`.trim()}>
                    {report.status === "reviewed" ? "Revisto" : "Enviado"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
