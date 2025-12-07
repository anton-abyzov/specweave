---
increment: 0090-living-docs-builder
title: "Living Docs Builder - Smart Background Job for Brownfield Projects"
type: feature
priority: P1
status: completed
created: 2025-12-02
started: 2025-12-02
estimated_effort: 3-4 weeks
structure: user-stories
tech_stack:
  language: typescript
  framework: node.js
  background_jobs: detached-process
---

# Living Docs Builder - Smart Background Job for Brownfield Projects

## Overview

A smart, scalable background job system that automatically builds comprehensive living documentation for brownfield projects. The system:

1. **Waits for dependencies** (clone + import jobs to complete)
2. **Handles huge codebases** (smart sampling, could run for hours/days)
3. **Builds progressively** (high-level docs first, then details)
4. **Collects user input upfront** (additional sources, priority areas)
5. **Provides actionable suggestions** at the end

## Problem Statement

When users run `specweave init` on a brownfield project:
- Repositories are cloned (background job)
- Work items are imported from external tools (background job)
- **BUT no living docs are generated from the codebase**

Users must manually analyze their codebase to create documentation. For large codebases (10k+ files), this is impractical.

## Solution

Add a new background job type `living-docs-builder` that:
1. Runs after init (as final step)
2. Waits for clone and import jobs to complete
3. Analyzes codebase progressively with smart sampling
4. Combines codebase analysis with imported work items
5. Generates living docs structure with suggestions

---

## User Stories

### US-001: Pre-Flight User Input Collection

**As a** developer initializing a brownfield project
**I want to** provide additional documentation sources and priority areas before analysis starts
**So that** the analysis can incorporate all relevant context and focus on what matters most

**Acceptance Criteria:**
- [x] **AC-US1-01**: System prompts for additional doc sources (Notion export, Confluence, MD folders) with path validation
- [x] **AC-US1-02**: System prompts for priority areas (comma-separated, e.g., "auth, payments, api")
- [x] **AC-US1-03**: System prompts for known pain points (free-text description)
- [x] **AC-US1-04**: System prompts for analysis depth (quick/standard/deep) with time estimates
- [x] **AC-US1-05**: All inputs are stored in job config and passed to worker
- [x] **AC-US1-06**: In CI mode, reasonable defaults are used (no interactive prompts)

**Priority**: P1
**Effort**: Medium

---

### US-002: Job Dependency System

**As a** background job system
**I want to** support job dependencies where one job waits for others to complete
**So that** the living-docs-builder can wait for clone and import jobs before starting

**Acceptance Criteria:**
- [x] **AC-US2-01**: Jobs can specify `dependsOn: string[]` array of job IDs in config
- [x] **AC-US2-02**: Worker checks dependencies before starting and waits if not ready
- [x] **AC-US2-03**: Job status shows "waiting for dependencies" when blocked
- [x] **AC-US2-04**: If dependency fails, job proceeds with available data (graceful degradation)
- [x] **AC-US2-05**: Circular dependency detection prevents infinite waiting
- [x] **AC-US2-06**: `/specweave:jobs` shows dependency status for each job

**Priority**: P1
**Effort**: Medium

---

### US-003: Discovery Phase (No LLM)

**As a** living docs builder
**I want to** quickly scan the codebase structure without LLM calls
**So that** I can understand the project scope and plan the analysis

**Acceptance Criteria:**
- [x] **AC-US3-01**: Scans all directories and counts files by type (ts, js, py, go, etc.)
- [x] **AC-US3-02**: Detects frameworks and languages from config files (package.json, requirements.txt, go.mod)
- [x] **AC-US3-03**: Discovers existing documentation (README, docs/, wiki/, .github/)
- [x] **AC-US3-04**: Identifies entry points (main files, index files, exports)
- [x] **AC-US3-05**: Calculates codebase tier (small/medium/large/massive) for sampling strategy
- [x] **AC-US3-06**: Generates `discovery-report.json` with all findings
- [x] **AC-US3-07**: Completes within 5-15 minutes for any codebase size

