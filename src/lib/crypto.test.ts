import { describe, expect, test } from "bun:test";
import { generateSalt, deriveKey, encrypt, decrypt, toBase64, fromBase64 } from "./crypto.ts";

describe("generateSalt", () => {
  test("returns a Uint8Array", async () => {
    const salt = await generateSalt();
    expect(salt).toBeInstanceOf(Uint8Array);
    expect(salt.length).toBeGreaterThan(0);
  });

  test("generates unique salts", async () => {
    const salt1 = await generateSalt();
    const salt2 = await generateSalt();
    expect(Buffer.from(salt1).toString("hex")).not.toBe(Buffer.from(salt2).toString("hex"));
  });
});

describe("deriveKey", () => {
  test("derives a key from password and salt", async () => {
    const salt = await generateSalt();
    const key = await deriveKey("testpassword", salt);
    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.length).toBe(32); // crypto_secretbox_KEYBYTES
  });

  test("same password+salt produces same key", async () => {
    const salt = await generateSalt();
    const key1 = await deriveKey("password123", salt);
    const key2 = await deriveKey("password123", salt);
    expect(Buffer.from(key1).toString("hex")).toBe(Buffer.from(key2).toString("hex"));
  });

  test("different passwords produce different keys", async () => {
    const salt = await generateSalt();
    const key1 = await deriveKey("password1", salt);
    const key2 = await deriveKey("password2", salt);
    expect(Buffer.from(key1).toString("hex")).not.toBe(Buffer.from(key2).toString("hex"));
  });

  test("different salts produce different keys", async () => {
    const salt1 = await generateSalt();
    const salt2 = await generateSalt();
    const key1 = await deriveKey("samepassword", salt1);
    const key2 = await deriveKey("samepassword", salt2);
    expect(Buffer.from(key1).toString("hex")).not.toBe(Buffer.from(key2).toString("hex"));
  });
});

describe("encrypt + decrypt roundtrip", () => {
  test("encrypts and decrypts plaintext", async () => {
    const salt = await generateSalt();
    const key = await deriveKey("testpassword", salt);
    const plaintext = new TextEncoder().encode("secret message");

    const { ciphertext, nonce } = await encrypt(plaintext, key);
    expect(ciphertext.length).toBeGreaterThan(plaintext.length);

    const result = await decrypt(ciphertext, nonce, key);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(new TextDecoder().decode(result.value)).toBe("secret message");
    }
  });

  test("decrypt fails with wrong key", async () => {
    const salt = await generateSalt();
    const correctKey = await deriveKey("correctpassword", salt);
    const wrongKey = await deriveKey("wrongpassword", salt);

    const plaintext = new TextEncoder().encode("secret");
    const { ciphertext, nonce } = await encrypt(plaintext, correctKey);

    const result = await decrypt(ciphertext, nonce, wrongKey);
    expect(result.ok).toBe(false);
  });

  test("handles empty plaintext", async () => {
    const salt = await generateSalt();
    const key = await deriveKey("password", salt);
    const plaintext = new Uint8Array([]);

    const { ciphertext, nonce } = await encrypt(plaintext, key);
    const result = await decrypt(ciphertext, nonce, key);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(0);
    }
  });
});

describe("base64 roundtrip", () => {
  test("encodes and decodes", async () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const encoded = await toBase64(data);
    expect(typeof encoded).toBe("string");
    const decoded = await fromBase64(encoded);
    expect(Buffer.from(decoded).toString("hex")).toBe(Buffer.from(data).toString("hex"));
  });

  test("handles empty data", async () => {
    const data = new Uint8Array([]);
    const encoded = await toBase64(data);
    const decoded = await fromBase64(encoded);
    expect(decoded.length).toBe(0);
  });
});
