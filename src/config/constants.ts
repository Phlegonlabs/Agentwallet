/** Argon2id parameters */
export const ARGON2_OPS_LIMIT = 3;
export const ARGON2_MEM_LIMIT = 256 * 1024 * 1024; // 256MB

/** File permission modes */
export const VAULT_DIR_MODE = 0o700;
export const KEY_FILE_MODE = 0o400;
export const CONFIG_FILE_MODE = 0o600;
export const WALLETS_FILE_MODE = 0o600;
export const SESSION_FILE_MODE = 0o600;
export const MASTER_KEY_FILE_MODE = 0o600;

/** HD derivation paths */
export const EVM_HD_PATH = "m/44'/60'/0'/0";
export const SOLANA_HD_PATH = "m/44'/501'/0'/0'";
export const TON_HD_PATH = "m/44'/607'";

/** Vault format version */
export const VAULT_VERSION = 1;

/** Transfer guard defaults */
export const DEFAULT_PER_TX_LIMIT = "0.1";
export const DEFAULT_DAILY_LIMIT = "1.0";
export const DEFAULT_COOLDOWN_HOURS = 24;
export const DEFAULT_MAX_TRANSFERS_PER_HOUR = 10;
export const GUARDS_FILE_MODE = 0o600;
export const TRANSFER_LOG_FILE_MODE = 0o600;

/** TOTP constants */
export const TOTP_ISSUER = "AgentWallet";
export const TOTP_ALGORITHM = "SHA1" as const;
export const TOTP_DIGITS = 6;
export const TOTP_PERIOD = 30;
export const TOTP_RECOVERY_CODE_COUNT = 8;
export const TOTP_FILE_MODE = 0o600;
