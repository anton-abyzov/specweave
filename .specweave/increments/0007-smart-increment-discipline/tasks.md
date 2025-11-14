# Tasks: Increment Management v2.0 (0007)

**Status**: Complete
**Total Tasks**: 24
**Completed**: 24
**Progress**: 100%
**Timeline**: 20-28 hours (aggressive delivery)
**Delivery**: v0.7.0 (all-in-one)

---

## Overview

This increment combines TWO major enhancements delivered in ONE release:

- **Part 1**: Test-Aware Planning (eliminate tests.md, embed tests in tasks)
- **Part 2**: Smart Status Management (pause/resume/abandon, type-based limits)

**Key Innovation**: This is the FIRST increment using the new embedded test format (dogfooding!)

**Coverage Target**: 80-90% (realistic, not 100%)

---

## PART 1: TEST-AWARE PLANNING (12-16 hours)

### Phase 1A: Architecture Updates (2 hours)

#### T-001: Delete tests.md references from plan.md

**User Story**: US2
**Acceptance Criteria**: AC-US2-01 (tasks with embedded tests)
**Priority**: P1
**Estimate**: 0.5 hours
**Status**: [x] completed

**User Story**: [US1: Acceptance Criteria with IDs (P1)](../../docs/internal/specs/default/smart-increment-discipline/us-us1-*.md)

**AC**: AC-US1-01, AC-US1-02, AC-US1-03

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: No references to "tests.md" or "TC-IDs" in plan.md
- Search: `grep -i "tests.md" plan.md` returns empty
- Search: `grep -i "TC-" plan.md` returns empty

**Implementation**:
1. Open plan.md
2. Find all references to tests.md (search: "tests.md")
3. Replace with "tasks.md (with embedded test plans)"
4. Find all references to TC-IDs (search: "TC-")
5. Replace with "test function names"
6. Update examples to show embedded format
7. Validate with grep

---

#### T-002: Update ARCHITECTURE-PIVOT.md (final polish)

**User Story**: US2
**Acceptance Criteria**: AC-US2-01
**Priority**: P2
**Estimate**: 0.5 hours
**Status**: [x] completed

**User Story**: [US1: Acceptance Criteria with IDs (P1)](../../docs/internal/specs/default/smart-increment-discipline/us-us1-*.md)

**AC**: AC-US1-01, AC-US1-02, AC-US1-03

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: Clear, complete, no errors
- Readability: Can be understood by new contributors

**Implementation**:
1. Proofread ARCHITECTURE-PIVOT.md
2. Add any missing details
3. Fix typos/grammar
4. Add examples if needed

---

#### T-002a: Fix strategy/RFC duplication issue (CORRECTED APPROACH)

**User Story**: US-BUGFIX (prevents duplicate user stories in strategy/ vs RFC)
**Acceptance Criteria**: RFC is source of truth, strategy/ is high-level only, increment spec.md can duplicate RFC
**Priority**: P1
**Estimate**: 3 hours (COMPLETED - corrected after initial misunderstanding)
**Status**: [x] completed

