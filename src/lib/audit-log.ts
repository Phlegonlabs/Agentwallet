import { appendFileSync, readdirSync, unlinkSync } from "node:fs";
import type { AuditEvent, AuditEntry, AuditSeverity, Result } from "../types/index.ts";
import { eventSeverity, ok, err } from "../types/index.ts";
import { ensureDir, exists, secureRead } from "./file-system.ts";
import {
  getAuditLogDir,
  getAuditLogPath,
  AUDIT_LOG_DIR_MODE,
  AUDIT_LOG_FILE_MODE,
  AUDIT_LOG_MAX_DAYS,
} from "../config/index.ts";
import { chmodSync } from "node:fs";

/**
 * Write a single audit entry to today's log file.
 * Never throws — logging failure must not block wallet operations.
 */
export function logAudit(
  event: AuditEvent,
  status: "success" | "failure",
  data: Record<string, string | number | boolean | null>,
): void {
  try {
    const dir = getAuditLogDir();
    ensureDir(dir, AUDIT_LOG_DIR_MODE);

    const filePath = getAuditLogPath();
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      event,
      severity: eventSeverity(event),
      status,
      data,
    };
    appendFileSync(filePath, JSON.stringify(entry) + "\n", { encoding: "utf-8", mode: AUDIT_LOG_FILE_MODE });
    try { chmodSync(filePath, AUDIT_LOG_FILE_MODE); } catch { /* Windows no-op */ }
  } catch {
    // Silently ignore — audit logging must never block operations
  }
}

/**
 * Read audit entries from the last N days.
 */
export function readAuditLog(days = 7): Result<AuditEntry[]> {
  try {
    const dir = getAuditLogDir();
    if (!exists(dir)) return ok([]);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const files = readdirSync(dir)
      .filter((f) => f.startsWith("audit-") && f.endsWith(".jsonl"))
      .filter((f) => {
        const dateStr = f.slice(6, 16); // "audit-YYYY-MM-DD.jsonl" → "YYYY-MM-DD"
        return dateStr >= cutoffStr;
      })
      .sort();

    const entries: AuditEntry[] = [];
    for (const file of files) {
      const result = secureRead(`${dir}/${file}`);
      if (!result.ok) continue;
      const lines = result.value.split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          entries.push(JSON.parse(line) as AuditEntry);
        } catch {
          // Skip malformed lines
        }
      }
    }

    return ok(entries);
  } catch (e) {
    return err(new Error(`Failed to read audit log: ${e instanceof Error ? e.message : String(e)}`));
  }
}

/**
 * Remove audit log files older than maxDays.
 */
export function pruneAuditLogs(maxDays = AUDIT_LOG_MAX_DAYS): Result<{ removed: number }> {
  try {
    const dir = getAuditLogDir();
    if (!exists(dir)) return ok({ removed: 0 });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxDays);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const files = readdirSync(dir).filter(
      (f) => f.startsWith("audit-") && f.endsWith(".jsonl"),
    );

    let removed = 0;
    for (const file of files) {
      const dateStr = file.slice(6, 16);
      if (dateStr < cutoffStr) {
        unlinkSync(`${dir}/${file}`);
        removed++;
      }
    }

    return ok({ removed });
  } catch (e) {
    return err(new Error(`Failed to prune audit logs: ${e instanceof Error ? e.message : String(e)}`));
  }
}

/**
 * Filter entries by severity level.
 */
export function filterBySeverity(
  entries: AuditEntry[],
  minSeverity: AuditSeverity,
): AuditEntry[] {
  const levels: Record<AuditSeverity, number> = { info: 0, warn: 1, critical: 2 };
  const min = levels[minSeverity];
  return entries.filter((e) => levels[e.severity] >= min);
}
