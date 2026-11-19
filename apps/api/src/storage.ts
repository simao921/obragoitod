import { mkdir, writeFile } from "node:fs/promises";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./env.js";

const here = dirname(fileURLToPath(import.meta.url));
const publicMediaDir = resolve(here, "../public/media/uploads");
const privateDir = resolve(env.uploadDir);

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

export type SavedFile = {
  storagePath: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
};

function safeExtension(file: Express.Multer.File): string {
  const fromMime = EXTENSIONS[file.mimetype];
  if (fromMime) return fromMime;
  const fromName = extname(file.originalname).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(fromName) ? fromName : "";
}

export function isAllowedImage(mimetype: string): boolean {
  return IMAGE_TYPES.has(mimetype);
}

export function isAllowedDocument(mimetype: string): boolean {
  return DOCUMENT_TYPES.has(mimetype);
}

/** Imagem pública (portefólio). Fica acessível em /media/uploads/… */
export async function savePublicImage(file: Express.Multer.File): Promise<SavedFile> {
  if (!isAllowedImage(file.mimetype)) throw new Error("Formato de imagem não suportado.");
  await mkdir(publicMediaDir, { recursive: true });
  const name = `${randomUUID()}${safeExtension(file)}`;
  await writeFile(join(publicMediaDir, name), file.buffer);
  return {
    storagePath: `/media/uploads/${name}`,
    fileName: file.originalname,
    sizeBytes: file.size,
    mimeType: file.mimetype,
  };
}

/** Ficheiro privado (documentos e fotografias de obra partilhados com o cliente). */
export async function savePrivateFile(file: Express.Multer.File): Promise<SavedFile> {
  if (!isAllowedDocument(file.mimetype) && !isAllowedImage(file.mimetype)) {
    throw new Error("Tipo de ficheiro não permitido.");
  }
  await mkdir(privateDir, { recursive: true });
  const name = `${randomUUID()}${safeExtension(file)}`;
  await writeFile(join(privateDir, name), file.buffer);
  return {
    storagePath: `local:${name}`,
    fileName: file.originalname,
    sizeBytes: file.size,
    mimeType: file.mimetype,
  };
}

export function isLocalPath(storagePath: string): boolean {
  return storagePath.startsWith("local:");
}

export function localFilePath(storagePath: string): string {
  const name = storagePath.replace(/^local:/, "");
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) throw new Error("Caminho inválido.");
  return join(privateDir, name);
}

export function publicFilePath(storagePath: string): string | null {
  if (!storagePath.startsWith("/media/uploads/")) return null;
  const name = storagePath.replace("/media/uploads/", "");
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) return null;
  return join(publicMediaDir, name);
}

/* ---------------------------------------------------------------------------
 * URLs assinadas de curta duração (nunca expõem caminhos de armazenamento)
 * ------------------------------------------------------------------------- */

type TokenPayload = { k: string; i: string; e: number };

function sign(payload: string): string {
  return createHmac("sha256", env.sessionSecret).update(payload).digest("base64url");
}

export function signFileToken(kind: "document" | "photo", id: string, ttlSeconds = 600): string {
  const payload: TokenPayload = { k: kind, i: id, e: Math.floor(Date.now() / 1000) + ttlSeconds };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyFileToken(token: string): { kind: string; id: string } | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as TokenPayload;
    if (!payload.e || payload.e < Math.floor(Date.now() / 1000)) return null;
    return { kind: payload.k, id: payload.i };
  } catch {
    return null;
  }
}

/** URL assinada para um ficheiro privado, local ou no Supabase Storage. */
export async function privateFileUrl(kind: "document" | "photo", id: string, storagePath: string): Promise<string | null> {
  if (env.storageDriver === "supabase" && !isLocalPath(storagePath)) {
    const response = await fetch(
      `${env.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/sign/${env.supabaseStorageBucket}/${storagePath}`,
      {
        method: "POST",
        headers: {
          apikey: env.supabaseServiceKey,
          Authorization: `Bearer ${env.supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: 600 }),
      },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as { signedURL?: string };
    return body.signedURL ? `${env.supabaseUrl.replace(/\/$/, "")}/storage/v1${body.signedURL}` : null;
  }
  return `/api/files/${kind}/${id}?token=${signFileToken(kind, id)}`;
}

export async function uploadPrivateToSupabase(file: Express.Multer.File, prefix: string): Promise<SavedFile> {
  const name = `${prefix}/${randomUUID()}${safeExtension(file)}`;
  const response = await fetch(
    `${env.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${env.supabaseStorageBucket}/${name}`,
    {
      method: "POST",
      headers: {
        apikey: env.supabaseServiceKey,
        Authorization: `Bearer ${env.supabaseServiceKey}`,
        "Content-Type": file.mimetype,
        "x-upsert": "false",
      },
      body: new Uint8Array(file.buffer),
    },
  );
  if (!response.ok) throw new Error("Falha no upload para o Supabase Storage.");
  return {
    storagePath: name,
    fileName: file.originalname,
    sizeBytes: file.size,
    mimeType: file.mimetype,
  };
}

export async function saveProjectFile(file: Express.Multer.File, projectId: string): Promise<SavedFile> {
  if (env.storageDriver === "supabase") {
    return uploadPrivateToSupabase(file, `projects/${projectId}`);
  }
  return savePrivateFile(file);
}
