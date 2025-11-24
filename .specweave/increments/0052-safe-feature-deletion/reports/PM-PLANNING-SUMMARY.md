# PM Planning Summary: Safe Feature Deletion Command

**Increment**: 0052-safe-feature-deletion
**Feature ID**: FS-052
**Created**: 2025-11-23
**PM Agent**: Product Manager
**Status**: Planning Complete (awaiting increment 0051 completion)

---

## Executive Summary

Created comprehensive product specification for **Safe Feature Deletion Command** (`/specweave:delete-feature`), a P1 feature that addresses critical pain points in manual feature cleanup.

**Problem**: Manual deletion with `rm -rf` fails due to git tracking, hook recreation, orphaned references, and lack of audit trail.

**Solution**: Automated deletion command with 4-tier safety gates, git integration, GitHub issue cleanup, and comprehensive audit logging.

**Business Impact**:
- Prevents duplicate feature confusion (FS-050 vs FS-051 incidents)
- Reduces manual cleanup from 30 minutes → 2 minutes (93% time savings)
- Improves data integrity (zero orphaned increments)
- Provides accountability (full audit trail)

---

## Specification Deliverables

### 1. Increment Spec.md ✅
**Location**: `.specweave/increments/0052-safe-feature-deletion/spec.md`

**Contents**:
- 6 comprehensive user stories (US-001 to US-006)
- 31 acceptance criteria with AC-IDs (AC-US1-01 to AC-US6-06)
- 7 functional requirements (FR-001 to FR-007)
- 5 non-functional requirements (NFR-001 to NFR-005)
- 4 success metrics with measurement methods
- Complete test strategy (TDD with 85% coverage target)

**Highlights**:
- **US-001**: Safe deletion with validation (blocks if active increments found)
- **US-002**: Force mode (bypasses validation with warnings)
- **US-003**: Dry-run mode (preview without executing)
- **US-004**: Git integration (proper `git rm` + commits)
- **US-005**: GitHub issue deletion (cleans up external state)
- **US-006**: Audit trail (full deletion history)

### 2. Metadata.json ✅
**Location**: `.specweave/increments/0052-safe-feature-deletion/metadata.json`

**Configuration**:
- Type: feature
- Priority: P1 (high priority)
- Test Mode: TDD (test-driven development)
- Coverage Target: 85% minimum
- Feature ID: FS-052

---

## User Stories Overview

### US-001: Safe Deletion with Validation (6 ACs)
**Priority**: P1
**Estimated**: 4 hours

