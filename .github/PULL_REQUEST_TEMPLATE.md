## Summary

<!-- What does this PR do? One sentence summary. -->

---

## Changes

<!-- List the key changes made in this PR -->

-

---

## Pre-merge Checklist

### Code Quality
- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes
- [ ] `bun test` passes
- [ ] `bun run build` succeeds
- [ ] All changed files are under 400 lines
- [ ] No `console.log` / `: any` / `@ts-ignore` leftovers

### Security
- [ ] No plaintext keys, passwords, or mnemonics in logs or error messages
- [ ] `zeroize()` called on all sensitive buffers after use
- [ ] Vault file operations use `secureWrite()` / `secureRead()` / `secureDelete()`
- [ ] File permissions set correctly for any new vault files
- [ ] No secrets committed (API keys, tokens, `.env` files)

---

## Testing

<!-- Describe how you tested this PR -->

**Manual testing steps**:
1.
2.

**Test coverage**: (`bun test --coverage`)

---

## Notes for Reviewer

<!-- Anything the reviewer should pay special attention to -->
