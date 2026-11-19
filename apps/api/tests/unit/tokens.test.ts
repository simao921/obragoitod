import { test } from "node:test";
import assert from "node:assert/strict";

process.env.SESSION_SECRET = "test-session-secret-with-enough-length-2026";

const { signFileToken, verifyFileToken } = await import("../../src/storage.js");

test("token assinado identifica o ficheiro", () => {
  const token = signFileToken("document", "a1b2c3", 60);
  const payload = verifyFileToken(token);
  assert.deepEqual(payload, { kind: "document", id: "a1b2c3" });
});

test("token adulterado é recusado", () => {
  const token = signFileToken("photo", "foto-1", 60);
  const [encoded, signature] = token.split(".");
  const tampered = `${encoded}.${signature.slice(0, -2)}xx`;
  assert.equal(verifyFileToken(tampered), null);
});

test("token de outro tipo de ficheiro não serve", () => {
  const token = signFileToken("photo", "foto-2", 60);
  assert.equal(verifyFileToken(token)?.kind, "photo");
});

test("token expirado é recusado", () => {
  const token = signFileToken("document", "doc-1", -1);
  assert.equal(verifyFileToken(token), null);
});

test("token inválido nunca é aceite", () => {
  assert.equal(verifyFileToken(""), null);
  assert.equal(verifyFileToken("sem-ponto"), null);
  assert.equal(verifyFileToken("abc.def"), null);
});
