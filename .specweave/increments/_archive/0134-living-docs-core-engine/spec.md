---
increment: 0134-living-docs-core-engine
title: "Intelligent Living Docs - Core Engine & Analysis (Part 1)"
type: feature
priority: P1
status: in-progress
started: 2025-12-09
created: 2025-12-09
project: specweave
testMode: TDD
coverageTarget: 95
dependencies: ["0128-process-lifecycle-zombie-prevention"]
estimated_effort: "2 weeks"
---

# Intelligent Living Docs - Core Engine & Analysis (Part 1)

## Problem Statement

**Current Gap**: Living docs sync is currently a **simple file copy** operation - it takes spec.md and splits it into FEATURE.md and us-*.md files. This is **NOT intelligent** - it doesn't analyze the codebase, discover patterns, synthesize ADRs, detect technical debt, or understand the project architecture holistically.

**This Increment (Part 1)**: Build the **core analysis engine** that can:
- Scan multi-repo umbrella setups
- Detect code patterns (state management, API styles, etc.)
- Discover and synthesize Architecture Decision Records (ADRs)
- Use LLM intelligence for deep insights

**Part 2** (0135): Visualization, dashboards, and integration

## Success Criteria

**Part 1 Deliverables**:
- Orchestrator coordinates all analysis phases
- Multi-repo scanning with caching
- Pattern detection (state management, API, auth, database)
- ADR synthesis using LLM (Haiku + Opus)
- Complete core engine ready for visualization layer

## User Stories

### US-001: Multi-Repo Deep Scan & Discovery
**As a** SpecWeave user with multiple repositories (umbrella setup)
**I want** the system to automatically discover and analyze all repos in my project
**So that** living docs reflect the complete architecture across all codebases

**Acceptance Criteria**:
- [x] **AC-US1-01**: System detects umbrella.childRepos from config.json
- [x] **AC-US1-02**: For each repo, system performs: git clone (if not present), structure scan, file inventory
- [x] **AC-US1-03**: System identifies repo type: frontend, backend, mobile, shared-lib, infrastructure
- [x] **AC-US1-04**: System extracts tech stack per repo: package.json, go.mod, requirements.txt, etc.
- [ ] **AC-US1-05**: System maps projects/boards to repos based on folder structure and config
- [ ] **AC-US1-06**: Scan results cached in `.specweave/cache/repo-scan-{repo}.json` (24h TTL)

### US-002: ADR Discovery & Synthesis from Codebase
**As a** technical lead
**I want** the system to discover implicit architecture decisions in the codebase
**So that** ADRs are automatically created without manual documentation

**Acceptance Criteria**:
- [x] **AC-US2-01**: System scans for explicit ADR files: `docs/adr/*.md`, `docs/architecture/*.md`, `.specweave/docs/internal/architecture/adr/*.md`
- [x] **AC-US2-02**: System detects implicit decisions from code patterns:
  - State management: Redux files → "ADR: Use Redux for state management"
  - API style: REST controllers → "ADR: Use RESTful API architecture"
  - Database: Prisma schema → "ADR: Use Prisma ORM with PostgreSQL"
  - Auth: JWT tokens → "ADR: Use JWT for stateless authentication"
- [ ] **AC-US2-03**: System analyzes import patterns to detect framework choices
- [x] **AC-US2-04**: LLM synthesizes ADR document for each discovered decision with:
  - Context (why this was needed)
  - Decision (what was chosen)
  - Alternatives considered (inferred from code comments, Git history)
  - Consequences (trade-offs)
  - Status (Accepted if widely used, Proposed if inconsistent)
- [x] **AC-US2-05**: ADRs numbered automatically: `0001-use-redux-state-management.md`
- [x] **AC-US2-06**: Existing ADRs preserved, new ADRs appended (incremental discovery)

### US-003: Technical Debt & Inconsistency Detection
**As a** engineering manager
**I want** the system to identify technical debt and inconsistencies across repos
**So that** I can prioritize refactoring and improvements

**Acceptance Criteria** (Part 1 - Detection Only):
- [x] **AC-US3-01**: System detects pattern inconsistencies:
  - 70% of files use TypeScript, 30% use JavaScript → Inconsistency: "Mixed TS/JS usage"
  - Frontend uses both Redux and Context API → Inconsistency: "Multiple state management approaches"
- [x] **AC-US3-02**: System detects outdated dependencies (using `npm outdated`, `go list -u -m all`)
- [x] **AC-US3-03**: System identifies code smells:
  - Large files (>1000 lines)
  - High complexity functions (cyclomatic complexity >10)
  - Duplicated code blocks (similar patterns across files)

### US-004: Module & Dependency Graph Generation
**As a** software architect
**I want** automatic generation of module relationship diagrams
**So that** I understand dependencies and can identify circular references

