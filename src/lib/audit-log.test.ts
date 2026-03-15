import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { logAudit, readAuditLog, pruneAuditLogs, filterBySeverity } from "./audit-log.ts";
import type { AuditEntry } from "../types/index.ts";

// Use a temp directory to avoid polluting the real vault
let origHome: string;
const testDir = join(tmpdir(), `aw-audit-test-${Date.now()}`);

beforeEach(() => {
  origHome = process.env.HOME ?? "";
  process.env.HOME = testDir;
  process.env.USERPROFILE = testDir;
  mkdirSync(join(testDir, ".agentwallet", "logs"), { recursive: true });
});

afterEach(() => {
  process.env.HOME = origHome;
  process.env.USERPROFILE = origHome;
  try { rmSync(testDir, { recursive: true, force: true }); } catch { /* ok */ }
});

describe("logAudit", () => {
  test("writes an entry to today's JSONL file", () => {
    logAudit("VAULT_INIT", "success", {});
    const date = new Date().toISOString().slice(0, 10);
    const logPath = join(testDir, ".agentwallet", "logs", `audit-${date}.jsonl`);
    const content = readFileSync(logPath, "utf-8");
    const entry = JSON.parse(content.trim());
    expect(entry.event).toBe("VAULT_INIT");
    expect(entry.severity).toBe("info");
    expect(entry.status).toBe("success");
  });

  test("appends multiple entries", () => {
    logAudit("VAULT_INIT", "success", {});
    logAudit("TRANSFER", "success", { from: "0xA", to: "0xB", amount: "1.0" });
    const date = new Date().toISOString().slice(0, 10);
    const logPath = join(testDir, ".agentwallet", "logs", `audit-${date}.jsonl`);
    const lines = readFileSync(logPath, "utf-8").trim().split("\n");
    expect(lines.length).toBe(2);
    expect(JSON.parse(lines[1]!).event).toBe("TRANSFER");
    expect(JSON.parse(lines[1]!).severity).toBe("warn");
  });

  test("never throws on write failure", () => {
    // Point HOME to a non-writable location
    process.env.HOME = "/nonexistent-path-12345";
    process.env.USERPROFILE = "/nonexistent-path-12345";
    expect(() => logAudit("VAULT_INIT", "success", {})).not.toThrow();
  });
});

describe("readAuditLog", () => {
  test("reads entries from recent log files", () => {
    logAudit("SESSION_UNLOCK", "success", { ttl: 3600 });
    logAudit("PRIVATE_KEY_EXPORT", "success", { address: "0xABC" });
    const result = readAuditLog(1);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.length).toBe(2);
    expect(result.value[0]!.event).toBe("SESSION_UNLOCK");
    expect(result.value[1]!.event).toBe("PRIVATE_KEY_EXPORT");
    expect(result.value[1]!.severity).toBe("critical");
  });

  test("returns empty array when no logs exist", () => {
    rmSync(join(testDir, ".agentwallet", "logs"), { recursive: true, force: true });
    const result = readAuditLog(7);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.length).toBe(0);
  });
});

describe("pruneAuditLogs", () => {
  test("removes old log files", () => {
    const logsDir = join(testDir, ".agentwallet", "logs");
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);
    const oldDateStr = oldDate.toISOString().slice(0, 10);
    writeFileSync(join(logsDir, `audit-${oldDateStr}.jsonl`), '{"event":"test"}\n');
    logAudit("VAULT_INIT", "success", {});
    const result = pruneAuditLogs(90);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.removed).toBe(1);
  });
});

describe("filterBySeverity", () => {
  const entries: AuditEntry[] = [
    { timestamp: "2026-03-15T10:00:00Z", event: "VAULT_INIT", severity: "info", status: "success", data: {} },
    { timestamp: "2026-03-15T11:00:00Z", event: "TRANSFER", severity: "warn", status: "success", data: {} },
    { timestamp: "2026-03-15T12:00:00Z", event: "PRIVATE_KEY_EXPORT", severity: "critical", status: "success", data: {} },
  ];

  test("filters to warn and above", () => {
    const result = filterBySeverity(entries, "warn");
    expect(result.length).toBe(2);
    expect(result[0]!.event).toBe("TRANSFER");
    expect(result[1]!.event).toBe("PRIVATE_KEY_EXPORT");
  });

  test("filters to critical only", () => {
    const result = filterBySeverity(entries, "critical");
    expect(result.length).toBe(1);
    expect(result[0]!.event).toBe("PRIVATE_KEY_EXPORT");
  });

  test("info returns all", () => {
    const result = filterBySeverity(entries, "info");
    expect(result.length).toBe(3);
  });
});
