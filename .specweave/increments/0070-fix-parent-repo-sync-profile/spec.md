---
increment: 0070-fix-parent-repo-sync-profile
title: "Fix Parent Repo Missing from Sync Profiles"
type: bug
priority: P1
status: completed
completed: 2025-11-26
created: 2025-11-26
test_mode: test-after
coverage_target: 80
---

# Bug Fix: Parent Repo Missing from Sync Profiles

## Problem Statement

During multi-repo initialization with parent repository architecture, the parent repo is:
- Correctly captured in `config.parentRepo`
- Created on GitHub (if requested)
- **BUT never added to sync profiles in config.json**

This prevents users from:
- Creating umbrella-level GitHub issues
- Tracking cross-cutting epics
- Syncing architecture/documentation work to parent repo

## Root Cause

In `src/cli/helpers/issue-tracker/github-multi-repo.ts:201-221`:

```typescript
const profiles: GitHubProfile[] = config.repositories.map((repo, index) => ({
  id: repo.id,
  displayName: repo.description || repo.name,
  owner: repo.owner,
  repo: repo.name,
  isDefault: index === 0
}));
// BUG: config.parentRepo is IGNORED!
```

Only `config.repositories` (implementation repos) are converted to profiles.
The `config.parentRepo` is never processed.

## Solution

Add parent repo to profiles array after processing implementation repos:

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

---

## User Stories

### US-001: Parent Repo Sync Profile

**As a** developer with multi-repo architecture
**I want** the parent repo to have a sync profile
**So that** I can create and track umbrella-level GitHub issues

**Acceptance Criteria**:
- [x] **AC-US1-01**: Parent repo added to sync profiles during multi-repo init
  - Priority: P0 (Critical)
  - Testable: Yes

- [x] **AC-US1-02**: Parent profile has correct owner/repo from config.parentRepo
  - Priority: P0 (Critical)
  - Testable: Yes

- [x] **AC-US1-03**: Parent profile displayName includes "(umbrella)" suffix
  - Priority: P2
  - Testable: Yes

- [x] **AC-US1-04**: Implementation repos remain as default (parent is not default)
  - Priority: P1
  - Testable: Yes

---

## Files Changed

- `src/cli/helpers/issue-tracker/github-multi-repo.ts` - Add parent to profiles

## Testing

- Manual: Run `specweave init` with multi-repo, verify config.json has parent profile
- Unit: Verify profile array includes parent when config.parentRepo exists
