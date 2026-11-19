import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const N = 16_384;
const R = 8;
const P = 1;

/** Hash scrypt com sal aleatório. Formato: scrypt$N$r$p$sal$hash */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64"), derived.toString("base64")].join("$");
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  try {
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const derived = scryptSync(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%";

/** Palavra-passe temporária gerada no servidor e mostrada uma única vez ao administrador. */
export function generateTemporaryPassword(length = 16): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let index = 0; index < length; index += 1) {
    out += ALPHABET[bytes[index] % ALPHABET.length];
  }
  return `${out}9a`;
}
