import {
  generateSalt,
  deriveKey,
  encrypt,
  decrypt,
  toBase64,
  fromBase64,
  ensureDir,
  secureWrite,
  secureRead,
  exists,
  zeroize,
  hardenPermissions,
  generateMnemonic,
} from "../lib/index.ts";
import {
  getBaseDir,
  getVaultDir,
  getConfigPath,
  getKeyFilePath,
  getMasterKeyPath,
  VAULT_DIR_MODE,
  CONFIG_FILE_MODE,
  KEY_FILE_MODE,
  MASTER_KEY_FILE_MODE,
  VAULT_VERSION,
} from "../config/index.ts";
import type { VaultConfig, EncryptedKeyFile, Result, HardenReport } from "../types/index.ts";
import { ok, err } from "../types/index.ts";

/** Check if vault is initialized */
export function isVaultInitialized(): boolean {
  return exists(getConfigPath());
}

export interface InitVaultOptions {
  /** When true, auto-generate password and return as recoveryKey */
  autoPassword?: boolean;
  /** When true, persist auto-generated password to master.key (legacy) */
  persistKey?: boolean;
}

export interface InitVaultResult {
  /** Recovery key returned to caller (only when autoPassword, not persisted) */
  recoveryKey?: string;
  /** Path to auto-generated master.key (only when persistKey is true) */
  masterKeyPath?: string;
}

/** Initialize the vault with a master password */
export async function initVault(
  masterPassword: string,
  options?: InitVaultOptions
): Promise<Result<InitVaultResult>> {
  if (isVaultInitialized()) {
    return err(new Error("Vault already initialized. Use 'agentwallet export' to access keys."));
  }

  // Create directories
  ensureDir(getBaseDir(), VAULT_DIR_MODE);
  ensureDir(getVaultDir(), VAULT_DIR_MODE);

  // Auto-generate password if requested
  let password = masterPassword;
  let recoveryKey: string | undefined;
  let masterKeyPath: string | undefined;
  if (options?.autoPassword) {
    const { randomBytes } = await import("node:crypto");
    password = randomBytes(32).toString("hex");
    recoveryKey = password;
    // Only persist to disk if explicitly requested (legacy behavior)
    if (options.persistKey) {
      masterKeyPath = getMasterKeyPath();
      secureWrite(masterKeyPath, password, MASTER_KEY_FILE_MODE);
    }
  }

  // Generate salt and derive key
  const salt = await generateSalt();
  const key = await deriveKey(password, salt);

  // Generate mnemonic and encrypt it
  const mnemonic = generateMnemonic();
  const mnemonicBytes = new TextEncoder().encode(mnemonic);
  const { ciphertext, nonce } = await encrypt(mnemonicBytes, key);

  const config: VaultConfig = {
    salt: await toBase64(salt),
    encryptedMnemonic: await toBase64(ciphertext),
    mnemonicNonce: await toBase64(nonce),
    version: VAULT_VERSION,
    createdAt: new Date().toISOString(),
  };

  secureWrite(getConfigPath(), JSON.stringify(config, null, 2), CONFIG_FILE_MODE);

  await zeroize(key);
  await zeroize(mnemonicBytes);
  return ok({ recoveryKey, masterKeyPath });
}

/** Load the vault config */
export function loadConfig(): Result<VaultConfig> {
  const result = secureRead(getConfigPath());
  if (!result.ok) {
    return err(new Error("Vault not initialized. Run 'agentwallet init' first."));
  }
  return ok(JSON.parse(result.value) as VaultConfig);
}

/** Save updated vault config */
export function saveConfig(config: VaultConfig): void {
  secureWrite(getConfigPath(), JSON.stringify(config, null, 2), CONFIG_FILE_MODE);
}

