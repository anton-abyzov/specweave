# Tasks: Remove Custom Parallel Agent Infrastructure

## Task Notation

- `[T###]`: Task ID
- `[P]`: Parallelizable
- `[ ]`: Not started
- `[x]`: Completed

## Phase 1: Delete Parallel Module & Types

### T-001: [RED] Write tests verifying parallel module removal
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04 | **Status**: [x] completed
**Test**: Given the parallel module is removed → When building the project → Then no imports from `auto/parallel` exist and build succeeds

---

### T-002: [GREEN] Delete `src/core/auto/parallel/` directory
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Depends On**: T-001
**Steps**:
- Delete `src/core/auto/parallel/` (8 files)
- Remove `export * from './parallel/index.js'` from `src/core/auto/index.ts`

---

### T-003: [GREEN] Remove parallel types from `src/core/auto/types.ts`
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02 | **Status**: [x] completed
**Depends On**: T-001
**Steps**:
- Remove: AgentDomain, AgentStatus, ParallelAgent, ParallelSession, ParallelConfig, WorktreeInfo, PRResult, GitProvider, FlagSuggestion, DOMAIN_SUBAGENT_MAP, DEFAULT_PARALLEL_CONFIG, isAgentDomain, isAgentStatus, isGitProvider
- Keep: AutoModeFlag, SuccessCriterion, DEFAULT_SUCCESS_CRITERIA, and all non-parallel types

---

### T-004: [REFACTOR] Verify build passes
**User Story**: US-001 | **Satisfies ACs**: AC-US1-04 | **Status**: [x] completed
**Depends On**: T-002, T-003

## Phase 2: Remove Parallel CLI Commands

### T-005: [RED] Write tests verifying CLI works without parallel features
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-04 | **Status**: [x] completed

---

### T-006: [GREEN] Strip parallel features from `auto.ts`
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 | **Status**: [x] completed
**Depends On**: T-005
**Steps**:
- Remove parallel imports (ParallelOrchestrator, AgentDomain, ParallelConfig)
- Remove CLI flags: --parallel, --frontend, --backend, --database, --devops, --qa, --pr, --draft-pr, --merge-strategy, --base-branch, --prompt
- Remove functions: handleParallelMode(), isParallelModeRequested(), getSelectedDomains(), buildParallelConfig()
- Remove parallel state cleanup from --reset handler
- Remove --prompt analysis handler

---

### T-007: [GREEN] Strip parallel features from `auto-status.ts`
**User Story**: US-002 | **Satisfies ACs**: AC-US2-02 | **Status**: [x] completed
**Depends On**: T-005
**Steps**:
- Remove ParallelOrchestrator import
- Remove --parallel and --watch flags
- Remove displayParallelStatus(), displayParallelDashboard(), watchParallelStatus()
- Remove helper functions: getStatusIcon(), formatProgress(), formatElapsedTime()

---

### T-008: [GREEN] Delete `plugins/specweave/commands/auto-parallel.md`
**User Story**: US-002 | **Satisfies ACs**: AC-US2-03 | **Status**: [x] completed

## Phase 3: Simplify Team Skills

### T-009: Simplify `team-lead/SKILL.md` to native Agent Teams only
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 | **Status**: [x] completed
**Steps**:
- Remove subagent fallback mode sections
- Remove file-based messaging references
- Remove worktree/git isolation references
- Keep only native Agent Teams path (TeamCreate, SendMessage)

---

### T-010: Simplify `team-build/SKILL.md`
**User Story**: US-003 | **Satisfies ACs**: AC-US3-02 | **Status**: [x] completed

---

### T-011: Simplify `team-status/SKILL.md`
**User Story**: US-003 | **Satisfies ACs**: AC-US3-03 | **Status**: [x] completed

---

### T-012: Simplify `team-merge/SKILL.md`
**User Story**: US-003 | **Satisfies ACs**: AC-US3-04 | **Status**: [x] completed

---

### T-013: Update `auto/SKILL.md`
**User Story**: US-003 | **Satisfies ACs**: AC-US3-05 | **Status**: [x] completed

## Phase 4: Clean Up Tests

### T-014: Delete parallel module test files
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02 | **Status**: [x] completed
**Files to delete**:
- tests/unit/core/auto/agent-spawner.test.ts
- tests/unit/core/auto/orchestrator.test.ts
- tests/unit/core/auto/pr-generator.test.ts
- tests/unit/core/auto/prompt-analyzer.test.ts
- tests/unit/core/auto/state-manager.test.ts
- tests/unit/core/auto/worktree-manager.test.ts
- tests/unit/core/auto/platform-utils.test.ts
- tests/unit/core/auto/parallel-integration.test.ts
- tests/unit/cli/commands/auto-parallel.test.ts

---

### T-015: Update agent-teams-skills validation tests
**User Story**: US-004 | **Satisfies ACs**: AC-US4-03 | **Status**: [x] completed

---

### T-016: Final verification — full test suite passes
**User Story**: US-004 | **Satisfies ACs**: AC-US4-04 | **Status**: [x] completed
**Test**: `npm run rebuild && npm test` — zero failures in remaining tests
