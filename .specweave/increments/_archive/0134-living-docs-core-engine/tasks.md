---
increment: 0134-living-docs-core-engine
title: "Implementation Tasks - Living Docs Core Engine (Part 1)"
status: planned
estimated_tasks: 16
estimated_weeks: 2
phases:
  - core-infrastructure
  - analysis-modules
  - llm-synthesis
---

# Implementation Tasks - Part 1

## Phase 1: Core Infrastructure (Week 1)

### T-001: Create LivingDocsOrchestrator
**User Story**: US-001, US-006
**Satisfies ACs**: AC-US1-01, AC-US6-01, AC-US6-02
**Status**: [x] completed
**Model Hint**: 💎 Opus

Create the main orchestrator that coordinates all analysis phases with caching and change detection.

**Files**: `src/core/living-docs/intelligent-analyzer/orchestrator.ts`

**Acceptance**:
- Orchestrator executes phases in sequence
- Git-based change detection works
- Cache read/write operations functional
- Progress reporting implemented

**Test Plan**:
```gherkin
Feature: Living Docs Orchestrator
  Scenario: Full update orchestration
    Given a project with 3 repos
    When I run orchestrator.update({ full: true })
    Then it should execute all phases in sequence
    And return comprehensive update result
```

---

### T-002: Implement RepoScanner with Multi-Repo Support
**User Story**: US-001, US-007
**Satisfies ACs**: AC-US1-02, AC-US1-03, AC-US1-04, AC-US7-01, AC-US7-02
**Status**: [x] completed
**Model Hint**: 💎 Opus

Scan all repos (umbrella or single) and extract metadata including tech stack detection.

**Files**: `src/core/living-docs/intelligent-analyzer/repo-scanner.ts`

**Acceptance**:
- Detects umbrella.childRepos from config
- Scans each repo for file inventory
- Identifies repo type (frontend/backend/mobile/shared-lib)
- Extracts tech stack from package.json, go.mod, etc.

---

### T-003: Build Cache Infrastructure with Git-Based Invalidation
**User Story**: US-006
**Satisfies ACs**: AC-US6-02, AC-US6-03
**Status**: [x] completed
**Model Hint**: ⚡ Haiku

Implement caching system with Git commit hash as key and 24h TTL.

**Files**: `src/core/living-docs/intelligent-analyzer/cache-manager.ts`

**Acceptance**:
- Cache saves to `.specweave/cache/analysis/`
- Git commit hash used as cache key
- 24-hour TTL enforced
- Cache invalidation on config changes

---

### T-004: Implement Git Change Detection
**User Story**: US-006
**Satisfies ACs**: AC-US6-01
**Status**: [x] completed
**Model Hint**: ⚡ Haiku

Use `git diff` to detect changed files for incremental updates.

**Files**: Part of `orchestrator.ts`

**Acceptance**:
- Reads last update commit from cache
- Runs `git diff <last> HEAD --name-only`
- Returns list of changed files
- Handles new repositories (no last commit)

---

## Phase 2: Analysis Modules (Week 1-2)

### T-005: Create PatternAnalyzer - State Management Detection
**User Story**: US-002
**Satisfies ACs**: AC-US2-02
**Status**: [x] completed
**Model Hint**: 💎 Opus

Detect Redux, Context API, MobX, Zustand patterns in codebase.

**Files**: `src/core/living-docs/intelligent-analyzer/pattern-analyzer.ts`

**Acceptance**:
- Detects Redux (store/, useSelector, useDispatch)
- Detects Context API (createContext, useContext)
- Detects MobX (observable, observer)
- Detects Zustand (create store)
- Calculates confidence scores (% of components using pattern)

---

### T-006: Implement ADR Discovery from Explicit Files
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-06
**Status**: [x] completed
**Model Hint**: ⚡ Haiku

Scan for existing ADR files in standard locations.

**Files**: Part of `pattern-analyzer.ts`

**Acceptance**:
- Scans `docs/adr/*.md`
- Scans `docs/architecture/*.md`
- Scans `.specweave/docs/internal/architecture/adr/*.md`
- Parses existing ADRs to avoid duplicates
- Returns list of existing ADRs with numbers

---

### T-007: Build ModuleGraphBuilder with Import Parsing
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02
**Status**: [x] completed
**Model Hint**: 💎 Opus

Parse imports across all repos and build dependency graph.

**Files**: `src/core/living-docs/intelligent-analyzer/module-graph-builder.ts`

**Acceptance**:
- Parses TypeScript/JavaScript imports
- Parses Go imports
- Parses Python imports
- Identifies module boundaries (monorepo vs multi-repo)
- Builds graph with nodes (modules) and edges (dependencies)

---

### T-008: Implement Circular Dependency Detection
**User Story**: US-004
**Satisfies ACs**: AC-US4-03
**Status**: [x] completed
**Model Hint**: 💎 Opus

