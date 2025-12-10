---
increment: 0135-living-docs-visualization
title: "Implementation Tasks - Living Docs Visualization (Part 2)"
status: planned
estimated_tasks: 12
estimated_weeks: 1-2
phases:
  - visualization
  - integration
---

# Implementation Tasks - Part 2

## Phase 4: Visualization & Documentation (Week 1)

### T-017: Generate Mermaid Module Dependency Diagram
**User Story**: US-004
**Satisfies ACs**: AC-US4-04
**Status**: [x] completed
**Model Hint**: ⚡ Haiku

Export module graph to Mermaid format for version-controlled diagrams.

**Files**: `src/core/living-docs/intelligent-analyzer/mermaid-generator.ts`

**Acceptance**:
- Converts ModuleGraph to Mermaid syntax
- Highlights circular dependencies (red styling)
- Saves to `.specweave/docs/internal/architecture/diagrams/module-dependencies.mmd`
- Diagram renders correctly in Markdown viewers

---

### T-018: Create Interactive HTML Dependency Graph
**User Story**: US-010
**Satisfies ACs**: AC-US10-01, AC-US10-02, AC-US10-03
**Status**: [x] completed
**Model Hint**: 💎 Opus

Generate D3.js-powered interactive graph in standalone HTML.

**Files**: `src/core/living-docs/intelligent-analyzer/graph-visualizer.ts`

**Acceptance**:
- Generates standalone HTML file (no external dependencies)
- Supports zoom and pan
- Click module to show details panel
- Filter modules by type (frontend/backend/shared-lib)
- Highlight circular dependencies in red
- Search modules by name
- Saves to `.specweave/docs/internal/architecture/diagrams/module-graph.html`

---

### T-019: Build HTML Dashboard
**User Story**: US-010
**Satisfies ACs**: AC-US10-04, AC-US10-05, AC-US10-06
**Status**: [x] completed
**Model Hint**: ⚡ Haiku

Create overview dashboard with project stats and summaries.

**Files**: `src/core/living-docs/intelligent-analyzer/dashboard-generator.ts`

**Acceptance**:
- Shows project statistics (repo count, file count, tech stack)
- Lists all ADRs with status (Accepted/Proposed)
- Shows tech debt summary (P1/P2/P3 counts)
- Shows module count and coupling metrics
- Provides quick links to graphs and reports
- Saves to `.specweave/docs/internal/index.html`
- Accessible via `open .specweave/docs/internal/index.html`

---

### T-020: Generate Technical Debt Report
**User Story**: US-003
**Satisfies ACs**: AC-US3-04, AC-US3-05, AC-US3-06
**Status**: [x] completed
**Model Hint**: ⚡ Haiku

Write markdown report with actionable tech debt recommendations.

**Files**: `src/core/living-docs/intelligent-analyzer/report-writer.ts`

**Acceptance**:
- Generates markdown report from TechDebtReport
- Groups issues by severity (P1/P2/P3)
- Each issue includes: file path, line number, description, impact, recommendation, estimated effort
- Summary table with counts by category
- Saves to `.specweave/docs/internal/technical-debt.md`

---

### T-021: Document Project/Board/Team Structure
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05, AC-US5-06
**Status**: [x] completed
**Model Hint**: ⚡ Haiku

Extract team structure from config and generate documentation.

**Files**: `src/core/living-docs/intelligent-analyzer/organization-synthesizer.ts`

**Acceptance**:
- Extracts projects from config.json (multiProject.projects)
- Extracts boards/teams from ADO area paths, JIRA boards, umbrella teams
- Maps modules to projects/boards
- Generates team ownership document with: team name, owned modules, tech stack, contact info
- Generates organization chart (Mermaid diagram)
- Saves to `.specweave/docs/internal/team-structure.md`

---

## Phase 5: Integration & Polish (Week 1-2)

### T-022: Create CLI Command `/specweave:living-docs update`
**User Story**: US-007, US-009
**Satisfies ACs**: AC-US9-06
**Status**: [x] completed
**Model Hint**: ⚡ Haiku

Implement slash command with all options.

**Files**: `src/commands/living-docs.ts`

**Acceptance**:
- Command: `/specweave:living-docs update`
- Options: `--incremental`, `--full`, `--adr-only`, `--tech-debt-only`, `--modules-only`, `--dry-run`
- Calls orchestrator from Part 1
- Generates all visualizations
- Shows progress during update
- Outputs summary: files created/updated, duration

