import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { one, query } from "../db.js";
import { env } from "../env.js";

/**
 * Códigos de acesso de uso único (OTP) enviados por email à gestão e ao portal
 * dev. O código nunca é guardado em claro: fica um hash ligado ao perfil e ao
 * segredo de sessão da API.
 */

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_SECONDS = 45;

export type OtpPortal = "admin" | "dev";

export type VerifyResult = "ok" | "invalid" | "expired" | "too_many";

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashCode(profileId: string, code: string): string {
  return createHash("sha256").update(`${profileId}:${code}:${env.sessionSecret}`).digest("hex");
}

/** Emite um novo código e invalida os anteriores. */
export async function issueCode(
  profileId: string,
  portal: OtpPortal,
): Promise<{ code: string; expiresAt: string }> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

  await query(
    "update public.login_otp_codes set consumed_at = now() where profile_id = $1 and consumed_at is null",
    [profileId],
  );
  await query("delete from public.login_otp_codes where expires_at < now() - interval '1 day'");
  await query(
    `insert into public.login_otp_codes (profile_id, portal, code_hash, expires_at)
     values ($1, $2, $3, $4)`,
    [profileId, portal, hashCode(profileId, code), expiresAt],
  );

  return { code, expiresAt };
}

/** Segundos que faltam para poder pedir outro código (0 = já pode). */
export async function secondsUntilResend(profileId: string, portal: OtpPortal): Promise<number> {
  const row = await one<{ seconds: number }>(
    `select greatest(0, ceil($3 - extract(epoch from (now() - created_at))))::int as seconds
       from public.login_otp_codes
      where profile_id = $1 and portal = $2 and consumed_at is null
      order by created_at desc
      limit 1`,
    [profileId, portal, OTP_RESEND_SECONDS],
  );
  return row?.seconds ?? 0;
}

export async function verifyCode(profileId: string, portal: OtpPortal, code: string): Promise<VerifyResult> {
  const row = await one<{ id: string; code_hash: string; expires_at: string; attempts: number }>(
    `select id, code_hash, expires_at, attempts
       from public.login_otp_codes
      where profile_id = $1 and portal = $2 and consumed_at is null
      order by created_at desc
      limit 1`,
    [profileId, portal],
  );

  if (!row) return "expired";
  if (new Date(row.expires_at).getTime() < Date.now()) return "expired";
  if (row.attempts >= OTP_MAX_ATTEMPTS) return "too_many";

  const expected = Buffer.from(row.code_hash, "hex");
  const provided = Buffer.from(hashCode(profileId, code), "hex");

  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    await query("update public.login_otp_codes set attempts = attempts + 1 where id = $1", [row.id]);
    return "invalid";
  }

  await query("update public.login_otp_codes set consumed_at = now() where id = $1", [row.id]);
  return "ok";
}
