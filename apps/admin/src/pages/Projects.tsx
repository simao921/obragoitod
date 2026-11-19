import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, Dialog, LoadingBlock, SelectField, TextField, CheckboxField, useApi } from "@obragoito/ui";
import { api, isApiError, SERVICE_CATEGORIES, slugify, type AdminProject, type ProjectStatus } from "@obragoito/core";

export function Projects({ status }: { status?: ProjectStatus } = {}) {
  const { data, loading, error, reload } = useApi<{ projects: AdminProject[] }>("/admin/projects");
  const projects = (data?.projects ?? []).filter((project) => !status || project.status === status);

  async function changeStatus(project: AdminProject, next: ProjectStatus) {
    try {
      await api.patch(`/admin/projects/${project.id}/status`, { status: next });
      await reload();
    } catch {
      setFeedback("Não foi possível alterar o estado da obra.");
    }
  }
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "urbanismo",
    location: "",
    summary: "",
    isPublished: false,
  });

  async function create() {
    setSaving(true);
    setFeedback(null);
    try {
      await api.post("/admin/projects", {
        ...form,
        slug: slugify(form.name),
      });
      setOpen(false);
      setForm({ name: "", category: "urbanismo", location: "", summary: "", isPublished: false });
      await reload();
    } catch (error) {
      setFeedback(isApiError(error) ? error.message : "Não foi possível criar a obra.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="p-page-head">
        <div>
          <h1 className="p-title">
            {status === "active" ? "Obras atuais" : status === "completed" ? "Obras antigas" : "Obras"}
          </h1>
          <p className="p-subtitle">
            {status === "completed"
              ? "Obras concluídas, guardadas no arquivo da empresa."
              : "Crie obras, atribua clientes e trabalhadores e publique atualizações. Só as obras publicadas aparecem no site."}
          </p>
        </div>
        <Button variant="solid" size="sm" onClick={() => setOpen(true)}>
          Nova obra
        </Button>
      </div>

      {feedback ? (
        <div style={{ marginBottom: "var(--space-5)" }}>
          <Alert tone="error">{feedback}</Alert>
        </div>
      ) : null}

      {loading ? <LoadingBlock label="A carregar obras…" /> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      {data && projects.length === 0 ? (
        <p className="p-empty-state">
          {status === "completed"
            ? "Ainda não há obras antigas. Quando concluir uma obra, marque-a como concluída."
            : "Ainda não existem obras. Crie a primeira obra e atribua um cliente para começar."}
        </p>
      ) : null}

      {projects.length > 0 ? (
        <div className="table-wrap panel">
          <table className="table">
            <thead>
              <tr>
                <th>Obra</th>
                <th>Área</th>
                <th>Equipa</th>
                <th>Atualizações</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <Link to={`/obras/${project.id}`} className="table__strong link-underline">
                      {project.name}
                    </Link>
                    <div className="p-list__meta">{project.location ?? "localização por indicar"}</div>
                  </td>
                  <td>{SERVICE_CATEGORIES[project.category]}</td>
                  <td>{project.assignments.length}</td>
                  <td>{project.updateCount}</td>
                  <td>
                    <span className={`badge ${project.isPublished ? "badge--success" : ""}`.trim()}>
                      {project.isPublished ? "Publicada" : "Rascunho"}
                    </span>
                  </td>
                  <td>
                    <div className="p-inline-actions">
                      <Link to={`/obras/${project.id}`} className="btn btn--quiet btn--sm">
                        Abrir
                      </Link>
                      <button
                        type="button"
                        className="btn btn--quiet btn--sm"
                        onClick={() => changeStatus(project, project.status === "completed" ? "active" : "completed")}
                      >
                        {project.status === "completed" ? "Reabrir" : "Concluir"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Dialog
        open={open}
        title="Nova obra"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="quiet" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="solid" onClick={create} disabled={saving || form.name.length < 2}>
              {saving ? "A criar…" : "Criar obra"}
            </Button>
          </>
        }
      >
        <div className="p-form-grid">
          <TextField
            label="Nome da obra"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
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
            label="Resumo"
            value={form.summary}
            onChange={(event) => setForm({ ...form, summary: event.target.value })}
            hint="Uma frase para o cartão do projeto."
            optional
          />
          <CheckboxField
            label="Publicar no site"
            checked={form.isPublished}
            onChange={(event) => setForm({ ...form, isPublished: event.target.checked })}
          />
        </div>
      </Dialog>
    </>
  );
}
