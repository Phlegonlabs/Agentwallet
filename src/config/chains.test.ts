import { describe, expect, test } from "bun:test";
import { SUPPORTED_CHAINS, findChain, getEVMChains } from "./chains.ts";

describe("SUPPORTED_CHAINS", () => {
  test("contains 12 chains", () => {
    expect(SUPPORTED_CHAINS).toHaveLength(12);
  });

  test("has 10 EVM chains", () => {
    const evmChains = SUPPORTED_CHAINS.filter((c) => c.type === "evm");
    expect(evmChains).toHaveLength(10);
  });

  test("has 1 Solana chain", () => {
    const solana = SUPPORTED_CHAINS.filter((c) => c.type === "solana");
    expect(solana).toHaveLength(1);
  });

  test("has 1 TON chain", () => {
    const ton = SUPPORTED_CHAINS.filter((c) => c.type === "ton");
    expect(ton).toHaveLength(1);
  });

  test("all EVM chains have chainId", () => {
    const evmChains = SUPPORTED_CHAINS.filter((c) => c.type === "evm");
    for (const chain of evmChains) {
      expect(chain.chainId).toBeDefined();
      expect(typeof chain.chainId).toBe("number");
    }
  });

  test("non-EVM chains have no chainId", () => {
    const nonEvm = SUPPORTED_CHAINS.filter((c) => c.type !== "evm");
    for (const chain of nonEvm) {
      expect(chain.chainId).toBeUndefined();
    }
  });

  test("all chains have unique ids", () => {
    const ids = SUPPORTED_CHAINS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("includes expected chains", () => {
    const ids = SUPPORTED_CHAINS.map((c) => c.id);
    expect(ids).toContain("ethereum");
    expect(ids).toContain("polygon");
    expect(ids).toContain("bsc");
    expect(ids).toContain("base");
    expect(ids).toContain("arbitrum");
    expect(ids).toContain("optimism");
    expect(ids).toContain("avalanche");
    expect(ids).toContain("fantom");
    expect(ids).toContain("xlayer");
    expect(ids).toContain("scroll");
    expect(ids).toContain("solana");
    expect(ids).toContain("ton");
  });
});

describe("findChain", () => {
  test("finds chain by id", () => {
    const chain = findChain("ethereum");
    expect(chain).toBeDefined();
    expect(chain!.name).toBe("Ethereum");
    expect(chain!.chainId).toBe(1);
  });

  test("finds chain by name (case insensitive)", () => {
    const chain = findChain("Polygon");
    expect(chain).toBeDefined();
    expect(chain!.id).toBe("polygon");
  });

  test("evm alias returns ethereum", () => {
    const chain = findChain("evm");
    expect(chain).toBeDefined();
    expect(chain!.id).toBe("ethereum");
  });

  test("returns undefined for unknown chain", () => {
    expect(findChain("bitcoin")).toBeUndefined();
    expect(findChain("")).toBeUndefined();
  });

  test("finds TON chain", () => {
    const chain = findChain("ton");
    expect(chain).toBeDefined();
    expect(chain!.type).toBe("ton");
  });

  test("finds XLayer and Scroll", () => {
    expect(findChain("xlayer")).toBeDefined();
    expect(findChain("xlayer")!.chainId).toBe(196);
    expect(findChain("scroll")).toBeDefined();
    expect(findChain("scroll")!.chainId).toBe(534352);
  });
});

describe("getEVMChains", () => {
  test("returns only EVM chains", () => {
    const evmChains = getEVMChains();
    expect(evmChains.length).toBe(10);
    for (const chain of evmChains) {
      expect(chain.type).toBe("evm");
    }
  });

  test("does not include Solana or TON", () => {
    const evmChains = getEVMChains();
    const ids = evmChains.map((c) => c.id);
    expect(ids).not.toContain("solana");
    expect(ids).not.toContain("ton");
  });
});
