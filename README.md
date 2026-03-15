# AgentWallet

Multi-chain crypto wallet CLI — create, encrypt, and manage wallets securely on VPS or local machines.

## Install

```bash
npm i -g agentwallet
```

Or run directly:

```bash
npx agentwallet
```

## Quick Start

```bash
# 1. Initialize vault with a master password
agentwallet init

# 2. Create a wallet (interactive chain selection)
agentwallet create

# 3. Or specify the chain directly
agentwallet create --chain ethereum
agentwallet create --chain solana

# 4. Create wallets for all chains at once
agentwallet create --chain all

# 5. Batch create
agentwallet create --chain polygon --count 5
```

## Commands

| Command | Description |
|---------|-------------|
| `agentwallet init` | Initialize vault with master password |
| `agentwallet create` | Create a new wallet (interactive chain selection) |
| `agentwallet list` | List all wallets |
| `agentwallet export <address>` | Export private key (auto-clears after 10s) |
| `agentwallet mnemonic` | Display mnemonic phrase (auto-clears after 10s) |
| `agentwallet label <address> <name>` | Set a label for a wallet |
| `agentwallet delete <address>` | Securely delete a wallet |
| `agentwallet backup` | Export encrypted backup |
| `agentwallet restore <file>` | Restore from backup |

## Supported Chains

| Chain | Type |
|-------|------|
| Ethereum | EVM |
| Polygon | EVM |
| BSC | EVM |
| Base | EVM |
| Arbitrum | EVM |
| Optimism | EVM |
| Avalanche | EVM |
| Fantom | EVM |
| Solana | Non-EVM |

All EVM chains share the same private key and address.

## Security

- **Encryption**: Argon2id key derivation + XSalsa20-Poly1305 authenticated encryption
- **File permissions**: Key files chmod 400, vault directory chmod 700
- **Memory safety**: Private keys zeroed after use with `sodium_memzero`
- **LLM isolation**: Keys never enter AI model context
- **Storage**: All data stored locally at `~/.agentwallet/`

## License

MIT
