# Contributing to AgentWallet

Thank you for your interest in contributing. This document provides guidelines and instructions for contributing to the project.

---

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) (latest stable version)
- [Git](https://git-scm.com/)
- A code editor with TypeScript support (VS Code recommended)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/Phlegonlabs/Agentwallet.git
cd Agentwallet

# Install dependencies
bun install

# Verify the setup
bun run typecheck
bun run lint
bun test
bun run build
```

---

## Branch Naming Conventions

All work must be done on a feature branch — developing directly on `main` is forbidden.

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New feature implementation | `feature/T001-ton-support` |
| `fix/` | Bug fix | `fix/T015-session-expiry` |
| `chore/` | Maintenance, refactoring, tooling | `chore/T020-update-deps` |

Branch names should include the Task ID when applicable: `[prefix]/T[ID]-[short-description]`

---

## Pull Request Process

1. **Create a branch** from `main`
2. **Implement** the changes following the project's architecture and coding conventions
3. **Test** your changes — all existing and new tests must pass
4. **Create a PR** using the pull request template
5. **Review** — address all review feedback before merge
6. **Merge** — squash merge or rebase merge (no merge commits)

### PR Requirements

- [ ] All CI checks pass
- [ ] PR description clearly explains what and why
- [ ] Related Task ID is referenced
- [ ] No unrelated changes included

---

## Commit Message Conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Formatting, missing semicolons, etc. (no code change) |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, dependency updates |

### Examples

```bash
feat(wallet): add TON chain support

Implements TON wallet creation, key derivation, and balance queries
using the TON HD path (m/44'/607').

Task-ID: T009
```

```bash
fix(session): handle expired token gracefully

Return a clear error message instead of a generic decryption failure
when the session token has expired.

Task-ID: T015
```

---

## Testing Requirements

- All tests must pass before submitting a PR: `bun test`
- Maintain or improve test coverage — do not reduce coverage
- Write tests for:
  - New features (unit + integration where applicable)
  - Bug fixes (regression test that reproduces the bug)
  - Edge cases and error paths

### Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run a specific test file
bun test tests/unit/vault-service.test.ts

# Run with coverage
bun test --coverage
```

---

## Code Style

- Follow existing patterns in the codebase — consistency is more important than personal preference
- Run the linter and formatter before committing:

```bash
# Check for lint errors
bun run lint

# Check formatting
bun run format:check

# Auto-fix formatting
bun run format
```

### Key Rules

- No `console.log` in committed code
- No `: any` type annotations — use precise types
- No `@ts-ignore` or `@ts-expect-error` without a linked issue
- No hardcoded secrets, API keys, or tokens
- Files must not exceed 400 lines
- Functions should be concise and single-purpose

### Security-Specific Rules

When working on code that handles cryptographic keys or sensitive data:

- **Never log private keys, mnemonics, or passwords** — not even in debug/error paths
- **Always call `zeroize()`** on sensitive buffers (derived keys, decrypted keys) after use
- **Use `secureWrite()` and `secureDelete()`** — never use raw `fs.writeFileSync` for vault files
- **Respect the dependency direction** (`types → config → lib → services → app`) — never import upstream
- **Do not store secrets in environment variables at rest** — use the vault and session tokens

---

## Getting Help

- Check existing issues for similar questions
- Review [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for project structure guidance
