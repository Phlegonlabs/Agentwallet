export interface VaultConfig {
  /** Argon2id salt for master password derivation (base64) */
  salt: string;
  /** Encrypted mnemonic blob (base64) */
  encryptedMnemonic: string;
  /** Nonce used for mnemonic encryption (base64) */
  mnemonicNonce: string;
  /** Vault format version */
  version: number;
  /** Creation timestamp */
  createdAt: string;
}

export interface EncryptedKeyFile {
  /** Encrypted private key (base64) */
  ciphertext: string;
  /** Nonce (base64) */
  nonce: string;
  /** Wallet ID reference */
  walletId: string;
}
