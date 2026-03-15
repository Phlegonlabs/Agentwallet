import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, chmodSync } from "node:fs";
import type { Result } from "../types/index.ts";
import { ok, err } from "../types/index.ts";

/** Create a directory with specific permissions */
export function ensureDir(dirPath: string, mode: number): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true, mode });
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
