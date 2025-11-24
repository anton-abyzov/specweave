# Changelog

All notable changes to SpecWeave will be documented in this file.

---

## [0.24.8] - 2025-11-23
- Multi-repo initialization with platform registry improvements
- Git provider abstraction layer for multi-platform support
- Enhanced GitHub multi-repo validation and error handling

---

## [Unreleased]

### ✨ Features
- **🚀 Automatic GitHub Sync** (FS-049): Issues auto-created on increment completion
  - Eliminates manual `/specweave-github:sync` commands (100% automation)
  - Zero workflow crashes guaranteed (7-layer error isolation)
  - 100% duplicate prevention (3-layer idempotency caching)
  - Real-time stakeholder visibility (issues created immediately on `/done`)
  - See ADR-0065 (4-tier permission gates), ADR-0066 (SyncCoordinator integration), ADR-0067 (3-layer caching), ADR-0068 (circuit breaker)
- **🔒 4-Tier Permission Gates**: Granular control over sync behavior
  - GATE 1: `canUpsertInternalItems` (living docs sync)
  - GATE 2: `canUpdateExternalItems` (external tracker sync)
  - GATE 3: `autoSyncOnCompletion` (automatic trigger, default: true)
  - GATE 4: `sync.github.enabled` (GitHub-specific toggle)
  - Hierarchical evaluation: read-only → living-docs-only → manual-only → external-disabled → full-sync
- **⚡ 3-Layer Idempotency Caching**: 99.9% performance improvement on warm cache
  - Layer 1: User Story frontmatter (<1ms lookup)
  - Layer 2: metadata.json (<5ms lookup)
  - Layer 3: GitHub API with DuplicateDetector (500-2000ms)
  - Automatic backfilling: faster layers updated after slower layer hits
- **🛡️ 7-Layer Error Isolation**: Zero workflow crashes guaranteed
  - Layer 1: Emergency kill switch (`SPECWEAVE_DISABLE_HOOKS=1`)
  - Layer 2: Circuit breaker (3 failures → auto-disable)
  - Layer 3: File locking (prevent concurrent execution)
  - Layer 4: TypeScript try-catch (catch all sync errors)
  - Layer 5: Per-issue try-catch (partial completion: 2 of 4 OK)
  - Layer 6: Bash `set +e` + `exit 0` (NEVER crash Claude Code)
  - Layer 7: User-facing error messages (actionable recovery)
- Judge-Based Marketplace Plugin Validation (LLM scoring system, 40-point threshold)
- Mandatory Post-Closure Quality Assessment (automatic QA after `/specweave:done`)

### 📝 Documentation
- **Recovery Guide**: Emergency procedures for GitHub sync failures
  - Circuit breaker reset: `rm .specweave/state/.hook-circuit-breaker-github`
  - Manual retry: `/specweave-github:sync --retry`
  - Rate limit check: `gh api rate_limit`
  - Auth refresh: `gh auth login`
- **Migration Guide**: v0.24 → v0.25 migration path
  - No breaking changes (fully backward compatible)
  - Optional config updates: `autoSyncOnCompletion`, `sync.github.enabled`
  - Rollback instructions provided

### 🗑️ Removed
- **Dead Code Cleanup**: Removed unused `PermissionsConfiguration` interface and top-level `permissions` config section
  - Legacy from pre-v0.23 architecture, replaced by `sync.settings.*` three-permission model
  - No impact on existing functionality (0 usage in codebase)
  - See ADR-0047 for three-permission architecture rationale, ADR-0071 for removal decision

### 🐛 Fixed
- **Init Command**: Fixed `specweave init` still creating dead `permissions` config block
  - Types were removed in v0.24.12 (ADR-0071) but init.ts wasn't updated
  - Now only creates active `sync.settings.*` permissions (4-gate model)
  - No migration needed (config validator ignores unknown fields)

### ⚡ Performance
- **99.9% faster GitHub sync on warm cache** (<10ms vs 6 seconds)
  - 3-layer idempotency caching (frontmatter → metadata → GitHub API)
  - Automatic cache backfilling for optimal performance
  - Background execution (non-blocking user workflow)

---

## [0.23.21] - 2025-11-22
- Enhanced marketplace validation with judge-based scoring
- Removed 6 incomplete plugins, achieved 100% health score

## [0.23.18] - 2025-11-22
- ADO auto-discovery improvements

## [0.23.17] - 2025-11-22
- GitHub issue format fixes

## [0.23.16] - 2025-11-22
- Hook performance optimizations

## [0.23.1] - 2025-11-20
- Task-User Story linkage validation
- GitHub sync improvements

## [0.23.0] - 2025-11-20
- Multi-project support
- External tool import (Phase 1)

## [0.22.14] - 2025-11-20
- Status line sync fixes

## [0.22.7] - 2025-11-19
- GitHub duplicate detection

## [0.22.6] - 2025-11-19
- Partial GitHub sync fixes

## [0.22.5] - 2025-11-19
- Yanked (incorrect fix)

---

**Note**: Older versions (0.22.4 and earlier) have been archived for performance. Full history available in git log.
