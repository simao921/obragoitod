import { useState } from "react";
import {
  Alert,
  Button,
  CheckboxField,
  Dialog,
  LoadingBlock,
  SelectField,
  TextAreaField,
  TextField,
  useApi,
} from "@obragoito/ui";
import { api, formatDateTime, isApiError, type AdminProject, type Message, type Role, type Thread } from "@obragoito/core";

type UserRow = { id: string; fullName: string; email: string; role: Role; status: string };

export function Messages() {
  const { data, loading, error, reload } = useApi<{ threads: Thread[] }>("/admin/threads");
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);

  const thread = useApi<{ thread: Thread; messages: Message[] }>(selected ? `/admin/threads/${selected}` : null);

  async function send() {
    if (!selected || draft.trim().length === 0) return;
    setSending(true);
    try {
      await api.post(`/admin/threads/${selected}/messages`, { body: draft });
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
          <p className="p-subtitle">
            Conversas com clientes e trabalhadores. Cada pessoa só vê as conversas em que participa.
          </p>
        </div>
        <Button size="sm" variant="solid" onClick={() => setOpen(true)}>
          Nova conversa
        </Button>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {loading ? <LoadingBlock label="A carregar conversas…" /> : null}

      {data && data.threads.length === 0 ? (
        <p className="p-empty-state">
          Sem conversas. Os clientes e trabalhadores podem iniciar uma conversa a partir dos respetivos
          portais.
        </p>
      ) : null}

      {data && data.threads.length > 0 ? (
        <div style={{ display: "grid", gap: "var(--space-5)" }}>
          <div className="p-list">
            {data.threads.map((item) => (
              <button
                type="button"
                key={item.id}
                className="p-list__row"
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: 0,
                  borderBottom: "1px solid var(--slate)",
                  background: item.id === selected ? "var(--white-warm)" : "transparent",
                  cursor: "pointer",
                }}
                onClick={() => setSelected(item.id)}
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
                    {item.participantNames.join(", ")}
                    {item.projectName ? ` · ${item.projectName}` : ""}
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
                <span className="p-note">{thread.data?.thread.participantNames.join(", ")}</span>
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
                  {(thread.data?.messages.length ?? 0) === 0 ? <p className="p-note">Sem mensagens.</p> : null}
                </div>
                <div className="p-composer">
                  <TextAreaField
                    label="Responder"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={3}
                  />
                  <div>
                    <Button size="sm" variant="solid" onClick={send} disabled={sending || draft.trim().length === 0}>
                      {sending ? "A enviar…" : "Enviar mensagem"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <NewThreadDialog
        open={open}
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

function NewThreadDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => Promise<void> }) {
  const { data: usersData } = useApi<{ users: UserRow[] }>(open ? "/admin/users" : null);
  const { data: projectsData } = useApi<{ projects: AdminProject[] }>(open ? "/admin/projects" : null);
  const [subject, setSubject] = useState("");
  const [projectId, setProjectId] = useState("");
  const [body, setBody] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const candidates = (usersData?.users ?? []).filter((user) => user.status === "active");

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<{ id: string }>("/admin/threads", {
        subject,
        projectId: projectId || null,
        participantIds: participants,
        body,
      });
      setSubject("");
      setBody("");
      setParticipants([]);
      setProjectId("");
      await onCreated(result.id);
    } catch (createError) {
      setError(isApiError(createError) ? createError.message : "Não foi possível criar a conversa.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      title="Nova conversa"
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="solid"
            onClick={create}
            disabled={busy || subject.length < 2 || body.length < 1 || participants.length === 0}
          >
            {busy ? "A criar…" : "Criar conversa"}
          </Button>
        </>
      }
    >
      <div className="p-form-grid">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <TextField label="Assunto" value={subject} onChange={(event) => setSubject(event.target.value)} />
        <SelectField
          label="Obra associada"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          options={(projectsData?.projects ?? []).map((project) => ({ value: project.id, label: project.name }))}
          placeholder="Sem obra associada"
          optional
        />
        <div>
          <p className="field__label" style={{ marginBottom: 8 }}>
            Participantes
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {candidates.map((user) => (
              <CheckboxField
                key={user.id}
                label={`${user.fullName} · ${user.role === "client" ? "cliente" : user.role === "worker" ? "trabalhador" : "administração"}`}
                checked={participants.includes(user.id)}
                onChange={(event) =>
                  setParticipants((current) =>
                    event.target.checked ? [...current, user.id] : current.filter((id) => id !== user.id),
                  )
                }
              />
            ))}
            {candidates.length === 0 ? <p className="p-note">Crie contas antes de iniciar conversas.</p> : null}
          </div>
        </div>
        <TextAreaField label="Primeira mensagem" value={body} onChange={(event) => setBody(event.target.value)} />
      </div>
    </Dialog>
  );
}
