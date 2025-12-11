---
increment: 0134-intelligent-living-docs-deep-analysis
title: "Intelligent Living Docs - Deep Analysis & Synthesis Engine"
type: feature
priority: P1
status: planned
created: 2025-12-09
testMode: TDD
coverageTarget: 95
dependencies: []
estimated_effort: "3-4 weeks"
---

# Intelligent Living Docs - Deep Analysis & Synthesis Engine

## Problem Statement

**Current Gap**: Living docs sync is currently a **simple file copy** operation - it takes spec.md and splits it into FEATURE.md and us-*.md files. This is **NOT intelligent** - it doesn't analyze the codebase, discover patterns, synthesize ADRs, detect technical debt, or understand the project architecture holistically.

**Vision**: Living docs should be a **comprehensive knowledge base** automatically generated from:
- All repositories (multi-repo umbrella setups)
- All existing specs and increments
- Codebase analysis (architecture, patterns, technical decisions)
- ADR discovery and synthesis
- Project/board/team structure analysis
- Technical debt detection
- Inconsistency identification
- Module relationships and dependencies

**The Goal**: Run `/specweave:living-docs update` and get a **complete, intelligent documentation suite** that:
- Synthesizes ADRs from code patterns and existing decisions
- Maps all modules across all repos with dependency graphs
- Identifies technical debt and inconsistencies
- Documents project/board structure and team ownership
- Creates comprehensive architecture documentation
- Works generically for ANY SpecWeave project

## Success Criteria

**Measurable Outcomes**:
- Single command generates 80%+ of living docs automatically
- ADR discovery identifies 90%+ of implicit architecture decisions in codebase
- Multi-repo analysis completes in <5 minutes for projects with 10 repos
- Technical debt detection finds issues with 85%+ precision
- Generic algorithm works on any SpecWeave project without customization
- Documentation stays synchronized automatically (via hooks)

## User Stories

### US-001: Multi-Repo Deep Scan & Discovery
**As a** SpecWeave user with multiple repositories (umbrella setup)
**I want** the system to automatically discover and analyze all repos in my project
**So that** living docs reflect the complete architecture across all codebases

**Acceptance Criteria**:
- [ ] **AC-US1-01**: System detects umbrella.childRepos from config.json
- [ ] **AC-US1-02**: For each repo, system performs: git clone (if not present), structure scan, file inventory
- [ ] **AC-US1-03**: System identifies repo type: frontend, backend, mobile, shared-lib, infrastructure
- [ ] **AC-US1-04**: System extracts tech stack per repo: package.json, go.mod, requirements.txt, etc.
- [ ] **AC-US1-05**: System maps projects/boards to repos based on folder structure and config
- [ ] **AC-US1-06**: Scan results cached in `.specweave/cache/repo-scan-{repo}.json` (24h TTL)

### US-002: ADR Discovery & Synthesis from Codebase
**As a** technical lead
**I want** the system to discover implicit architecture decisions in the codebase
**So that** ADRs are automatically created without manual documentation

**Acceptance Criteria**:
- [ ] **AC-US2-01**: System scans for explicit ADR files: `docs/adr/*.md`, `docs/architecture/*.md`, `.specweave/docs/internal/architecture/adr/*.md`
- [ ] **AC-US2-02**: System detects implicit decisions from code patterns:
  - State management: Redux files → "ADR: Use Redux for state management"
  - API style: REST controllers → "ADR: Use RESTful API architecture"
  - Database: Prisma schema → "ADR: Use Prisma ORM with PostgreSQL"
  - Auth: JWT tokens → "ADR: Use JWT for stateless authentication"
- [ ] **AC-US2-03**: System analyzes import patterns to detect framework choices
- [ ] **AC-US2-04**: LLM synthesizes ADR document for each discovered decision with:
  - Context (why this was needed)
  - Decision (what was chosen)
  - Alternatives considered (inferred from code comments, Git history)
  - Consequences (trade-offs)
  - Status (Accepted if widely used, Proposed if inconsistent)
- [ ] **AC-US2-05**: ADRs numbered automatically: `0001-use-redux-state-management.md`
- [ ] **AC-US2-06**: Existing ADRs preserved, new ADRs appended (incremental discovery)

