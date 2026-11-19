import { assertRuntimeConfig, env } from "./env.js";
import { pool } from "./db.js";
import { createApp } from "./app.js";
import { purgeExpiredSessions } from "./auth/session.js";
import { runNightlyClose } from "./daily.js";

async function start() {
  assertRuntimeConfig();
  await purgeExpiredSessions().catch(() => undefined);

  const server = createApp().listen(env.port, "0.0.0.0", () => {
    console.log(`[api] a escutar em http://0.0.0.0:${env.port} (${env.nodeEnv})`);
    console.log(
      `[api] autenticação: ${env.supabaseServiceKey ? "supabase" : "local"} · armazenamento: ${env.storageDriver}`,
    );
  });

  /**
   * Fecho diário: gera o PDF do dia anterior e envia-o aos clientes.
   * Corre ao arrancar e depois a cada minuto; só age uma vez por dia (Lisboa).
   */
  const nightly = () => {
    runNightlyClose()
      .then((result) => {
        if (result) {
          console.log(
            `[daily] dia ${result.date} fechado · ${result.projects.length} obras · email: ${
              result.emailConfigured ? "sim" : "não configurado"
            }`,
          );
        }
      })
      .catch((error) => {
        console.error("[daily] falha no fecho diário:", error instanceof Error ? error.message : error);
      });
  };
  nightly();
  const nightlyTimer = setInterval(nightly, 60_000);

  const shutdown = async () => {
    clearInterval(nightlyTimer);
    server.close();
    await pool.end().catch(() => undefined);
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start().catch((error) => {
  console.error("[api] não arrancou:", error instanceof Error ? error.message : error);
  process.exit(1);
});
