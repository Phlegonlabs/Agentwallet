import { describe, expect, test, mock, beforeEach } from "bun:test";
import type { X402PaymentRequired } from "../../../src/services/x402-service.ts";

/**
 * x402-service unit tests.
 *
 * We mock wallet-service.listWallets and signing-service.signTransaction
 * to isolate the x402 logic (token resolution, validation, tx construction).
 */

const mockListWallets = mock(() => [
  {
    id: "w1",
    address: "0xABCDEF0123456789ABCDEF0123456789ABCDEF01",
    chainType: "evm" as const,
    chainId: "base",
    chainName: "Base",
    label: null,
    index: 0,
  },
  {
    id: "w2",
    address: "0x1111111111111111111111111111111111111111",
    chainType: "evm" as const,
    chainId: "ethereum",
    chainName: "Ethereum",
    label: null,
    index: 0,
  },
  {
    id: "w3",
    address: "5ZWj7a1f8tWkjBESHKgrLMXGSjCVKhNeFgQ2WjPitRBo",
    chainType: "solana" as const,
    chainId: "solana",
    chainName: "Solana",
    label: null,
    index: 0,
  },
]);

const mockSignTransaction = mock(async () => ({
  ok: true as const,
  value: {
    signedTransaction: {
      chainType: "evm" as const,
      chainId: "base",
      serialized: "0xsigned_tx_data",
    },
    from: "0xABCDEF0123456789ABCDEF0123456789ABCDEF01",
  },
}));

// Mock modules before importing x402-service
mock.module("../../../src/services/wallet-service.ts", () => ({
  listWallets: mockListWallets,
}));

mock.module("../../../src/services/signing-service.ts", () => ({
  signTransaction: mockSignTransaction,
}));

// Import after mocking
const { signX402Payment } = await import("../../../src/services/x402-service.ts");

const PASSWORD = "test-password";

beforeEach(() => {
  mockListWallets.mockClear();
  mockSignTransaction.mockClear();
});

describe("signX402Payment — validation", () => {
  test("returns error for unknown wallet address", async () => {
    const result = await signX402Payment("0xNONEXISTENT", {
      network: "base",
      token: "native",
      amount: "1000",
      recipient: "0x0000000000000000000000000000000000000001",
    }, PASSWORD);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("Wallet not found");
    }
  });

  test("returns error when wallet chain doesn't match network", async () => {
    const result = await signX402Payment(
      "0xABCDEF0123456789ABCDEF0123456789ABCDEF01",
      {
        network: "polygon",
        token: "native",
        amount: "1000",
        recipient: "0x0000000000000000000000000000000000000001",
      },
      PASSWORD
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("does not match payment network");
    }
  });

  test("returns error for unsupported token on a valid network", async () => {
    const result = await signX402Payment(
      "0xABCDEF0123456789ABCDEF0123456789ABCDEF01",
      {
        network: "base",
        token: "DAI",
        amount: "1000000",
        recipient: "0x0000000000000000000000000000000000000001",
      },
      PASSWORD
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Unsupported token "DAI"');
    }
  });

  test("returns error for unsupported network", async () => {
    // BSC wallet not in mock list, and bsc not in networkToChain
    const result = await signX402Payment(
      "0xABCDEF0123456789ABCDEF0123456789ABCDEF01",
      {
        network: "bsc",
        token: "native",
        amount: "1000",
        recipient: "0x0000000000000000000000000000000000000001",
      },
      PASSWORD
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("does not match payment network");
    }
  });
});

