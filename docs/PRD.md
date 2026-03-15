# AgentWallet — Product Requirements Document

> **Version**: 1.1.0
> **Last Updated**: 2026-03-14
> **Status**: Draft

## 1. Overview

### Problem Statement

VPS 用户和 AI Agent 玩家（特别是 OpenClaw 用户）需要在服务器上使用加密钱包，但缺乏简单、安全的工具来生成多链钱包并在无 GUI 环境下安全存储私钥。现有工具要么只生成不存储（cryptowallet-cli），要么是托管型（Telegram 交易 Bot 持有用户密钥）。

### Solution

AgentWallet 是一个通过 `npm i -g agentwallet` 安装的 CLI 工具，让用户在 1 分钟内完成：
1. 自选链的钱包创建（所有 EVM 链 + Solana）
2. 私钥加密存储在用户本地 VPS/电脑
3. 安全导出私钥（输入密码后显示，立即清除）
4. AI Agent 签名走本地进程，私钥永远不经过 LLM

### Success Metrics

| Metric | Target |
|--------|--------|
| 钱包创建时间 | < 60 秒 |
| 私钥存储安全 | XSalsa20-Poly1305 加密 + chmod 400 + Argon2id |
| 支持链数 | 所有 EVM + Solana |
| LLM 私钥暴露 | 零 |

## 2. Target Users

### Primary: 链上散户

- 使用 VPS 跑交易策略或 AI Agent
- 不熟悉命令行钱包管理
- 需要简单一键式操作
- 可能创建多个钱包用于不同用途

### Secondary: AI Agent 开发者

- 在 OpenClaw 等平台运行 Agent
- 需要 Agent 能调用钱包签名但不暴露私钥
- 需要编程接口集成

## 3. Functional Requirements

### Milestone 1: CLI Core and Encrypted Storage

> 目标：项目初始化 + Types/Config/Lib 基础层搭建

#### F001: Project initialization and CLI skeleton

Set up project with package.json, tsconfig, dependencies, and commander.js CLI entry point.

- [ ] `bun init` with correct package.json (name, bin, scripts, dependencies)
- [ ] tsconfig.json with strict mode
- [ ] Install all production dependencies (viem, @solana/web3.js, @scure/bip32, @scure/bip39, ed25519-hd-key, libsodium-wrappers, commander, @inquirer/prompts)
- [ ] CLI entry point responds to `--help`

#### F002: Types and chain configuration

Define all TypeScript types and supported chain configuration.

- [ ] types/chain.ts: ChainType, SupportedChain interfaces
- [ ] types/wallet.ts: Wallet, WalletStore interfaces
- [ ] types/vault.ts: VaultConfig, EncryptedKeyFile interfaces
- [ ] types/result.ts: Result type with ok/err helpers
- [ ] config/chains.ts: 9 supported chains (ETH, Polygon, BSC, Base, Arbitrum, Optimism, Avalanche, Fantom, Solana)
- [ ] config/constants.ts: Argon2 params, file permissions, HD paths
- [ ] config/paths.ts: Vault directory paths using ~/.agentwallet/ on all platforms

#### F003: Crypto library with Argon2id and XSalsa20-Poly1305

Implement encryption/decryption using libsodium.

- [ ] lib/crypto.ts: generateSalt, deriveKey (Argon2id), encrypt (XSalsa20-Poly1305), decrypt, toBase64, fromBase64
- [ ] Unit tests for encrypt/decrypt roundtrip
- [ ] Unit test for wrong-password rejection

#### F004: HD key derivation for EVM and Solana

Implement BIP39 mnemonic generation and HD wallet derivation for EVM and Solana chains.

- [ ] lib/key-derivation.ts: generateMnemonic (BIP39 12-word)
- [ ] deriveEVMWallet: BIP32 HD derivation using @scure/bip32 + viem
- [ ] deriveSolanaWallet: SLIP-0010 Ed25519 derivation using ed25519-hd-key
- [ ] Unit tests for deterministic derivation from known mnemonic

#### F005: Secure file system and memory guard

Implement secure file operations and memory safety utilities.

- [ ] lib/file-system.ts: ensureDir, secureWrite (atomic write + chmod), secureRead, secureDelete (zero + unlink), exists
- [ ] lib/memory-guard.ts: zeroize (sodium_memzero), toHex, toBase58
- [ ] Vault directory created with chmod 700, key files with chmod 400
- [ ] Unit tests for secureWrite/secureRead roundtrip

#### F006: Vault service for master password and encrypted storage

Implement vault initialization, mnemonic encryption, and private key storage/retrieval.

- [ ] services/vault-service.ts: initVault, isVaultInitialized, loadConfig, saveConfig
- [ ] storeMnemonic and retrieveMnemonic with Argon2id + XSalsa20
- [ ] storePrivateKey and retrievePrivateKey per wallet
- [ ] Wrong password returns error without leaking information
- [ ] Integration test: init -> store -> retrieve roundtrip

#### F007: Wallet service with chain selection and creation

Implement wallet creation, listing, export, label, and delete operations.

- [ ] services/wallet-service.ts: createWallet with chain resolution
- [ ] createAllWallets for --chain all
- [ ] listWallets, exportPrivateKey, exportMnemonic
- [ ] labelWallet, deleteWallet (secure delete with zero-fill)
- [ ] services/chain-service.ts: generateWallet dispatching to EVM or Solana
- [ ] Integration test: create wallet -> list -> export -> delete lifecycle

#### F008: CLI commands - init, create, list, export, mnemonic

Implement core CLI commands with interactive chain selection.

