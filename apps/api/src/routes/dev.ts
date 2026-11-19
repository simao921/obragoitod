import { Router } from "express";
import { many, one, query } from "../db.js";
import { env } from "../env.js";
import { recordAudit } from "../audit.js";
import { requireAuth, requireDeveloper } from "../auth/session.js";
import { geminiApiKey, maintenanceState } from "../settings.js";
import type { DevOverview } from "@obragoito/core";

/**
 * Portal de desenvolvimento.
 * Exclusivo de contas marcadas como is_developer (ex.: simaodev@obragoito.pt).
 * Monitoriza a API, a base de dados e os erros recentes, e controla o modo manutenção.
 */

export const devRouter = Router();
devRouter.use(requireAuth("admin"), requireDeveloper());

devRouter.get("/overview", async (_req, res, next) => {
  try {
    const started = Date.now();
    await one("select 1");
    const latency = Date.now() - started;

    const counts = await one<{
      users: string;
      clients: string;
      workers: string;
      projects: string;
      errors: string;
    }>(`select
          (select count(*) from public.profiles) as users,
          (select count(*) from public.profiles where role = 'client') as clients,
          (select count(*) from public.profiles where role = 'worker') as workers,
          (select count(*) from public.projects) as projects,
          (select count(*) from public.error_log where created_at > now() - interval '24 hours') as errors`);

    const errors = await many<{
      id: string;
      level: "warning" | "error" | "fatal";
      source: string;
      message: string;
      path: string | null;
      method: string | null;
      status: number | null;
      created_at: string;
    }>(
      `select id, level, source, message, path, method, status, created_at
         from public.error_log order by created_at desc limit 40`,
    );

    const maintenance = await maintenanceState();
    const key = await geminiApiKey();

    const overview: DevOverview = {
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      environment: env.nodeEnv,
      databaseLatencyMs: latency,
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      counts: {
        users: Number(counts?.users ?? 0),
        clients: Number(counts?.clients ?? 0),
        workers: Number(counts?.workers ?? 0),
        projects: Number(counts?.projects ?? 0),
        errors24h: Number(counts?.errors ?? 0),
      },
      config: {
        authProvider: env.supabaseServiceKey ? "supabase" : "local",
        storageDriver: env.storageDriver,
        emailConfigured: Boolean(env.resendApiKey),
        transcriptionAvailable: env.transcriptionAvailable,
        geminiConfigured: Boolean(key),
        supabaseConfigured: Boolean(env.supabaseUrl && env.supabaseAnonKey),
      },
      maintenance,
      errors: errors.map((error) => ({
        id: error.id,
        level: error.level,
        source: error.source,
        message: error.message,
        path: error.path,
        method: error.method,
        status: error.status,
        createdAt: error.created_at,
      })),
    };

    res.json(overview);
  } catch (error) {
    next(error);
  }
});

devRouter.delete("/errors", async (req, res, next) => {
  try {
    await query("delete from public.error_log");
    await recordAudit({ actor: req.user!, action: "dev.errors_cleared", entity: "error_log" });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});
