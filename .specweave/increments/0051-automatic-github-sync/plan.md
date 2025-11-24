---
increment: 0051-automatic-github-sync
title: "Automatic GitHub Sync with Permission Gates"
feature_id: FS-049
estimated_hours: 50
phases: 5
architecture_docs:
  - ../../docs/internal/architecture/system-design.md
  - ../../docs/internal/architecture/adr/0065-three-tier-permission-gates.md
  - ../../docs/internal/architecture/adr/0066-sync-coordinator-integration-point.md
  - ../../docs/internal/architecture/adr/0067-three-layer-idempotency-caching.md
  - ../../docs/internal/architecture/adr/0068-circuit-breaker-error-isolation.md
---

# Implementation Plan: Automatic GitHub Sync with Permission Gates

**Goal**: Integrate GitHub issue creation into `SyncCoordinator.syncIncrementCompletion()` workflow, eliminating manual `/specweave-github:sync` commands.

**Approach**: TDD with 85%+ coverage, following 5-phase implementation plan

---

## Architecture Overview

### Integration Point (ADR-0066)

**Decision**: Extend `SyncCoordinator.syncIncrementCompletion()` to include GitHub sync after living docs sync.

```typescript
// src/sync/sync-coordinator.ts

async syncIncrementCompletion(): Promise<SyncResult> {
  // GATE 1: Living docs sync (existing)
  await this.syncLivingDocs();

  // GATE 2-4: GitHub sync (NEW)
  if (allGatesPass) {
    await this.createGitHubIssuesForUserStories(config);
  }

  return result;
}
```

**Why SyncCoordinator?**
- Single source of truth for all sync operations
- Reuses permission gate evaluation logic
- Leverages existing hook infrastructure (`post-task-completion.sh`)
- Atomic operation (living docs + GitHub together)

---

### Permission Gates (ADR-0065)

**4-Gate Hierarchical Architecture**:

```
GATE 1: canUpsertInternalItems (Living Docs)
    ↓ false → read-only mode (skip all sync)
GATE 2: canUpdateExternalItems (External Trackers)
    ↓ false → living-docs-only mode
GATE 3: autoSyncOnCompletion (Automatic Trigger) ← NEW
    ↓ false → manual-only mode
GATE 4: sync.github.enabled (GitHub-Specific) ← NEW
    ↓ false → external-disabled mode
    ↓ ALL TRUE → full-sync mode ✅
```

**Configuration**:
```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,    // GATE 1
      "canUpdateExternalItems": true,    // GATE 2
      "autoSyncOnCompletion": true       // GATE 3 (default: true)
    },
    "github": {
      "enabled": true,                   // GATE 4 (default: true if configured)
      "owner": "org",
      "repo": "app"
    }
  }
}
```

**User Messages** (Clear, actionable):
- GATE 1 false: `ℹ️  Living docs sync disabled (canUpsertInternalItems=false)`
- GATE 3 false: `⚠️  Automatic sync disabled. Living docs updated locally. Run /specweave-github:sync to sync manually`
- GATE 4 false: `⏭️  GitHub sync SKIPPED (sync.github.enabled=false)`

---

### Three-Layer Idempotency Caching (ADR-0067)

**Problem**: Re-running sync must create **zero duplicates** while handling partial failures.

**Solution**: 3-layer cache with backfilling

```
┌──────────────────────────────────────────┐
│ Layer 1: User Story Frontmatter (<1ms)  │
│  external_tools.github.number: 123      │
│  If exists → skip (FASTEST)             │
└────────────────┬─────────────────────────┘
                 ↓ miss
┌──────────────────────────────────────────┐
│ Layer 2: metadata.json (<5ms)           │
│  github.issues: [{US-001, #123}]        │
│  If exists → backfill L1, skip          │
└────────────────┬─────────────────────────┘
                 ↓ miss
┌──────────────────────────────────────────┐
│ Layer 3: GitHub API (500-2000ms)        │
│  DuplicateDetector (--limit 50)         │
│  If exists → backfill L1 & L2, skip     │
└────────────────┬─────────────────────────┘
                 ↓ miss
            CREATE ISSUE
```

**Backfilling Strategy**: When Layer 2 or 3 finds issue, update faster layers for future syncs.

**Performance**:
- First sync (cold cache): ~6 seconds
- Second sync (warm cache): **4ms** (99.9% faster ✅)
- Partial failure recovery: ~3 seconds (50% faster)

---

### Circuit Breaker Error Isolation (ADR-0068)

**Problem**: GitHub API failures must **NEVER crash user workflow**.

**Solution**: 7-Layer Error Isolation

```
Layer 1: Emergency Kill Switch (SPECWEAVE_DISABLE_HOOKS=1)
Layer 2: Circuit Breaker (3 failures → auto-disable)
Layer 3: File Locking (prevent concurrent execution)
Layer 4: TypeScript Try-Catch (catch all sync errors)
Layer 5: Per-Issue Try-Catch (partial completion: 2 of 4 OK)
Layer 6: Bash `set +e` + `exit 0` (NEVER crash Claude Code)
Layer 7: User-Facing Error Messages (actionable recovery)
```

**Circuit Breaker**:
- File: `.specweave/state/.hook-circuit-breaker-github`
- Threshold: 3 consecutive failures → OPEN
- Recovery: Reset on success OR manual `rm .hook-circuit-breaker-github`

**Error Messages** (7 scenarios):
1. Rate Limit: "Limit resets at: 2025-11-22 15:30:00 UTC"
2. Auth: "Run: gh auth login"
3. Network: "Run /specweave-github:sync to retry"
4. Circuit Breaker: "Reset: rm .specweave/state/.hook-circuit-breaker-github"

