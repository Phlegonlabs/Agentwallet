import {
  generateTotpSecret,
  getTotpUri,
  verifyTotpCode,
  generateRecoveryCodes,
  hashRecoveryCode,
  renderQrCode,
} from "../lib/index.ts";
import { secureRead, secureWrite, secureDelete, exists } from "../lib/index.ts";
import { getTotpConfigPath, TOTP_FILE_MODE } from "../config/index.ts";
import type { TotpConfig } from "../types/index.ts";
import type { Result } from "../types/index.ts";
import { ok, err } from "../types/index.ts";

/** Check if TOTP is enabled */
export function isTotpEnabled(): boolean {
  return exists(getTotpConfigPath());
}

/** Load TOTP config from disk */
function loadTotpConfig(): Result<TotpConfig> {
  const configPath = getTotpConfigPath();
  if (!exists(configPath)) {
    return err(new Error("TOTP is not enabled"));
  }
  const result = secureRead(configPath);
  if (!result.ok) return err(new Error("Failed to read TOTP config"));
  return ok(JSON.parse(result.value) as TotpConfig);
}

/** Save TOTP config to disk */
function saveTotpConfig(config: TotpConfig): void {
  secureWrite(
    getTotpConfigPath(),
    JSON.stringify(config, null, 2),
    TOTP_FILE_MODE
  );
}

export interface TotpEnableResult {
  /** QR code rendered as terminal text */
  qrCode: string;
  /** TOTP URI for manual entry */
  uri: string;
  /** Plaintext recovery codes (show once, then hash) */
  recoveryCodes: string[];
}

/**
 * Begin TOTP enrollment — generates secret, QR code, and recovery codes.
 * The caller must verify the user's first TOTP code before calling confirmTotpEnable.
 */
export async function beginTotpEnable(
  accountName: string = "agentwallet"
): Promise<Result<TotpEnableResult & { secret: string }>> {
  if (isTotpEnabled()) {
    return err(
      new Error("TOTP is already enabled. Disable it first to re-enroll.")
    );
  }

  const secret = generateTotpSecret();
  const uri = getTotpUri(secret, accountName);
  const qrCode = await renderQrCode(uri);
  const recoveryCodes = generateRecoveryCodes();

  return ok({ secret, qrCode, uri, recoveryCodes });
}

/**
 * Confirm TOTP enrollment after user provides a valid code.
 * Persists the TOTP config with hashed recovery codes.
 */
export async function confirmTotpEnable(
  secret: string,
  code: string,
  recoveryCodes: string[]
): Promise<Result<void>> {
  if (!verifyTotpCode(secret, code)) {
    return err(new Error("Invalid TOTP code. Enrollment cancelled."));
  }

  // Hash recovery codes for storage
  const hashedCodes: string[] = [];
  for (const rc of recoveryCodes) {
    hashedCodes.push(await hashRecoveryCode(rc));
  }

  const config: TotpConfig = {
    secret,
    recoveryCodes: hashedCodes,
    enabledAt: new Date().toISOString(),
  };
  saveTotpConfig(config);
  return ok(undefined);
}

/** Disable TOTP (requires valid code or recovery code) */
export async function disableTotp(
  code: string
): Promise<Result<void>> {
  const configResult = loadTotpConfig();
  if (!configResult.ok) return configResult;
  const config = configResult.value;

  // Try TOTP code first
  if (verifyTotpCode(config.secret, code)) {
    secureDelete(getTotpConfigPath());
    return ok(undefined);
  }

  // Try recovery code
  const codeHash = await hashRecoveryCode(code);
  const idx = config.recoveryCodes.indexOf(codeHash);
  if (idx !== -1) {
    secureDelete(getTotpConfigPath());
    return ok(undefined);
  }

  return err(new Error("Invalid TOTP code or recovery code"));
}

/**
 * Verify a TOTP code or recovery code.
 * If a recovery code is used, it is consumed (one-time use).
 */
export async function verifyTotp(code: string): Promise<Result<void>> {
  const configResult = loadTotpConfig();
  if (!configResult.ok) return configResult;
  const config = configResult.value;

  // Try TOTP code
  if (verifyTotpCode(config.secret, code)) {
    return ok(undefined);
  }

  // Try recovery code
  const codeHash = await hashRecoveryCode(code);
  const idx = config.recoveryCodes.indexOf(codeHash);
  if (idx !== -1) {
    // Consume the recovery code
    config.recoveryCodes.splice(idx, 1);
    saveTotpConfig(config);
    return ok(undefined);
  }

  return err(new Error("Invalid TOTP code or recovery code"));
}

/** Get TOTP status info */
export function getTotpStatus(): {
  enabled: boolean;
  enabledAt?: string;
  remainingRecoveryCodes?: number;
} {
  if (!isTotpEnabled()) return { enabled: false };
  const configResult = loadTotpConfig();
  if (!configResult.ok) return { enabled: false };
  return {
    enabled: true,
    enabledAt: configResult.value.enabledAt,
    remainingRecoveryCodes: configResult.value.recoveryCodes.length,
  };
}
