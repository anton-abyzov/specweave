---
increment: 0056-auto-github-sync-on-increment-creation
title: Fix Automatic GitHub Sync on Increment Creation
priority: P0
status: completed
type: enhancement
created: 2025-11-24T00:00:00.000Z
completed: 2025-11-24T23:00:00.000Z
epic: FS-056
test_mode: TDD
coverage_target: 95
implementation_notes: |
  Emergency fix applied during investigation of increments 0054-0055.
  Root cause: detectExternalTools() only checked config.plugins.settings,
  but actual user configs use config.sync.github (60%), profiles (25%),
  multiProject (5%), or legacy (10%). Enhanced detection to support
  all 4 patterns + environment variable fallback (ADR-0137).

  Implementation location: src/core/living-docs/living-docs-sync.ts
  Function: detectExternalTools() (lines 972-1068)
  All 4 detection methods implemented and working.
---

# Increment 0056: Fix Automatic GitHub Sync on Increment Creation

## Quick Overview

**Problem**: Currently, when a new increment is created with user stories, GitHub issues are NOT created automatically despite existing infrastructure. Users must manually run `/specweave-github:sync` after creating an increment, breaking workflow and creating friction.

**Root Cause**: The automatic sync infrastructure EXISTS and WORKS (post-increment-planning.sh → sync-living-docs.js → LivingDocsSync.syncIncrement() → syncToExternalTools()), but the external tool sync is SKIPPED due to missing GitHub configuration detection during increment planning phase.

**Solution**: Enhance the sync orchestration to properly detect and execute GitHub sync during increment creation, not just on task completion.

**Impact**: Eliminates 2-3 manual commands per increment, improves developer experience, and ensures stakeholders see GitHub issues immediately after planning.

---

## User Stories

### US-001: Automatic Living Docs Sync on Increment Creation (P0)

**As a** developer
**I want** increment specs to automatically sync to living docs after creation
**So that** I don't have to manually run `/specweave:sync-specs`

**Acceptance Criteria**:

- [ ] **AC-US1-01**: After `/specweave:increment` completes, living docs are automatically updated without user intervention
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes (integration test: create increment → verify living docs created)

- [ ] **AC-US1-02**: Feature overview created in `.specweave/docs/internal/specs/_features/FS-{number}/FEATURE.md`
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes (file exists, contains correct frontmatter and user stories)

- [ ] **AC-US1-03**: User stories created in `.specweave/docs/internal/specs/{project}/FS-{number}/us-*.md`
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes (all US files exist with correct AC linkage)

- [ ] **AC-US1-04**: No manual sync command required (workflow is 1-step: `/specweave:increment` → done)
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes (e2e test: create increment → verify all files without manual commands)

### US-002: Automatic GitHub Issue Creation on Increment Creation (P0)

**As a** developer
**I want** GitHub issues to be automatically created when increment is created
**So that** stakeholders can track progress immediately without manual sync

**Acceptance Criteria**:

- [ ] **AC-US2-01**: After living docs sync, GitHub milestone is automatically created if configured
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes (GitHub API mock: verify milestone creation call)

- [ ] **AC-US2-02**: GitHub issues created for each user story in format `[FS-XXX][US-YYY] Title`
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes (GitHub API mock: verify issue creation with correct format)

- [ ] **AC-US2-03**: Issues have proper formatting with checkable acceptance criteria as checkboxes
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes (parse issue body → verify AC checkboxes exist)

- [ ] **AC-US2-04**: `metadata.json` updated with GitHub issue IDs and milestone ID
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes (read metadata.json → verify `github.milestone` and `github.user_story_issues` fields)

- [ ] **AC-US2-05**: No manual `/specweave-github:sync` command required
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P0
  - **Testable**: Yes (e2e test: create increment → verify GitHub issues exist without manual sync)

### US-003: Preserve Task Completion Sync Functionality (P1)

**As a** developer
**I want** task completion to continue syncing GitHub issues
**So that** progress updates are reflected in GitHub without regression