---

## 5-Phase Implementation

### **Phase 1: Permission Gates** (8 hours | T-001 → T-005)

**Goal**: Add `autoSyncOnCompletion` and tool-specific gates, implement 4-gate evaluation.

**Deliverables**:
1. Config schema updates (`src/core/config/types.ts`)
2. Gate evaluation logic (`src/sync/sync-coordinator.ts`)
3. User-facing messages for each gate
4. Update `specweave init` to generate new config

**Tests**: 16 gate combinations (truth table), config generation

---

### **Phase 2: GitHub Issue Creation** (12 hours | T-006 → T-010)

**Goal**: Implement core issue creation in `SyncCoordinator` and `GitHubClientV2`.

**Deliverables**:
1. `SyncCoordinator.createGitHubIssuesForUserStories()` - orchestrate issue creation
2. `GitHubClientV2.createUserStoryIssue()` - format and create issue
3. Frontmatter updates (`external_tools.github.number`)
4. Metadata updates (`github.issues[]`)
5. Success message logging

**Tests**: Issue creation, title formatting, milestone linking

---

### **Phase 3: Idempotency** (10 hours | T-011 → T-015)

**Goal**: Implement 3-layer cache (100% duplicate prevention).

**Deliverables**:
1. Layer 1: Frontmatter cache check (<1ms)
2. Layer 2: Metadata cache check (<5ms)
3. Layer 3: GitHub API query with `DuplicateDetector` (500-2000ms)
4. Cache backfilling after each layer
5. Atomic cache updates after issue creation

**Tests**: Each layer individually, full idempotency integration

---

### **Phase 4: Error Isolation** (8 hours | T-016 → T-021)

**Goal**: 7-layer error isolation (zero workflow crashes).

**Deliverables**:
1. Layer 4: TypeScript try-catch wrappers
2. Layer 5: Per-issue error isolation
3. Layer 6: Bash hook error handling
4. Layer 2: Circuit breaker implementation
5. Layer 7: User-facing error messages

**Tests**: Error catching, partial completion, circuit breaker

---

### **Phase 5: Testing & Docs** (10 hours | T-022 → T-028)

**Goal**: 85%+ coverage, documentation, release preparation.

**Deliverables**:
1. Integration tests (full sync flow)
2. E2E tests (real GitHub repo)
3. Performance tests (hook execution < 10s)
4. User documentation (README, troubleshooting)
5. Migration guide (v0.24 → v0.25)
6. Final QA (`/specweave:qa 0051`)

---

## Files Modified/Created

**Core TypeScript** (6 files, ~450 lines):
- `src/sync/sync-coordinator.ts` +200 lines
- `src/core/config/types.ts` +20 lines
- `src/cli/commands/init.ts` +30 lines
- `src/utils/frontmatter-updater.ts` NEW +100 lines
- `src/utils/metadata-updater.ts` NEW +80 lines

**GitHub Plugin** (1 file, ~150 lines):
- `plugins/specweave-github/lib/github-client-v2.ts` +150 lines

**Tests** (13 files, ~1,900 lines):
- Unit tests: 10 files (~1,200 lines)
- Integration tests: 1 file (~300 lines)
- E2E tests: 1 file (~200 lines)
- Performance tests: 1 file (~100 lines)

**Documentation** (4 files, ~900 lines):
- `README.md` +50 lines
- `github-sync-recovery.md` NEW +500 lines
- `v0.24-to-v0.25.md` NEW +300 lines
- `CHANGELOG.md` +30 lines

**Total**: ~3,400 lines (implementation + tests + docs)

---

## Risk Mitigation

| Risk | Mitigation | Fallback |
|------|------------|----------|
| GitHub Rate Limits | Idempotency (frontmatter cache), batch requests | Manual sync with retry |
| Stale Lock Files | 15s timeout, stale lock cleanup | Manual lock removal |
| Permission Confusion | Clear messages, sensible defaults, truth table docs | FAQ + troubleshooting |
| Hook Performance | Background execution, <10s target, circuit breaker | Kill switch, investigate |
| Duplicate Issues | 3-layer cache, `DuplicateDetector`, `--limit 50` | Manual cleanup script |

---

## Success Metrics

| Metric | Target | Verification |
|--------|--------|-------------|
| Automation Rate | 100% | No manual sync commands needed |
| Time Savings | 2-5 min/increment | Eliminate manual sync step |
| Idempotency | 100% | Zero duplicates on re-sync |
| Test Coverage | ≥85% | Coverage report |
| Error Rate | <1% | Production monitoring |
| Workflow Crashes | 0 | GitHub failures don't crash |
| Performance | <10s sync | Background, non-blocking |

---

## References

**ADRs**:
- [ADR-0065: Three-Tier Permission Gates](../../docs/internal/architecture/adr/0065-three-tier-permission-gates.md)
- [ADR-0066: SyncCoordinator Integration Point](../../docs/internal/architecture/adr/0066-sync-coordinator-integration-point.md)
- [ADR-0067: Three-Layer Idempotency Caching](../../docs/internal/architecture/adr/0067-three-layer-idempotency-caching.md)
- [ADR-0068: Circuit Breaker Error Isolation](../../docs/internal/architecture/adr/0068-circuit-breaker-error-isolation.md)

**Specification**: [spec.md](./spec.md)

**Tasks**: [tasks.md](./tasks.md) - 28 tasks with embedded tests

---

**Status**: Ready for implementation
**Next Step**: `/specweave:do` to begin Phase 1
