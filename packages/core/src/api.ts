import type { ApiErrorBody } from "./types";

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null, fallback = "Não foi possível concluir o pedido.") {
    super(body?.message ?? fallback);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Base da API. Em desenvolvimento o Vite faz proxy de /api.
 * Em produção com domínios separados (Vercel), defina VITE_API_URL.
 */
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const BASE = (env.VITE_API_URL ?? "").replace(/\/$/, "") + "/api";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      credentials: "include",
      ...init,
      headers: {
        ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(0, null, "Sem ligação ao servidor. Verifique a sua internet e tente novamente.");
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, (payload as ApiErrorBody) ?? null);
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form }),
};

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;
