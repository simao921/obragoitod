import { useState } from "react";
import { Alert, Button, EmptyState, LoadingBlock, useApi } from "@obragoito/ui";
import { api, isApiError } from "@obragoito/core";

type DailyPayload = {
  date: string;
  humanDate: string;
  entries: {
    id: string;
    projectName: string;
    workerName: string;
    transcript: string;
    status: "open" | "closed";
    createdAt: string;
  }[];
  summaries: {
    id: string;
    projectName: string;
    summary: string;
    recipients: string[];
    emailsSent: number;
    createdAt: string;
  }[];
  emailConfigured: boolean;
  aiConfigured: boolean;
};

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

export function RegistoDiario() {
  const [date, setDate] = useState(today());
  const { data, loading, error, reload } = useApi<DailyPayload>(`/admin/daily?date=${date}`);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function closeDay() {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await api.post<{ projects: unknown[]; emailConfigured: boolean; aiUsed: boolean }>(
        "/admin/daily/close",
        { date },
      );
      setFeedback({
        tone: "success",
        message: result.emailConfigured
          ? `Dia fechado. Relatórios gerados para ${result.projects.length} obra(s) e enviados por email.`
          : `Dia fechado. Relatórios gerados para ${result.projects.length} obra(s). Configure o email para envio automático.`,
      });
      await reload();
    } catch (problem) {
      setFeedback({
        tone: "error",
        message: isApiError(problem) ? problem.message : "Não foi possível fechar o dia.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function download(summaryId: string) {
    const response = await fetch(`/api/admin/daily/${summaryId}/pdf`, { credentials: "include" });
    if (!response.ok) {
      setFeedback({ tone: "error", message: "Não foi possível descarregar o PDF." });
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-${date}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="p-page-head">
        <div>
          <h1 className="p-title">Registo diário</h1>
          <p className="p-subtitle">
            Fechar o dia gera o PDF com quem registou e quem faltou, resume com IA quando configurada e envia aos
            clientes de cada obra.
          </p>
        </div>
        <div className="p-toolbar">
          <input
            type="date"
            className="input"
            style={{ maxWidth: 180 }}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-label="Data do registo"
          />
          <Button variant="solid" size="sm" onClick={closeDay} disabled={busy}>
            {busy ? "A fechar…" : "Fechar dia e enviar"}
          </Button>
        </div>
      </div>

      {feedback ? <Alert tone={feedback.tone}>{feedback.message}</Alert> : null}
      {loading ? <LoadingBlock label="A carregar registos…" /> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      {data ? (
        <>
          <p className="p-note">
            {data.entries.length} registo(s) · {data.summaries.length} relatório(s) gerado(s) · IA{" "}
            {data.aiConfigured ? "ativa" : "por configurar"} · Email {data.emailConfigured ? "ativo" : "por configurar"}
          </p>

          {data.summaries.length > 0 ? (
            <div className="p-section">
              <div className="p-section__head">
                <h2 className="p-section__title">Relatórios gerados</h2>
              </div>
              <ul className="p-list">
                {data.summaries.map((summary) => (
                  <li key={summary.id} className="p-list__row">
                    <div className="p-list__main">
                      <p className="p-list__title">{summary.projectName}</p>
                      <p className="p-list__meta">
                        {summary.recipients.length} destinatário(s) · {summary.emailsSent} email(s) enviado(s)
                      </p>
                      <p style={{ marginTop: 6, color: "var(--ink-muted)" }}>{summary.summary}</p>
                    </div>
                    <div className="p-list__actions">
                      <Button size="sm" onClick={() => download(summary.id)}>
                        PDF
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="p-section">
            <div className="p-section__head">
              <h2 className="p-section__title">Registos recebidos</h2>
            </div>
            {data.entries.length === 0 ? (
              <EmptyState title="Sem registos neste dia" text="A equipa ainda não enviou registos para esta data." />
            ) : (
              <ul className="p-list">
                {data.entries.map((entry) => (
                  <li key={entry.id} className="p-list__row" style={{ display: "block" }}>
                    <p className="mono-label">
                      {entry.projectName} · {entry.workerName}
                    </p>
                    <p style={{ marginTop: 6 }}>{entry.transcript}</p>
                    <p className="p-list__meta">{entry.status === "closed" ? "Fechado" : "Aberto"}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </>
  );
}