### US-003: Technical Debt & Inconsistency Detection
**As a** engineering manager
**I want** the system to identify technical debt and inconsistencies across repos
**So that** I can prioritize refactoring and improvements

**Acceptance Criteria**:
- [ ] **AC-US3-01**: System detects pattern inconsistencies:
  - 70% of files use TypeScript, 30% use JavaScript → Inconsistency: "Mixed TS/JS usage"
  - Frontend uses both Redux and Context API → Inconsistency: "Multiple state management approaches"
- [ ] **AC-US3-02**: System detects outdated dependencies (using `npm outdated`, `go list -u -m all`)
- [ ] **AC-US3-03**: System identifies code smells:
  - Large files (>1000 lines)
  - High complexity functions (cyclomatic complexity >10)
  - Duplicated code blocks (similar patterns across files)
- [ ] **AC-US3-04**: System generates technical debt report: `.specweave/docs/internal/technical-debt.md`
- [ ] **AC-US3-05**: Each debt item tagged with: severity (P1/P2/P3), estimated effort, impact
- [ ] **AC-US3-06**: Report includes actionable recommendations with file paths and line numbers

### US-004: Module & Dependency Graph Generation
**As a** software architect
**I want** automatic generation of module relationship diagrams
**So that** I understand dependencies and can identify circular references

