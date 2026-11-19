import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, isApiError, type Role, type SessionUser } from "@obragoito/core";
import { AuthLayout } from "./shells";
import { Alert, Button } from "./primitives";
import { TextField } from "./fields";
import { Dialog } from "./dialog";

/** Código de acesso enviado por email (gestão e portal dev). */
export type OtpChallenge = {
  email: string;
  expiresAt: string;
  delivery: "email" | "development";
  devCode: string | null;
};

type OtpResponse = {
  otpRequired: true;
  email: string;
  expiresAt: string;
  delivery: "email" | "development";
  devCode?: string;
};

type LoginResponse =
  | OtpResponse
  | { otpRequired?: false; user: SessionUser; mustChangePassword: boolean };

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  mustChangePassword: boolean;
  error: string | null;
  otp: OtpChallenge | null;
  login: (email: string, password: string) => Promise<boolean>;
  verifyOtp: (code: string) => Promise<boolean>;
  resendOtp: () => Promise<void>;
  cancelOtp: () => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ portal, children }: { portal: Role | "dev"; children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [otp, setOtp] = useState<OtpChallenge | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");

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
        if (data.otpRequired) {
          setPendingEmail(email);
          setOtp({
            email: data.email,
            expiresAt: data.expiresAt,
            delivery: data.delivery,
            devCode: data.devCode ?? null,
          });
          return false;
        }
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

  const verifyOtp = useCallback(
    async (code: string) => {
      setError(null);
      try {
        const data = await api.post<{ user: SessionUser; mustChangePassword: boolean }>("/auth/login/verify", {
          email: pendingEmail,
          code,
          portal,
        });
        setUser(data.user);
        setMustChangePassword(Boolean(data.mustChangePassword));
        setOtp(null);
        setPendingEmail("");
        return true;
      } catch (verifyError) {
        setError(
          isApiError(verifyError) ? verifyError.message : "Não foi possível validar o código. Tente novamente.",
        );
        return false;
      }
    },
    [pendingEmail, portal],
  );

  const resendOtp = useCallback(async () => {
    setError(null);
    try {
      const data = await api.post<OtpResponse>("/auth/login/otp", { email: pendingEmail, portal });
      setOtp({
        email: data.email,
        expiresAt: data.expiresAt,
        delivery: data.delivery,
        devCode: data.devCode ?? null,
      });
    } catch (resendError) {
      setError(
        isApiError(resendError) ? resendError.message : "Não foi possível reenviar o código. Tente novamente.",
      );
    }
  }, [pendingEmail, portal]);

  const cancelOtp = useCallback(() => {
    setOtp(null);
    setPendingEmail("");
    setError(null);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => undefined);
    setUser(null);
    setOtp(null);
    setPendingEmail("");
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, mustChangePassword, error, otp, login, verifyOtp, resendOtp, cancelOtp, logout, refresh }}
    >
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
  const { login, verifyOtp, resendOtp, cancelOtp, otp, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const signedIn = await login(email.trim(), password);
    if (signedIn) setPassword("");
    setSubmitting(false);
  }

  async function onVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const signedIn = await verifyOtp(code.trim());
    if (signedIn) setCode("");
    setSubmitting(false);
  }

  async function onResend() {
    setResending(true);
    await resendOtp();
    setResending(false);
    setCooldown(45);
  }

  if (otp) {
    return (
      <AuthLayout
        brandSub={brandSub}
        image={asideImage}
        imageAlt={asideAlt}
        asideTitle={asideTitle}
        asideText={asideText}
        title="Confirme o acesso"
        subtitle={`Enviámos um código de 6 dígitos para ${otp.email}. O código é válido durante 10 minutos.`}
        footer={footer}
      >
        <form onSubmit={onVerify} noValidate style={{ display: "grid", gap: "var(--space-5)" }}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          {otp.delivery === "development" && otp.devCode ? (
            <Alert tone="info">
              Envio de email não configurado. Código de teste: <strong>{otp.devCode}</strong>
            </Alert>
          ) : null}
          <TextField
            label="Código de acesso"
            inputMode="numeric"
            name="code"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            hint="Introduza os 6 dígitos recebidos por email."
            required
          />
          <Button type="submit" variant="solid" block disabled={submitting || code.length !== 6} arrow>
            {submitting ? "A validar…" : "Validar código"}
          </Button>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)" }}>
            <Button type="button" variant="quiet" size="sm" onClick={cancelOtp}>
              Voltar
            </Button>
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={onResend}
              disabled={resending || cooldown > 0}
            >
              {cooldown > 0 ? `Reenviar em ${cooldown}s` : resending ? "A reenviar…" : "Reenviar código"}
            </Button>
          </div>
        </form>
      </AuthLayout>
    );
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
