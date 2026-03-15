import { describe, expect, test, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ensureDir, secureWrite, secureRead, secureDelete, exists } from "../../../src/lib/file-system.ts";

const testDir = mkdtempSync(join(tmpdir(), "aw-test-"));

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("file-system", () => {
  test("ensureDir creates directory", () => {
    const dir = join(testDir, "subdir");
    ensureDir(dir, 0o700);
    expect(exists(dir)).toBe(true);
  });

  test("secureWrite/secureRead roundtrip", () => {
    const filePath = join(testDir, "test.txt");
    secureWrite(filePath, "hello secure world", 0o600);

    const result = secureRead(filePath);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("hello secure world");
    }
  });

  test("secureDelete removes file", () => {
    const filePath = join(testDir, "to-delete.txt");
    secureWrite(filePath, "delete me", 0o600);
    expect(exists(filePath)).toBe(true);

    secureDelete(filePath);
    expect(exists(filePath)).toBe(false);
  });

  test("secureRead returns error for missing file", () => {
    const result = secureRead(join(testDir, "nonexistent.txt"));
    expect(result.ok).toBe(false);
  });
});
