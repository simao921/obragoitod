import { one, query } from "./db.js";
import { env } from "./env.js";

/**
 * Definições da aplicação guardadas em public.app_settings.
 * Não guardam segredos de infraestrutura — apenas preferências operacionais
 * e, quando configurada, a chave do Gemini (que também pode vir do ambiente).
 */

export type MaintenanceState = {
  enabled: boolean;
  message: string | null;
  since: string | null;
};

export async function getSetting<T>(key: string): Promise<T | null> {
  const row = await one<{ value: T }>("select value from public.app_settings where key = $1", [key]);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: unknown, actorId: string | null): Promise<void> {
  await query(
    `insert into public.app_settings (key, value, updated_by, updated_at)
     values ($1, $2::jsonb, $3, now())
     on conflict (key) do update
       set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`,
    [key, JSON.stringify(value), actorId],
  );
}

export const MAINTENANCE_MESSAGE =
  "O site está temporariamente em manutenção. Voltamos em breve com todas as obras e novidades.";

export async function maintenanceState(): Promise<MaintenanceState> {
  const value = await getSetting<{ enabled?: boolean; message?: string; since?: string }>("maintenance");
  return {
    enabled: value?.enabled === true,
    message: value?.message?.trim() ? value.message.trim() : MAINTENANCE_MESSAGE,
    since: value?.since ?? null,
  };
}

export async function setMaintenance(
  enabled: boolean,
  message: string | null,
  actorId: string | null,
): Promise<MaintenanceState> {
  await setSetting(
    "maintenance",
    {
      enabled,
      message: message?.trim() ? message.trim() : MAINTENANCE_MESSAGE,
      since: enabled ? new Date().toISOString() : null,
    },
    actorId,
  );
  return maintenanceState();
}

/** Chave do Gemini: primeiro a definida na gestão, depois a do ambiente. */
export async function geminiApiKey(): Promise<string> {
  const stored = await getSetting<{ key?: string }>("gemini_api_key");
  return (stored?.key ?? "").trim() || env.geminiApiKey;
}

export async function voiceEnabled(): Promise<boolean> {
  const value = await getSetting<{ enabled?: boolean }>("voice_enabled");
  return value?.enabled !== false;
}
