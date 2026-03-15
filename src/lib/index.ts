export {
  generateSalt,
  deriveKey,
  encrypt,
  decrypt,
  toBase64,
  fromBase64,
} from "./crypto.ts";
export {
  generateMnemonic,
  deriveEVMWallet,
  deriveSolanaWallet,
} from "./key-derivation.ts";
export type { DerivedWallet } from "./key-derivation.ts";
export {
  ensureDir,
  secureWrite,
  secureRead,
  secureDelete,
  exists,
} from "./file-system.ts";
export { zeroize, toHex, toBase58 } from "./memory-guard.ts";
