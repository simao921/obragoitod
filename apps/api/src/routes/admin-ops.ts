import { Router } from "express";
import { z } from "zod";
import { many, one } from "../db.js";
import { env } from "../env.js";
import { recordAudit } from "../audit.js";
import { closeDay, humanDate, lisbonDate } from "../daily.js";
import { geminiApiKey, maintenanceState, setMaintenance, setSetting, voiceEnabled } from "../settings.js";

/**
 * Operações de gestão: clientes, equipa, estado das obras, relatórios diários,
 * modo manutenção e integrações. Montado dentro de /api/admin (já autenticado).
 */
export const adminOpsRouter = Router();

/* --------------------------------------------------------------- pessoas */

adminOpsRouter.get("/clients", async (req, res, next) => {
  try {
    const search = typeof req.query.q === "string" && req.query.q ? req.query.q : null;
    const rows = await many<{
      id: string;
      email: string;
      full_name: string;
      phone: string | null;
      status: string;
      created_at: string;
      last_login_at: string | null;
      projects: { id: string; name: string }[] | null;
    }>(
      `select p.id, p.email, p.full_name, p.phone, p.status, p.created_at, p.last_login_at,
              (select coalesce(json_agg(json_build_object('id', pr.id, 'name', pr.name) order by pr.name), '[]'::json)
                 from public.project_assignments a
                 join public.projects pr on pr.id = a.project_id
                where a.user_id = p.id) as projects
         from public.profiles p
        where p.role = 'client'
          and ($1::text is null or p.full_name ilike '%' || $1 || '%' or p.email ilike '%' || $1 || '%')
        order by p.full_name asc`,
      [search],
    );

    res.json({
      clients: rows.map((row) => ({
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        phone: row.phone,
        status: row.status,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
        projects: (row.projects as { id: string; name: string }[] | null) ?? [],
      })),
    });
  } catch (error) {
    next(error);
  }
});

