#!/usr/bin/env node
import { Command } from "commander";
import { password, select, confirm, input } from "@inquirer/prompts";
import {
  initVault,
  createWallet,
  createAllWallets,
  listWallets,
  labelWallet,
  deleteWallet,
  transfer,
  signTransaction,
  getBalance,
  unlock,
  lock,
  signX402Payment,
} from "../services/index.ts";
import { exportPrivateKey, exportMnemonic } from "../services/wallet-service.ts";
import { SUPPORTED_CHAINS } from "../config/index.ts";
import { hardenVault } from "../services/index.ts";
import { backupAction, restoreAction } from "./backup-restore.ts";
import { jsonOut } from "./json-output.ts";
import { fail, requireVault, getAuth, readJsonInput } from "./cli-helpers.ts";
import { logAudit, readAuditLog, filterBySeverity, pruneAuditLogs } from "../lib/index.ts";
import type { AuditSeverity } from "../types/index.ts";

const program = new Command();
program
  .name("agentwallet")
  .description("Multi-chain crypto wallet CLI — create, encrypt, and manage wallets securely")
  .version("0.1.0");

// ─── init ──────────────────────────────────────────
program
  .command("init")
  .description("Initialize the vault with a master password")
  .option("--json", "Output as JSON")
  .action(async (opts: { json?: boolean }) => {
    const envPw = process.env.AGENTWALLET_PASSWORD;
    let mp: string;
    if (envPw) {
      mp = envPw;
    } else {
      mp = await password({ message: "Set your master password:" });
      const cp = await password({ message: "Confirm master password:" });
      if (mp !== cp) fail("Passwords do not match", opts.json);
    }
    if (mp.length < 8) fail("Password must be at least 8 characters", opts.json);
    const r = await initVault(mp);
    if (!r.ok) { logAudit("VAULT_INIT", "failure", {}); fail(r.error.message, opts.json); }
    logAudit("VAULT_INIT", "success", {});
    if (opts.json) return jsonOut({ status: "initialized", path: "~/.agentwallet/" });
    process.stdout.write("Vault initialized at ~/.agentwallet/\n");
    process.stdout.write("   Your master password encrypts all private keys.\n");
  });

// ─── unlock ──────────────────────────────────────────
program
  .command("unlock")
  .description("Unlock vault and get a session token for non-interactive use")
  .option("--ttl <seconds>", "Session TTL in seconds (default: 3600, max: 86400)")
  .option("--json", "Output as JSON")
  .action(async (opts: { ttl?: string; json?: boolean }) => {
    requireVault(opts.json);
    const mp = process.env.AGENTWALLET_PASSWORD ?? await password({ message: "Enter master password:" });
    const ttl = opts.ttl ? parseInt(opts.ttl, 10) : undefined;
    const r = await unlock(mp, ttl);
    if (!r.ok) { logAudit("SESSION_UNLOCK", "failure", {}); fail(r.error.message, opts.json); }
    logAudit("SESSION_UNLOCK", "success", { ttl: ttl ?? 3600 });
    if (opts.json) return jsonOut(r.value);
    process.stdout.write(`\nSession token: ${r.value.token}\n`);
    process.stdout.write(`Expires at:    ${r.value.expiresAt}\n\n`);
    process.stdout.write("Use with: agentwallet <command> --token <token>\n");
    process.stdout.write("Or set:   export AGENTWALLET_TOKEN=<token>\n");
  });

// ─── lock ────────────────────────────────────────────
program
  .command("lock")
  .description("Lock vault and destroy the active session")
  .option("--json", "Output as JSON")
  .action((opts: { json?: boolean }) => {
    const r = lock();
    if (!r.ok) { logAudit("SESSION_LOCK", "failure", {}); fail(r.error.message, opts.json); }
    logAudit("SESSION_LOCK", "success", {});
    if (opts.json) return jsonOut({ status: "locked" });
    process.stdout.write("Session destroyed. Vault locked.\n");
  });