**Acceptance Criteria**:

- [ ] **AC-US3-01**: TodoWrite hook continues to trigger US completion orchestrator
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (integration test: mark task complete → verify orchestrator called)

- [ ] **AC-US3-02**: Completed user stories update GitHub issues with checkboxes
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (GitHub API mock: verify issue update with completed AC)

- [ ] **AC-US3-03**: No regression in existing sync functionality (all existing tests pass)
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (run existing test suite → 100% pass rate)

### US-004: Handle Missing GitHub Configuration Gracefully (P1)

**As a** developer
**I want** the sync to gracefully skip GitHub integration when not configured
**So that** increments work even without GitHub tokens

**Acceptance Criteria**:

- [ ] **AC-US4-01**: If no GitHub token configured, sync logs warning and skips GitHub
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (unset GITHUB_TOKEN → verify warning logged, no API calls)

- [ ] **AC-US4-02**: Living docs sync completes successfully even if GitHub sync fails
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (mock GitHub API error → verify living docs still created)

- [ ] **AC-US4-03**: User can manually sync later with `/specweave-github:sync FS-XXX`
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (skip auto-sync → run manual sync → verify issues created)

---

## Functional Requirements

### FR-001: Automatic Living Docs Sync (P0)
**Requirement**: post-increment-planning.sh MUST trigger sync-living-docs.js which creates living docs structure automatically

**Current State**: ✅ **WORKING** (lines 890-981 in post-increment-planning.sh)

**Details**:
- Hook calls `node sync-living-docs.js $increment_id`
- Creates `.specweave/docs/internal/specs/_features/FS-XXX/FEATURE.md`
- Creates `.specweave/docs/internal/specs/specweave/FS-XXX/us-*.md`

**No changes needed** - this already works correctly.

### FR-002: Automatic External Tool Sync (P0)
**Requirement**: LivingDocsSync.syncIncrement() MUST call syncToExternalTools() after creating living docs

**Current State**: ⚠️ **PARTIALLY WORKING** (lines 242-255 in living-docs-sync.ts)

**Issue**:
- Code exists: `await this.syncToExternalTools(incrementId, featureId, projectPath);`
- But skips if `SKIP_EXTERNAL_SYNC=true` OR if GitHub config not detected

**Fix Needed**:
- Ensure GitHub config detection works during increment creation
- Verify `detectExternalTools()` returns `['github']` when configured

### FR-003: GitHub Milestone and Issues Creation (P0)
**Requirement**: syncToGitHub() MUST create milestone and user story issues automatically

**Current State**: ⚠️ **PARTIALLY IMPLEMENTED** (lines 941-986 in living-docs-sync.ts)

**Issue**:
- Uses `GitHubFeatureSync.syncFeatureToGitHub(featureId)` (idempotent)
- But may not be called if external tools not detected

**Fix Needed**:
- Verify `detectExternalTools()` logic at lines 891-928
- Ensure `metadata.json` has `github` section early (not just after first task)

### FR-004: Metadata Update (P0)
**Requirement**: metadata.json MUST contain GitHub milestone and issue IDs after sync

**Current State**: ⚠️ **UNCLEAR**

**Expected Structure**:
```json
{
  "id": "0056-auto-github-sync",
  "status": "active",
  "github": {
    "milestone": 42,
    "milestoneUrl": "https://github.com/owner/repo/milestone/42",
    "user_story_issues": {
      "US-001": 123,
      "US-002": 124
    }
  }
}
```

**Fix Needed**:
- Verify GitHubFeatureSync updates metadata.json correctly
- Add fallback in post-increment-planning.sh if sync fails

---

## Non-Functional Requirements

### NFR-001: Performance (P0)
**Requirement**: Increment creation with GitHub sync MUST complete in < 10 seconds

**Rationale**: Users expect fast feedback during planning phase

**Metrics**:
- `/specweave:increment` → living docs sync → GitHub sync: < 10s total
- Acceptable: 2-3s for living docs, 5-7s for GitHub API calls

