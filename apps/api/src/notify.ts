import { env } from "./env.js";

type EmailInput = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: { filename: string; content: string }[];
};

/**
 * Envio de email opcional. Sem RESEND_API_KEY configurada, devolve false —
 * o pedido continua registado na base de dados e visível no portal de gestão.
 */
export async function sendEmail({ to, subject, html, replyTo, attachments }: EmailInput): Promise<boolean> {
  if (!env.resendApiKey) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Obragoito <${env.emailFrom}>`,
        to: [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
      }),
    });
    if (!response.ok) {
      console.error("[email] envio recusado pelo fornecedor:", response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] falha de rede:", error instanceof Error ? error.message : error);
    return false;
  }
}

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

/** Código de acesso de uso único para a gestão e o portal dev. */
export function loginCodeHtml(input: { name: string; code: string; minutes: number; portal: string }): string {
  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#1a1a1b;line-height:1.6">
      <p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#8f4531">Código de acesso · ${escape(input.portal)}</p>
      <h2 style="font-family:Georgia,serif;font-weight:400;margin:8px 0 16px">Olá, ${escape(input.name)}</h2>
      <p>Use este código para concluir o início de sessão. É válido durante ${input.minutes} minutos e só pode ser usado uma vez.</p>
      <p style="font-size:34px;letter-spacing:.32em;font-weight:600;margin:24px 0;padding:18px 0;text-align:center;border-top:1px solid #e2e2df;border-bottom:1px solid #e2e2df">${escape(input.code)}</p>
      <p style="color:#6b6b68;font-size:14px">Se não foi você a tentar entrar, ignore este email e altere a palavra-passe da conta.</p>
    </div>
  `;
}

export function quoteNotificationHtml(input: {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
}): string {
  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#1a1a1b;line-height:1.6">
      <p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#8f4531">Novo pedido de orçamento</p>
      <h2 style="font-family:Georgia,serif;font-weight:400;margin:8px 0 16px">${escape(input.name)}</h2>
      <p><strong>Email:</strong> ${escape(input.email)}<br/>
      <strong>Telefone:</strong> ${escape(input.phone || "não indicado")}<br/>
      <strong>Serviço:</strong> ${escape(input.service || "não indicado")}</p>
      <p style="white-space:pre-line;border-top:1px solid #e2e2df;padding-top:16px">${escape(input.message)}</p>
    </div>
  `;
}