**Priority**: P1
**Effort**: Medium

---

### US-004: Smart Sampling Strategy

**As a** living docs builder analyzing a huge codebase
**I want to** use smart sampling instead of reading every file
**So that** analysis completes in reasonable time (hours, not weeks)

**Acceptance Criteria:**
- [x] **AC-US4-01**: Tier-based sampling: small=all, medium=5/dir, large=3/dir, massive=1/dir
- [x] **AC-US4-02**: Priority files always read regardless of tier (index.*, main.*, *.config.*, types.*)
- [x] **AC-US4-03**: Skip patterns exclude node_modules, dist, build, tests, minified files
- [x] **AC-US4-04**: Representative file selection uses heuristics (size, imports, exports, name match)
- [x] **AC-US4-05**: Sampling config is logged for transparency
- [x] **AC-US4-06**: SUGGESTIONS.md notes which directories were sampled vs fully analyzed

**Priority**: P1
**Effort**: Medium

---

### US-005: Foundation Docs Generation

**As a** living docs builder
**I want to** generate high-level documentation first
**So that** users get useful output within 1-2 hours, not after days

**Acceptance Criteria:**
- [x] **AC-US5-01**: Reads only key files: README, configs, entry points, 1-2 samples per top-level dir
- [x] **AC-US5-02**: Generates `overview.md` with project summary, tech stack, main components
- [x] **AC-US5-03**: Generates `tech-stack.md` with detected technologies and versions
- [x] **AC-US5-04**: Generates `modules-skeleton.md` with module list and brief descriptions
- [x] **AC-US5-05**: Foundation docs saved to `.specweave/docs/internal/architecture/`
- [x] **AC-US5-06**: Completes within 1-2 hours for any codebase size

**Priority**: P1
**Effort**: Large

---

### US-006: Work Item Integration

**As a** living docs builder
**I want to** match imported work items to discovered modules
**So that** documentation prioritizes areas with the most activity

**Acceptance Criteria:**
- [x] **AC-US6-01**: Loads imported work items from `.specweave/docs/internal/specs/`
- [x] **AC-US6-02**: Matches work items to modules using keyword/path matching
- [x] **AC-US6-03**: Ranks modules by work item density (more items = higher priority)
- [x] **AC-US6-04**: Generates `module-workitem-map.json` with all mappings
- [x] **AC-US6-05**: Generates `priority-queue.json` with ordered module list
- [x] **AC-US6-06**: Waits for import job completion before running (dependency)

**Priority**: P2
**Effort**: Medium

---

### US-007: Progressive Deep Dive

**As a** living docs builder
**I want to** analyze modules one at a time with checkpoints
**So that** the job can run for hours/days and be paused/resumed

**Acceptance Criteria:**
- [x] **AC-US7-01**: Processes modules in priority order (most work items first)
- [x] **AC-US7-02**: Creates checkpoint after each module completion
- [x] **AC-US7-03**: Job can be paused and resumed from last checkpoint
- [x] **AC-US7-04**: Per-module analysis extracts: exports, APIs, dependencies, doc generation
- [x] **AC-US7-05**: Per-module docs saved to `.specweave/docs/internal/strategy/modules/{name}.md`
- [x] **AC-US7-06**: Progress shows current module and ETA for remaining modules

**Priority**: P2
**Effort**: Large

---

### US-008: Suggestions Generation

**As a** developer reviewing living docs builder output
**I want to** receive actionable suggestions and gap analysis
**So that** I know what to document next and where to focus

**Acceptance Criteria:**
- [x] **AC-US8-01**: Generates `SUGGESTIONS.md` with summary of analysis
- [x] **AC-US8-02**: Lists modules by documentation status (complete, partial, none)
- [x] **AC-US8-03**: Identifies priority zones based on work item density
- [x] **AC-US8-04**: Suggests immediate actions with specific file paths
- [x] **AC-US8-05**: Notes what was NOT analyzed due to sampling
- [x] **AC-US8-06**: Creates discrepancy records for documentation gaps

