/**
 * Configuração da API. Nenhum segredo é impresso em logs.
 */

function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  port: Number(process.env.API_PORT ?? process.env.PORT ?? 4000),

  databaseUrl: process.env.DATABASE_URL ?? "",
  sessionSecret: process.env.SESSION_SECRET ?? "",
  cookieSecure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
  sessionHours: Number(process.env.SESSION_HOURS ?? 8),

  /** Origens adicionais permitidas para pedidos com credenciais (produção multi-domínio). */
  publicOrigins: list(process.env.PUBLIC_ORIGINS),

  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "project-files",

  uploadDir: process.env.UPLOAD_DIR ?? "/data/uploads",
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 12),

  transcriptionProvider: (process.env.TRANSCRIPTION_PROVIDER ?? "").toLowerCase(),
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  transcriptionModel: process.env.TRANSCRIPTION_MODEL ?? "whisper-1",

  /** Gemini: resumos dos relatórios diários (pode ser definida na gestão). */
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",

  resendApiKey: process.env.RESEND_API_KEY ?? "",
  quoteNotifyEmail: process.env.QUOTE_NOTIFY_EMAIL ?? "obragoito@obragoito.pt",
  emailFrom: process.env.EMAIL_FROM ?? "website@obragoito.pt",

  /** Endereço público do site institucional (usado nos emails e no portal dev). */
  publicSiteUrl: process.env.PUBLIC_SITE_URL ?? "https://obragoito.pt",

  /** Ecrã de configuração quando a base de dados não está acessível. */
  get configured(): boolean {
    return Boolean(this.databaseUrl && this.sessionSecret);
  },

  get storageDriver(): "supabase" | "local" {
    return this.supabaseUrl && this.supabaseServiceKey ? "supabase" : "local";
  },

  get transcriptionAvailable(): boolean {
    if (this.transcriptionProvider === "openai") return Boolean(this.openaiApiKey);
    return false;
  },
};

export function assertRuntimeConfig() {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL em falta: a API não pode ligar à base de dados.");
  }
  if (!env.sessionSecret || env.sessionSecret.length < 24) {
    throw new Error("SESSION_SECRET em falta ou demasiado curto (mínimo 24 caracteres).");
  }
}
