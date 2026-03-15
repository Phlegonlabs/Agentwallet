#!/usr/bin/env node
import { Command } from "commander";
import { password, select, confirm, input } from "@inquirer/prompts";
import {
  initVault,
  isVaultInitialized,
  createWallet,
  createAllWallets,
  listWallets,
  labelWallet,
  deleteWallet,
  transfer,
  signTransaction,
  getBalance,
} from "../services/index.ts";
import { exportPrivateKey, exportMnemonic } from "../services/wallet-service.ts";
import { SUPPORTED_CHAINS } from "../config/index.ts";
import { backupAction, restoreAction } from "./backup-restore.ts";

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
      process.stdout.write("Vault already initialized.\n");
      return;
    }

    const masterPassword = await password({
      message: "Set your master password:",
    });
    const confirmPassword = await password({
      message: "Confirm master password:",
    });

    if (masterPassword !== confirmPassword) {
      process.stderr.write("Passwords do not match.\n");
      process.exit(1);
    }

    if (masterPassword.length < 8) {
      process.stderr.write("Password must be at least 8 characters.\n");
      process.exit(1);
    }

    const result = await initVault(masterPassword);
    if (!result.ok) {
      process.stderr.write(result.error.message + "\n");
      process.exit(1);
    }

    process.stdout.write("Vault initialized at ~/.agentwallet/\n");
    process.stdout.write("   Your master password encrypts all private keys.\n");
    process.stdout.write("   If you lose it, your keys cannot be recovered.\n");
  });

// ─── create ────────────────────────────────────────
program
  .command("create")
  .description("Create a new wallet")
  .option("-c, --chain <chain>", "Chain name (ethereum, polygon, bsc, base, arbitrum, optimism, avalanche, fantom, xlayer, scroll, solana, ton, all)")
  .option("-n, --count <count>", "Number of wallets to create", "1")
  .action(async (opts: { chain?: string; count: string }) => {
    if (!isVaultInitialized()) {
      process.stderr.write("Vault not initialized. Run 'agentwallet init' first.\n");
      process.exit(1);
    }

    const masterPassword = await password({
      message: "Enter master password:",
    });

    const count = parseInt(opts.count, 10);
    if (isNaN(count) || count < 1) {
      process.stderr.write("Invalid count. Must be a positive integer.\n");
      process.exit(1);
    }

    // Determine chain selection
    let chainId = opts.chain;
    if (!chainId) {
      chainId = await select({
        message: "Select chain:",
        choices: [
          ...SUPPORTED_CHAINS.map((c) => ({ name: c.name, value: c.id })),
          { name: "All chains (EVM + Solana + TON)", value: "all" },
        ],
      });
    }

    for (let i = 0; i < count; i++) {
      if (chainId === "all") {
        const result = await createAllWallets(masterPassword);
        if (!result.ok) {
          process.stderr.write(result.error.message + "\n");
          process.exit(1);
        }
        process.stdout.write(`\nWallet group ${i + 1}/${count} created:\n`);
        for (const w of result.value) {
          process.stdout.write(`   ${w.chainName.padEnd(12)} ${w.address}\n`);
        }
      } else {
        const result = await createWallet(chainId, masterPassword);
        if (!result.ok) {
          process.stderr.write(result.error.message + "\n");
          process.exit(1);
        }
        process.stdout.write(`\n${result.value.chainName} wallet ${i + 1}/${count} created:\n`);
        process.stdout.write(`   Address: ${result.value.address}\n`);
      }
    }

    process.stdout.write("\n   Private keys encrypted and stored in ~/.agentwallet/vault/\n");
  });