// ─── create ────────────────────────────────────────
program
  .command("create")
  .description("Create a new wallet")
  .option("-c, --chain <chain>", "Chain name or 'all'")
  .option("-n, --count <count>", "Number of wallets to create", "1")
  .option("--token <token>", "Session token (alternative to password)")
  .option("--json", "Output as JSON")
  .action(async (opts: { chain?: string; count: string; token?: string; json?: boolean }) => {
    requireVault(opts.json);
    const auth = await getAuth(opts);
    const count = parseInt(opts.count, 10);
    if (isNaN(count) || count < 1) fail("Invalid count", opts.json);

    let chainId = opts.chain;
    if (!chainId && !opts.json) {
      chainId = await select({
        message: "Select chain:",
        choices: [
          ...SUPPORTED_CHAINS.map((c) => ({ name: c.name, value: c.id })),
          { name: "All chains (EVM + Solana + TON)", value: "all" },
        ],
      });
    } else if (!chainId) {
      fail("--chain is required with --json", opts.json);
    }

    const created: Array<{ address: string; chainName: string; chainId: string }> = [];
    for (let i = 0; i < count; i++) {
      if (chainId === "all") {
        const r = await createAllWallets(auth);
        if (!r.ok) fail(r.error.message, opts.json);
        for (const w of r.value) created.push({ address: w.address, chainName: w.chainName, chainId: w.chainId });
        if (!opts.json) {
          process.stdout.write(`\nWallet group ${i + 1}/${count} created:\n`);
          for (const w of r.value) process.stdout.write(`   ${w.chainName.padEnd(12)} ${w.address}\n`);
        }
      } else {
        const r = await createWallet(chainId!, auth);
        if (!r.ok) fail(r.error.message, opts.json);
        created.push({ address: r.value.address, chainName: r.value.chainName, chainId: r.value.chainId });
        if (!opts.json) {
          process.stdout.write(`\n${r.value.chainName} wallet ${i + 1}/${count}:\n   Address: ${r.value.address}\n`);
        }
      }
    }
    for (const w of created) logAudit("WALLET_CREATE", "success", { address: w.address, chainId: w.chainId });
    if (opts.json) return jsonOut(created);
    process.stdout.write("\n   Private keys encrypted and stored in ~/.agentwallet/vault/\n");
  });

// ─── list ──────────────────────────────────────────
program
  .command("list")
  .description("List all wallets")
  .option("--json", "Output as JSON")
  .action((opts: { json?: boolean }) => {
    const wallets = listWallets();
    if (opts.json) {
      return jsonOut(wallets.map((w) => ({
        address: w.address, chainName: w.chainName, chainType: w.chainType,
        chainId: w.chainId, label: w.label ?? null,
      })));
    }
    if (wallets.length === 0) {
      process.stdout.write("No wallets found. Run 'agentwallet create' to create one.\n");
      return;
    }
    process.stdout.write(`\n  Found ${wallets.length} wallet(s):\n\n`);
    for (const w of wallets) {
      const label = w.label ? ` [${w.label}]` : "";
      const date = new Date(w.createdAt).toLocaleDateString();
      process.stdout.write(`  ${w.chainName.padEnd(12)} ${w.address}${label}  (${date})\n`);
    }
    process.stdout.write("\n");
  });

// ─── export (TTY-gated, no --token) ────────────────
program
  .command("export <address>")
  .description("Export a wallet's private key (interactive terminal only)")
  .action(async (address: string) => {
    if (!process.stdin.isTTY) fail("'export' requires an interactive terminal (TTY)");
    const mp = await password({ message: "Enter master password:" });
    const r = await exportPrivateKey(address, mp);
    if (!r.ok) { logAudit("PRIVATE_KEY_EXPORT", "failure", { address }); fail(r.error.message); }
    logAudit("PRIVATE_KEY_EXPORT", "success", { address });
    process.stdout.write("\n  Private key (will clear in 10 seconds):\n\n");
    process.stdout.write(`  ${r.value}\n`);
    setTimeout(() => {
      process.stdout.write("\x1b[2A\x1b[2K\x1b[1B\x1b[2K\x1b[1A");
      process.stdout.write("  [Private key cleared from terminal]\n");
    }, 10_000);
    await new Promise((resolve) => setTimeout(resolve, 11_000));
  });

