/** TOTP configuration stored alongside vault config */
export interface TotpConfig {
  /** Base32-encoded TOTP secret */
  secret: string;
  /** Hashed recovery codes (SHA-256, hex) */
  recoveryCodes: string[];
  /** ISO timestamp when TOTP was enabled */
  enabledAt: string;
}
