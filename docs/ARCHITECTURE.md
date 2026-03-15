# AgentWallet — Architecture Document

> **Version**: 1.1.0
> **Last Updated**: 2026-03-14
> **Status**: Draft

## 1. System Overview

```
┌─────────────────────────────────────────────────────┐
│                    CLI (commander.js)                │
│              agentwallet init|create|list|...        │
│  ┌──────────────────────────────────────────────┐   │
│  │              App Layer                        │   │
│  │   cli.ts — 命令注册 + 交互式选链 (prompts)    │   │
│  └──────────────────┬───────────────────────────┘   │
│                     ▼                               │
│  ┌──────────────────────────────────────────────┐   │
│  │            Services Layer                     │   │
│  │  WalletService  │  VaultService               │   │
│  │  ChainService                                 │   │
│  └──────────────────┬───────────────────────────┘   │
│                     ▼                               │
│  ┌──────────────────────────────────────────────┐   │
│  │              Lib Layer                        │   │
│  │  crypto.ts  │  key-derivation.ts              │   │
│  │  file-system.ts │ memory-guard.ts             │   │
│  └──────────────────┬───────────────────────────┘   │
│                     ▼                               │
│  ┌──────────────────────────────────────────────┐   │
│  │            Config Layer                       │   │
│  │  chains.ts  │  constants.ts  │  paths.ts      │   │
│  └──────────────────┬───────────────────────────┘   │
│                     ▼                               │
│  ┌──────────────────────────────────────────────┐   │
│  │             Types Layer                       │   │
│  │  wallet.ts  │  vault.ts  │  chain.ts          │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │        Local Encrypted Storage                │   │
│  │   ~/.agentwallet/  (全平台统一路径)            │   │
│  │   ├── vault/*.enc   (加密私钥)                │   │
│  │   ├── wallets.json  (钱包元数据，无私钥)       │   │
│  │   └── config.json   (盐值、配置)              │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## 2. Directory Structure

```
agentwallet/
├── src/
│   ├── types/                  # Type definitions only
│   │   ├── wallet.ts           # Wallet, Address, PrivateKey types
│   │   ├── vault.ts            # Vault, EncryptedBlob, MasterKey types
│   │   ├── chain.ts            # Chain, ChainType, SupportedChain types
│   │   └── index.ts
│   │
│   ├── config/                 # Constants and configuration
│   │   ├── chains.ts           # 支持的链定义 (EVM chains + Solana)
│   │   ├── constants.ts        # Crypto params, file permissions
│   │   ├── paths.ts            # Vault 路径: 全平台统一 ~/.agentwallet/
│   │   └── index.ts
│   │
│   ├── lib/                    # Pure utility functions
│   │   ├── crypto.ts           # Argon2id KDF, XSalsa20 encrypt/decrypt
│   │   ├── key-derivation.ts   # BIP39 mnemonic, BIP32 HD, Ed25519 HD
│   │   ├── file-system.ts      # chmod, umask, secure file write/read
│   │   ├── memory-guard.ts     # mlock, sodium_memzero wrappers
│   │   └── index.ts
│   │
│   ├── services/               # Business logic
│   │   ├── wallet-service.ts   # Create, list, export, delete, label, backup/restore
│   │   ├── vault-service.ts    # Init vault, encrypt/decrypt, master password
│   │   ├── chain-service.ts    # Chain-specific wallet generation (EVM/SOL)
│   │   └── index.ts
│   │
│   ├── app/                    # Entry point and CLI orchestration
│   │   └── cli.ts              # commander.js commands + interactive prompts
│   │
│   └── index.ts                # Package export (for programmatic use)
│
├── tests/
│   ├── unit/
│   │   ├── lib/
│   │   └── services/
│   └── integration/            # End-to-end CLI tests
│
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   └── PROGRESS.md
│
├── package.json                # npm publish config + bin entry
├── tsconfig.json
└── README.md
```

## 3. Dependency Direction

严格分层，只能向下依赖：

```
types → config → lib → services → app
```

- `types/` 不依赖任何其他层
- `config/` 只依赖 `types/`
- `lib/` 依赖 `types/` 和 `config/`
- `services/` 依赖 `types/`、`config/`、`lib/`
- `app/` 依赖所有下层

**禁止反向依赖。**

## 4. Layer Responsibilities

### types/
纯类型定义。无运行时代码，无副作用。

```typescript
// types/chain.ts
export type ChainType = 'evm' | 'solana';

export interface SupportedChain {
  name: string;        // 显示名 "Ethereum", "Polygon", "Solana"
  id: string;          // CLI 标识 "ethereum", "polygon", "solana"
  type: ChainType;
  chainId?: number;    // EVM chain ID (ETH=1, Polygon=137, etc.)
}

