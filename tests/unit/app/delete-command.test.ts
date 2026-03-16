import { beforeEach, describe, expect, mock, test } from "bun:test";

const mockIsTotpEnabled = mock(() => true);
const mockVerifyTotp = mock(async () => ({ ok: true as const, value: undefined }));

mock.module("../../../src/services/index.ts", () => ({
  deleteWallet: mock(() => ({ ok: true as const, value: undefined })),
  listWallets: mock(() => []),
  isVaultInitialized: mock(() => true),
  isTotpEnabled: mockIsTotpEnabled,
  verifyTotp: mockVerifyTotp,
}));

const { authorizeDelete } = await import("../../../src/app/delete-command.ts");

describe("authorizeDelete", () => {
  beforeEach(() => {
    mockIsTotpEnabled.mockReset();
    mockIsTotpEnabled.mockImplementation(() => true);
    mockVerifyTotp.mockReset();
    mockVerifyTotp.mockImplementation(async () => ({ ok: true as const, value: undefined }));
  });

  test("requires --totp for non-interactive delete when TOTP is enabled", async () => {
    const result = await authorizeDelete(
      {
        address: "0xabc",
        chainName: "Base",
        force: true,
      },
      { isTty: false }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("Provide --totp <code>");
    }
    expect(mockVerifyTotp).not.toHaveBeenCalled();
  });

  test("verifies the provided TOTP code in non-interactive mode", async () => {
    const result = await authorizeDelete(
      {
        address: "0xabc",
        chainName: "Base",
        force: true,
        totp: "123456",
      },
      { isTty: false }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("authorized");
    }
    expect(mockVerifyTotp).toHaveBeenCalledWith("123456");
  });

  test("requires --force for non-interactive delete even after TOTP passes", async () => {
    const result = await authorizeDelete(
      {
        address: "0xabc",
        chainName: "Base",
        totp: "123456",
      },
      { isTty: false }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("requires --force");
    }
  });
});
