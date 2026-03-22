# Security Policy — AgentWallet

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | Yes       |
| < latest | No       |

---

## Reporting a Vulnerability

**Do NOT open a public issue for security vulnerabilities.**

If you discover a security vulnerability, please report it responsibly:

1. **Email**: Send a detailed report to **security@agentwallet.dev**
2. **Subject line**: `[SECURITY] agentwallet — [Brief description]`
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if any)

### Response Timeline

| Action | Timeframe |
|--------|-----------|
| Acknowledge receipt | Within 48 hours |
| Initial assessment | Within 1 week |
| Status update | Every 2 weeks until resolved |
| Fix released | Critical: ASAP, High: 2 weeks, Medium: next release |

We will coordinate with you on disclosure timing. Please do not disclose the vulnerability publicly until a fix has been released.

---

## Cryptographic Design

### Key Derivation

- **Algorithm**: Argon2id (memory-hard, resistant to GPU/ASIC attacks)
- **Memory**: 256 MB per derivation
- **Iterations**: 3
- **Output**: 256-bit derived key

The recovery key is never stored on disk. A random salt is generated at vault initialization and stored in `config.json`. The derived key is used only in-memory and zeroed immediately after use.

### Encryption

- **Algorithm**: XSalsa20-Poly1305 (AEAD)
- **Nonce**: 24 bytes, randomly generated per encryption operation
- **Authentication**: Poly1305 MAC prevents tampering

Each private key is encrypted individually in its own `.enc` file. The mnemonic phrase is encrypted and stored in `config.json`.

### Key Zeroing

All sensitive material (derived keys, decrypted private keys, mnemonic bytes) is explicitly zeroed from memory after use via `zeroize()`. This limits the window of exposure in memory dump attacks.

---

## Signing Oracle Architecture

Private keys never leave the vault process:

1. Caller provides an unsigned transaction + session token
2. AgentWallet decrypts the private key in-process
3. The transaction is signed in-process
4. The private key is zeroed from memory
5. Only the signed transaction is returned to the caller

The `export` and `mnemonic` commands are TTY-gated — they require an interactive terminal and cannot be invoked programmatically via pipes or session tokens.

---

## File Permission Model

| Path | Mode | Description |
|------|------|-------------|
| `~/.agentwallet/` | `0o700` | Vault base directory (owner-only) |
| `~/.agentwallet/vault/` | `0o700` | Encrypted key file directory |
| `~/.agentwallet/vault/*.enc` | `0o400` | Encrypted key files (read-only) |
| `~/.agentwallet/config.json` | `0o600` | Vault config (salt, encrypted mnemonic) |
| `~/.agentwallet/wallets.json` | `0o600` | Wallet metadata (addresses, labels, no keys) |
| `~/.agentwallet/.session` | `0o600` | Session token file |

Permissions are enforced at creation and re-checked on every CLI command via `requireVault()`. The `agentwallet harden` command performs a full audit and fixes any permission drift.

On Windows, file permissions are not enforced at the OS level — encryption is the primary protection layer.

---

## Session Token Security

- Tokens are prefixed `awlt_` and contain 32 bytes of cryptographic randomness
- Default TTL: 1 hour. Maximum TTL: 24 hours
- Tokens are stored in `~/.agentwallet/.session` with `0o600` permissions
- `agentwallet lock` immediately destroys the session file
- Expired tokens are rejected and cleaned up

---

## Threat Model

### In-Scope Threats

| Threat | Mitigation |
|--------|------------|
| Brute-force recovery key | Argon2id with 256 MB memory makes GPU attacks impractical |
| VPS co-tenant file access | File permissions `0o700`/`0o400` prevent other users from reading vault |
| Memory dump / core dump | Keys zeroed after use; signing is in-process only |
| Stolen session token | Time-limited (max 24h); `lock` command destroys immediately |
| Tampered key files | Poly1305 MAC detects any modification |
| Man-in-the-middle (agent ↔ CLI) | CLI runs locally; no network between agent and vault |

### Out-of-Scope Threats

- **Root/admin compromise** — if the attacker has root, all bets are off
- **Hardware keyloggers** — physical access attacks are out of scope
- **Social engineering** — tricking the user into revealing their recovery key
- **Supply chain attacks on dependencies** — mitigated by auditing, but not fully preventable

---

## Dependency Security

- Dependencies are audited with `bun audit` before releases
- Only well-maintained packages are used (libsodium-wrappers, commander, @inquirer/prompts)
- The cryptographic primitives come from libsodium (audited, widely deployed)

---

## Acknowledgments

We appreciate the security research community's efforts in responsibly disclosing vulnerabilities. Contributors who report valid security issues will be acknowledged here (with permission).
