import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import { env } from "./env.js";
import { publicRouter } from "./routes/public.js";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { clientRouter } from "./routes/client.js";
import { workerRouter } from "./routes/worker.js";
import { filesRouter } from "./routes/files.js";
import { devRouter } from "./routes/dev.js";
import { maintenanceState } from "./settings.js";
import { mailProvider } from "./notify.js";
import { runNightlyClose } from "./daily.js";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, "../public");

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));

  /** CORS restrito para publicações em domínios separados (credenciais incluídas). */
  app.use((req, res, next) => {
    const origin = req.get("origin");
    if (!origin) return next();
    const allowed = env.publicOrigins.includes(origin);
    if (allowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    }
    if (req.method === "OPTIONS") {
      res.status(allowed ? 204 : 403).end();
      return;
    }
    next();
  });

  /**
   * Proteção CSRF: pedidos que alteram estado têm de vir da própria origem
   * (ou de uma origem explicitamente autorizada em PUBLIC_ORIGINS).
   */
  app.use((req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const origin = req.get("origin");
    if (!origin) return next();
    try {
      const originHost = new URL(origin).host;
      if (originHost === req.get("host") || env.publicOrigins.includes(origin)) return next();
    } catch {
      /* origem inválida */
    }
    res.status(403).json({ error: "bad_origin", message: "Origem não autorizada." });
  });

  app.use(
    "/api",
    rateLimit({
      windowMs: 60 * 1000,
      limit: 240,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    }),
  );

  app.get("/api/health", async (_req, res) => {
    const { pool } = await import("./db.js");
    try {
      await pool.query("select 1");
      res.json({ status: "ok", database: "up" });
    } catch {
      res.status(503).json({ status: "degraded", database: "down" });
    }
  });

  app.get("/api/config", (_req, res) => {
    res.json({
      configured: env.configured,
      authProvider: env.supabaseServiceKey ? "supabase" : "local",
      storageDriver: env.storageDriver,
      voiceAvailable: env.transcriptionAvailable,
      transcriptionProvider: env.transcriptionProvider || null,
      emailConfigured: mailProvider() !== "none",
    });
  });

  /** Modo manutenção: bloqueia os portais de cliente e de equipa. */
  const portalMaintenanceGuard: express.RequestHandler = async (_req, res, next) => {
    try {
      const state = await maintenanceState();
      if (state.enabled) {
        res.status(503).json({ error: "maintenance", message: state.message });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Fecho diário acionado por um agendador externo (Vercel Cron, por exemplo).
   * Protegido por CRON_SECRET; sem segredo configurado responde 401.
   */
  app.get("/api/cron/daily", async (req, res, next) => {
    try {
      const secret = process.env.CRON_SECRET ?? "";
      const provided =
        req.get("authorization")?.replace(/^Bearer\s+/i, "") ??
        (typeof req.query.key === "string" ? req.query.key : "");
      if (!secret || provided !== secret) {
        res.status(401).json({ error: "unauthorized", message: "Segredo de agendamento inválido." });
        return;
      }
      const result = await runNightlyClose();
      res.json({ ok: true, closed: result?.date ?? null });
    } catch (error) {
      next(error);
    }
  });

  app.use("/api/public", publicRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/dev", devRouter);
  app.use("/api/client", portalMaintenanceGuard);
  app.use("/api/client", clientRouter);
  app.use("/api/worker", portalMaintenanceGuard);
  app.use("/api/worker", workerRouter);
  app.use("/api/files", filesRouter);

  app.use("/media", express.static(resolve(publicDir, "media"), { maxAge: "1h", index: false }));

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "not_found", message: "Rota não encontrada." });
  });

  app.use(
    (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (error instanceof multer.MulterError) {
        const message =
          error.code === "LIMIT_FILE_SIZE"
            ? `O ficheiro excede o limite de ${env.maxUploadMb} MB.`
            : "Não foi possível processar o ficheiro enviado.";
        res.status(413).json({ error: "upload_rejected", message });
        return;
      }

      const message = error instanceof Error ? error.message : "Erro inesperado.";
      console.error("[api] erro:", message);

      void (async () => {
        try {
          const { query } = await import("./db.js");
          await query(
            `insert into public.error_log (level, source, message, stack, path, method, status, user_email)
             values ('error', 'api', $1, $2, $3, $4, 500, $5)`,
            [
              message.slice(0, 2000),
              error instanceof Error ? (error.stack ?? "").slice(0, 8000) : null,
              _req.originalUrl?.slice(0, 500) ?? null,
              _req.method ?? null,
              _req.user?.email ?? null,
            ],
          );
        } catch {
          /* a monitorização nunca deve quebrar o pedido */
        }
      })();

      res.status(500).json({
        error: "server_error",
        message: "Ocorreu um erro ao processar o pedido. Tente novamente.",
      });
    },
  );

  return app;
}
