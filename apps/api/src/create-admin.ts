import { pool, query } from "./db.js";
import { generateTemporaryPassword, hashPassword } from "./auth/passwords.js";

/**
 * Cria a conta de administração inicial.
 *
 *   npm run create-admin -- --email admin@exemplo.pt --name "Nome" [--password "..."]
 *
 * Sem --password, é gerada uma palavra-passe temporária e impressa uma única vez.
 * Nunca é guardada em texto simples.
 */
function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const email = arg("email");
  const name = arg("name") ?? "Administração";
  const password = arg("password");

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Uso: npm run create-admin -- --email admin@exemplo.pt --name "Nome" [--password "…"]');
    process.exit(1);
  }

  const normalized = email.toLowerCase();
  const existing = await query<{ id: string }>("select id from public.profiles where lower(email) = $1", [normalized]);
  if (existing.rows.length > 0) {
    console.error(`[create-admin] já existe uma conta com ${normalized}.`);
    process.exit(1);
  }

  const temporary = password ?? generateTemporaryPassword();
  const created = await query<{ id: string }>(
    `insert into public.profiles (email, full_name, role, status, password_hash, must_change_password)
     values ($1, $2, 'admin', 'active', $3, $4)
     returning id`,
    [normalized, name, hashPassword(temporary), !password],
  );

  console.log(`[create-admin] conta criada: ${normalized} (${created.rows[0].id})`);
  if (!password) {
    console.log(`[create-admin] palavra-passe temporária (mostrada apenas agora): ${temporary}`);
  }
  await pool.end();
}

main().catch(async (error) => {
  console.error("[create-admin] falhou:", error instanceof Error ? error.message : error);
  await pool.end();
  process.exit(1);
});
