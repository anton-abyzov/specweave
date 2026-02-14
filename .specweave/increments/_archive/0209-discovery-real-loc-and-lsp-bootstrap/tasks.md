# Tasks: 0209-discovery-real-loc-and-lsp-bootstrap

## Phase 1: TDD Red — LOC Counting

### T-001: Write failing tests for real LOC counting
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-03 | **Status**: [x] completed
**Test**: Given a discovery scan → When counting LOC → Then actual newlines are counted, not filesize/40

### T-002: Write failing tests for LOC sampling on large codebases
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02 | **Status**: [ ] deferred
**Test**: Given >10,000 files → When scanning → Then sample 10% and extrapolate within 5% error margin
*Deferred to a future increment — sampling requires integration testing with large codebases.*

## Phase 2: TDD Green — LOC Counting

### T-003: Implement real LOC counting in discovery.ts
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-03 | **Status**: [x] completed
Replace `Math.round(stat.size / 40)` with actual line counting. Exclude blank and comment-only lines.

### T-004: Implement statistical sampling for large codebases
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02 | **Status**: [ ] deferred
For tier 'large'+ codebases, sample 10% of files per directory and extrapolate.
*Deferred — same as T-002.*

## Phase 3: TDD Red — Language Detection

### T-005: Write failing tests for language detection
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03 | **Status**: [x] completed
**Test**: Given a codebase with .ts and .py files → When discovery runs → Then languagesDetected includes ['typescript', 'python']

## Phase 4: TDD Green — Language Detection

### T-006: Add languagesDetected to DiscoveryResult
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03 | **Status**: [x] completed
Map file extensions to language names. Filter to 5+ files threshold.

## Phase 5: TDD Red — LSP Bootstrap

### T-007: Write failing tests for LspBootstrapper
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05 | **Status**: [x] completed
**Test**: Given detected languages ['typescript'] → When bootstrapping LSP → Then only tsserver client initialized

## Phase 6: TDD Green — LSP Bootstrap

### T-008: Implement LspBootstrapper
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05 | **Status**: [x] completed
Create src/core/living-docs/lsp-bootstrapper.ts with smart initialization.

### T-009: Wire LSP context through pipeline
**User Story**: US-003 | **Satisfies ACs**: AC-US3-04 | **Status**: [x] completed
Pass LspContext from bootstrapper through intelligent-analyzer/index.ts.

## Phase 7: Verification

### T-010: Run full test suite and verify regression
**User Story**: US-001 | **Satisfies ACs**: AC-US1-04 | **Status**: [x] completed
17,747 tests pass, 0 failures. Zero TypeScript errors.
