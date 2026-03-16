import type { Command } from "commander";
import { password, input } from "@inquirer/prompts";
import {
  isTotpEnabled,
  beginTotpEnable,
  confirmTotpEnable,
  disableTotp,
  getTotpStatus,
} from "../services/index.ts";
import { logAudit } from "../lib/index.ts";
import { fail } from "./cli-helpers.ts";
import { jsonOut } from "./json-output.ts";

export function registerTotpCommands(program: Command): void {
  const totp = program
    .command("totp")
    .description("Manage TOTP two-factor authentication");

  // ─── totp enable ─────────────────────────────
  totp
    .command("enable")
    .description("Enable TOTP 2FA (interactive terminal only)")
    .option("--json", "Output as JSON")
    .action(async (opts: { json?: boolean }) => {
      if (!process.stdin.isTTY) {
        fail("'totp enable' requires an interactive terminal (TTY)", opts.json);
      }

      const result = await beginTotpEnable();
      if (!result.ok) {
        logAudit("TOTP_ENABLE", "failure", {});
        fail(result.error.message, opts.json);
      }

      const { secret, qrCode, uri, recoveryCodes } = result.value;

      process.stdout.write("\n  Scan this QR code with your authenticator app:\n\n");
      process.stdout.write(qrCode);
      process.stdout.write(`\n  Manual entry URI: ${uri}\n\n`);
      process.stdout.write("  Recovery codes (save these NOW, they will not be shown again):\n\n");
      for (const code of recoveryCodes) {
        process.stdout.write(`    ${code}\n`);
      }
      process.stdout.write("\n");

      const code = await input({ message: "Enter the 6-digit code from your app to confirm:" });
      const confirmResult = await confirmTotpEnable(secret, code.trim(), recoveryCodes);
      if (!confirmResult.ok) {
        logAudit("TOTP_ENABLE", "failure", { reason: "invalid_code" });
        fail(confirmResult.error.message, opts.json);
      }

      logAudit("TOTP_ENABLE", "success", {});
      if (opts.json) return jsonOut({ status: "enabled", recoveryCodes: recoveryCodes.length });
      process.stdout.write("  TOTP enabled successfully.\n\n");
    });

  // ─── totp disable ─────────────────────────────
  totp
    .command("disable")
    .description("Disable TOTP 2FA")
    .option("--json", "Output as JSON")
    .action(async (opts: { json?: boolean }) => {
      if (!process.stdin.isTTY) {
        fail("'totp disable' requires an interactive terminal (TTY)", opts.json);
      }
      if (!isTotpEnabled()) {
        fail("TOTP is not enabled", opts.json);
      }

      const code = await input({ message: "Enter TOTP code or recovery code:" });
      const result = await disableTotp(code.trim());
      if (!result.ok) {
        logAudit("TOTP_DISABLE", "failure", {});
        fail(result.error.message, opts.json);
      }
      logAudit("TOTP_DISABLE", "success", {});
      if (opts.json) return jsonOut({ status: "disabled" });
      process.stdout.write("  TOTP disabled.\n");
    });

  // ─── totp status ─────────────────────────────
  totp
    .command("status")
    .description("Show TOTP status")
    .option("--json", "Output as JSON")
    .action((opts: { json?: boolean }) => {
      const status = getTotpStatus();
      if (opts.json) return jsonOut(status);
      if (!status.enabled) {
        process.stdout.write("  TOTP: not enabled\n");
        return;
      }
      process.stdout.write(`  TOTP: enabled (since ${status.enabledAt})\n`);
      process.stdout.write(`  Recovery codes remaining: ${status.remainingRecoveryCodes}\n`);
    });
}
