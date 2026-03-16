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
  deriveTONWallet,
} from "./key-derivation.ts";
export type { DerivedWallet } from "./key-derivation.ts";
export {
  ensureDir,
  secureWrite,
  secureRead,
  secureDelete,
  exists,
  hardenPermissions,
} from "./file-system.ts";
export { zeroize, withSecureScope, toHex, toBase58 } from "./memory-guard.ts";
export { encodeERC20Transfer, buildSPLTransferInstructions } from "./token-encoding.ts";
export { logAudit, readAuditLog, pruneAuditLogs, filterBySeverity } from "./audit-log.ts";
export {
  generateTotpSecret,
  getTotpUri,
  verifyTotpCode,
  generateRecoveryCodes,
  hashRecoveryCode,
  renderQrCode,
} from "./totp.ts";
