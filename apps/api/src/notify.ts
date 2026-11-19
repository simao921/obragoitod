import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env.js";

type EmailInput = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: { filename: string; content: string }[];
};

/** Fornecedor em uso: caixa de correio SMTP normal, Resend, ou nenhum. */
export function mailProvider(): "smtp" | "resend" | "none" {
  if (env.smtpUrl || env.smtpHost) return "smtp";
  if (env.resendApiKey) return "resend";
  return "none";
}

let smtp: Transporter | null = null;

function smtpTransport(): Transporter {
  if (!smtp) {
    smtp = nodemailer.createTransport(
      env.smtpUrl
        ? env.smtpUrl
        : {
            host: env.smtpHost,
            port: env.smtpPort,
            secure: env.smtpSecure || env.smtpPort === 465,
            auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
          },
    );
  }
  return smtp;
}

/**
 * Envio de email. Usa o SMTP de uma caixa de correio normal quando configurado
 * (SMTP_HOST/SMTP_USER/SMTP_PASS ou SMTP_URL); senão RESEND_API_KEY. Sem nenhum
 * dos dois devolve false — o pedido continua registado na base de dados e
 * visível no portal de gestão.
 */
export async function sendEmail({ to, subject, html, replyTo, attachments }: EmailInput): Promise<boolean> {
  const provider = mailProvider();
  if (provider === "none") return false;

  if (provider === "smtp") {
    try {
      await smtpTransport().sendMail({
        from: `Obragoito <${env.emailFrom}>`,
        to,
        subject,
        html,
        ...(replyTo ? { replyTo } : {}),
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
      });
      return true;
    } catch (error) {
      console.error("[email] falha SMTP:", error instanceof Error ? error.message : error);
      return false;
    }
  }

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
