import { Router } from "express";
import { many, one } from "../db.js";
import { requireAuth } from "../auth/session.js";
import { mapDocument, mapPhoto, mapSummary, mapUpdate, type DocumentRow, type PhotoRow, type ProjectRow, type UpdateRow } from "../serializers.js";
import { privateFileUrl } from "../storage.js";
import { createThreadsRouter } from "./threads.js";

export const clientRouter = Router();

clientRouter.use(requireAuth("client"));

const SUMMARY_COLUMNS = `p.id, p.slug, p.name, p.summary, p.description, p.category, p.location, p.year,
  p.client_name, p.cover_image, p.cover_image_alt, p.is_published, p.sort_order, p.created_at`;

async function assignedProject(projectId: string, userId: string) {
  return one<ProjectRow & { progress: number | null }>(
    `select ${SUMMARY_COLUMNS},
            (select u.progress from public.project_updates u
              where u.project_id = p.id and u.visible_to_client = true and u.progress is not null
              order by u.created_at desc limit 1) as progress
       from public.projects p
       join public.project_assignments a on a.project_id = p.id and a.user_id = $2
      where p.id = $1`,
    [projectId, userId],
  );
}

clientRouter.get("/projects", async (req, res, next) => {
  try {
    const rows = await many<ProjectRow & { progress: number | null; last_update_at: string | null }>(
      `select ${SUMMARY_COLUMNS},
              (select u.progress from public.project_updates u
                where u.project_id = p.id and u.visible_to_client = true and u.progress is not null
                order by u.created_at desc limit 1) as progress,
              (select max(u.created_at) from public.project_updates u
                where u.project_id = p.id and u.visible_to_client = true) as last_update_at
         from public.projects p
         join public.project_assignments a on a.project_id = p.id and a.user_id = $1
        order by p.sort_order asc, p.created_at desc`,
      [req.user!.id],
    );

    res.json({
      projects: rows.map((row) => ({
        ...mapSummary(row),
        description: row.description,
        progress: row.progress,
        updates: [],
        photos: [],
        documents: [],
        lastUpdateAt: row.last_update_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/** Atualizações de todas as obras do cliente, numa única cronologia. */
clientRouter.get("/updates", async (req, res, next) => {
  try {
    const rows = await many<UpdateRow & { project_name: string }>(
      `select u.id, u.project_id, u.title, u.body, u.progress, u.created_at,
              pr.full_name as author_name, p.name as project_name
         from public.project_updates u
         join public.projects p on p.id = u.project_id
         join public.project_assignments a on a.project_id = p.id and a.user_id = $1
         left join public.profiles pr on pr.id = u.created_by
        where u.visible_to_client = true
        order by u.created_at desc
        limit 100`,
      [req.user!.id],
    );

    res.json({
      updates: rows.map((row) => ({ ...mapUpdate(row), projectName: row.project_name })),
    });
  } catch (error) {
    next(error);
  }
});

clientRouter.get("/projects/:id", async (req, res, next) => {
  try {
    const project = await assignedProject(req.params.id, req.user!.id);
    if (!project) {
      res.status(404).json({ error: "not_found", message: "Obra não encontrada ou não atribuída a si." });
      return;
    }

    const updates = await many<UpdateRow>(
      `select u.id, u.project_id, u.title, u.body, u.progress, u.created_at, pr.full_name as author_name
         from public.project_updates u
         left join public.profiles pr on pr.id = u.created_by
        where u.project_id = $1 and u.visible_to_client = true
        order by u.created_at desc`,
      [project.id],
    );

    const photos = await many<PhotoRow>(
      `select id, project_id, storage_path, caption, alt, created_at
         from public.project_images where project_id = $1
        order by sort_order asc, created_at desc`,
      [project.id],
    );

    const documents = await many<DocumentRow & { storage_path: string }>(
      `select id, project_id, storage_path, title, file_name, size_bytes, created_at, visible_to_client
         from public.project_documents
        where project_id = $1 and visible_to_client = true
        order by created_at desc`,
      [project.id],
    );

    res.json({
      project: {
        ...mapSummary(project),
        description: project.description,
        progress: project.progress,
        updates: updates.map(mapUpdate),
        photos: await Promise.all(
          photos.map(async (row) =>
            mapPhoto(row, row.storage_path.startsWith("/") ? row.storage_path : await privateFileUrl("photo", row.id, row.storage_path)),
          ),
        ),
        documents: await Promise.all(
          documents.map(async (row) => mapDocument(row, await privateFileUrl("document", row.id, row.storage_path))),
        ),
      },
    });
  } catch (error) {
    next(error);
  }
});

clientRouter.use("/threads", createThreadsRouter("member"));
