import { describe, expect, test } from "bun:test";
import { generateMnemonic, deriveEVMWallet, deriveSolanaWallet, deriveTONWallet } from "./key-derivation.ts";

const TEST_MNEMONIC = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

describe("generateMnemonic", () => {
  test("generates 12-word mnemonic", () => {
    const mnemonic = generateMnemonic();
    const words = mnemonic.split(" ");
    expect(words).toHaveLength(12);
  });

  test("generates unique mnemonics", () => {
    const m1 = generateMnemonic();
    const m2 = generateMnemonic();
    expect(m1).not.toBe(m2);
  });
});

describe("deriveEVMWallet", () => {
  test("derives deterministic EVM wallet from mnemonic", () => {
    const wallet = deriveEVMWallet(TEST_MNEMONIC, 0);
    expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(wallet.privateKey).toBeInstanceOf(Uint8Array);
    expect(wallet.privateKey.length).toBe(32);
    expect(wallet.hdPath).toBe("m/44'/60'/0'/0/0");
  });

  test("same mnemonic + index = same wallet", () => {
    const w1 = deriveEVMWallet(TEST_MNEMONIC, 0);
    const w2 = deriveEVMWallet(TEST_MNEMONIC, 0);
    expect(w1.address).toBe(w2.address);
  });

  test("different indices produce different addresses", () => {
    const w0 = deriveEVMWallet(TEST_MNEMONIC, 0);
    const w1 = deriveEVMWallet(TEST_MNEMONIC, 1);
    expect(w0.address).not.toBe(w1.address);
  });

  test("known derivation for test mnemonic index 0", () => {
    const wallet = deriveEVMWallet(TEST_MNEMONIC, 0);
    // Standard BIP44 derivation for "abandon...about" at m/44'/60'/0'/0/0
    expect(wallet.address.toLowerCase()).toBe("0x9858effd232b4033e47d90003d41ec34ecaeda94");
  });
});

describe("deriveSolanaWallet", () => {
  test("derives deterministic Solana wallet from mnemonic", () => {
    const wallet = deriveSolanaWallet(TEST_MNEMONIC, 0);
    expect(wallet.address.length).toBeGreaterThan(30);
    expect(wallet.privateKey).toBeInstanceOf(Uint8Array);
    expect(wallet.hdPath).toBe("m/44'/501'/0'/0'");
  });

  test("same mnemonic + index = same wallet", () => {
    const w1 = deriveSolanaWallet(TEST_MNEMONIC, 0);
    const w2 = deriveSolanaWallet(TEST_MNEMONIC, 0);
    expect(w1.address).toBe(w2.address);
  });

  test("different indices produce different addresses", () => {
    const w0 = deriveSolanaWallet(TEST_MNEMONIC, 0);
    const w1 = deriveSolanaWallet(TEST_MNEMONIC, 1);
    expect(w0.address).not.toBe(w1.address);
  });
});

describe("deriveTONWallet", () => {
  test("derives deterministic TON wallet from mnemonic", () => {
    const wallet = deriveTONWallet(TEST_MNEMONIC, 0);
    expect(wallet.address.length).toBeGreaterThan(30);
    expect(wallet.privateKey).toBeInstanceOf(Uint8Array);
    expect(wallet.hdPath).toBe("m/44'/607'/0'");
  });

  test("same mnemonic + index = same wallet", () => {
    const w1 = deriveTONWallet(TEST_MNEMONIC, 0);
    const w2 = deriveTONWallet(TEST_MNEMONIC, 0);
    expect(w1.address).toBe(w2.address);
  });

  test("different indices produce different addresses", () => {
    const w0 = deriveTONWallet(TEST_MNEMONIC, 0);
    const w1 = deriveTONWallet(TEST_MNEMONIC, 1);
    expect(w0.address).not.toBe(w1.address);
  });
});
