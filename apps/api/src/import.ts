import * as XLSX from "xlsx";
import type { Role } from "@obragoito/core";

export type ImportRow = {
  line: number;
  fullName: string;
  email: string;
  role: Role;
  phone: string;
};

export type ParsedImport = {
  rows: ImportRow[];
  errors: { line: number; message: string }[];
};

const HEADER_ALIASES: Record<string, "fullName" | "email" | "role" | "phone"> = {
  nome: "fullName",
  name: "fullName",
  "nome completo": "fullName",
  full_name: "fullName",
  "full name": "fullName",
  email: "email",
  "e-mail": "email",
  correio: "email",
  funcao: "role",
  função: "role",
  role: "role",
  perfil: "role",
  cargo: "role",
  telefone: "phone",
  telemovel: "phone",
  telemóvel: "phone",
  phone: "phone",
  contacto: "phone",
};

const ROLE_ALIASES: Record<string, Role> = {
  cliente: "client",
  client: "client",
  trabalhador: "worker",
  worker: "worker",
  equipa: "worker",
  admin: "admin",
  administrador: "admin",
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Parser CSV simples com suporte a aspas e vírgulas/ponto e vírgula. */
export function parseCsv(text: string): string[][] {
  const delimiter = (text.split("\n")[0]?.match(/;/g)?.length ?? 0) > (text.split("\n")[0]?.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

function toMatrix(buffer: Buffer, fileName: string): string[][] {
  if (/\.(xlsx|xls)$/i.test(fileName)) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return [];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, raw: false });
    return rows.map((cells) => cells.map((cell) => String(cell ?? "")));
  }
  return parseCsv(buffer.toString("utf8"));
}

export function parseUserImport(buffer: Buffer, fileName: string): ParsedImport {
  const matrix = toMatrix(buffer, fileName);
  if (matrix.length < 2) {
    return { rows: [], errors: [{ line: 0, message: "O ficheiro não contém linhas de dados." }] };
  }

  const header = matrix[0].map((cell) => HEADER_ALIASES[normalizeHeader(cell)]);
  const rows: ImportRow[] = [];
  const errors: { line: number; message: string }[] = [];
  const seen = new Set<string>();

  matrix.slice(1).forEach((cells, offset) => {
    const line = offset + 2;
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      if (key) record[key] = (cells[index] ?? "").trim();
    });

    const email = (record.email ?? "").toLowerCase();
    const fullName = record.fullName ?? "";
    const role = ROLE_ALIASES[normalizeHeader(record.role ?? "")];

    if (!fullName || !email) {
      errors.push({ line, message: "Nome e email são obrigatórios." });
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      errors.push({ line, message: `Email inválido: ${email}` });
      return;
    }
    if (!role) {
      errors.push({ line, message: `Função inválida na linha ${line}. Use cliente, trabalhador ou admin.` });
      return;
    }
    if (seen.has(email)) {
      errors.push({ line, message: `Email repetido no ficheiro: ${email}` });
      return;
    }
    seen.add(email);
    rows.push({ line, fullName, email, role, phone: record.phone ?? "" });
  });

  return { rows, errors };
}
