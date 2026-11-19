import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  LoadingBlock,
  SelectField,
  TextField,
  useApi,
} from "@obragoito/ui";
import { api, formatShortDate, isApiError, type Role } from "@obragoito/core";

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  status: "active" | "disabled";
  createdAt: string;
  lastLoginAt: string | null;
  projectCount: number;
};

type UsersProps = {
  fixedRole?: Role;
  title?: string;
  subtitle?: string;
};

export function Users({ fixedRole, title = "Pessoas", subtitle }: UsersProps = {}) {
  const [role, setRole] = useState(fixedRole ?? "");
  const [search, setSearch] = useState("");
  const query = `/admin/users?${new URLSearchParams({ ...(role ? { role } : {}), ...(search ? { q: search } : {}) })}`;
  const { data, loading, error, reload } = useApi<{ users: UserRow[] }>(query);

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const [form, setForm] = useState({ fullName: "", email: "", phone: "", role: (fixedRole ?? "client") as Role });
  const [saving, setSaving] = useState(false);

  async function createUser() {
    setSaving(true);
    setFeedback(null);
    try {
      const result = await api.post<{ user: { email: string }; temporaryPassword: string | null }>("/admin/users", form);
      setCreateOpen(false);
      setForm({ fullName: "", email: "", phone: "", role: "client" });
      setFeedback({
        tone: "success",
        message: result.temporaryPassword
          ? `Conta criada para ${result.user.email}. Palavra-passe temporária (visível apenas agora): ${result.temporaryPassword}`
          : `Conta criada para ${result.user.email}.`,
      });
      await reload();
    } catch (error) {
      setFeedback({ tone: "error", message: isApiError(error) ? error.message : "Não foi possível criar a conta." });
    } finally {
      setSaving(false);
    }
  }

  async function updateUser(id: string, patch: Partial<Pick<UserRow, "role" | "status">>) {
    try {
      await api.patch(`/admin/users/${id}`, patch);
      await reload();
    } catch (error) {
      setFeedback({ tone: "error", message: isApiError(error) ? error.message : "Não foi possível atualizar." });
    }
  }

  async function resetPassword(id: string, email: string) {
    try {
      const result = await api.post<{ temporaryPassword: string | null }>(`/admin/users/${id}/reset-password`);
      setFeedback({
        tone: "success",
        message: result.temporaryPassword
          ? `Nova palavra-passe temporária para ${email} (visível apenas agora): ${result.temporaryPassword}`
          : `Foi enviado um pedido de reposição para ${email}.`,
      });
    } catch (error) {
      setFeedback({ tone: "error", message: isApiError(error) ? error.message : "Não foi possível repor." });
    }
  }

  return (
    <>
      <div className="p-page-head">
        <div>
          <h1 className="p-title">{title}</h1>
          <p className="p-subtitle">
            {subtitle ??
              "Contas de clientes e trabalhadores. Não existe registo público — todas as contas são criadas aqui."}
          </p>
        </div>
        <div className="p-toolbar">
          <Button variant="solid" size="sm" onClick={() => setCreateOpen(true)}>
            Criar conta
          </Button>
          <Button size="sm" onClick={() => setImportOpen(true)}>
            Importar CSV/XLSX
          </Button>
        </div>
      </div>

      {feedback ? (
        <div style={{ marginBottom: "var(--space-5)" }}>
          <Alert tone={feedback.tone}>{feedback.message}</Alert>
        </div>
      ) : null}

      <div className="p-toolbar" style={{ marginBottom: "var(--space-4)" }}>
        {fixedRole ? null : (
          <select className="p-select-inline" value={role} onChange={(event) => setRole(event.target.value)} aria-label="Filtrar por função">
            <option value="">Todas as funções</option>
            <option value="admin">Administração</option>
            <option value="client">Clientes</option>
            <option value="worker">Trabalhadores</option>
          </select>
        )}
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="Procurar por nome ou email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Procurar pessoas"
        />
      </div>

      {loading ? <LoadingBlock label="A carregar pessoas…" /> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      {data && data.users.length === 0 ? (
        <p className="p-empty-state">
          Ainda não existem contas. Crie a primeira conta de cliente ou trabalhador, ou importe uma lista.
        </p>
      ) : null}

      {data && data.users.length > 0 ? (
        <div className="table-wrap panel">
          <table className="table">
            <thead>
              <tr>
                <th>Pessoa</th>
                <th>Função</th>
                <th>Obras</th>
                <th>Estado</th>
                <th>Último acesso</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="table__strong">{user.fullName}</div>
                    <div className="p-list__meta">{user.email}</div>
                  </td>
                  <td>
                    <select
                      className="p-select-inline"
                      value={user.role}
                      onChange={(event) => updateUser(user.id, { role: event.target.value as Role })}
                      aria-label={`Função de ${user.fullName}`}
                    >
                      <option value="client">Cliente</option>
                      <option value="worker">Trabalhador</option>
                      <option value="admin">Administração</option>
                    </select>
                  </td>
                  <td>{user.projectCount}</td>
                  <td>
                    <span className={`badge ${user.status === "active" ? "badge--success" : "badge--danger"}`}>
                      {user.status === "active" ? "Ativa" : "Desativada"}
                    </span>
                  </td>
                  <td>{user.lastLoginAt ? formatShortDate(user.lastLoginAt) : "—"}</td>
                  <td>
                    <div className="p-inline-actions">
                      <Button
                        size="sm"
                        variant="quiet"
                        onClick={() => updateUser(user.id, { status: user.status === "active" ? "disabled" : "active" })}
                      >
                        {user.status === "active" ? "Desativar" : "Ativar"}
                      </Button>
                      <Button size="sm" variant="quiet" onClick={() => resetPassword(user.id, user.email)}>
                        Repor palavra-passe
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Dialog
        open={createOpen}
        title="Criar conta"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="quiet" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="solid"
              onClick={createUser}
              disabled={saving || !form.fullName || !form.email}
            >
              {saving ? "A criar…" : "Criar conta"}
            </Button>
          </>
        }
      >
        <div className="p-form-grid">
          <TextField
            label="Nome completo"
            value={form.fullName}
            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
            required
          />
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
          <TextField
            label="Telefone"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            optional
          />
          <SelectField
            label="Função"
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
            options={[
              { value: "client", label: "Cliente" },
              { value: "worker", label: "Trabalhador" },
              { value: "admin", label: "Administração" },
            ]}
          />
          <p className="p-note">
            A palavra-passe temporária é gerada pelo servidor e mostrada uma única vez após a criação.
          </p>
        </div>
      </Dialog>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onDone={reload} />
    </>
  );
}

function ImportDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    created: { email: string; temporaryPassword: string | null }[];
    errors: { line: number; message: string }[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await api.upload<typeof result>(`/admin/users/import`, form);
      setResult(response);
      await onDone();
    } catch (uploadError) {
      setError(isApiError(uploadError) ? uploadError.message : "Não foi possível importar o ficheiro.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      title="Importar contas"
      onClose={() => {
        setResult(null);
        setFile(null);
        onClose();
      }}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Fechar
          </Button>
          <Button variant="solid" onClick={submit} disabled={!file || busy}>
            {busy ? "A importar…" : "Importar"}
          </Button>
        </>
      }
    >
      <div className="p-form-grid">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <p className="p-note">
          Colunas aceites: nome, email, função (cliente/trabalhador/admin) e telefone. Máximo de 200 linhas.
        </p>
        <input
          type="file"
          accept=".csv,.xlsx,.xls,text/csv"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          aria-label="Ficheiro CSV ou XLSX"
        />
        {result ? (
          <div className="p-form-grid">
            <Alert tone={result.created.length > 0 ? "success" : "info"}>
              {result.created.length} conta(s) criada(s).
            </Alert>
            {result.created.length > 0 ? (
              <div className="p-docs">
                {result.created.map((item) => (
                  <div className="p-doc" key={item.email}>
                    <span className="p-doc__name">{item.email}</span>
                    <span className="p-doc__meta">{item.temporaryPassword ?? "—"}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {result.errors.length > 0 ? (
              <div className="p-docs">
                {result.errors.map((item) => (
                  <div className="p-doc" key={`${item.line}-${item.message}`}>
                    <span className="p-doc__name">Linha {item.line}</span>
                    <span className="p-doc__meta">{item.message}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <p className="p-note">Guarde as palavras-passe temporárias agora — não voltam a ser mostradas.</p>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
