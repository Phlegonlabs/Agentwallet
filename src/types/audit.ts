export type AuditEvent =
  | "VAULT_INIT"
  | "SESSION_UNLOCK"
  | "SESSION_LOCK"
  | "WALLET_CREATE"
  | "WALLET_DELETE"
  | "WALLET_LABEL"
  | "PRIVATE_KEY_EXPORT"
  | "MNEMONIC_EXPORT"
  | "TRANSFER"
  | "TRANSFER_BLOCKED"
  | "SIGN"
  | "X402_SIGN"
  | "BALANCE_QUERY"
  | "VAULT_HARDEN"
  | "BACKUP_CREATE"
  | "BACKUP_RESTORE"
  | "WHITELIST_ADD"
  | "WHITELIST_REMOVE"
  | "GUARD_UPDATE"
  | "TOTP_ENABLE"
  | "TOTP_DISABLE";

export type AuditSeverity = "info" | "warn" | "critical";

export interface AuditEntry {
  timestamp: string;
  event: AuditEvent;
  severity: AuditSeverity;
  status: "success" | "failure";
  data: Record<string, string | number | boolean | null>;
}

const CRITICAL_EVENTS: ReadonlySet<AuditEvent> = new Set([
  "PRIVATE_KEY_EXPORT",
  "MNEMONIC_EXPORT",
  "WALLET_DELETE",
  "BACKUP_RESTORE",
  "TOTP_ENABLE",
  "TOTP_DISABLE",
]);

const WARN_EVENTS: ReadonlySet<AuditEvent> = new Set([
  "TRANSFER",
  "TRANSFER_BLOCKED",
  "SIGN",
  "X402_SIGN",
  "SESSION_UNLOCK",
  "WHITELIST_ADD",
  "WHITELIST_REMOVE",
  "GUARD_UPDATE",
]);

export function eventSeverity(event: AuditEvent): AuditSeverity {
  if (CRITICAL_EVENTS.has(event)) return "critical";
  if (WARN_EVENTS.has(event)) return "warn";
  return "info";
}