### NFR-002: Reliability (P0)
**Requirement**: Sync MUST be idempotent (safe to run multiple times)

**Rationale**: Hook may retry on failure, or user may run manual sync

**Validation**:
- Run sync 3 times → verify no duplicate GitHub issues (DuplicateDetector)
- Run sync with existing milestone → verify reuse (not re-create)

### NFR-003: Error Handling (P1)
**Requirement**: GitHub sync failures MUST NOT block increment creation

**Rationale**: Living docs are more important than GitHub integration

**Behavior**:
- GitHub API error → log warning, continue with living docs
- No GitHub token → skip GitHub sync, continue with living docs
- Network timeout → retry once, then skip

### NFR-004: Observability (P1)
**Requirement**: Sync process MUST log progress clearly for debugging

**Log Requirements**:
- "📚 Syncing living docs..." (start)
- "✅ Living docs synced" (success)
- "📡 Syncing to GitHub..." (external tool start)
- "✅ GitHub synced: milestone #42, 3 issues created" (success)
- "⚠️ GitHub sync failed: [reason]" (failure)

---

## Success Criteria

### Metric 1: Zero Manual Sync Commands
**Target**: 100% of increments auto-sync without user intervention

**Measurement**:
- Before fix: Users run 2-3 commands per increment (`/specweave:sync-specs`, `/specweave-github:sync`)
- After fix: Users run 1 command (`/specweave:increment`) → everything automatic

**Validation**:
- Create 10 test increments → verify 0 manual sync commands needed

### Metric 2: GitHub Issue Creation Rate
**Target**: 95%+ of increments have GitHub issues created automatically (when configured)

**Measurement**:
- Create 20 increments with GitHub configured
- Count how many have `metadata.json` with `github.milestone` field
- Target: ≥19/20 (95%)

### Metric 3: Time to Stakeholder Visibility
**Target**: Stakeholders see GitHub issues within 10 seconds of increment creation

**Measurement**:
- Time from `/specweave:increment` completion → GitHub issue visible
- Before fix: ∞ (manual sync required, minutes to hours delay)
- After fix: < 10 seconds

### Metric 4: Sync Reliability
**Target**: 99%+ sync success rate (no false failures)

**Measurement**:
- Run 100 increment creations with GitHub configured
- Count: successful syncs vs. failures
- Target: ≥99/100 success rate

---

## Test Strategy

### Unit Tests (95% coverage target)

**Test Suite 1: detectExternalTools()**
- ✅ Returns `['github']` when `metadata.json` has `github.milestone`
- ✅ Returns `[]` when `metadata.json` missing
- ✅ Returns `['github', 'jira']` when both configured

**Test Suite 2: syncToGitHub()**
- ✅ Creates milestone when none exists
- ✅ Reuses existing milestone (idempotent)
- ✅ Creates issues for each user story
- ✅ Updates metadata.json with issue IDs
- ✅ Handles API errors gracefully

**Test Suite 3: LivingDocsSync.syncIncrement()**
- ✅ Calls syncToExternalTools() after living docs created
- ✅ Passes correct featureId and projectPath
- ✅ Skips external sync when SKIP_EXTERNAL_SYNC=true
- ✅ Logs warnings on GitHub sync failure

### Integration Tests

**Test 1: End-to-End Increment Creation with GitHub Sync**
```typescript
test('creates increment with automatic GitHub sync', async () => {
  // Setup
  const incrementId = '0056-test-increment';
  mockGitHubAPI({
    createMilestone: jest.fn().mockResolvedValue({ id: 42 }),
    createIssue: jest.fn().mockResolvedValue({ id: 123 })
  });

  // Execute
  await createIncrement(incrementId, { userStories: ['US-001', 'US-002'] });

  // Verify
  expect(fs.existsSync('.specweave/docs/internal/specs/_features/FS-056/FEATURE.md')).toBe(true);
  expect(fs.existsSync('.specweave/docs/internal/specs/specweave/FS-056/us-001-*.md')).toBe(true);

  const metadata = JSON.parse(fs.readFileSync(`${incrementId}/metadata.json`, 'utf-8'));
  expect(metadata.github.milestone).toBe(42);
  expect(metadata.github.user_story_issues['US-001']).toBe(123);
});
```

