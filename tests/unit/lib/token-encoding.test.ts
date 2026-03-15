import { describe, expect, test } from "bun:test";
import { PublicKey, Keypair } from "@solana/web3.js";
import { encodeERC20Transfer, buildSPLTransferInstructions } from "../../../src/lib/token-encoding.ts";
import type { TokenConfig } from "../../../src/config/tokens.ts";

describe("encodeERC20Transfer", () => {
  const USDC_BASE: TokenConfig = {
    symbol: "USDC",
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    decimals: 6,
  };

  const RECIPIENT = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as `0x${string}`;

  test("returns contract address as 'to'", () => {
    const result = encodeERC20Transfer(RECIPIENT, 1000000n, USDC_BASE);
    expect(result.to).toBe(USDC_BASE.address);
  });

  test("sets value to '0' (no ETH sent with ERC-20)", () => {
    const result = encodeERC20Transfer(RECIPIENT, 1000000n, USDC_BASE);
    expect(result.value).toBe("0");
  });

  test("data starts with transfer function selector 0xa9059cbb", () => {
    const result = encodeERC20Transfer(RECIPIENT, 1000000n, USDC_BASE);
    expect(result.data.startsWith("0xa9059cbb")).toBe(true);
  });

  test("data encodes recipient address", () => {
    const result = encodeERC20Transfer(RECIPIENT, 1000000n, USDC_BASE);
    // address is zero-padded to 32 bytes after the 4-byte selector
    const recipientHex = RECIPIENT.slice(2).toLowerCase();
    expect(result.data.toLowerCase()).toContain(recipientHex);
  });

  test("data encodes amount correctly for 1 USDC (1000000)", () => {
    const result = encodeERC20Transfer(RECIPIENT, 1000000n, USDC_BASE);
    // 1000000 = 0xF4240, padded to 32 bytes
    const amountHex = (1000000n).toString(16).padStart(64, "0");
    expect(result.data.toLowerCase()).toContain(amountHex);
  });

  test("data encodes large amounts correctly", () => {
    const largeAmount = 1000000000000n; // 1M USDC
    const result = encodeERC20Transfer(RECIPIENT, largeAmount, USDC_BASE);
    const amountHex = largeAmount.toString(16).padStart(64, "0");
    expect(result.data.toLowerCase()).toContain(amountHex);
  });

  test("data has correct total length (4 selector + 32 recipient + 32 amount = 68 bytes = 136 hex + 0x)", () => {
    const result = encodeERC20Transfer(RECIPIENT, 1000000n, USDC_BASE);
    // 0x prefix + 4 bytes selector + 32 bytes address + 32 bytes amount = 2 + 8 + 64 + 64 = 138
    expect(result.data).toHaveLength(138);
  });

  test("works with different token configs", () => {
    const USDT: TokenConfig = {
      symbol: "USDT",
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      decimals: 6,
    };
    const result = encodeERC20Transfer(RECIPIENT, 500000n, USDT);
    expect(result.to).toBe(USDT.address);
    expect(result.value).toBe("0");
    expect(result.data.startsWith("0xa9059cbb")).toBe(true);
  });
});

describe("buildSPLTransferInstructions", () => {
  // Use deterministic keypairs (on-curve) for testing
  const senderKp = Keypair.fromSeed(new Uint8Array(32).fill(1));
  const recipientKp = Keypair.fromSeed(new Uint8Array(32).fill(2));
  const SENDER = senderKp.publicKey;
  const RECIPIENT = recipientKp.publicKey;
  const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

  test("returns exactly 1 instruction without ATA creation", async () => {
    const instructions = await buildSPLTransferInstructions(
      SENDER,
      RECIPIENT,
      USDC_MINT,
      1000000n,
      false
    );
    expect(instructions).toHaveLength(1);
  });

  test("returns 2 instructions with ATA creation", async () => {
    const instructions = await buildSPLTransferInstructions(
      SENDER,
      RECIPIENT,
      USDC_MINT,
      1000000n,
      true
    );
    expect(instructions).toHaveLength(2);
  });

  test("transfer instruction references correct program", async () => {
    const instructions = await buildSPLTransferInstructions(
      SENDER,
      RECIPIENT,
      USDC_MINT,
      1000000n,
      false
    );
    const transferIx = instructions[0];
    // SPL Token transfer goes through TOKEN_PROGRAM_ID
    expect(transferIx.programId.toBase58()).toBe(
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    );
  });

  test("ATA creation instruction uses associated token program", async () => {
    const instructions = await buildSPLTransferInstructions(
      SENDER,
      RECIPIENT,
      USDC_MINT,
      1000000n,
      true
    );
    const ataIx = instructions[0];
    expect(ataIx.programId.toBase58()).toBe(
      "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
    );
  });

  test("instructions are deterministic for same inputs", async () => {
    const a = await buildSPLTransferInstructions(SENDER, RECIPIENT, USDC_MINT, 1000000n, false);
    const b = await buildSPLTransferInstructions(SENDER, RECIPIENT, USDC_MINT, 1000000n, false);
    expect(a[0].data).toEqual(b[0].data);
    expect(a[0].keys.map((k) => k.pubkey.toBase58())).toEqual(
      b[0].keys.map((k) => k.pubkey.toBase58())
    );
  });
});
