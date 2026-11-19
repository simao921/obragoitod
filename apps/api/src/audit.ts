import { query } from "./db.js";
import type { SessionUser } from "@obragoito/core";

type AuditInput = {
  actor: SessionUser | null;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Registo de auditoria. Nunca inclui palavras-passe, tokens ou conteúdo de áudio.
 */
export async function recordAudit({ actor, action, entity, entityId, metadata }: AuditInput): Promise<void> {
  try {
    await query(
      `insert into public.audit_log (actor_id, actor_email, action, entity, entity_id, metadata)
       values ($1, $2, $3, $4, $5, $6)`,
      [actor?.id ?? null, actor?.email ?? null, action, entity ?? null, entityId ?? null, metadata ?? null],
    );
  } catch (error) {
    // A auditoria nunca deve derrubar a operação principal, mas fica registada.
    console.error("[audit] falha ao registar:", error instanceof Error ? error.message : error);
  }
}
