---
increment: 0146-github-cli-token-passthrough-fix
total_tasks: 8
completed_tasks: 8
---

# Tasks

## Phase 1: Core Client

### T-001: Add getGhEnv helper to GitHubClientV2
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Priority**: P0
**Status**: [x] completed

Add a private helper method that returns env object with GH_TOKEN:

```typescript
private getGhEnv(): NodeJS.ProcessEnv {
  return this.token
    ? { ...process.env, GH_TOKEN: this.token }
    : process.env;
}
```

Update all `execFileNoThrow('gh', ...)` calls in the file to use `{ env: this.getGhEnv() }`.

**Files**: `plugins/specweave-github/lib/github-client-v2.ts`

#### Embedded Tests (BDD)
```gherkin
Scenario: Token is passed to gh CLI commands
  Given GitHubClientV2 is initialized with token "ghp_test123"
  When any gh CLI method is called
  Then execFileNoThrow is called with env.GH_TOKEN = "ghp_test123"
  And process.env values are preserved in the env object

Scenario: No token gracefully falls back
  Given GitHubClientV2 is initialized without token
  When any gh CLI method is called
  Then execFileNoThrow is called with process.env only
```

---

### T-002: Update GitHubFeatureSync with token passthrough
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04
**Priority**: P0
**Status**: [x] completed

Add token property and getGhEnv helper:

```typescript
private token: string;

constructor(client: GitHubClientV2, specsDir: string, projectRoot: string) {
  // ... existing code ...
  this.token = getGitHubAuthFromProject(projectRoot).token;
}

private getGhEnv(): NodeJS.ProcessEnv {
  return this.token
    ? { ...process.env, GH_TOKEN: this.token }
    : process.env;
}
```

Update all `execFileNoThrow('gh', ...)` calls to use `{ env: this.getGhEnv() }`.

**Files**: `plugins/specweave-github/lib/github-feature-sync.ts`

---

## Phase 2: Supporting Files

### T-003: Update github-spec-sync.ts
**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Priority**: P1
**Status**: [x] completed

Add token property to class and update all gh calls.

**Files**: `plugins/specweave-github/lib/github-spec-sync.ts`

---

### T-004: Update standalone GitHub files
**User Story**: US-003
**Satisfies ACs**: AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05, AC-US3-06, AC-US3-07, AC-US3-08, AC-US3-09
**Priority**: P1
**Status**: [x] completed

Update these files to pass token via env:
- `github-issue-updater.ts`
- `github-sync-bidirectional.ts`
- `github-sync-increment-changes.ts`
- `ThreeLayerSyncManager.ts`
- `github-board-resolver.ts`
- `github-hierarchical-sync.ts`
- `github-increment-sync-cli.ts`
- `duplicate-detector.ts`

For standalone functions, accept optional `ghEnv` parameter.

**Files**: Multiple (see list above)

---

## Phase 3: Tests

### T-005: Create unit tests for token passthrough
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03
**Priority**: P1
**Status**: [x] completed

Create test file that:
1. Mocks `execFileNoThrow`
2. Verifies `GH_TOKEN` is in env when token provided
3. Verifies `process.env` values preserved
4. Verifies graceful fallback when no token

**Files**: `tests/unit/github/github-token-passthrough.test.ts`

---

### T-006: Integration test with mock
**User Story**: US-004
**Satisfies ACs**: AC-US4-04
**Priority**: P1
**Status**: [x] completed

Create integration test that:
1. Sets up mock token
2. Calls GitHubClientV2 methods
3. Verifies token was passed through

**Files**: `tests/unit/github/github-token-passthrough.test.ts`

---

## Phase 4: Build & Verify

### T-007: Rebuild and run tests
**User Story**: US-001, US-002, US-003, US-004
**Satisfies ACs**: All
**Priority**: P0
**Status**: [x] completed

```bash
npm run rebuild
npm test
```

Verify all tests pass.

---

### T-008: Manual verification
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Priority**: P0
**Status**: [x] completed

Test that `/sw:sync-specs 0138` works correctly with token from `.env`:
1. Ensure `gh auth` is logged in as different user OR logged out
2. Run sync command
3. Verify operations use `.env` token

---
