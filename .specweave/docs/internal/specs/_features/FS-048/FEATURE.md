---
id: FS-048
title: "Enhanced External Tool Import - Smart Project & Dependency Loading with CLI-First Defaults"
type: feature
status: proposed
priority: P1
created: 2025-11-21
lastUpdated: 2025-11-21
---

# FS-048: Enhanced External Tool Import - Smart Project & Dependency Loading with CLI-First Defaults

## Overview

**Problem Statement**: SpecWeave's current external tool integration (JIRA, Azure DevOps) has slow initialization (2-5 minutes for 100+ projects), poor CLI UX (requires manual selection of 45/50 projects), and missing intelligent dependency loading (200+ API calls during init cause timeouts).

**Target Users**:
- Development teams with large JIRA/ADO instances (50-500+ projects)
- DevOps engineers configuring SpecWeave for multi-team organizations
- CLI power users expecting efficient bulk operations

**Business Value**:
- Reduce init time from 2-5 minutes → < 30 seconds (80% improvement)
- Improve UX with CLI-first defaults (80% fewer keystrokes for typical use case)
- Enable post-init flexibility with dedicated import commands
- Support hierarchical ADO area path mapping for large organizations

**Dependencies**:
- ✅ FS-047 completed (External Item Import on Init - US-007, US-010, US-011)
- ✅ ADR-0049 implemented (Jira Auto-Discovery and Universal Hierarchy Mapping)
- ✅ ADR-0048 implemented (Repository Provider Architecture)
- ✅ Existing auto-discovery in `src/cli/helpers/issue-tracker/jira.ts`
- ✅ Universal hierarchy mapping in `src/integrations/jira/jira-hierarchy-mapper.ts`
- ✅ Project selector infrastructure in `plugins/specweave-jira/lib/project-selector.ts`

## User Stories

- [US-001: Smart Pagination During Init (50-Project Limit)](../../specweave/FS-048/us-001-smart-pagination-during-init.md)
- [US-002: CLI-First Defaults (Select All by Default)](../../specweave/FS-048/us-002-cli-first-defaults.md)
- [US-003: Three-Tier Dependency Loading (Init/On-Demand/Bulk)](../../specweave/FS-048/us-003-three-tier-dependency-loading.md)
- [US-004: Smart Caching with TTL (24-Hour Cache)](../../specweave/FS-048/us-004-smart-caching-with-ttl.md)
- [US-005: Dedicated Import Commands (Post-Init Flexibility)](../../specweave/FS-048/us-005-dedicated-import-commands.md)
- [US-006: Azure DevOps Area Path Mapping (Hierarchical Sub-Projects)](../../specweave/FS-048/us-006-ado-area-path-mapping.md)
- [US-007: Progress Tracking (Batch Loading with Cancel)](../../specweave/FS-048/us-007-progress-tracking.md)
- [US-008: Smart Filtering (Active Projects, Custom JQL)](../../specweave/FS-008/us-008-smart-filtering.md)

## Functional Requirements

### FR-001: Smart Pagination (Init Performance)
- **Description**: Limit initial project load to 50 projects during `specweave init`
- **Rationale**: Avoid 2-5 minute waits for large instances (100+ projects)
- **Priority**: P0 (Critical - init must be fast)
- **Acceptance Criteria**:
  - Init loads maximum 50 projects by default
  - User shown explicit choice: "Import all" vs "Select specific" vs "Manual entry"
  - "Import all" fetches remaining projects asynchronously
  - Init completes < 30 seconds even for 500+ project instances

### FR-002: CLI-First Defaults
- **Description**: Default to "select all" for efficiency (deselect unwanted)
- **Rationale**: CLI users expect bulk operations, not tedious clicking
- **Priority**: P1 (High - UX improvement)
- **Acceptance Criteria**:
  - "Import all projects" is default choice (not "Select specific")
  - In checkbox mode, all projects checked by default
  - Users deselect unwanted items (faster than selecting 45/50)
  - Aligns with Unix philosophy: Do obvious thing, allow customization

### FR-003: Three-Tier Dependency Loading
- **Description**: Load dependencies (boards, area paths) in 3 tiers
- **Rationale**: 50 projects × 4-7 API calls each = 200-350 calls = slow init
- **Priority**: P1 (High - performance)
- **Tiers**:
  - **Tier 1 (Init)**: Project metadata only (name, key, type)
  - **Tier 2 (On-Demand)**: Load dependencies on first sync (lazy loading)
  - **Tier 3 (Bulk Pre-Load)**: Optional command `/specweave-jira:preload-dependencies`
- **Acceptance Criteria**:
  - Init loads Tier 1 only (< 5 seconds for 50 projects)
  - First sync loads Tier 2 for active project only
  - Tier 3 command loads all dependencies with progress tracking
  - Cache persists with 24-hour TTL

