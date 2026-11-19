import { Router } from "express";
import { createReadStream, existsSync } from "node:fs";
import { one } from "../db.js";
import { privateFileUrl, localFilePath, verifyFileToken } from "../storage.js";

export const filesRouter = Router();

const MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function mimeFor(storagePath: string, stored: string | null): string {
  if (stored) return stored;
  const extension = storagePath.slice(storagePath.lastIndexOf(".")).toLowerCase();
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}

/**
 * Entrega ficheiros privados através de um URL assinado de curta duração.
 * O token é emitido apenas para utilizadores com acesso à obra.
 */
filesRouter.get("/:kind/:id", async (req, res, next) => {
  try {
    const { kind, id } = req.params;
    if (kind !== "document" && kind !== "photo") {
      res.status(400).json({ error: "bad_request", message: "Tipo de ficheiro inválido." });
      return;
    }

    const token = typeof req.query.token === "string" ? req.query.token : "";
    const payload = verifyFileToken(token);
    if (!payload || payload.kind !== kind || payload.id !== id) {
      res.status(403).json({ error: "invalid_token", message: "Ligação expirada. Atualize a página." });
      return;
    }

    const row =
      kind === "document"
        ? await one<{ storage_path: string; file_name: string; mime_type: string | null }>(
            "select storage_path, file_name, mime_type from public.project_documents where id = $1",
            [id],
          )
        : await one<{ storage_path: string; file_name: string; mime_type: string | null }>(
            "select storage_path, coalesce(caption, 'fotografia') as file_name, null as mime_type from public.project_images where id = $1",
            [id],
          );

    if (!row) {
      res.status(404).json({ error: "not_found", message: "Ficheiro não encontrado." });
      return;
    }

    if (row.storage_path.startsWith("/")) {
      res.redirect(row.storage_path);
      return;
    }

    if (!row.storage_path.startsWith("local:")) {
      const url = await privateFileUrl(kind, id, row.storage_path);
      if (!url) {
        res.status(404).json({ error: "not_found", message: "Ficheiro indisponível." });
        return;
      }
      res.redirect(url);
      return;
    }

    const path = localFilePath(row.storage_path);
    if (!existsSync(path)) {
      res.status(404).json({ error: "not_found", message: "Ficheiro indisponível." });
      return;
    }

    res.setHeader("Content-Type", mimeFor(row.storage_path, row.mime_type));
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(row.file_name)}"`);
    res.setHeader("Cache-Control", "private, max-age=300");
    createReadStream(path).pipe(res);
  } catch (error) {
    next(error);
  }
});
