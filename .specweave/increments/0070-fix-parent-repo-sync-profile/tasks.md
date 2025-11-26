---
increment: 0070-fix-parent-repo-sync-profile
total_tasks: 2
completed_tasks: 2
---

# Tasks: Fix Parent Repo Missing from Sync Profiles

## User Story: US-001 - Parent Repo Sync Profile

**Linked ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04

---

### T-001: Add parent repo to sync profiles in github-multi-repo.ts

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04
**Status**: [x] completed

**Description**: After line 220 in github-multi-repo.ts, add logic to include parent repo in profiles array.

**Implementation**:
```typescript
// Add parent repo profile if exists
if (config.parentRepo) {
  profiles.unshift({
    id: config.parentRepo.name,
    displayName: `${config.parentRepo.name} (umbrella)`,
    owner: config.parentRepo.owner,
    repo: config.parentRepo.name,
    isDefault: false
  });
}
```

**Files**: `src/cli/helpers/issue-tracker/github-multi-repo.ts`

---

### T-002: Verify build succeeds and test manually

**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed

**Description**: Run `npm run rebuild` and verify no TypeScript errors. Optionally test with a fresh multi-repo init.

**Files**: N/A (verification task)
