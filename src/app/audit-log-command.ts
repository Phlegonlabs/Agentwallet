import type { Command } from "commander";
import { readAuditLog, filterBySeverity, pruneAuditLogs } from "../lib/index.ts";
import { jsonOut } from "./json-output.ts";
import { fail } from "./cli-helpers.ts";
import type { AuditSeverity } from "../types/index.ts";

/** Register the audit-log command on the given program */
export function registerAuditLogCommand(program: Command): void {
  program
    .command("audit-log")
    .description("View wallet operation audit log")
    .option("--days <n>", "Number of days to show (default: 7)")
    .option("--severity <level>", "Filter: info, warn, critical")
    .option("--prune", "Remove audit logs older than 90 days")
    .option("--json", "Output as JSON")
    .action((opts: { days?: string; severity?: string; prune?: boolean; json?: boolean }) => {
      if (opts.prune) {
        const r = pruneAuditLogs();
        if (!r.ok) fail(r.error.message, opts.json);
        if (opts.json) return jsonOut({ pruned: r.value.removed });
        process.stdout.write(`Removed ${r.value.removed} old audit log file(s).\n`);
        return;
      }
      const days = opts.days ? parseInt(opts.days, 10) : 7;
      const r = readAuditLog(days);
      if (!r.ok) fail(r.error.message, opts.json);
      let entries = r.value;
      if (opts.severity) entries = filterBySeverity(entries, opts.severity as AuditSeverity);
      if (opts.json) {
        const now = new Date();
        const from = new Date(now);
        from.setDate(from.getDate() - days);
        return jsonOut({ entries, total: entries.length, period: { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) } });
      }
      if (entries.length === 0) { process.stdout.write("No audit log entries found.\n"); return; }
      process.stdout.write(`\n  Audit log (last ${days} day(s), ${entries.length} entries):\n\n`);
      for (const e of entries) {
        const icon = e.severity === "critical" ? "!!" : e.severity === "warn" ? " !" : "  ";
        const data = Object.entries(e.data).map(([k, v]) => `${k}=${v}`).join(" ");
        process.stdout.write(`  ${icon} ${e.timestamp.slice(11, 19)} [${e.status}] ${e.event}${data ? " " + data : ""}\n`);
      }
      process.stdout.write("\n");
    });
}
