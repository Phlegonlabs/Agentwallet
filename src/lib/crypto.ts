import sodium from "libsodium-wrappers-sumo";
import type { Result } from "../types/index.ts";
import { ok, err } from "../types/index.ts";

let initialized = false;

async function ensureInit(): Promise<void> {
  if (!initialized) {
    await sodium.ready;
    initialized = true;
  }
}

/** Generate a random salt for Argon2id */
export async function generateSalt(): Promise<Uint8Array> {
  await ensureInit();
  return sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
}

// Argon2id constants (libsodium values, hardcoded for Bun compatibility)
const ARGON2_OPSLIMIT = 3; // MODERATE
const ARGON2_MEMLIMIT = 268435456; // 256MB — MODERATE
const ARGON2_ALG = 2; // crypto_pwhash_ALG_ARGON2ID13

/** Derive an encryption key from a master password using Argon2id */
export async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<Uint8Array> {
  await ensureInit();
  return sodium.crypto_pwhash(
    sodium.crypto_secretbox_KEYBYTES,
    password,
    salt,
    ARGON2_OPSLIMIT,
    ARGON2_MEMLIMIT,
    ARGON2_ALG
  );
}

/** Encrypt plaintext using XSalsa20-Poly1305 */
export async function encrypt(
  plaintext: Uint8Array,
  key: Uint8Array
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> {
  await ensureInit();
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = sodium.crypto_secretbox_easy(plaintext, nonce, key);
  return { ciphertext, nonce };
}

/** Decrypt ciphertext using XSalsa20-Poly1305 */
export async function decrypt(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  key: Uint8Array
): Promise<Result<Uint8Array>> {
  await ensureInit();
  try {
    const plaintext = sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
    return ok(plaintext);
  } catch {
    return err(new Error("Decryption failed — wrong password or corrupted data"));
  }
}

/** Encode bytes to base64 */
export async function toBase64(data: Uint8Array): Promise<string> {
  await ensureInit();
  return sodium.to_base64(data, sodium.base64_variants.ORIGINAL);
}

/** Decode base64 to bytes */
export async function fromBase64(data: string): Promise<Uint8Array> {
  await ensureInit();
  return sodium.from_base64(data, sodium.base64_variants.ORIGINAL);
}
