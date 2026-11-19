import { test } from "node:test";
import assert from "node:assert/strict";
import { generateTemporaryPassword, hashPassword, verifyPassword } from "../../src/auth/passwords.js";

test("hash não contém a palavra-passe em texto simples", () => {
  const hash = hashPassword("SegredoForte2026!");
  assert.ok(!hash.includes("SegredoForte2026!"));
  assert.match(hash, /^scrypt\$/);
});

test("verificação aceita a palavra-passe correta e recusa as restantes", () => {
  const hash = hashPassword("SegredoForte2026!");
  assert.equal(verifyPassword("SegredoForte2026!", hash), true);
  assert.equal(verifyPassword("segredoforte2026!", hash), false);
  assert.equal(verifyPassword("", hash), false);
});

test("hashes diferentes para a mesma palavra-passe (sal aleatório)", () => {
  const a = hashPassword("igual");
  const b = hashPassword("igual");
  assert.notEqual(a, b);
  assert.equal(verifyPassword("igual", a), true);
  assert.equal(verifyPassword("igual", b), true);
});

test("hash inválido ou em falta nunca autentica", () => {
  assert.equal(verifyPassword("x", null), false);
  assert.equal(verifyPassword("x", "texto-simples"), false);
  assert.equal(verifyPassword("x", "scrypt$1$2$3$4$5"), false);
});

test("palavra-passe temporária tem comprimento e diversidade mínimos", () => {
  const password = generateTemporaryPassword();
  assert.ok(password.length >= 16);
  assert.notEqual(generateTemporaryPassword(), generateTemporaryPassword());
});
