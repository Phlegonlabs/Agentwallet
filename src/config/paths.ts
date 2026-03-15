import { join } from "node:path";
import { homedir } from "node:os";

const AGENTWALLET_DIR = ".agentwallet";

export function getBaseDir(): string {
  return join(homedir(), AGENTWALLET_DIR);
}

export function getVaultDir(): string {
  return join(getBaseDir(), "vault");
}

export function getConfigPath(): string {
  return join(getBaseDir(), "config.json");
}

export function getWalletsPath(): string {
  return join(getBaseDir(), "wallets.json");
}

export function getKeyFilePath(walletId: string): string {
  return join(getVaultDir(), `${walletId}.enc`);
}

export function getBackupPath(timestamp: string): string {
  return join(getBaseDir(), `backup-${timestamp}.enc`);
}

export function getSessionPath(): string {
  return join(getBaseDir(), ".session");
}

export function getAuditLogDir(): string {
  return join(getBaseDir(), "logs");
}

export function getAuditLogPath(date?: string): string {
  const d = date ?? new Date().toISOString().slice(0, 10);
  return join(getAuditLogDir(), `audit-${d}.jsonl`);
}

export function getMasterKeyPath(): string {
  return join(getBaseDir(), "master.key");
}
