import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, parseUserImport } from "../../src/import.js";

test("CSV com aspas e vírgulas é lido corretamente", () => {
  const rows = parseCsv('nome,email\n"Silva, Ana",ana@exemplo.pt\n');
  assert.deepEqual(rows, [
    ["nome", "email"],
    ["Silva, Ana", "ana@exemplo.pt"],
  ]);
});

test("CSV com ponto e vírgula é detetado", () => {
  const rows = parseCsv("nome;email\nAna;ana@exemplo.pt");
  assert.deepEqual(rows[1], ["Ana", "ana@exemplo.pt"]);
});

test("importação mapeia cabeçalhos em português e valida linhas", () => {
  const csv = [
    "Nome;Email;Função;Telefone",
    "Ana Silva;ana@exemplo.pt;cliente;912345678",
    "Rui Costa;rui@exemplo.pt;trabalhador;",
    ";sem-nome@exemplo.pt;cliente;",
    "Repetido;ana@exemplo.pt;cliente;",
    "Funcao Errada;errada@exemplo.pt;fornecedor;",
    "Email Errado;nao-e-email;cliente;",
  ].join("\n");

  const result = parseUserImport(Buffer.from(csv, "utf8"), "pessoas.csv");
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].role, "client");
  assert.equal(result.rows[1].role, "worker");
  assert.equal(result.errors.length, 4);
});

test("ficheiro sem linhas de dados é rejeitado", () => {
  const result = parseUserImport(Buffer.from("nome,email\n", "utf8"), "vazio.csv");
  assert.equal(result.rows.length, 0);
  assert.equal(result.errors.length, 1);
});
