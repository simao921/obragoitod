import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, isApiError, type Role, type SessionUser } from "@obragoito/core";
import { AuthLayout } from "./shells";
import { Alert, Button } from "./primitives";
import { TextField } from "./fields";
import { Dialog } from "./dialog";

type LoginResponse = { user: SessionUser; mustChangePassword: boolean };

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  mustChangePassword: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ portal, children }: { portal: Role | "dev"; children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ user: SessionUser; mustChangePassword: boolean }>("/auth/me");
      setUser(data.user);
      setMustChangePassword(Boolean(data.mustChangePassword));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const data = await api.post<LoginResponse>("/auth/login", { email, password, portal });
        setUser(data.user);
        setMustChangePassword(Boolean(data.mustChangePassword));
        return true;
      } catch (loginError) {
        setError(
          isApiError(loginError)
            ? loginError.message
            : "Não foi possível iniciar sessão. Tente novamente.",
        );
        return false;
      }
    },
    [portal],
  );

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => undefined);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, mustChangePassword, error, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return context;
}

type PortalLoginProps = {
  brandSub: string;
  title: string;
  subtitle: string;
  asideImage: string;
  asideAlt: string;
  asideTitle: string;
  asideText: string;
  footer?: ReactNode;
};

export function PortalLogin({
  brandSub,
  title,
  subtitle,
  asideImage,
  asideAlt,
  asideTitle,
  asideText,
  footer,
}: PortalLoginProps) {
  const { login, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const signedIn = await login(email.trim(), password);
    if (signedIn) setPassword("");
    setSubmitting(false);
  }

  return (
    <AuthLayout
      brandSub={brandSub}
      image={asideImage}
      imageAlt={asideAlt}
      asideTitle={asideTitle}
      asideText={asideText}
      title={title}
      subtitle={subtitle}
      footer={footer}
    >
      <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: "var(--space-5)" }}>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <TextField
          label="Palavra-passe"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button type="submit" variant="solid" block disabled={submitting} arrow>
          {submitting ? "A entrar…" : "Entrar"}
        </Button>
      </form>
    </AuthLayout>
  );
}

/** Aviso de palavra-passe temporária, com alteração imediata. */
export function PasswordBanner() {
  const { mustChangePassword, refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"error" | "success">("error");
  const [saving, setSaving] = useState(false);

  if (!mustChangePassword) return null;

  async function submit() {
    setSaving(true);
    setMessage(null);
    try {
      await api.post("/auth/password", { currentPassword: current, newPassword: next });
      setTone("success");
      setMessage("Palavra-passe alterada.");
      await refresh();
      setOpen(false);
    } catch (error) {
      setTone("error");
      setMessage(isApiError(error) ? error.message : "Não foi possível alterar a palavra-passe.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="notice-bar" style={{ marginBottom: "var(--space-5)" }}>
        <span>Está a usar uma palavra-passe temporária. Defina uma nova antes de continuar.</span>
        <Button size="sm" variant="solid" onClick={() => setOpen(true)}>
          Alterar palavra-passe
        </Button>
      </div>

      <Dialog
        open={open}
        title="Alterar palavra-passe"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="quiet" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="solid" onClick={submit} disabled={saving || next.length < 10}>
              {saving ? "A guardar…" : "Guardar"}
            </Button>
          </>
        }
      >
        <div style={{ display: "grid", gap: "var(--space-5)" }}>
          {message ? <Alert tone={tone}>{message}</Alert> : null}
          <TextField
            label="Palavra-passe atual"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
          />
          <TextField
            label="Nova palavra-passe"
            type="password"
            autoComplete="new-password"
            hint="Mínimo de 10 caracteres."
            value={next}
            onChange={(event) => setNext(event.target.value)}
          />
        </div>
      </Dialog>
    </>
  );
}