Detect cycles in module graph using graph algorithms (Tarjan's or DFS).

**Files**: Part of `module-graph-builder.ts`

**Acceptance**:
- Detects circular dependencies
- Returns cycle paths (e.g., ['A', 'B', 'C', 'A'])
- Categorizes severity (warning vs error)
- Handles large graphs efficiently

---

### T-009: Create TechDebtDetector - Large Files
**User Story**: US-003
**Satisfies ACs**: AC-US3-03
**Status**: [x] completed
**Model Hint**: ⚡ Haiku

Detect files >1000 lines as potential technical debt.

**Files**: `src/core/living-docs/intelligent-analyzer/tech-debt-detector.ts`

**Acceptance**:
- Scans all source files
- Uses `wc -l` or line counting
- Identifies files >1000 lines
- Severity: P1 if >2000, P2 if >1000
- Returns list with file paths and line counts

---

### T-010: Implement High Complexity Detection
**User Story**: US-003
**Satisfies ACs**: AC-US3-03
**Status**: [x] completed
**Model Hint**: 💎 Opus

Calculate cyclomatic complexity using AST parsing.

**Files**: Part of `tech-debt-detector.ts`

**Acceptance**:
- Parses TypeScript/JavaScript AST
- Calculates cyclomatic complexity per function
- Flags functions >10 complexity
- Returns function name, file, line number, complexity score

---

### T-011: Detect Outdated Dependencies
**User Story**: US-003
**Satisfies ACs**: AC-US3-02
**Status**: [x] completed
**Model Hint**: ⚡ Haiku

Use `npm outdated`, `go list -u -m all` to find outdated dependencies.

**Files**: Part of `tech-debt-detector.ts`

**Acceptance**:
- Runs `npm outdated --json` for Node.js projects
- Runs `go list -u -m all` for Go projects
- Parses output to structured format
- Returns list of outdated packages with current/latest versions

---

### T-012: Implement Pattern Inconsistency Detection
**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Status**: [x] completed
**Model Hint**: 💎 Opus

Detect mixed patterns (TypeScript/JavaScript, Redux/Context).

**Files**: Part of `pattern-analyzer.ts`

**Acceptance**:
- Detects TS/JS mix (counts .ts vs .js files)
- Detects multiple state management patterns
- Calculates usage percentages
- Flags inconsistencies with >20% usage of alternative pattern
- Returns inconsistency reports with severity

---

## Phase 3: LLM Synthesis (Week 2)

### T-013: Create ADRSynthesizer with LLM Integration
**User Story**: US-002, US-008
**Satisfies ACs**: AC-US2-04, AC-US8-01, AC-US8-05
**Status**: [x] completed
**Model Hint**: 💎 Opus

Use LLM to synthesize ADRs from discovered patterns.

**Files**: `src/core/living-docs/intelligent-analyzer/adr-synthesizer.ts`

**Acceptance**:
- Accepts Pattern input
- Constructs synthesis prompt
- Calls LLM (Opus for quality)
- Parses LLM response to ADR format
- Returns structured ADR object

---

### T-014: Design ADR Synthesis Prompts
**User Story**: US-008
**Satisfies ACs**: AC-US8-01, AC-US8-02
**Status**: [x] completed
**Model Hint**: 💎 Opus

Create effective prompts for ADR generation with context, decision, alternatives, consequences.

**Files**: Part of `adr-synthesizer.ts`

**Acceptance**:
- Prompt includes pattern evidence
- Prompt includes project context
- Prompt guides LLM to infer alternatives
- Prompt guides LLM to analyze trade-offs
- Output format matches ADR template

---

### T-015: Implement ADR Caching
**User Story**: US-008
**Satisfies ACs**: AC-US8-06
**Status**: [x] completed
**Model Hint**: ⚡ Haiku

Cache synthesized ADRs to avoid repeated LLM calls.

**Files**: Part of `adr-synthesizer.ts`

**Acceptance**:
- Uses pattern hash as cache key
- Saves to `.specweave/cache/analysis/adr-{hash}.json`
- Loads from cache before calling LLM
- Cache invalidation based on pattern changes

---

### T-016: Merge New ADRs with Existing ADRs
**User Story**: US-002
**Satisfies ACs**: AC-US2-05, AC-US2-06
**Status**: [x] completed
**Model Hint**: 💎 Opus

Preserve existing ADRs, append new ones with auto-numbering.

**Files**: Part of `adr-synthesizer.ts`

**Acceptance**:
- Reads existing ADRs from directory
- Extracts highest ADR number
- Auto-numbers new ADRs (e.g., 0042-use-redux.md)
- Avoids duplicates (checks for similar titles)
- Returns merged list of all ADRs

---

## Summary

**Total Tasks**: 16
**Estimated Effort**: 2 weeks
**Critical Path**: T-001 → T-002 → T-005 → T-013 → Complete

**Next Increment**: 0135-living-docs-visualization (12 tasks)
