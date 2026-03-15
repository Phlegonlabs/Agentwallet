import sodium from "libsodium-wrappers-sumo";
import {
  encrypt,
  decrypt,
  toBase64,
  fromBase64,
  secureWrite,
  secureRead,
  secureDelete,
  exists,
  deriveKey,
  zeroize,
} from "../lib/index.ts";
import { getSessionPath, CONFIG_FILE_MODE } from "../config/index.ts";
import { retrieveMnemonic, loadConfig } from "./vault-service.ts";
import type { Result } from "../types/index.ts";
import { ok, err } from "../types/index.ts";
import type {
  SessionTokenString,
  SessionFile,
  SessionTokenResult,
} from "../types/session.ts";
import {
  SESSION_DEFAULT_TTL_SECONDS,
  SESSION_MIN_TTL_SECONDS,
  SESSION_MAX_TTL_SECONDS,
} from "../types/session.ts";

/**
 * Unlock the vault and create a session token.
 * The derived key is encrypted with a key derived from the token itself,
 * so the token is required to decrypt it later.
 */
export async function unlock(
  masterPassword: string,
  ttlSeconds: number = SESSION_DEFAULT_TTL_SECONDS
): Promise<Result<SessionTokenResult>> {
  // Validate TTL
  if (ttlSeconds < SESSION_MIN_TTL_SECONDS || ttlSeconds > SESSION_MAX_TTL_SECONDS) {
    return err(
      new Error(`TTL must be between ${SESSION_MIN_TTL_SECONDS} and ${SESSION_MAX_TTL_SECONDS} seconds`)
    );
  }

  // Verify password by attempting to retrieve mnemonic
  const mnemonicResult = await retrieveMnemonic(masterPassword);
  if (!mnemonicResult.ok) {
    return err(new Error("Invalid master password"));
  }

  // Load vault config for salt
  const configResult = loadConfig();
  if (!configResult.ok) return configResult;
  const config = configResult.value;

  // Derive the encryption key from the master password
  const salt = await fromBase64(config.salt);
  const derivedKey = await deriveKey(masterPassword, salt);

  try {
    await sodium.ready;

    // Generate token: awlt_ + 32 random bytes as hex
    const tokenBytes = sodium.randombytes_buf(32);
    const token = `awlt_${Buffer.from(tokenBytes).toString("hex")}` as SessionTokenString;

    // Hash the token for storage (never store raw token)
    const tokenHash = sodium.crypto_generichash(
      32,
      sodium.from_string(token),
      null
    );
    const tokenHashB64 = await toBase64(tokenHash);

    // Derive an encryption key from the token to encrypt the derived key
    const tokenKey = sodium.crypto_generichash(
      sodium.crypto_secretbox_KEYBYTES,
      sodium.from_string(token),
      sodium.from_string("agentwallet-session-v1")
    );

    // Encrypt the derived key with the token-derived key
    const { ciphertext, nonce } = await encrypt(derivedKey, tokenKey);

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    const sessionFile: SessionFile = {
      tokenHash: tokenHashB64,
      encryptedDerivedKey: await toBase64(ciphertext),
      nonce: await toBase64(nonce),
      salt: config.salt,
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    // Write session file
    secureWrite(
      getSessionPath(),
      JSON.stringify(sessionFile, null, 2),
      CONFIG_FILE_MODE
    );

    // Zeroize sensitive material
    await zeroize(tokenKey);
    await zeroize(tokenBytes);

    return ok({ token, expiresAt });
  } finally {
    await zeroize(derivedKey);
  }
}

/**
 * Validate a session token and return the derived encryption key.
 * The caller is responsible for zeroizing the returned key.
 */
export async function validateSession(
  token: string
): Promise<Result<Uint8Array>> {
  if (!token.startsWith("awlt_")) {
    return err(new Error("Invalid token format (must start with awlt_)"));
  }

  const sessionPath = getSessionPath();
  if (!exists(sessionPath)) {
    return err(new Error("No active session. Run 'agentwallet unlock' first."));
  }

  const fileResult = secureRead(sessionPath);
  if (!fileResult.ok) {
    return err(new Error("Failed to read session file"));
  }

  const session = JSON.parse(fileResult.value) as SessionFile;

  // Check TTL
  if (new Date(session.expiresAt) < new Date()) {
    // Session expired — clean up
    secureDelete(sessionPath);
    return err(new Error("Session expired. Run 'agentwallet unlock' again."));
  }

  await sodium.ready;

  // Verify token hash
  const tokenHash = sodium.crypto_generichash(
    32,
    sodium.from_string(token),
    null
  );
  const storedHash = await fromBase64(session.tokenHash);

  if (!sodium.memcmp(tokenHash, storedHash)) {
    return err(new Error("Invalid session token"));
  }

  // Derive the token key and decrypt the derived key
  const tokenKey = sodium.crypto_generichash(
    sodium.crypto_secretbox_KEYBYTES,
    sodium.from_string(token),
    sodium.from_string("agentwallet-session-v1")
  );

  const ciphertext = await fromBase64(session.encryptedDerivedKey);
  const nonce = await fromBase64(session.nonce);
  const result = await decrypt(ciphertext, nonce, tokenKey);

  await zeroize(tokenKey);

  if (!result.ok) {
    return err(new Error("Session token validation failed — corrupted session"));
  }

  return ok(result.value);
}

/**
 * Lock the session — securely delete the session file.
 */
export function lock(): Result<void> {
  const sessionPath = getSessionPath();
  if (!exists(sessionPath)) {
    return ok(undefined); // Already locked
  }
  secureDelete(sessionPath);
  return ok(undefined);
}

/**
 * Resolve master password from either --token flag or interactive prompt.
 * If a token is provided, validates the session; otherwise uses the password directly.
 * Returns the master password string (for commands that need it).
 */
export async function resolveAuth(
  token: string | undefined,
  promptFn: () => Promise<string>
): Promise<Result<string>> {
  if (token) {
    // Token-based auth: we validate the session exists and is valid,
    // but we can't recover the master password from the token.
    // Instead, commands that use resolveAuth should use resolveKey for signing.
    const sessionValid = await validateSession(token);
    if (!sessionValid.ok) return sessionValid;
    await zeroize(sessionValid.value);
    // Return a sentinel that indicates token auth was used
    return ok(`__session_token__:${token}`);
  }
  const pwd = await promptFn();
  return ok(pwd);
}

/**
 * Get the derived encryption key from either a token or a master password.
 * The caller is responsible for zeroizing the returned key.
 */
export async function resolveKey(
  authString: string
): Promise<Result<Uint8Array>> {
  if (authString.startsWith("__session_token__:")) {
    const token = authString.slice("__session_token__:".length);
    return validateSession(token);
  }

  // It's a master password — derive the key
  const configResult = loadConfig();
  if (!configResult.ok) return configResult;

  const salt = await fromBase64(configResult.value.salt);
  const key = await deriveKey(authString, salt);
  return ok(key);
}
