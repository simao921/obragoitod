import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import {
  createUserSchema,
  firstError,
  projectSchema,
  projectUpdateSchema,
  slugify,
  updateUserSchema,
} from "@obragoito/core";
import { many, one, query } from "../db.js";
import { env } from "../env.js";
import { recordAudit } from "../audit.js";
import { requireAuth } from "../auth/session.js";
import { provisionUser, resetPassword } from "../auth/users.js";
import { parseUserImport } from "../import.js";
import {
  mapAdminProject,
  mapDocument,
  mapPhoto,
  mapQuote,
  mapReport,
  mapUpdate,
  type AssignmentRow,
  type DocumentRow,
  type PhotoRow,
  type ProjectRow,
  type QuoteRow,
  type ReportRow,
  type UpdateRow,
} from "../serializers.js";
import { privateFileUrl, saveProjectFile, savePublicImage } from "../storage.js";
import { createThreadsRouter } from "./threads.js";
import { adminOpsRouter } from "./admin-ops.js";

export const adminRouter = Router();

adminRouter.use(requireAuth("admin"));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 1 },
});

/* ------------------------------------------------------------------ painel */

adminRouter.get("/dashboard", async (_req, res, next) => {
  try {
    const counts = await one<{
      projects: string;
      published: string;
      clients: string;
      workers: string;
      threads: string;
      new_quotes: string;
      pending_reports: string;
    }>(`select
        (select count(*) from public.projects) as projects,
        (select count(*) from public.projects where is_published) as published,
        (select count(*) from public.profiles where role = 'client') as clients,
        (select count(*) from public.profiles where role = 'worker') as workers,
        (select count(*) from public.threads) as threads,
        (select count(*) from public.quote_requests where status = 'new') as new_quotes,
        (select count(*) from public.worker_reports where status = 'submitted') as pending_reports`);

    const recentQuotes = await many<QuoteRow>(
      `select id, name, email, phone, service, message, status, created_at
         from public.quote_requests order by created_at desc limit 5`,
    );

    const recentReports = await many<ReportRow>(
      `select r.id, r.project_id, p.name as project_name, pr.full_name as worker_name,
              r.body, r.progress, r.status, r.created_at
         from public.worker_reports r
         join public.projects p on p.id = r.project_id
         join public.profiles pr on pr.id = r.worker_id
        order by r.created_at desc limit 5`,
    );

    const recentAudit = await many<{
      id: string;
      actor_name: string | null;
      actor_email: string | null;
      action: string;
      entity: string | null;
      entity_id: string | null;
      created_at: string;
    }>(
      `select a.id, p.full_name as actor_name, a.actor_email, a.action, a.entity, a.entity_id, a.created_at
         from public.audit_log a
         left join public.profiles p on p.id = a.actor_id
        order by a.created_at desc limit 8`,
    );

    res.json({
      counts: {
        projects: Number(counts?.projects ?? 0),
        publishedProjects: Number(counts?.published ?? 0),
        clients: Number(counts?.clients ?? 0),
        workers: Number(counts?.workers ?? 0),
        openThreads: Number(counts?.threads ?? 0),
        newQuotes: Number(counts?.new_quotes ?? 0),
        pendingReports: Number(counts?.pending_reports ?? 0),
      },
      recentQuotes: recentQuotes.map(mapQuote),
      recentReports: recentReports.map(mapReport),
      recentAudit: recentAudit.map((row) => ({
        id: row.id,
        actorName: row.actor_name ?? row.actor_email,
        action: row.action,
        entity: row.entity,
        entityId: row.entity_id,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/* ----------------------------------------------------------------- pessoas */

adminRouter.get("/users", async (req, res, next) => {
  try {
    const role = typeof req.query.role === "string" && req.query.role ? req.query.role : null;
    const search = typeof req.query.q === "string" && req.query.q ? req.query.q : null;

    const rows = await many<{
      id: string;
      email: string;
      full_name: string;
      phone: string | null;
      role: "admin" | "client" | "worker";
      status: "active" | "disabled";
      created_at: string;
      last_login_at: string | null;
      project_count: string;
    }>(
      `select p.id, p.email, p.full_name, p.phone, p.role, p.status, p.created_at, p.last_login_at,
              (select count(*) from public.project_assignments a where a.user_id = p.id) as project_count
         from public.profiles p
        where ($1::text is null or p.role::text = $1)
          and ($2::text is null or p.full_name ilike '%' || $2 || '%' or p.email ilike '%' || $2 || '%')
        order by p.created_at desc`,
      [role, search],
    );

    res.json({
      users: rows.map((row) => ({
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        phone: row.phone,
        role: row.role,
        status: row.status,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
        projectCount: Number(row.project_count),
      })),
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/users", async (req, res, next) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "validation_error", message: firstError(parsed.error) });
      return;
    }

    const existing = await one<{ id: string }>(
      "select id from public.profiles where lower(email) = $1",
      [parsed.data.email.toLowerCase()],
    );
    if (existing) {
      res.status(409).json({ error: "email_exists", message: "Já existe uma conta com este email." });
      return;
    }

    const created = await provisionUser(parsed.data);
    await recordAudit({
      actor: req.user!,
      action: "user.created",
      entity: "profile",
      entityId: created.id,
      metadata: { role: parsed.data.role },
    });

    res.status(201).json({
      user: { id: created.id, email: created.email },
      temporaryPassword: created.temporaryPassword,
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/users/import", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "missing_file", message: "Envie um ficheiro CSV ou XLSX." });
      return;
    }

    const parsed = parseUserImport(req.file.buffer, req.file.originalname);
    if (parsed.rows.length > 200) {
      res.status(413).json({ error: "too_many_rows", message: "Máximo de 200 linhas por importação." });
      return;
    }

    const created: { email: string; temporaryPassword: string | null }[] = [];
    const errors = [...parsed.errors];

    for (const row of parsed.rows) {
      const existing = await one<{ id: string }>("select id from public.profiles where lower(email) = $1", [row.email]);
      if (existing) {
        errors.push({ line: row.line, message: `Já existe uma conta para ${row.email}.` });
        continue;
      }
      try {
        const user = await provisionUser({
          email: row.email,
          fullName: row.fullName,
          role: row.role,
          phone: row.phone,
        });
        created.push({ email: user.email, temporaryPassword: user.temporaryPassword });
      } catch (error) {
        errors.push({ line: row.line, message: error instanceof Error ? error.message : "Falha ao criar conta." });
      }
    }

    await recordAudit({
      actor: req.user!,
      action: "user.imported",
      entity: "profile",
      metadata: { created: created.length, errors: errors.length },
    });

    res.status(201).json({ created, errors });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/users/:id", async (req, res, next) => {
  try {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "validation_error", message: firstError(parsed.error) });
      return;
    }

    const target = await one<{ id: string; role: string }>("select id, role from public.profiles where id = $1", [
      req.params.id,
    ]);
    if (!target) {
      res.status(404).json({ error: "not_found", message: "Conta não encontrada." });
      return;
    }

    const sets: string[] = [];
    const values: unknown[] = [];
    const bump = (column: string, value: unknown) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };

    if (parsed.data.fullName) bump("full_name", parsed.data.fullName);
    if (parsed.data.phone !== undefined) bump("phone", parsed.data.phone || null);
    if (parsed.data.role) bump("role", parsed.data.role);
    if (parsed.data.status) bump("status", parsed.data.status);

    if (sets.length === 0) {
      res.status(400).json({ error: "bad_request", message: "Nada para atualizar." });
      return;
    }

    values.push(req.params.id);
    await query(`update public.profiles set ${sets.join(", ")} where id = $${values.length}`, values);

    if (parsed.data.status === "disabled") {
      await query("delete from public.sessions where user_id = $1", [req.params.id]);
    }

    await recordAudit({
      actor: req.user!,
      action: "user.updated",
      entity: "profile",
      entityId: req.params.id,
      metadata: { fields: Object.keys(parsed.data) },
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/users/:id/reset-password", async (req, res, next) => {
  try {
    const target = await one<{ id: string }>("select id from public.profiles where id = $1", [req.params.id]);
    if (!target) {
      res.status(404).json({ error: "not_found", message: "Conta não encontrada." });
      return;
    }
    const temporaryPassword = await resetPassword(req.params.id);
    await recordAudit({ actor: req.user!, action: "user.password_reset", entity: "profile", entityId: req.params.id });
    res.json({ temporaryPassword });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------------------ obras */

const PROJECT_COLUMNS = `p.id, p.slug, p.name, p.summary, p.description, p.category, p.location, p.year,
  p.client_name, p.cover_image, p.cover_image_alt, p.is_published, p.sort_order, p.created_at, p.status`;

adminRouter.get("/projects", async (_req, res, next) => {
  try {
    const rows = await many<ProjectRow & { assignments: AssignmentRow[] | null; update_count: string }>(
      `select ${PROJECT_COLUMNS},
              (select coalesce(json_agg(json_build_object(
                        'user_id', pr.id, 'full_name', pr.full_name, 'email', pr.email, 'role', pr.role
                      ) order by pr.full_name), '[]'::json)
                 from public.project_assignments a
                 join public.profiles pr on pr.id = a.user_id
                where a.project_id = p.id) as assignments,
              (select count(*) from public.project_updates u where u.project_id = p.id) as update_count
         from public.projects p
        order by p.sort_order asc, p.created_at desc`,
    );
    res.json({ projects: rows.map(mapAdminProject) });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/projects", async (req, res, next) => {
  try {
    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "validation_error", message: firstError(parsed.error) });
      return;
    }

    let slug = parsed.data.slug || slugify(parsed.data.name);
    const clash = await one<{ id: string }>("select id from public.projects where slug = $1", [slug]);
    if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const created = await one<{ id: string }>(
      `insert into public.projects
         (slug, name, category, summary, description, location, year, client_name,
          cover_image, cover_image_alt, is_published, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       returning id`,
      [
        slug,
        parsed.data.name,
        parsed.data.category,
        parsed.data.summary || null,
        parsed.data.description || null,
        parsed.data.location || null,
        parsed.data.year ?? null,
        parsed.data.clientName || null,
        parsed.data.coverImage || null,
        parsed.data.coverImageAlt || null,
        parsed.data.isPublished,
        req.user!.id,
      ],
    );

    await recordAudit({
      actor: req.user!,
      action: "project.created",
      entity: "project",
      entityId: created?.id,
      metadata: { name: parsed.data.name },
    });

    res.status(201).json({ id: created?.id, slug });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/projects/:id", async (req, res, next) => {
  try {
    const project = await one<ProjectRow & { assignments: AssignmentRow[] | null; update_count: string }>(
      `select ${PROJECT_COLUMNS},
              (select coalesce(json_agg(json_build_object(
                        'user_id', pr.id, 'full_name', pr.full_name, 'email', pr.email, 'role', pr.role
                      ) order by pr.full_name), '[]'::json)
                 from public.project_assignments a
                 join public.profiles pr on pr.id = a.user_id
                where a.project_id = p.id) as assignments,
              (select count(*) from public.project_updates u where u.project_id = p.id) as update_count
         from public.projects p where p.id = $1`,
      [req.params.id],
    );

    if (!project) {
      res.status(404).json({ error: "not_found", message: "Obra não encontrada." });
      return;
    }

    const updates = await many<UpdateRow>(
      `select u.id, u.project_id, u.title, u.body, u.progress, u.created_at, pr.full_name as author_name
         from public.project_updates u
         left join public.profiles pr on pr.id = u.created_by
        where u.project_id = $1 order by u.created_at desc`,
      [req.params.id],
    );

    const documents = await many<DocumentRow & { storage_path: string }>(
      `select id, project_id, storage_path, title, file_name, size_bytes, created_at, visible_to_client
         from public.project_documents where project_id = $1 order by created_at desc`,
      [req.params.id],
    );

    const photos = await many<PhotoRow>(
      `select id, project_id, storage_path, caption, alt, created_at
         from public.project_images where project_id = $1 order by sort_order asc, created_at desc`,
      [req.params.id],
    );

    res.json({
      project: mapAdminProject(project),
      updates: updates.map(mapUpdate),
      documents: await Promise.all(
        documents.map(async (row) => mapDocument(row, await privateFileUrl("document", row.id, row.storage_path))),
      ),
      photos: await Promise.all(
        photos.map(async (row) =>
          mapPhoto(row, row.storage_path.startsWith("/") ? row.storage_path : await privateFileUrl("photo", row.id, row.storage_path)),
        ),
      ),
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/projects/:id", async (req, res, next) => {
  try {
    const parsed = projectSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "validation_error", message: firstError(parsed.error) });
      return;
    }

    const mapping: Record<string, string> = {
      name: "name",
      slug: "slug",
      category: "category",
      summary: "summary",
      description: "description",
      location: "location",
      year: "year",
      clientName: "client_name",
      coverImage: "cover_image",
      coverImageAlt: "cover_image_alt",
      isPublished: "is_published",
    };

    const sets: string[] = [];
    const values: unknown[] = [];
    Object.entries(parsed.data).forEach(([key, value]) => {
      const column = mapping[key];
      if (!column) return;
      values.push(value === "" ? null : value);
      sets.push(`${column} = $${values.length}`);
    });

    if (sets.length === 0) {
      res.status(400).json({ error: "no_fields", message: "Nada para atualizar." });
      return;
    }

    values.push(req.params.id);
    const updated = await query(`update public.projects set ${sets.join(", ")} where id = $${values.length}`, values);
    if (updated.rowCount === 0) {
      res.status(404).json({ error: "not_found", message: "Obra não encontrada." });
      return;
    }

    await recordAudit({
      actor: req.user!,
      action: "project.updated",
      entity: "project",
      entityId: req.params.id,
      metadata: { fields: Object.keys(parsed.data) },
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/projects/:id/assignments", async (req, res, next) => {
  try {
    const parsed = z
      .object({
        userId: z.string().uuid(),
        roleOnProject: z.string().trim().max(80).optional().default(""),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "validation_error", message: firstError(parsed.error) });
      return;
    }

    const user = await one<{ id: string; role: string }>("select id, role from public.profiles where id = $1", [
      parsed.data.userId,
    ]);
    if (!user) {
      res.status(404).json({ error: "not_found", message: "Utilizador não encontrado." });
      return;
    }
    if (user.role === "admin") {
      res.status(400).json({ error: "invalid_role", message: "Administradores não são atribuídos a obras." });
      return;
    }

    await query(
      `insert into public.project_assignments (project_id, user_id, role_on_project)
       values ($1, $2, $3)
       on conflict (project_id, user_id) do update set role_on_project = excluded.role_on_project`,
      [req.params.id, parsed.data.userId, parsed.data.roleOnProject || null],
    );

    await recordAudit({
      actor: req.user!,
      action: "project.assigned",
      entity: "project",
      entityId: req.params.id,
      metadata: { userId: parsed.data.userId },
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/projects/:id/assignments/:userId", async (req, res, next) => {
  try {
    await query("delete from public.project_assignments where project_id = $1 and user_id = $2", [
      req.params.id,
      req.params.userId,
    ]);
    await recordAudit({
      actor: req.user!,
      action: "project.unassigned",
      entity: "project",
      entityId: req.params.id,
      metadata: { userId: req.params.userId },
    });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/projects/:id/updates", async (req, res, next) => {
  try {
    const parsed = projectUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "validation_error", message: firstError(parsed.error) });
      return;
    }

    const created = await one<{ id: string }>(
      `insert into public.project_updates (project_id, title, body, progress, visible_to_client, created_by)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [
        req.params.id,
        parsed.data.title,
        parsed.data.body,
        parsed.data.progress ?? null,
        parsed.data.visibleToClient,
        req.user!.id,
      ],
    );

    await recordAudit({
      actor: req.user!,
      action: "project.update_published",
      entity: "project",
      entityId: req.params.id,
      metadata: { updateId: created?.id, visibleToClient: parsed.data.visibleToClient },
    });

    res.status(201).json({ id: created?.id });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/projects/:id/documents", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "missing_file", message: "Selecione um ficheiro." });
      return;
    }
    const title = String(req.body?.title ?? req.file.originalname);
    const visibleToClient = String(req.body?.visibleToClient ?? "true") !== "false";

    const saved = await saveProjectFile(req.file, req.params.id);
    const created = await one<{ id: string }>(
      `insert into public.project_documents
         (project_id, storage_path, title, file_name, size_bytes, mime_type, visible_to_client, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      [
        req.params.id,
        saved.storagePath,
        title,
        saved.fileName,
        saved.sizeBytes,
        saved.mimeType,
        visibleToClient,
        req.user!.id,
      ],
    );

    await recordAudit({
      actor: req.user!,
      action: "document.uploaded",
      entity: "project",
      entityId: req.params.id,
      metadata: { documentId: created?.id },
    });

    res.status(201).json({ id: created?.id });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/projects/:id/photos", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "missing_file", message: "Selecione uma imagem." });
      return;
    }
    const saved = await saveProjectFile(req.file, req.params.id);
    const created = await one<{ id: string }>(
      `insert into public.project_images (project_id, storage_path, caption, alt)
       values ($1, $2, $3, $4) returning id`,
      [req.params.id, saved.storagePath, req.body?.caption ?? null, req.body?.alt ?? null],
    );

    await recordAudit({
      actor: req.user!,
      action: "photo.uploaded",
      entity: "project",
      entityId: req.params.id,
      metadata: { photoId: created?.id },
    });

    res.status(201).json({ id: created?.id });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/projects/:id/cover", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "missing_file", message: "Selecione uma imagem." });
      return;
    }
    const saved = await savePublicImage(req.file);
    await query("update public.projects set cover_image = $2, cover_image_alt = $3 where id = $1", [
      req.params.id,
      saved.storagePath,
      req.body?.alt ?? null,
    ]);
    await query(
      `insert into public.project_images (project_id, storage_path, alt, sort_order)
       values ($1, $2, $3, 0)`,
      [req.params.id, saved.storagePath, req.body?.alt ?? null],
    );
    await recordAudit({
      actor: req.user!,
      action: "project.cover_updated",
      entity: "project",
      entityId: req.params.id,
    });
    res.status(201).json({ coverImage: saved.storagePath });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/documents/:id", async (req, res, next) => {
  try {
    await query("delete from public.project_documents where id = $1", [req.params.id]);
    await recordAudit({ actor: req.user!, action: "document.deleted", entity: "document", entityId: req.params.id });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/photos/:id", async (req, res, next) => {
  try {
    await query("delete from public.project_images where id = $1", [req.params.id]);
    await recordAudit({ actor: req.user!, action: "photo.deleted", entity: "photo", entityId: req.params.id });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

/* --------------------------------------------------------------- relatórios */

adminRouter.get("/reports", async (_req, res, next) => {
  try {
    const rows = await many<ReportRow>(
      `select r.id, r.project_id, p.name as project_name, pr.full_name as worker_name,
              r.body, r.progress, r.status, r.created_at
         from public.worker_reports r
         join public.projects p on p.id = r.project_id
         join public.profiles pr on pr.id = r.worker_id
        order by r.created_at desc limit 200`,
    );
    res.json({ reports: rows.map(mapReport) });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/reports/:id", async (req, res, next) => {
  try {
    const parsed = z.object({ status: z.enum(["submitted", "reviewed"]) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "validation_error", message: "Estado inválido." });
      return;
    }
    await query(
      `update public.worker_reports
          set status = $2, reviewed_by = $3, reviewed_at = case when $2 = 'reviewed' then now() else null end
        where id = $1`,
      [req.params.id, parsed.data.status, req.user!.id],
    );
    await recordAudit({
      actor: req.user!,
      action: "report.reviewed",
      entity: "worker_report",
      entityId: req.params.id,
      metadata: { status: parsed.data.status },
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/* ---------------------------------------------------------- pedidos públicos */

adminRouter.get("/quote-requests", async (_req, res, next) => {
  try {
    const rows = await many<QuoteRow>(
      `select id, name, email, phone, service, message, status, created_at
         from public.quote_requests order by created_at desc limit 200`,
    );
    res.json({ quoteRequests: rows.map(mapQuote) });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/quote-requests/:id", async (req, res, next) => {
  try {
    const parsed = z.object({ status: z.enum(["new", "contacted", "closed"]) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "validation_error", message: "Estado inválido." });
      return;
    }
    await query("update public.quote_requests set status = $2 where id = $1", [req.params.id, parsed.data.status]);
    await recordAudit({
      actor: req.user!,
      action: "quote_request.updated",
      entity: "quote_request",
      entityId: req.params.id,
      metadata: { status: parsed.data.status },
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------------------ ajustes */

adminRouter.get("/settings", async (_req, res, next) => {
  try {
    const row = await one<{ value: { enabled?: boolean } }>(
      "select value from public.app_settings where key = 'voice_enabled'",
    );
    res.json({
      voiceEnabled: row?.value?.enabled ?? true,
      voiceAvailable: env.transcriptionAvailable,
      transcriptionProvider: env.transcriptionProvider || null,
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/settings", async (req, res, next) => {
  try {
    const parsed = z.object({ voiceEnabled: z.boolean() }).safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "validation_error", message: "Valor inválido." });
      return;
    }
    await query(
      `insert into public.app_settings (key, value, updated_by, updated_at)
       values ('voice_enabled', $1::jsonb, $2, now())
       on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`,
      [JSON.stringify({ enabled: parsed.data.voiceEnabled }), req.user!.id],
    );
    await recordAudit({
      actor: req.user!,
      action: "settings.voice_updated",
      entity: "app_settings",
      entityId: "voice_enabled",
      metadata: { enabled: parsed.data.voiceEnabled },
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/audit", async (_req, res, next) => {
  try {
    const rows = await many<{
      id: string;
      actor_name: string | null;
      actor_email: string | null;
      action: string;
      entity: string | null;
      entity_id: string | null;
      created_at: string;
    }>(
      `select a.id, p.full_name as actor_name, a.actor_email, a.action, a.entity, a.entity_id, a.created_at
         from public.audit_log a
         left join public.profiles p on p.id = a.actor_id
        order by a.created_at desc limit 200`,
    );
    res.json({
      entries: rows.map((row) => ({
        id: row.id,
        actorName: row.actor_name ?? row.actor_email,
        action: row.action,
        entity: row.entity,
        entityId: row.entity_id,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.use(adminOpsRouter);
adminRouter.use("/threads", createThreadsRouter("admin"));