**Acceptance Criteria** (Part 1 - Graph Building):
- [x] **AC-US4-01**: System parses import statements across all repos to build dependency graph
- [x] **AC-US4-02**: System identifies module boundaries:
  - Monorepo: packages/*, apps/*
  - Multi-repo: Each repo is a module
  - Mixed: Detects both patterns
- [x] **AC-US4-03**: System detects circular dependencies and flags them as issues

### US-006: Incremental Update with Change Detection
**As a** SpecWeave user
**I want** living docs updates to be incremental and fast
**So that** I can run updates frequently without waiting

**Acceptance Criteria**:
- [x] **AC-US6-01**: System uses Git to detect changes since last update:
  - `git diff <last_commit> <current_commit> --name-only`
  - Only re-analyze changed files
- [x] **AC-US6-02**: System caches analysis results in `.specweave/cache/analysis/`:
  - `adr-synthesis-{repo}-{commit_hash}.json`
  - `module-graph-{commit_hash}.json`
  - `tech-debt-{commit_hash}.json`
- [x] **AC-US6-03**: System updates only affected documentation sections

### US-007: Generic Algorithm for Any SpecWeave Project
**As a** SpecWeave framework developer
**I want** the living docs engine to work on any user project
**So that** users get intelligent docs without custom configuration

**Acceptance Criteria**:
- [x] **AC-US7-01**: System works with single-repo projects (no umbrella)
- [x] **AC-US7-02**: System works with multi-repo umbrella projects
- [ ] **AC-US7-03**: System auto-detects tech stack (Node.js, Go, Python, Java, Rust, etc.)

### US-008: LLM-Powered Deep Analysis
**As a** SpecWeave user
**I want** the system to use LLM intelligence for complex analysis
**So that** documentation is insightful, not just mechanical

**Acceptance Criteria**:
- [x] **AC-US8-01**: LLM analyzes code patterns to infer architectural intentions
- [x] **AC-US8-02**: LLM generates natural language descriptions for complex modules
- [ ] **AC-US8-03**: LLM suggests alternative approaches when detecting anti-patterns
- [ ] **AC-US8-04**: LLM synthesizes "lessons learned" from Git commit messages
- [x] **AC-US8-05**: LLM uses Haiku for speed (structure analysis) and Opus for depth (ADR synthesis)
- [x] **AC-US8-06**: Analysis results cached to avoid repeated LLM calls (cost optimization)

## Acceptance Criteria

### US-001 Criteria
- [x] **AC-US1-01**: System detects umbrella.childRepos from config.json
- [x] **AC-US1-02**: For each repo, system performs: git clone (if not present), structure scan, file inventory
- [x] **AC-US1-03**: System identifies repo type: frontend, backend, mobile, shared-lib, infrastructure
- [x] **AC-US1-04**: System extracts tech stack per repo: package.json, go.mod, requirements.txt, etc.
- [ ] **AC-US1-05**: System maps projects/boards to repos based on folder structure and config
- [ ] **AC-US1-06**: Scan results cached in `.specweave/cache/repo-scan-{repo}.json` (24h TTL)

### US-002 Criteria
- [x] **AC-US2-01**: System scans for explicit ADR files
- [x] **AC-US2-02**: System detects implicit decisions from code patterns
- [ ] **AC-US2-03**: System analyzes import patterns to detect framework choices
- [x] **AC-US2-04**: LLM synthesizes ADR document for each discovered decision
- [x] **AC-US2-05**: ADRs numbered automatically
- [x] **AC-US2-06**: Existing ADRs preserved, new ADRs appended

### US-003 Criteria
- [x] **AC-US3-01**: System detects pattern inconsistencies
- [x] **AC-US3-02**: System detects outdated dependencies
- [x] **AC-US3-03**: System identifies code smells (large files, high complexity)

### US-004 Criteria
- [x] **AC-US4-01**: System parses import statements across all repos to build dependency graph
- [x] **AC-US4-02**: System identifies module boundaries
- [x] **AC-US4-03**: System detects circular dependencies and flags them as issues

### US-006 Criteria
- [x] **AC-US6-01**: System uses Git to detect changes since last update
- [x] **AC-US6-02**: System caches analysis results
- [x] **AC-US6-03**: System updates only affected documentation sections

### US-007 Criteria
- [x] **AC-US7-01**: System works with single-repo projects
- [x] **AC-US7-02**: System works with multi-repo umbrella projects
- [ ] **AC-US7-03**: System auto-detects tech stack

### US-008 Criteria
- [x] **AC-US8-01**: LLM analyzes code patterns to infer architectural intentions
- [x] **AC-US8-02**: LLM generates natural language descriptions for complex modules
- [ ] **AC-US8-03**: LLM suggests alternative approaches when detecting anti-patterns
- [ ] **AC-US8-04**: LLM synthesizes "lessons learned" from Git commit messages
- [x] **AC-US8-05**: LLM uses Haiku for speed and Opus for depth
- [x] **AC-US8-06**: Analysis results cached to avoid repeated LLM calls

## Functional Requirements

### FR-001: Core Components (Part 1)

**LivingDocsOrchestrator**: Main coordinator
**RepoScanner**: Multi-repo discovery
**PatternAnalyzer**: Code pattern detection
**ADRSynthesizer**: LLM-powered ADR generation
**ModuleGraphBuilder**: Dependency graph construction
**TechDebtDetector**: Technical debt identification

### FR-002: Analysis Pipeline

```
User → Orchestrator → [Phase 1: Discovery] → [Phase 2: Analysis] → [Phase 3: Synthesis] → Results
```

## Technical Constraints

**Performance**:
- Repo scanning with parallel workers (up to 4 concurrent)
- LLM calls optimized with caching
- Git-based change detection for incremental updates

**Reliability**:
- Analysis failures don't block other operations
- Graceful degradation if LLM unavailable
- Atomic file writes (temp file + rename)

## Out of Scope (Part 1)

- ❌ Visualization (HTML dashboards, interactive graphs) - Part 2
- ❌ CLI command integration - Part 2
- ❌ Hook integration - Part 2
- ❌ Team structure documentation - Part 2

## Dependencies

**Depends on**: 0128-process-lifecycle-zombie-prevention
- Stable process management for LLM calls
- Session registry to prevent zombie processes

## Testing Strategy

**Unit Tests** (95% coverage):
- Orchestrator phase execution
- Repo scanner logic
- Pattern detection algorithms
- Cache operations
- ADR synthesis formatting

**Integration Tests** (90% coverage):
- End-to-end analysis pipeline
- Multi-repo scanning
- LLM integration

## Rollout

**Part 1**: Core engine and analysis (this increment)
**Part 2**: Visualization and integration (0135)
