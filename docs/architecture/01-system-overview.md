## 1. System Overview

### 1.1 Project Type
- **Type**: Monorepo + CLI
- **Workspace base**: Monorepo (Bun workspaces, default)
- **Delivery mode**: Existing codebase
- **AI Provider**: None
- **Package Manager**: Bun
- **Supported Chains**: 12 (10 EVM + Solana + TON)

### 1.2 System Architecture

```text
┌─────────────────────────────────────────────────────┐
│                    CLI (app layer)                    │
│  init │ create │ list │ sign │ balance │ transfer    │
│  unlock │ lock │ export │ mnemonic │ x402-sign      │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│               Services Layer                         │
│                                                      │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │VaultService │ │WalletService │ │SessionService│  │
│  │ KDF+encrypt │ │  CRUD ops    │ │ token mgmt   │  │
│  └─────────────┘ └──────────────┘ └──────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────┐        │
│  │         SigningService (Oracle)           │        │
│  │  ONLY module touching plaintext keys     │        │
│  │  EVM (viem) │ Solana (web3.js) │ TON     │        │
│  └──────────────────────────────────────────┘        │
│                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │BalanceService│ │TransferSvc   │ │ x402Service  │  │
│  │ read-only    │ │build→sign→bc │ │ 402 payment  │  │
│  └──────────────┘ └──────────────┘ └──────────────┘  │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│                 Lib Layer                            │
│  crypto (Argon2id, XSalsa20) │ key-derivation (HD)  │
│  memory-guard (zeroize, withSecureScope)             │
│  file-system (secureWrite, secureDelete)             │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│     Types + Config (chains, paths, constants)        │
└─────────────────────────────────────────────────────┘
```

### 1.3 Security Boundary — Signing Oracle

```text
                    ┌─────────────────────────────┐
  Agent / CLI ──────│     TransferService          │
  (no key access)   │     build unsigned tx        │
                    │           │                   │
                    │     ┌─────▼──────┐           │
                    │     │SigningOracle│ ◄── only  │
                    │     │ decrypt key │    module │
                    │     │ sign tx     │    with   │
                    │     │ zeroize key │    key    │
                    │     └─────┬──────┘   access  │
                    │           │                   │
                    │     broadcast signed tx       │
                    └─────────────────────────────┘
```

### 1.4 Data Flows

**Transfer flow**: `CLI → buildTransaction() → signTransaction() → broadcastTransaction() → txHash`

**Session flow**: `unlock(password) → awlt_ token → .session file → validateSession(token) → derived key → sign`
