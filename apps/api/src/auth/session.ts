import { createHash, randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { one, query } from "../db.js";
import { env } from "../env.js";
import type { Role, SessionUser } from "@obragoito/core";

export const SESSION_COOKIE = "obg_session";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

type SessionRow = {
  id: string;
  user_id: string;
  expires_at: string;
  email: string;
  full_name: string;
  role: Role;
  status: "active" | "disabled";
  is_developer: boolean;
};

export async function createSession(userId: string, req: Request, res: Response): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + env.sessionHours * 60 * 60 * 1000);

  await query(
    `insert into public.sessions (user_id, token_hash, expires_at, user_agent, ip)
     values ($1, $2, $3, $4, $5)`,
    [
      userId,
      hashToken(token),
      expires.toISOString(),
      (req.get("user-agent") ?? "").slice(0, 400),
      req.ip ?? null,
    ],
  );

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: env.cookieSameSite,
    secure: env.cookieSecure,
    path: "/",
    expires,
  });
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const token = readCookie(req);
  if (token) {
    await query("delete from public.sessions where token_hash = $1", [hashToken(token)]);
  }
  res.clearCookie(SESSION_COOKIE, {
    path: "/",
    httpOnly: true,
    sameSite: env.cookieSameSite,
    secure: env.cookieSecure,
  });
}

function readCookie(req: Request): string | null {
  const value = req.cookies?.[SESSION_COOKIE];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function resolveSession(req: Request): Promise<SessionUser | null> {
  const token = readCookie(req);
  if (!token) return null;

  const row = await one<SessionRow>(
    `select s.id, s.user_id, s.expires_at, p.email, p.full_name, p.role, p.status,
            coalesce(p.is_developer, false) as is_developer
       from public.sessions s
       join public.profiles p on p.id = s.user_id
      where s.token_hash = $1`,
    [hashToken(token)],
  );

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await query("delete from public.sessions where id = $1", [row.id]);
    return null;
  }
  if (row.status !== "active") return null;

  return {
    id: row.user_id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    status: row.status,
    isDeveloper: row.is_developer === true,
  };
}

/** Apenas contas de desenvolvimento (administrador com acesso ao portal dev). */
export function requireDeveloper() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.isDeveloper) {
      res.status(403).json({ error: "forbidden", message: "Este portal é exclusivo da conta de desenvolvimento." });
      return;
    }
    next();
  };
}

/** Autenticação obrigatória, opcionalmente restrita a funções. */
export function requireAuth(...roles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await resolveSession(req);
      if (!user) {
        res.status(401).json({ error: "unauthorized", message: "Sessão inválida ou expirada." });
        return;
      }
      if (roles.length > 0 && !roles.includes(user.role)) {
        res.status(403).json({ error: "forbidden", message: "Sem permissões para esta ação." });
        return;
      }
      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export async function purgeExpiredSessions(): Promise<void> {
  await query("delete from public.sessions where expires_at < now()");
}
