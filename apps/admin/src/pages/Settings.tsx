import { useEffect, useState } from "react";
import { Alert, LoadingBlock, useApi } from "@obragoito/ui";
import { api, isApiError, type AppSettings } from "@obragoito/core";

type ApiConfig = {
  configured: boolean;
  authProvider: string;
  storageDriver: string;
  voiceAvailable: boolean;
  transcriptionProvider: string | null;
  emailConfigured: boolean;
};

export function Settings() {
  const { data, loading, error, reload } = useApi<AppSettings>("/admin/settings");
  const { data: config } = useApi<ApiConfig>("/config");
  const [enabled, setEnabled] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setEnabled(data.voiceEnabled);
  }, [data]);

  async function save() {
    setSaving(true);
    setFeedback(null);
    try {
      await api.patch("/admin/settings", { voiceEnabled: enabled });
      setFeedback("Definição guardada.");
      await reload();
    } catch (error) {
      setFeedback(isApiError(error) ? error.message : "Não foi possível guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingBlock label="A carregar definições…" />;
  if (error) return <Alert tone="error">{error}</Alert>;

  return (
    <>
      <div className="p-page-head">
        <div>
          <h1 className="p-title">Definições</h1>
          <p className="p-subtitle">Funcionalidades dos portais e estado da configuração técnica.</p>
        </div>
      </div>

      {feedback ? (
        <div style={{ marginBottom: "var(--space-5)" }}>
          <Alert tone="success">{feedback}</Alert>
        </div>
      ) : null}

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Entrada por voz e transcrição</h2>
        </div>
        <div className="panel__body" style={{ display: "grid", gap: "var(--space-4)" }}>
          <label className="checkbox">
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
            <span>Permitir que os trabalhadores gravem mensagens de voz</span>
          </label>

          <div className="p-note">
            {data?.voiceAvailable ? (
              <>
                Serviço de transcrição ativo ({data.transcriptionProvider}). O áudio é processado e descartado —
                não fica guardado.
              </>
            ) : (
              <>
                O serviço de transcrição ainda não está configurado neste ambiente. A gravação aparece
                desativada e a escrita manual continua disponível. Defina <code>TRANSCRIPTION_PROVIDER</code> e a
                chave correspondente no servidor para ativar.
              </>
            )}
          </div>

          <div>
            <button type="button" className="btn btn--solid btn--sm" onClick={save} disabled={saving}>
              {saving ? "A guardar…" : "Guardar definição"}
            </button>
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginTop: "var(--space-6)" }}>
        <div className="panel__head">
          <h2 className="panel__title">Estado técnico</h2>
        </div>
        <div className="panel__body">
          <div className="p-docs">
            <div className="p-doc">
              <span className="p-doc__name">Autenticação</span>
              <span className="p-doc__meta">{config?.authProvider === "supabase" ? "Supabase Auth" : "Sessões locais"}</span>
            </div>
            <div className="p-doc">
              <span className="p-doc__name">Armazenamento de documentos</span>
              <span className="p-doc__meta">{config?.storageDriver === "supabase" ? "Supabase Storage" : "Disco local"}</span>
            </div>
            <div className="p-doc">
              <span className="p-doc__name">Notificação de pedidos por email</span>
              <span className="p-doc__meta">{config?.emailConfigured ? "Configurada" : "Não configurada"}</span>
            </div>
            <div className="p-doc">
              <span className="p-doc__name">Transcrição</span>
              <span className="p-doc__meta">{config?.voiceAvailable ? "Configurada" : "Não configurada"}</span>
            </div>
          </div>
          <p className="p-note" style={{ marginTop: "var(--space-4)" }}>
            Os pedidos ficam sempre registados na base de dados, mesmo quando o envio de email não está
            configurado.
          </p>
        </div>
      </section>
    </>
  );
}
