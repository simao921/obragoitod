import { pool, query } from "./db.js";
import { hashPassword } from "./auth/passwords.js";

/**
 * Contas iniciais da Obragoito.
 *
 *   npm run seed:accounts
 *
 * Todas entram com a palavra-passe indicada e são obrigadas a defini-la de novo
 * no primeiro acesso. A conta simaodev é também a conta de desenvolvimento:
 * acede a todos os painéis mas nunca aparece como cliente nem como trabalhador.
 */
const ACCOUNTS = [
  {
    email: "pedropatinha21@gmail.com",
    name: "Pedro Patinha",
    password: "123456",
    developer: false,
  },
  {
    email: "pedro.patinha@obragoito.pt",
    name: "Pedro Patinha",
    password: "123456",
    developer: false,
  },
  {
    email: "pedropatinha@obragoito.pt",
    name: "Pedro Patinha",
    password: "123456",
    developer: false,
  },
  {
    email: "simaodev@obragoito.pt",
    name: "Simão Dev",
    password: "Respeito12!",
    developer: true,
  },
] as const;

async function main() {
  // Em produção nunca se usam as palavras-passe de exemplo.
  const override = process.env.SEED_ACCOUNTS_PASSWORD;
  if (process.env.NODE_ENV === "production" && !override) {
    console.error("[seed-accounts] defina SEED_ACCOUNTS_PASSWORD para criar contas em produção.");
    await pool.end();
    process.exit(1);
  }

  for (const account of ACCOUNTS) {
    // Nunca repõe uma conta existente: uma palavra-passe nova apaga a do utilizador.
    const inserted = await query<{ id: string }>(
      `insert into public.profiles (email, full_name, role, status, password_hash, must_change_password, is_developer)
       values ($1, $2, 'admin', 'active', $3, true, $4)
       on conflict (lower(email)) do nothing
       returning id`,
      [account.email.toLowerCase(), account.name, hashPassword(override ?? account.password), account.developer],
    );
    console.log(
      `[seed-accounts] ${account.email} ${inserted.rows.length > 0 ? "criado" : "já existia"}${
        account.developer ? " (desenvolvimento)" : ""
      }`,
    );
  }

  console.log("[seed-accounts] concluído — altere as palavras-passe no primeiro acesso.");
  await pool.end();
}

main().catch(async (error) => {
  console.error("[seed-accounts] falhou:", error instanceof Error ? error.message : error);
  await pool.end();
  process.exit(1);
});
