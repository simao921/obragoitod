import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { firstError, workerReportSchema } from "../core.js";
import { many, one } from "../db.js";
import { humanDate, lisbonDate } from "../daily.js";
import { env } from "../env.js";
import { recordAudit } from "../audit.js";
import { requireAuth } from "../auth/session.js";
import { mapReport, mapSummary, mapUpdate, type ProjectRow, type ReportRow, type UpdateRow } from "../serializers.js";
import { createThreadsRouter } from "./threads.js";

export const workerRouter = Router();

workerRouter.use(requireAuth("worker"));

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});

workerRouter.get("/projects", async (req, res, next) => {
  try {
    const rows = await many<ProjectRow & { role_on_project: string | null; last_update_at: string | null; report_count: string }>(
      `select p.id, p.slug, p.name, p.summary, p.description, p.category, p.location, p.year,
              p.client_name, p.cover_image, p.cover_image_alt, p.is_published, p.sort_order, p.created_at,
              a.role_on_project,
              (select max(u.created_at) from public.project_updates u where u.project_id = p.id) as last_update_at,
              (select count(*) from public.worker_reports r where r.project_id = p.id and r.worker_id = $1) as report_count
         from public.projects p
         join public.project_assignments a on a.project_id = p.id and a.user_id = $1
        order by p.sort_order asc, p.created_at desc`,
      [req.user!.id],
    );

    res.json({
      projects: rows.map((row) => ({
        ...mapSummary(row),
        roleOnProject: row.role_on_project,
        lastUpdateAt: row.last_update_at,
        reportCount: Number(row.report_count),
      })),
    });
  } catch (error) {
    next(error);
  }
});

workerRouter.get("/projects/:id", async (req, res, next) => {
  try {
    const project = await one<ProjectRow & { role_on_project: string | null }>(
      `select p.id, p.slug, p.name, p.summary, p.description, p.category, p.location, p.year,
              p.client_name, p.cover_image, p.cover_image_alt, p.is_published, p.sort_order, p.created_at,
              a.role_on_project
         from public.projects p
         join public.project_assignments a on a.project_id = p.id and a.user_id = $2
        where p.id = $1`,
      [req.params.id, req.user!.id],
    );

    if (!project) {
      res.status(404).json({ error: "not_found", message: "Obra não encontrada ou não atribuída a si." });
      return;
    }

    const updates = await many<UpdateRow>(
      `select u.id, u.project_id, u.title, u.body, u.progress, u.created_at, pr.full_name as author_name
         from public.project_updates u
         left join public.profiles pr on pr.id = u.created_by
        where u.project_id = $1
        order by u.created_at desc limit 20`,
      [project.id],
    );

    const reports = await many<ReportRow>(
      `select r.id, r.project_id, p.name as project_name, pr.full_name as worker_name,
              r.body, r.progress, r.status, r.created_at
         from public.worker_reports r
         join public.projects p on p.id = r.project_id
         join public.profiles pr on pr.id = r.worker_id
        where r.project_id = $1 and r.worker_id = $2
        order by r.created_at desc`,
      [project.id, req.user!.id],
    );

    res.json({
      project: {
        ...mapSummary(project),
        roleOnProject: project.role_on_project,
        updates: updates.map(mapUpdate),
      },
      reports: reports.map(mapReport),
    });
  } catch (error) {
    next(error);
  }
});

workerRouter.post("/reports", async (req, res, next) => {
  try {
    const parsed = workerReportSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "validation_error", message: firstError(parsed.error) });
      return;
    }

    const access = await one<{ ok: boolean }>(
      "select exists (select 1 from public.project_assignments where project_id = $1 and user_id = $2) as ok",
      [parsed.data.projectId, req.user!.id],
    );
    if (!access?.ok) {
      res.status(403).json({ error: "forbidden", message: "Não está atribuído a esta obra." });
      return;
    }

    const created = await one<{ id: string }>(
      `insert into public.worker_reports (project_id, worker_id, body, progress)
       values ($1, $2, $3, $4) returning id`,
      [parsed.data.projectId, req.user!.id, parsed.data.body, parsed.data.progress ?? null],
    );

    await recordAudit({
      actor: req.user!,
      action: "report.submitted",
      entity: "worker_report",
      entityId: created?.id,
      metadata: { projectId: parsed.data.projectId },
    });

    res.status(201).json({ id: created?.id });
  } catch (error) {
    next(error);
  }
});

workerRouter.get("/reports", async (req, res, next) => {
  try {
    const rows = await many<ReportRow>(
      `select r.id, r.project_id, p.name as project_name, pr.full_name as worker_name,
              r.body, r.progress, r.status, r.created_at
         from public.worker_reports r
         join public.projects p on p.id = r.project_id
         join public.profiles pr on pr.id = r.worker_id
        where r.worker_id = $1
        order by r.created_at desc`,
      [req.user!.id],
    );
    res.json({ reports: rows.map(mapReport) });
  } catch (error) {
    next(error);
  }
});

/**
 * Transcrição de uma mensagem de voz curta.
 * O áudio é processado em memória e descartado; nunca é guardado.
 * Sem TRANSCRIPTION_PROVIDER/credenciais configuradas responde 503.
 */
