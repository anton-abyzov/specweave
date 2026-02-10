---
increment: 0146-github-cli-token-passthrough-fix
---

# Implementation Plan

## Architecture Decision

**ADR-0199: GitHub CLI Token Passthrough via Environment Variable**

### Context
The GitHub plugin executes `gh` CLI commands via `execFileNoThrow()`. The token read from `.env` is not passed to child processes, causing authentication failures.

### Decision
Pass `GH_TOKEN` environment variable to all `execFileNoThrow('gh', ...)` calls using the existing `env` option.

### Consequences
- **Positive**: Token from `.env` is used consistently
- **Positive**: No changes to `execFileNoThrow` signature needed
- **Positive**: Backward compatible (if `GH_TOKEN` not set, falls back to `gh auth`)
- **Negative**: Must update all `gh` call sites (one-time migration)

## Implementation Strategy

### Phase 1: Core Client (GitHubClientV2)

The `GitHubClientV2` class already stores the token in constructor. Add a helper method to get env options:

```typescript
private getGhEnv(): NodeJS.ProcessEnv {
  return this.token
    ? { ...process.env, GH_TOKEN: this.token }
    : process.env;
}
```

Then update all `execFileNoThrow` calls:
```typescript
// Before:
await execFileNoThrow('gh', [...]);

// After:
await execFileNoThrow('gh', [...], { env: this.getGhEnv() });
```

### Phase 2: GitHubFeatureSync

This class receives the client in constructor. Extract token from client or pass env options.

**Option A**: Pass token to constructor (preferred)
```typescript
constructor(
  private client: GitHubClientV2,
  private specsDir: string,
  private projectRoot: string,
  private token?: string  // NEW
) {
  this.token = token || getGitHubAuthFromProject(projectRoot).token;
}
```

**Option B**: Use client's env method
```typescript
private getGhEnv(): NodeJS.ProcessEnv {
  return { ...process.env, GH_TOKEN: this.token };
}
```

### Phase 3: Other Files

Files without class structure need token passed in or read at module level:

1. **Standalone functions**: Accept optional `token` parameter
2. **Module-level functions**: Read token once at call site, pass to functions

### Phase 4: Tests

Create `github-token-passthrough.test.ts`:
- Mock `execFileNoThrow` to capture env argument
- Verify `GH_TOKEN` is passed
- Verify `process.env` is preserved

## File-by-File Changes

| File | Change Type | Complexity |
|------|-------------|------------|
| `github-client-v2.ts` | Add `getGhEnv()` helper, update ~20 calls | Medium |
| `github-feature-sync.ts` | Add token prop, update ~15 calls | Medium |
| `github-spec-sync.ts` | Add token prop, update ~10 calls | Medium |
| `github-issue-updater.ts` | Update ~5 calls | Low |
| `github-sync-bidirectional.ts` | Update ~5 calls | Low |
| `github-sync-increment-changes.ts` | Update ~5 calls | Low |
| `ThreeLayerSyncManager.ts` | Update ~5 calls | Low |
| `github-board-resolver.ts` | Update ~3 calls | Low |
| `github-hierarchical-sync.ts` | Update ~2 calls | Low |
| `github-increment-sync-cli.ts` | Update ~8 calls | Medium |
| `duplicate-detector.ts` | Update ~3 calls | Low |

## Testing Strategy

1. **Unit Test**: Mock `execFileNoThrow`, verify env argument
2. **Integration Test**: Use actual token, verify operations work
3. **Manual Test**: Run `/sw:sync-specs` with `.env` token different from `gh auth`

## Rollout

1. Update TypeScript files
2. Rebuild (`npm run rebuild`)
3. Run unit tests
4. Manual test with real repo
5. Commit and push