- [ ] `agentwallet init` with password confirmation and minimum length check
- [ ] `agentwallet create` with interactive chain selection menu (all 9 chains + "All chains")
- [ ] `agentwallet create --chain <name>` for direct chain specification
- [ ] `agentwallet create --chain all` for multi-chain generation
- [ ] `agentwallet create --count N` for batch creation
- [ ] `agentwallet list` showing address, chain, label, date
- [ ] `agentwallet export <address>` with auto-clear after 10 seconds
- [ ] `agentwallet mnemonic` with auto-clear after 10 seconds

#### F009: CLI commands - label, delete, backup, restore

Implement management CLI commands.

- [ ] `agentwallet label <address> <name>` sets wallet label
- [ ] `agentwallet delete <address>` with confirmation prompt and secure file deletion
- [ ] `agentwallet backup` exports encrypted backup file
- [ ] `agentwallet restore <file>` restores from backup with overwrite confirmation

#### F010: npm publish configuration and README

Prepare for npm distribution with documentation.

- [ ] package.json bin entry points to built CLI
- [ ] `bun run build` produces working dist/
- [ ] README.md with installation, usage examples, supported chains, security description
- [ ] End-to-end test: install -> init -> create -> list -> export -> delete

### Supported chains

All EVM chains share the same private key and address. AgentWallet records the user's chain selection for management.

| Chain | Type | Chain ID |
|-------|------|----------|
| Ethereum | EVM | 1 |
| Polygon | EVM | 137 |
| BSC | EVM | 56 |
| Base | EVM | 8453 |
| Arbitrum | EVM | 42161 |
| Optimism | EVM | 10 |
| Avalanche | EVM | 43114 |
| Fantom | EVM | 250 |
| Solana | Non-EVM | — |

## 4. Non-Functional Requirements

### Security

- 私钥在内存中处理后必须清零 (`sodium_memzero`)
- 运行时设置 `umask 077`
- 加密文件使用 Argon2id (memory: 256MB, ops: 3) 派生密钥
- 解密时使用 `mlock` 锁定内存页，防止 swap 泄露
- 永远不将私钥写入日志、环境变量或临时文件

### Performance

- 钱包生成 < 2 秒
- Vault 初始化 < 5 秒（含 Argon2id 密钥派生）
- CLI 启动时间 < 500ms

### Usability

- 所有命令提供 `--help` 说明
- 错误信息清晰，提供修复建议
- 支持 Linux (VPS) + macOS + Windows
- 交互式选链菜单友好直观

### Milestone 2: Landing Page

> 目标：简洁极简风格的产品官网，部署到 Cloudflare Pages

#### F011: Astro project setup with Tailwind

Initialize Astro static site with Tailwind CSS v4 and Cloudflare Pages deployment config.

- [ ] apps/landing/ with Astro + @tailwindcss/vite
- [ ] Layout component with Inter + JetBrains Mono fonts
- [ ] `bun run build` produces static output in dist/

#### F012: Landing page sections

Build all page sections with clean minimal design.

- [ ] Header: Logo + nav (Features, Security, GitHub)
- [ ] Hero: headline + one-click copy install command (`npm i -g agentwallet`)
- [ ] Chains: display all 9 supported chain names
- [ ] Terminal: CLI demo showing init → create (interactive chain selection) → list
- [ ] Features: 6 feature cards (multi-chain, encryption, interactive CLI, LLM isolation, secure export, backup)
- [ ] Security: 4-layer security explanation
- [ ] CTA: dark section with install command + "Free & open source / MIT / Self-custodial"
- [ ] Footer: logo + GitHub/npm/Issues links

#### F013: Responsive design and deployment

Ensure responsive layout and deploy to Cloudflare Pages.

- [ ] Responsive across desktop, tablet, and mobile
- [ ] Cloudflare Pages build configuration
- [ ] Performance: Lighthouse score > 90

## 5. Out of Scope (MVP)

- Telegram / Discord Bot 集成
- 链上交易签名和广播
- 代币交换/DEX 集成
- Web 管理界面（Dashboard）
- 多用户/团队管理
- 硬件钱包集成
- 自动余额监控和通知
- 余额查询
- 从已有助记词导入钱包（考虑 Phase 2）

## 6. Technical Constraints

| Constraint | Value |
|-----------|-------|
| **CLI** | |
| Package Manager | Bun (dev) / npm (distribution) |
| Language | TypeScript (strict mode) |
| Runtime | Bun |
| EVM Library | viem + viem/chains |
| SOL Library | @solana/web3.js v2 |
| HD Derivation | bip39 + @scure/bip32 + ed25519-hd-key |
| Encryption | libsodium-wrappers |
| CLI Framework | commander.js |
| Interactive Prompts | inquirer or prompts |
| Key Storage | Encrypted files in ~/.agentwallet/vault/ |
| Distribution | npm registry (global install) |
| **Landing Page** | |
| Framework | Astro (静态站点，零 JS 开销) |
| Styling | Tailwind CSS |
| Deploy | Cloudflare Pages |
| Design | 简洁极简，浅色系 |

## 7. Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | 是否需要支持从已有助记词导入钱包？ | Deferred to Phase 2 |
| 2 | Agent 签名 API 设计细节（本地 RPC 还是 SDK 调用？） | Deferred to Phase 2 |
| 3 | 是否支持自定义 EVM 链（用户输入 chain ID）？ | Open |

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-14 | Initial PRD |
| 1.1.0 | 2026-03-14 | MVP 精简为纯 CLI，移除 Bot 集成；加入交互式选链、批量创建、标签、备份恢复 |
| 1.2.0 | 2026-03-14 | 新增 Milestone 2: Landing Page (Astro + Tailwind, Cloudflare Pages) |
