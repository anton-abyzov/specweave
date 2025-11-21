---
increment: 0049-external-tool-import-phase-1b-7
title: "Enhanced External Tool Import - Phase 1b-7"
feature_id: FS-048
status: planned
priority: P1
user_stories:
  - US-001
  - US-002
  - US-004
  - US-005
  - US-006
  - US-007
  - US-008
created: 2025-11-21
dependencies:
  - 0048-external-tool-import-enhancement
structure: user-stories
tech_stack:
  detected_from: "package.json"
  language: "typescript"
  framework: "nodejs-cli"
  testing: "vitest"
platform: "npm-global"
---

# Specification: Enhanced External Tool Import - Phase 1b-7

**Increment**: 0049-external-tool-import-phase-1b-7
**Feature**: [FS-048 - Enhanced External Tool Import](../../docs/internal/specs/_features/FS-048/FEATURE.md)
**Status**: Planned
**Priority**: P1 (High)
**Dependencies**: Increment 0048 (Phase 1a - ConfigManager & Jira Auto-Discovery) ✅ Complete

---

## Overview

This increment implements **Phase 1b-7** of FS-048 (Enhanced External Tool Import), covering the remaining 7 user stories for smart pagination, CLI-first defaults, three-tier dependency loading, and ADO integration.

**Phase 1a (Increment 0048)** ✅ Complete:
- ConfigManager with secrets/config separation
- Jira auto-discovery
- .env.example generation
- Foundation for three-tier loading (Tier 1 - config management)

**Phase 1b-7 (THIS INCREMENT)** ⏳ Planned:
- Smart pagination (50-project limit)
- CLI-first defaults (select all by default)
- Three-tier dependency loading (Tiers 2-3: lazy loading, bulk pre-load)
- Smart caching with 24-hour TTL
- Dedicated import commands (/specweave-jira:import-projects, /specweave-ado:import-projects)
- ADO area path mapping
- Progress tracking with cancelation support
- Smart filtering

---

## Living Documentation (Source of Truth)

**IMPORTANT**: Complete specifications for this increment are maintained in the living documentation:

### Feature Overview
- **Location**: `.specweave/docs/internal/specs/_features/FS-048/FEATURE.md`
- **Content**: Master feature overview (679 lines)
  - Problem statement
  - Business value
  - All FR/NFR requirements  - Success criteria
  - Test strategy

### User Stories (7 Implemented in This Increment)

#### US-001: Smart Pagination During Init
- **Location**: `.specweave/docs/internal/specs/specweave/FS-048/us-001-smart-pagination-during-init.md`
- **Priority**: P0 (Critical)
- **Acceptance Criteria**: AC-US1-01 through AC-US1-05 (5 ACs)
- **Key Features**:
  - 50-project pagination limit during init (<30 sec target)
  - Upfront choice: "Load first 50", "Load all now" (slower), "Load more later"
  - Project count lightweight API call (maxResults=0)
  - Safety confirmation for >100 projects

#### US-002: CLI-First Defaults
- **Location**: `.specweave/docs/internal/specs/specweave/FS-048/us-002-cli-first-defaults.md`
- **Priority**: P1
- **Acceptance Criteria**: AC-US2-01 through AC-US2-04 (4 ACs)
- **Key Features**:
  - Default to "Import all" in CLI prompts
  - All checkboxes pre-checked (users deselect unwanted)
  - 80% keystroke reduction (deselect 5/50 vs. select 45/50)
  - Clear instructions: "All selected by default - deselect unwanted"

#### US-004: Smart Caching with TTL
- **Location**: `.specweave/docs/internal/specs/specweave/FS-048/us-004-smart-caching-with-ttl.md`
- **Priority**: P1
- **Acceptance Criteria**: AC-US4-01 through AC-US4-05 (5 ACs)
- **Key Features**:
  - 24-hour TTL for project lists and dependencies
  - Cache location: `.specweave/.cache/external-tools/`
  - Automatic validation and refresh
  - API rate limit awareness (JIRA: 3600 req/hour, ADO: 200 req/hour)

#### US-005: Dedicated Import Commands
- **Location**: `.specweave/docs/internal/specs/specweave/FS-048/us-005-dedicated-import-commands.md`
- **Priority**: P2
- **Acceptance Criteria**: AC-US5-01 through AC-US5-04 (4 ACs)
- **Key Features**:
  - `/specweave-jira:import-projects` command for post-init bulk loading
  - `/specweave-ado:import-projects` command for ADO
  - Time range filtering (projects updated since X)
  - Dry-run mode (preview without importing)

#### US-006: ADO Area Path Mapping
- **Location**: `.specweave/docs/internal/specs/specweave/FS-048/us-006-ado-area-path-mapping.md`
- **Priority**: P2
- **Acceptance Criteria**: AC-US6-01 through AC-US6-05 (5 ACs)
- **Key Features**:
  - Map Azure DevOps area paths to SpecWeave projects
  - Granularity options: top-level, two-level, full tree
  - Example: `Backend\API` → `projects/backend-api/`
  - Bidirectional sync with rename/deletion detection

#### US-007: Progress Tracking
- **Location**: `.specweave/docs/internal/specs/specweave/FS-048/us-007-progress-tracking.md`
- **Priority**: P1
- **Acceptance Criteria**: AC-US7-01 through AC-US7-05 (5 ACs)
- **Key Features**:
  - Real-time progress bars for batch operations
  - ETA calculation (linear extrapolation)
  - Cancelation support (Ctrl+C) with graceful state saving
  - Resume capability (--resume flag)
  - Final summary reports (succeeded/failed/skipped)

