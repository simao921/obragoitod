import { test } from "node:test";
import assert from "node:assert/strict";
import { loginSchema, projectSchema, quoteRequestSchema, slugify, workerReportSchema } from "@obragoito/core";

const validQuote = {
  name: "Ana Silva",
  email: "ana@exemplo.pt",
  phone: "+351 912 345 678",
  service: "urbanismo",
  message: "Pretendo requalificar o espaço exterior de um edifício em Lisboa.",
  consent: true,
  company: "",
};

test("pedido de orçamento válido é aceite", () => {
  const result = quoteRequestSchema.safeParse(validQuote);
  assert.equal(result.success, true);
});

test("pedido sem consentimento é rejeitado", () => {
  const result = quoteRequestSchema.safeParse({ ...validQuote, consent: false });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues[0].message, /privacidade/i);
  }
});

test("mensagem demasiado curta é rejeitada", () => {
  const result = quoteRequestSchema.safeParse({ ...validQuote, message: "curta" });
  assert.equal(result.success, false);
});

test("email inválido é rejeitado", () => {
  const result = quoteRequestSchema.safeParse({ ...validQuote, email: "ana@" });
  assert.equal(result.success, false);
});

test("telefone com letras é rejeitado", () => {
  const result = quoteRequestSchema.safeParse({ ...validQuote, phone: "chamar depois" });
  assert.equal(result.success, false);
});

test("campo armadilha só aceita vazio", () => {
  const result = quoteRequestSchema.safeParse({ ...validQuote, company: "bot" });
  assert.equal(result.success, false);
});

test("login exige email válido e palavra-passe", () => {
  assert.equal(loginSchema.safeParse({ email: "a@b.pt", password: "x" }).success, true);
  assert.equal(loginSchema.safeParse({ email: "a@b", password: "x" }).success, false);
  assert.equal(loginSchema.safeParse({ email: "a@b.pt", password: "" }).success, false);
});

test("obra exige nome e área conhecida", () => {
  const base = { name: "Praça de teste", category: "urbanismo" };
  assert.equal(projectSchema.safeParse(base).success, true);
  assert.equal(projectSchema.safeParse({ ...base, category: "jardinagem" }).success, false);
  assert.equal(projectSchema.safeParse({ ...base, name: "" }).success, false);
});

test("relatório de trabalhador exige obra e descrição", () => {
  const projectId = "3f0d4c1e-8b1a-4f2e-9c3d-1a2b3c4d5e6f";
  assert.equal(workerReportSchema.safeParse({ projectId, body: "Colocação de lancil concluída." }).success, true);
  assert.equal(workerReportSchema.safeParse({ projectId: "x", body: "ok" }).success, false);
  assert.equal(workerReportSchema.safeParse({ projectId, body: "" }).success, false);
});

test("slugify produz slugs estáveis em português", () => {
  assert.equal(slugify("Praça Duque de Saldanha"), "praca-duque-de-saldanha");
  assert.equal(slugify("  Obra  nº 2 "), "obra-n-2");
  assert.equal(slugify("Reabilitação — Edifício"), "reabilitacao-edificio");
});
