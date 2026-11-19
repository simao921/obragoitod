/**
 * Gerador de PDF mínimo, sem dependências externas.
 * Usado nos relatórios diários de obra enviados aos clientes.
 * Codificação WinAnsi (Latin-1) para acentos do português.
 */

export type PdfBlock =
  | { kind: "title"; text: string }
  | { kind: "subtitle"; text: string }
  | { kind: "meta"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "rule" };

export type PdfDocument = {
  title: string;
  subtitle?: string;
  footer?: string;
  blocks: PdfBlock[];
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;

function toLatin1(text: string): string {
  return Array.from(text)
    .map((char) => {
      const code = char.codePointAt(0) ?? 0;
      if (char === "\n") return " ";
      return code <= 255 ? char : "?";
    })
    .join("");
}

function escapeText(text: string): string {
  return toLatin1(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
    } else if (`${current} ${word}`.length <= maxChars) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

export function buildPdf(doc: PdfDocument): Buffer {
  const pages: string[][] = [];
  let ops: string[] = [];
  let y = PAGE_H - MARGIN;

  const flushPage = () => {
    if (ops.length > 0) {
      pages.push(ops);
      ops = [];
    }
  };

  const newPage = () => {
    flushPage();
    y = PAGE_H - MARGIN;
  };

  const ensure = (height: number) => {
    if (y - height < MARGIN + 48) newPage();
  };

  const write = (
    value: string,
    options: { size: number; bold?: boolean; color?: string; leading?: number; maxChars?: number; indent?: number },
  ) => {
    const { size } = options;
    const leading = options.leading ?? Math.round(size * 1.55);
    const indent = options.indent ?? 0;
    const width = PAGE_W - 2 * MARGIN - indent;
    const maxChars = options.maxChars ?? Math.max(14, Math.floor(width / (size * 0.5)));
    const font = options.bold ? "/F2" : "/F1";

    for (const line of wrap(value, maxChars)) {
      ensure(leading);
      y -= leading;
      ops.push(
        `BT ${font} ${size} Tf ${options.color ?? "0.10 0.10 0.11"} rg 1 0 0 1 ${(MARGIN + indent).toFixed(2)} ${y.toFixed(
          2,
        )} Tm (${escapeText(line)}) Tj ET`,
      );
    }
  };

  const lineRule = () => {
    ensure(18);
    y -= 10;
    ops.push(`0.85 0.85 0.84 RG 0.7 w ${MARGIN} ${y.toFixed(2)} m ${(PAGE_W - MARGIN).toFixed(2)} ${y.toFixed(2)} l S`);
    y -= 8;
  };

  write(doc.title, { size: 20, bold: true, color: "0.10 0.10 0.11" });
  lineRule();

  for (const block of doc.blocks) {
    switch (block.kind) {
      case "title":
        write(block.text, { size: 16, bold: true });
        break;
      case "heading":
        ensure(30);
        y -= 8;
        write(block.text.toUpperCase(), { size: 9, bold: true, color: "0.56 0.27 0.19" });
        break;
      case "paragraph":
        write(block.text, { size: 10.5 });
        break;
      case "bullet":
        write(`•  ${block.text}`, { size: 10, indent: 8 });
        break;
      case "rule":
        lineRule();
        break;
      default:
        break;
    }
  }

  flushPage();

  const pageOps = pages.length > 0 ? pages : [[""]];

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(
    `<< /Type /Pages /Kids [${pageOps.map((_, index) => `${5 + index * 2} 0 R`).join(" ")}] /Count ${pageOps.length} >>`,
  );
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  pageOps.forEach((pageContent, index) => {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(
        2,
      )}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + index * 2} 0 R >>`,
    );
    const stream = pageContent.join("\n");
    objects.push(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}
