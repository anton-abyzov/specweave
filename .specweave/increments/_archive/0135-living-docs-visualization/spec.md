---
increment: 0135-living-docs-visualization
title: "Intelligent Living Docs - Visualization & Integration (Part 2)"
type: feature
priority: P1
status: completed
started: 2025-12-09
completed: 2025-12-09
created: 2025-12-09
project: specweave
testMode: TDD
coverageTarget: 95
dependencies: ["0134-living-docs-core-engine"]
estimated_effort: "1-2 weeks"
actual_effort: "<1 day"
---

# Intelligent Living Docs - Visualization & Integration (Part 2)

## Problem Statement

**Part 1 (0134)** built the core analysis engine that can scan repos, detect patterns, synthesize ADRs, and build dependency graphs.

**This Increment (Part 2)**: Add the **visualization and integration layer** that makes the analysis accessible and actionable:
- Generate Mermaid diagrams for dependency visualization
- Create interactive HTML dashboards with D3.js
- Generate technical debt reports
- Document team/project structure
- Integrate with CLI (`/specweave:living-docs update`)
- Add hook integration for automatic updates

## Success Criteria

**Part 2 Deliverables**:
- Interactive dependency graph (HTML + D3.js)
- Architecture dashboard with stats
- Technical debt report (markdown)
- Team structure documentation
- CLI command fully functional
- Hook integration for auto-updates
- Complete end-to-end pipeline tested

## User Stories

### US-004: Module & Dependency Graph Generation
**As a** software architect
**I want** automatic generation of module relationship diagrams
**So that** I understand dependencies and can identify circular references

**Acceptance Criteria** (Part 2 - Visualization):
- [x] **AC-US4-04**: System generates Mermaid diagram: `.specweave/docs/internal/architecture/diagrams/module-dependencies.mmd`

### US-003: Technical Debt & Inconsistency Detection
**As a** engineering manager
**I want** the system to identify technical debt and inconsistencies across repos
**So that** I can prioritize refactoring and improvements

**Acceptance Criteria** (Part 2 - Reporting):
- [x] **AC-US3-04**: System generates technical debt report: `.specweave/docs/internal/technical-debt.md`
- [x] **AC-US3-05**: Each debt item tagged with: severity (P1/P2/P3), estimated effort, impact
- [x] **AC-US3-06**: Report includes actionable recommendations with file paths and line numbers

### US-005: Project/Board/Team Structure Documentation
**As a** project manager
**I want** automatic documentation of team structure and ownership
**So that** new team members understand who owns what

**Acceptance Criteria**:
- [x] **AC-US5-01**: System extracts projects from config.json (multiProject.projects)
- [x] **AC-US5-02**: System extracts boards/teams from:
  - ADO area paths (sync.profiles.*.config.areaPathMapping)
  - JIRA boards (sync.profiles.*.config.boardMapping)
  - Umbrella teams (umbrella.teams)
- [x] **AC-US5-03**: System maps modules to projects/boards based on:
  - Folder structure (specs/{project}/FS-*)
  - Repo naming conventions (sw-app-fe → project: app, board: frontend)
- [x] **AC-US5-04**: System generates team ownership document: `.specweave/docs/internal/team-structure.md`
- [x] **AC-US5-05**: Document includes: team name, owned modules, tech stack, contact info (from config)
- [x] **AC-US5-06**: System generates organization chart (Mermaid diagram)

### US-006: Incremental Update with Change Detection
**As a** SpecWeave user
**I want** living docs updates to be incremental and fast
**So that** I can run updates frequently without waiting

**Acceptance Criteria** (Part 2 - Performance):
- [x] **AC-US6-05**: Update completes in <30 seconds for incremental changes

### US-007: Generic Algorithm for Any SpecWeave Project
**As a** SpecWeave framework developer
**I want** the living docs engine to work on any user project
**So that** users get intelligent docs without custom configuration

**Acceptance Criteria** (Part 2 - Robustness):
- [x] **AC-US7-04**: System handles projects without existing ADRs (synthesizes from code)
- [x] **AC-US7-05**: System handles projects with existing ADRs (merges discoveries)
- [x] **AC-US7-06**: System works in CI/CD environments (non-interactive mode)

### US-009: Hook Integration for Automatic Updates
**As a** SpecWeave user
**I want** living docs to update automatically on key events
**So that** documentation is always current without manual effort