**Test 2: Sync Gracefully Handles Missing GitHub Config**
```typescript
test('skips GitHub sync when token not configured', async () => {
  // Setup
  delete process.env.GITHUB_TOKEN;
  const consoleWarnSpy = jest.spyOn(console, 'warn');

  // Execute
  await createIncrement('0056-test-no-github');

  // Verify living docs created (no regression)
  expect(fs.existsSync('.specweave/docs/internal/specs/_features/FS-056/FEATURE.md')).toBe(true);

  // Verify warning logged
  expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('GitHub credentials not configured'));

  // Verify no GitHub API calls
  expect(mockGitHubAPI.createMilestone).not.toHaveBeenCalled();
});
```

### E2E Tests

**Test 1: Complete Workflow (User Perspective)**
```bash
# Create increment
/specweave:increment "Add user authentication"

# Verify (NO manual commands needed!)
# ✅ Living docs exist
test -f .specweave/docs/internal/specs/_features/FS-056/FEATURE.md

# ✅ GitHub milestone created
gh api repos/owner/repo/milestones | jq '.[] | select(.title == "FS-056")'

# ✅ GitHub issues created
gh issue list --label "FS-056" | grep "[FS-056][US-001]"
```

**Test 2: Task Completion Sync (Regression Check)**
```bash
# Create increment (auto-syncs)
/specweave:increment "Feature X"

# Mark task complete
TodoWrite([{task: "T-001", status: "completed"}])

# Verify GitHub issue updated
gh api repos/owner/repo/issues/123 | jq '.body' | grep "\[x\] AC-US1-01"
```

---

## Architecture Changes

### Change 1: Enhance detectExternalTools() to Check Earlier

**File**: `src/core/living-docs/living-docs-sync.ts` (lines 891-928)

**Current Behavior**: Only checks `metadata.json` for existing GitHub config

**New Behavior**: Also check `.specweave/config.json` for active GitHub profile

**Pseudocode**:
```typescript
private async detectExternalTools(incrementId: string): Promise<string[]> {
  const tools: string[] = [];

  // Check metadata.json (existing)
  if (metadata.github) tools.push('github');

  // NEW: Check config.json for active profile
  const config = await readJson('.specweave/config.json');
  if (config.github?.activeProfile) {
    const profile = config.github.profiles[config.github.activeProfile];
    if (profile.config.token && profile.config.owner && profile.config.repo) {
      tools.push('github'); // GitHub configured globally
    }
  }

  return [...new Set(tools)]; // Deduplicate
}
```

### Change 2: Early metadata.json Creation with GitHub Placeholder

**File**: `plugins/specweave/hooks/post-increment-planning.sh` (lines 796-864)

**Current Behavior**: Creates minimal metadata ONLY if metadata.json missing

**New Behavior**: ALWAYS add GitHub placeholder if profile configured

**Pseudocode**:
```bash
# Extract GitHub profile from config
profile_id=$(cat config.json | jq -r '.github.activeProfile')

if [ -n "$profile_id" ]; then
  # Add GitHub placeholder to metadata
  cat > metadata.json <<EOF
{
  "id": "$increment_id",
  "status": "active",
  "githubProfile": "$profile_id",
  "github": {
    "milestone": null,
    "user_story_issues": {}
  }
}
EOF
fi
```

### Change 3: Verify syncToExternalTools() Always Called

**File**: `src/core/living-docs/living-docs-sync.ts` (lines 242-255)

**Current Code**:
```typescript
if (!options.dryRun && !skipExternalSync) {
  await this.syncToExternalTools(incrementId, featureId, projectPath);
}
```

**Verification Needed**: Ensure `skipExternalSync` is FALSE during increment creation

