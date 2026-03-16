import type { Command } from "commander";
import {
  loadGuards,
  saveGuards,
  addWhitelistAddress,
  removeWhitelistAddress,
} from "../services/index.ts";
import { logAudit } from "../lib/index.ts";
import { fail, requireVault, getAuth } from "./cli-helpers.ts";
import { jsonOut } from "./json-output.ts";

export function registerGuardCommands(program: Command): void {
  const guard = program
    .command("guard")
    .description("Manage transfer guards (limits, whitelist, rate limiting)");

  guard
    .command("status")
    .description("Show current guard settings")
    .option("--json", "Output as JSON")
    .action((opts: { json?: boolean }) => {
      const guards = loadGuards();
      if (opts.json) return jsonOut(guards);
      process.stdout.write("\n  Transfer Guards:\n");
      process.stdout.write(`    Per-transaction limit: ${guards.transferLimits.perTransaction}\n`);
      process.stdout.write(`    Daily total limit:     ${guards.transferLimits.dailyTotal}\n`);
      process.stdout.write(`    Whitelist enabled:     ${guards.whitelist.enabled}\n`);
      process.stdout.write(`    Whitelisted addresses: ${guards.whitelist.addresses.length}\n`);
      process.stdout.write(`    Cooldown hours:        ${guards.whitelist.cooldownHours}\n`);
      process.stdout.write(`    Max transfers/hour:    ${guards.rateLimiting.maxTransfersPerHour}\n\n`);
    });

  guard
    .command("set-limit")
    .description("Set transfer limits")
    .option("--per-tx <amount>", "Per-transaction limit")
    .option("--daily <amount>", "Daily total limit")
    .option("--token <token>", "Session token")
    .option("--json", "Output as JSON")
    .action(async (opts: { perTx?: string; daily?: string; token?: string; json?: boolean }) => {
      requireVault(opts.json);
      await getAuth(opts);
      const guards = loadGuards();
      if (opts.perTx) guards.transferLimits.perTransaction = opts.perTx;
      if (opts.daily) guards.transferLimits.dailyTotal = opts.daily;
      saveGuards(guards);
      logAudit("GUARD_UPDATE", "success", {
        perTransaction: guards.transferLimits.perTransaction,
        dailyTotal: guards.transferLimits.dailyTotal,
      });
      if (opts.json) return jsonOut({ status: "updated", transferLimits: guards.transferLimits });
      process.stdout.write(`Limits updated: per-tx=${guards.transferLimits.perTransaction}, daily=${guards.transferLimits.dailyTotal}\n`);
    });

  guard
    .command("whitelist-add <address>")
    .description("Add address to whitelist (24h cooldown)")
    .option("--label <label>", "Label for this address", "unlabeled")
    .option("--token <token>", "Session token")
    .option("--json", "Output as JSON")
    .action(async (address: string, opts: { label: string; token?: string; json?: boolean }) => {
      requireVault(opts.json);
      await getAuth(opts);
      const r = addWhitelistAddress(address, opts.label);
      if (!r.ok) { logAudit("WHITELIST_ADD", "failure", { address }); fail(r.error.message, opts.json); }
      logAudit("WHITELIST_ADD", "success", { address, label: opts.label });
      const guards = loadGuards();
      const entry = guards.whitelist.addresses.find(
        (a) => a.address.toLowerCase() === address.toLowerCase()
      );
      if (opts.json) return jsonOut({ status: "added", address, cooldownUntil: entry?.cooldownUntil });
      process.stdout.write(`Address ${address} added to whitelist.\n`);
      process.stdout.write(`Cooldown until: ${entry?.cooldownUntil}\n`);
    });

  guard
    .command("whitelist-remove <address>")
    .description("Remove address from whitelist")
    .option("--token <token>", "Session token")
    .option("--json", "Output as JSON")
    .action(async (address: string, opts: { token?: string; json?: boolean }) => {
      requireVault(opts.json);
      await getAuth(opts);
      const r = removeWhitelistAddress(address);
      if (!r.ok) { logAudit("WHITELIST_REMOVE", "failure", { address }); fail(r.error.message, opts.json); }
      logAudit("WHITELIST_REMOVE", "success", { address });
      if (opts.json) return jsonOut({ status: "removed", address });
      process.stdout.write(`Address ${address} removed from whitelist.\n`);
    });

  guard
    .command("whitelist-list")
    .description("List whitelisted addresses")
    .option("--json", "Output as JSON")
    .action((opts: { json?: boolean }) => {
      const guards = loadGuards();
      if (opts.json) return jsonOut(guards.whitelist);
      if (guards.whitelist.addresses.length === 0) {
        process.stdout.write("No whitelisted addresses.\n");
        return;
      }
      process.stdout.write(`\n  Whitelist (enabled: ${guards.whitelist.enabled}):\n\n`);
      for (const a of guards.whitelist.addresses) {
        const cooldown = new Date(a.cooldownUntil) > new Date() ? " [cooldown]" : "";
        process.stdout.write(`    ${a.address}  ${a.label}${cooldown}\n`);
      }
      process.stdout.write("\n");
    });

  guard
    .command("whitelist-enable")
    .description("Enable whitelist enforcement")
    .option("--token <token>", "Session token")
    .option("--json", "Output as JSON")
    .action(async (opts: { token?: string; json?: boolean }) => {
      requireVault(opts.json);
      await getAuth(opts);
      const guards = loadGuards();
      guards.whitelist.enabled = true;
      saveGuards(guards);
      logAudit("GUARD_UPDATE", "success", { whitelistEnabled: true });
      if (opts.json) return jsonOut({ status: "whitelist_enabled" });
      process.stdout.write("Whitelist enforcement enabled.\n");
    });

  guard
    .command("whitelist-disable")
    .description("Disable whitelist enforcement")
    .option("--token <token>", "Session token")
    .option("--json", "Output as JSON")
    .action(async (opts: { token?: string; json?: boolean }) => {
      requireVault(opts.json);
      await getAuth(opts);
      const guards = loadGuards();
      guards.whitelist.enabled = false;
      saveGuards(guards);
      logAudit("GUARD_UPDATE", "success", { whitelistEnabled: false });
      if (opts.json) return jsonOut({ status: "whitelist_disabled" });
      process.stdout.write("Whitelist enforcement disabled.\n");
    });
}