### FR-004: Smart Caching with TTL
- **Description**: Cache project metadata and dependencies with 24-hour expiry
- **Rationale**: Avoid redundant API calls, respect rate limits
- **Priority**: P1 (High - performance + reliability)
- **Acceptance Criteria**:
  - Project list cached for 24 hours (`.specweave/cache/jira-projects.json`)
  - Dependencies cached per-project (`.specweave/cache/jira-{PROJECT}-deps.json`)
  - Cache validation on startup (check timestamps)
  - Manual refresh: `/specweave-jira:refresh-cache`
  - Cache respects API rate limits (no refresh if limit hit)

### FR-005: Dedicated Import Commands
- **Description**: Post-init commands for incremental project import
- **Rationale**: Init must be fast, but users may add projects later
- **Priority**: P2 (Should Have - flexibility)
- **Commands**:
  - `/specweave-jira:import-projects` - Add JIRA projects post-init
  - `/specweave-ado:import-projects` - Add ADO projects post-init
- **Features**:
  - Batch import with filtering (active only, by type, by lead)
  - Resume support (interrupted imports continue)
  - Progress tracking (N/M projects imported)
  - Dry-run mode (preview what will be imported)
- **Acceptance Criteria**:
  - Commands work post-init without re-running `specweave init`
  - Merge with existing projects (no duplicates)
  - Validate permissions before import
  - Show summary: "Imported 23/50 projects, 2 failed (permissions), 25 skipped"

### FR-006: Azure DevOps Area Path Mapping
- **Description**: Map ADO hierarchical area paths to SpecWeave projects
- **Rationale**: ADO teams use area paths for sub-team organization
- **Priority**: P2 (Should Have - ADO-specific)
- **Area Path Structure**:
  - **Top-Level**: `Backend` → `.specweave/docs/internal/specs/backend/`
  - **Two-Level**: `Backend\API` → `.specweave/docs/internal/specs/backend-api/`
  - **Full Tree**: User chooses granularity during init
- **Acceptance Criteria**:
  - Init prompts for area path granularity (top-level, two-level, full tree)
  - Area paths mapped to SpecWeave project folders
  - Multi-project mode enabled automatically
  - Area path updates synced bidirectionally (ADO ↔ SpecWeave)

### FR-007: Progress Tracking (Batch Loading)
- **Description**: Real-time progress indicators for bulk operations
- **Rationale**: Loading 100+ projects takes time, users need feedback
- **Priority**: P1 (High - UX)
- **Features**:
  - Progress bar: "Loading projects... 47/127 (37%)"
  - Cancelation support (Ctrl+C graceful exit)
  - Error handling (continue on failure, report at end)
  - Elapsed time tracking ("47s elapsed, ~2m remaining")