**Key Features**:
- Validates no active increments reference the feature
- Warns about completed increments (doesn't block)
- Shows detailed validation report
- Requires explicit confirmation
- Blocks deletion if unsafe

**Why It Matters**: Prevents accidental deletion of features still in use by active work.

---

### US-002: Force Deletion Mode (5 ACs)
**Priority**: P1
**Estimated**: 3 hours

**Key Features**:
- `--force` flag bypasses active validation
- Logs warnings about orphaned increments
- Updates orphaned metadata (removes feature_id)
- Still requires confirmation (safety!)
- Shows orphan impact report

**Why It Matters**: Allows cleanup of stale features after manual increment updates.

---

### US-003: Dry-Run Mode (6 ACs)
**Priority**: P1
**Estimated**: 2 hours

**Key Features**:
- `--dry-run` previews without executing
- Shows complete deletion plan
- Reports file list, git status, references
- Can combine with --force
- Zero side effects

**Why It Matters**: Builds confidence - users can preview before committing to deletion.

---

### US-004: Git Integration (6 ACs)
**Priority**: P1
**Estimated**: 4 hours

**Key Features**:
- Uses `git rm` for tracked files
- Uses `rm` for untracked files
- Creates descriptive commit
- Handles git errors gracefully
- Supports `--no-git` flag

**Why It Matters**: Prevents deleted files from reappearing after git operations.

---

### US-005: GitHub Issue Deletion (6 ACs)
**Priority**: P1
**Estimated**: 3 hours

**Key Features**:
- Finds issues via `[FS-###][US-###]` pattern
- Shows issue list before deletion
- Requires separate confirmation
- Handles API errors (rate limits, auth)
- Supports `--no-github` flag

**Why It Matters**: Keeps GitHub issues in sync with local features.

---

### US-006: Audit Trail (6 ACs)
**Priority**: P2
**Estimated**: 2 hours

**Key Features**:
- Logs to `.specweave/logs/feature-deletions.log`
- JSON format with full context
- Includes user, timestamp, reason, mode
- Tracks orphaned increments
- Provides `/specweave:audit-deletions` viewer

**Why It Matters**: Accountability and ability to review past deletions.

---

## Functional Requirements Summary

| ID | Requirement | Priority | Coverage |
|----|-------------|----------|----------|
| FR-001 | Feature detection & validation | P1 | Unit + Integration |
| FR-002 | Safe deletion mode (default) | P1 | Unit + Integration + E2E |
| FR-003 | Force deletion mode | P1 | Unit + Integration + E2E |
| FR-004 | Dry-run mode | P1 | Unit + E2E |
| FR-005 | Git integration | P1 | Integration |
| FR-006 | GitHub issue deletion | P1 | Integration (mocked API) |
| FR-007 | Audit logging | P2 | Unit + Integration |

---

## Non-Functional Requirements Summary

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-001 | Performance | < 5 seconds | Benchmark test |
| NFR-002 | Data safety | Zero silent deletions | User confirmation required |
| NFR-003 | Error handling | Graceful degradation | Error simulation tests |
| NFR-004 | User experience | Clear output | Manual UX review |
| NFR-005 | Test coverage | 85% minimum | CI coverage report |

---

## Success Metrics

### 1. Adoption Rate
**Target**: 80%+ maintainers use command vs manual deletion
**Measurement**: Telemetry (opt-in)
**Timeline**: 3 months post-release

### 2. Error Rate
**Target**: < 5% operations result in errors
**Measurement**: Audit log analysis
**Timeline**: Ongoing

### 3. Data Integrity
**Target**: 0 orphaned increments
**Measurement**: Monthly metadata scan
**Timeline**: 1 month post-release

### 4. User Satisfaction
**Target**: 4.5/5 average rating
**Measurement**: Post-deletion survey (optional)
**Timeline**: 6 months post-release

---

## Test Strategy

### Test-Driven Development (TDD)
**Approach**: RED → GREEN → REFACTOR

**Coverage Breakdown**:
- Unit tests: 90%+ (validation, git, audit)
- Integration tests: 80%+ (end-to-end flows)
- E2E tests: 70%+ (CLI interface)

**Total Target**: 85% minimum (enforced by CI)

### Test Layers

**Layer 1: Unit Tests** (Vitest)
- Feature detection logic
- Git status parsing
- Increment metadata scanning
- Validation rules
- Audit logging

**Layer 2: Integration Tests** (Vitest + temp git repo)
- End-to-end deletion flow
- Git integration (real operations)
- GitHub API (mocked responses)

**Layer 3: E2E Tests** (Vitest + spawn CLI)
- Command execution
- User confirmations
- Error recovery

---

## Implementation Plan

**Total Estimate**: 16 hours (2 days)

### Phase 1: Feature Detection & Validation (4 hours)
- FR-001: Feature detection logic
- FR-002: Validation rules (active/completed/archived)
- Unit tests for detection & validation

### Phase 2: Safe Deletion & Git Integration (4 hours)
- FR-002: Safe deletion flow
- FR-005: Git rm + commit integration
- Integration tests with temp git repo

### Phase 3: Force Mode & Orphan Handling (3 hours)
- FR-003: Force deletion bypass
- Orphaned increment metadata updates
- Unit tests for force mode

### Phase 4: GitHub Issue Deletion (3 hours)
- FR-006: GitHub API integration
- Issue detection via pattern matching
- Integration tests with mocked API

### Phase 5: Audit Logging & Dry-Run (2 hours)
- FR-007: Audit log implementation
- FR-004: Dry-run preview mode
- Unit tests for logging

---

## Dependencies

### Required
- Git CLI (for `git rm`, commit operations)
- GitHub CLI (`gh`) or REST API (for issue deletion)
- Living docs structure (`.specweave/docs/internal/specs/`)
- Increment metadata format (metadata.json with feature_id)

### Optional
- ANSI color support (for better UX)
- Telemetry system (for adoption metrics)

---

## Risk Mitigation

### Risk 1: Accidental Data Loss
**Mitigation**:
- Always require confirmation
- Dry-run mode for preview
- Git commits as recovery point
- Audit trail for tracking

### Risk 2: Git Merge Conflicts
**Mitigation**:
- Detect git errors gracefully
- Provide clear error messages
- Suggest manual resolution

### Risk 3: GitHub API Rate Limits
**Mitigation**:
- Handle 429 errors gracefully
- Provide `--no-github` flag
- Retry with exponential backoff

### Risk 4: Orphaned Increments
**Mitigation**:
- Force mode updates metadata
- Clear warnings in force report
- Manual cleanup guidance

---

## Living Docs Creation (Next Steps)

**CRITICAL**: Living docs will be created via `/specweave:sync-docs update` after increment 0051 is completed.

**Expected Living Docs Structure**:
```
.specweave/docs/internal/specs/
├── _features/
│   └── FS-052/
│       └── FEATURE.md                    # Feature overview
└── specweave/
    └── FS-052/
        ├── us-001-safe-deletion.md       # US-001 spec
        ├── us-002-force-mode.md          # US-002 spec
        ├── us-003-dry-run.md             # US-003 spec
        ├── us-004-git-integration.md     # US-004 spec
        ├── us-005-github-cleanup.md      # US-005 spec
        └── us-006-audit-trail.md         # US-006 spec
```

**Living docs will include**:
- Complete user story details
- Acceptance criteria with AC-IDs
- BDD test scenarios (Given/When/Then)
- Implementation notes
- Cross-references to increment spec

---

## Increment Discipline Status

⚠️ **IMPORTANT**: This increment (0052) is in **planned** status and CANNOT be started until:

1. **Increment 0051 is completed** (currently 0/28 tasks done)
   - OR closed via `/specweave:done 0051`
   - OR abandoned via `/specweave:abandon 0051`

**Current WIP Status**: 1/3 active (increment 0051)

**Why This Matters**:
- Enforces focus on ONE increment at a time
- Prevents scope creep
- Ensures living docs stay current
- Maintains high quality standards

**When increment 0051 is done**:
1. Run `/specweave:sync-docs update` to create FS-052 living docs
2. Run `/specweave:do` to start increment 0052
3. Living docs will auto-generate from this spec.md

---

## Quality Gates

Before this increment can be closed:

### Gate 1: All P1 Tasks Completed ✅
- All tasks in tasks.md marked `[x] completed`
- P2/P3 tasks can be deferred

### Gate 2: All Tests Passing ✅
- 85%+ code coverage
- All unit tests green
- All integration tests green
- All E2E tests green

### Gate 3: Documentation Updated ✅
- Living docs synced via `/specweave:sync-docs update`
- CLAUDE.md updated with new command
- README.md includes command reference

### Gate 4: External Sync (if enabled) ✅
- GitHub issues created for user stories
- GitHub milestone created for FS-052
- Status synced to external tracker

---

## Validation Report

✅ **Increment Spec Created**: spec.md (31 ACs, 6 user stories)
✅ **Metadata Configured**: metadata.json (TDD, 85% coverage, FS-052)
✅ **PM Planning Complete**: This summary report
⏳ **Living Docs Pending**: Awaiting `/specweave:sync-docs update`
⏳ **Plan.md Pending**: Awaiting Architect Agent
⏳ **Tasks.md Pending**: Awaiting test-aware-planner Agent

---

## Next Steps (After 0051 Completion)

1. **Complete increment 0051** (0/28 tasks remaining)
2. **Run `/specweave:done 0051`** (validates closure)
3. **Run `/specweave:sync-docs update`** (creates FS-052 living docs)
4. **Invoke Architect Agent** (create plan.md)
5. **Invoke test-aware-planner** (create tasks.md)
6. **Run `/specweave:do`** (start increment 0052)

---

**PM Agent Sign-off**: Planning complete ✅
**Status**: Ready for architecture & task planning (after 0051 closure)
**Estimated Delivery**: 2 days (16 hours) after start
