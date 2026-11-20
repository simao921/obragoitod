import { Router } from "express";
import { createHash } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { quoteRequestSchema, firstError, SERVICE_CATEGORIES } from "../core.js";
import { many, one } from "../db.js";
import { recordAudit } from "../audit.js";
import { quoteNotificationHtml, sendEmail } from "../notify.js";
import { env } from "../env.js";
import { mapSummary, type ProjectRow } from "../serializers.js";
import { maintenanceState } from "../settings.js";

export const publicRouter = Router();

/** Estado público do site: usado pelo site e pelos portais para o modo manutenção. */
publicRouter.get("/site-state", async (_req, res, next) => {
  try {
    const state = await maintenanceState();
    res.json({
      maintenance: { enabled: state.enabled, message: state.message },
      since: state.since,
    });
  } catch (error) {
    next(error);
  }
});

const quoteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "rate_limited", message: "Demasiados pedidos. Tente novamente mais tarde." },
});

publicRouter.get("/projects", async (req, res, next) => {
  try {
    const category = typeof req.query.category === "string" ? req.query.category : null;
    const rows = await many<ProjectRow>(
      `select id, slug, name, summary, description, category, location, year, client_name,
              cover_image, cover_image_alt, is_published, sort_order, created_at
         from public.projects
        where is_published = true
          and ($1::text is null or category::text = $1)
        order by sort_order asc, created_at desc`,
      [category],
    );
    res.json({ projects: rows.map(mapSummary) });
  } catch (error) {
    next(error);
  }
});

publicRouter.get("/projects/:slug", async (req, res, next) => {
  try {
    const project = await one<ProjectRow>(
      `select id, slug, name, summary, description, category, location, year, client_name,
              cover_image, cover_image_alt, is_published, sort_order, created_at
         from public.projects
        where slug = $1 and is_published = true`,
      [req.params.slug],
    );

    if (!project) {
      res.status(404).json({ error: "not_found", message: "Projeto não encontrado." });
      return;
    }

    const images = await many<{ id: string; storage_path: string; caption: string | null; alt: string | null }>(
      `select id, storage_path, caption, alt
         from public.project_images
        where project_id = $1
        order by sort_order asc, created_at asc`,
      [project.id],
    );

    const related = await many<ProjectRow>(
      `select id, slug, name, summary, description, category, location, year, client_name,
              cover_image, cover_image_alt, is_published, sort_order, created_at
         from public.projects
        where is_published = true and id <> $1 and category = $2
        order by sort_order asc limit 3`,
      [project.id, project.category],
    );

    res.json({
      project: {
        ...mapSummary(project),
        description: project.description,
        clientName: project.client_name,
        gallery: images.map((image) => ({
          id: image.id,
          url: image.storage_path,
          caption: image.caption,
          alt: image.alt,
        })),
      },
      related: related.map(mapSummary),
    });
  } catch (error) {
    next(error);
  }
});

publicRouter.post("/quote-requests", quoteLimiter, async (req, res, next) => {
  try {
    const parsed = quoteRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        error: "validation_error",
        message: firstError(parsed.error),
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const data = parsed.data;

    // Campo armadilha: responde como sucesso sem guardar, para não dar sinal a bots.
    if (data.company) {
      res.status(201).json({ stored: true, notified: false });
      return;
    }

    const serviceLabel =
      data.service && data.service !== "outro" ? SERVICE_CATEGORIES[data.service] : data.service === "outro" ? "Outro" : "";

    const ipHash = createHash("sha256")
      .update(`${req.ip ?? "unknown"}:${env.sessionSecret}`)
      .digest("hex")
      .slice(0, 32);

    const inserted = await one<{ id: string }>(
      `insert into public.quote_requests (name, email, phone, service, message, consent_at, ip_hash)
       values ($1, $2, $3, $4, $5, now(), $6)
       returning id`,
      [data.name, data.email.toLowerCase(), data.phone || null, serviceLabel || null, data.message, ipHash],
    );

    await recordAudit({
      actor: null,
      action: "quote_request.created",
      entity: "quote_request",
      entityId: inserted?.id,
    });

    const notified = await sendEmail({
      to: env.quoteNotifyEmail,
      subject: `Pedido de orçamento — ${data.name}`,
      html: quoteNotificationHtml({
        name: data.name,
        email: data.email,
        phone: data.phone ?? "",
        service: serviceLabel,
        message: data.message,
      }),
      replyTo: data.email,
    });

    res.status(201).json({ stored: true, notified });
  } catch (error) {
    next(error);
  }
});
