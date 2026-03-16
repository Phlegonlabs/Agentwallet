import { TOTP, Secret } from "otpauth";
import {
  TOTP_ISSUER,
  TOTP_ALGORITHM,
  TOTP_DIGITS,
  TOTP_PERIOD,
  TOTP_RECOVERY_CODE_COUNT,
} from "../config/index.ts";

/** Generate a new TOTP secret (base32 string) */
export function generateTotpSecret(): string {
  const secret = new Secret({ size: 20 });
  return secret.base32;
}

/** Generate a TOTP URI for QR code scanning */
export function getTotpUri(secretBase32: string, accountName: string): string {
  const totp = new TOTP({
    issuer: TOTP_ISSUER,
    label: accountName,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: Secret.fromBase32(secretBase32),
  });
  return totp.toString();
}

/** Verify a TOTP code (allows +/- 1 window for clock drift) */
export function verifyTotpCode(
  secretBase32: string,
  code: string
): boolean {
  const totp = new TOTP({
    issuer: TOTP_ISSUER,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: Secret.fromBase32(secretBase32),
  });
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

/** Generate N recovery codes as hex strings */
export function generateRecoveryCodes(
  count: number = TOTP_RECOVERY_CODE_COUNT
): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    codes.push(
      Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );
  }
  return codes;
}

/** Hash a recovery code with SHA-256 for storage */
export async function hashRecoveryCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Render TOTP URI as QR code in terminal (text art) */
export async function renderQrCode(uri: string): Promise<string> {
  const QRCode = await import("qrcode");
  return QRCode.toString(uri, { type: "terminal", small: true });
}