describe("signX402Payment — EVM native", () => {
  test("signs native ETH payment successfully", async () => {
    const result = await signX402Payment(
      "0xABCDEF0123456789ABCDEF0123456789ABCDEF01",
      {
        network: "base",
        token: "native",
        amount: "1000000000000000",
        recipient: "0x0000000000000000000000000000000000000001",
      },
      PASSWORD
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.from).toBe("0xABCDEF0123456789ABCDEF0123456789ABCDEF01");
      expect(result.value.network).toBe("base");
      expect(result.value.amount).toBe("1000000000000000");
      expect(result.value.paymentSignature).toBeTruthy();
    }
  });

  test("constructs native transfer tx (no data field)", async () => {
    await signX402Payment(
      "0xABCDEF0123456789ABCDEF0123456789ABCDEF01",
      {
        network: "base",
        token: "native",
        amount: "1000",
        recipient: "0x0000000000000000000000000000000000000001",
      },
      PASSWORD
    );

    expect(mockSignTransaction).toHaveBeenCalledTimes(1);
    const call = mockSignTransaction.mock.calls[0][0] as {
      transaction: { chainType: string; value?: string; data?: string };
    };
    expect(call.transaction.chainType).toBe("evm");
    expect(call.transaction.value).toBe("1000");
    expect(call.transaction.data).toBeUndefined();
  });

  test("empty string token is treated as native", async () => {
    const result = await signX402Payment(
      "0xABCDEF0123456789ABCDEF0123456789ABCDEF01",
      {
        network: "base",
        token: "",
        amount: "1000",
        recipient: "0x0000000000000000000000000000000000000001",
      },
      PASSWORD
    );

    expect(result.ok).toBe(true);
    const call = mockSignTransaction.mock.calls[0][0] as {
      transaction: { data?: string };
    };
    expect(call.transaction.data).toBeUndefined();
  });
});

describe("signX402Payment — EVM ERC-20", () => {
  test("signs USDC payment on Base", async () => {
    const result = await signX402Payment(
      "0xABCDEF0123456789ABCDEF0123456789ABCDEF01",
      {
        network: "base",
        token: "USDC",
        amount: "1000000",
        recipient: "0x0000000000000000000000000000000000000001",
      },
      PASSWORD
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.network).toBe("base");
      expect(result.value.amount).toBe("1000000");
    }
  });

  test("constructs ERC-20 transfer tx with data field", async () => {
    await signX402Payment(
      "0xABCDEF0123456789ABCDEF0123456789ABCDEF01",
      {
        network: "base",
        token: "USDC",
        amount: "1000000",
        recipient: "0x0000000000000000000000000000000000000001",
      },
      PASSWORD
    );

    expect(mockSignTransaction).toHaveBeenCalledTimes(1);
    const call = mockSignTransaction.mock.calls[0][0] as {
      transaction: {
        chainType: string;
        to: string;
        value: string;
        data: string;
      };
    };
    expect(call.transaction.chainType).toBe("evm");
    // 'to' should be the USDC contract, not the payment recipient
    expect(call.transaction.to.toLowerCase()).toBe(
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913".toLowerCase()
    );
    // value should be "0" for ERC-20 transfers
    expect(call.transaction.value).toBe("0");
    // data should contain transfer function selector
    expect(call.transaction.data.startsWith("0xa9059cbb")).toBe(true);
  });

  test("signs USDT payment on Ethereum", async () => {
    mockSignTransaction.mockImplementationOnce(async () => ({
      ok: true as const,
      value: {
        signedTransaction: {
          chainType: "evm" as const,
          chainId: "ethereum",
          serialized: "0xsigned_eth_usdt",
        },
        from: "0x1111111111111111111111111111111111111111",
      },
    }));

    const result = await signX402Payment(
      "0x1111111111111111111111111111111111111111",
      {
        network: "ethereum",
        token: "USDT",
        amount: "5000000",
        recipient: "0x0000000000000000000000000000000000000002",
      },
      PASSWORD
    );

    expect(result.ok).toBe(true);
    const call = mockSignTransaction.mock.calls[0][0] as {
      transaction: { to: string };
    };
    expect(call.transaction.to.toLowerCase()).toBe(
      "0xdAC17F958D2ee523a2206206994597C13D831ec7".toLowerCase()
    );
  });

  test("token resolution is case-insensitive", async () => {
    const result = await signX402Payment(
      "0xABCDEF0123456789ABCDEF0123456789ABCDEF01",
      {
        network: "base",
        token: "usdc",
        amount: "1000000",
        recipient: "0x0000000000000000000000000000000000000001",
      },
      PASSWORD
    );

    expect(result.ok).toBe(true);
  });
});

describe("signX402Payment — propagates signing errors", () => {
  test("returns error when signTransaction fails", async () => {
    mockSignTransaction.mockImplementationOnce(async () => ({
      ok: false as const,
      error: new Error("Wrong password or corrupted vault."),
    }));

    const result = await signX402Payment(
      "0xABCDEF0123456789ABCDEF0123456789ABCDEF01",
      {
        network: "base",
        token: "native",
        amount: "1000",
        recipient: "0x0000000000000000000000000000000000000001",
      },
      PASSWORD
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("Wrong password");
    }
  });
});
