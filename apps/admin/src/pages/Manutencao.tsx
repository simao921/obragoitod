import { useEffect, useState } from "react";
import { Alert, Button, LoadingBlock, TextAreaField, useApi } from "@obragoito/ui";
import { api, isApiError } from "@obragoito/core";

type MaintenancePayload = { maintenance: { enabled: boolean; message: string | null; since: string | null } };

export function Manutencao() {
  const { data, loading, error, reload } = useApi<MaintenancePayload>("/admin/maintenance");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (data?.maintenance.message) setMessage(data.maintenance.message);
  }, [data?.maintenance.message]);

  async function toggle(enabled: boolean) {
    setBusy(true);
    setFeedback(null);
    try {
      await api.patch("/admin/maintenance", { enabled, message: message.trim() || undefined });
      setFeedback({
        tone: "success",
        message: enabled
          ? "Modo manutenção ativo. Site, portal de cliente e portal da equipa mostram a página de manutenção."
          : "Modo manutenção desativado. Os portais voltam a estar acessíveis.",
      });
      await reload();
    } catch (problem) {
      setFeedback({
        tone: "error",
        message: isApiError(problem) ? problem.message : "Não foi possível alterar o modo de manutenção.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingBlock label="A carregar estado…" />;
  if (error) return <Alert tone="error">{error}</Alert>;

  const enabled = data?.maintenance.enabled ?? false;

  return (
    <>
      <div className="p-page-head">
        <div>
          <h1 className="p-title">Manutenção</h1>
          <p className="p-subtitle">
            Quando ativo, o site público, o portal de cliente e o portal da equipa mostram apenas a página de
            manutenção. A gestão e o portal de desenvolvimento continuam a funcionar.
          </p>
        </div>
        <span className={`badge ${enabled ? "badge--danger" : "badge--success"}`.trim()}>
          {enabled ? "Em manutenção" : "Online"}
        </span>
      </div>

      {feedback ? <Alert tone={feedback.tone}>{feedback.message}</Alert> : null}

      <div className="p-card" style={{ padding: "var(--space-5)" }}>
        <TextAreaField
          label="Mensagem mostrada aos visitantes"
          rows={3}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          hint="Deixe em branco para usar a mensagem padrão da Obragoito."
        />

        <div className="p-inline-actions">
          {enabled ? (
            <Button variant="solid" onClick={() => toggle(false)} disabled={busy}>
              {busy ? "A guardar…" : "Desativar manutenção"}
            </Button>
          ) : (
            <Button variant="solid" onClick={() => toggle(true)} disabled={busy}>
              {busy ? "A guardar…" : "Ativar manutenção"}
            </Button>
          )}
        </div>

        {enabled && data?.maintenance.since ? (
          <p className="p-note">Ativo desde {new Date(data.maintenance.since).toLocaleString("pt-PT")}.</p>
        ) : null}
      </div>
    </>
  );
}
