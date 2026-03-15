import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";

// Override paths to use temp dir for testing
const testDir = mkdtempSync(join(tmpdir(), "aw-vault-test-"));
const originalHome = process.env.HOME;

beforeAll(() => {
  // Point ~/.agentwallet to temp dir
  process.env.HOME = testDir;
  process.env.USERPROFILE = testDir;
});

afterAll(() => {
  process.env.HOME = originalHome;
  delete process.env.USERPROFILE;
  rmSync(testDir, { recursive: true, force: true });
});

describe("vault-service", () => {
  test("init -> storeMnemonic -> retrieveMnemonic roundtrip", async () => {
    const { initVault, isVaultInitialized, storeMnemonic, retrieveMnemonic } = await import("../../src/services/vault-service.ts");

    expect(isVaultInitialized()).toBe(false);

    const initResult = await initVault("test-master-password");
    expect(initResult.ok).toBe(true);
    expect(isVaultInitialized()).toBe(true);

    const storeResult = await storeMnemonic("abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about", "test-master-password");
    expect(storeResult.ok).toBe(true);

    const retrieveResult = await retrieveMnemonic("test-master-password");
    expect(retrieveResult.ok).toBe(true);
    if (retrieveResult.ok) {
      expect(retrieveResult.value).toBe("abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about");
    }
  });

  test("wrong password fails to retrieve mnemonic", async () => {
    const { retrieveMnemonic } = await import("../../src/services/vault-service.ts");

    const result = await retrieveMnemonic("wrong-password");
    expect(result.ok).toBe(false);
  });

  test("storePrivateKey and retrievePrivateKey roundtrip", async () => {
    const { storePrivateKey, retrievePrivateKey } = await import("../../src/services/vault-service.ts");

    const fakeKey = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
    const storeResult = await storePrivateKey("test-wallet-id", fakeKey, "test-master-password");
    expect(storeResult.ok).toBe(true);

    const retrieveResult = await retrievePrivateKey("test-wallet-id", "test-master-password");
    expect(retrieveResult.ok).toBe(true);
    if (retrieveResult.ok) {
      expect(retrieveResult.value).toEqual(fakeKey);
    }
  });
});
