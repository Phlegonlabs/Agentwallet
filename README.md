<!-- BEGIN:HARNESS:README -->
# AgentWallet — Product Requirements Document

Multi-chain crypto wallet CLI — create, encrypt, and manage wallets securely on VPS or local machines

## Start Here

- Quick start: [docs/public/quick-start.md](docs/public/quick-start.md)
- Documentation map: [docs/public/documentation-map.md](docs/public/documentation-map.md)
- Tech stack: [docs/public/tech-stack.md](docs/public/tech-stack.md)

## Core Docs

- Product requirements: [docs/PRD.md](docs/PRD.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Progress: [docs/PROGRESS.md](docs/PROGRESS.md)
- AI workflow: [AGENTS.md](AGENTS.md)
- GitBook: [docs/gitbook/README.md](docs/gitbook/README.md)

## Workflow

```bash
bun install
bun harness:advance
bun harness:sync-backlog
bun harness:add-surface --type agent
bun harness:sync-docs
bun harness:audit
```

This workspace is monorepo-first. Keep adding new surfaces inside the same repository as later milestones.
Do not bootstrap product frameworks such as Next.js, Tauri, or provider SDK stacks during scaffold setup. Introduce them only inside milestone tasks.
If product scope changes after execution begins, update the PRD first and run `bun harness:sync-backlog` before implementing the new work.

- `apps/`: current surfaces -> cli, landing
- `packages/shared/`: shared contracts and utilities
- `packages/shared/api/`: agent-facing API wrappers
<!-- END:HARNESS:README -->
