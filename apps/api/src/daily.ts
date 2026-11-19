import { many, one, query } from "./db.js";
import { env } from "./env.js";
import { sendEmail } from "./notify.js";
import { buildPdf, type PdfBlock } from "./pdf.js";
import { geminiApiKey } from "./settings.js";

/**
 * Relatório diário de obra.
 *
 * Os trabalhadores registam o dia (texto ou áudio transcrito) no portal da equipa.
 * Às 00:00 (hora de Lisboa) a API fecha o dia: gera um PDF por obra, com quem
 * registou e quem faltou, pede um resumo ao Gemini quando existe chave e envia
 * o PDF aos clientes dessa obra por email.
 */

export function lisbonDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function lisbonHour(date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Lisbon",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(date),
  );
}

export function previousDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

export function humanDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

type ProjectRow = { id: string; name: string };
type PersonRow = { full_name: string; email: string };
type EntryRow = { full_name: string; transcript: string };

type ProjectDay = {
  project: ProjectRow;
  clients: PersonRow[];
  submitted: { fullName: string; transcript: string }[];
  missing: string[];
};

export type ProjectDayReport = {
  projectId: string;
  projectName: string;
  submitted: string[];
  missing: string[];
  recipients: string[];
  emailsSent: number;
  summaryId: string;
};

export type CloseDayResult = {
  date: string;
  projects: ProjectDayReport[];
  emailConfigured: boolean;
  aiUsed: boolean;
};

async function collectDay(date: string): Promise<ProjectDay[]> {
  const projects = await many<ProjectRow>(
    "select id, name from public.projects where status = 'active' order by sort_order asc, name asc",
  );

  const days: ProjectDay[] = [];

  for (const project of projects) {
    const clients = await many<PersonRow>(
      `select pr.full_name, pr.email
         from public.project_assignments a
         join public.profiles pr on pr.id = a.user_id
        where a.project_id = $1 and pr.role = 'client' and pr.status = 'active'
        order by pr.full_name`,
      [project.id],
    );

    const workers = await many<PersonRow>(
      `select pr.full_name, pr.email
         from public.project_assignments a
         join public.profiles pr on pr.id = a.user_id
        where a.project_id = $1 and pr.role = 'worker' and pr.status = 'active'
        order by pr.full_name`,
      [project.id],
    );

    if (clients.length === 0 && workers.length === 0) continue;

    const entries = await many<EntryRow>(
      `select pr.full_name, r.transcript
         from public.daily_reports r
         join public.profiles pr on pr.id = r.worker_id
        where r.project_id = $1 and r.report_date = $2
        order by pr.full_name`,
      [project.id, date],
    );

    const submittedNames = new Set(entries.map((entry) => entry.full_name));

    days.push({
      project,
      clients,
      submitted: entries.map((entry) => ({ fullName: entry.full_name, transcript: entry.transcript })),
      missing: workers.filter((worker) => !submittedNames.has(worker.full_name)).map((worker) => worker.full_name),
    });
  }

  return days;
}

async function aiSummary(
  date: string,
  projectName: string,
  submitted: { fullName: string; transcript: string }[],
  missing: string[],
): Promise<string | null> {
  const key = await geminiApiKey();
  if (!key) return null;

  const prompt = [
    "És o assistente da Obragoito, empresa portuguesa de construção, remodelação e obras públicas.",
    `Escreve um resumo profissional em português europeu, com 3 a 5 frases, do dia ${humanDate(date)} na obra "${projectName}".`,
    "Usa apenas os registos abaixo. Não inventes factos, medições, nomes nem conclusões.",
    submitted.length > 0
      ? `Registos da equipa:\n${submitted.map((entry) => `- ${entry.fullName}: ${entry.transcript}`).join("\n")}`
      : "Nenhum trabalhador registou o dia.",
    missing.length > 0 ? `Sem registo: ${missing.join(", ")}.` : "Toda a equipa registou o dia.",
    submitted.length > 0
      ? "Menciona o que foi feito e o estado geral."
      : "Diz claramente que não houve registos.",
  ].join("\n\n");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        env.geminiModel,
      )}:generateContent?key=${encodeURIComponent(await geminiApiKey())}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );

    if (!response.ok) {
      console.error("[relatorios] o Gemini recusou o resumo:", response.status);
      return null;
    }

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join(" ")
      .trim();

    return text && text.length > 0 ? text : null;
  } catch (error) {
    console.error("[daily] falha ao contactar o Gemini:", error instanceof Error ? error.message : error);
    return null;
  }
}

function fallbackSummary(date: string, submitted: { fullName: string }[], missing: string[]): string {
  if (submitted.length === 0) {
    return `No dia ${humanDate(date)} não foi registado trabalho nesta obra.`;
  }
  const names = submitted.map((entry) => entry.fullName).join(", ");
  const tail = missing.length > 0 ? ` Sem registo: ${missing.join(", ")}.` : " Toda a equipa registou o dia.";
  return `No dia ${humanDate(date)} registaram trabalho ${names}.${tail}`;
}