// types/wallet.ts
export interface Wallet {
  id: string;
  address: string;
  chainType: ChainType;
  chainId: string;     // 用户选择的链标识
  chainName: string;   // 显示名称
  label?: string;
  createdAt: string;
  hdPath: string;
  hdIndex: number;
}
```

### config/
链配置和常量。

```typescript
// config/chains.ts
export const SUPPORTED_CHAINS: SupportedChain[] = [
  { name: 'Ethereum', id: 'ethereum', type: 'evm', chainId: 1 },
  { name: 'Polygon', id: 'polygon', type: 'evm', chainId: 137 },
  { name: 'BSC', id: 'bsc', type: 'evm', chainId: 56 },
  { name: 'Base', id: 'base', type: 'evm', chainId: 8453 },
  { name: 'Arbitrum', id: 'arbitrum', type: 'evm', chainId: 42161 },
  { name: 'Optimism', id: 'optimism', type: 'evm', chainId: 10 },
  { name: 'Avalanche', id: 'avalanche', type: 'evm', chainId: 43114 },
  { name: 'Fantom', id: 'fantom', type: 'evm', chainId: 250 },
  { name: 'Solana', id: 'solana', type: 'solana' },
];
```

### lib/
核心安全逻辑。

- `crypto.ts` — libsodium 封装：Argon2id 密钥派生、XSalsa20-Poly1305 加解密
- `key-derivation.ts` — BIP39 助记词、BIP32 EVM HD 派生、SLIP-0010 SOL Ed25519 派生
- `file-system.ts` — 安全文件操作（原子写入 + chmod）
- `memory-guard.ts` — mlock 内存锁定、sodium_memzero 清零

### services/
业务逻辑。

- `wallet-service.ts` — 钱包 CRUD + 标签 + 备份恢复
- `vault-service.ts` — 主密码 + 加密存储
- `chain-service.ts` — 链特定逻辑（EVM 用 viem，SOL 用 @solana/web3.js）

### app/
CLI 入口。

- `cli.ts` — commander.js 命令 + 交互式选链菜单（prompts/inquirer）

## 5. Data Flow

### 钱包创建流程（交互式选链）

```
User: agentwallet create
  → app/cli.ts: 无 --chain 参数 → 显示交互式选链菜单
  → User 选择: "Polygon"
  → services/wallet-service.ts::createWallet('polygon')
    → services/chain-service.ts::resolveChain('polygon') → { type: 'evm', chainId: 137 }
    → lib/key-derivation.ts::generateMnemonic()
    → lib/key-derivation.ts::deriveEVMKey(mnemonic, index)
    → services/vault-service.ts::encryptAndStore(privateKey, mnemonic)
      → lib/crypto.ts::deriveKey(masterPassword)  // Argon2id
      → lib/crypto.ts::encrypt(privateKey, derivedKey)
      → lib/file-system.ts::secureWrite(path, blob, 0o400)
    → lib/memory-guard.ts::zeroize(privateKey)
  → Display: ✅ Polygon 钱包已创建: 0x1a2b...
```

### 私钥导出流程

```
User: agentwallet export 0x1a2b...
  → app/cli.ts: 提示输入主密码
  → services/vault-service.ts::decrypt(address, masterPassword)
    → lib/crypto.ts::deriveKey(masterPassword)
    → lib/crypto.ts::decrypt(encryptedBlob, derivedKey)
    → lib/memory-guard.ts::lockMemory(decryptedKey)
  → Display private key to terminal
  → lib/memory-guard.ts::zeroize(decryptedKey)
  → Clear terminal after display
```

### 安全边界

```
┌────────────────────────────────────────┐
│           TRUST BOUNDARY               │
│                                        │
│  Plaintext private key + mnemonic      │
│  ├─ exists ONLY in process memory      │
│  ├─ mlock'd (no swap)                  │
│  ├─ zeroized after use                 │
│  └─ NEVER in: logs, env vars, LLM     │
│                                        │
│         ┌──────────────┐               │
│         │  lib/crypto   │              │
│         │  encrypt()    │              │
│         └──────┬───────┘               │
└────────────────┼───────────────────────┘
                 ▼
       Encrypted .enc file on disk
       (chmod 400, safe to persist)
```

## 6. Error Handling

使用 Result 类型：

```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

| 场景 | 处理 |
|------|------|
| 主密码错误 | 返回错误，不泄露信息 |
| Vault 未初始化 | 提示 `agentwallet init` |
| 文件权限不正确 | 警告并尝试修复 |
| 不支持的链名 | 显示支持列表 |
| 内存锁定失败 | 警告但继续（某些 VPS 不支持 mlock） |

## 7. Testing Strategy

| 层级 | 测试类型 | 覆盖目标 |
|------|---------|---------|
| `lib/` | Unit tests | 100% — 加密、派生、文件操作 |
| `services/` | Unit + Integration | 90% — 钱包生命周期 |
| `app/` | Integration tests | 80% — CLI 命令端到端 |
| Security | 专项测试 | 私钥不泄露、内存清零、权限正确 |

测试框架：Bun 内置 test runner (`bun test`)

## 8. Git Branch Strategy

```
main
└── milestone/m1-mvp
    ├── feat/T1.1-project-init
    ├── feat/T1.2-types
    ├── feat/T1.3-crypto
    └── ...
```

## 9. Distribution

```json
// package.json (关键字段)
{
  "name": "agentwallet",
  "bin": { "agentwallet": "./dist/app/cli.js" },
  "files": ["dist"],
  "publishConfig": { "access": "public" }
}
```

用户安装：`npm i -g agentwallet` 或 `npx agentwallet`

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-14 | Initial Architecture |
| 1.1.0 | 2026-03-14 | 精简为纯 CLI，移除 Bot 层；加入交互式选链、支持链配置、npm 发布 |