workerRouter.post("/transcribe", audioUpload.single("audio"), async (req, res, next) => {
  try {
    const setting = await one<{ value: { enabled?: boolean } }>(
      "select value from public.app_settings where key = 'voice_enabled'",
    );
    if (setting?.value?.enabled === false) {
      res.status(403).json({ error: "voice_disabled", message: "A entrada por voz está desativada pela administração." });
      return;
    }
    if (!env.transcriptionAvailable) {
      res.status(503).json({
        error: "not_configured",
        message: "O serviço de transcrição ainda não está configurado neste ambiente.",
      });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "missing_audio", message: "Nenhum áudio recebido." });
      return;
    }
    if (!req.file.mimetype.startsWith("audio/")) {
      res.status(415).json({ error: "unsupported_media", message: "Formato de áudio não suportado." });
      return;
    }

    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype }), "mensagem.webm");
    form.append("model", env.transcriptionModel);
    form.append("language", "pt");
    form.append("prompt", "Relatório de obra em português europeu.");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.openaiApiKey}` },
      body: form,
    });

    if (!response.ok) {
      console.error("[transcribe] fornecedor recusou:", response.status);
      res.status(502).json({ error: "provider_error", message: "Não foi possível transcrever o áudio." });
      return;
    }

    const body = (await response.json()) as { text?: string };
    const text = (body.text ?? "").trim();
    if (!text) {
      res.status(502).json({ error: "empty_transcription", message: "Não foi possível reconhecer fala no áudio." });
      return;
    }

    await recordAudit({ actor: req.user!, action: "voice.transcribed", entity: "worker_report" });

    res.json({ text });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------- registo diário */

/** Obras atribuídas, registo do dia e histórico recente. */
workerRouter.get("/daily", async (req, res, next) => {
  try {
    const date = typeof req.query.date === "string" && req.query.date ? req.query.date : lisbonDate();

    const projects = await many<{ id: string; name: string }>(
      `select p.id, p.name
         from public.projects p
         join public.project_assignments a on a.project_id = p.id and a.user_id = $1
        where p.status = 'active'
        order by p.sort_order asc, p.name asc`,
      [req.user!.id],
    );

    const entries = await many<{
      id: string;
      report_date: string;
      project_id: string;
      project_name: string;
      transcript: string;
      status: "open" | "closed";
      created_at: string;
    }>(
      `select r.id, r.report_date, r.project_id, p.name as project_name, r.transcript, r.status, r.created_at
         from public.daily_reports r
         join public.projects p on p.id = r.project_id
        where r.worker_id = $1 and r.report_date = $2`,
      [req.user!.id, date],
    );

    const history = await many<{
      id: string;
      report_date: string;
      project_id: string;
      project_name: string;
      transcript: string;
      status: "open" | "closed";
      created_at: string;
    }>(
      `select r.id, r.report_date, r.project_id, p.name as project_name, r.transcript, r.status, r.created_at
         from public.daily_reports r
         join public.projects p on p.id = r.project_id
        where r.worker_id = $1
        order by r.report_date desc
        limit 20`,
      [req.user!.id],
    );

    const map = (row: (typeof entries)[number]) => ({
      id: row.id,
      reportDate: row.report_date,
      projectId: row.project_id,
      projectName: row.project_name,
      transcript: row.transcript,
      status: row.status,
      createdAt: row.created_at,
    });

    res.json({
      date,
      humanDate: humanDate(date),
      projects,
      entries: entries.map(map),
      history: history.map(map),
    });
  } catch (error) {
    next(error);
  }
});

/** Registo do dia (texto escrito ou transcrição do áudio). */
workerRouter.post("/daily", async (req, res, next) => {
  try {
    const parsed = z
      .object({
        projectId: z.string().uuid("Escolha a obra."),
        transcript: z.string().trim().min(3, "Escreva o que fez hoje.").max(6000),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      res.status(422).json({ error: "validation_error", message: firstError(parsed.error) });
      return;
    }

    const access = await one<{ ok: boolean }>(
      "select exists (select 1 from public.project_assignments where project_id = $1 and user_id = $2) as ok",
      [parsed.data.projectId, req.user!.id],
    );
    if (!access?.ok) {
      res.status(403).json({ error: "forbidden", message: "Não está atribuído a esta obra." });
      return;
    }

    const date = parsed.data.date ?? lisbonDate();

    const saved = await one<{ id: string }>(
      `insert into public.daily_reports (report_date, project_id, worker_id, transcript)
       values ($1, $2, $3, $4)
       on conflict (report_date, project_id, worker_id)
       do update set transcript = excluded.transcript
       returning id`,
      [date, parsed.data.projectId, req.user!.id, parsed.data.transcript],
    );

    await recordAudit({
      actor: req.user!,
      action: "daily.submitted",
      entity: "daily_report",
      entityId: saved?.id,
      metadata: { date, projectId: parsed.data.projectId },
    });

    res.status(201).json({ id: saved?.id, date });
  } catch (error) {
    next(error);
  }
});

workerRouter.get("/settings", async (_req, res, next) => {
  try {
    const setting = await one<{ value: { enabled?: boolean } }>(
      "select value from public.app_settings where key = 'voice_enabled'",
    );
    res.json({
      voiceEnabled: setting?.value?.enabled ?? true,
      voiceAvailable: env.transcriptionAvailable,
    });
  } catch (error) {
    next(error);
  }
});

workerRouter.use("/threads", createThreadsRouter("member"));