**Acceptance Criteria**:
- [ ] **AC-US4-01**: System parses import statements across all repos to build dependency graph
- [ ] **AC-US4-02**: System identifies module boundaries:
  - Monorepo: packages/*, apps/*
  - Multi-repo: Each repo is a module
  - Mixed: Detects both patterns
- [ ] **AC-US4-03**: System detects circular dependencies and flags them as issues
- [ ] **AC-US4-04**: System generates Mermaid diagram: `.specweave/docs/internal/architecture/diagrams/module-dependencies.mmd`
- [ ] **AC-US4-05**: System creates dependency matrix: which modules depend on which
- [ ] **AC-US4-06**: System calculates coupling metrics: fan-in, fan-out per module

### US-005: Project/Board/Team Structure Documentation
**As a** project manager
**I want** automatic documentation of team structure and ownership
**So that** new team members understand who owns what

**Acceptance Criteria**:
- [ ] **AC-US5-01**: System extracts projects from config.json (multiProject.projects)
- [ ] **AC-US5-02**: System extracts boards/teams from:
  - ADO area paths (sync.profiles.*.config.areaPathMapping)
  - JIRA boards (sync.profiles.*.config.boardMapping)
  - Umbrella teams (umbrella.teams)
- [ ] **AC-US5-03**: System maps modules to projects/boards based on:
  - Folder structure (specs/{project}/FS-*)
  - Repo naming conventions (sw-app-fe → project: app, board: frontend)
- [ ] **AC-US5-04**: System generates team ownership document: `.specweave/docs/internal/team-structure.md`
- [ ] **AC-US5-05**: Document includes: team name, owned modules, tech stack, contact info (from config)
- [ ] **AC-US5-06**: System generates organization chart (Mermaid diagram)

### US-006: Incremental Update with Change Detection
**As a** SpecWeave user
**I want** living docs updates to be incremental and fast
**So that** I can run updates frequently without waiting

**Acceptance Criteria**:
- [ ] **AC-US6-01**: System uses Git to detect changes since last update:
  - `git diff <last_commit> <current_commit> --name-only`
  - Only re-analyze changed files
- [ ] **AC-US6-02**: System caches analysis results in `.specweave/cache/analysis/`:
  - `adr-synthesis-{repo}-{commit_hash}.json`
  - `module-graph-{commit_hash}.json`
  - `tech-debt-{commit_hash}.json`
- [ ] **AC-US6-03**: System updates only affected documentation sections
- [ ] **AC-US6-04**: Full update mode available: `--full` flag bypasses cache
- [ ] **AC-US6-05**: Update completes in <30 seconds for incremental changes
- [ ] **AC-US6-06**: System logs what was updated: "Regenerated 3 ADRs, updated dependency graph"

### US-007: Generic Algorithm for Any SpecWeave Project
**As a** SpecWeave framework developer
**I want** the living docs engine to work on any user project
**So that** users get intelligent docs without custom configuration

**Acceptance Criteria**:
- [ ] **AC-US7-01**: System works with single-repo projects (no umbrella)
- [ ] **AC-US7-02**: System works with multi-repo umbrella projects
- [ ] **AC-US7-03**: System auto-detects tech stack (Node.js, Go, Python, Java, Rust, etc.)
- [ ] **AC-US7-04**: System handles projects without existing ADRs (synthesizes from code)
- [ ] **AC-US7-05**: System handles projects with existing ADRs (merges discoveries)
- [ ] **AC-US7-06**: System works in CI/CD environments (non-interactive mode)

### US-008: LLM-Powered Deep Analysis
**As a** SpecWeave user
**I want** the system to use LLM intelligence for complex analysis
**So that** documentation is insightful, not just mechanical

**Acceptance Criteria**:
- [ ] **AC-US8-01**: LLM analyzes code patterns to infer architectural intentions
- [ ] **AC-US8-02**: LLM generates natural language descriptions for complex modules
- [ ] **AC-US8-03**: LLM suggests alternative approaches when detecting anti-patterns
- [ ] **AC-US8-04**: LLM synthesizes "lessons learned" from Git commit messages
- [ ] **AC-US8-05**: LLM uses Haiku for speed (structure analysis) and Opus for depth (ADR synthesis)
- [ ] **AC-US8-06**: Analysis results cached to avoid repeated LLM calls (cost optimization)

### US-009: Hook Integration for Automatic Updates
**As a** SpecWeave user
**I want** living docs to update automatically on key events
**So that** documentation is always current without manual effort

**Acceptance Criteria**:
- [ ] **AC-US9-01**: Hook on increment completion: `/specweave:done` triggers living docs update for that feature
- [ ] **AC-US9-02**: Hook on code commit (optional, configurable): Git post-commit triggers incremental update
- [ ] **AC-US9-03**: Hook on spec changes: spec.md edit triggers re-sync
- [ ] **AC-US9-04**: Hooks can be disabled: `livingDocs.autoUpdate: false` in config
- [ ] **AC-US9-05**: Hook failures don't block main workflow (non-blocking, logged)
- [ ] **AC-US9-06**: User can manually trigger: `/specweave:living-docs update`

### US-010: Visualization & Interactive Exploration
**As a** developer
**I want** interactive visualizations of architecture and dependencies
**So that** I can explore the system visually

**Acceptance Criteria**:
- [ ] **AC-US10-01**: System generates interactive dependency graph (HTML + D3.js)
- [ ] **AC-US10-02**: Graph supports: zoom, pan, filter by module, highlight circular deps
- [ ] **AC-US10-03**: Clicking a module shows: description, tech stack, dependencies, dependents
- [ ] **AC-US10-04**: System generates architecture overview page (HTML dashboard)
- [ ] **AC-US10-05**: Dashboard includes: project stats, tech debt summary, ADR list, module count
- [ ] **AC-US10-06**: Visualizations accessible via: `open .specweave/docs/internal/index.html`

## Functional Requirements

### FR-001: Command-Line Interface

```bash
# Full update (all repos, all analysis)
/specweave:living-docs update

# Incremental update (only changed files)
/specweave:living-docs update --incremental

# Force full rebuild (ignore cache)
/specweave:living-docs update --full

# Specific analysis only
/specweave:living-docs update --adr-only
/specweave:living-docs update --tech-debt-only
/specweave:living-docs update --modules-only

# Dry run (show what would be updated)
/specweave:living-docs update --dry-run

# Generate specific output format
/specweave:living-docs export --format=html
/specweave:living-docs export --format=pdf
```

### FR-002: Analysis Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│          /specweave:living-docs update                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │   LivingDocsOrchestrator        │
        │   - Coordinates all analyzers    │
        │   - Manages cache                │
        │   - Handles incremental updates  │
        └────────────────┬────────────────┘
                         │
     ┌───────────────────┼───────────────────┐
     │                   │                   │
     ▼                   ▼                   ▼
┌─────────┐      ┌──────────────┐    ┌─────────────┐
│ Repo    │      │ Code Pattern │    │ Module      │
│ Scanner │      │ Analyzer     │    │ Graph       │
│         │      │              │    │ Builder     │
│ • Detect│      │ • ADR        │    │             │
│   repos │      │   discovery  │    │ • Parse     │
│ • Clone │      │ • Tech debt  │    │   imports   │
│ • Scan  │      │   detection  │    │ • Build     │
│   files │      │ • Patterns   │    │   graph     │
└────┬────┘      └──────┬───────┘    └──────┬──────┘
     │                  │                   │
     └──────────────────┼───────────────────┘
                        │
                        ▼
             ┌──────────────────┐
             │ LLM Synthesizer  │
             │                  │
             │ • Generate ADRs  │
             │ • Write          │
             │   descriptions   │
             │ • Suggest fixes  │
             └────────┬─────────┘
                      │
                      ▼
          ┌───────────────────────┐
          │ Documentation Writer  │
          │                       │
          │ • Create/update ADRs  │
          │ • Generate diagrams   │
          │ • Write reports       │
          └───────────────────────┘
```

### FR-003: Cache Strategy

**Cache Location**: `.specweave/cache/analysis/`

**Cache Files**:
```
repo-scan-{repo}-{commit_hash}.json      (Repo file inventory)
adr-synthesis-{repo}-{commit_hash}.json  (Discovered ADRs)
module-graph-{commit_hash}.json          (Dependency graph)
tech-debt-{commit_hash}.json             (Technical debt report)
last-update.json                         (Timestamp + commit hash)
```

**Cache Invalidation**:
- New Git commit → invalidate all caches for that repo
- Config change → invalidate all caches
- Manual `--full` flag → ignore cache
- 24-hour TTL for all caches

### FR-004: ADR Synthesis Format

**Discovered ADR Template**:
```markdown
# ADR-0042: Use Redux for State Management

**Status**: Accepted (discovered from codebase)

**Date**: 2025-12-09 (discovered)

**Context**:
Based on codebase analysis, this project uses Redux for state management across the frontend application. Redux files found:
- `src/store/configureStore.ts`
- `src/reducers/` (15 reducer files)
- `src/actions/` (23 action files)

Usage statistics:
- 89% of React components use Redux hooks (useSelector, useDispatch)
- 11% use local useState (typically for UI-only state)

**Decision**:
Use Redux for global application state management.

**Alternatives Considered** (inferred):
- Context API: Found in 3 files for theme/locale only
- MobX: No usage detected
- Zustand: No usage detected

**Consequences**:
Positive:
- Centralized state management
- Time-travel debugging with Redux DevTools
- Predictable state updates
- Strong typing with TypeScript

Negative:
- Boilerplate code (actions, reducers, types)
- Learning curve for new developers
- Potential over-use for simple local state

**Related Files**:
- `src/store/configureStore.ts`
- `src/reducers/index.ts`
- `package.json` (redux@4.2.0, react-redux@8.0.5)

**Discovered By**: SpecWeave Living Docs Engine v0.34.0
```

### FR-005: Technical Debt Report Format

```markdown
# Technical Debt Report

**Generated**: 2025-12-09 10:30 AM
**Project**: MyApp (3 repos)
**Total Issues**: 47

## Summary

| Category | Count | Severity |
|----------|-------|----------|
| Outdated Dependencies | 12 | P2 |
| Code Duplication | 8 | P3 |
| Large Files | 15 | P2 |
| High Complexity | 7 | P1 |
| Inconsistent Patterns | 5 | P2 |

## Critical Issues (P1)

### 1. High Cyclomatic Complexity
**File**: `backend/src/services/OrderProcessor.ts:123`
**Complexity**: 18 (threshold: 10)
**Impact**: Hard to test, bug-prone
**Recommendation**: Refactor into smaller functions
**Estimated Effort**: 3 hours

### 2. High Cyclomatic Complexity
**File**: `frontend/src/components/Dashboard.tsx:45`
**Complexity**: 15
**Impact**: Hard to maintain
**Recommendation**: Extract logic to custom hooks
**Estimated Effort**: 2 hours

...
```

## Technical Constraints

**Performance**:
- Full analysis completes in <5 minutes for 10 repos
- Incremental update completes in <30 seconds
- LLM calls optimized (cache synthesis results)
- Parallel repo scanning (up to 4 concurrent)

**Scalability**:
- Supports projects with up to 50 repositories
- Handles codebases up to 1M lines of code
- Cache size limit: 500 MB (auto-cleanup old entries)

**Reliability**:
- Analysis failures don't block other operations
- Graceful degradation if LLM unavailable (use cached results)
- Atomic file writes (temp file + rename)

**Compatibility**:
- Works with any SpecWeave project (v0.30.0+)
- Supports all major languages (TypeScript, JavaScript, Go, Python, Java, Rust)
- Cross-platform (macOS, Linux, Windows)

## Out of Scope

- ❌ Real-time analysis (triggered manually or via hooks)
- ❌ IDE integration (LSP, VSCode extension)
- ❌ Automated refactoring (only suggestions)
- ❌ Historical trend analysis (only current snapshot)
- ❌ External service integration (SonarQube, CodeClimate)

## Dependencies

**Internal**:
- Existing living docs sync infrastructure
- Hook system (PostTaskCompletion, SessionEnd)
- Cache infrastructure

**External**:
- Git (for change detection)
- Language-specific tools: `npm`, `go`, `python`, `cargo`
- LLM access (Claude API for synthesis)

## Rollout Strategy

**Phase 1: Core Engine (Week 1-2)**
- Repo scanner and file inventory
- Change detection with Git
- Cache infrastructure
- Basic CLI command

**Phase 2: Analysis Modules (Week 2-3)**
- ADR discovery from explicit files
- Pattern detection (state management, API style, etc.)
- Module graph generation
- Tech debt detection (file size, complexity)

**Phase 3: LLM Synthesis (Week 3)**
- ADR synthesis with LLM
- Natural language descriptions
- Suggestions for improvements

**Phase 4: Multi-Repo & Visualization (Week 3-4)**
- Umbrella project support
- Interactive dependency graph
- HTML dashboard
- Team structure documentation

**Phase 5: Integration & Polish (Week 4)**
- Hook integration
- Incremental updates
- Performance optimization
- Documentation and examples

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| LLM synthesis quality varies | Medium | Medium | Cache good results, manual review process |
| Large repos timeout | Low | High | Parallel scanning, progress indicators, timeouts |
| Cache corruption | Low | Medium | Validation on read, auto-rebuild |
| Git history missing (shallow clone) | Medium | Low | Detect shallow clones, prompt for full clone |
| Pattern detection false positives | Medium | Medium | Confidence scores, manual override |

## Testing Strategy

**Unit Tests** (95% coverage):
- Repo scanner logic
- Pattern detection algorithms
- Cache read/write operations
- ADR synthesis formatting

**Integration Tests** (90% coverage):
- End-to-end analysis pipeline
- Multi-repo scanning
- Incremental update correctness
- Hook integration

**E2E Tests** (90% coverage):
- Full update on real projects (test fixtures)
- Incremental update scenarios
- Error handling and recovery

**Performance Tests**:
- 10-repo project <5min
- Incremental update <30s
- Cache effectiveness (80%+ hit rate)

## Acceptance Testing

**Scenario 1: First-Time Setup**
1. User runs `/specweave:living-docs update` on fresh project
2. System scans all repos, discovers patterns
3. Generates complete living docs suite
4. User reviews ADRs, module graph, tech debt report
5. All documentation accurate and insightful

**Scenario 2: Incremental Update**
1. User makes code changes (adds new module)
2. User runs `/specweave:living-docs update`
3. System detects changes, updates only affected docs
4. Update completes in <30 seconds
5. New module appears in dependency graph

**Scenario 3: Multi-Repo Umbrella**
1. User has 5 repos in umbrella setup
2. User runs `/specweave:living-docs update`
3. System scans all 5 repos in parallel
4. Cross-repo dependencies detected and documented
5. Team structure mapped correctly to repos

## Documentation

**User-Facing**:
- `/specweave:living-docs` command reference
- Configuration guide (enabling/disabling features)
- Troubleshooting guide
- Examples for common scenarios

**Developer-Facing**:
- Architecture decision record (ADR) for engine design
- API documentation for analyzers
- Pattern detection cookbook
- Performance tuning guide
