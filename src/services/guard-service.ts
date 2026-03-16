import { secureRead, secureWrite, exists } from "../lib/index.ts";
import {
  getGuardsPath,
  getTransferLogPath,
  GUARDS_FILE_MODE,
  TRANSFER_LOG_FILE_MODE,
  DEFAULT_PER_TX_LIMIT,
  DEFAULT_DAILY_LIMIT,
  DEFAULT_COOLDOWN_HOURS,
  DEFAULT_MAX_TRANSFERS_PER_HOUR,
} from "../config/index.ts";
import type {
  GuardsConfig,
  WhitelistEntry,
  TransferLog,
  Result,
} from "../types/index.ts";
import { ok, err } from "../types/index.ts";

/** Return default guards config */
function defaultGuards(): GuardsConfig {
  return {
    transferLimits: {
      perTransaction: DEFAULT_PER_TX_LIMIT,
      dailyTotal: DEFAULT_DAILY_LIMIT,
    },
    whitelist: {
      enabled: false,
      addresses: [],
      cooldownHours: DEFAULT_COOLDOWN_HOURS,
    },
    rateLimiting: {
      maxTransfersPerHour: DEFAULT_MAX_TRANSFERS_PER_HOUR,
    },
  };
}

/** Load guards config from disk, returning defaults if not present */
export function loadGuards(): GuardsConfig {
  const guardsPath = getGuardsPath();
  if (!exists(guardsPath)) return defaultGuards();
  const result = secureRead(guardsPath);
  if (!result.ok) return defaultGuards();
  return JSON.parse(result.value) as GuardsConfig;
}

/** Save guards config to disk */
export function saveGuards(config: GuardsConfig): void {
  secureWrite(
    getGuardsPath(),
    JSON.stringify(config, null, 2),
    GUARDS_FILE_MODE
  );
}

/** Load transfer log from disk */
function loadTransferLog(): TransferLog {
  const logPath = getTransferLogPath();
  if (!exists(logPath)) return { entries: [] };
  const result = secureRead(logPath);
  if (!result.ok) return { entries: [] };
  return JSON.parse(result.value) as TransferLog;
}

/** Save transfer log to disk */
function saveTransferLog(log: TransferLog): void {
  secureWrite(
    getTransferLogPath(),
    JSON.stringify(log, null, 2),
    TRANSFER_LOG_FILE_MODE
  );
}

/** Get today's date string (YYYY-MM-DD) */
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Get daily spent total (sum of today's transfers) */
export function getDailySpent(): string {
  const log = loadTransferLog();
  const today = todayStr();
  let total = 0;
  for (const entry of log.entries) {
    if (entry.timestamp.startsWith(today)) {
      total += Number.parseFloat(entry.amount);
    }
  }
  return total.toString();
}

/** Count transfers in the last hour */
export function getTransferCountThisHour(): number {
  const log = loadTransferLog();
  const oneHourAgo = Date.now() - 3600_000;
  let count = 0;
  for (const entry of log.entries) {
    if (new Date(entry.timestamp).getTime() >= oneHourAgo) {
      count++;
    }
  }
  return count;
}

/** Record a completed transfer */
export function recordTransfer(amount: string): void {
  const log = loadTransferLog();
  log.entries.push({
    timestamp: new Date().toISOString(),
    amount,
  });
  // Prune entries older than 24 hours to keep file small
  const oneDayAgo = Date.now() - 86_400_000;
  log.entries = log.entries.filter(
    (e) => new Date(e.timestamp).getTime() >= oneDayAgo
  );
  saveTransferLog(log);
}

/**
 * Check if a transfer is allowed by guard rules.
 * Returns ok(undefined) if allowed, err with reason if blocked.
 */
export function checkTransferAllowed(
  to: string,
  amount: string
): Result<void> {
  const guards = loadGuards();
  const amountNum = Number.parseFloat(amount);

  // Check per-transaction limit
  const perTxLimit = Number.parseFloat(guards.transferLimits.perTransaction);
  if (amountNum > perTxLimit) {
    return err(
      new Error(
        `Transfer exceeds per-transaction limit (${guards.transferLimits.perTransaction})`
      )
    );
  }

  // Check daily total limit
  const dailySpent = Number.parseFloat(getDailySpent());
  const dailyLimit = Number.parseFloat(guards.transferLimits.dailyTotal);
  if (dailySpent + amountNum > dailyLimit) {
    return err(
      new Error(
        `Transfer would exceed daily limit (${guards.transferLimits.dailyTotal}). ` +
          `Already spent today: ${dailySpent}`
      )
    );
  }

  // Check whitelist (if enabled)
  if (guards.whitelist.enabled) {
    const entry = guards.whitelist.addresses.find(
      (a) => a.address.toLowerCase() === to.toLowerCase()
    );
    if (!entry) {
      return err(
        new Error(
          `Address ${to} is not on the whitelist. ` +
            `Add it with: agentwallet guard whitelist-add ${to}`
        )
      );
    }
    // Check cooldown
    if (new Date(entry.cooldownUntil) > new Date()) {
      return err(
        new Error(
          `Address ${to} is in cooldown until ${entry.cooldownUntil}. ` +
            `Wait before transferring.`
        )
      );
    }
  }

  // Check rate limiting
  const transfersThisHour = getTransferCountThisHour();
  if (transfersThisHour >= guards.rateLimiting.maxTransfersPerHour) {
    return err(
      new Error(
        `Rate limit exceeded (${guards.rateLimiting.maxTransfersPerHour} transfers/hour). ` +
          `Try again later.`
      )
    );
  }

  return ok(undefined);
}

/** Add an address to the whitelist with a cooldown period */
export function addWhitelistAddress(
  address: string,
  label: string
): Result<void> {
  const guards = loadGuards();
  const existing = guards.whitelist.addresses.find(
    (a) => a.address.toLowerCase() === address.toLowerCase()
  );
  if (existing) {
    return err(new Error(`Address ${address} is already on the whitelist`));
  }

  const now = new Date();
  const cooldownUntil = new Date(
    now.getTime() + guards.whitelist.cooldownHours * 3600_000
  );

  const entry: WhitelistEntry = {
    address,
    label,
    addedAt: now.toISOString(),
    cooldownUntil: cooldownUntil.toISOString(),
  };
  guards.whitelist.addresses.push(entry);
  saveGuards(guards);
  return ok(undefined);
}

/** Remove an address from the whitelist */
export function removeWhitelistAddress(address: string): Result<void> {
  const guards = loadGuards();
  const idx = guards.whitelist.addresses.findIndex(
    (a) => a.address.toLowerCase() === address.toLowerCase()
  );
  if (idx === -1) {
    return err(new Error(`Address ${address} not found on whitelist`));
  }
  guards.whitelist.addresses.splice(idx, 1);
  saveGuards(guards);
  return ok(undefined);
}
