/** Session token string (awlt_ prefix + 64 hex chars) */
export type SessionTokenString = `awlt_${string}`;

/** Persisted session file at ~/.agentwallet/.session */
export interface SessionFile {
  /** SHA-256 hash of the token (never store raw token) */
  tokenHash: string;
  /** Encrypted derived key (XSalsa20-Poly1305, keyed by token-derived key) */
  encryptedDerivedKey: string;
  /** Nonce for the encrypted derived key */
  nonce: string;
  /** Salt from vault config (needed to verify) */
  salt: string;
  /** ISO timestamp when this session expires */
  expiresAt: string;
  /** ISO timestamp when this session was created */
  createdAt: string;
}

/** Result of a successful unlock */
export interface SessionTokenResult {
  /** The session token to use with --token flag */
  token: SessionTokenString;
  /** ISO timestamp when this session expires */
  expiresAt: string;
}

/** Session TTL constraints */
export const SESSION_MIN_TTL_SECONDS = 60;
export const SESSION_MAX_TTL_SECONDS = 86400; // 24 hours
export const SESSION_DEFAULT_TTL_SECONDS = 3600; // 1 hour
