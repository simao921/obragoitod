import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";
import { env } from "./env.js";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(here, "../../../supabase/migrations");

/**
 * Aplica as migrações SQL de supabase/migrations por ordem.
 * A mesma migração serve o Supabase e o Postgres local (ver shims no topo do ficheiro).
 */
async function main() {
  if (!env.databaseUrl) {
    console.error("[migrate] DATABASE_URL em falta.");
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query(`
      create table if not exists public.schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const files = (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql")).sort();
    const applied = new Set(
      (await client.query<{ name: string }>("select name from public.schema_migrations")).rows.map((row) => row.name),
    );

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrate] ${file} — já aplicada`);
        continue;
      }
      const sql = await readFile(join(migrationsDir, file), "utf8");
      console.log(`[migrate] a aplicar ${file}…`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("insert into public.schema_migrations (name) values ($1)", [file]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log("[migrate] concluído");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[migrate] falhou:", error instanceof Error ? error.message : error);
  process.exit(1);
});