**Priority**: P2
**Effort**: Medium

---

### US-009: Comprehensive Logging

**As a** user monitoring a long-running living docs builder job
**I want to** see detailed progress and logs
**So that** I understand what's happening and can debug issues

**Acceptance Criteria:**
- [x] **AC-US9-01**: Structured JSON logs for machine parsing (`progress.json`)
- [x] **AC-US9-02**: Human-readable log with timestamps and phase markers (`worker.log`)
- [x] **AC-US9-03**: Milestone markers for phase transitions (═══ PHASE X ═══)
- [x] **AC-US9-04**: Per-module mini-reports in `checkpoints/` directory
- [x] **AC-US9-05**: `/specweave:jobs --logs <id>` shows log output
- [x] **AC-US9-06**: `/specweave:jobs --follow <id>` shows real-time progress

**Priority**: P2
**Effort**: Small

---

### US-010: Init Integration

**As a** developer running `specweave init` on a brownfield project
**I want to** have living docs builder automatically scheduled after init
**So that** documentation generation starts without manual intervention

**Acceptance Criteria:**
- [x] **AC-US10-01**: Init detects brownfield project (existing code, not empty directory)
- [x] **AC-US10-02**: Pre-flight prompts collected at end of init (before job launch)
- [x] **AC-US10-03**: Job launched with dependencies on clone and import jobs
- [x] **AC-US10-04**: Init shows job ID and estimated duration
- [x] **AC-US10-05**: User can skip living docs builder with `--no-living-docs` flag
- [x] **AC-US10-06**: Non-blocking: init completes immediately, job runs in background

**Priority**: P1
**Effort**: Medium

---

## Out of Scope

- Real-time LLM streaming during analysis (too expensive, use batched calls)
- Git history analysis for blame/ownership (future enhancement)
- Automatic PR/commit creation for docs (manual review preferred)
- Integration with external doc platforms (Confluence, Notion) beyond import

## Success Criteria

1. **Time to first useful output**: < 2 hours for any codebase size
2. **Resumability**: Job can be paused/resumed without data loss
3. **Completion rate**: 95%+ of modules get at least skeleton docs
4. **User satisfaction**: SUGGESTIONS.md provides actionable next steps
5. **Scalability**: Handles 100k+ file codebases without crashing

## Dependencies

- Background job system (`src/core/background/`)
- Import worker for work item fetching
- Clone worker for repository cloning
- Brownfield analyzer for document classification

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM costs for large codebases | High | Smart sampling, limit LLM calls per module |
| Context overflow with large files | High | Chunk files, summarize progressively |
| Job runs for days, user loses interest | Medium | Foundation docs first, progress visibility |
| Dependency job fails | Medium | Proceed with available data, note gaps |

---

## Technical Notes

### New Job Type

Add to `src/core/background/types.ts`:
```typescript
export type JobType = 'clone-repos' | 'import-issues' | 'sync-external' | 'brownfield-analysis' | 'living-docs-builder';
```

### Job Phases

```typescript
export type LivingDocsPhase =
  | 'waiting'           // Waiting for dependencies
  | 'discovery'         // File tree scan (no LLM)
  | 'foundation'        // Generate overview docs
  | 'integration'       // Match work items to modules
  | 'deep-dive'         // Per-module analysis
  | 'suggestions';      // Gap analysis
```

### Checkpoint Structure

```typescript
interface LivingDocsCheckpoint {
  phase: LivingDocsPhase;
  discovery?: { dirsScanned: number; totalDirs: number };
  foundation?: { docsGenerated: string[] };
  integration?: { itemsProcessed: number };
  deepDive?: {
    modulesCompleted: string[];
    currentModule: string;
    modulesRemaining: string[];
  };
}
```
