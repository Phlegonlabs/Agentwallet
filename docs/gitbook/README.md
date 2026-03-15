<!-- BEGIN:HARNESS:GITBOOK:README -->
# AgentWallet — Product Requirements Document

Multi-chain crypto wallet CLI — create, encrypt, and manage wallets securely on VPS or local machines

## What Is agentwallet?

Multi-chain crypto wallet CLI — create, encrypt, and manage wallets securely on VPS or local machines

Runtime auto-dispatch currently covers `project-discovery`, `MARKET_RESEARCH`, `TECH_STACK`, `prd-architect`, `scaffold-generator`, the UI design loop, `EXECUTING`, `VALIDATING`, and `context-compactor`.
After an interactive phase is complete, advance the lifecycle with `bun harness:advance`.
`bun harness:autoflow` advances only after the current phase's required outputs exist; if scaffold artifacts are missing, it stops and surfaces the missing phase work instead of skipping ahead. During `EXECUTING`, it auto-compacts and merges `REVIEW` milestones, then continues into the next milestone.
If product scope changes after execution begins, update the PRD first and run `bun harness:sync-backlog` before implementing the new work.
During scaffold setup, do not pre-install project frameworks such as Next.js or Tauri; add them later inside milestone tasks.

## Quick Start

```bash
bun install
bun harness:advance
bun harness:env
bun harness:audit
```
<!-- END:HARNESS:GITBOOK:README -->