/** Encrypt and store a mnemonic */
export async function storeMnemonic(
  mnemonic: string,
  auth: string | Uint8Array
): Promise<Result<void>> {
  const configResult = loadConfig();
  if (!configResult.ok) return configResult;

  const config = configResult.value;
  let key: Uint8Array;
  if (auth instanceof Uint8Array) {
    key = auth;
  } else {
    const salt = await fromBase64(config.salt);
    key = await deriveKey(auth, salt);
  }
  const mnemonicBytes = new TextEncoder().encode(mnemonic);
  const { ciphertext, nonce } = await encrypt(mnemonicBytes, key);

  config.encryptedMnemonic = await toBase64(ciphertext);
  config.mnemonicNonce = await toBase64(nonce);
  saveConfig(config);

  if (!(auth instanceof Uint8Array)) await zeroize(key);
  await zeroize(mnemonicBytes);
  return ok(undefined);
}

/** Decrypt and return the mnemonic */
export async function retrieveMnemonic(
  auth: string | Uint8Array
): Promise<Result<string>> {
  const configResult = loadConfig();
  if (!configResult.ok) return configResult;

  const config = configResult.value;
  if (!config.encryptedMnemonic) {
    return err(new Error("No mnemonic stored. Create a wallet first."));
  }

  let key: Uint8Array;
  if (auth instanceof Uint8Array) {
    key = auth;
  } else {
    const salt = await fromBase64(config.salt);
    key = await deriveKey(auth, salt);
  }
  const ciphertext = await fromBase64(config.encryptedMnemonic);
  const nonce = await fromBase64(config.mnemonicNonce);
  const result = await decrypt(ciphertext, nonce, key);

  if (!(auth instanceof Uint8Array)) await zeroize(key);

  if (!result.ok) return result;
  const mnemonic = new TextDecoder().decode(result.value);
  await zeroize(result.value);
  return ok(mnemonic);
}

/** Encrypt and store a private key */
export async function storePrivateKey(
  walletId: string,
  privateKey: Uint8Array,
  auth: string | Uint8Array
): Promise<Result<void>> {
  const configResult = loadConfig();
  if (!configResult.ok) return configResult;

  const config = configResult.value;
  let key: Uint8Array;
  if (auth instanceof Uint8Array) {
    key = auth;
  } else {
    const salt = await fromBase64(config.salt);
    key = await deriveKey(auth, salt);
  }
  const { ciphertext, nonce } = await encrypt(privateKey, key);

  const keyFile: EncryptedKeyFile = {
    ciphertext: await toBase64(ciphertext),
    nonce: await toBase64(nonce),
    walletId,
  };

  secureWrite(getKeyFilePath(walletId), JSON.stringify(keyFile, null, 2), KEY_FILE_MODE);

  if (!(auth instanceof Uint8Array)) await zeroize(key);
  return ok(undefined);
}

/** Decrypt and return a private key */
export async function retrievePrivateKey(
  walletId: string,
  auth: string | Uint8Array
): Promise<Result<Uint8Array>> {
  const keyFileResult = secureRead(getKeyFilePath(walletId));
  if (!keyFileResult.ok) {
    return err(new Error(`Key file not found for wallet ${walletId}`));
  }

  const keyFile = JSON.parse(keyFileResult.value) as EncryptedKeyFile;
  const configResult = loadConfig();
  if (!configResult.ok) return configResult;

  const config = configResult.value;
  let key: Uint8Array;
  if (auth instanceof Uint8Array) {
    key = auth;
  } else {
    const salt = await fromBase64(config.salt);
    key = await deriveKey(auth, salt);
  }
  const ciphertext = await fromBase64(keyFile.ciphertext);
  const nonce = await fromBase64(keyFile.nonce);
  const result = await decrypt(ciphertext, nonce, key);

  if (!(auth instanceof Uint8Array)) await zeroize(key);
  return result;
}

/** Audit and fix vault file/directory permissions */
export function hardenVault(): HardenReport {
  return hardenPermissions(getBaseDir(), getVaultDir(), VAULT_DIR_MODE, CONFIG_FILE_MODE);
}