**Test Plan**:
- **Given** increment-planner skill invoked
- **When** creating new increment
- **Then** RFC spec.md is created as SOURCE OF TRUTH (living docs, permanent, evolves)
- **And** strategy docs are optional and high-level only (NO detailed user stories)
- **And** increment spec.md can duplicate RFC or reference it (frozen snapshot, that's OK)

**Test Cases**:
1. **Manual**: Create test increment (deferred to T-002b below)
   - Run: `/specweave:inc "9995-test-no-duplication"`
   - Check: `docs/internal/rfc/rfc-9995-test-no-duplication/spec.md` exists (SOURCE OF TRUTH)
   - Check: No `docs/internal/strategy/test-no-duplication/user-stories.md`
   - Check: `increments/9995-test-no-duplication/spec.md` can duplicate or reference RFC
   - **Coverage**: 100%

**Implementation** (COMPLETED after correction):
1. ✅ Updated `plugins/specweave/skills/increment-planner/SKILL.md`
   - Changed STEP 2 to create RFC as source of truth (permanent)
   - Made strategy docs optional and high-level only
   - Made increment spec.md optional (can duplicate RFC)
   - Updated "What Gets Created" section (RFC first)
   - Updated validation rules (RFC is mandatory, increment spec.md is optional)
2. ✅ Updated `plugins/specweave/agents/pm/AGENT.md`
   - Changed "Output 1" to RFC (living docs - source of truth)
   - Made strategy docs "Output 2" (high-level only)
   - Made increment spec.md "Output 3" (optional, can duplicate RFC)
3. ✅ Updated `CLAUDE.md`
   - Added RFC structure to directory tree
   - Clarified strategy folder is optional and high-level only
   - Added explicit comments: "those go in RFC spec.md"
4. ✅ Created design documents:
   - `.specweave/increments/0007-smart-increment-discipline/reports/DUPLICATION-FIX-DESIGN.md` (marked as INCORRECT)
   - `.specweave/increments/0007-smart-increment-discipline/reports/CORRECTED-ARCHITECTURE.md` (correct solution)

**Files Changed**:
- `plugins/specweave/skills/increment-planner/SKILL.md`
- `plugins/specweave/agents/pm/AGENT.md`
- `CLAUDE.md`
- `.specweave/increments/0007-smart-increment-discipline/reports/DUPLICATION-FIX-DESIGN.md` (marked incorrect)
- `.specweave/increments/0007-smart-increment-discipline/reports/CORRECTED-ARCHITECTURE.md` (correct design)

**Key Correction**:
- ❌ WRONG: increment spec.md as source of truth
- ✅ CORRECT: RFC spec.md as source of truth (living docs, permanent, can be linked to Jira/ADO/GitHub)
- 📝 **Key Insight**: Both RFC and increment files are permanent:
  - RFC = Living documentation (evolves as requirements change)
  - Increment = Frozen snapshot (captures state at implementation time, never updated)
  - This provides historical traceability: "What did we plan THEN?" vs "Where are we NOW?"

---

#### T-002b: Test duplication fix with new increment (PENDING USER TESTING)

**User Story**: US-BUGFIX
**Acceptance Criteria**: Verify no duplication in newly created increments
**Priority**: P1
**Estimate**: 0.5 hours
**Status**: [x] completed

**Test Plan**:
- **Given** duplication fix applied (T-002a)
- **When** user creates a new increment after Claude Code restart
- **Then** verify no duplicate files created
- **And** spec.md contains complete requirements

**Test Cases**:
1. **Manual**: Create test increment 9995
   - Run: `/specweave:inc "9995-test-no-duplication"`
   - Check: No `docs/internal/strategy/test-no-duplication/user-stories.md`
   - Check: No `docs/internal/strategy/test-no-duplication/requirements.md`
   - Check: Only `docs/internal/strategy/test-no-duplication/overview.md` (high-level)
   - Check: `increments/9995-test-no-duplication/spec.md` has full US-001+, FR-001+
   - **Coverage**: 100%

**Implementation**:
1. RESTART Claude Code (required for plugin changes to take effect)
2. Create test increment 9995
3. Verify no duplication
4. Mark task complete if validation passes

**Notes**:
- Requires Claude Code restart to load updated plugin files
- User should test this after changes are committed
- If duplication still occurs, review design document for additional fixes needed

---

### Phase 1B: test-aware-planner Agent (4-6 hours)

#### T-003: Create test-aware-planner agent structure

**User Story**: US3
**Acceptance Criteria**: AC-US3-01 (agent reads spec/plan)
**Priority**: P1
**Estimate**: 1 hour
**Status**: [x] completed

**User Story**: [US2: Test-Aware Tasks (P1)](../../docs/internal/specs/default/smart-increment-discipline/us-us2-*.md)

**AC**: AC-US2-01, AC-US2-02, AC-US2-03

**Test Plan**:
- **Given** plugin directory structure exists
- **When** test-aware-planner agent is created
- **Then** directory structure matches Claude Code plugin format
- **And** AGENT.md has valid YAML frontmatter
- **And** Agent can be invoked via Task tool

**Test Cases**:
1. **Manual**: Verify directory structure
   - Check: `plugins/specweave/agents/test-aware-planner/` exists
   - Check: `AGENT.md` exists with YAML frontmatter
   - Check: `templates/` directory exists
   - **Coverage**: 100% (critical structure)

2. **Integration**: `tests/integration/test-aware-planner/agent-invocation.test.ts`
   - `testAgentCanBeInvoked()`: Task tool can invoke agent
   - `testAgentValidation()`: Agent rejects invalid inputs
   - **Coverage**: 85%

**Implementation**:
1. Create `plugins/specweave/agents/test-aware-planner/`
2. Create `AGENT.md` with YAML frontmatter
3. Create `templates/` subdirectory
4. Create `test-cases/` subdirectory (for agent tests)
5. Test: Try invoking agent (should load, even if empty)

---

#### T-004: Write test-aware-planner AGENT.md prompt

**User Story**: US3
**Acceptance Criteria**: AC-US3-02 (agent generates tasks with tests)
**Priority**: P1
**Estimate**: 3 hours
**Status**: [x] completed

**User Story**: [US2: Test-Aware Tasks (P1)](../../docs/internal/specs/default/smart-increment-discipline/us-us2-*.md)

**AC**: AC-US2-01, AC-US2-02, AC-US2-03

**Test Plan**:
- **Given** spec.md and plan.md as input
- **When** agent is invoked
- **Then** agent generates tasks.md with embedded test plans
- **And** each task has test cases, coverage targets, validation

**Test Cases**:
1. **Agent Test**: `plugins/specweave/agents/test-aware-planner/test-cases/test-1-basic.yaml`
   - Input: Simple spec.md + plan.md
   - Expected Output: tasks.md with 3 tasks, each with test plan
   - Validation: YAML format, manual verification
   - **Coverage**: 90% (critical workflow)

2. **Agent Test**: `test-cases/test-2-tdd-mode.yaml`
   - Input: spec.md + plan.md + TDD mode enabled
   - Expected Output: tasks.md with TDD Workflow sections
   - **Coverage**: 85%

3. **Agent Test**: `test-cases/test-3-non-testable.yaml`
   - Input: spec.md with documentation tasks
   - Expected Output: tasks.md with "Test Plan: N/A" for docs
   - **Coverage**: 80%

**Overall Coverage Target**: 85%

**Implementation**:
1. Write YAML frontmatter (name, description, tools, model)
2. Write system prompt:
   - Explain role (generate tasks with embedded tests)
   - Define input format (spec.md, plan.md paths)
   - Define output format (tasks.md with test plans)
   - Include examples of embedded test format
   - Specify validation rules
3. Add TDD mode detection logic
4. Add non-testable task handling
5. Create 3 test case YAML files
6. Test manually: Invoke agent with test cases

---

#### T-005: Create task/test templates

**User Story**: US3
**Acceptance Criteria**: AC-US3-02
**Priority**: P2
**Estimate**: 1 hour
**Status**: [x] completed

**User Story**: [US3: Task-Aware Tests (P1)](../../docs/internal/specs/default/smart-increment-discipline/us-us3-*.md)

**AC**: AC-US3-01, AC-US3-02, AC-US3-03

**Test Plan**:
- **Given** template files created
- **When** agent uses templates
- **Then** generated tasks follow consistent format
- **And** all required fields are present

**Test Cases**:
1. **Manual**: Verify template structure
   - Check: `templates/task-with-tests.md` exists
   - Check: Template has all fields (Test Plan, Test Cases, Coverage Target)
   - **Coverage**: 100%

**Implementation**:
1. Create `templates/task-with-tests.md` (testable task template)
2. Create `templates/task-documentation.md` (non-testable task template)
3. Create `templates/task-tdd-mode.md` (with TDD Workflow section)
4. Add placeholder variables ({{TASK_TITLE}}, {{AC_IDS}}, etc.)

---

#### T-006: Test test-aware-planner agent end-to-end

**User Story**: US3
**Acceptance Criteria**: AC-US3-03 (agent creates bidirectional links)
**Priority**: P1
**Estimate**: 1-2 hours
**Status**: [x] completed

**User Story**: [US3: Task-Aware Tests (P1)](../../docs/internal/specs/default/smart-increment-discipline/us-us3-*.md)

**AC**: AC-US3-01, AC-US3-02, AC-US3-03

**Test Plan**:
- **Given** real spec.md and plan.md from increment 0008 (create test increment)
- **When** agent is invoked via increment-planner
- **Then** tasks.md is generated with embedded tests
- **And** all tasks reference AC-IDs
- **And** coverage targets are realistic (80-90%)

**Test Cases**:
1. **Integration**: `tests/integration/test-aware-planner/end-to-end.test.ts`
   - `testGenerateTasksWithTests()`: Full workflow
   - Input: spec.md + plan.md fixtures
   - Output: Validate tasks.md structure
   - **Coverage**: 85%

2. **Manual**: Create test increment 9999
   - Run: `/specweave:inc "9999-test-feature"`
   - Check: tasks.md generated with embedded tests
   - Check: Each task has test plan
   - **Coverage**: 100% (critical path)

**Implementation**:
1. Create test increment 9999 as fixture
2. Write integration test
3. Run agent end-to-end
4. Validate output manually
5. Fix any issues

---

### Phase 1C: /specweave:check-tests Command (2-3 hours)

#### T-007: Create /specweave:check-tests command structure

**User Story**: US5
**Acceptance Criteria**: AC-US5-01 (command exists)
**Priority**: P1
**Estimate**: 0.5 hours
**Status**: [x] completed

**User Story**: [US4: test-aware-planner Agent (P1)](../../docs/internal/specs/default/smart-increment-discipline/us-us4-*.md)

**AC**: AC-US4-01, AC-US4-02, AC-US4-03

**Test Plan**:
- **Given** command file created
- **When** user runs `/specweave:check-tests <id>`
- **Then** command loads and executes
- **And** command has valid YAML frontmatter

**Test Cases**:
1. **Manual**: Verify command invocation
   - Run: `/specweave:check-tests 0007`
   - Expected: Command executes (even if placeholder)
   - **Coverage**: 100%

**Implementation**:
1. Create `plugins/specweave/commands/check-tests.md`
2. Add YAML frontmatter (name, description)
3. Add usage documentation
4. Add placeholder implementation message

---

#### T-008: Implement check-tests logic (NEW format)

**User Story**: US5
**Acceptance Criteria**: AC-US5-02 (generates coverage report)
**Priority**: P1
**Estimate**: 2 hours
**Status**: [x] completed

**User Story**: [US4: test-aware-planner Agent (P1)](../../docs/internal/specs/default/smart-increment-discipline/us-us4-*.md)

**AC**: AC-US4-01, AC-US4-02, AC-US4-03

**Test Plan**:
- **Given** increment with tasks.md (embedded tests)
- **When** /specweave:check-tests is run
- **Then** report shows task coverage analysis
- **And** report shows AC coverage
- **And** report identifies missing tests

**Test Cases**:
1. **Unit**: `tests/unit/check-tests/parser.test.ts`
   - `testParseEmbeddedTests()`: Extract test plans from tasks.md
   - `testCalculateCoverage()`: Coverage percentage calculation
   - `testIdentifyMissingTests()`: Find tasks without tests
   - **Coverage**: 90%

2. **Integration**: `tests/integration/check-tests/report-generation.test.ts`
   - `testFullReport()`: Generate complete report
   - Input: Fixture tasks.md
   - Output: Validate report structure
   - **Coverage**: 85%

3. **Manual**: Run on increment 0007
   - Run: `/specweave:check-tests 0007`
   - Expected: Report shows this increment's tasks
   - Check: Identifies T-001 to T-024
   - **Coverage**: 100% (dogfooding)

**Overall Coverage Target**: 88%

**Implementation**:
1. Create `src/commands/check-tests.ts`
2. Implement parseTasksWithEmbeddedTests()
3. Implement calculateCoverage()
4. Implement identifyMissingTests()
5. Implement generateReport()
6. Write unit tests
7. Write integration test
8. Test manually on 0007

---

#### T-009: Add backward compatibility (old tests.md format)

**User Story**: US5
**Acceptance Criteria**: AC-US5-03
**Priority**: P2
**Estimate**: 1 hour
**Status**: [x] completed

**User Story**: [US5: Optional TDD Mode (P2)](../../docs/internal/specs/default/smart-increment-discipline/us-us5-*.md)

**AC**: AC-US5-01, AC-US5-02, AC-US5-03

**Test Plan**:
- **Given** increment with old format (tests.md exists)
- **When** /specweave:check-tests is run
- **Then** command detects old format
- **And** falls back to old parsing logic
- **And** report still works

**Test Cases**:
1. **Integration**: `tests/integration/check-tests/backward-compat.test.ts`
   - `testOldFormatDetection()`: Detects tests.md presence
   - `testOldFormatParsing()`: Parses TC-IDs from tests.md
   - **Coverage**: 80%

2. **Manual**: Run on increment 0002 (has tests.md)
   - Run: `/specweave:check-tests 0002`
   - Expected: Report works (uses old format parser)
   - **Coverage**: 100%

**Implementation**:
1. Add hasTestsMd() function
2. If tests.md exists, use old parser
3. If not, use new embedded parser
4. Test on 0002 (old format)
5. Test on 0007 (new format)

---

### Phase 1D: Update increment-planner (2 hours)

#### T-010: Update increment-planner to invoke test-aware-planner

**User Story**: US6
**Acceptance Criteria**: AC-US6-02 (invokes agent after Architect)
**Priority**: P1
**Estimate**: 1.5 hours
**Status**: [x] completed

**User Story**: [US5: Optional TDD Mode (P2)](../../docs/internal/specs/default/smart-increment-discipline/us-us5-*.md)

**AC**: AC-US5-01, AC-US5-02, AC-US5-03

**Test Plan**:
- **Given** increment-planner skill invoked
- **When** planning a new increment
- **Then** PM Agent runs (generates AC-IDs)
- **And** Architect Agent runs (generates plan.md)
- **And** test-aware-planner Agent runs (generates tasks.md with tests)
- **And** Validation runs (checks coverage)

**Test Cases**:
1. **Integration**: `tests/integration/increment-planner/full-workflow.test.ts`
   - `testFullPlanningWorkflow()`: All agents invoked in order
   - Input: User request "Add GitHub sync"
   - Output: spec.md, plan.md, tasks.md generated
   - **Coverage**: 85%

2. **Manual**: Create test increment 9998
   - Run: `/specweave:inc "9998-test-workflow"`
   - Check: spec.md has AC-IDs
   - Check: tasks.md has embedded tests
   - Check: Validation passed
   - **Coverage**: 100%

**Overall Coverage Target**: 90%

**Implementation**:
1. Open `plugins/specweave/skills/increment-planner/SKILL.md`
2. Find "STEP 3: Invoke Architect Agent"
3. Add "STEP 4: Invoke test-aware-planner Agent"
4. Add Task tool invocation with proper prompt
5. Add "STEP 5: Validate Test Coverage"
6. Test manually with 9998

---

#### T-011: Add validation step to increment-planner

**User Story**: US6
**Acceptance Criteria**: AC-US6-03 (validates coverage)
**Priority**: P1
**Estimate**: 0.5 hours
**Status**: [x] completed

**User Story**: [US6: Test Coverage Validation (P1)](../../docs/internal/specs/default/smart-increment-discipline/us-us6-*.md)

**AC**: AC-US6-01, AC-US6-02, AC-US6-03

**Test Plan**:
- **Given** tasks.md generated
- **When** validation step runs
- **Then** checks all tasks have test plans (or N/A)
- **And** blocks if critical tasks missing tests

**Test Cases**:
1. **Unit**: `tests/unit/increment-planner/validation.test.ts`
   - `testValidationPass()`: All tasks have tests
   - `testValidationFail()`: Some tasks missing tests
   - **Coverage**: 85%

**Implementation**:
1. Add validation logic after test-aware-planner
2. Check each task has "Test Plan:" section
3. Warn if coverage <80%
4. Error if critical tasks (P1) have no tests

---

### Phase 1E: Update PM Agent (AC-IDs) (1 hour)

#### T-012: Update PM Agent to generate AC-IDs

**User Story**: US1
**Acceptance Criteria**: AC-US1-01 (PM generates AC-IDs)
**Priority**: P1
**Estimate**: 1 hour
**Status**: [x] completed

**User Story**: [US6: Test Coverage Validation (P1)](../../docs/internal/specs/default/smart-increment-discipline/us-us6-*.md)

**AC**: AC-US6-01, AC-US6-02, AC-US6-03

**Test Plan**:
- **Given** PM Agent invoked
- **When** generating spec.md
- **Then** acceptance criteria have unique IDs (AC-US1-01, AC-US1-02)
- **And** format is consistent

**Test Cases**:
1. **Agent Test**: `plugins/specweave/agents/pm/test-cases/test-ac-ids.yaml`
   - Input: User request "Add authentication"
   - Expected Output: spec.md with AC-US1-01, AC-US1-02, etc.
   - **Coverage**: 90%

2. **Manual**: Create test increment 9997
   - Run: `/specweave:inc "9997-test-ac-ids"`
   - Check: spec.md has AC-US1-01 format
   - **Coverage**: 100%

**Implementation**:
1. Open `plugins/specweave/agents/pm/AGENT.md`
2. Find acceptance criteria generation section
3. Add instructions to format as AC-US{story}-{number}
4. Add example:
   ```
   - [ ] **AC-US1-01**: User can login
     - **Priority**: P1
     - **Testable**: Yes
   ```
5. Create test case YAML
6. Test manually

---

### Phase 1F: Documentation (1-2 hours)

#### T-013: Update CLAUDE.md with new format examples

**User Story**: US7
**Acceptance Criteria**: AC-US7-01 (CLAUDE.md updated)
**Priority**: P1
**Estimate**: 1.5 hours
**Status**: [x] completed

**User Story**: [US7: Enhanced increment-planner (P1)](../../docs/internal/specs/default/smart-increment-discipline/us-us7-*.md)

**AC**: AC-US7-01, AC-US7-02, AC-US7-03

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: Examples are clear and accurate
- Completeness: Covers embedded test format, AC-IDs, new commands
- Build check: No broken links or formatting errors

**Implementation**:
1. Open CLAUDE.md
2. Add section: "Task Format (v0.7.0+)"
3. Show example task with embedded tests
4. Add section: "AC-ID Format"
5. Document /specweave:check-tests command
6. Update increment structure (no tests.md)
7. Add examples from increment 0007
8. Proofread

---

## PART 2: SMART STATUS MANAGEMENT (8-12 hours)

### Phase 2A: Metadata Schema (2 hours)

#### T-014: Create increment metadata types

**User Story**: US8
**Acceptance Criteria**: AC-US8-01 (metadata.json schema)
**Priority**: P1
**Estimate**: 1 hour
**Status**: [x] completed

**User Story**: [US7: Enhanced increment-planner (P1)](../../docs/internal/specs/default/smart-increment-discipline/us-us7-*.md)

**AC**: AC-US7-01, AC-US7-02, AC-US7-03

**Test Plan**:
- **Given** TypeScript types defined
- **When** metadata.json is created
- **Then** schema matches interface
- **And** validation works

**Test Cases**:
1. **Unit**: `tests/unit/metadata/schema-validation.test.ts`
   - `testValidMetadata()`: Valid metadata passes validation
   - `testInvalidStatus()`: Invalid status enum rejected
   - `testInvalidType()`: Invalid type enum rejected
   - **Coverage**: 90%

2. **Integration**: `tests/integration/metadata/read-write.test.ts`
   - `testWriteMetadata()`: Write metadata.json
   - `testReadMetadata()`: Read and parse metadata.json
   - **Coverage**: 85%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create `src/core/types/increment-status.ts`
2. Define IncrementStatus enum (active, paused, blocked, completed, abandoned)
3. Define IncrementType enum (hotfix, feature, refactor, experiment, spike)
4. Define IncrementMetadata interface
5. Add JSON schema validation
6. Write unit tests
7. Write integration tests

---

#### T-015: Implement metadata read/write utilities

**User Story**: US8
**Acceptance Criteria**: AC-US8-01
**Priority**: P1
**Estimate**: 1 hour
**Status**: [x] completed

**User Story**: [US8: Pause Blocked Work (P2)](../../docs/internal/specs/default/smart-increment-discipline/us-us8-*.md)

**AC**: AC-US8-01, AC-US8-02, AC-US8-03

**Test Plan**:
- **Given** metadata utilities implemented
- **When** reading/writing metadata.json
- **Then** operations succeed without errors
- **And** file I/O is atomic (no partial writes)

**Test Cases**:
1. **Unit**: `tests/unit/metadata/utilities.test.ts`
   - `testReadMetadata()`: Read existing metadata.json
   - `testWriteMetadata()`: Write new metadata.json
   - `testMetadataNotFound()`: Handle missing file gracefully
   - **Coverage**: 90%

**Implementation**:
1. Create `src/core/metadata/index.ts`
2. Implement readMetadata(incrementId)
3. Implement writeMetadata(incrementId, data)
4. Implement updateMetadata(incrementId, partial)
5. Add error handling
6. Write tests

---

### Phase 2B: Status Commands (3-4 hours)

#### T-016: Implement /specweave:pause command

**User Story**: US8
**Acceptance Criteria**: AC-US8-01 (pause command)
**Priority**: P1
**Estimate**: 1 hour
**Status**: [x] completed

**User Story**: [US8: Pause Blocked Work (P2)](../../docs/internal/specs/default/smart-increment-discipline/us-us8-*.md)

**AC**: AC-US8-01, AC-US8-02, AC-US8-03

**Test Plan**:
- **Given** active increment
- **When** /specweave:pause is run with reason
- **Then** metadata.status = "paused"
- **And** pausedReason is saved
- **And** pausedAt timestamp is recorded

**Test Cases**:
1. **Unit**: `tests/unit/commands/pause.test.ts`
   - `testPauseActiveIncrement()`: Active � paused
   - `testPauseInvalidStatus()`: Error if already paused
   - `testPauseRequiresReason()`: Error if no reason
   - **Coverage**: 90%

2. **Integration**: `tests/integration/commands/pause-workflow.test.ts`
   - `testFullPauseFlow()`: Pause � verify metadata � verify status
   - **Coverage**: 85%

3. **Manual**: Test on increment 0007
   - Run: `/specweave:pause 0007 --reason="Testing pause"`
   - Check: metadata.json updated
   - Check: /specweave:status shows "Paused"
   - **Coverage**: 100%

**Overall Coverage Target**: 90%

**Implementation**:
1. Create `plugins/specweave/commands/pause.md`
2. Create `src/commands/pause.ts`
3. Implement pauseIncrement(id, reason)
4. Update metadata (status, pausedReason, pausedAt)
5. Write tests
6. Test manually

---

#### T-017: Implement /specweave:resume command

**User Story**: US8
**Acceptance Criteria**: AC-US8-03 (resume command)
**Priority**: P1
**Estimate**: 0.5 hours
**Status**: [x] completed

**User Story**: [US9: Abandon Obsolete Work (P2)](../../docs/internal/specs/default/smart-increment-discipline/us-us9-*.md)

**AC**: AC-US9-01, AC-US9-02, AC-US9-03

**Test Plan**:
- **Given** paused increment
- **When** /specweave:resume is run
- **Then** metadata.status = "active"
- **And** pausedReason/pausedAt are cleared
- **And** warning shown if paused >7 days

**Test Cases**:
1. **Unit**: `tests/unit/commands/resume.test.ts`
   - `testResumeIncrement()`: Paused � active
   - `testResumeStaleWarning()`: Warning if paused >7 days
   - **Coverage**: 85%

2. **Manual**: Resume 0007
   - Run: `/specweave:resume 0007`
   - Check: Status active
   - **Coverage**: 100%

**Implementation**:
1. Create `plugins/specweave/commands/resume.md`
2. Create `src/commands/resume.ts`
3. Calculate paused duration
4. Show warning if >7 days
5. Clear pausedReason/pausedAt
6. Write tests

---

#### T-018: Implement /specweave:abandon command

**User Story**: US9
**Acceptance Criteria**: AC-US9-01 (abandon command)
**Priority**: P1
**Estimate**: 1 hour
**Status**: [x] completed

**User Story**: [US9: Abandon Obsolete Work (P2)](../../docs/internal/specs/default/smart-increment-discipline/us-us9-*.md)

**AC**: AC-US9-01, AC-US9-02, AC-US9-03

**Test Plan**:
- **Given** active or paused increment
- **When** /specweave:abandon is run with reason
- **Then** metadata.status = "abandoned"
- **And** increment moved to _abandoned/ folder
- **And** reason is documented

**Test Cases**:
1. **Unit**: `tests/unit/commands/abandon.test.ts`
   - `testAbandonIncrement()`: Status � abandoned
   - `testAbandonMovesFolder()`: Folder moved to _abandoned/
   - **Coverage**: 90%

2. **Manual**: Abandon test increment 9999
   - Run: `/specweave:abandon 9999 --reason="Test complete"`
   - Check: Folder moved
   - **Coverage**: 100%

**Implementation**:
1. Create `plugins/specweave/commands/abandon.md`
2. Create `src/commands/abandon.ts`
3. Update metadata
4. Move folder to _abandoned/
5. Write tests

---

### Phase 2C: Type-Based Limits (2-3 hours)

#### T-019: Implement type-based limit logic

**User Story**: US10
**Acceptance Criteria**: AC-US10-03 (different limits per type)
**Priority**: P1
**Estimate**: 1.5 hours
**Status**: [x] completed

**User Story**: [US10: Increment Types (P2)](../../docs/internal/specs/default/smart-increment-discipline/us-us10-*.md)

**AC**: AC-US10-01, AC-US10-02, AC-US10-03

**Test Plan**:
- **Given** increment types defined
- **When** checking active count limits
- **Then** hotfix = unlimited
- **And** feature = max 2
- **And** refactor = max 1

**Test Cases**:
1. **Unit**: `tests/unit/increment/limits.test.ts`
   - `testHotfixUnlimited()`: Can create many hotfixes
   - `testFeatureLimit()`: Warning at 2 features
   - `testRefactorLimit()`: Warning at 1 refactor
   - **Coverage**: 90%

**Implementation**:
1. Create `src/core/increment/limits.ts`
2. Define TYPE_LIMITS map
3. Implement checkIncrementLimits(type)
4. Return warning if limit exceeded
5. Write tests

---

#### T-020: Update /specweave:inc with type-based warnings

**User Story**: US11
**Acceptance Criteria**: AC-US11-01 (context switching warning)
**Priority**: P1
**Estimate**: 1.5 hours
**Status**: [x] completed

**User Story**: [US10: Increment Types (P2)](../../docs/internal/specs/default/smart-increment-discipline/us-us10-*.md)

**AC**: AC-US10-01, AC-US10-02, AC-US10-03

**Test Plan**:
- **Given** user creates 2nd feature
- **When** /specweave:inc is run
- **Then** warning shows context switching cost (20-40%)
- **And** user sees options (Continue current, Pause current, Start parallel)
- **And** user choice is saved

**Test Cases**:
1. **Integration**: `tests/integration/inc/warnings.test.ts`
   - `testSecondFeatureWarning()`: Warning shown
   - `testHotfixNoWarning()`: Hotfix bypasses warning
   - **Coverage**: 85%

2. **Manual**: Create 2nd feature while 0007 active
   - Run: `/specweave:inc "9996-second-feature"`
   - Check: Warning displayed
   - Check: Options presented
   - **Coverage**: 100%

**Implementation**:
1. Update `plugins/specweave/commands/inc.md`
2. Update `src/commands/inc.ts`
3. Check active increment count by type
4. Show warning if limit reached
5. Provide interactive options
6. Test manually

---

### Phase 2D: Enhanced Status (1-2 hours)

#### T-021: Update /specweave:status command (rich output)

**User Story**: US12
**Acceptance Criteria**: AC-US12-02 (status shows types, warnings)
**Priority**: P1
**Estimate**: 1.5 hours
**Status**: [x] completed

**User Story**: [US11: Context Switching Warning (P2)](../../docs/internal/specs/default/smart-increment-discipline/us-us11-*.md)

**AC**: AC-US11-01, AC-US11-02, AC-US11-03

**Test Plan**:
- **Given** increments with different statuses/types
- **When** /specweave:status is run
- **Then** shows active, paused, completed sections
- **And** shows types (hotfix, feature, etc.)
- **And** shows warnings (stale, context switching)

**Test Cases**:
1. **Integration**: `tests/integration/status/rich-output.test.ts`
   - `testStatusOutput()`: Verify output format
   - **Coverage**: 85%

2. **Manual**: Run status
   - Run: `/specweave:status`
   - Check: Shows all increments grouped by status
   - Check: Warnings displayed
   - **Coverage**: 100%

**Implementation**:
1. Update `plugins/specweave/commands/status.md`
2. Update `src/commands/status.ts`
3. Group by status (active, paused, completed)
4. Show type and age
5. Calculate warnings (stale, context switching)
6. Format output nicely

---

### Phase 2E: Migration (1 hour)

#### T-022: Create auto-migration script

**User Story**: US8
**Acceptance Criteria**: AC-US8-01
**Priority**: P2
**Estimate**: 1 hour
**Status**: [x] completed

**User Story**: [US11: Context Switching Warning (P2)](../../docs/internal/specs/default/smart-increment-discipline/us-us11-*.md)

**AC**: AC-US11-01, AC-US11-02, AC-US11-03

**Test Plan**:
- **Given** old increments without metadata.json
- **When** first v0.7.0 command runs
- **Then** auto-migration creates metadata.json for all increments
- **And** default values are set (status=completed/active, type=feature)

**Test Cases**:
1. **Integration**: `tests/integration/migration/auto-migrate.test.ts`
   - `testMigration()`: Old increments get metadata.json
   - **Coverage**: 85%

**Implementation**:
1. Create `src/core/migration/migrate-070.ts`
2. Scan all increments
3. Create metadata.json if missing
4. Set defaults
5. Test on copy of repo

---

## PART 3: TESTING & VALIDATION (2-3 hours)

#### T-023: End-to-end testing

**User Story**: All
**Acceptance Criteria**: All
**Priority**: P1
**Estimate**: 2 hours
**Status**: [x] completed

**User Story**: [US12: Hotfix Bypasses Limits (P2)](../../docs/internal/specs/default/smart-increment-discipline/us-us12-*.md)

**AC**: AC-US12-01, AC-US12-02, AC-US12-03

**Test Plan**:
- **Given** all features implemented
- **When** running full increment lifecycle
- **Then** everything works together
- **And** no regressions

**Test Cases**:
1. **E2E**: `tests/e2e/increment-lifecycle-v070.spec.ts`
   - Create increment with new format
   - Check tasks.md has embedded tests
   - Run /specweave:check-tests
   - Pause increment
   - Resume increment
   - Complete increment
   - **Coverage**: 100% (critical path)

2. **Manual**: Dogfood on real feature
   - Create increment 0008 using v0.7.0
   - Use all new commands
   - Validate experience
   - **Coverage**: 100%

**Implementation**:
1. Write E2E test script
2. Run full workflow manually
3. Fix any bugs found
4. Validate all features work

---

#### T-024: Update CHANGELOG.md for v0.7.0

**User Story**: US7
**Acceptance Criteria**: AC-US7-01
**Priority**: P1
**Estimate**: 0.5 hours
**Status**: [x] completed

**User Story**: [US12: Hotfix Bypasses Limits (P2)](../../docs/internal/specs/default/smart-increment-discipline/us-us12-*.md)

**AC**: AC-US12-01, AC-US12-02, AC-US12-03

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: Complete, accurate
- Format: Follows keep-a-changelog.com

**Implementation**:
1. Open CHANGELOG.md
2. Add v0.7.0 section
3. List all changes (Added, Changed, Fixed)
4. Note breaking changes (tests.md eliminated)
5. Add migration guide

---

## Summary

**Total Tasks**: 24
**Part 1** (Test-Aware): 13 tasks
**Part 2** (Status Mgmt): 9 tasks
**Part 3** (Testing/Docs): 2 tasks

**Timeline**: 20-28 hours (aggressive!)
**Delivery**: v0.7.0 (single release)
**Coverage Target**: 80-90% (realistic)

**This is the FIRST increment using embedded test format - dogfooding FTW!**
