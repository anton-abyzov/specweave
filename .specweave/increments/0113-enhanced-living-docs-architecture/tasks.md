---
increment: 0113-enhanced-living-docs-architecture
status: active
phases:
  - foundation
  - deep-repo-analysis
  - organization-synthesis
  - architecture-generation
  - inconsistency-detection
  - integration
estimated_tasks: 16
---

# Tasks: Enhanced Living Docs - Intelligent Codebase Understanding

## Phase 1: Foundation

### T-001: Create intelligent-analyzer module structure
**User Story**: US-001, US-007
**Satisfies ACs**: Foundation for all
**Status**: [x] completed

Create `src/core/living-docs/intelligent-analyzer/`:
- `index.ts` - Main orchestrator
- `types.ts` - Shared types
- `checkpoint.ts` - Resume support
- `file-sampler.ts` - Smart file selection

---

## Phase 2: Deep Repo Analysis (Phase B)

### T-002: Implement file sampler
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed

Create `src/core/living-docs/intelligent-analyzer/file-sampler.ts`:
- Prioritize: README, package.json, entry points
- Sample: routes/, api/, models/, types/
- Limit: 20 files per repo, 500 lines each

### T-003: Implement deep repo analyzer
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04
**Status**: [x] completed

Create `src/core/living-docs/intelligent-analyzer/deep-repo-analyzer.ts`:
- Read and understand each repo via LLM
- Extract purpose, key concepts, APIs, patterns
- Generate meaningful overview (not stats)

### T-004: Implement repo analysis saver
**User Story**: US-001
**Satisfies ACs**: AC-US1-05, AC-US1-06
**Status**: [x] completed

Save results to `/repos/{name}/`:
- `overview.md` - LLM-generated understanding
- `architecture.md` - Repo-level patterns
- `api-surface.md` - Public interfaces
- Checkpoint after each repo

---

## Phase 3: Organization Synthesis (Phase C)

### T-005: Implement organization synthesizer
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04
**Status**: [x] completed

Create `src/core/living-docs/intelligent-analyzer/organization-synthesizer.ts`:
- Load all repo analyses
- Load external specs from /specs/
- LLM clustering by teams, services, domains
- Save hypotheses to /temp/

### T-006: Generate organization structure
**User Story**: US-002
**Satisfies ACs**: AC-US2-05, AC-US2-06
**Status**: [x] completed

Create `/organization/` structure:
- `overview.md` - Company tech landscape
- `teams/` - Grouped by ownership
- `microservices/` - Grouped by service
- `domains/` - Grouped by business area

---

## Phase 4: Architecture Generation (Phase D)

### T-007: Implement C4 diagram generator
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05
**Status**: [x] completed

Create `src/core/living-docs/intelligent-analyzer/architecture-generator.ts`:
- Generate C4 Context from org understanding
- Generate C4 Container from services
- Generate data flow diagram
- Output Mermaid format to /architecture/diagrams/

### T-008: Implement pattern detector
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03
**Status**: [x] completed (integrated into architecture-generator.ts)

Create `src/core/living-docs/intelligent-analyzer/pattern-detector.ts`:
- Detect auth patterns across repos
- Detect API patterns across repos
- Detect data storage patterns
- Aggregate with confidence levels

### T-009: Generate detected ADRs
**User Story**: US-004
**Satisfies ACs**: AC-US4-04, AC-US4-05, AC-US4-06
**Status**: [x] completed (integrated into architecture-generator.ts)

Generate `/architecture/adr/DETECTED-*.md`:
- One ADR per detected pattern
- Include confidence (high/medium/low)
- Include evidence (files, repos)

---

## Phase 5: Inconsistency Detection (Phase E)

### T-010: Implement inconsistency detector
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04
**Status**: [x] completed

Create `src/core/living-docs/intelligent-analyzer/inconsistency-detector.ts`:
- Compare patterns across repos
- Find contradictions
- Find duplicates
- Find ownership gaps
- Find security concerns

### T-011: Generate questions documents
**User Story**: US-005
**Satisfies ACs**: AC-US5-05, AC-US5-06, AC-US5-07
**Status**: [x] completed (integrated into inconsistency-detector.ts)

Create `/review-needed/` folder:
- `questions-for-cto.md` - Technical questions
- `questions-for-po.md` - Product questions
- `inconsistencies.md` - Contradictions
- `potential-duplicates.md` - Similar code
- `unclear-ownership.md` - Orphaned repos

---

## Phase 6: Strategy Population (Phase F)

### T-012: Implement strategy generator
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04, AC-US6-05
**Status**: [x] completed

Create `src/core/living-docs/intelligent-analyzer/strategy-generator.ts`:
- Extract tech debt from analyses
- Map business domains to code
- Identify modernization candidates
- Save to `/strategy/`

---

## Phase 7: Integration

### T-013: Update living-docs-worker.ts
**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-03
**Status**: [x] completed

Add new phases to worker:
- Phase B: Deep Repo Analysis (after discovery)
- Phase C: Organization Synthesis
- Phase D: Architecture Generation
- Phase E: Inconsistency Detection
- Phase F: Strategy Population
- Only run for deep-native/deep-api modes

### T-014: Implement enhanced checkpointing
**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-04, AC-US7-05
**Status**: [x] completed (basic checkpoint in orchestrator)

Enhanced checkpoint support:
- Per-repo checkpoint in Phase B
- Phase-level checkpoints for C-F
- Resume from any point
- Save intermediates to /temp/

---

## Phase 8: Testing

### T-015: Create test fixtures
**User Story**: All
**Satisfies ACs**: All
**Status**: [x] completed

Created unit test fixtures:
- `tests/unit/core/living-docs/intelligent-analyzer/file-sampler.test.ts`
- `tests/unit/core/living-docs/intelligent-analyzer/deep-repo-analyzer.test.ts`
- `tests/unit/core/living-docs/intelligent-analyzer/orchestrator.test.ts`

### T-016: Integration tests
**User Story**: All
**Satisfies ACs**: All
**Status**: [x] completed

Integration tests in orchestrator.test.ts cover:
- All phases complete (checkpoint flags verified)
- Output structure correct (directories created)
- Checkpoint persistence and loading
- Multi-repo analysis end-to-end

All 20 tests pass.