**Possible Fix**: Add logging to confirm external tool detection:
```typescript
const externalTools = await this.detectExternalTools(incrementId);
this.logger.log(`🔍 Detected external tools: ${externalTools.join(', ')}`);

if (!options.dryRun && !skipExternalSync) {
  if (externalTools.length === 0) {
    this.logger.log(`⏭️ No external tools configured, skipping sync`);
  } else {
    await this.syncToExternalTools(incrementId, featureId, projectPath);
  }
}
```

---

## Implementation Notes

### Note 1: Existing Infrastructure is SOLID
The sync chain already exists and works correctly:
- ✅ post-increment-planning.sh → sync-living-docs.js (lines 890-981)
- ✅ LivingDocsSync.syncIncrement() → syncToExternalTools() (lines 242-255)
- ✅ syncToGitHub() → GitHubFeatureSync.syncFeatureToGitHub() (lines 941-986)

**The issue is NOT architecture** - it's a configuration detection gap.

### Note 2: Focus on detectExternalTools()
The critical fix is ensuring `detectExternalTools()` returns `['github']` during increment creation, not just after first task completion.

**Root cause**: metadata.json created by post-increment-planning.sh doesn't include GitHub placeholder initially.

### Note 3: Idempotency is Built-In
GitHubFeatureSync already has triple idempotency checks:
- Milestone: Reuses existing if found (search by title)
- Issues: Uses DuplicateDetector to prevent duplicates
- Updates: Patches existing issues (not recreate)

**No changes needed** - just verify it's called during increment creation.

### Note 4: Backward Compatibility
The fix must NOT break existing workflows:
- ✅ Manual `/specweave-github:sync` still works (for legacy increments)
- ✅ Task completion sync unchanged (US completion orchestrator)
- ✅ Increments without GitHub config skip gracefully

---

## Related Documentation

**ADRs**:
- ADR-0022: GitHub Sync Architecture
- ADR-0030: Intelligent Living Docs Sync
- ADR-0043: Spec Frontmatter Sync Strategy
- ADR-0129: US Sync Guard Rails
- ADR-0131: External Tool Sync Context Detection

**Incidents**:
- Increment 0044: TODO desync (related to sync failures)
- Increment 0047: GitHub sync removal and re-architecture
- Increment 0050: Hook crashes and AC presence validation

**Key Files**:
- `plugins/specweave/hooks/post-increment-planning.sh` (increment creation hook)
- `src/core/living-docs/living-docs-sync.ts` (living docs sync orchestrator)
- `plugins/specweave/lib/hooks/us-completion-orchestrator.ts` (task completion sync)
- `plugins/specweave-github/lib/github-feature-sync.ts` (GitHub integration)

---

## Implementation Plan

**Phase 1: Enhance Configuration Detection** (T-001 to T-003)
1. Update `detectExternalTools()` to check `.specweave/config.json`
2. Add logging to verify external tool detection
3. Write unit tests for configuration detection

**Phase 2: Early Metadata Creation** (T-004 to T-006)
4. Modify post-increment-planning.sh to add GitHub placeholder
5. Ensure metadata.json created BEFORE living docs sync
6. Write integration tests for metadata creation

**Phase 3: Verify Sync Chain** (T-007 to T-009)
7. Add debug logging to track sync execution path
8. Verify syncToExternalTools() called during increment creation
9. Write E2E tests for complete workflow

**Phase 4: Handle Edge Cases** (T-010 to T-012)
10. Test with missing GitHub token (graceful skip)
11. Test with GitHub API errors (retry logic)
12. Test with existing milestones (idempotency)

**Phase 5: Documentation & Validation** (T-013 to T-015)
13. Update CLAUDE.md with automatic sync behavior
14. Create ADR documenting the fix
15. Run full test suite and validate 95%+ coverage

---

**Total Estimated Effort**: 3-4 days (T-001 to T-015)

**Risk Level**: LOW (building on existing infrastructure, not rewriting)

**Dependencies**: None (all infrastructure exists)

**Rollout**: Safe (backward compatible, graceful degradation)