adminOpsRouter.get("/workers", async (_req, res, next) => {
  try {
    const today = lisbonDate();
    const rows = await many<{
      id: string;
      email: string;
      full_name: string;
      phone: string | null;
      status: "active" | "disabled";
      last_login_at: string | null;
      projects: { id: string; name: string }[] | null;
      reported_today: boolean;
      last_report_at: string | null;
    }>(
      `select p.id, p.email, p.full_name, p.phone, p.status, p.last_login_at,
              (select coalesce(json_agg(json_build_object('id', pr.id, 'name', pr.name)), '[]'::json)
                 from public.project_assignments a
                 join public.projects pr on pr.id = a.project_id
                where a.user_id = p.id) as projects,
              exists (select 1 from public.daily_reports r where r.worker_id = p.id and r.report_date = $1) as reported_today,
              (select max(r.created_at) from public.daily_reports r where r.worker_id = p.id) as last_report_at
         from public.profiles p
        where p.role = 'worker'
        order by p.full_name asc`,
      [today],
    );

    res.json({
      today,
      workers: rows.map((row) => ({
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        phone: row.phone,
        status: row.status,
        lastLoginAt: row.last_login_at,
        projects: row.projects ?? [],
        reportedToday: row.reported_today,
        lastReportAt: row.last_report_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------------ estado obra */

adminOpsRouter.patch("/projects/:id/status", async (req, res, next) => {
  try {
    const parsed = z.object({ status: z.enum(["active", "completed"]) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "validation_error", message: "Estado inválido." });
      return;
    }

    const updated = await one<{ id: string }>(
      `update public.projects
          set status = $2,
              completed_at = case when $2 = 'completed' then now() else null end
        where id = $1
        returning id`,
      [req.params.id, parsed.data.status],
    );

    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Obra não encontrada." });
      return;
    }

    await recordAudit({
      actor: req.user!,
      action: "project.status_changed",
      entity: "project",
      entityId: req.params.id,
      metadata: { status: parsed.data.status },
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------- relatórios diários */

adminOpsRouter.get("/daily", async (req, res, next) => {
  try {
    const date = typeof req.query.date === "string" && req.query.date ? req.query.date : lisbonDate();

    const entries = await many<{
      id: string;
      report_date: string;
      project_id: string;
      project_name: string;
      worker_name: string;
      transcript: string;
      status: "open" | "closed";
      created_at: string;
    }>(
      `select r.id, r.report_date, r.project_id, p.name as project_name, pr.full_name as worker_name,
              r.transcript, r.status, r.created_at
         from public.daily_reports r
         join public.projects p on p.id = r.project_id
         join public.profiles pr on pr.id = r.worker_id
        where r.report_date = $1
        order by p.name asc, pr.full_name asc`,
      [date],
    );

    const summaries = await many<{
      id: string;
      report_date: string;
      project_id: string;
      project_name: string;
      summary: string;
      recipients: string[];
      emails_sent: number;
      created_at: string;
    }>(
      `select s.id, s.report_date, s.project_id, p.name as project_name, s.summary, s.recipients, s.emails_sent, s.created_at
         from public.daily_summaries s
         join public.projects p on p.id = s.project_id
        where s.report_date = $1
        order by p.name asc`,
      [date],
    );

    res.json({
      date,
      humanDate: humanDate(date),
      entries: entries.map((row) => ({
        id: row.id,
        reportDate: row.report_date,
        projectId: row.project_id,
        projectName: row.project_name,
        workerName: row.worker_name,
        transcript: row.transcript,
        status: row.status,
        createdAt: row.created_at,
      })),
      summaries: summaries.map((row) => ({
        id: row.id,
        reportDate: row.report_date,
        projectId: row.project_id,
        projectName: row.project_name,
        summary: row.summary,
        recipients: row.recipients ?? [],
        emailsSent: row.emails_sent,
        createdAt: row.created_at,
      })),
      emailConfigured: Boolean(env.resendApiKey),
      aiConfigured: Boolean(await geminiApiKey()),
    });
  } catch (error) {
    next(error);
  }
});

adminOpsRouter.post("/daily/close", async (req, res, next) => {
  try {
    const parsed = z
      .object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() })
      .safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(422).json({ error: "validation_error", message: "Data inválida." });
      return;
    }

    const date = parsed.data.date ?? lisbonDate();
    const result = await closeDay(date, req.user!.id);

    await recordAudit({
      actor: req.user!,
      action: "daily.closed",
      entity: "daily_summary",
      metadata: { date, projects: result.projects.length, aiUsed: result.aiUsed },
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

adminOpsRouter.get("/daily/:id/pdf", async (req, res, next) => {
  try {
    const row = await one<{ pdf: Buffer; project_name: string; report_date: string }>(
      `select s.pdf, p.name as project_name, s.report_date
         from public.daily_summaries s
         join public.projects p on p.id = s.project_id
        where s.id = $1`,
      [req.params.id],
    );
    if (!row) {
      res.status(404).json({ error: "not_found", message: "Relatório não encontrado." });
      return;
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="relatorio-${row.report_date}-${row.project_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf"`,
    );
    res.send(row.pdf);
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------------ atualizações */

adminOpsRouter.get("/updates", async (_req, res, next) => {
  try {
    const rows = await many<{
      id: string;
      project_id: string;
      project_name: string;
      title: string;
      body: string;
      progress: number | null;
      visible_to_client: boolean;
      created_at: string;
      author_name: string | null;
    }>(
      `select u.id, u.project_id, p.name as project_name, u.title, u.body, u.progress,
              u.visible_to_client, u.created_at, pr.full_name as author_name
         from public.project_updates u
         join public.projects p on p.id = u.project_id
         left join public.profiles pr on pr.id = u.created_by
        order by u.created_at desc
        limit 100`,
    );

    res.json({
      updates: rows.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        projectName: row.project_name,
        title: row.title,
        body: row.body,
        progress: row.progress,
        visibleToClient: row.visible_to_client,
        authorName: row.author_name,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------- manutenção */

adminOpsRouter.get("/maintenance", async (_req, res, next) => {
  try {
    res.json({ maintenance: await maintenanceState() });
  } catch (error) {
    next(error);
  }
});

adminOpsRouter.patch("/maintenance", async (req, res, next) => {
  try {
    const parsed = z
      .object({ enabled: z.boolean(), message: z.string().trim().max(400).optional() })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "validation_error", message: "Valor inválido." });
      return;
    }

    const state = await setMaintenance(parsed.data.enabled, parsed.data.message ?? null, req.user!.id);
    await recordAudit({
      actor: req.user!,
      action: parsed.data.enabled ? "maintenance.enabled" : "maintenance.disabled",
      entity: "app_settings",
      entityId: "maintenance",
    });

    res.json({ maintenance: state });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------------ integrações */

adminOpsRouter.get("/integrations", async (_req, res, next) => {
  try {
    res.json({
      geminiConfigured: Boolean(await geminiApiKey()),
      geminiFromEnvironment: Boolean(env.geminiApiKey),
      voiceEnabled: await voiceEnabled(),
      voiceAvailable: env.transcriptionAvailable,
      emailConfigured: Boolean(env.resendApiKey),
      storageDriver: env.storageDriver,
      supabaseConfigured: Boolean(env.supabaseUrl && env.supabaseAnonKey),
    });
  } catch (error) {
    next(error);
  }
});

adminOpsRouter.patch("/integrations", async (req, res, next) => {
  try {
    const parsed = z
      .object({
        geminiApiKey: z.string().trim().max(200).optional(),
        voiceEnabled: z.boolean().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "validation_error", message: "Valor inválido." });
      return;
    }

    if (parsed.data.geminiApiKey !== undefined) {
      await setSetting("gemini_api_key", { key: parsed.data.geminiApiKey }, req.user!.id);
      await recordAudit({ actor: req.user!, action: "settings.gemini_updated", entity: "app_settings" });
    }
    if (parsed.data.voiceEnabled !== undefined) {
      await setSetting("voice_enabled", { enabled: parsed.data.voiceEnabled }, req.user!.id);
      await recordAudit({ actor: req.user!, action: "settings.voice_updated", entity: "app_settings" });
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
