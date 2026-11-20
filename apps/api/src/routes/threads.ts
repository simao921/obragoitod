import { Router } from "express";
import { messageSchema, firstError, threadSchema, memberThreadSchema } from "../core.js";
import { many, one, query, transaction } from "../db.js";
import { recordAudit } from "../audit.js";

type ThreadRow = {
  id: string;
  subject: string;
  project_id: string | null;
  project_name: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  last_message_body: string | null;
  participant_names: string[] | null;
  unread: string | number | null;
};

function mapThread(row: ThreadRow) {
  return {
    id: row.id,
    subject: row.subject,
    projectId: row.project_id,
    projectName: row.project_name,
    participantNames: row.participant_names ?? [],
    lastMessageAt: row.last_message_at ?? row.created_at,
    lastMessagePreview: row.last_message_body ? row.last_message_body.slice(0, 140) : null,
    unread: Number(row.unread ?? 0),
  };
}

const THREAD_SELECT = `
  select t.id, t.subject, t.project_id, p.name as project_name, t.created_at, t.updated_at,
         lm.created_at as last_message_at, lm.body as last_message_body,
         (select coalesce(json_agg(pr.full_name order by pr.full_name), '[]'::json)
            from public.thread_participants tp
            join public.profiles pr on pr.id = tp.user_id
           where tp.thread_id = t.id) as participant_names,
         (select count(*)
            from public.messages m
            join public.thread_participants tp2
              on tp2.thread_id = m.thread_id and tp2.user_id = $1
           where m.thread_id = t.id
             and (tp2.last_read_at is null or m.created_at > tp2.last_read_at)
             and m.sender_id <> $1) as unread
    from public.threads t
    left join public.projects p on p.id = t.project_id
    left join lateral (
      select m.created_at, m.body from public.messages m
       where m.thread_id = t.id order by m.created_at desc limit 1
    ) lm on true
`;

export function createThreadsRouter(mode: "admin" | "member") {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const filter = mode === "admin" ? "" : "where exists (select 1 from public.thread_participants tp where tp.thread_id = t.id and tp.user_id = $1)";
      const rows = await many<ThreadRow>(`${THREAD_SELECT} ${filter} order by coalesce(lm.created_at, t.created_at) desc`, [
        userId,
      ]);
      res.json({ threads: rows.map(mapThread) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const thread = await one<ThreadRow>(`${THREAD_SELECT} where t.id = $2`, [userId, req.params.id]);
      if (!thread) {
        res.status(404).json({ error: "not_found", message: "Conversa não encontrada." });
        return;
      }

      if (mode === "member") {
        const allowed = await one<{ ok: boolean }>(
          "select exists (select 1 from public.thread_participants where thread_id = $1 and user_id = $2) as ok",
          [req.params.id, userId],
        );
        if (!allowed?.ok) {
          res.status(403).json({ error: "forbidden", message: "Sem acesso a esta conversa." });
          return;
        }
      }

      const messages = await many<{
        id: string;
        sender_id: string;
        sender_name: string;
        body: string;
        created_at: string;
      }>(
        `select m.id, m.sender_id, pr.full_name as sender_name, m.body, m.created_at
           from public.messages m
           join public.profiles pr on pr.id = m.sender_id
          where m.thread_id = $1
          order by m.created_at asc`,
        [req.params.id],
      );

      await query(
        "update public.thread_participants set last_read_at = now() where thread_id = $1 and user_id = $2",
        [req.params.id, userId],
      );

      res.json({
        thread: mapThread(thread),
        messages: messages.map((message) => ({
          id: message.id,
          threadId: req.params.id,
          senderId: message.sender_id,
          senderName: message.sender_name,
          body: message.body,
          createdAt: message.created_at,
          isMine: message.sender_id === userId,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const parsed = mode === "admin" ? threadSchema.safeParse(req.body) : memberThreadSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ error: "validation_error", message: firstError(parsed.error) });
        return;
      }

      const data = parsed.data as {
        subject: string;
        projectId?: string | null;
        body: string;
        participantIds?: string[];
      };
      let participantIds: string[] = data.participantIds ?? [];

      if (mode === "member") {
        // Um cliente ou trabalhador só pode falar com a administração.
        const admins = await many<{ id: string }>(
          "select id from public.profiles where role = 'admin' and status = 'active'",
        );
        participantIds = admins.map((admin) => admin.id);
        if (participantIds.length === 0) {
          res.status(503).json({ error: "no_admin", message: "Não existe administração ativa para receber a mensagem." });
          return;
        }
        if (data.projectId) {
          const access = await one<{ ok: boolean }>(
            "select exists (select 1 from public.project_assignments where project_id = $1 and user_id = $2) as ok",
            [data.projectId, userId],
          );
          if (!access?.ok) {
            res.status(403).json({ error: "forbidden", message: "Sem acesso a essa obra." });
            return;
          }
        }
      }

      const ids = Array.from(new Set([...participantIds, userId]));

      const created = await transaction(async (client) => {
        const thread = await client.query<{ id: string }>(
          `insert into public.threads (subject, project_id, created_by) values ($1, $2, $3) returning id`,
          [data.subject, data.projectId ?? null, userId],
        );
        const threadId = thread.rows[0].id;
        for (const participant of ids) {
          await client.query(
            `insert into public.thread_participants (thread_id, user_id, last_read_at)
             values ($1, $2, case when $2 = $3 then now() else null end)
             on conflict do nothing`,
            [threadId, participant, userId],
          );
        }
        await client.query(`insert into public.messages (thread_id, sender_id, body) values ($1, $2, $3)`, [
          threadId,
          userId,
          data.body,
        ]);
        return threadId;
      });

      await recordAudit({
        actor: req.user!,
        action: "thread.created",
        entity: "thread",
        entityId: created,
        metadata: { mode },
      });

      res.status(201).json({ id: created });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/messages", async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const parsed = messageSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ error: "validation_error", message: firstError(parsed.error) });
        return;
      }

      const thread = await one<{ id: string }>("select id from public.threads where id = $1", [req.params.id]);
      if (!thread) {
        res.status(404).json({ error: "not_found", message: "Conversa não encontrada." });
        return;
      }

      if (mode === "member") {
        const allowed = await one<{ ok: boolean }>(
          "select exists (select 1 from public.thread_participants where thread_id = $1 and user_id = $2) as ok",
          [req.params.id, userId],
        );
        if (!allowed?.ok) {
          res.status(403).json({ error: "forbidden", message: "Sem acesso a esta conversa." });
          return;
        }
      }

      const inserted = await one<{ id: string; created_at: string }>(
        `insert into public.messages (thread_id, sender_id, body) values ($1, $2, $3)
         returning id, created_at`,
        [req.params.id, userId, parsed.data.body],
      );

      await query("update public.threads set updated_at = now() where id = $1", [req.params.id]);
      await query(
        "update public.thread_participants set last_read_at = now() where thread_id = $1 and user_id = $2",
        [req.params.id, userId],
      );

      res.status(201).json({
        message: {
          id: inserted?.id,
          threadId: req.params.id,
          senderId: userId,
          senderName: req.user!.fullName,
          body: parsed.data.body,
          createdAt: inserted?.created_at,
          isMine: true,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
