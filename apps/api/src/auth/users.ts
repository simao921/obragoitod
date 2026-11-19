import type { Role } from "@obragoito/core";
import { env } from "../env.js";
import { query } from "../db.js";
import { generateTemporaryPassword, hashPassword } from "./passwords.js";

export type ProvisionedUser = {
  id: string;
  email: string;
  temporaryPassword: string | null;
};

export const authProvider: "supabase" | "local" = env.supabaseServiceKey ? "supabase" : "local";

async function supabaseAdmin(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${env.supabaseUrl.replace(/\/$/, "")}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: env.supabaseServiceKey,
      Authorization: `Bearer ${env.supabaseServiceKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

/**
 * Cria a conta no Supabase Auth (produção) ou na tabela local de perfis (desenvolvimento).
 * A palavra-passe nunca é devolvida em texto simples para além do momento de criação.
 */
export async function provisionUser(input: {
  email: string;
  fullName: string;
  role: Role;
  phone?: string;
  password?: string;
}): Promise<ProvisionedUser> {
  const temporaryPassword = input.password ?? generateTemporaryPassword();

  if (env.supabaseServiceKey && env.supabaseUrl) {
    const response = await supabaseAdmin("/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: { full_name: input.fullName, role: input.role },
        app_metadata: { role: input.role },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Supabase Auth recusou a criação do utilizador (${response.status}): ${detail.slice(0, 300)}`);
    }

    const created = (await response.json()) as { id: string };
    await query(
      `insert into public.profiles (id, email, full_name, phone, role, status)
       values ($1, $2, $3, $4, $5, 'active')
       on conflict (id) do update set email = excluded.email, full_name = excluded.full_name`,
      [created.id, input.email.toLowerCase(), input.fullName, input.phone ?? null, input.role],
    );

    return { id: created.id, email: input.email, temporaryPassword: input.password ? null : temporaryPassword };
  }

  const inserted = await query<{ id: string }>(
    `insert into public.profiles (email, full_name, phone, role, status, password_hash, must_change_password)
     values ($1, $2, $3, $4, 'active', $5, true)
     returning id`,
    [input.email.toLowerCase(), input.fullName, input.phone ?? null, input.role, hashPassword(temporaryPassword)],
  );

  return {
    id: inserted.rows[0].id,
    email: input.email,
    temporaryPassword: input.password ? null : temporaryPassword,
  };
}

/** Reemite uma palavra-passe temporária (apenas no modo local). */
export async function resetPassword(userId: string): Promise<string | null> {
  const temporaryPassword = generateTemporaryPassword();
  if (env.supabaseServiceKey && env.supabaseUrl) {
    const response = await supabaseAdmin(`/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ password: temporaryPassword }),
    });
    if (!response.ok) throw new Error("Supabase Auth recusou a alteração de palavra-passe.");
    return temporaryPassword;
  }
  await query("update public.profiles set password_hash = $2, must_change_password = true where id = $1", [
    userId,
    hashPassword(temporaryPassword),
  ]);
  return temporaryPassword;
}

export async function setUserStatus(userId: string, status: "active" | "disabled"): Promise<void> {
  if (env.supabaseServiceKey && env.supabaseUrl) {
    await supabaseAdmin(`/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ ban_duration: status === "disabled" ? "876000h" : "none" }),
    });
  }
  await query("update public.profiles set status = $2, updated_at = now() where id = $1", [userId, status]);
  if (status === "disabled") {
    await query("delete from public.sessions where user_id = $1", [userId]);
  }
}
