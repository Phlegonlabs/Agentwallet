# :coin: AgentWallet

**[English](#what-is-agentwallet)** | **[简体中文](#agentwallet-是什么)** | **[繁體中文](#agentwallet-是什麼)**

**Multi-chain crypto wallet CLI for humans and AI agents**

[![npm version](https://img.shields.io/npm/v/@phlegonlabs/agentwallet)](https://www.npmjs.com/package/@phlegonlabs/agentwallet)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chains: 12](https://img.shields.io/badge/chains-12-green.svg)](#supported-chains)

---

## What is AgentWallet?

AgentWallet is a self-custodial, multi-chain crypto wallet you control entirely from the command line. It generates HD wallets across 12 chains, encrypts private keys locally, and exposes a session-token API so AI agents can sign transactions without ever touching your recovery key.

- **Self-custodial** -- keys never leave your machine
- **12 chains** -- EVM (Ethereum, L2s) + Solana + TON
- **AI-agent ready** -- session tokens, JSON mode, and stdin piping
- **x402 native** -- sign HTTP 402 payment headers in one command

## Quick Start

```bash
# Global install (recommended)
npm install -g @phlegonlabs/agentwallet

# Without global permissions — local install + alias
npm install @phlegonlabs/agentwallet
alias agentwallet='npx agentwallet'
```

```bash
agentwallet init
agentwallet create --chain ethereum
agentwallet list
agentwallet balance <address>
```

## Supported Chains

| Type | Chains |
|------|--------|
| **EVM (10)** | Ethereum, Polygon, BSC, Base, Arbitrum, Optimism, Avalanche, Fantom, XLayer, Scroll |
| **Non-EVM (2)** | Solana, TON |

Create wallets on all chains at once with `agentwallet create --chain all`.

## Features

- **Multi-chain HD wallets** -- BIP-39 mnemonic, BIP-32 derivation, Ed25519 for Solana/TON
- **Encrypted storage** -- Argon2id key derivation + XSalsa20-Poly1305 (libsodium)
- **Session-based auth** -- `unlock` produces a time-limited token agents can use instead of the recovery key
- **Transfer guards** -- per-tx and daily transfer limits, rate limiting, optional address whitelist
- **TOTP two-factor authentication** -- export, mnemonic, and delete gated by authenticator code
- **Recovery key flow** -- `init` auto-generates a recovery key; no user-chosen password needed
- **x402 payment protocol** -- sign HTTP 402 payment headers for USDC/USDT across 8 networks
- **Operation audit log** -- every wallet operation is logged with severity, timestamps, and metadata
- **Backup & restore** -- encrypted vault export/import for migration or disaster recovery
- **File permission hardening** -- `harden` audits and fixes vault file modes on Unix systems
- **JSON mode** -- every command supports `--json` for machine-readable output

## CLI Commands

| Command | Description |
|---------|-------------|
| `init` | Initialize the vault and generate a recovery key |
| `unlock` | Unlock vault and get a session token (TTL configurable) |
| `lock` | Destroy the active session |
| `create` | Create a new wallet (`--chain ethereum`, `--chain all`, `--count N`) |
| `list` | List all wallets |
| `balance <addr>` | Query on-chain balance |
| `transfer` | Transfer native tokens (`--from`, `--to`, `--amount`) |
| `sign` | Sign an unsigned transaction (JSON from stdin or `--tx`) |
| `x402-sign` | Sign an x402 payment header (`--wallet`, `--payment`) |
| `export <addr>` | Export a wallet's private key (TTY-only, no token auth) |
| `mnemonic` | Display the mnemonic phrase (TTY-only, no token auth) |
| `backup` | Export an encrypted backup of all wallets |
| `restore <file>` | Restore wallets from an encrypted backup |
| `audit-log` | View operation audit log (`--days`, `--severity`, `--prune`) |
| `harden` | Audit and fix vault file permissions |
| `label <addr> <name>` | Set a human-readable label for a wallet |
| `delete <addr>` | Securely delete a wallet |
| `guard status` | Show transfer guard settings |
| `guard set-limit` | Set per-tx and daily transfer limits |
| `guard whitelist-add` | Add address to whitelist (24h cooldown) |
| `guard whitelist-remove` | Remove address from whitelist |
| `guard whitelist-list` | List whitelisted addresses |
| `guard whitelist-enable/disable` | Toggle whitelist enforcement |
| `totp enable` | Enable TOTP 2FA (TTY-only) |
| `totp disable` | Disable TOTP 2FA |
| `totp status` | Show TOTP status |

All commands accept `--json` for structured output. Commands that need authentication accept `--token <token>` or read `AGENTWALLET_TOKEN` from the environment.

## Security

AgentWallet uses seven layers of protection:

1. **Encryption** -- Argon2id + XSalsa20-Poly1305 via libsodium; keys are never stored in plaintext
2. **File permissions** -- `harden` enforces `0o700` / `0o600` on vault directories and files
3. **Memory safety** -- sensitive buffers are zeroed after use; mnemonic/key display auto-clears after 10 seconds
4. **LLM isolation** -- `export` and `mnemonic` require an interactive terminal (TTY); agents can only use session tokens with configurable TTL (max 24h)
5. **Transfer guards** -- per-tx limits, daily limits, and rate limiting prevent runaway transfers
6. **Address whitelist** -- optional whitelist with 24h cooldown for newly added addresses
7. **TOTP 2FA** -- export, mnemonic, and delete operations gated by authenticator code when enabled

### Agent Permission Model

| Operation | Recovery Key | Session Token |
|-----------|:-:|:-:|
| Create / list / label / delete wallets | Yes | Yes |
| Sign transactions, x402 payments | Yes | Yes |
| Transfer tokens | Yes | Yes |
| Guard management | Yes | Yes |
| Export private key | Yes (TTY only, +TOTP if enabled) | No |
| Display mnemonic | Yes (TTY only, +TOTP if enabled) | No |
| TOTP management | Yes (TTY only) | No |

## AI Agent Integration

Agents interact with AgentWallet through the CLI's JSON mode and session tokens:

```bash
# Non-interactive init returns recoveryKey (not written to disk)
INIT=$(agentwallet init --json)
TOKEN=$(echo "$INIT" | jq -r .token)
RECOVERY=$(echo "$INIT" | jq -r .recoveryKey)
# Send recoveryKey to user via DM -- NEVER in group chat

# Agent creates a wallet
agentwallet create --chain base --token "$TOKEN" --json

# Agent signs a transaction
echo '{"walletAddress":"0x...","transaction":{...}}' | agentwallet sign --token "$TOKEN" --json
```

### OpenClaw Skill

```bash
npx @anthropic-ai/claw install @phlegonlabs/agentwallet
```

The skill lets Claude and other AI agents discover and invoke AgentWallet commands through a structured tool interface.

## x402 Payment Protocol

AgentWallet supports the [x402](https://www.x402.org/) HTTP payment protocol -- agents can pay for API access by signing stablecoin transfers in response to `402 Payment Required` headers.

**Supported networks and tokens:**

| Network | Tokens |
|---------|--------|
| Ethereum | USDC, USDT |
| Base | USDC, USDT |
| Polygon | USDC, USDT |
| Optimism | USDC, USDT |
| Arbitrum | USDC, USDT |
| Avalanche | USDC, USDT |
| XLayer | USDC, USDT |
| Solana | USDC, USDT |

```bash
# Sign an x402 payment
echo '{"network":"base","token":"USDC","amount":"1000000","recipient":"0x..."}' \
  | agentwallet x402-sign --wallet 0x... --token "$TOKEN" --json
```

## Project Structure

```
agentwallet/
  src/
    types/        # Shared type definitions
    config/       # Chain registry, token registry, constants
    lib/          # Crypto, key derivation, audit log, memory guard, TOTP
    services/     # Wallet, session, signing, transfer, x402, balance, guard, TOTP
    app/          # CLI entry point, command definitions, guard/totp/harden commands
  apps/
    cli/          # CLI package
    landing/      # Landing page
  skills/
    agentwallet/  # OpenClaw agent skill definition
  packages/
    shared/       # Shared contracts and utilities
```

## License

[MIT](LICENSE)

---

<a id="agentwallet-是什么"></a>

# :coin: AgentWallet (简体中文)

**多链加密钱包 CLI —— 为人类和 AI 代理而生**

[![npm version](https://img.shields.io/npm/v/@phlegonlabs/agentwallet)](https://www.npmjs.com/package/@phlegonlabs/agentwallet)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chains: 12](https://img.shields.io/badge/chains-12-green.svg)](#支持的链)

---

## AgentWallet 是什么？

AgentWallet 是一个自托管的多链加密钱包，完全通过命令行控制。它可以在 12 条链上生成 HD 钱包，在本地加密私钥，并提供 session token API，让 AI 代理无需接触恢复密钥即可签署交易。

- **自托管** —— 私钥永远不离开你的机器
- **12 条链** —— EVM（Ethereum 及 L2）+ Solana + TON
- **AI 代理就绪** —— session token、JSON 模式、stdin 管道
- **原生 x402** —— 一条命令签署 HTTP 402 支付头

## 快速开始

```bash
# 全局安装（推荐）
npm install -g @phlegonlabs/agentwallet

# 没有全局权限时 —— 本地安装 + alias
npm install @phlegonlabs/agentwallet
alias agentwallet='npx agentwallet'
```

```bash
agentwallet init
agentwallet create --chain ethereum
agentwallet list
agentwallet balance <地址>
```

## 支持的链

| 类型 | 链 |
|------|-----|
| **EVM (10)** | Ethereum, Polygon, BSC, Base, Arbitrum, Optimism, Avalanche, Fantom, XLayer, Scroll |
| **非 EVM (2)** | Solana, TON |

使用 `agentwallet create --chain all` 一次性在所有链上创建钱包。

## 功能特性

- **多链 HD 钱包** —— BIP-39 助记词、BIP-32 派生、Solana/TON 使用 Ed25519
- **加密存储** —— Argon2id 密钥派生 + XSalsa20-Poly1305（libsodium）
- **基于会话的认证** —— `unlock` 生成限时 token，代理可用其代替恢复密钥
- **转账守卫** —— 单笔/每日转账限额、速率限制、可选地址白名单
- **TOTP 双因素认证** —— 导出、助记词、删除操作需验证器代码
- **恢复密钥流程** —— `init` 自动生成恢复密钥；无需用户设置密码
- **x402 支付协议** —— 在 8 个网络上签署 USDC/USDT 的 HTTP 402 支付头
- **操作审计日志** —— 每个钱包操作都带有严重级别、时间戳和元数据
- **备份与恢复** —— 加密的 vault 导出/导入，用于迁移或灾难恢复
- **文件权限加固** —— `harden` 审计并修复 Unix 系统上的 vault 文件权限
- **JSON 模式** —— 每个命令都支持 `--json` 输出机器可读格式

## CLI 命令

| 命令 | 说明 |
|------|------|
| `init` | 初始化 vault 并生成恢复密钥 |
| `unlock` | 解锁 vault 并获取 session token（TTL 可配置） |
| `lock` | 销毁当前会话 |
| `create` | 创建新钱包（`--chain ethereum`、`--chain all`、`--count N`） |
| `list` | 列出所有钱包 |
| `balance <地址>` | 查询链上余额 |
| `transfer` | 转账原生代币（`--from`、`--to`、`--amount`） |
| `sign` | 签署未签名交易（JSON 来自 stdin 或 `--tx`） |
| `x402-sign` | 签署 x402 支付头（`--wallet`、`--payment`） |
| `export <地址>` | 导出钱包私钥（仅限 TTY，不支持 token 认证） |
| `mnemonic` | 显示助记词（仅限 TTY，不支持 token 认证） |
| `backup` | 导出所有钱包的加密备份 |
| `restore <文件>` | 从加密备份恢复钱包 |
| `audit-log` | 查看操作审计日志（`--days`、`--severity`、`--prune`） |
| `harden` | 审计并修复 vault 文件权限 |
| `label <地址> <名称>` | 为钱包设置可读标签 |
| `delete <地址>` | 安全删除钱包 |
| `guard status` | 查看转账守卫设置 |
| `guard set-limit` | 设置单笔和每日转账限额 |
| `guard whitelist-add` | 添加地址到白名单（24 小时冷却期） |
| `guard whitelist-remove` | 从白名单移除地址 |
| `guard whitelist-list` | 列出白名单地址 |
| `guard whitelist-enable/disable` | 切换白名单强制执行 |
| `totp enable` | 启用 TOTP 双因素认证（仅限 TTY） |
| `totp disable` | 禁用 TOTP 双因素认证 |
| `totp status` | 查看 TOTP 状态 |

所有命令支持 `--json` 结构化输出。需要认证的命令接受 `--token <token>` 或从环境变量读取 `AGENTWALLET_TOKEN`。

## 安全性

AgentWallet 使用七层保护：

1. **加密** —— Argon2id + XSalsa20-Poly1305（libsodium）；私钥永远不以明文存储
2. **文件权限** —— `harden` 强制 vault 目录和文件使用 `0o700` / `0o600` 权限
3. **内存安全** —— 敏感缓冲区使用后立即归零；助记词/私钥显示 10 秒后自动清除
4. **LLM 隔离** —— `export` 和 `mnemonic` 要求交互式终端（TTY）；代理只能使用有时限的 session token（最长 24 小时）
5. **转账守卫** —— 单笔限额、每日限额、速率限制，防止失控转账
6. **地址白名单** —— 可选白名单，新地址有 24 小时冷却期
7. **TOTP 双因素认证** —— 启用后，导出、助记词、删除操作需验证器代码

### 代理权限模型

| 操作 | 恢复密钥 | Session Token |
|------|:-:|:-:|
| 创建 / 列出 / 标记 / 删除钱包 | 支持 | 支持 |
| 签署交易、x402 支付 | 支持 | 支持 |
| 转账代币 | 支持 | 支持 |
| 守卫管理 | 支持 | 支持 |
| 导出私钥 | 支持（仅 TTY，+TOTP） | 不支持 |
| 显示助记词 | 支持（仅 TTY，+TOTP） | 不支持 |
| TOTP 管理 | 支持（仅 TTY） | 不支持 |

## AI 代理集成

代理通过 CLI 的 JSON 模式和 session token 与 AgentWallet 交互：

```bash
# 非交互式初始化返回 recoveryKey（不写入磁盘）
INIT=$(agentwallet init --json)
TOKEN=$(echo "$INIT" | jq -r .token)
RECOVERY=$(echo "$INIT" | jq -r .recoveryKey)
# 通过私信发送 recoveryKey 给用户 —— 切勿在群聊中发送

# 代理创建钱包
agentwallet create --chain base --token "$TOKEN" --json

# 代理签署交易
echo '{"walletAddress":"0x...","transaction":{...}}' | agentwallet sign --token "$TOKEN" --json
```

### 运行架构

```
用户（Telegram / Discord / Web）
  ↕ 聊天消息
AI Agent（运行在 VPS / 服务器上）
  ↕ shell 命令
agentwallet CLI（安装在同一台服务器上）
  ↕ 加密读写
~/.agentwallet/vault/（私钥存储）
```

> **注意**：AgentWallet 是一个独立的 CLI 钱包工具，不是浏览器扩展或其他钱包的插件。AI 代理在服务器上调用 CLI 命令，用户通过 Telegram 等聊天界面与代理交互。

### OpenClaw Skill

```bash
npx @anthropic-ai/claw install @phlegonlabs/agentwallet
```

该 Skill 让 Claude 和其他 AI 代理通过结构化工具接口发现和调用 AgentWallet 命令。

## x402 支付协议

AgentWallet 支持 [x402](https://www.x402.org/) HTTP 支付协议 —— 代理可以通过签署稳定币转账来响应 `402 Payment Required` 头，从而为 API 访问付费。

**支持的网络和代币：**

| 网络 | 代币 |
|------|------|
| Ethereum | USDC, USDT |
| Base | USDC, USDT |
| Polygon | USDC, USDT |
| Optimism | USDC, USDT |
| Arbitrum | USDC, USDT |
| Avalanche | USDC, USDT |
| XLayer | USDC, USDT |
| Solana | USDC, USDT |

```bash
# 签署 x402 支付
echo '{"network":"base","token":"USDC","amount":"1000000","recipient":"0x..."}' \
  | agentwallet x402-sign --wallet 0x... --token "$TOKEN" --json
```

## 项目结构

```
agentwallet/
  src/
    types/        # 共享类型定义
    config/       # 链注册、代币注册、常量
    lib/          # 加密、密钥派生、审计日志、内存保护、TOTP
    services/     # 钱包、会话、签名、转账、x402、余额、守卫、TOTP
    app/          # CLI 入口、命令定义、守卫/TOTP/加固命令
  apps/
    cli/          # CLI 包
    landing/      # 营销着陆页
  skills/
    agentwallet/  # OpenClaw 代理 Skill 定义
  packages/
    shared/       # 共享契约和工具
```

## 许可证

[MIT](LICENSE)

---

<a id="agentwallet-是什麼"></a>

# :coin: AgentWallet (繁體中文)

**多鏈加密錢包 CLI —— 為人類和 AI 代理而生**

[![npm version](https://img.shields.io/npm/v/@phlegonlabs/agentwallet)](https://www.npmjs.com/package/@phlegonlabs/agentwallet)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chains: 12](https://img.shields.io/badge/chains-12-green.svg)](#支援的鏈)

---

## AgentWallet 是什麼？

AgentWallet 是一個自託管的多鏈加密錢包，完全透過命令列控制。它可以在 12 條鏈上產生 HD 錢包，在本地加密私鑰，並提供 session token API，讓 AI 代理無需接觸復原金鑰即可簽署交易。

- **自託管** —— 私鑰永遠不離開你的機器
- **12 條鏈** —— EVM（Ethereum 及 L2）+ Solana + TON
- **AI 代理就緒** —— session token、JSON 模式、stdin 管道
- **原生 x402** —— 一條命令簽署 HTTP 402 支付頭

## 快速開始

```bash
# 全域安裝（建議）
npm install -g @phlegonlabs/agentwallet

# 沒有全域權限時 —— 本地安裝 + alias
npm install @phlegonlabs/agentwallet
alias agentwallet='npx agentwallet'
```

```bash
agentwallet init
agentwallet create --chain ethereum
agentwallet list
agentwallet balance <地址>
```

## 支援的鏈

| 類型 | 鏈 |
|------|-----|
| **EVM (10)** | Ethereum, Polygon, BSC, Base, Arbitrum, Optimism, Avalanche, Fantom, XLayer, Scroll |
| **非 EVM (2)** | Solana, TON |

使用 `agentwallet create --chain all` 一次性在所有鏈上建立錢包。

## 功能特性

- **多鏈 HD 錢包** —— BIP-39 助記詞、BIP-32 衍生、Solana/TON 使用 Ed25519
- **加密儲存** —— Argon2id 金鑰衍生 + XSalsa20-Poly1305（libsodium）
- **基於工作階段的認證** —— `unlock` 產生限時 token，代理可用其代替復原金鑰
- **轉帳守衛** —— 單筆/每日轉帳限額、速率限制、可選地址白名單
- **TOTP 雙因素認證** —— 匯出、助記詞、刪除操作需驗證器代碼
- **復原金鑰流程** —— `init` 自動產生復原金鑰；無需使用者設定密碼
- **x402 支付協議** —— 在 8 個網路上簽署 USDC/USDT 的 HTTP 402 支付頭
- **操作稽核日誌** —— 每個錢包操作都帶有嚴重等級、時間戳和中繼資料
- **備份與還原** —— 加密的 vault 匯出/匯入，用於遷移或災難復原
- **檔案權限加固** —— `harden` 稽核並修復 Unix 系統上的 vault 檔案權限
- **JSON 模式** —— 每個命令都支援 `--json` 輸出機器可讀格式

## CLI 命令

| 命令 | 說明 |
|------|------|
| `init` | 初始化 vault 並產生復原金鑰 |
| `unlock` | 解鎖 vault 並取得 session token（TTL 可設定） |
| `lock` | 銷毀目前工作階段 |
| `create` | 建立新錢包（`--chain ethereum`、`--chain all`、`--count N`） |
| `list` | 列出所有錢包 |
| `balance <地址>` | 查詢鏈上餘額 |
| `transfer` | 轉帳原生代幣（`--from`、`--to`、`--amount`） |
| `sign` | 簽署未簽名交易（JSON 來自 stdin 或 `--tx`） |
| `x402-sign` | 簽署 x402 支付頭（`--wallet`、`--payment`） |
| `export <地址>` | 匯出錢包私鑰（僅限 TTY，不支援 token 認證） |
| `mnemonic` | 顯示助記詞（僅限 TTY，不支援 token 認證） |
| `backup` | 匯出所有錢包的加密備份 |
| `restore <檔案>` | 從加密備份還原錢包 |
| `audit-log` | 檢視操作稽核日誌（`--days`、`--severity`、`--prune`） |
| `harden` | 稽核並修復 vault 檔案權限 |
| `label <地址> <名稱>` | 為錢包設定可讀標籤 |
| `delete <地址>` | 安全刪除錢包 |
| `guard status` | 檢視轉帳守衛設定 |
| `guard set-limit` | 設定單筆和每日轉帳限額 |
| `guard whitelist-add` | 新增地址到白名單（24 小時冷卻期） |
| `guard whitelist-remove` | 從白名單移除地址 |
| `guard whitelist-list` | 列出白名單地址 |
| `guard whitelist-enable/disable` | 切換白名單強制執行 |
| `totp enable` | 啟用 TOTP 雙因素認證（僅限 TTY） |
| `totp disable` | 停用 TOTP 雙因素認證 |
| `totp status` | 檢視 TOTP 狀態 |

所有命令支援 `--json` 結構化輸出。需要認證的命令接受 `--token <token>` 或從環境變數讀取 `AGENTWALLET_TOKEN`。

## 安全性

AgentWallet 使用七層保護：

1. **加密** —— Argon2id + XSalsa20-Poly1305（libsodium）；私鑰永遠不以明文儲存
2. **檔案權限** —— `harden` 強制 vault 目錄和檔案使用 `0o700` / `0o600` 權限
3. **記憶體安全** —— 敏感緩衝區使用後立即歸零；助記詞/私鑰顯示 10 秒後自動清除
4. **LLM 隔離** —— `export` 和 `mnemonic` 要求互動式終端（TTY）；代理只能使用有時限的 session token（最長 24 小時）
5. **轉帳守衛** —— 單筆限額、每日限額、速率限制，防止失控轉帳
6. **地址白名單** —— 可選白名單，新地址有 24 小時冷卻期
7. **TOTP 雙因素認證** —— 啟用後，匯出、助記詞、刪除操作需驗證器代碼

### 代理權限模型

| 操作 | 復原金鑰 | Session Token |
|------|:-:|:-:|
| 建立 / 列出 / 標記 / 刪除錢包 | 支援 | 支援 |
| 簽署交易、x402 支付 | 支援 | 支援 |
| 轉帳代幣 | 支援 | 支援 |
| 守衛管理 | 支援 | 支援 |
| 匯出私鑰 | 支援（僅 TTY，+TOTP） | 不支援 |
| 顯示助記詞 | 支援（僅 TTY，+TOTP） | 不支援 |
| TOTP 管理 | 支援（僅 TTY） | 不支援 |

## AI 代理整合

代理透過 CLI 的 JSON 模式和 session token 與 AgentWallet 互動：

```bash
# 非互動式初始化回傳 recoveryKey（不寫入磁碟）
INIT=$(agentwallet init --json)
TOKEN=$(echo "$INIT" | jq -r .token)
RECOVERY=$(echo "$INIT" | jq -r .recoveryKey)
# 透過私訊傳送 recoveryKey 給使用者 —— 切勿在群組聊天中傳送

# 代理建立錢包
agentwallet create --chain base --token "$TOKEN" --json

# 代理簽署交易
echo '{"walletAddress":"0x...","transaction":{...}}' | agentwallet sign --token "$TOKEN" --json
```

### 運行架構

```
使用者（Telegram / Discord / Web）
  ↕ 聊天訊息
AI Agent（運行在 VPS / 伺服器上）
  ↕ shell 命令
agentwallet CLI（安裝在同一台伺服器上）
  ↕ 加密讀寫
~/.agentwallet/vault/（私鑰儲存）
```

> **注意**：AgentWallet 是一個獨立的 CLI 錢包工具，不是瀏覽器擴充功能或其他錢包的外掛。AI 代理在伺服器上呼叫 CLI 命令，使用者透過 Telegram 等聊天介面與代理互動。

### OpenClaw Skill

```bash
npx @anthropic-ai/claw install @phlegonlabs/agentwallet
```

該 Skill 讓 Claude 和其他 AI 代理透過結構化工具介面探索和呼叫 AgentWallet 命令。

## x402 支付協議

AgentWallet 支援 [x402](https://www.x402.org/) HTTP 支付協議 —— 代理可以透過簽署穩定幣轉帳來回應 `402 Payment Required` 頭，從而為 API 存取付費。

**支援的網路和代幣：**

| 網路 | 代幣 |
|------|------|
| Ethereum | USDC, USDT |
| Base | USDC, USDT |
| Polygon | USDC, USDT |
| Optimism | USDC, USDT |
| Arbitrum | USDC, USDT |
| Avalanche | USDC, USDT |
| XLayer | USDC, USDT |
| Solana | USDC, USDT |

```bash
# 簽署 x402 支付
echo '{"network":"base","token":"USDC","amount":"1000000","recipient":"0x..."}' \
  | agentwallet x402-sign --wallet 0x... --token "$TOKEN" --json
```

## 專案結構

```
agentwallet/
  src/
    types/        # 共享型別定義
    config/       # 鏈註冊、代幣註冊、常數
    lib/          # 加密、金鑰衍生、稽核日誌、記憶體保護、TOTP
    services/     # 錢包、工作階段、簽名、轉帳、x402、餘額、守衛、TOTP
    app/          # CLI 進入點、命令定義、守衛/TOTP/加固命令
  apps/
    cli/          # CLI 套件
    landing/      # 行銷著陸頁
  skills/
    agentwallet/  # OpenClaw 代理 Skill 定義
  packages/
    shared/       # 共享契約和工具
```

## 授權條款

[MIT](LICENSE)
