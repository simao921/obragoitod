import { useCallback, useEffect, useState } from "react";
import { api, isApiError, type DevOverview } from "@obragoito/core";

type Tab = "overview" | "errors" | "maintenance" | "integrations";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Visão geral" },
  { id: "errors", label: "Erros" },
  { id: "maintenance", label: "Manutenção" },
  { id: "integrations", label: "Integrações" },
];

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="dev-card">
      <p className="dev-card__label">{label}</p>
      <p className="dev-card__value">{value}</p>
      {hint ? <p className="dev-card__hint">{hint}</p> : null}
    </div>
  );
}

function Tag({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`dev-tag ${ok ? "dev-tag--ok" : "dev-tag--warn"}`}>{label}</span>;
}

function uptimeLabel(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function Dashboard({ userName }: { userName: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<DevOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [geminiKey, setGeminiKey] = useState("");

  const load = useCallback(() => {
    api
      .get<DevOverview>("/dev/overview")
      .then((payload) => {
        setData(payload);
        setError(null);
        setMessage((current) => current || payload.maintenance.message || "");
      })
      .catch((problem) => setError(isApiError(problem) ? problem.message : "Sem ligação à API."));
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function clearErrors() {
    setBusy(true);
    try {
      await api.delete("/dev/errors");
      load();
    } catch {
      setFeedback("Não foi possível limpar os erros.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleMaintenance(enabled: boolean) {
    setBusy(true);
    setFeedback(null);
    try {
      await api.patch("/admin/maintenance", { enabled, message: message.trim() || undefined });
      setFeedback(enabled ? "Modo manutenção ativo." : "Modo manutenção desativado.");
      load();
    } catch (problem) {
      setFeedback(isApiError(problem) ? problem.message : "Não foi possível alterar o modo.");
    } finally {
      setBusy(false);
    }
  }

  async function saveGemini() {
    setBusy(true);
    setFeedback(null);
    try {
      await api.patch("/admin/integrations", { geminiApiKey: geminiKey.trim() });
      setFeedback("Chave do Gemini guardada.");
      setGeminiKey("");
      load();
    } catch (problem) {
      setFeedback(isApiError(problem) ? problem.message : "Não foi possível guardar a chave.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="dev-main">
      <div className="dev-head">
        <div>
          <h1 className="dev-title">Estado do sistema</h1>
          <p className="dev-sub">Sessão de {userName} · atualiza a cada 30 segundos</p>
        </div>
        <div className="dev-actions">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="dev-btn"
              aria-pressed={tab === item.id}
              style={tab === item.id ? { borderColor: "var(--dev-accent)", color: "var(--dev-accent)" } : undefined}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {feedback ? <p className="dev-sub">{feedback}</p> : null}
      {!data ? <p className="dev-sub">{error ?? "A carregar dados da API…"}</p> : null}

      {data && tab === "overview" ? (
        <>
          <div className="dev-grid">
            <Card label="Disponibilidade" value={uptimeLabel(data.uptimeSeconds)} hint={data.nodeVersion} />
            <Card label="Latência BD" value={`${data.databaseLatencyMs} ms`} hint={data.environment} />
            <Card label="Memória" value={`${data.memoryMb} MB`} hint="RSS do processo" />
            <Card label="Erros 24h" value={String(data.counts.errors24h)} hint="registados na API" />
          </div>

          <div className="dev-grid" style={{ marginTop: 12 }}>
            <Card label="Contas" value={String(data.counts.users)} />
            <Card label="Clientes" value={String(data.counts.clients)} />
            <Card label="Trabalhadores" value={String(data.counts.workers)} />
            <Card label="Obras" value={String(data.counts.projects)} />
          </div>

          <div className="dev-panel">
            <h2 className="dev-panel__title">Serviços</h2>
            <div className="dev-row">
              <span>Autenticação</span>
              <span className="dev-tag">{data.config.authProvider}</span>
            </div>
            <div className="dev-row">
              <span>Armazenamento</span>
              <span className="dev-tag">{data.config.storageDriver}</span>
            </div>
            <div className="dev-row">
              <span>Supabase</span>
              <Tag ok={data.config.supabaseConfigured} label={data.config.supabaseConfigured ? "Ligado" : "Por configurar"} />
            </div>
            <div className="dev-row">
              <span>Email (Resend)</span>
              <Tag ok={data.config.emailConfigured} label={data.config.emailConfigured ? "Ligado" : "Por configurar"} />
            </div>
            <div className="dev-row">
              <span>Gemini</span>
              <Tag ok={data.config.geminiConfigured} label={data.config.geminiConfigured ? "Ligado" : "Por configurar"} />
            </div>
            <div className="dev-row">
              <span>Transcrição de áudio</span>
              <Tag
                ok={data.config.transcriptionAvailable}
                label={data.config.transcriptionAvailable ? "Ligado" : "Por configurar"}
              />
            </div>
          </div>
        </>
      ) : null}

      {data && tab === "errors" ? (
        <div className="dev-panel">
          <div className="dev-head">
            <h2 className="dev-panel__title">{data.counts.errors24h} erro(s) nas últimas 24 horas</h2>
            <button type="button" className="dev-btn" disabled={busy} onClick={clearErrors}>
              Limpar registo
            </button>
          </div>
          <div className="dev-errors">
            {data.errors.length === 0 ? <p className="dev-sub">Sem erros registados.</p> : null}
            {data.errors.map((entry) => (
              <article key={entry.id} className="dev-error">
                <div className="dev-error__meta">
                  <span>{dateLabel(entry.createdAt)}</span>
                  <span>{entry.level}</span>
                  {entry.method ? <span>{entry.method}</span> : null}
                  {entry.status ? <span>{entry.status}</span> : null}
                  {entry.path ? <span>{entry.path}</span> : null}
                </div>
                <p className="dev-error__message">{entry.message}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {data && tab === "maintenance" ? (
        <div className="dev-panel">
          <h2 className="dev-panel__title">Modo manutenção</h2>
          <p className="dev-sub">
            Site, portal de cliente e portal da equipa mostram a página de manutenção. Gestão e desenvolvimento
            continuam online.
          </p>
          <div style={{ marginTop: 12 }}>
            <textarea
              className="dev-input"
              rows={3}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              aria-label="Mensagem de manutenção"
              placeholder="Mensagem mostrada aos visitantes"
            />
          </div>
          <div className="dev-actions" style={{ marginTop: 12 }}>
            <button type="button" className="dev-btn dev-btn--accent" disabled={busy} onClick={() => toggleMaintenance(true)}>
              Ativar manutenção
            </button>
            <button type="button" className="dev-btn" disabled={busy} onClick={() => toggleMaintenance(false)}>
              Desativar
            </button>
            <Tag ok={!data.maintenance.enabled} label={data.maintenance.enabled ? "Em manutenção" : "Online"} />
          </div>
        </div>
      ) : null}

      {data && tab === "integrations" ? (
        <div className="dev-panel">
          <h2 className="dev-panel__title">Chave do Gemini</h2>
          <p className="dev-sub">
            Usada para resumir os relatórios diários. Também pode ser definida no ambiente como GEMINI_API_KEY.
          </p>
          <div style={{ marginTop: 12 }}>
            <input
              className="dev-input"
              type="password"
              value={geminiKey}
              onChange={(event) => setGeminiKey(event.target.value)}
              placeholder="AIza…"
              autoComplete="off"
            />
          </div>
          <div className="dev-actions" style={{ marginTop: 12 }}>
            <button type="button" className="dev-btn dev-btn--accent" disabled={busy || geminiKey.length < 10} onClick={saveGemini}>
              Guardar chave
            </button>
            <Tag
              ok={data.config.geminiConfigured}
              label={data.config.geminiConfigured ? "Configurada" : "Sem chave"}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