// ─── list ──────────────────────────────────────────
program
  .command("list")
  .description("List all wallets")
  .action(() => {
    const wallets = listWallets();
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

// ─── export (TTY-gated) ───────────────────────────
program
  .command("export <address>")
  .description("Export a wallet's private key (interactive terminal only)")
  .action(async (address: string) => {
    if (!process.stdin.isTTY) {
      process.stderr.write("Error: 'export' requires an interactive terminal (TTY).\n");
      process.stderr.write("This command is blocked in non-interactive mode for security.\n");
      process.exit(1);
    }

    const masterPassword = await password({
      message: "Enter master password:",
    });

    const result = await exportPrivateKey(address, masterPassword);
    if (!result.ok) {
      process.stderr.write(result.error.message + "\n");
      process.exit(1);
    }

    process.stdout.write("\n  Private key (will clear in 10 seconds):\n\n");
    process.stdout.write(`  ${result.value}\n`);

    // Auto-clear after 10 seconds
    setTimeout(() => {
      process.stdout.write("\x1b[2A\x1b[2K\x1b[1B\x1b[2K\x1b[1A");
      process.stdout.write("  [Private key cleared from terminal]\n");
    }, 10_000);

    // Keep process alive for the timeout
    await new Promise((resolve) => setTimeout(resolve, 11_000));
  });

// ─── mnemonic (TTY-gated) ─────────────────────────
program
  .command("mnemonic")
  .description("Display your mnemonic phrase (interactive terminal only)")
  .action(async () => {
    if (!process.stdin.isTTY) {
      process.stderr.write("Error: 'mnemonic' requires an interactive terminal (TTY).\n");
      process.stderr.write("This command is blocked in non-interactive mode for security.\n");
      process.exit(1);
    }

    const masterPassword = await password({
      message: "Enter master password:",
    });

    const result = await exportMnemonic(masterPassword);
    if (!result.ok) {
      process.stderr.write(result.error.message + "\n");
      process.exit(1);
    }

    process.stdout.write("\n  Mnemonic phrase (will clear in 10 seconds):\n\n");
    process.stdout.write(`  ${result.value}\n`);

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
  .action(async (opts: { tx?: string }) => {
    if (!isVaultInitialized()) {
      process.stderr.write("Vault not initialized. Run 'agentwallet init' first.\n");
      process.exit(1);
    }

    let txJson: string;
    if (opts.tx) {
      txJson = opts.tx;
    } else if (!process.stdin.isTTY) {
      // Read from stdin pipe
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      txJson = Buffer.concat(chunks).toString("utf-8").trim();
    } else {
      txJson = await input({ message: "Paste unsigned transaction JSON:" });
    }

    let parsed: { walletAddress: string; transaction: unknown };
    try {
      parsed = JSON.parse(txJson);
    } catch {
      process.stderr.write("Invalid JSON input.\n");
      process.exit(1);
    }

    if (!parsed.walletAddress || !parsed.transaction) {
      process.stderr.write('JSON must contain "walletAddress" and "transaction" fields.\n');
      process.exit(1);
    }

    const masterPassword = await password({
      message: "Enter master password:",
    });

    const result = await signTransaction({
      walletAddress: parsed.walletAddress,
      transaction: parsed.transaction as import("../types/index.ts").UnsignedTransaction,
      masterPassword,
    });

    if (!result.ok) {
      process.stderr.write(result.error.message + "\n");
      process.exit(1);
    }

    // Output signed transaction as JSON (machine-readable for skill integration)
    process.stdout.write(JSON.stringify(result.value, null, 2) + "\n");
  });

// ─── balance ──────────────────────────────────────
program
  .command("balance <address>")
  .description("Query on-chain balance for a wallet (no private key needed)")
  .action(async (address: string) => {
    const result = await getBalance(address);
    if (!result.ok) {
      process.stderr.write(result.error.message + "\n");
      process.exit(1);
    }

    process.stdout.write(
      `\n  ${result.value.address}\n` +
      `  Balance: ${result.value.balance} ${result.value.symbol}\n` +
      `  Chain:   ${result.value.chainId}\n\n`
    );
  });

// ─── label ─────────────────────────────────────────
program
  .command("label <address> <name>")
  .description("Set a label for a wallet")
  .action((address: string, name: string) => {
    const result = labelWallet(address, name);
    if (!result.ok) {
      process.stderr.write(result.error.message + "\n");
      process.exit(1);
    }
    process.stdout.write(`Label "${name}" set for ${result.value.chainName} wallet ${address}\n`);
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
      process.stderr.write(`Wallet not found: ${address}\n`);
      process.exit(1);
    }

    const confirmed = await confirm({
      message: `Delete ${wallet.chainName} wallet ${address}? This cannot be undone.`,
      default: false,
    });

    if (!confirmed) {
      process.stdout.write("Cancelled.\n");
      return;
    }

    const result = deleteWallet(address);
    if (!result.ok) {
      process.stderr.write(result.error.message + "\n");
      process.exit(1);
    }
    process.stdout.write(`Wallet ${address} securely deleted.\n`);
  });

// ─── transfer ─────────────────────────────────────
program
  .command("transfer")
  .description("Transfer native tokens (ETH, SOL, TON, etc.)")
  .requiredOption("-f, --from <address>", "Sender wallet address")
  .requiredOption("-t, --to <address>", "Recipient address")
  .requiredOption("-a, --amount <amount>", "Amount to send (e.g. 0.01)")
  .action(async (opts: { from: string; to: string; amount: string }) => {
    if (!isVaultInitialized()) {
      process.stderr.write("Vault not initialized. Run 'agentwallet init' first.\n");
      process.exit(1);
    }

    const masterPassword = await password({
      message: "Enter master password:",
    });

    const confirmed = await confirm({
      message: `Send ${opts.amount} from ${opts.from} to ${opts.to}?`,
      default: false,
    });
    if (!confirmed) {
      process.stdout.write("Cancelled.\n");
      return;
    }

    process.stdout.write("Building, signing, and broadcasting...\n");
    const result = await transfer({
      from: opts.from,
      to: opts.to,
      amount: opts.amount,
      masterPassword,
    });

    if (!result.ok) {
      process.stderr.write(result.error.message + "\n");
      process.exit(1);
    }

    process.stdout.write(
      `\nTransfer complete!\n` +
      `   Chain:   ${result.value.chain}\n` +
      `   From:    ${result.value.from}\n` +
      `   To:      ${result.value.to}\n` +
      `   Amount:  ${result.value.amount}\n` +
      `   Tx Hash: ${result.value.txHash}\n`
    );
  });

// ─── backup ────────────────────────────────────────
program
  .command("backup")
  .description("Export an encrypted backup of all wallets")
  .action(backupAction);

// ─── restore ───────────────────────────────────────
program
  .command("restore <file>")
  .description("Restore wallets from an encrypted backup")
  .action(restoreAction);

program.parse();
