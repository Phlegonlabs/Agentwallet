## 4. Functional Requirements

### Milestone 1: CLI Core and Encrypted Storage ✅

**Supported Chains**: 12 (10 EVM + Solana + TON)

- EVM: Ethereum, Polygon, BSC, Base, Arbitrum, Optimism, Avalanche, Fantom, XLayer, Scroll
- Non-EVM: Solana, TON

#### F001: Vault and Key Management
- **Description**: BIP39 mnemonic, Argon2id KDF, XSalsa20-Poly1305 encryption, HD derivation for all chain types.
- **Acceptance criteria**: ✅ All implemented
- **Priority**: P0

#### F002: CLI Commands
- **Description**: init, create, list, export, mnemonic, label, delete, backup, restore, sign, balance, transfer.
- **Acceptance criteria**: ✅ All 12 commands implemented
- **Priority**: P0

### Milestone 2: Landing Page ✅

#### F003: Product Landing Page
- **Description**: Astro + Tailwind landing page with responsive design.
- **Acceptance criteria**: ✅ Deployed
- **Priority**: P1

### Milestone 3: Multi-chain Extensions ✅

#### F004: TON Chain Support
- **Description**: Full TON support — HD derivation (m/44'/607'), WalletContractV4, balance queries, transaction signing.
- **Acceptance criteria**: ✅ Implemented
- **Priority**: P1

#### F005: Additional EVM Chains
- **Description**: Added XLayer and Scroll to supported EVM chains.
- **Acceptance criteria**: ✅ Implemented
- **Priority**: P2

#### F006: Transfer Service
- **Description**: High-level build → sign → broadcast pipeline for native token transfers across all 12 chains.
- **Acceptance criteria**: ✅ Implemented
- **Priority**: P1

### Milestone 4: Security Architecture ✅

#### F007: Signing Oracle
- **Description**: signing-service as sole module touching plaintext private keys. transfer-service never sees raw keys.
- **Acceptance criteria**: ✅ Implemented
- **Priority**: P0

#### F008: Balance Service
- **Description**: Read-only on-chain balance queries with zero private key exposure.
- **Acceptance criteria**: ✅ Implemented
- **Priority**: P1

#### F009: Memory Safety
- **Description**: withSecureScope for guaranteed key cleanup, seed buffer zeroization, TTY-gated export/mnemonic.
- **Acceptance criteria**: ✅ Implemented
- **Priority**: P0

### Milestone 5: Skill/Agent API 🟡

#### F010: Session Token
- **Description**: `unlock` command generates `awlt_` session token, persisted to `~/.agentwallet/.session` (chmod 600). Default TTL 1h, max 24h. Session tokens cannot execute export/mnemonic.
- **Acceptance criteria**:
  - [ ] `agentwallet unlock [--ttl] [--json]` returns session token
  - [ ] `agentwallet lock` destroys session
  - [ ] All commands accept `--token` as alternative to password prompt
  - [ ] `AGENTWALLET_TOKEN` env var support
- **Priority**: P0
- **Dependencies**: F007

#### F011: JSON Output Mode
- **Description**: All commands support `--json` flag for machine-readable output.
- **Acceptance criteria**:
  - [ ] list, balance, create, sign, transfer, unlock return structured JSON with `--json`
- **Priority**: P0

#### F012: OpenClaw Skill
- **Description**: `skills/agentwallet/SKILL.md` with YAML frontmatter and markdown instructions for AI agent integration.
- **Acceptance criteria**:
  - [ ] SKILL.md follows OpenClaw skill format spec
  - [ ] Covers init, unlock, create, balance, transfer, sign workflows
  - [ ] Security rules documented (never export, always use --json)
- **Priority**: P0
- **Dependencies**: F010, F011

#### F013: x402 Payment Protocol
- **Description**: HTTP 402 payment signing. Agent receives PAYMENT-REQUIRED header, signs via signing oracle, returns PAYMENT-SIGNATURE.
- **Acceptance criteria**:
  - [ ] `agentwallet x402-sign --token <token> --json` command
  - [ ] Parses payment requirement, constructs payment payload, signs via signing oracle
- **Priority**: P1
- **Dependencies**: F010

### Out of Scope

- ERC-20 / SPL token transfers (native tokens only for now)
- Smart contract deployment
- Token swap / DEX integration
- Mobile app
- Browser extension

### Surface Expansion Policy

- Start with the current product surfaces and keep adding new surfaces as later milestones inside the same monorepo.
- Add new surfaces such as iOS, CLI, desktop, or agent work as new milestones inside the same monorepo.
- Do not fork into a separate repo just because a new surface is introduced later.
