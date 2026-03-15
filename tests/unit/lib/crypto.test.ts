import { describe, expect, test } from "bun:test";
import { generateSalt, deriveKey, encrypt, decrypt, toBase64, fromBase64 } from "../../../src/lib/crypto.ts";

describe("crypto", () => {
  test("encrypt/decrypt roundtrip", async () => {
    const salt = await generateSalt();
    const key = await deriveKey("test-password", salt);
    const plaintext = new TextEncoder().encode("hello world secret");
    const { ciphertext, nonce } = await encrypt(plaintext, key);
    const result = await decrypt(ciphertext, nonce, key);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(new TextDecoder().decode(result.value)).toBe("hello world secret");
    }
  });

  test("wrong password rejects", async () => {
    const salt = await generateSalt();
    const key = await deriveKey("correct-password", salt);
    const plaintext = new TextEncoder().encode("secret data");
    const { ciphertext, nonce } = await encrypt(plaintext, key);

    const wrongKey = await deriveKey("wrong-password", salt);
    const result = await decrypt(ciphertext, nonce, wrongKey);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("Decryption failed");
    }
  });

  test("base64 roundtrip", async () => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 255, 0, 128]);
    const encoded = await toBase64(data);
    const decoded = await fromBase64(encoded);
    expect(decoded).toEqual(data);
  });
});