function buildProjectPdf(input: {
  date: string;
  projectName: string;
  summary: string;
  submitted: { fullName: string; transcript: string }[];
  missing: string[];
}): Buffer {
  const blocks: PdfBlock[] = [
    { kind: "paragraph", text: `Obra: ${input.projectName}` },
    { kind: "paragraph", text: `Data: ${humanDate(input.date)}` },
    { kind: "rule" },
    { kind: "heading", text: "Resumo do dia" },
    { kind: "paragraph", text: input.summary },
    { kind: "heading", text: `Registos recebidos (${input.submitted.length})` },
  ];

  if (input.submitted.length === 0) {
    blocks.push({ kind: "paragraph", text: "Sem registos da equipa neste dia." });
  } else {
    for (const entry of input.submitted) {
      blocks.push({ kind: "paragraph", text: `${entry.fullName}:` });
      blocks.push({ kind: "paragraph", text: entry.transcript });
    }
  }

  blocks.push({ kind: "heading", text: `Sem registo (${input.missing.length})` });
  blocks.push({
    kind: "paragraph",
    text: input.missing.length > 0 ? input.missing.join(", ") : "Nenhum trabalhador em falta.",
  });

  return buildPdf({ title: "Relatório diário de obra", blocks });
}

function reportEmailHtml(clientName: string, projectName: string, date: string, summary: string): string {
  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#1a1a1b;line-height:1.6">
      <p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#8f4531">Obragoito</p>
      <h2 style="font-family:Georgia,serif;font-weight:400;margin:8px 0 16px">Relatório de ${humanDate(date)}</h2>
      <p>Estimado(a) ${clientName},</p>
      <p>Segue em anexo o relatório diário da obra <strong>${projectName}</strong>.</p>
      <p style="white-space:pre-line;border-top:1px solid #e2e2df;padding-top:16px">${summary}</p>
    </div>`;
}

export async function closeDay(date: string, actorId: string | null): Promise<CloseDayResult> {
  const days = await collectDay(date);
  const reports: ProjectDayReport[] = [];
  let aiUsed = false;

  for (const day of days) {
    const summary =
      (await aiSummary(date, day.project.name, day.submitted, day.missing)) ??
      fallbackSummary(date, day.submitted, day.missing);
    if (await geminiApiKey()) aiUsed = true;

    const pdf = buildProjectPdf({
      date,
      projectName: day.project.name,
      summary,
      submitted: day.submitted,
      missing: day.missing,
    });

    let emailsSent = 0;
    if (env.resendApiKey) {
      for (const client of day.clients) {
        const ok = await sendEmail({
          to: client.email,
          subject: `Relatório diário — ${day.project.name} · ${humanDate(date)}`,
          html: reportEmailHtml(client.full_name, day.project.name, date, summary),
          attachments: [{ filename: `relatorio-${date}.pdf`, content: pdf.toString("base64") }],
        });
        if (ok) emailsSent += 1;
      }
    }

    const summaryRow = await one<{ id: string }>(
      `insert into public.daily_summaries (report_date, project_id, summary, pdf, recipients, emails_sent, created_by)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (report_date, project_id) do update
         set summary = excluded.summary, pdf = excluded.pdf, recipients = excluded.recipients,
             emails_sent = excluded.emails_sent, created_by = excluded.created_by, created_at = now()
       returning id`,
      [date, day.project.id, summary, pdf, day.clients.map((client) => client.email), emailsSent, actorId],
    );

    reports.push({
      projectId: day.project.id,
      projectName: day.project.name,
      submitted: day.submitted.map((entry) => entry.fullName),
      missing: day.missing,
      recipients: day.clients.map((client) => client.email),
      emailsSent,
      summaryId: summaryRow?.id ?? "",
    });
  }

  await query("update public.daily_reports set status = 'closed', closed_at = now() where report_date = $1", [date]);

  return { date, projects: reports, emailConfigured: Boolean(env.resendApiKey), aiUsed };
}

/** Fecha o dia anterior quando a API já passou da meia-noite em Lisboa. */
export async function runNightlyClose(): Promise<CloseDayResult | null> {
  const today = lisbonDate();
  const marker = await one<{ value: { date?: string } }>(
    "select value from public.app_settings where key = 'daily_last_close'",
  );
  if (marker?.value?.date === today) return null;
  if (lisbonHour() < 0) return null;

  const target = previousDay(today);
  const result = await closeDay(target, null);

  await query(
    `insert into public.app_settings (key, value, updated_by, updated_at)
     values ('daily_last_close', $1::jsonb, null, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [JSON.stringify({ date: today })],
  );

  return result;
}