**Acceptance Criteria**:
- [x] **AC-US9-01**: Hook on increment completion: `/specweave:done` triggers living docs update for that feature
- [x] **AC-US9-02**: Hook on code commit (optional, configurable): Git post-commit triggers incremental update
- [x] **AC-US9-03**: Hook on spec changes: spec.md edit triggers re-sync
- [x] **AC-US9-04**: Hooks can be disabled: `livingDocs.autoUpdate: false` in config
- [x] **AC-US9-05**: Hook failures don't block main workflow (non-blocking, logged)
- [x] **AC-US9-06**: User can manually trigger: `/specweave:living-docs update`

### US-010: Visualization & Interactive Exploration
**As a** developer
**I want** interactive visualizations of architecture and dependencies
**So that** I can explore the system visually

**Acceptance Criteria**:
- [x] **AC-US10-01**: System generates interactive dependency graph (HTML + D3.js)
- [x] **AC-US10-02**: Graph supports: zoom, pan, filter by module, highlight circular deps
- [x] **AC-US10-03**: Clicking a module shows: description, tech stack, dependencies, dependents
- [x] **AC-US10-04**: System generates architecture overview page (HTML dashboard)
- [x] **AC-US10-05**: Dashboard includes: project stats, tech debt summary, ADR list, module count
- [x] **AC-US10-06**: Visualizations accessible via: `open .specweave/docs/internal/index.html`

## Acceptance Criteria

### US-004 Criteria
- [x] **AC-US4-04**: System generates Mermaid diagram

### US-003 Criteria
- [x] **AC-US3-04**: System generates technical debt report
- [x] **AC-US3-05**: Each debt item tagged with severity, estimated effort, impact
- [x] **AC-US3-06**: Report includes actionable recommendations

### US-005 Criteria
- [x] **AC-US5-01**: System extracts projects from config.json
- [x] **AC-US5-02**: System extracts boards/teams from ADO/JIRA/umbrella
- [x] **AC-US5-03**: System maps modules to projects/boards
- [x] **AC-US5-04**: System generates team ownership document
- [x] **AC-US5-05**: Document includes team details
- [x] **AC-US5-06**: System generates organization chart

### US-006 Criteria
- [x] **AC-US6-05**: Update completes in <30 seconds for incremental changes

### US-007 Criteria
- [x] **AC-US7-04**: System handles projects without existing ADRs
- [x] **AC-US7-05**: System handles projects with existing ADRs
- [x] **AC-US7-06**: System works in CI/CD environments

### US-009 Criteria
- [x] **AC-US9-01**: Hook on increment completion
- [x] **AC-US9-02**: Hook on code commit (optional)
- [x] **AC-US9-03**: Hook on spec changes
- [x] **AC-US9-04**: Hooks can be disabled
- [x] **AC-US9-05**: Hook failures don't block main workflow
- [x] **AC-US9-06**: User can manually trigger update

### US-010 Criteria
- [x] **AC-US10-01**: System generates interactive dependency graph
- [x] **AC-US10-02**: Graph supports zoom, pan, filter
- [x] **AC-US10-03**: Clicking a module shows details
- [x] **AC-US10-04**: System generates architecture overview page
- [x] **AC-US10-05**: Dashboard includes stats and summaries
- [x] **AC-US10-06**: Visualizations accessible via browser

## Functional Requirements

### FR-001: Visualization Components

**Mermaid Diagram Generator**: Exports module graph to .mmd format
**D3.js Interactive Graph**: HTML page with zoom/pan/filter
**HTML Dashboard**: Overview page with stats and summaries
**Markdown Report Generator**: Technical debt report

### FR-002: CLI Integration

```bash
/specweave:living-docs update           # Full update
/specweave:living-docs update --incremental
/specweave:living-docs update --full
/specweave:living-docs update --adr-only
```

### FR-003: Hook Integration

**PostIncrementCompletion**: Update living docs for completed feature
**PostCommit** (optional): Incremental update on code changes
**PostSpecEdit**: Re-sync when spec.md changes

## Technical Constraints

**Performance**:
- Incremental update <30 seconds
- Dashboard generation <10 seconds
- D3.js graph handles up to 500 modules

**Compatibility**:
- Works on macOS, Linux, Windows
- No external dependencies (pure HTML/JS/CSS)

## Dependencies

**Depends on**: 0134-living-docs-core-engine
- Orchestrator, RepoScanner, PatternAnalyzer
- ADRSynthesizer, ModuleGraphBuilder, TechDebtDetector

## Testing Strategy

**Unit Tests** (95% coverage):
- Mermaid diagram generation
- HTML template rendering
- Report formatting

**Integration Tests** (90% coverage):
- CLI command execution
- Hook integration

**E2E Tests** (90% coverage):
- Full pipeline on real project
- Dashboard interaction

## Rollout

**Part 1** (0134): Core engine and analysis ✅
**Part 2** (this increment): Visualization and integration