// ─── mnemonic (TTY-gated, no --token) ────────────────
program
  .command("mnemonic")
  .description("Display your mnemonic phrase (interactive terminal only)")
  .action(async () => {
    if (!process.stdin.isTTY) fail("'mnemonic' requires an interactive terminal (TTY)");
    const mp = await password({ message: "Enter master password:" });
    const r = await exportMnemonic(mp);
    if (!r.ok) { logAudit("MNEMONIC_EXPORT", "failure", {}); fail(r.error.message); }
    logAudit("MNEMONIC_EXPORT", "success", {});
    process.stdout.write("\n  Mnemonic phrase (will clear in 10 seconds):\n\n");
    process.stdout.write(`  ${r.value}\n`);
    setTimeout(() => {
      process.stdout.write("\x1b[2A\x1b[2K\x1b[1B\x1b[2K\x1b[1A");
      process.stdout.write("  [Mnemonic cleared from terminal]\n");
    }, 10_000);
    await new Promise((resolve) => setTimeout(resolve, 11_000));
  });

// ─── sign ─────────────────────────────────────────
program
  .command("sign")
  .description("Sign an unsigned transaction (JSON from stdin or --tx flag)")
  .option("--tx <json>", "Unsigned transaction as JSON string")
  .option("--token <token>", "Session token (alternative to password)")
  .option("--json", "Output as JSON")
  .action(async (opts: { tx?: string; token?: string; json?: boolean }) => {
    requireVault(opts.json);
    let txJson = await readJsonInput(opts.tx);
    if (!txJson) txJson = await input({ message: "Paste unsigned transaction JSON:" });

    let parsed: { walletAddress: string; transaction: unknown };
    try { parsed = JSON.parse(txJson); } catch { fail("Invalid JSON input", opts.json); }
    if (!parsed!.walletAddress || !parsed!.transaction) {
      fail('JSON must contain "walletAddress" and "transaction" fields', opts.json);
    }

    const auth = await getAuth(opts);
    const r = await signTransaction({
      walletAddress: parsed!.walletAddress,
      transaction: parsed!.transaction as import("../types/index.ts").UnsignedTransaction,
      masterPassword: auth,
    });
    if (!r.ok) { logAudit("SIGN", "failure", { walletAddress: parsed!.walletAddress }); fail(r.error.message, opts.json); }
    logAudit("SIGN", "success", { walletAddress: parsed!.walletAddress });
    jsonOut(r.value);
  });

// ─── balance ──────────────────────────────────────
program
  .command("balance <address>")
  .description("Query on-chain balance for a wallet (no private key needed)")
  .option("--json", "Output as JSON")
  .action(async (address: string, opts: { json?: boolean }) => {
    const r = await getBalance(address);
    if (!r.ok) fail(r.error.message, opts.json);
    logAudit("BALANCE_QUERY", "success", { address, chainId: r.value.chainId });
    if (opts.json) return jsonOut(r.value);
    process.stdout.write(
      `\n  ${r.value.address}\n  Balance: ${r.value.balance} ${r.value.symbol}\n  Chain:   ${r.value.chainId}\n\n`
    );
  });

// ─── label ─────────────────────────────────────────
program
  .command("label <address> <name>")
  .description("Set a label for a wallet")
  .action((address: string, name: string) => {
    const r = labelWallet(address, name);
    if (!r.ok) { logAudit("WALLET_LABEL", "failure", { address, label: name }); fail(r.error.message); }
    logAudit("WALLET_LABEL", "success", { address, label: name });
    process.stdout.write(`Label "${name}" set for ${r.value.chainName} wallet ${address}\n`);
  });

