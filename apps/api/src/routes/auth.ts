import { Router, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { firstError, loginSchema, type Role } from "@obragoito/core";
import { one, query } from "../db.js";
import { env } from "../env.js";
import { hashPassword, verifyPassword } from "../auth/passwords.js";
import { createSession, destroySession, requireAuth } from "../auth/session.js";
import { recordAudit } from "../audit.js";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "rate_limited", message: "Demasiadas tentativas. Aguarde alguns minutos." },
});

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  status: "active" | "disabled";
  password_hash: string | null;
  must_change_password: boolean;
  is_developer: boolean;
};

async function verifySupabasePassword(email: string, password: string): Promise<boolean> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return false;
  try {
    const response = await fetch(`${env.supabaseUrl.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: env.supabaseAnonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Cria a sessão, atualiza o último acesso e devolve o utilizador. */
async function completeLogin(profile: ProfileRow, req: Request, res: Response): Promise<void> {
  await createSession(profile.id, req, res);
  await query("update public.profiles set last_login_at = now() where id = $1", [profile.id]);
  await recordAudit({
    actor: { id: profile.id, email: profile.email, fullName: profile.full_name, role: profile.role, status: profile.status },
    action: "auth.login",
    entity: "profile",
    entityId: profile.id,
  });

  res.json({
    user: {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
      status: profile.status,
      isDeveloper: profile.is_developer === true,
    },
    mustChangePassword: profile.must_change_password,
  });
}

authRouter.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    const portal = req.body?.portal as Role | "dev" | undefined;
    if (!parsed.success) {
      res.status(422).json({ error: "validation_error", message: firstError(parsed.error) });
      return;
    }
    if (!portal || !["admin", "client", "worker", "dev"].includes(portal)) {
      res.status(400).json({ error: "bad_request", message: "Portal inválido." });
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const profile = await one<ProfileRow>(
      `select id, email, full_name, role, status, password_hash, must_change_password,
              coalesce(is_developer, false) as is_developer
         from public.profiles where lower(email) = $1`,
      [email],
    );

    const invalid = () =>
      res.status(401).json({ error: "invalid_credentials", message: "Email ou palavra-passe incorretos." });

    if (!profile) {
      invalid();
      return;
    }

    if (profile.status !== "active") {
      res.status(403).json({
        error: "account_disabled",
        message: "Esta conta está desativada. Contacte a administração da Obragoito.",
      });
      return;
    }

    const ok = profile.password_hash
      ? verifyPassword(parsed.data.password, profile.password_hash)
      : await verifySupabasePassword(email, parsed.data.password);

    if (!ok) {
      await recordAudit({ actor: null, action: "auth.login_failed", entity: "profile", entityId: profile.id });
      invalid();
      return;
    }

    const allowedPortal =
      portal === "dev"
        ? profile.role === "admin" && profile.is_developer === true
        : portal === "admin"
          ? profile.role === "admin"
          : profile.role === portal;

    if (!allowedPortal) {
      res.status(403).json({
        error: "wrong_portal",
        message:
          portal === "dev"
            ? "Este portal é exclusivo da conta de desenvolvimento."
            : "Esta conta não tem acesso a este portal.",
      });
      return;
    }

    await completeLogin(profile, req, res);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    await destroySession(req, res);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth(), async (req, res, next) => {
  try {
    const profile = await one<{ must_change_password: boolean }>(
      "select must_change_password from public.profiles where id = $1",
      [req.user!.id],
    );
    res.json({ user: req.user, mustChangePassword: profile?.must_change_password ?? false });
  } catch (error) {
    next(error);
  }
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Indique a palavra-passe atual."),
  newPassword: z.string().min(10, "A nova palavra-passe deve ter pelo menos 10 caracteres.").max(200),
});

authRouter.post("/password", requireAuth(), async (req, res, next) => {
  try {
    const parsed = passwordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "validation_error", message: firstError(parsed.error) });
      return;
    }

    if (env.supabaseServiceKey) {
      res.status(409).json({
        error: "managed_by_supabase",
        message: "A palavra-passe é gerida pelo Supabase Auth. Peça a reposição à administração.",
      });
      return;
    }

    const profile = await one<{ password_hash: string | null }>(
      "select password_hash from public.profiles where id = $1",
      [req.user!.id],
    );

    if (!profile || !verifyPassword(parsed.data.currentPassword, profile.password_hash)) {
      res.status(401).json({ error: "invalid_credentials", message: "A palavra-passe atual não está correta." });
      return;
    }

    await query(
      "update public.profiles set password_hash = $2, must_change_password = false where id = $1",
      [req.user!.id, hashPassword(parsed.data.newPassword)],
    );
    await recordAudit({ actor: req.user!, action: "auth.password_changed", entity: "profile", entityId: req.user!.id });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