#### US-008: Smart Filtering
- **Location**: `.specweave/docs/internal/specs/specweave/FS-048/us-008-smart-filtering.md`
- **Priority**: P2
- **Acceptance Criteria**: AC-US8-01 through AC-US8-04 (4 ACs)
- **Key Features**:
  - Active projects only (filter out archived/deleted)
  - Filter by project type (software, agile, CMMI, SAFe)
  - Filter by project lead
  - Custom JQL queries (JIRA) or WIQL queries (ADO)

**Note**: US-003 (Three-Tier Dependency Loading) was partially implemented in increment 0048 (Tier 1 - config management). Tiers 2-3 (lazy loading, bulk pre-load) are included in THIS increment.

---

## Architecture Decisions

All architecture decisions are documented in ADRs:

- **[ADR-0050](../../docs/internal/architecture/adr/0050-three-tier-dependency-loading.md)**: Three-Tier Dependency Loading
- **[ADR-0051](../../docs/internal/architecture/adr/0051-smart-caching-with-ttl.md)**: Smart Caching with 24-Hour TTL
- **[ADR-0052](../../docs/internal/architecture/adr/0052-smart-pagination-50-project-limit.md)**: Smart Pagination (50-Project Limit)
- **[ADR-0053](../../docs/internal/architecture/adr/0053-cli-first-defaults-philosophy.md)**: CLI-First Defaults Philosophy
- **[ADR-0054](../../docs/internal/architecture/adr/0054-ado-area-path-mapping.md)**: ADO Area Path Mapping
- **[ADR-0055](../../docs/internal/architecture/adr/0055-progress-tracking-cancelation.md)**: Progress Tracking and Cancelation

---

## Technical Implementation

See **[plan.md](./plan.md)** for complete technical implementation details, including:
- Component architecture (CacheManager, ProgressTracker, DependencyLoader, etc.)
- Data models (Project, DependencyCache, ProgressState)
- API contracts (JIRA REST API, Azure DevOps REST API)
- Performance targets (< 30s init time, 90% API reduction)
- Testing strategy (unit, integration, E2E, performance tests)

---

## Performance Requirements

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Init time (50 projects) | 2-5 minutes | < 10 seconds | 90%+ |
| Init time (100 projects) | 5-10 minutes | < 30 seconds | 80%+ |
| API calls (init, 50 projects) | 200-350 | 1 | 99.5% |
| First sync (1 project) | 0 calls | 4-7 calls | N/A |
| Cached sync (same project) | 4-7 calls | 0 calls | 100% |
| Cache hit rate | 0% (no cache) | > 90% | N/A |

---

## Success Criteria

### Performance ✅
- ✅ Init time < 30 seconds for 100+ projects
- ✅ Zero timeout errors
- ✅ 90% API call reduction

### UX ✅
- ✅ 80% keystroke reduction (CLI-first defaults)
- ✅ 90% adoption of "Import all" default

### Quality ✅
- ✅ 80-90% test coverage
- ✅ All P1 acceptance criteria met
- ✅ Integration with existing init flow (no breaking changes)

---

## Testing Strategy

**Test Coverage Targets**:
- **Critical paths** (init flow, API calls): 95%+
- **Core modules** (CacheManager, DependencyLoader): 90%+
- **CLI helpers**: 85%+
- **Overall**: 80%+

**Test Types**:
- **Unit Tests**: CacheManager, ProgressTracker, AreaPathMapper, DependencyLoader
- **Integration Tests**: JIRA/ADO API calls, cache integration, dependency loading
- **E2E Tests**: Full init flow, cancelation/resume, multi-project sync
- **Performance Tests**: Init time validation (<30s), API rate limit compliance

See **[tasks.md](./tasks.md)** for detailed test plans embedded in each task (BDD format).

---

## Implementation Timeline

**Estimated**: 20 days across 7 phases

| Phase | Scope | Days | User Stories |
|-------|-------|------|--------------|
| **Phase 1** | Core Infrastructure | 3 | US-004, US-007 |
| **Phase 2** | CLI-First Init Flow | 3 | US-001, US-002 |
| **Phase 3** | Progress Tracking | 3 | US-007 |
| **Phase 4** | Tier 2/3 Loading | 3 | US-003 (remaining) |
| **Phase 5** | ADO Integration | 3 | US-006 |
| **Phase 6** | Cache Maintenance | 2 | US-005, US-008 |
| **Phase 7** | Performance Testing | 3 | All (validation) |

---

## Non-Functional Requirements

### Security ✅
- API tokens stored in `.env` (gitignored, never logged)
- HTTPS-only for API calls
- Cache files have 0600 permissions (no sensitive data)
- Rate limit compliance (respects JIRA/ADO limits)

### Performance ✅
- Init time: < 30 seconds for 100+ projects (P0 requirement)
- Cache hit rate: > 90% during normal development
- API call reduction: 90% overall

### Type Safety ✅
- Full TypeScript types for all modules
- Runtime validation for config/cache
- IntelliSense support

---

## Migration Notes

**For Existing Users**:
- ✅ Backward compatible with single-project setup
- ✅ Existing `.env` configuration preserved
- ✅ Existing config.json settings remain valid
- ✅ No breaking changes to existing workflows

**New Features Available After This Increment**:
- Smart pagination during `specweave init` (upfront choice)
- CLI-first defaults (all checkboxes pre-checked)
- 24-hour cache for project lists (offline work support)
- Progress bars for long operations (better UX)
- Post-init bulk import commands (gradual onboarding)

---

## Next Steps

1. **Review this spec.md** - Verify scope and user stories
2. **Review plan.md** - Validate technical approach
3. **Review tasks.md** - Check implementation breakdown (generated by test-aware-planner)
4. **Start implementation**: `/specweave:do 0049`

---

**End of Specification**