---

### T-023: Implement Hook Integration
**User Story**: US-009
**Satisfies ACs**: AC-US9-01, AC-US9-02, AC-US9-03, AC-US9-04, AC-US9-05
**Status**: [x] completed
**Model Hint**: 💎 Opus

Add hooks for automatic updates on increment completion.

**Files**:
- `plugins/specweave/hooks/post-increment-completion.sh`
- `plugins/specweave/hooks/post-commit.sh` (optional)
- `plugins/specweave/hooks/post-spec-edit.sh` (optional)

**Acceptance**:
- PostIncrementCompletion hook triggers on `/specweave:done`
- Hook runs `/specweave:living-docs update --incremental`
- PostCommit hook (optional, configurable)
- PostSpecEdit hook (optional, configurable)
- Hooks can be disabled via config: `livingDocs.autoUpdate: false`
- Hook failures logged but don't block main workflow

---

### T-024: Add Progress Reporting
**User Story**: N/A
**Status**: [x] completed
**Model Hint**: ⚡ Haiku

Show progress during long-running updates.

**Files**: Part of `orchestrator.ts` and `living-docs.ts`

**Acceptance**:
- Shows phase progress: "Phase 1: Discovery (2/3 repos scanned)"
- Shows analysis progress: "Analyzing patterns... 15/20 complete"
- Shows synthesis progress: "Synthesizing ADRs... 3/8 complete"
- Uses progress bars or percentage indicators
- Updates in real-time (not just at phase completion)

---

### T-025: Implement Error Handling & Graceful Degradation
**User Story**: US-007
**Satisfies ACs**: AC-US7-04, AC-US7-05, AC-US7-06
**Status**: [x] completed
**Model Hint**: 💎 Opus

Handle LLM failures, Git errors, parse errors gracefully.

**Files**: All analyzer components

**Acceptance**:
- LLM failures: Use cached results if available, continue with partial results
- Git errors: Handle shallow clones, missing commits gracefully
- Parse errors: Log error, skip file, continue with rest
- File write errors: Atomic writes (temp + rename)
- Reports all errors in summary, but completes successfully if >50% tasks succeed

---

### T-026: E2E Test - Full Update on Real Project
**User Story**: All
**Status**: [x] completed
**Model Hint**: 💎 Opus

Test complete pipeline on test fixture project.

**Files**: `src/core/living-docs/intelligent-analyzer/__tests__/e2e.test.ts`

**Acceptance**:
- Test fixture: Small multi-repo project with known patterns
- Runs full update (all phases)
- Verifies all outputs generated:
  - ADRs numbered correctly
  - Module graph correct
  - Tech debt report accurate
  - Dashboard renders
  - Interactive graph functional
- Verifies incremental update works (modify file, re-run, only that file re-analyzed)
- Test completes in <2 minutes

---

### T-027: Performance Optimization
**User Story**: US-006
**Satisfies ACs**: AC-US6-05
**Status**: [x] completed
**Model Hint**: 💎 Opus

Optimize for <30 second incremental updates.

**Files**: All analyzer components

**Acceptance**:
- Incremental update completes in <30 seconds
- Full update completes in <5 minutes (10 repos)
- Cache hit rate >80%
- LLM calls minimized through caching
- Parallel operations where possible
- Progress shown continuously (not just at end)

---

### T-028: Documentation & Examples
**User Story**: N/A
**Status**: [x] completed
**Model Hint**: ⚡ Haiku

Write user guide, API docs, and examples.

**Files**:
- `README.md` (update with new command)
- `.specweave/docs/internal/specs/specweave/FS-134/FEATURE.md`
- Example configurations

**Acceptance**:
- README updated with `/specweave:living-docs` command
- Feature documentation includes:
  - Usage examples
  - Configuration options
  - Hook setup guide
  - Troubleshooting guide
- API documentation for all public classes
- Example outputs (screenshots or links)

---

## Summary

**Total Tasks**: 12
**Estimated Effort**: 1-2 weeks
**Critical Path**: T-017 → T-018 → T-019 → T-022 → T-023 → Complete

**Depends on**: 0134-living-docs-core-engine (Part 1)
