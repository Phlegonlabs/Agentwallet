# :coin: AgentWallet

**Multi-chain crypto wallet CLI for humans and AI agents**

[![npm version](https://img.shields.io/npm/v/@phlegonlabs/agentwallet)](https://www.npmjs.com/package/@phlegonlabs/agentwallet)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chains: 12](https://img.shields.io/badge/chains-12-green.svg)](#supported-chains)

---

## What is AgentWallet?

AgentWallet is a self-custodial, multi-chain crypto wallet you control entirely from the command line. It generates HD wallets across 12 chains, encrypts private keys locally, and exposes a session-token API so AI agents can sign transactions without ever touching your master password.

- **Self-custodial** -- keys never leave your machine
- **12 chains** -- EVM (Ethereum, L2s) + Solana + TON
- **AI-agent ready** -- session tokens, JSON mode, and stdin piping
- **x402 native** -- sign HTTP 402 payment headers in one command

## Quick Start

```bash
npm install -g @phlegonlabs/agentwallet

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
- **Session-based auth** -- `unlock` produces a time-limited token agents can use instead of the master password
- **x402 payment protocol** -- sign HTTP 402 payment headers for USDC/USDT across 8 networks
- **Operation audit log** -- every wallet operation is logged with severity, timestamps, and metadata
- **Backup & restore** -- encrypted vault export/import for migration or disaster recovery
- **File permission hardening** -- `harden` audits and fixes vault file modes on Unix systems
- **JSON mode** -- every command supports `--json` for machine-readable output

## CLI Commands

| Command | Description |
|---------|-------------|
| `init` | Initialize the vault with a master password |
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

All commands accept `--json` for structured output. Commands that need authentication accept `--token <token>` or read `AGENTWALLET_TOKEN` from the environment.

## Security

AgentWallet uses four layers of protection:

1. **Encryption** -- Argon2id + XSalsa20-Poly1305 via libsodium; keys are never stored in plaintext
2. **File permissions** -- `harden` enforces `0o700` / `0o600` on vault directories and files
3. **Memory safety** -- sensitive buffers are zeroed after use; mnemonic/key display auto-clears after 10 seconds
4. **LLM isolation** -- `export` and `mnemonic` require an interactive terminal (TTY); agents can only use session tokens with configurable TTL (max 24h)

### Agent Permission Model

| Operation | Master Password | Session Token |
|-----------|:-:|:-:|
| Create / list / label / delete wallets | Yes | Yes |
| Sign transactions, x402 payments | Yes | Yes |
| Transfer tokens | Yes | Yes |
| Export private key | Yes (TTY only) | No |
| Display mnemonic | Yes (TTY only) | No |

## AI Agent Integration

Agents interact with AgentWallet through the CLI's JSON mode and session tokens:

```bash
# Agent unlocks with the master password (set via env var)
export AGENTWALLET_PASSWORD="..."
TOKEN=$(agentwallet unlock --json | jq -r .token)

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
    lib/          # Crypto, key derivation, audit log, memory guard
    services/     # Wallet, session, signing, transfer, x402, balance
    app/          # CLI entry point, command definitions
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
