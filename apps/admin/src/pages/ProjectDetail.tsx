import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Button,
  CheckboxField,
  LoadingBlock,
  SelectField,
  TextAreaField,
  TextField,
  useApi,
} from "@obragoito/ui";
import {
  api,
  formatBytes,
  formatDateTime,
  isApiError,
  SERVICE_CATEGORIES,
  type AdminProject,
  type ProjectDocument,
  type ProjectPhoto,
  type ProjectUpdate,
  type Role,
} from "@obragoito/core";

type Detail = { project: AdminProject; updates: ProjectUpdate[]; documents: ProjectDocument[]; photos: ProjectPhoto[] };
type UserRow = { id: string; fullName: string; email: string; role: Role; status: string };

export function ProjectDetail() {
  const { id = "" } = useParams();
  const { data, loading, error, reload } = useApi<Detail>(`/admin/projects/${id}`);
  const { data: usersData } = useApi<{ users: UserRow[] }>("/admin/users");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const [form, setForm] = useState({
    name: "",
    category: "urbanismo",
    location: "",
    year: "",
    clientName: "",
    summary: "",
    description: "",
    isPublished: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      name: data.project.name,
      category: data.project.category,
      location: data.project.location ?? "",
      year: data.project.year ? String(data.project.year) : "",
      clientName: data.project.clientName ?? "",
      summary: data.project.summary ?? "",
      description: data.project.description ?? "",
      isPublished: data.project.isPublished,
    });
  }, [data]);

  if (loading) return <LoadingBlock label="A carregar a obra…" />;
  if (error) return <Alert tone="error">{error}</Alert>;
  if (!data) return null;

  const { project } = data;
  const assignable = (usersData?.users ?? []).filter((user) => user.role !== "admin" && user.status === "active");

  async function save() {
    setSaving(true);
    setFeedback(null);
    try {
      await api.patch(`/admin/projects/${id}`, {
        ...form,
        year: form.year ? Number(form.year) : null,
      });
      setFeedback({ tone: "success", message: "Obra atualizada." });
      await reload();
    } catch (error) {
      setFeedback({ tone: "error", message: isApiError(error) ? error.message : "Não foi possível guardar." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="p-page-head">
        <div>
          <Link to="/obras" className="mono-label">
            ← Obras
          </Link>
          <h1 className="p-title" style={{ marginTop: 8 }}>
            {project.name}
          </h1>
          <p className="p-subtitle">
            {SERVICE_CATEGORIES[project.category]} · {project.assignments.length} pessoa(s) atribuída(s)
          </p>
        </div>
        <div className="p-toolbar">
          <span className={`badge ${project.isPublished ? "badge--success" : ""}`.trim()}>
            {project.isPublished ? "Publicada" : "Rascunho"}
          </span>
          <a
            className="btn btn--sm"
            href={`${import.meta.env.VITE_PUBLIC_SITE_URL ?? "http://localhost:3000"}/projetos/${project.slug}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            Ver no site
          </a>
        </div>
      </div>

      {feedback ? (
        <div style={{ marginBottom: "var(--space-5)" }}>
          <Alert tone={feedback.tone}>{feedback.message}</Alert>
        </div>
      ) : null}

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Informação da obra</h2>
          <Button size="sm" variant="solid" onClick={save} disabled={saving}>
            {saving ? "A guardar…" : "Guardar"}
          </Button>
        </div>
        <div className="panel__body">
          <div className="p-form-grid--2">
            <TextField label="Nome" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <SelectField
              label="Área"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              options={Object.entries(SERVICE_CATEGORIES).map(([value, label]) => ({ value, label }))}
            />
            <TextField
              label="Localização"
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
              optional
            />
            <TextField
              label="Ano"
              type="number"
              value={form.year}
              onChange={(event) => setForm({ ...form, year: event.target.value })}
              optional
            />
            <TextField
              label="Cliente (nome a apresentar)"
              value={form.clientName}
              onChange={(event) => setForm({ ...form, clientName: event.target.value })}
              optional
            />
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <CheckboxField
                label="Publicar no site"
                checked={form.isPublished}
                onChange={(event) => setForm({ ...form, isPublished: event.target.checked })}
              />
            </div>
            <div className="p-span-2">
              <TextField
                label="Resumo"
                value={form.summary}
                onChange={(event) => setForm({ ...form, summary: event.target.value })}
                optional
              />
            </div>
            <div className="p-span-2">
              <TextAreaField
                label="Descrição"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                optional
              />
            </div>
          </div>
        </div>
      </section>

      <CoverUpload projectId={id} current={project.coverImage} onDone={reload} />

      <Assignments project={project} users={assignable} onDone={reload} />

      <UpdateComposer projectId={id} onDone={reload} />

      <Documents projectId={id} documents={data.documents} onDone={reload} />

      <Photos projectId={id} photos={data.photos} onDone={reload} />

      <section className="p-section">
        <div className="p-section__head">
          <h2 className="p-section__title">Histórico de atualizações</h2>
        </div>
        {data.updates.length === 0 ? (
          <p className="p-empty-state">Sem atualizações publicadas.</p>
        ) : (
          <div className="timeline">
            {data.updates.map((update) => (
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
    </>
  );
}

function CoverUpload({ projectId, current, onDone }: { projectId: string; current: string | null; onDone: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("alt", alt);
      await api.upload(`/admin/projects/${projectId}/cover`, form);
      setFile(null);
      await onDone();
    } catch (uploadError) {
      setError(isApiError(uploadError) ? uploadError.message : "Falha no upload.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="p-section">
      <div className="p-section__head">
        <h2 className="p-section__title">Imagem de capa</h2>
      </div>
      <div className="panel">
        <div className="panel__body" style={{ display: "grid", gap: "var(--space-4)" }}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          {current ? (
            <img src={current} alt="Imagem de capa atual" style={{ maxWidth: 360, border: "1px solid var(--slate)" }} />
          ) : (
            <p className="p-note">Sem imagem de capa.</p>
          )}
          <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} aria-label="Nova capa" />
          <TextField
            label="Texto alternativo"
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
            hint="Descreva a imagem para leitores de ecrã."
            optional
          />
          <div>
            <Button size="sm" variant="solid" onClick={upload} disabled={!file || busy}>
              {busy ? "A enviar…" : "Atualizar capa"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Assignments({ project, users, onDone }: { project: AdminProject; users: UserRow[]; onDone: () => Promise<void> }) {
  const [userId, setUserId] = useState("");
  const [roleOnProject, setRoleOnProject] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!userId) return;
    setError(null);
    try {
      await api.post(`/admin/projects/${project.id}/assignments`, { userId, roleOnProject });
      setUserId("");
      setRoleOnProject("");
      await onDone();
    } catch (assignmentError) {
      setError(isApiError(assignmentError) ? assignmentError.message : "Não foi possível atribuir.");
    }
  }

  async function remove(userIdToRemove: string) {
    await api.delete(`/admin/projects/${project.id}/assignments/${userIdToRemove}`).catch(() => undefined);
    await onDone();
  }

  return (
    <section className="p-section">
      <div className="p-section__head">
        <h2 className="p-section__title">Equipa e cliente</h2>
      </div>
      <div className="panel">
        <div className="panel__body" style={{ display: "grid", gap: "var(--space-4)" }}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          {project.assignments.length === 0 ? (
            <p className="p-note">Nenhuma pessoa atribuída. O cliente só vê a obra depois de atribuído.</p>
          ) : (
            <div className="p-docs">
              {project.assignments.map((assignment) => (
                <div className="p-doc" key={assignment.userId}>
                  <span className="p-doc__name">
                    {assignment.fullName} · {assignment.role === "client" ? "cliente" : "trabalhador"}
                  </span>
                  <span className="p-doc__meta">
                    <Button size="sm" variant="quiet" onClick={() => remove(assignment.userId)}>
                      Remover
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          )}

          {users.length === 0 ? (
            <p className="p-note">Crie contas de clientes ou trabalhadores para os poder atribuir.</p>
          ) : (
            <div className="p-form-grid--2">
              <SelectField
                label="Pessoa"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                options={users.map((user) => ({
                  value: user.id,
                  label: `${user.fullName} · ${user.role === "client" ? "cliente" : "trabalhador"}`,
                }))}
                placeholder="Selecionar"
              />
              <TextField
                label="Função na obra"
                value={roleOnProject}
                onChange={(event) => setRoleOnProject(event.target.value)}
                hint="Ex.: encarregado, carpinteiro, direção de obra."
                optional
              />
              <div className="p-span-2">
                <Button size="sm" variant="solid" onClick={add} disabled={!userId}>
                  Atribuir à obra
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function UpdateComposer({ projectId, onDone }: { projectId: string; onDone: () => Promise<void> }) {
  const [form, setForm] = useState({ title: "", body: "", progress: "", visibleToClient: true });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function publish() {
    setBusy(true);
    setFeedback(null);
    try {
      await api.post(`/admin/projects/${projectId}/updates`, {
        title: form.title,
        body: form.body,
        progress: form.progress ? Number(form.progress) : null,
        visibleToClient: form.visibleToClient,
      });
      setForm({ title: "", body: "", progress: "", visibleToClient: true });
      setFeedback({ tone: "success", message: "Atualização publicada." });
      await onDone();
    } catch (error) {
      setFeedback({ tone: "error", message: isApiError(error) ? error.message : "Não foi possível publicar." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="p-section">
      <div className="p-section__head">
        <h2 className="p-section__title">Publicar atualização</h2>
      </div>
      <div className="panel">
        <div className="panel__body" style={{ display: "grid", gap: "var(--space-4)" }}>
          {feedback ? <Alert tone={feedback.tone}>{feedback.message}</Alert> : null}
          <TextField label="Título" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <TextAreaField
            label="Atualização"
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
          />
          <TextField
            label="Progresso (%)"
            type="number"
            min={0}
            max={100}
            value={form.progress}
            onChange={(event) => setForm({ ...form, progress: event.target.value })}
            optional
          />
          <CheckboxField
            label="Visível para o cliente"
            checked={form.visibleToClient}
            onChange={(event) => setForm({ ...form, visibleToClient: event.target.checked })}
          />
          <div>
            <Button
              size="sm"
              variant="solid"
              onClick={publish}
              disabled={busy || form.title.length < 2 || form.body.length < 2}
            >
              {busy ? "A publicar…" : "Publicar atualização"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Documents({ projectId, documents, onDone }: { projectId: string; documents: ProjectDocument[]; onDone: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [visibleToClient, setVisibleToClient] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title || file.name);
      form.append("visibleToClient", String(visibleToClient));
      await api.upload(`/admin/projects/${projectId}/documents`, form);
      setFile(null);
      setTitle("");
      await onDone();
    } catch (uploadError) {
      setError(isApiError(uploadError) ? uploadError.message : "Falha no upload.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(documentId: string) {
    await api.delete(`/admin/documents/${documentId}`).catch(() => undefined);
    await onDone();
  }

  return (
    <section className="p-section">
      <div className="p-section__head">
        <h2 className="p-section__title">Documentos</h2>
      </div>
      <div className="panel">
        <div className="panel__body" style={{ display: "grid", gap: "var(--space-4)" }}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          {documents.length === 0 ? (
            <p className="p-note">Sem documentos partilhados.</p>
          ) : (
            <div className="p-docs">
              {documents.map((document) => (
                <div className="p-doc" key={document.id}>
                  <span className="p-doc__name">{document.title}</span>
                  <span className="p-doc__meta">
                    {formatBytes(document.sizeBytes)} · {document.visibleToClient ? "visível ao cliente" : "interno"}
                    {document.url ? (
                      <a href={document.url} target="_blank" rel="noreferrer noopener" className="link-underline" style={{ marginLeft: 12 }}>
                        Abrir
                      </a>
                    ) : null}
                    <Button size="sm" variant="quiet" onClick={() => remove(document.id)}>
                      Remover
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="p-form-grid--2">
            <TextField label="Título do documento" value={title} onChange={(event) => setTitle(event.target.value)} optional />
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.txt"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                aria-label="Ficheiro do documento"
              />
            </div>
            <div className="p-span-2">
              <CheckboxField
                label="Visível para o cliente"
                checked={visibleToClient}
                onChange={(event) => setVisibleToClient(event.target.checked)}
              />
            </div>
            <div className="p-span-2">
              <Button size="sm" variant="solid" onClick={upload} disabled={!file || busy}>
                {busy ? "A enviar…" : "Carregar documento"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Photos({ projectId, photos, onDone }: { projectId: string; photos: ProjectPhoto[]; onDone: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("caption", caption);
      form.append("alt", caption);
      await api.upload(`/admin/projects/${projectId}/photos`, form);
      setFile(null);
      setCaption("");
      await onDone();
    } catch (uploadError) {
      setError(isApiError(uploadError) ? uploadError.message : "Falha no upload.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(photoId: string) {
    await api.delete(`/admin/photos/${photoId}`).catch(() => undefined);
    await onDone();
  }

  return (
    <section className="p-section">
      <div className="p-section__head">
        <h2 className="p-section__title">Fotografias da obra</h2>
      </div>
      <div className="panel">
        <div className="panel__body" style={{ display: "grid", gap: "var(--space-4)" }}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          {photos.length === 0 ? (
            <p className="p-note">Sem fotografias. As fotografias carregadas ficam acessíveis por ligação assinada.</p>
          ) : (
            <div className="p-gallery">
              {photos.map((photo) => (
                <figure key={photo.id}>
                  {photo.url ? <img src={photo.url} alt={photo.alt ?? photo.caption ?? "Fotografia da obra"} loading="lazy" /> : null}
                  <figcaption>
                    {photo.caption ?? "Sem legenda"}
                    <Button size="sm" variant="quiet" onClick={() => remove(photo.id)}>
                      Remover
                    </Button>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
          <div className="p-form-grid--2">
            <TextField label="Legenda" value={caption} onChange={(event) => setCaption(event.target.value)} optional />
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                aria-label="Ficheiro de imagem"
              />
            </div>
            <div className="p-span-2">
              <Button size="sm" variant="solid" onClick={upload} disabled={!file || busy}>
                {busy ? "A enviar…" : "Carregar fotografia"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
