import { describe, expect, test } from "bun:test";
import { generateMnemonic, deriveEVMWallet, deriveSolanaWallet } from "../../../src/lib/key-derivation.ts";

const TEST_MNEMONIC = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

describe("key-derivation", () => {
  test("generateMnemonic returns 12 words", () => {
    const mnemonic = generateMnemonic();
    const words = mnemonic.split(" ");
    expect(words.length).toBe(12);
  });

  test("deriveEVMWallet produces deterministic address", () => {
    const wallet0 = deriveEVMWallet(TEST_MNEMONIC, 0);
    const wallet0Again = deriveEVMWallet(TEST_MNEMONIC, 0);
    expect(wallet0.address).toBe(wallet0Again.address);
    expect(wallet0.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  test("deriveEVMWallet different indices produce different addresses", () => {
    const wallet0 = deriveEVMWallet(TEST_MNEMONIC, 0);
    const wallet1 = deriveEVMWallet(TEST_MNEMONIC, 1);
    expect(wallet0.address).not.toBe(wallet1.address);
  });

  test("deriveSolanaWallet produces deterministic address", () => {
    const wallet0 = deriveSolanaWallet(TEST_MNEMONIC, 0);
    const wallet0Again = deriveSolanaWallet(TEST_MNEMONIC, 0);
    expect(wallet0.address).toBe(wallet0Again.address);
    expect(wallet0.address.length).toBeGreaterThan(30);
  });

  test("deriveSolanaWallet different indices produce different addresses", () => {
    const wallet0 = deriveSolanaWallet(TEST_MNEMONIC, 0);
    const wallet1 = deriveSolanaWallet(TEST_MNEMONIC, 1);
    expect(wallet0.address).not.toBe(wallet1.address);
  });
});
