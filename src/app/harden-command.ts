import type { Command } from "commander";
import { hardenVault } from "../services/index.ts";
import { logAudit } from "../lib/index.ts";
import { fail, requireVault } from "./cli-helpers.ts";
import { jsonOut } from "./json-output.ts";

export function registerHardenCommand(program: Command): void {
  program
    .command("harden")
    .description("Audit and fix vault file permissions")
    .option("--json", "Output as JSON")
    .option("--strict", "Exit with code 1 if any permissions were fixed")
    .action((opts: { json?: boolean; strict?: boolean }) => {
      requireVault(opts.json);
      const report = hardenVault();
      logAudit("VAULT_HARDEN", "success", { totalChecked: report.totalChecked, totalFixed: report.totalFixed });
      if (opts.json) return jsonOut(report);
      if (report.totalChecked === 0) {
        process.stdout.write("No vault paths to check (Windows or vault not initialized).\n");
        return;
      }
      process.stdout.write(`\nVault permission audit:\n`);
      for (const e of report.entries) {
        const mode = e.actualMode !== null ? `0o${e.actualMode.toString(8)}` : "n/a";
        const expected = `0o${e.expectedMode.toString(8)}`;
        const icon = e.status === "ok" ? "  ok" : e.status === "fixed" ? "  fixed" : "  ERROR";
        process.stdout.write(`  ${icon}  ${e.path}  (${mode} -> ${expected})\n`);
      }
      process.stdout.write(`\n  Checked: ${report.totalChecked}  Fixed: ${report.totalFixed}  Errors: ${report.totalErrors}\n\n`);
      if (opts.strict && report.totalFixed > 0) process.exit(1);
    });
}
