/** Transfer guard configuration */
export interface TransferGuards {
  /** Per-transaction limit in native token units */
  perTransaction: string;
  /** Daily total limit in native token units */
  dailyTotal: string;
}

/** Whitelisted address entry */
export interface WhitelistEntry {
  /** Blockchain address */
  address: string;
  /** Human-readable label */
  label: string;
  /** ISO timestamp when added */
  addedAt: string;
  /** ISO timestamp until which transfers are blocked (cooldown) */
  cooldownUntil: string;
}

/** Whitelist configuration */
export interface WhitelistConfig {
  /** Whether whitelist enforcement is enabled */
  enabled: boolean;
  /** Whitelisted addresses */
  addresses: WhitelistEntry[];
  /** Cooldown period in hours before a new address becomes active */
  cooldownHours: number;
}

/** Rate limiting configuration */
export interface RateLimitConfig {
  /** Maximum transfers allowed per hour */
  maxTransfersPerHour: number;
}

/** Full guards configuration stored in guards.json */
export interface GuardsConfig {
  transferLimits: TransferGuards;
  whitelist: WhitelistConfig;
  rateLimiting: RateLimitConfig;
}

/** Transfer log entry for tracking daily spending and rate */
export interface TransferLogEntry {
  /** ISO timestamp */
  timestamp: string;
  /** Amount transferred in native token units */
  amount: string;
}

/** Transfer log stored in transfer-log.json */
export interface TransferLog {
  entries: TransferLogEntry[];
}
