// Edge Function opcional: transcrição de mensagens de voz curtas.
// Alternativa a POST /api/worker/transcribe. Nunca guarda o áudio.
//
// Deploy:
//   supabase functions deploy transcribe --no-verify-jwt
//   supabase secrets set OPENAI_API_KEY=... TRANSCRIPTION_PROVIDER=openai
//
// Requer as variáveis SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e OPENAI_API_KEY.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_BYTES = 8 * 1024 * 1024;

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "unauthorized", message: "Sessão em falta." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const provider = (Deno.env.get("TRANSCRIPTION_PROVIDER") ?? "").toLowerCase();

  if (provider !== "openai" || !openaiKey) {
    return json({ error: "not_configured", message: "Serviço de transcrição não configurado." }, 503);
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return json({ error: "unauthorized", message: "Sessão inválida." }, 401);
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role, status")
    .eq("id", userData.user.id)
    .single();

  if (!profile || profile.status !== "active" || profile.role !== "worker") {
    return json({ error: "forbidden", message: "Apenas trabalhadores podem enviar áudio." }, 403);
  }

  const { data: setting } = await admin.from("app_settings").select("value").eq("key", "voice_enabled").single();
  if (setting?.value?.enabled === false) {
    return json({ error: "voice_disabled", message: "Entrada por voz desativada." }, 403);
  }

  const form = await request.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return json({ error: "missing_audio", message: "Nenhum áudio recebido." }, 400);
  }
  if (audio.size > MAX_BYTES) {
    return json({ error: "too_large", message: "Áudio demasiado longo." }, 413);
  }

  const upstream = new FormData();
  upstream.append("file", audio, "mensagem.webm");
  upstream.append("model", Deno.env.get("TRANSCRIPTION_MODEL") ?? "whisper-1");
  upstream.append("language", "pt");
  upstream.append("prompt", "Relatório de obra em português europeu.");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: upstream,
  });

  if (!response.ok) {
    return json({ error: "provider_error", message: "Não foi possível transcrever." }, 502);
  }

  const body = (await response.json()) as { text?: string };
  const text = (body.text ?? "").trim();
  if (!text) return json({ error: "empty_transcription", message: "Sem fala reconhecida." }, 502);

  await admin.from("audit_log").insert({
    actor_id: userData.user.id,
    actor_email: userData.user.email,
    action: "voice.transcribed",
    entity: "worker_report",
  });

  return json({ text });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
