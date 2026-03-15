import { describe, expect, test } from "bun:test";
import {
  TOKEN_REGISTRY,
  resolveToken,
  isNativeToken,
} from "../../../src/config/tokens.ts";

describe("TOKEN_REGISTRY", () => {
  const EXPECTED_CHAINS = [
    "ethereum",
    "base",
    "polygon",
    "optimism",
    "arbitrum",
    "avalanche",
    "xlayer",
    "solana",
  ];

  test("contains all 8 x402-supported chains", () => {
    for (const chain of EXPECTED_CHAINS) {
      expect(TOKEN_REGISTRY[chain]).toBeDefined();
    }
    expect(Object.keys(TOKEN_REGISTRY)).toHaveLength(EXPECTED_CHAINS.length);
  });

  test("every chain has USDC and USDT entries", () => {
    for (const chain of EXPECTED_CHAINS) {
      expect(TOKEN_REGISTRY[chain].USDC).toBeDefined();
      expect(TOKEN_REGISTRY[chain].USDT).toBeDefined();
      expect(TOKEN_REGISTRY[chain].USDC.symbol).toBe("USDC");
      expect(TOKEN_REGISTRY[chain].USDT.symbol).toBe("USDT");
    }
  });

  test("all tokens have 6 decimals", () => {
    for (const chain of EXPECTED_CHAINS) {
      for (const token of Object.values(TOKEN_REGISTRY[chain])) {
        expect(token.decimals).toBe(6);
      }
    }
  });

  test("EVM chains have 0x-prefixed addresses", () => {
    const evmChains = EXPECTED_CHAINS.filter((c) => c !== "solana");
    for (const chain of evmChains) {
      for (const token of Object.values(TOKEN_REGISTRY[chain])) {
        expect(token.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
      }
    }
  });

  test("Solana tokens have base58 addresses", () => {
    for (const token of Object.values(TOKEN_REGISTRY.solana)) {
      expect(token.address).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    }
  });

  test("known contract addresses are correct", () => {
    expect(TOKEN_REGISTRY.ethereum.USDC.address).toBe(
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    );
    expect(TOKEN_REGISTRY.base.USDC.address).toBe(
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    );
    expect(TOKEN_REGISTRY.solana.USDC.address).toBe(
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    );
  });
});

describe("resolveToken", () => {
  test("resolves USDC on base", () => {
    const token = resolveToken("base", "USDC");
    expect(token).toBeDefined();
    expect(token!.symbol).toBe("USDC");
    expect(token!.address).toBe("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
  });

  test("resolves case-insensitively for token symbol", () => {
    const lower = resolveToken("ethereum", "usdc");
    const upper = resolveToken("ethereum", "USDC");
    expect(lower).toEqual(upper);
  });

  test("resolves case-insensitively for network", () => {
    const lower = resolveToken("polygon", "USDT");
    const mixed = resolveToken("Polygon", "USDT");
    expect(lower).toEqual(mixed);
  });

  test("returns undefined for unknown network", () => {
    expect(resolveToken("bsc", "USDC")).toBeUndefined();
  });

  test("returns undefined for unknown token on valid network", () => {
    expect(resolveToken("base", "DAI")).toBeUndefined();
  });

  test("returns undefined for empty inputs", () => {
    expect(resolveToken("", "")).toBeUndefined();
  });
});

describe("isNativeToken", () => {
  test("'native' is native", () => {
    expect(isNativeToken("native")).toBe(true);
  });

  test("empty string is native", () => {
    expect(isNativeToken("")).toBe(true);
  });

  test("'USDC' is not native", () => {
    expect(isNativeToken("USDC")).toBe(false);
  });

  test("'USDT' is not native", () => {
    expect(isNativeToken("USDT")).toBe(false);
  });

  test("random string is not native", () => {
    expect(isNativeToken("0xabc123")).toBe(false);
  });
});
