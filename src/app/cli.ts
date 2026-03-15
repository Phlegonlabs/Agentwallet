#!/usr/bin/env node
import { Command } from "commander";
import { password, select, confirm, input } from "@inquirer/prompts";
import {
  initVault,
  isVaultInitialized,
  createWallet,
  createAllWallets,
  listWallets,
  exportPrivateKey,
  exportMnemonic,
  labelWallet,
  deleteWallet,
} from "../services/index.ts";
import { SUPPORTED_CHAINS } from "../config/index.ts";

const program = new Command();

program
  .name("agentwallet")
  .description("Multi-chain crypto wallet CLI — create, encrypt, and manage wallets securely")
  .version("0.1.0");

// ─── init ──────────────────────────────────────────
program
  .command("init")
  .description("Initialize the vault with a master password")
  .action(async () => {
    if (isVaultInitialized()) {
      console.log("Vault already initialized.");
      return;
    }

    const masterPassword = await password({
      message: "Set your master password:",
    });
    const confirmPassword = await password({
      message: "Confirm master password:",
    });

    if (masterPassword !== confirmPassword) {
      console.error("Passwords do not match.");
      process.exit(1);
    }

    if (masterPassword.length < 8) {
      console.error("Password must be at least 8 characters.");
      process.exit(1);
    }

    const result = await initVault(masterPassword);
    if (!result.ok) {
      console.error(result.error.message);
      process.exit(1);
    }

    console.log("✅ Vault initialized at ~/.agentwallet/");
    console.log("   Your master password encrypts all private keys.");
    console.log("   ⚠️  If you lose it, your keys cannot be recovered.");
  });

// ─── create ────────────────────────────────────────
program
  .command("create")
  .description("Create a new wallet")
  .option("-c, --chain <chain>", "Chain name (ethereum, polygon, bsc, base, arbitrum, optimism, avalanche, fantom, solana, all)")
  .option("-n, --count <count>", "Number of wallets to create", "1")
  .action(async (opts: { chain?: string; count: string }) => {
    if (!isVaultInitialized()) {
      console.error("Vault not initialized. Run 'agentwallet init' first.");
      process.exit(1);
    }

    const masterPassword = await password({
      message: "Enter master password:",
    });

    const count = parseInt(opts.count, 10);
    if (isNaN(count) || count < 1) {
      console.error("Invalid count. Must be a positive integer.");
      process.exit(1);
    }

    // Determine chain selection
    let chainId = opts.chain;
    if (!chainId) {
      chainId = await select({
        message: "Select chain:",
        choices: [
          ...SUPPORTED_CHAINS.map((c) => ({ name: c.name, value: c.id })),
          { name: "All chains (EVM + Solana)", value: "all" },
        ],
      });
    }

    for (let i = 0; i < count; i++) {
      if (chainId === "all") {
        const result = await createAllWallets(masterPassword);
        if (!result.ok) {
          console.error(result.error.message);
          process.exit(1);
        }
        console.log(`\n✅ Wallet group ${i + 1}/${count} created:`);
        for (const w of result.value) {
          console.log(`   ${w.chainName.padEnd(12)} ${w.address}`);
        }
      } else {
        const result = await createWallet(chainId, masterPassword);
        if (!result.ok) {
          console.error(result.error.message);
          process.exit(1);
        }
        console.log(`\n✅ ${result.value.chainName} wallet ${i + 1}/${count} created:`);
        console.log(`   Address: ${result.value.address}`);
      }
    }

    console.log("\n   Private keys encrypted and stored in ~/.agentwallet/vault/");
  });

// ─── list ──────────────────────────────────────────
program
  .command("list")
  .description("List all wallets")
  .action(() => {
    const wallets = listWallets();
    if (wallets.length === 0) {
      console.log("No wallets found. Run 'agentwallet create' to create one.");
      return;
    }

    console.log(`\n  Found ${wallets.length} wallet(s):\n`);
    for (const w of wallets) {
      const label = w.label ? ` [${w.label}]` : "";
      const date = new Date(w.createdAt).toLocaleDateString();
      console.log(`  ${w.chainName.padEnd(12)} ${w.address}${label}  (${date})`);
    }
    console.log();
  });

// ─── export ────────────────────────────────────────
program
  .command("export <address>")
  .description("Export a wallet's private key")
  .action(async (address: string) => {
    const masterPassword = await password({
      message: "Enter master password:",
    });

    const result = await exportPrivateKey(address, masterPassword);
    if (!result.ok) {
      console.error(result.error.message);
      process.exit(1);
    }

    console.log("\n  ⚠️  Private key (will clear in 10 seconds):\n");
    console.log(`  ${result.value}`);

    // Auto-clear after 10 seconds
    setTimeout(() => {
      process.stdout.write("\x1b[2A\x1b[2K\x1b[1B\x1b[2K\x1b[1A");
      console.log("  [Private key cleared from terminal]");
    }, 10_000);

    // Keep process alive for the timeout
    await new Promise((resolve) => setTimeout(resolve, 11_000));
  });