- **Acceptance Criteria**:
  - Progress updates every 5 projects
  - Ctrl+C saves partial progress (don't lose work)
  - Final summary: "Loaded 98/127 projects, 5 failed, 24 skipped"
  - Errors logged to `.specweave/logs/import-errors.log`

### FR-008: Smart Filtering
- **Description**: Filter projects before import (reduce noise)
- **Rationale**: Not all 500 projects are relevant (archived, test, legacy)
- **Priority**: P2 (Should Have - quality of life)
- **Filters**:
  - **Active only**: Exclude archived/deleted projects
  - **By type**: Agile, CMMI, SAFe, Software, Business
  - **By lead**: Projects owned by specific user
  - **Custom JQL** (JIRA): `project in (BACKEND, FRONTEND) AND status != Archived`
- **Acceptance Criteria**:
  - Init prompts for filters before loading projects
  - Filters applied server-side (reduce API response size)
  - Preview: "Filters will load ~45 projects (down from 500)"
  - Saved filters: `--preset production` for common patterns

## Non-Functional Requirements

### NFR-001: Init Performance < 30 Seconds
- **Description**: `specweave init` completes in < 30 seconds for 100+ project instances
- **Metrics**:
  - Baseline: 2-5 minutes for 100 projects (current)
  - Target: < 30 seconds for 100 projects (80% improvement)
  - Stretch: < 15 seconds for 50 projects
- **Priority**: P0 (Critical)
- **Validation**: Performance testing with real JIRA/ADO instances (50, 100, 500 projects)

### NFR-002: API Rate Limit Compliance
- **Description**: Stay under JIRA/ADO API rate limits
- **Limits**:
  - **JIRA Cloud**: 3600 requests/hour (1 req/sec average)
  - **JIRA Server**: Varies by instance (respect X-RateLimit headers)
  - **Azure DevOps**: 200 requests/user/hour
- **Strategies**:
  - Batch API calls (fetch 100 projects in 1 call, not 100 calls)
  - Respect `Retry-After` headers (exponential backoff)
  - Cache aggressively (24-hour TTL)
  - Progress throttling (update UI every 5 items, not every item)
- **Priority**: P0 (Critical - must not break API access)

### NFR-003: UX Clarity (Explicit Choices, No Hidden Shortcuts)
- **Description**: Make "import all" explicit, don't hide behind `<a>` toggle
- **Rationale**: Current UX requires discovering `<a>` keyboard shortcut (bad UX)
- **Requirements**:
  - Upfront choice: "Import all" vs "Select specific" vs "Manual entry"
  - No hidden shortcuts (all actions visible in prompts)
  - Clear defaults ("Import all" is default for CLI users)
  - Consistency with GitHub init flow (already has strategy selection)
- **Priority**: P1 (High - UX)

### NFR-004: Resume Capability (Interrupted Imports)
- **Description**: Interrupted imports can resume without restarting
- **Rationale**: Network failures, rate limits, user cancellation shouldn't lose progress
- **Implementation**:
  - Save progress to `.specweave/cache/import-state.json`
  - On resume, check cached state, skip completed projects
  - Validate cached projects (ensure still accessible)
- **Priority**: P2 (Should Have - reliability)
- **Acceptance Criteria**:
  - Ctrl+C during import saves state
  - `/specweave-jira:import-projects --resume` continues from last position
  - State expires after 24 hours (force fresh start if stale)

## Success Criteria

### Must-Have (MVP)
- ✅ Init time < 30 seconds for 100+ project instances (NFR-001)
- ✅ "Import all" as default choice (FR-002)
- ✅ Three-tier dependency loading working (FR-003)
- ✅ Smart caching with 24-hour TTL (FR-004)
- ✅ Progress tracking with cancelation (FR-007)
- ✅ Zero timeout errors during init (NFR-001)

### Should-Have (Enhanced)
- ⭐ Dedicated import commands working (FR-005)
- ⭐ ADO area path mapping implemented (FR-006)
- ⭐ Smart filtering operational (FR-008)
- ⭐ Resume capability tested (NFR-004)

### Metrics (Validation)
- **Performance**: Init time reduced from 2-5 minutes → < 30 seconds (80% improvement)
- **UX**: "Import all" default = 80% fewer keystrokes (measured via user testing)
- **Reliability**: Zero timeout errors in 100 test runs with 100+ project instances
- **Adoption**: 90% of users choose "Import all" (default is correct choice)

## Test Strategy

### Unit Tests
- **Smart pagination logic** (50-project limit, async fetch remainder)
- **Cache TTL validation** (expired cache detection, refresh logic)
- **Dependency loading tiers** (Tier 1/2/3 isolation)
- **Area path mapping** (ADO path → SpecWeave project conversion)

### Integration Tests
- **JIRA init flow** (with 50, 100, 500 mock projects)
- **ADO init flow** (with area paths, hierarchical structure)
- **Cache persistence** (save/load across init runs)
- **Import commands** (incremental import, merge with existing)

### E2E Tests
- **Full init workflow** (JIRA Cloud, 100+ projects, < 30s target)
- **Post-init import** (`/specweave-jira:import-projects` with filtering)
- **Resume capability** (interrupt at 50%, resume, verify completion)
- **Progress tracking** (visual validation, cancelation handling)

### Performance Tests
- **Baseline**: Measure current init time (100 projects)
- **Optimized**: Measure new init time (same 100 projects)
- **Validate**: < 30 seconds target met
- **Stress**: Test with 500 projects (should still complete < 2 minutes)

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| TBD | planned | TBD |

## References

- **Proposal**: `.specweave/proposals/external-tool-import-strategy-enhancement.md`
- **ADR-0049**: Jira Auto-Discovery and Universal Hierarchy Mapping
- **ADR-0048**: Repository Provider Architecture
- **FS-047**: US-Task Linkage Architecture (External Import foundation)
- **Existing Code**:
  - `src/cli/helpers/issue-tracker/jira.ts` (auto-discovery)
  - `src/integrations/jira/jira-hierarchy-mapper.ts` (universal mapping)
  - `plugins/specweave-jira/lib/project-selector.ts` (existing "Select All" feature)

## Architecture Diagrams

### Enhanced Init Flow (High-Level)

```
┌─────────────────────────────────────┐
│ specweave init                      │
└────────────┬────────────────────────┘
             │
     ┌───────▼────────┐
     │ Choose Tracker │
     │ (JIRA, ADO)    │
     └───────┬────────┘
             │
     ┌───────▼────────────────────────┐
     │ Validate Credentials           │
     │ (fast auth check)              │
     └───────┬────────────────────────┘
             │
     ┌───────▼────────────────────────┐
     │ Fetch Project Count (Quick)    │  ← NEW: Lightweight check
     │ Found 127 projects             │
     └───────┬────────────────────────┘
             │
     ┌───────▼────────────────────────┐
     │ Import Strategy Choice         │  ← NEW: Upfront explicit choice
     │ 1. ✨ Import all (127)          │
     │ 2. 📋 Select specific          │
     │ 3. ✏️  Manual entry             │
     └───────┬────────────────────────┘
             │
        ┌────┴────┐
        │         │
  ┌─────▼──┐  ┌──▼──────┐
  │ All    │  │ Specific │
  │ (Fast) │  │ (Filter) │
  └─────┬──┘  └──┬───────┘
        │        │
        └────┬───┘
             │
     ┌───────▼────────────────────────┐
     │ Load Tier 1 (Metadata Only)   │  ← NEW: 3-tier loading
     │ No dependencies yet            │
     │ < 5 seconds for 50 projects    │
     └───────┬────────────────────────┘
             │
     ┌───────▼────────────────────────┐
     │ Create Multi-Project Folders   │
     │ Cache project list (24h TTL)   │
     └───────┬────────────────────────┘
             │
     ┌───────▼────────────────────────┐
     │ ✅ Init Complete!               │
     │ Dependencies loaded on-demand  │
     └────────────────────────────────┘
```

### Three-Tier Dependency Loading

```
Tier 1: Init (Metadata Only)
  ↓ Fetch: Project name, key, type
  ↓ Time: < 5 seconds (50 projects)
  ↓ API Calls: 1 (batch fetch)

Tier 2: On-Demand (First Sync)
  ↓ Fetch: Boards, teams, components
  ↓ Time: 2-5 seconds (per project)
  ↓ API Calls: 4-7 (per project, lazy)
  ↓ Trigger: First /specweave:sync for project

Tier 3: Bulk Pre-Load (Optional)
  ↓ Fetch: All dependencies for all projects
  ↓ Time: 1-2 minutes (50 projects)
  ↓ API Calls: 200-350 (batched)
  ↓ Trigger: /specweave-jira:preload-dependencies
  ↓ Use Case: Offline work, batch sync
```

## Migration & Backward Compatibility

### Existing Projects (Already Initialized)
- **Behavior**: No change (existing `.env` config works as-is)
- **Enhancement Flow**: Optional re-init to add more projects
  ```
  specweave init .
  → Detected existing JIRA config (2 projects)
  → Do you want to:
    1. Keep existing (skip)
    2. Add more projects (merge)
    3. Replace all (reconfigure)
  ```

### New Projects
- **Behavior**: Get enhanced flow with upfront strategy choice
- **Default**: "Import all" (CLI-first philosophy)

## Open Questions

1. **Default choice**: "Import all" vs "Select specific" - which is safer?
   - **Recommendation**: "Import all" (aligns with CLI power user expectations)

2. **Project count threshold**: Show "import all" only if 5+ projects?
   - **Recommendation**: Always show (consistency, even for 2 projects)

3. **GitHub alignment**: Should GitHub also get "import all repos" option?
   - **Recommendation**: Yes (future enhancement, separate increment)

4. **Validation timing**: Validate boards/teams BEFORE or AFTER project selection?
   - **Recommendation**: AFTER (current behavior, avoid premature validation)

5. **Cache invalidation**: Force refresh if > 7 days old (not 24 hours)?
   - **Recommendation**: 24 hours for project list, 7 days for dependencies (dependencies change less)

## Risk Assessment

### Risk 1: API Rate Limits (JIRA Cloud)
- **Problem**: Fetching 500+ projects may hit rate limits (3600 req/hour)
- **Mitigation**:
  - Use batch endpoints (`/rest/api/3/project/search?maxResults=1000`)
  - Cache project list for 24 hours
  - Show progress bar to manage user expectations
  - Respect `Retry-After` headers

### Risk 2: Large Project Lists (Performance)
- **Problem**: Creating 500 project folders may take time
- **Mitigation**:
  - Batch folder creation (async I/O, parallel execution)
  - Show progress: "Creating project folders... 45/500"
  - Allow cancelation (Ctrl+C graceful exit with partial state saved)

### Risk 3: Partial Failures (Some Projects Inaccessible)
- **Problem**: User selects "Import all" but lacks permissions for 10/100 projects
- **Mitigation**:
  - Validate permissions BEFORE creating folders
  - Show warning: "⚠️ 10 projects inaccessible (insufficient permissions)"
  - Allow user to continue with accessible 90 projects
  - Log failed projects to `.specweave/logs/import-errors.log`

---

**Created**: 2025-11-21
**Author**: PM Agent (Claude Code)
**Status**: Proposed (awaiting increment planning)
