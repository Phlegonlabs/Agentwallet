import { password, confirm } from "@inquirer/prompts";
import {
  isVaultInitialized,
  listWallets,
} from "../services/index.ts";
import { exportMnemonic } from "../services/wallet-service.ts";
import { logAudit } from "../lib/index.ts";

/** Backup command handler */
export async function backupAction(): Promise<void> {
  const masterPassword = await password({
    message: "Enter master password:",
  });

  const mnemonicResult = await exportMnemonic(masterPassword);
  if (!mnemonicResult.ok) {
    process.stderr.write("Wrong password or no wallets to backup.\n");
    process.exit(1);
  }

  const { readFileSync, writeFileSync } = await import("node:fs");
  const { getBaseDir } = await import("../config/paths.ts");
  const { join } = await import("node:path");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(process.cwd(), `agentwallet-backup-${timestamp}.json`);

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
  logAudit("BACKUP_CREATE", "success", { walletCount: wallets.length });
  process.stdout.write(`Backup saved to: ${backupPath}\n`);
  process.stdout.write("   This file contains encrypted data — keep it safe.\n");
}

/** Restore command handler */
export async function restoreAction(file: string): Promise<void> {
  if (isVaultInitialized()) {
    const overwrite = await confirm({
      message: "Vault already exists. Overwrite with backup data?",
      default: false,
    });
    if (!overwrite) {
      process.stdout.write("Cancelled.\n");
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
  logAudit("BACKUP_RESTORE", "success", { walletCount });
  process.stdout.write(`Restored ${walletCount} wallet(s) from backup.\n`);
}