// ─── mnemonic ──────────────────────────────────────
program
  .command("mnemonic")
  .description("Display your mnemonic phrase")
  .action(async () => {
    const masterPassword = await password({
      message: "Enter master password:",
    });

    const result = await exportMnemonic(masterPassword);
    if (!result.ok) {
      console.error(result.error.message);
      process.exit(1);
    }

    console.log("\n  ⚠️  Mnemonic phrase (will clear in 10 seconds):\n");
    console.log(`  ${result.value}`);

    setTimeout(() => {
      process.stdout.write("\x1b[2A\x1b[2K\x1b[1B\x1b[2K\x1b[1A");
      console.log("  [Mnemonic cleared from terminal]");
    }, 10_000);

    await new Promise((resolve) => setTimeout(resolve, 11_000));
  });

// ─── label ─────────────────────────────────────────
program
  .command("label <address> <name>")
  .description("Set a label for a wallet")
  .action((address: string, name: string) => {
    const result = labelWallet(address, name);
    if (!result.ok) {
      console.error(result.error.message);
      process.exit(1);
    }
    console.log(`✅ Label "${name}" set for ${result.value.chainName} wallet ${address}`);
  });

// ─── delete ────────────────────────────────────────
program
  .command("delete <address>")
  .description("Securely delete a wallet")
  .action(async (address: string) => {
    const wallets = listWallets();
    const wallet = wallets.find(
      (w) => w.address.toLowerCase() === address.toLowerCase()
    );
    if (!wallet) {
      console.error(`Wallet not found: ${address}`);
      process.exit(1);
    }

    const confirmed = await confirm({
      message: `Delete ${wallet.chainName} wallet ${address}? This cannot be undone.`,
      default: false,
    });

    if (!confirmed) {
      console.log("Cancelled.");
      return;
    }

    const result = deleteWallet(address);
    if (!result.ok) {
      console.error(result.error.message);
      process.exit(1);
    }
    console.log(`✅ Wallet ${address} securely deleted.`);
  });

// ─── backup ────────────────────────────────────────
program
  .command("backup")
  .description("Export an encrypted backup of all wallets")
  .action(async () => {
    const masterPassword = await password({
      message: "Enter master password:",
    });

    // Verify password first
    const mnemonicResult = await exportMnemonic(masterPassword);
    if (!mnemonicResult.ok) {
      console.error("Wrong password or no wallets to backup.");
      process.exit(1);
    }

    const { readFileSync, writeFileSync } = await import("node:fs");
    const { getBaseDir } = await import("../config/paths.ts");
    const { join } = await import("node:path");

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = join(process.cwd(), `agentwallet-backup-${timestamp}.json`);

    // Collect all encrypted files (already encrypted — safe to export as-is)
    const configData = readFileSync(join(getBaseDir(), "config.json"), "utf-8");
    const walletsData = readFileSync(join(getBaseDir(), "wallets.json"), "utf-8");

    const wallets = listWallets();
    const keyFiles: Record<string, string> = {};
    for (const w of wallets) {
      const keyPath = join(getBaseDir(), "vault", `${w.id}.enc`);
      keyFiles[w.id] = readFileSync(keyPath, "utf-8");
    }

    const backup = {
      version: 1,
      createdAt: new Date().toISOString(),
      config: JSON.parse(configData),
      wallets: JSON.parse(walletsData),
      keys: keyFiles,
    };

    writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`✅ Backup saved to: ${backupPath}`);
    console.log("   This file contains encrypted data — keep it safe.");
  });

// ─── restore ───────────────────────────────────────
program
  .command("restore <file>")
  .description("Restore wallets from an encrypted backup")
  .action(async (file: string) => {
    if (isVaultInitialized()) {
      const overwrite = await confirm({
        message: "Vault already exists. Overwrite with backup data?",
        default: false,
      });
      if (!overwrite) {
        console.log("Cancelled.");
        return;
      }
    }

    const { readFileSync, writeFileSync } = await import("node:fs");
    const { getBaseDir, getVaultDir } = await import("../config/paths.ts");
    const { ensureDir } = await import("../lib/file-system.ts");
    const { VAULT_DIR_MODE, CONFIG_FILE_MODE, KEY_FILE_MODE, WALLETS_FILE_MODE } = await import("../config/constants.ts");
    const { join } = await import("node:path");

    const backupData = readFileSync(file, "utf-8");
    const backup = JSON.parse(backupData);

    ensureDir(getBaseDir(), VAULT_DIR_MODE);
    ensureDir(getVaultDir(), VAULT_DIR_MODE);

    writeFileSync(join(getBaseDir(), "config.json"), JSON.stringify(backup.config, null, 2), { mode: CONFIG_FILE_MODE });
    writeFileSync(join(getBaseDir(), "wallets.json"), JSON.stringify(backup.wallets, null, 2), { mode: WALLETS_FILE_MODE });

    for (const [id, data] of Object.entries(backup.keys)) {
      writeFileSync(join(getVaultDir(), `${id}.enc`), data as string, { mode: KEY_FILE_MODE });
    }

    const walletCount = backup.wallets?.wallets?.length ?? 0;
    console.log(`✅ Restored ${walletCount} wallet(s) from backup.`);
  });

program.parse();