// ─── delete ────────────────────────────────────────
program
  .command("delete <address>")
  .description("Securely delete a wallet")
  .option("--force", "Skip confirmation (for non-interactive use)")
  .option("--json", "Output as JSON")
  .action(async (address: string, opts: { force?: boolean; json?: boolean }) => {
    const wallets = listWallets();
    const w = wallets.find((w) => w.address.toLowerCase() === address.toLowerCase());
    if (!w) fail(`Wallet not found: ${address}`, opts.json);
    if (!opts.force) {
      const ok = await confirm({ message: `Delete ${w!.chainName} wallet ${address}? This cannot be undone.`, default: false });
      if (!ok) { process.stdout.write("Cancelled.\n"); return; }
    }
    const r = deleteWallet(address);
    if (!r.ok) { logAudit("WALLET_DELETE", "failure", { address }); fail(r.error.message, opts.json); }
    logAudit("WALLET_DELETE", "success", { address, chainId: w!.chainId });
    if (opts.json) return jsonOut({ status: "deleted", address, chainId: w!.chainId });
    process.stdout.write(`Wallet ${address} securely deleted.\n`);
  });

// ─── transfer ─────────────────────────────────────
program
  .command("transfer")
  .description("Transfer native tokens (ETH, SOL, TON, etc.)")
  .requiredOption("-f, --from <address>", "Sender wallet address")
  .requiredOption("-t, --to <address>", "Recipient address")
  .requiredOption("-a, --amount <amount>", "Amount to send (e.g. 0.01)")
  .option("--token <token>", "Session token (alternative to password)")
  .option("--json", "Output as JSON")
  .action(async (opts: { from: string; to: string; amount: string; token?: string; json?: boolean }) => {
    requireVault(opts.json);
    const auth = await getAuth(opts);
    if (!opts.json) {
      const c = await confirm({ message: `Send ${opts.amount} from ${opts.from} to ${opts.to}?`, default: false });
      if (!c) { process.stdout.write("Cancelled.\n"); return; }
      process.stdout.write("Building, signing, and broadcasting...\n");
    }
    const r = await transfer({ from: opts.from, to: opts.to, amount: opts.amount, masterPassword: auth });
    if (!r.ok) { logAudit("TRANSFER", "failure", { from: opts.from, to: opts.to, amount: opts.amount }); fail(r.error.message, opts.json); }
    logAudit("TRANSFER", "success", { from: r.value.from, to: r.value.to, amount: r.value.amount, chain: r.value.chain, txHash: r.value.txHash });
    if (opts.json) return jsonOut(r.value);
    process.stdout.write(
      `\nTransfer complete!\n   Chain:   ${r.value.chain}\n   From:    ${r.value.from}\n` +
      `   To:      ${r.value.to}\n   Amount:  ${r.value.amount}\n   Tx Hash: ${r.value.txHash}\n`
    );
  });

// ─── x402-sign ───────────────────────────────────────
program
  .command("x402-sign")
  .description("Sign an x402 payment (PAYMENT-REQUIRED from stdin or --payment flag)")
  .option("--payment <json>", "PAYMENT-REQUIRED header as JSON string")
  .requiredOption("--wallet <address>", "Wallet address to pay from")
  .option("--token <token>", "Session token (alternative to password)")
  .option("--json", "Output as JSON")
  .action(async (opts: { payment?: string; wallet: string; token?: string; json?: boolean }) => {
    requireVault(opts.json);
    let payJson = await readJsonInput(opts.payment);
    if (!payJson) payJson = await input({ message: "Paste PAYMENT-REQUIRED JSON:" });
    let parsed: { network: string; token: string; amount: string; recipient: string };
    try { parsed = JSON.parse(payJson); } catch { fail("Invalid JSON input", opts.json); }
    const auth = await getAuth(opts);
    const r = await signX402Payment(opts.wallet, parsed!, auth);
    if (!r.ok) { logAudit("X402_SIGN", "failure", { wallet: opts.wallet }); fail(r.error.message, opts.json); }
    logAudit("X402_SIGN", "success", { wallet: opts.wallet, network: parsed!.network, token: parsed!.token, amount: parsed!.amount, recipient: parsed!.recipient });
    jsonOut(r.value);
  });

// ─── harden ──────────────────────────────────────────
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

// ─── backup / restore ────────────────────────────────
program.command("backup").description("Export an encrypted backup of all wallets").action(backupAction);
program.command("restore <file>").description("Restore wallets from an encrypted backup").action(restoreAction);

// ─── audit-log ──────────────────────────────────────
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

program.parse();
