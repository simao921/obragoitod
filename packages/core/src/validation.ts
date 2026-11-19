import { z } from "zod";
import { SERVICE_CATEGORIES } from "./company";

const categoryValues = Object.keys(SERVICE_CATEGORIES) as [
  keyof typeof SERVICE_CATEGORIES,
  ...(keyof typeof SERVICE_CATEGORIES)[],
];

export const quoteRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Indique o seu nome.")
    .max(120, "O nome é demasiado longo."),
  email: z
    .string()
    .trim()
    .min(1, "Indique o seu email.")
    .email("Indique um email válido.")
    .max(160, "O email é demasiado longo."),
  phone: z
    .string()
    .trim()
    .max(40, "O telefone é demasiado longo.")
    .refine((value) => value === "" || /^[+()\d\s.-]{6,}$/.test(value), "Indique um telefone válido.")
    .optional()
    .default(""),
  service: z.enum(categoryValues).or(z.literal("outro")).optional(),
  message: z
    .string()
    .trim()
    .min(20, "Descreva o pedido com pelo menos 20 caracteres.")
    .max(4000, "A mensagem é demasiado longa."),
  consent: z.literal(true, {
    errorMap: () => ({ message: "É necessário aceitar a política de privacidade." }),
  }),
  /** Campo armadilha: preenchido apenas por bots. */
  company: z.string().max(0).optional().default(""),
});

export type QuoteRequestInput = z.input<typeof quoteRequestSchema>;
export type QuoteRequestPayload = z.output<typeof quoteRequestSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Indique um email válido."),
  password: z.string().min(1, "Indique a palavra-passe."),
});

export const roleSchema = z.enum(["admin", "client", "worker"]);

export const createUserSchema = z.object({
  fullName: z.string().trim().min(2, "Indique o nome.").max(120),
  email: z.string().trim().email("Indique um email válido.").max(160),
  role: roleSchema,
  phone: z.string().trim().max(40).optional().default(""),
  password: z.string().min(10, "A palavra-passe deve ter pelo menos 10 caracteres.").max(200).optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  role: roleSchema.optional(),
  status: z.enum(["active", "disabled"]).optional(),
  phone: z.string().trim().max(40).optional(),
});

export const projectSchema = z.object({
  name: z.string().trim().min(2, "Indique o nome da obra.").max(160),
  slug: z
    .string()
    .trim()
    .max(160)
    .regex(/^[a-z0-9-]*$/, "Use apenas minúsculas, números e hífenes.")
    .optional()
    .default(""),
  category: z.enum(categoryValues),
  summary: z.string().trim().max(300).optional().default(""),
  description: z.string().trim().max(6000).optional().default(""),
  location: z.string().trim().max(160).optional().default(""),
  year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  clientName: z.string().trim().max(160).optional().default(""),
  coverImage: z.string().trim().max(300).optional().default(""),
  coverImageAlt: z.string().trim().max(300).optional().default(""),
  isPublished: z.boolean().optional().default(false),
});

export const projectUpdateSchema = z.object({
  title: z.string().trim().min(2, "Indique um título.").max(160),
  body: z.string().trim().min(2, "Escreva a atualização.").max(6000),
  progress: z.coerce.number().int().min(0).max(100).optional().nullable(),
  visibleToClient: z.boolean().optional().default(true),
});

export const workerReportSchema = z.object({
  projectId: z.string().uuid("Selecione uma obra."),
  body: z.string().trim().min(5, "Descreva o trabalho realizado.").max(4000),
  progress: z.coerce.number().int().min(0).max(100).optional().nullable(),
});

export const messageSchema = z.object({
  body: z.string().trim().min(1, "Escreva uma mensagem.").max(4000),
});

export const threadSchema = z.object({
  subject: z.string().trim().min(2, "Indique o assunto.").max(160),
  projectId: z.string().uuid().optional().nullable(),
  participantIds: z.array(z.string().uuid()).min(1, "Selecione pelo menos um destinatário."),
  body: z.string().trim().min(1, "Escreva a primeira mensagem.").max(4000),
});

/** Clientes e trabalhadores só podem falar com a administração. */
export const memberThreadSchema = z.object({
  subject: z.string().trim().min(2, "Indique o assunto.").max(160),
  projectId: z.string().uuid().optional().nullable(),
  body: z.string().trim().min(1, "Escreva a primeira mensagem.").max(4000),
});

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

/** Converte um nome num slug estável em português. */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
