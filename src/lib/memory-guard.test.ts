import { describe, expect, test } from "bun:test";
import { zeroize, toHex, toBase58 } from "./memory-guard.ts";

describe("toHex", () => {
  test("encodes empty buffer", () => {
    expect(toHex(new Uint8Array([]))).toBe("");
  });

  test("encodes single byte", () => {
    expect(toHex(new Uint8Array([0xff]))).toBe("ff");
    expect(toHex(new Uint8Array([0x00]))).toBe("00");
    expect(toHex(new Uint8Array([0x0a]))).toBe("0a");
  });

  test("encodes multiple bytes", () => {
    expect(toHex(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))).toBe("deadbeef");
  });
});

describe("toBase58", () => {
  test("encodes known values", () => {
    // "Hello" in base58
    const hello = new TextEncoder().encode("Hello");
    const result = toBase58(hello);
    expect(result).toBe("9Ajdvzr");
  });

  test("handles leading zeros", () => {
    const data = new Uint8Array([0, 0, 1]);
    const result = toBase58(data);
    expect(result.startsWith("11")).toBe(true);
  });

  test("encodes single byte", () => {
    const data = new Uint8Array([1]);
    expect(toBase58(data)).toBe("2");
  });
});

describe("zeroize", () => {
  test("zeroes out buffer contents", async () => {
    const buffer = new Uint8Array([1, 2, 3, 4, 5]);
    await zeroize(buffer);
    for (const byte of buffer) {
      expect(byte).toBe(0);
    }
  });

  test("works on empty buffer", async () => {
    const buffer = new Uint8Array([]);
    await zeroize(buffer);
    expect(buffer.length).toBe(0);
  });
});
