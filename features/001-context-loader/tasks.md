# Tasks: Context Loader for Selective Specification Loading

## Task Notation

- `[T###]`: Sequential task ID
- `[P]`: Parallelizable (no file conflicts)
- `[US#]`: User story reference
- `[ ]`: Not started
- `[x]`: Completed

## Phase 1: Setup and Foundation

- [ ] [T001] [P] Create project structure for context-loader
- [ ] [T002] [P] Install dependencies (remark, js-tiktoken, js-yaml, glob, fs-extra)
- [ ] [T003] [P] Create ADR 004: Context Loading Approach
- [ ] [T004] [P] Create ADR 005: Section Anchor Format
- [ ] [T005] [P] Setup test framework (Jest or Mocha)

## Phase 2: Context Manifest Parser (US1)

### ContextManifestParser Component

- [ ] [T006] Write test for ContextManifestParser.parse() with valid manifest
- [ ] [T007] Implement ContextManifestParser in src/context-loader/ContextManifestParser.js
- [ ] [T008] Write test for schema validation (invalid manifests)
- [ ] [T009] Implement schema validation with clear error messages
- [ ] [T010] [P] Write test for glob pattern resolution
- [ ] [T011] Implement glob pattern resolution
- [ ] [T012] Write test for section anchor parsing
- [ ] [T013] Implement section anchor parsing

## Phase 3: Selective Loader (US1, US3)

### SelectiveLoader Component

- [ ] [T014] Write test for SelectiveLoader.loadFiles() with basic file paths
- [ ] [T015] Implement SelectiveLoader in src/context-loader/SelectiveLoader.js
- [ ] [T016] Write test for section extraction by anchor
- [ ] [T017] Implement markdown section parser with remark
- [ ] [T018] Write test for nested section handling
- [ ] [T019] Implement nested section extraction logic
- [ ] [T020] [P] Write test for multiple sections from same file
- [ ] [T021] Implement multi-section extraction
- [ ] [T022] Write test for missing file graceful handling
- [ ] [T023] Implement error handling for missing files (log warning, continue)

## Phase 4: Token Counting (US1, US4)

### Token Utilities

- [ ] [T024] [P] Write test for token counting utility
- [ ] [T025] Implement token-counter.js using js-tiktoken
- [ ] [T026] Write test for TokenBudgetEnforcer.validate()
- [ ] [T027] Implement TokenBudgetEnforcer in src/context-loader/TokenBudgetEnforcer.js
- [ ] [T028] Write test for budget warnings (80% threshold)
- [ ] [T029] Implement budget warning logic
- [ ] [T030] Write test for budget exceeded error
- [ ] [T031] Implement budget enforcement with clear error messages

## Phase 5: Cache Manager (US2)

### Caching Layer

- [ ] [T032] Write test for CacheManager.save() and load()
- [ ] [T033] Implement CacheManager in src/context-loader/CacheManager.js
- [ ] [T034] Write test for cache invalidation on file modification
- [ ] [T035] Implement modification time tracking and invalidation
- [ ] [T036] [P] Write test for cache statistics
- [ ] [T037] Implement cache stats (hit rate, entry count, size)
- [ ] [T038] Write test for cache clear command
- [ ] [T039] Implement cache clear functionality

## Phase 6: Context Index Builder (US5)

### Index Generation

- [ ] [T040] Write test for ContextIndexBuilder.buildIndex()
- [ ] [T041] Implement ContextIndexBuilder in src/context-loader/ContextIndexBuilder.js
- [ ] [T042] Write test for recursive spec scanning
- [ ] [T043] Implement recursive directory scanning with glob
- [ ] [T044] [P] Write test for header extraction from markdown
- [ ] [T045] Implement header extraction and anchor generation
- [ ] [T046] Write test for keyword search in index
- [ ] [T047] Implement index search functionality
- [ ] [T048] Write test for index auto-refresh on spec changes
- [ ] [T049] Implement index auto-refresh logic

## Phase 7: Integration & Main API (US1)

### Public API

- [ ] [T050] Write integration test for full manifest → context flow
- [ ] [T051] Implement main context loader API in src/context-loader/index.js
- [ ] [T052] Write test for loadContext(manifestPath) method
- [ ] [T053] Implement loadContext() orchestrating all components
- [ ] [T054] [P] Write test for priority-based loading
- [ ] [T055] Implement priority loading (high priority files first)

## Phase 8: CLI Integration

### Command Line Interface

- [ ] [T056] [P] Create CLI command: `specweave context load <manifest>`
- [ ] [T057] [P] Create CLI command: `specweave context index`
- [ ] [T058] [P] Create CLI command: `specweave context cache clear`
- [ ] [T059] [P] Create CLI command: `specweave context cache stats`
- [ ] [T060] Add context commands to main CLI help

## Phase 9: Utilities & Helpers

### Supporting Scripts

- [ ] [T061] [P] Create validation script: ai-temp-files/scripts/validation/validate-context-manifest.js
- [ ] [T062] [P] Create example manifests in ai-temp-files/examples/
- [ ] [T063] [P] Create performance benchmark script

## Phase 10: Testing & Validation

### Comprehensive Testing

- [ ] [T064] Run all unit tests and verify >80% coverage
- [ ] [T065] Run integration tests with real specs
- [ ] [T066] Run performance tests (measure token reduction, cache hit rate)
- [ ] [T067] Test with 100+ file spec collection
- [ ] [T068] Validate against success criteria in spec.md

## Phase 11: Documentation

### Documentation Updates

- [ ] [T069] Update docs/reference/context-manifests.md with full API
- [ ] [T070] Update docs/guides/context-loading.md with usage examples
- [ ] [T071] Update docs/architecture/context-loading.md with architecture details
- [ ] [T072] Update README.md with context loader section
- [ ] [T073] Generate API documentation (JSDoc)

## Phase 12: Deployment & Finalization

### Final Steps

- [ ] [T074] Update .specweave/config.yaml with context settings
- [ ] [T075] Add context-loader to package.json exports
- [ ] [T076] Create release notes for context-loader feature
- [ ] [T077] Update features/README.md with completed feature
- [ ] [T078] Mark all tasks complete and close feature

## Dependencies

**Critical Path**:
- T007 depends on T006 (test first)
- T015 depends on T014 (test first)
- T027 depends on T025 (token counter must exist)
- T051 depends on T007, T015, T033, T041 (all components must exist)

**Parallel Work**:
- T001-T005 can run in parallel (setup)
- T010, T020, T024, T036, T044 can run in parallel (tests for different components)
- T056-T060 can run in parallel (CLI commands)
- T061-T063 can run in parallel (utility scripts)
- T069-T073 can run in parallel (documentation)

**Recommended Sequence**:
1. Setup (T001-T005)
2. Manifest Parser (T006-T013)
3. Selective Loader (T014-T023)
4. Token Counting (T024-T031)
5. Cache Manager (T032-T039)
6. Index Builder (T040-T049)
7. Integration (T050-T055)
8. CLI (T056-T060)
9. Utilities (T061-T063)
10. Testing (T064-T068)
11. Documentation (T069-T073)
12. Deployment (T074-T078)

---

Total Tasks: 78
Estimated Effort: 3-5 days for experienced developer
Parallelizable Tasks: 15 (marked with [P])
