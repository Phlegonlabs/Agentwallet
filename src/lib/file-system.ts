import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, chmodSync, statSync, readdirSync } from "node:fs";
import { platform } from "node:os";
import { join } from "node:path";
import type { Result } from "../types/index.ts";
import { ok, err } from "../types/index.ts";
import type { HardenEntry, HardenReport } from "../types/index.ts";

/** Create a directory with specific permissions, fixing existing dirs */
export function ensureDir(dirPath: string, mode: number): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true, mode });
  } else {
    try { chmodSync(dirPath, mode); } catch { /* Windows no-op */ }
  }
}

/** Write data to file then set permissions (atomic as possible) */
export function secureWrite(filePath: string, data: string, mode: number): void {
  writeFileSync(filePath, data, { encoding: "utf-8", mode });
  // Explicitly set chmod in case umask interfered
  try {
    chmodSync(filePath, mode);
  } catch {
    // chmod may not work on Windows — encryption is the primary protection
  }
}

/** Read file contents */
export function secureRead(filePath: string): Result<string> {
  try {
    const content = readFileSync(filePath, "utf-8");
    return ok(content);
  } catch (e) {
    return err(new Error(`Failed to read ${filePath}: ${e instanceof Error ? e.message : String(e)}`));
  }
}

/** Securely delete a file (overwrite with zeros then unlink) */
export function secureDelete(filePath: string): void {
  if (!existsSync(filePath)) return;
  // Overwrite with zeros before deletion
  const stat = readFileSync(filePath);
  const zeros = Buffer.alloc(stat.length, 0);
  writeFileSync(filePath, zeros);
  unlinkSync(filePath);
}

/** Check if a path exists */
export function exists(filePath: string): boolean {
  return existsSync(filePath);
}

/** Check and fix permissions on vault paths. No-op on Windows. */
export function hardenPermissions(
  baseDir: string,
  vaultDir: string,
  expectedDirMode: number,
  expectedFileMode: number,
): HardenReport {
  const report: HardenReport = {
    timestamp: new Date().toISOString(),
    platform: platform(),
    entries: [],
    totalChecked: 0,
    totalFixed: 0,
    totalErrors: 0,
  };

  if (platform() === "win32") return report;

  const dirPaths = [baseDir, vaultDir];
  for (const dirPath of dirPaths) {
    report.entries.push(hardenOne(dirPath, "directory", expectedDirMode));
  }

  if (existsSync(vaultDir)) {
    try {
      const files = readdirSync(vaultDir);
      for (const file of files) {
        if (file.endsWith(".enc")) {
          report.entries.push(hardenOne(join(vaultDir, file), "file", expectedFileMode));
        }
      }
    } catch (e) {
      report.entries.push({
        path: vaultDir,
        kind: "directory",
        expectedMode: expectedDirMode,
        actualMode: null,
        status: "error",
        error: `Failed to read vault dir: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  const configFiles = ["config.json", "wallets.json", ".session"];
  for (const name of configFiles) {
    const filePath = join(baseDir, name);
    if (existsSync(filePath)) {
      report.entries.push(hardenOne(filePath, "file", expectedFileMode));
    }
  }

  for (const entry of report.entries) {
    report.totalChecked++;
    if (entry.status === "fixed") report.totalFixed++;
    if (entry.status === "error") report.totalErrors++;
  }

  return report;
}

function hardenOne(
  targetPath: string,
  kind: "directory" | "file",
  expectedMode: number,
): HardenEntry {
  const entry: HardenEntry = {
    path: targetPath,
    kind,
    expectedMode,
    actualMode: null,
    status: "ok",
  };
  try {
    if (!existsSync(targetPath)) {
      entry.status = "ok";
      return entry;
    }
    const actual = statSync(targetPath).mode & 0o777;
    entry.actualMode = actual;
    if (actual !== expectedMode) {
      chmodSync(targetPath, expectedMode);
      entry.status = "fixed";
    }
  } catch (e) {
    entry.status = "error";
    entry.error = e instanceof Error ? e.message : String(e);
  }
  return entry;
}
