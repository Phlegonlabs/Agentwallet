import { describe, expect, test } from "bun:test";
import { generateWallet } from "./chain-service.ts";
import type { SupportedChain } from "../types/index.ts";

const TEST_MNEMONIC = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

describe("generateWallet", () => {
  test("generates EVM wallet", () => {
    const chain: SupportedChain = { name: "Ethereum", id: "ethereum", type: "evm", chainId: 1 };
    const wallet = generateWallet(chain, TEST_MNEMONIC, 0);
    expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(wallet.privateKey).toBeInstanceOf(Uint8Array);
  });

  test("generates Solana wallet", () => {
    const chain: SupportedChain = { name: "Solana", id: "solana", type: "solana" };
    const wallet = generateWallet(chain, TEST_MNEMONIC, 0);
    expect(wallet.address.length).toBeGreaterThan(30);
    expect(wallet.privateKey).toBeInstanceOf(Uint8Array);
  });

  test("generates TON wallet", () => {
    const chain: SupportedChain = { name: "TON", id: "ton", type: "ton" };
    const wallet = generateWallet(chain, TEST_MNEMONIC, 0);
    expect(wallet.address.length).toBeGreaterThan(30);
    expect(wallet.privateKey).toBeInstanceOf(Uint8Array);
  });

  test("throws for unsupported chain type", () => {
    const chain = { name: "Unknown", id: "unknown", type: "unknown" } as unknown as SupportedChain;
    expect(() => generateWallet(chain, TEST_MNEMONIC, 0)).toThrow("Unsupported chain type");
  });
});
