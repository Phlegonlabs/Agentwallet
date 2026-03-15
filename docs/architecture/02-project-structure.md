## 2. Directory Structure

```text
agentwallet/
├── AGENTS.md / CLAUDE.md
├── README.md
├── package.json
├── src/
│   ├── types/
│   │   ├── index.ts          (barrel export)
│   │   ├── chain.ts          (ChainType, SupportedChain)
│   │   ├── wallet.ts         (Wallet, WalletStore)
│   │   ├── vault.ts          (VaultConfig, EncryptedKeyFile)
│   │   ├── transaction.ts    (UnsignedTransaction, SignedTransaction, SignRequest)
│   │   ├── session.ts        (SessionToken, SessionFile)
│   │   └── result.ts         (Result<T,E>, ok, err)
│   ├── config/
│   │   ├── index.ts
│   │   ├── chains.ts         (SUPPORTED_CHAINS — 12 chains)
│   │   ├── constants.ts      (Argon2id params, file modes, HD paths)
│   │   └── paths.ts          (~/.agentwallet/* path helpers)
│   ├── lib/
│   │   ├── index.ts
│   │   ├── crypto.ts         (Argon2id KDF, XSalsa20-Poly1305)
│   │   ├── key-derivation.ts (BIP39 + BIP32 HD for EVM/Solana/TON)
│   │   ├── memory-guard.ts   (zeroize, withSecureScope, toHex, toBase58)
│   │   └── file-system.ts    (secureWrite, secureRead, secureDelete)
│   ├── services/
│   │   ├── index.ts
│   │   ├── vault-service.ts     (init, store/retrieve mnemonic+keys)
│   │   ├── wallet-service.ts    (create, list, label, delete)
│   │   ├── chain-service.ts     (HD derivation dispatcher)
│   │   ├── signing-service.ts   (Signing Oracle — sole key access)
│   │   ├── balance-service.ts   (read-only on-chain queries)
│   │   ├── transfer-service.ts  (build → sign → broadcast)
│   │   ├── session-service.ts   (unlock/lock/validate session tokens)
│   │   └── x402-service.ts      (x402 payment protocol signing)
│   ├── app/
│   │   ├── cli.ts            (Commander.js CLI entry point)
│   │   ├── json-output.ts    (JSON formatting utilities)
│   │   ├── backup-restore.ts (backup/restore commands)
│   │   └── index.ts          (scaffold info)
│   └── index.ts              (public API barrel export)
├── skills/
│   └── agentwallet/
│       └── SKILL.md          (OpenClaw skill definition)
├── tests/
├── docs/
│   ├── PRD.md → prd/
│   ├── ARCHITECTURE.md → architecture/
│   ├── PROGRESS.md → progress/
│   ├── ai/
│   ├── adr/
│   └── gitbook/
├── .harness/
│   ├── state.json
│   └── *.ts (runtime scripts)
├── scripts/
└── .github/workflows/
```
