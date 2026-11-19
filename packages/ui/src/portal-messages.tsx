import { useState } from "react";
import { Alert, Button, LoadingBlock } from "./primitives";
import { SelectField, TextAreaField, TextField } from "./fields";
import { Dialog } from "./dialog";
import { useApi } from "./hooks";
import { VoiceRecorder } from "./voice-recorder";
import { api, formatDateTime, isApiError, type Message, type Thread } from "@obragoito/core";

type ProjectOption = { id: string; name: string };

/**
 * Conversas para clientes e trabalhadores: cada pessoa só vê as suas.
 * `basePath` é `/client` ou `/worker`.
 */
export function PortalMessages({ basePath, withVoice = false }: { basePath: string; withVoice?: boolean }) {
  const { data, loading, error, reload } = useApi<{ threads: Thread[] }>(`${basePath}/threads`);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);

  const thread = useApi<{ thread: Thread; messages: Message[] }>(
    selected ? `${basePath}/threads/${selected}` : null,
  );

  async function send() {
    if (!selected || draft.trim().length === 0) return;
    setSending(true);
    try {
      await api.post(`${basePath}/threads/${selected}/messages`, { body: draft });
      setDraft("");
      await thread.reload();
      await reload();
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="p-page-head">
        <div>
          <h1 className="p-title">Mensagens</h1>
          <p className="p-subtitle">Fale com a administração da Obragoito. As conversas são privadas.</p>
        </div>
        <Button size="sm" variant="solid" onClick={() => setOpen(true)}>
          Nova mensagem
        </Button>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {loading ? <LoadingBlock label="A carregar conversas…" /> : null}

      {data && data.threads.length === 0 ? (
        <p className="p-empty-state">Sem conversas. Inicie uma nova mensagem para falar com a equipa.</p>
      ) : null}

      {data && data.threads.length > 0 ? (
        <div style={{ display: "grid", gap: "var(--space-5)" }}>
          <div className="p-list">
            {data.threads.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setSelected(item.id)}
                className="p-list__row"
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: 0,
                  borderBottom: "1px solid var(--slate)",
                  background: item.id === selected ? "var(--white-warm)" : "transparent",
                  cursor: "pointer",
                }}
              >
                <span className="p-list__main">
                  <span className="p-list__title" style={{ display: "block" }}>
                    {item.subject}
                    {item.unread > 0 ? (
                      <span className="badge badge--accent" style={{ marginLeft: 8 }}>
                        {item.unread}
                      </span>
                    ) : null}
                  </span>
                  <span className="p-list__meta" style={{ display: "block" }}>
                    {item.projectName ?? "Sem obra associada"}
                  </span>
                </span>
                <span className="p-list__meta">{item.lastMessageAt ? formatDateTime(item.lastMessageAt) : "—"}</span>
              </button>
            ))}
          </div>

          {selected ? (
            <div className="panel">
              <div className="panel__head">
                <h2 className="panel__title">{thread.data?.thread.subject ?? "Conversa"}</h2>
              </div>
              <div className="panel__body">
                {thread.loading ? <LoadingBlock label="A carregar mensagens…" /> : null}
                {thread.error ? <Alert tone="error">{thread.error}</Alert> : null}
                <div className="p-messages">
                  {(thread.data?.messages ?? []).map((message) => (
                    <div key={message.id} className={`p-message ${message.isMine ? "p-message--mine" : ""}`.trim()}>
                      <span className="p-message__meta">
                        {message.senderName} · {formatDateTime(message.createdAt)}
                      </span>
                      <p className="p-message__body">{message.body}</p>
                    </div>
                  ))}
                </div>
                <div className="p-composer">
                  {withVoice ? (
                    <VoiceRecorder onText={(text) => setDraft((current) => (current ? `${current}\n${text}` : text))} />
                  ) : null}
                  <TextAreaField label="Responder" value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} />
                  <div>
                    <Button size="sm" variant="solid" onClick={send} disabled={sending || draft.trim().length === 0}>
                      {sending ? "A enviar…" : "Enviar"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <NewMessageDialog
        open={open}
        basePath={basePath}
        onClose={() => setOpen(false)}
        onCreated={async (id) => {
          setOpen(false);
          setSelected(id);
          await reload();
        }}
      />
    </>
  );
}

function NewMessageDialog({
  open,
  basePath,
  onClose,
  onCreated,
}: {
  open: boolean;
  basePath: string;
  onClose: () => void;
  onCreated: (id: string) => Promise<void>;
}) {
  const { data } = useApi<{ projects: ProjectOption[] }>(open ? `${basePath}/projects` : null);
  const [subject, setSubject] = useState("");
  const [projectId, setProjectId] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<{ id: string }>(`${basePath}/threads`, {
        subject,
        projectId: projectId || null,
        participantIds: [],
        body,
      });
      setSubject("");
      setBody("");
      setProjectId("");
      await onCreated(result.id);
    } catch (createError) {
      setError(isApiError(createError) ? createError.message : "Não foi possível enviar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      title="Nova mensagem"
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="solid" onClick={create} disabled={busy || subject.length < 2 || body.length < 1}>
            {busy ? "A enviar…" : "Enviar mensagem"}
          </Button>
        </>
      }
    >
      <div className="p-form-grid">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <TextField label="Assunto" value={subject} onChange={(event) => setSubject(event.target.value)} />
        <SelectField
          label="Obra"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          options={(data?.projects ?? []).map((project) => ({ value: project.id, label: project.name }))}
          placeholder="Sem obra associada"
          optional
        />
        <TextAreaField label="Mensagem" value={body} onChange={(event) => setBody(event.target.value)} rows={4} />
      </div>
    </Dialog>
  );
}
