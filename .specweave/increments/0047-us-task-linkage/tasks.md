---
total_tasks: 52
completed: 26
by_user_story:
  US-001: 4
  US-002: 3
  US-003: 5
  US-004: 3
  US-005: 4
  US-006: 5
  US-007: 6
  US-008: 4
  US-009: 3
  US-009A: 6
  US-010: 2
  US-011: 4
  US-012: 3
  US-013: 3
test_mode: test-after
coverage_target: 90
---

# Tasks: US-Task Linkage Architecture

**NOTE**: This tasks.md uses the EXACT hierarchical format we're implementing in this increment! This is "dog fooding" - implementing the feature using the feature itself.

---

## User Story: US-001 - Explicit US-Task Linkage in tasks.md

**Linked ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04
**Tasks**: 4 total, 3 completed

### T-001: Create task parser with US linkage extraction

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-03
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 6 hours

**Description**: Create `src/generators/spec/task-parser.ts` to parse tasks.md and extract `userStory` and `satisfiesACs` fields from each task.

**Implementation Steps**:
1. Create `src/generators/spec/task-parser.ts`
2. Define `Task` interface with new fields (userStory?, satisfiesACs?)
3. Implement `parseTasksWithUSLinks()` function:
   - Read tasks.md content
   - Split into task sections (### T-XXX: Title)
   - Extract **User Story**: field using regex
   - Extract **Satisfies ACs**: field using regex
   - Parse AC list (comma-separated)
4. Implement `validateTaskLinkage()` function:
   - Validate US-ID format (US-\d{3})
   - Validate AC-ID format (AC-US\d+-\d{2})
   - Cross-reference with spec.md (check US/AC exists)
5. Handle backward compatibility (tasks without userStory field)

**Test Plan**:
- **File**: `tests/unit/generators/task-parser.test.ts`
- **Tests**:
  - **TC-001**: Parse userStory field
    - Given task with `**User Story**: US-001`
    - When parseTasksWithUSLinks() called
    - Then task.userStory = "US-001"
  - **TC-002**: Parse satisfiesACs field
    - Given task with `**Satisfies ACs**: AC-US1-01, AC-US1-02`
    - When parseTasksWithUSLinks() called
    - Then task.satisfiesACs = ["AC-US1-01", "AC-US1-02"]
  - **TC-003**: Group tasks by User Story
    - Given 5 tasks (3 for US-001, 2 for US-002)
    - When parseTasksWithUSLinks() called
    - Then returns map: {"US-001": [t1, t2, t3], "US-002": [t4, t5]}
  - **TC-004**: Handle tasks without US linkage (backward compat)
    - Given old-format task (no **User Story** field)
    - When parseTasksWithUSLinks() called
    - Then parse succeeds, task.userStory = undefined
  - **TC-005**: Validate invalid US-ID
    - Given task with userStory = "US-999"
    - When validateTaskLinkage() called with validUSIds = ["US-001", "US-002"]
    - Then returns error: "Invalid US-ID: US-999"
- **Coverage Target**: 95%+

**Files Affected**:
- `src/generators/spec/task-parser.ts` (new)
- `tests/unit/generators/task-parser.test.ts` (new)

---

### T-002: Add task linkage validation function

**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed
**Priority**: P1 (Important)
**Estimated Effort**: 3 hours

**Description**: Extend task parser with validation to detect invalid US and AC references.

**Implementation Steps**:
1. Add `validateTaskLinkage()` function to task-parser.ts
2. Implement US-ID validation (must exist in spec.md)
3. Implement AC-ID validation (must exist in spec.md)
4. Return array of validation errors
5. Add unit tests for validation logic

**Test Plan**:
- **File**: `tests/unit/generators/task-parser.test.ts` (extend)
- **Tests**:
  - **TC-006**: Detect non-existent US reference
  - **TC-007**: Detect non-existent AC reference
  - **TC-008**: Detect malformed US-ID format
  - **TC-009**: Detect malformed AC-ID format
- **Coverage Target**: 90%+

**Files Affected**:
- `src/generators/spec/task-parser.ts` (modify)
- `tests/unit/generators/task-parser.test.ts` (extend)

**Dependencies**: T-001

---

### T-003: Update tasks.md template with hierarchical structure

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 4 hours

**Description**: Update `tasks.md.mustache` template to generate hierarchical structure grouping tasks by User Story.

**Implementation Steps**:
1. Update `plugins/specweave/skills/spec-generator/templates/tasks.md.mustache`
2. Add frontmatter section: `by_user_story` map
3. Add hierarchical sections:
   ```mustache
   ## User Story: {{id}} - {{title}}
   **Linked ACs**: {{acIds}}
   **Tasks**: {{taskCount}} total, {{completedCount}} completed
   ```
4. Update task template with mandatory fields:
   ```mustache
   **User Story**: {{userStoryId}}
   **Satisfies ACs**: {{acList}}
   ```
5. Update generator logic to populate new fields

**Test Plan**:
- **File**: `tests/integration/generators/spec-generator.test.ts`
- **Tests**:
  - **TC-010**: Generate tasks.md with hierarchical structure
    - Given spec.md with 3 user stories
    - When spec-generator invoked
    - Then tasks.md has 3 sections (## User Story: US-001...)
  - **TC-011**: Populate userStory field in generated tasks
    - Given US-001 with 5 tasks
    - When tasks generated
    - Then all 5 tasks have **User Story**: US-001
  - **TC-012**: Populate satisfiesACs field based on spec AC-IDs
    - Given US-001 with AC-US1-01, AC-US1-02
    - When tasks generated
    - Then tasks reference correct AC-IDs
- **Coverage Target**: 85%+

**Files Affected**:
- `plugins/specweave/skills/spec-generator/templates/tasks.md.mustache` (modify)
- `tests/integration/generators/spec-generator.test.ts` (new)

**Dependencies**: T-001

---

### T-004: Update PM agent prompt to require US linkage

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**Priority**: P1 (Important)
**Estimated Effort**: 2 hours

**Description**: Update PM agent prompts and instructions to require User Story linkage in generated tasks.

**Implementation Steps**:
1. Update increment-planner skill documentation
2. Add requirement: "All tasks MUST include **User Story** field"
3. Add requirement: "All tasks MUST include **Satisfies ACs** field"
4. Add examples showing new format
5. Update validation to check for required fields

**Validation**:
- Manual review: Create new increment, verify tasks.md has US linkage
- No test file needed (documentation update)

**Files Affected**:
- `plugins/specweave/skills/increment-planner/SKILL.md` (modify)
- `plugins/specweave/agents/test-aware-planner/AGENT.md` (modify)

**Dependencies**: None

---

## User Story: US-002 - AC-Task Mapping

**Linked ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04
**Tasks**: 3 total, 0 completed

### T-005: Add satisfiesACs field parsing

**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 3 hours

**Description**: Extend task parser to extract and validate `satisfiesACs` field from tasks.

**Implementation Steps**:
1. Add satisfiesACsRegex to task parser
2. Parse comma-separated AC-ID list
3. Validate AC-ID format (AC-US\d+-\d{2})
4. Store in task.satisfiesACs array
5. Add unit tests

**Test Plan**:
- **File**: `tests/unit/generators/task-parser.test.ts` (extend)
- **Tests**:
  - **TC-013**: Parse single AC-ID
  - **TC-014**: Parse multiple AC-IDs (comma-separated)
  - **TC-015**: Handle tasks with no satisfiesACs field
  - **TC-016**: Validate AC-ID format
- **Coverage Target**: 95%+

**Files Affected**:
- `src/generators/spec/task-parser.ts` (modify)
- `tests/unit/generators/task-parser.test.ts` (extend)

**Dependencies**: T-001

---

### T-006: Implement AC-ID cross-reference validation

**User Story**: US-002
**Satisfies ACs**: AC-US2-02
**Status**: [x] completed
**Priority**: P1 (Important)
**Estimated Effort**: 4 hours

**Description**: Validate that AC-IDs in tasks exist in spec.md and belong to correct User Story.

**Implementation Steps**:
1. Create spec parser to extract all AC-IDs from spec.md
2. Create validation function: validateACReferences()
3. Check each task.satisfiesACs against valid AC list
4. Verify AC-IDs match task.userStory (AC-US1-XX belongs to US-001)
5. Report mismatches

**Test Plan**:
- **File**: `tests/unit/validators/ac-reference-validator.test.ts` (new)
- **Tests**:
  - **TC-017**: Detect AC-ID from wrong User Story
    - Given task with userStory=US-001, satisfiesACs=[AC-US2-01]
    - When validated
    - Then error: "AC-US2-01 belongs to US-002, not US-001"
  - **TC-018**: Detect non-existent AC-ID
  - **TC-019**: Allow shared AC coverage (multiple tasks → same AC)
- **Coverage Target**: 90%+

**Files Affected**:
- `src/generators/spec/spec-parser.ts` (create or modify)
- `src/validators/ac-reference-validator.ts` (new)
- `tests/unit/validators/ac-reference-validator.test.ts` (new)

**Dependencies**: T-005

---

### T-007: Implement orphan task detection

**User Story**: US-002
**Satisfies ACs**: AC-US2-04
**Status**: [x] completed
**Priority**: P1 (Important)
**Estimated Effort**: 3 hours

**Description**: Detect tasks with missing or empty `satisfiesACs` field.

**Implementation Steps**:
1. Create detectOrphanTasks() function
2. Scan all tasks for missing satisfiesACs field
3. Report task IDs with no AC coverage
4. Add to validation report

**Test Plan**:
- **File**: `tests/unit/validators/orphan-detector.test.ts` (new)
- **Tests**:
  - **TC-020**: Detect task with no satisfiesACs field
  - **TC-021**: Detect task with empty satisfiesACs array
  - **TC-022**: Allow documentation/config tasks (non-testable)
- **Coverage Target**: 90%+

**Files Affected**:
- `src/validators/orphan-detector.ts` (new)
- `tests/unit/validators/orphan-detector.test.ts` (new)

**Dependencies**: T-005

---

## User Story: US-003 - Automatic Living Docs Sync

**Linked ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05
**Tasks**: 5 total, 3 completed

### T-008: Update sync-living-docs.js to use userStory field

**User Story**: US-003
**Satisfies ACs**: AC-US3-04
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 6 hours

**Description**: Enhance living docs sync hook to use task userStory field for grouping tasks by User Story.

**Implementation Steps**:
1. Update `plugins/specweave/lib/hooks/sync-living-docs.js`
2. Import parseTasksWithUSLinks() from task-parser
3. Group tasks by userStory field
4. For each User Story, update its living docs file
5. Generate task list with proper links
6. Replace "No tasks defined" placeholder

**Test Plan**:
- **File**: `tests/integration/hooks/sync-living-docs.test.ts` (new)
- **Tests**:
  - **TC-023**: Sync tasks to living docs US file
    - Given 3 tasks for US-001 (2 completed, 1 pending)
    - When sync-living-docs.js executed
    - Then US-001 living docs shows task list with checkboxes
  - **TC-024**: Remove "No tasks defined" message
    - Given living docs US file with "_No tasks defined_"
    - When sync executed
    - Then message replaced with actual task list
  - **TC-025**: Generate correct task links
    - Given task T-001 in increment 0047
    - When synced
    - Then link: `[T-001](../../../../increments/0047-us-task-linkage/tasks.md#T-001)`
- **Coverage Target**: 85%+

**Files Affected**:
- `plugins/specweave/lib/hooks/sync-living-docs.js` (modify)
- `tests/integration/hooks/sync-living-docs.test.ts` (new)

**Dependencies**: T-001

---

### T-009: Implement AC checkbox sync based on satisfiesACs

**User Story**: US-003
**Satisfies ACs**: AC-US3-03
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 5 hours

**Description**: Update AC checkboxes in living docs based on task completion and satisfiesACs field.

**Implementation Steps**:
1. Add updateACCheckboxes() function to sync-living-docs.js
2. Collect all AC-IDs from completed tasks
3. Update living docs AC checkboxes:
   - `- [ ] **AC-US1-01**` → `- [x] **AC-US1-01**` (if task completed)
4. Handle partial coverage (some tasks complete, some pending)
5. Add integration tests

**Test Plan**:
- **File**: `tests/integration/hooks/sync-living-docs.test.ts` (extend)
- **Tests**:
  - **TC-026**: Check AC when all tasks completed
    - Given AC-US1-01 satisfied by T-001, T-002
    - When both tasks completed
    - Then AC checkbox checked: `- [x] **AC-US1-01**`
  - **TC-027**: Leave AC unchecked when tasks pending
    - Given AC-US1-02 satisfied by T-003 (pending)
    - When sync executed
    - Then AC checkbox unchecked: `- [ ] **AC-US1-02**`
  - **TC-028**: Handle partial coverage
    - Given AC-US1-03 satisfied by T-004 (completed), T-005 (pending)
    - When sync executed
    - Then AC remains unchecked (not all tasks complete)
- **Coverage Target**: 90%+

**Files Affected**:
- `plugins/specweave/lib/hooks/sync-living-docs.js` (modify)
- `tests/integration/hooks/sync-living-docs.test.ts` (extend)

**Dependencies**: T-008

---

### T-010: Update post-task-completion hook to pass feature ID

**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 3 hours

**Description**: Modify post-task-completion.sh hook to extract and pass feature ID (epic field from spec.md) to sync hook.

**Implementation Steps**:
1. Update `plugins/specweave/hooks/post-task-completion.sh`
2. Extract epic field from spec.md frontmatter (e.g., FS-047)
3. Extract project ID from metadata.json or config
4. Pass parameters to sync-living-docs.js:
   - INCREMENT_PATH
   - PROJECT_ID
   - FEATURE_ID
5. Add error handling for missing fields

**Test Plan**:
- **File**: `tests/integration/hooks/post-task-completion.test.ts` (new)
- **Tests**:
  - **TC-029**: Extract feature ID from spec.md
    - Given spec.md with `epic: FS-047`
    - When hook executed
    - Then FEATURE_ID=FS-047 passed to sync
  - **TC-030**: Handle missing epic field
    - Given spec.md with no epic field
    - When hook executed
    - Then warning logged, sync skipped
- **Coverage Target**: 80%+

**Files Affected**:
- `plugins/specweave/hooks/post-task-completion.sh` (modify)
- `tests/integration/hooks/post-task-completion.test.ts` (new)

**Dependencies**: T-008

---

### T-011: Validate sync direction is one-way (Increment → Living Docs)

**User Story**: US-003
**Satisfies ACs**: AC-US3-05
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 2 hours

**Description**: Validate that Increment → Living Docs sync is ALWAYS one-way (external tools cannot write back to active increments). This task replaced the original two-way sync implementation after architectural correction (see SYNC-DIRECTION-ARCHITECTURE-ANALYSIS.md).

**ARCHITECTURAL CORRECTION**:
- **Original task**: "Implement two-way sync (tasks.md ↔ living docs)"
- **Corrected requirement (AC-US3-05)**: "Increment → Living Docs sync is ALWAYS one-way (external tools cannot write back to active increments)"
- **Reason**: Increment is source of truth during active work, living docs is archival

**Implementation Steps**:
1. Review existing sync hooks (post-task-completion.sh, sync-living-docs.js)
2. Verify sync direction is ONE-WAY ONLY (Increment → Living Docs)
3. Add validation tests to ensure no reverse sync (Living Docs → Increment)
4. Document sync architecture in ADR

**Validation Results**:
✅ post-task-completion.sh: One-way sync (Increment → Living Docs)
✅ sync-living-docs.js: One-way sync (writes to living docs, never reads back)
✅ No reverse sync mechanism exists
✅ Architecture documented in SYNC-DIRECTION-ARCHITECTURE-ANALYSIS.md

**Test Plan**:
- **File**: `tests/integration/sync/sync-direction-validation.test.ts` (new)
- **Tests**:
  - **TC-031**: Verify increment → living docs sync (one-way)
    - Given task completed in increment
    - When hook executed
    - Then living docs updated, increment unchanged
  - **TC-032**: Prevent living docs → increment sync
    - Given living docs AC checkbox manually checked
    - When sync attempted
    - Then error thrown: "Reverse sync forbidden"
- **Coverage Target**: 95%+

**Files Validated**:
- `plugins/specweave/hooks/post-task-completion.sh` ✓ (one-way)
- `plugins/specweave/lib/hooks/sync-living-docs.js` ✓ (one-way)
- `src/core/spec-frontmatter-updater.ts` ✓ (increment writes only)

**Dependencies**: T-008, T-010

---

### T-012: Add sync performance optimization

**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Status**: [x] completed
**Priority**: P2 (Nice-to-have)
**Estimated Effort**: 4 hours

**Description**: Optimize living docs sync to meet < 500ms target for 50 user stories.

**Implementation Steps**:
1. Add caching layer (cache parsed tasks.md)
2. Implement incremental sync (only changed tasks)
3. Batch file updates (reduce I/O)
4. Add performance benchmarks
5. Measure 95th percentile latency

**Test Plan**:
- **File**: `tests/performance/sync-performance.test.ts` (new)
- **Tests**:
  - **TC-033**: Benchmark sync time for 50 user stories
    - Given increment with 50 user stories, 200 tasks
    - When sync executed 100 times
    - Then 95th percentile < 500ms
  - **TC-034**: Verify caching reduces parse time
    - Given cached tasks.md
    - When second sync executed
    - Then parse time < 10ms (vs 100ms uncached)
- **Coverage Target**: N/A (performance test)

**Files Affected**:
- `plugins/specweave/lib/hooks/sync-living-docs.js` (modify)
- `tests/performance/sync-performance.test.ts` (new)

**Dependencies**: T-008, T-009

---

## User Story: US-004 - AC Coverage Validation

**Linked ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04
**Tasks**: 3 total, 3 completed

### T-013: Create AC coverage validator

**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-04
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 6 hours

**Description**: Implement comprehensive AC coverage validator to detect uncovered ACs and orphan tasks.

**Implementation Steps**:
1. Create `src/validators/ac-coverage-validator.ts`
2. Implement validateACCoverage() function:
   - Parse spec.md to extract all AC-IDs
   - Parse tasks.md to extract task-AC mappings
   - Build bidirectional maps (AC → Tasks, Task → ACs)
   - Detect uncovered ACs (AC-IDs with no tasks)
   - Detect orphan tasks (tasks with no satisfiesACs)
   - Calculate coverage percentage
3. Implement printCoverageReport() function
4. Add unit tests

**Test Plan**:
- **File**: `tests/unit/validators/ac-coverage-validator.test.ts` (new)
- **Tests**:
  - **TC-035**: Detect uncovered ACs
    - Given spec.md with 15 ACs, tasks.md with 13 covered
    - When validateACCoverage() called
    - Then uncoveredACs = [AC-US2-05, AC-US3-04]
  - **TC-036**: Detect orphan tasks
    - Given tasks T-015, T-020 with no satisfiesACs
    - When validateACCoverage() called
    - Then orphanTasks = [T-015, T-020]
  - **TC-037**: Calculate coverage percentage
    - Given 13/15 ACs covered
    - When validateACCoverage() called
    - Then coveragePercentage = 87
  - **TC-038**: Build AC-to-tasks traceability map
    - Given AC-US1-01 satisfied by T-001, T-002
    - When validateACCoverage() called
    - Then acToTasksMap.get("AC-US1-01") = ["T-001", "T-002"]
- **Coverage Target**: 95%+

**Files Affected**:
- `src/validators/ac-coverage-validator.ts` (new)
- `tests/unit/validators/ac-coverage-validator.test.ts` (new)

**Dependencies**: T-001, T-005

---

### T-014: Integrate AC coverage into /specweave:validate

**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 4 hours

**Description**: Update `/specweave:validate` command to run AC coverage validation and report results.

**Implementation Steps**:
1. Update `plugins/specweave/commands/specweave-validate.md`
2. Import validateACCoverage from ac-coverage-validator
3. Run validation after existing checks
4. Print coverage report
5. Fail validation if coverage < configurable threshold (default 80%)
6. Add command integration tests

**Test Plan**:
- **File**: `tests/integration/commands/validate-ac-coverage.test.ts` (new)
- **Tests**:
  - **TC-039**: Validate command reports AC coverage
    - Given increment 0047 with 87% coverage
    - When `specweave validate 0047` executed
    - Then output shows "AC Coverage: 13/15 (87%)"
  - **TC-040**: Validation fails if coverage below threshold
    - Given increment with 70% coverage, threshold 80%
    - When `specweave validate` executed
    - Then exit code 1, error message shown
  - **TC-041**: Validation passes if coverage meets threshold
    - Given increment with 90% coverage, threshold 80%
    - When `specweave validate` executed
    - Then exit code 0, success message shown
- **Coverage Target**: 90%+

**Files Affected**:
- `plugins/specweave/commands/specweave-validate.md` (modify)
- `src/cli/commands/validate.ts` (modify)
- `tests/integration/commands/validate-ac-coverage.test.ts` (new)

**Dependencies**: T-013

---

### T-015: Add closure validation to /specweave:done

**User Story**: US-004
**Satisfies ACs**: AC-US4-03
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 5 hours

**Description**: Update `/specweave:done` to validate AC coverage and US-Task linkage before allowing increment closure.

**Implementation Steps**:
1. Update `plugins/specweave/commands/specweave-done.md`
2. Add pre-closure validation step
3. Run validateACCoverage() before closure
4. Block closure if:
   - Orphan tasks exist (no satisfiesACs)
   - Uncovered ACs exist (no implementing tasks)
   - Tasks have invalid US/AC references
5. Allow override with --force flag (log warning)
6. Add validation to closure report

**Test Plan**:
- **File**: `tests/integration/commands/done-validation.test.ts` (new)
- **Tests**:
  - **TC-042**: Block closure with orphan tasks
    - Given increment with orphan tasks
    - When `specweave done 0047` executed (no --force)
    - Then exit code 1, error: "Orphan tasks detected"
  - **TC-043**: Block closure with uncovered ACs
    - Given increment with 2 uncovered ACs
    - When `specweave done` executed
    - Then exit code 1, error listing uncovered ACs
  - **TC-044**: Allow closure with --force flag
    - Given increment with validation errors
    - When `specweave done 0047 --force` executed
    - Then closure succeeds, warning logged
  - **TC-045**: Include coverage in closure report
    - Given successful closure
    - When closure report generated
    - Then report shows "AC Coverage: 15/15 (100%)"
- **Coverage Target**: 90%+

**Files Affected**:
- `plugins/specweave/commands/specweave-done.md` (modify)
- `src/cli/commands/done.ts` (modify)
- `tests/integration/commands/done-validation.test.ts` (new)

**Dependencies**: T-013

---

## User Story: US-005 - Progress Tracking by User Story

**Linked ACs**: AC-US5-01, AC-US5-02, AC-US5-03
**Tasks**: 4 total, 0 completed

### T-016: Implement per-US task completion tracking

**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02
**Status**: [x] completed
**Priority**: P1 (Important)
**Estimated Effort**: 5 hours

**Description**: Create function to calculate task completion statistics grouped by User Story.

**Implementation Steps**:
1. Create `src/progress/us-progress-tracker.ts`
2. Implement calculateUSProgress() function:
   - Parse tasks.md with parseTasksWithUSLinks()
   - Group by userStory field
   - Count completed vs total tasks per US
   - Calculate percentage per US
3. Format output: `US-001: [8/11 tasks completed] 73%`
4. Add unit tests

**Test Plan**:
- **File**: `tests/unit/progress/us-progress-tracker.test.ts` (new)
- **Tests**:
  - **TC-046**: Calculate US completion percentage
    - Given US-001 with 11 tasks (8 completed)
    - When calculateUSProgress() called
    - Then US-001: 73% complete
  - **TC-047**: Handle US with no tasks
    - Given US-003 with 0 tasks
    - When calculateUSProgress() called
    - Then US-003: 0% (no tasks assigned)
  - **TC-048**: Aggregate overall progress
    - Given 3 USs (73%, 100%, 50%)
    - When aggregateProgress() called
    - Then overall: 74% (22/30 tasks)
- **Coverage Target**: 95%+

**Files Affected**:
- `src/progress/us-progress-tracker.ts` (new)
- `tests/unit/progress/us-progress-tracker.test.ts` (new)

**Dependencies**: T-001

---

### T-017: Update /specweave:progress command with US grouping

**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02
**Status**: [x] completed
**Priority**: P1 (Important)
**Estimated Effort**: 4 hours

**Description**: Enhance `/specweave:progress` command to display task completion grouped by User Story.

**Implementation Steps**:
1. Update `plugins/specweave/commands/specweave-progress.md`
2. Import calculateUSProgress()
3. Display progress grouped by US:
   ```
   Increment 0047: US-Task Linkage
   ├─ US-001: [8/11 tasks completed] ████████░░░ 73%
   ├─ US-002: [3/3 tasks completed] ████ 100%
   └─ US-003: [2/4 tasks completed] ██░░ 50%

   Overall: 13/18 tasks (72%)
   ```
4. Add color coding (green > 80%, yellow 50-80%, red < 50%)
5. Add command integration tests

**Test Plan**:
- **File**: `tests/integration/commands/progress-display.test.ts` (new)
- **Tests**:
  - **TC-049**: Display per-US progress
    - Given increment with 3 USs
    - When `specweave progress 0047` executed
    - Then output shows 3 lines (one per US) with percentages
  - **TC-050**: Show overall progress summary
    - Given 18 total tasks (13 completed)
    - When `specweave progress` executed
    - Then output shows "Overall: 13/18 tasks (72%)"
  - **TC-051**: Color code progress bars
    - Given US-001 at 73% (yellow), US-002 at 100% (green)
    - When output displayed
    - Then US-001 in yellow, US-002 in green
- **Coverage Target**: 85%+

**Files Affected**:
- `plugins/specweave/commands/specweave-progress.md` (modify)
- `src/cli/commands/progress.ts` (modify)
- `tests/integration/commands/progress-display.test.ts` (new)

**Dependencies**: T-016

---

### T-018: Add by_user_story frontmatter to tasks.md

**User Story**: US-005
**Satisfies ACs**: AC-US5-03
**Status**: [x] completed
**Priority**: P2 (Nice-to-have)
**Estimated Effort**: 3 hours

**Description**: Update tasks.md frontmatter to include task counts per User Story for quick reference.

**Implementation Steps**:
1. Update tasks.md.mustache template
2. Add frontmatter section:
   ```yaml
   by_user_story:
     US-001: 11
     US-002: 3
     US-003: 4
   ```
3. Update generator to populate this map
4. Add tests

**Test Plan**:
- **File**: `tests/integration/generators/frontmatter-generation.test.ts` (new)
- **Tests**:
  - **TC-052**: Generate by_user_story map
    - Given spec with 3 USs (11, 3, 4 tasks)
    - When tasks.md generated
    - Then frontmatter shows correct counts
  - **TC-053**: Update map when tasks added
    - Given existing tasks.md, 2 tasks added to US-001
    - When regenerated
    - Then US-001 count incremented by 2
- **Coverage Target**: 80%+

**Files Affected**:
- `plugins/specweave/skills/spec-generator/templates/tasks.md.mustache` (modify)
- `tests/integration/generators/frontmatter-generation.test.ts` (new)

**Dependencies**: T-003

---

### T-019: Create progress visualization script

**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02
**Status**: [x] completed
**Priority**: P3 (Nice-to-have)
**Estimated Effort**: 4 hours

**Description**: Create standalone script to generate progress visualization (Mermaid Gantt chart or similar).

**Implementation Steps**:
1. Create `scripts/generate-us-progress-chart.ts`
2. Read tasks.md and calculate US progress
3. Generate Mermaid Gantt chart:
   ```mermaid
   gantt
     title US Progress
     US-001 (73%) :done, 73
     US-002 (100%) :done, 100
     US-003 (50%) :active, 50
   ```
4. Write to reports/ directory
5. Optional: Generate SVG image

**Validation**:
- Manual testing (no automated tests needed)

**Files Affected**:
- `scripts/generate-us-progress-chart.ts` (new)

**Dependencies**: T-016

---

## User Story: US-006 - Migration Tooling

**Linked ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04
**Tasks**: 3 total, 0 completed

### T-020: Create migration script with inference algorithm

**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02
**Status**: [x] completed
**Priority**: P1 (Important)
**Estimated Effort**: 8 hours

**Description**: Create migration tool to automatically add US linkage to existing increments using inference algorithm.

**Implementation Steps**:
1. Create `scripts/migrate-task-linkage.ts`
2. Implement inferUSLinkage() function:
   - Parse spec.md to extract User Stories and AC-IDs
   - Parse tasks.md to get tasks
   - Infer User Story from:
     a. AC-IDs mentioned in task description (highest confidence)
     b. Keywords matching US title (medium confidence)
     c. File paths matching US scope (lower confidence)
   - Calculate confidence score (0-100)
3. Implement suggestLinkage() function:
   - Show suggested linkage with confidence scores
   - Allow manual override for low-confidence suggestions
4. Add unit tests for inference algorithm

**Test Plan**:
- **File**: `tests/unit/scripts/migrate-task-linkage.test.ts` (new)
- **Tests**:
  - **TC-054**: Infer US from AC-IDs in description
    - Given task description: "Implement AC-US1-01 and AC-US1-02"
    - When inferUSLinkage() called
    - Then userStory = "US-001", confidence = 95
  - **TC-055**: Infer US from title keyword matching
    - Given US-002 title: "AC-Task Mapping", task title: "Add AC mapping"
    - When inferUSLinkage() called
    - Then userStory = "US-002", confidence = 75
  - **TC-056**: Infer US from file paths
    - Given US-003 affects sync-living-docs.js, task affects same file
    - When inferUSLinkage() called
    - Then userStory = "US-003", confidence = 60
  - **TC-057**: Mark low-confidence as needs review
    - Given task with confidence < 50
    - When suggestions generated
    - Then flagged for manual review
- **Coverage Target**: 90%+

**Files Affected**:
- `scripts/migrate-task-linkage.ts` (new)
- `tests/unit/scripts/migrate-task-linkage.test.ts` (new)

**Dependencies**: T-001, T-005

---

### T-021: Add dry-run mode and interactive confirmation

**User Story**: US-006
**Satisfies ACs**: AC-US6-03
**Status**: [x] completed
**Priority**: P1 (Important)
**Estimated Effort**: 4 hours

**Description**: Add dry-run mode to migration script showing changes before applying.

**Implementation Steps**:
1. Add --dry-run flag to migrate-task-linkage.ts
2. Print suggested changes without modifying files:
   ```
   Suggested linkage for 0046-console-elimination:
     T-001 → US-001 (AC-US1-01, AC-US1-02) [Confidence: 95%]
     T-002 → US-001 (AC-US1-01, AC-US1-02) [Confidence: 90%]
     T-012 → US-002 (AC-US2-01, AC-US2-02, AC-US2-03) [Confidence: 85%]
     ...

   Apply changes? [y/N]
   ```
3. Add interactive prompts for low-confidence suggestions
4. Allow manual override of suggestions

**Test Plan**:
- **File**: `tests/integration/scripts/migrate-dry-run.test.ts` (new)
- **Tests**:
  - **TC-058**: Dry-run shows changes without applying
    - Given increment 0046 with 25 tasks
    - When `migrate-task-linkage.ts 0046 --dry-run` executed
    - Then suggestions printed, tasks.md unchanged
  - **TC-059**: Interactive mode prompts for confirmation
    - Given suggestions with varied confidence
    - When interactive mode enabled
    - Then user prompted to confirm each low-confidence suggestion
- **Coverage Target**: 80%+

**Files Affected**:
- `scripts/migrate-task-linkage.ts` (modify)
- `tests/integration/scripts/migrate-dry-run.test.ts` (new)

**Dependencies**: T-020

---

### T-022: Test migration on increments 0043-0046

**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04
**Status**: [x] completed
**Priority**: P1 (Important)
**Estimated Effort**: 6 hours

**Description**: Run migration script on existing increments 0043-0046 as proof of concept and validation.

**Implementation Steps**:
1. Run migration script on increment 0043:
   ```bash
   npx tsx scripts/migrate-task-linkage.ts 0043 --dry-run
   ```
2. Review suggested linkage, verify accuracy
3. Apply migration (remove --dry-run)
4. Run `/specweave:validate 0043` to verify correctness
5. Run `/specweave:sync-docs update` to sync living docs
6. Repeat for increments 0044, 0045, 0046
7. Document results in migration report

**Validation**:
- Manual validation (review migrated files)
- Automated validation: `/specweave:validate <id>`

**Expected Results**:
- 90%+ accuracy in US linkage
- All AC-IDs correctly mapped
- Living docs updated with task lists
- No "No tasks defined" messages

**Files Affected**:
- `.specweave/increments/0043-spec-md-desync-fix/tasks.md` (modify)
- `.specweave/increments/0044-integration-testing-status-hooks/tasks.md` (modify)
- `.specweave/increments/0045-auto-numbering-increments/tasks.md` (modify)
- `.specweave/increments/0046-console-elimination/tasks.md` (modify)
- `.specweave/increments/0047-us-task-linkage/reports/migration-report.md` (new)

**Dependencies**: T-020, T-021

---

## User Story: US-007 - External Item Import on Init

**Linked ACs**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04, AC-US7-05, AC-US7-06, AC-US7-07, AC-US7-08
**Tasks**: 5 total, 0 completed

### T-023: Create external importer interface and GitHub implementation

**User Story**: US-007
**Satisfies ACs**: AC-US7-08, AC-US7-03
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 8 hours

**Description**: Create abstraction layer for external importers with GitHub implementation supporting pagination.

**Implementation Steps**:
1. Create `src/importers/external-importer.ts`:
   - Define `ExternalItem` interface
   - Define `ImportConfig` interface
   - Define `Importer` interface with platform, import(), paginate()
2. Implement `GitHubImporter` class:
   - Constructor with owner/repo
   - `paginate()` with AsyncGenerator for 100 items/page
   - Convert GitHub issues to `ExternalItem`
   - Handle rate limiting (check headers)
3. Add unit tests for GitHub importer
4. Test pagination with 500 mock items

**Test Plan**:
- **File**: `tests/unit/importers/github-importer.test.ts`
- **Tests**:
  - **TC-060**: Import GitHub issues with pagination
    - Given GitHub repo with 250 issues
    - When GitHubImporter.import() called
    - Then all 250 issues imported (3 pages)
  - **TC-061**: Filter by time range (1 month)
    - Given issues created in last 3 months
    - When import with timeRangeMonths=1
    - Then only issues from last month imported
  - **TC-062**: Handle rate limiting
    - Given rate limit exceeded
    - When import attempted
    - Then error thrown with retry suggestion
- **Coverage Target**: 95%+

**Files Affected**:
- `src/importers/external-importer.ts` (new)
- `src/importers/github-importer.ts` (new)
- `tests/unit/importers/github-importer.test.ts` (new)

---

### T-024: Implement JIRA and ADO importers

**User Story**: US-007
**Satisfies ACs**: AC-US7-08, AC-US7-03
**Status**: [x] completed
**Completed**: 2025-11-20
**Priority**: P0 (Critical)
**Estimated Effort**: 10 hours

**Description**: Implement JIRA and Azure DevOps importers with platform-specific pagination.

**Implementation Steps**:
1. Implement `JiraImporter` class:
   - JQL query support
   - Pagination with startAt/maxResults
   - Convert JIRA issues to `ExternalItem`
2. Implement `ADOImporter` class:
   - WIQL query support
   - Pagination with continuationToken
   - Convert ADO work items to `ExternalItem`
3. Create `ImportCoordinator` to orchestrate multi-platform import
4. Add unit tests for both importers

**Test Plan**:
- **File**: `tests/unit/importers/jira-importer.test.ts`
- **Tests**:
  - **TC-063**: Import JIRA epics with JQL filter
  - **TC-064**: Pagination with startAt/maxResults
  - **TC-065**: Handle JIRA API errors

- **File**: `tests/unit/importers/ado-importer.test.ts`
- **Tests**:
  - **TC-066**: Import ADO work items with WIQL
  - **TC-067**: Pagination with continuationToken
  - **TC-068**: Handle ADO API authentication errors
- **Coverage Target**: 90%+

**Files Affected**:
- `src/importers/jira-importer.ts` (new)
- `src/importers/ado-importer.ts` (new)
- `src/importers/import-coordinator.ts` (new)
- `tests/unit/importers/jira-importer.test.ts` (new)
- `tests/unit/importers/ado-importer.test.ts` (new)

**Dependencies**: T-023

---

### T-025: Integrate external import into specweave init command

**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-07
**Status**: [x] completed
**Completed**: 2025-11-20
**Priority**: P0 (Critical)
**Estimated Effort**: 6 hours

**Description**: Extend `specweave init` to detect external tools and prompt for import.

**Implementation Steps**:
1. Update `src/cli/commands/init.ts`:
   - Detect GitHub remote (parse .git/config)
   - Detect JIRA config (process.env.JIRA_HOST)
   - Detect ADO config (process.env.ADO_ORG_URL)
2. Add interactive prompts:
   - "Import existing items from external tools? (Y/n)"
   - "Time range for import? (1 month, 3 months, 6 months, all)"
   - "Warning: Found 150 items. Continue? (Y/n)" (if > 100)
3. Call ImportCoordinator with selected options
4. Display import progress (spinner, item count)
5. Add integration tests

**Test Plan**:
- **File**: `tests/integration/commands/init-with-import.test.ts`
- **Tests**:
  - **TC-069**: Detect GitHub remote and prompt for import
    - Given project with GitHub remote
    - When `specweave init .` executed
    - Then user prompted: "Import from GitHub?"
  - **TC-070**: Import with time range selection
    - Given user selects "1 month"
    - When import executed
    - Then only items from last month imported
  - **TC-071**: Warn for large imports (> 100 items)
    - Given 150 items to import
    - When import initiated
    - Then warning shown, confirmation required
- **Coverage Target**: 85%+

**Files Affected**:
- `src/cli/commands/init.ts` (modify)
- `tests/integration/commands/init-with-import.test.ts` (new)

**Dependencies**: T-024

---

### T-026: Convert imported items to living docs User Stories (NO increment creation)

**User Story**: US-007
**Satisfies ACs**: AC-US7-04, AC-US7-05, AC-US7-06, AC-US7-09
**Status**: [x] completed
**Completed**: 2025-11-20
**Priority**: P0 (Critical)
**Estimated Effort**: 8 hours

**Description**: Convert external items to SpecWeave living docs format with E suffix. CRITICAL: Does NOT create increments automatically.

**Implementation Steps**:
1. Create `src/importers/item-converter.ts`:
   - Convert `ExternalItem` to User Story with E suffix
   - Extract AC-IDs from description (if present)
   - Preserve external metadata (externalId, externalUrl, importedAt)
2. Create living docs US files ONLY (us-001e-title.md in .specweave/docs/internal/specs/)
3. Add origin badge to living docs: `**Origin**: 🔗 [GitHub #638](...)`
4. **CRITICAL**: Do NOT create increment
5. **CRITICAL**: Do NOT auto-populate .specweave/increments/
6. Add validation: Ensure no increment directories created
7. Add unit tests for conversion logic

**Test Plan**:
- **File**: `tests/unit/importers/item-converter.test.ts`
- **Tests**:
  - **TC-072**: Convert GitHub issue to US with E suffix
    - Given GitHub issue #638
    - When converted
    - Then US-001E created in living docs (NOT increment)
  - **TC-073**: Preserve external metadata in living docs
    - Given issue with createdAt, updatedAt, labels
    - When converted
    - Then metadata preserved in living docs frontmatter
  - **TC-074**: Create living docs file with origin badge (NO increment)
    - Given converted US-001E
    - When import executed
    - Then us-001e-title.md created in living docs
    - And NO directory created in .specweave/increments/
  - **TC-075**: Validate no auto-increment creation
    - Given 10 external items imported
    - When import completes
    - Then 10 living docs files created
    - And ZERO increment directories created
- **Coverage Target**: 95%+

**Files Affected**:
- `src/importers/item-converter.ts` (new)
- `tests/unit/importers/item-converter.test.ts` (new)

**Dependencies**: T-024

---

### T-027: Add import configuration and environment variables

**User Story**: US-007
**Satisfies ACs**: AC-US7-02, AC-US7-03
**Status**: [x] completed (2025-11-20)
**Priority**: P1 (Important)
**Estimated Effort**: 4 hours

**Description**: Add configuration file and environment variables for import settings.

**Implementation Steps**:
1. Create `.specweave/config.json` schema:
   ```json
   {
     "externalImport": {
       "enabled": true,
       "timeRangeMonths": 1,
       "pageSize": 100,
       "github": { "labelFilter": ["enhancement"], "stateFilter": ["open", "closed"] },
       "jira": { "jqlFilter": "...", "issueTypes": ["Epic", "Story"] },
       "ado": { "wiqlFilter": "...", "workItemTypes": ["Epic", "User Story"] }
     }
   }
   ```
2. Add environment variables:
   - `SPECWEAVE_IMPORT_TIME_RANGE_MONTHS` (default: 1)
   - `SPECWEAVE_IMPORT_PAGE_SIZE` (default: 100)
   - `SPECWEAVE_IMPORT_ENABLED` (default: true)
3. Create config loader and validator
4. Add tests for config parsing

**Test Plan**:
- **File**: `tests/unit/config/import-config.test.ts`
- **Tests**:
  - **TC-075**: Load config from file
  - **TC-076**: Override with environment variables
  - **TC-077**: Validate config schema
- **Coverage Target**: 90%+

**Files Affected**:
- `.specweave/config.json` (new template)
- `src/config/import-config.ts` (new)
- `tests/unit/config/import-config.test.ts` (new)

**Dependencies**: T-023

---

## User Story: US-008 - ID Collision Resolution

**Linked ACs**: AC-US8-01, AC-US8-02, AC-US8-03, AC-US8-04, AC-US8-05, AC-US8-06
**Tasks**: 4 total, 0 completed

### T-028: Create ID generator with origin suffix support

**User Story**: US-008
**Satisfies ACs**: AC-US8-01, AC-US8-02, AC-US8-03
**Status**: [x] completed (2025-11-20)
**Priority**: P0 (Critical)
**Estimated Effort**: 6 hours

**Description**: Implement ID generator that handles both internal and external IDs with E suffix.

**Implementation Steps**:
1. Create `src/id-generators/us-id-generator.ts`:
   - `getNextId(existingIds, origin)` - Extract numeric part, find max, add suffix
   - `validateUniqueness(id, existingIds)` - Check for collisions
   - `parseOrigin(id)` - Detect internal vs external from suffix
2. Create `src/id-generators/task-id-generator.ts` (same pattern)
3. Add comprehensive unit tests

**Test Plan**:
- **File**: `tests/unit/id-generators/us-id-generator.test.ts`
- **Tests**:
  - **TC-078**: Generate next internal ID (no suffix)
    - Given existing: [US-001, US-002, US-003E]
    - When getNextId(existing, 'internal')
    - Then US-004
  - **TC-079**: Generate next external ID (E suffix)
    - Given existing: [US-001, US-002, US-003E]
    - When getNextId(existing, 'external')
    - Then US-004E
  - **TC-080**: Handle mixed IDs correctly
    - Given existing: [US-001, US-003E, US-005, US-007E]
    - When getNextId(existing, 'internal')
    - Then US-008 (max across both types)
  - **TC-081**: Detect ID collision
    - Given existing: [US-001, US-002]
    - When validateUniqueness('US-001', existing)
    - Then Error thrown: "ID collision detected"
- **Coverage Target**: 95%+

**Files Affected**:
- `src/id-generators/us-id-generator.ts` (new)
- `src/id-generators/task-id-generator.ts` (new)
- `tests/unit/id-generators/us-id-generator.test.ts` (new)
- `tests/unit/id-generators/task-id-generator.test.ts` (new)

---

### T-029: Update parsers to handle E suffix in IDs

**User Story**: US-008
**Satisfies ACs**: AC-US8-04
**Status**: [x] completed (2025-11-20)
**Priority**: P0 (Critical)
**Estimated Effort**: 5 hours

**Description**: Extend task-parser and spec-parser to parse IDs with E suffix.

**Implementation Steps**:
1. Update `src/generators/spec/task-parser.ts`:
   - Regex: `/T-(\d+)E?/` (allow optional E suffix)
   - Parse `T-001E` as valid task ID
   - Extract origin from suffix
2. Update `src/generators/spec/spec-parser.ts`:
   - Regex: `/US-(\d+)E?/` (allow optional E suffix)
   - Parse `US-001E` as valid User Story ID
3. Update `src/generators/spec/ac-parser.ts`:
   - Regex: `/AC-US(\d+)E?-(\d+)/` (allow E in US part)
   - Parse `AC-US1E-01` as valid AC-ID
4. Add tests for E suffix parsing

**Test Plan**:
- **File**: `tests/unit/generators/task-parser.test.ts` (extend)
- **Tests**:
  - **TC-082**: Parse task ID with E suffix
    - Given task: `### T-010E: External task`
    - When parseTasksWithUSLinks()
    - Then task.id = "T-010E", origin = "external"
  - **TC-083**: Parse mixed internal/external tasks
    - Given tasks: T-001, T-002E, T-003, T-004E
    - When parseTasksWithUSLinks()
    - Then all 4 tasks parsed correctly
- **Coverage Target**: 95%+

**Files Affected**:
- `src/generators/spec/task-parser.ts` (modify)
- `src/generators/spec/spec-parser.ts` (modify)
- `src/generators/spec/ac-parser.ts` (modify)
- `tests/unit/generators/task-parser.test.ts` (extend)

**Dependencies**: T-001, T-028

---

### T-030: Add ID uniqueness validation to increment planning

**User Story**: US-008
**Satisfies ACs**: AC-US8-05
**Status**: [x] completed
**Priority**: P1 (Important)
**Estimated Effort**: 4 hours

**Description**: Validate ID uniqueness before creating User Stories and Tasks during increment planning.

**Implementation Steps**:
1. Update PM agent/spec-generator:
   - Before creating new US, check existing IDs
   - Call `USIdGenerator.validateUniqueness()`
   - Abort if collision detected
2. Add validation to task creation
3. Log error with suggested next ID
4. Add integration tests

**Test Plan**:
- **File**: `tests/integration/generators/id-collision-detection.test.ts`
- **Tests**:
  - **TC-084**: Detect ID collision during planning
    - Given existing US-001
    - When PM agent tries to create US-001 again
    - Then Error: "ID collision, use US-002"
  - **TC-085**: Suggest next available ID
    - Given collision on US-005
    - When error thrown
    - Then message includes: "Next available: US-006"
- **Coverage Target**: 90%+

**Files Affected**:
- `plugins/specweave/skills/spec-generator/lib/us-generator.ts` (modify)
- `tests/integration/generators/id-collision-detection.test.ts` (new)

**Dependencies**: T-028

---

### T-031: Preserve legacy IDs during migration (no renumbering)

**User Story**: US-008
**Satisfies ACs**: AC-US8-06
**Status**: [x] completed
**Priority**: P1 (Important)
**Estimated Effort**: 3 hours

**Description**: Ensure migration script preserves existing internal IDs and first external import starts at next available ID.

**Implementation Steps**:
1. Update migration script:
   - Read all existing US IDs from increments (0001-0046)
   - Find max ID (e.g., US-200)
   - First external import starts at US-201E
2. Document migration strategy in MIGRATION_GUIDE.md
3. Test migration on sample increments

**Test Plan**:
- **File**: `tests/integration/migration/legacy-id-preservation.test.ts`
- **Tests**:
  - **TC-086**: Preserve legacy IDs
    - Given increments 0001-0046 with IDs US-001 to US-200
    - When external import executed
    - Then first external ID = US-201E
  - **TC-087**: No renumbering of existing IDs
    - Given existing increment with US-010
    - When migrated
    - Then US-010 unchanged (not renumbered to US-010I)
- **Coverage Target**: 85%+

**Files Affected**:
- `scripts/migrate-task-linkage.ts` (modify)
- `.specweave/docs/internal/MIGRATION_GUIDE.md` (new)
- `tests/integration/migration/legacy-id-preservation.test.ts` (new)

**Dependencies**: T-020, T-028

---

## User Story: US-009 - Origin Tracking and Metadata

**Linked ACs**: AC-US9-01, AC-US9-02, AC-US9-03, AC-US9-04, AC-US9-05, AC-US9-06
**Tasks**: 3 total, 0 completed

### T-032: Add origin metadata fields to spec.md and tasks.md

**User Story**: US-009
**Satisfies ACs**: AC-US9-01, AC-US9-03
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 5 hours

**Description**: Extend spec.md and tasks.md frontmatter with origin tracking fields.

**Implementation Steps**:
1. Update spec.md frontmatter schema:
   ```yaml
   external_items:
     - id: US-004E
       origin: external
       source: github
       external_id: GH-#638
       external_url: https://...
       imported_at: 2025-11-19T10:30:00Z
   ```
2. Update tasks.md frontmatter schema (same structure)
3. Update task template to include **Origin** field:
   ```markdown
   **Origin**: External ([GitHub #638](https://...))
   ```
4. Update parsers to extract origin metadata
5. Add unit tests

**Test Plan**:
- **File**: `tests/unit/parsers/metadata-parser.test.ts`
- **Tests**:
  - **TC-088**: Parse external_items from spec.md frontmatter
    - Given spec.md with external_items array
    - When parsed
    - Then metadata extracted correctly
  - **TC-089**: Extract origin from task **Origin** field
    - Given task with `**Origin**: External (GH-#638)`
    - When parseTasksWithUSLinks()
    - Then task.origin = "external", task.externalId = "GH-#638"
- **Coverage Target**: 95%+

**Files Affected**:
- `src/generators/spec/spec-parser.ts` (modify)
- `src/generators/spec/task-parser.ts` (modify)
- `plugins/specweave/skills/spec-generator/templates/tasks.md.mustache` (modify)
- `tests/unit/parsers/metadata-parser.test.ts` (new)

---

### T-033: Implement configurable sync direction logic

**User Story**: US-009
**Satisfies ACs**: AC-US9-02, AC-US9-03, AC-US9-04, AC-US9-05
**Status**: [ ] pending
**Priority**: P0 (Critical)
**Estimated Effort**: 8 hours

**Description**: Implement sync coordinator that uses three-permission architecture with safe defaults.

**CRITICAL RULES**:
1. **Increment → Living Docs**: ALWAYS one-way (immutable)
2. **Living Docs ↔ External Tool**: Configurable via three permissions
3. **Permission Defaults**: All FALSE (safest - read-only sync)

**Implementation Steps**:
1. Create `src/sync/sync-config.ts`:
   - Define `SyncConfig` interface with three permission flags (all default: false)
   - Define sync behavior based on permission combinations
2. Create `src/sync/increment-to-living-docs.ts`:
   - ALWAYS one-way (increment → living docs)
   - NEVER pull from living docs to update increment (immutable rule)
3. Create `src/sync/living-docs-to-external.ts`:
   - Respect three-permission settings
   - **Default (all permissions=false)**:
     - Internal US: no sync (read-only)
     - External US: no sync (read-only)
   - **With canUpdateExternalItems=true**:
     - Internal US: push to external tool (SpecWeave → External)
   - **With canUpsertInternalItems=true**:
     - External US: pull from external tool (External → SpecWeave)
   - **With canUpdateStatus=true**:
     - Status sync enabled (both directions as appropriate)
4. Create `src/sync/sync-config-validator.ts`:
   - Validate incrementToLivingDocs = 'one-way' (immutable)
   - Validate autoIncrementCreation = false (forbidden)
   - Warn if all three permissions = true (full sync mode, higher conflict risk)
5. Add conflict detection (when multiple permissions enabled)
6. Add integration tests for all permission combinations

**Test Plan**:
- **File**: `tests/integration/sync/sync-direction.test.ts`
- **Tests**:
  - **TC-090**: Increment → Living Docs is always one-way
    - Given active increment with task completion
    - When sync executed
    - Then living docs updated, NO pull from living docs to increment
  - **TC-091**: Internal US no sync (default: all permissions=false)
    - Given internal US-001, all permissions=false
    - When sync executed
    - Then NO sync to GitHub (read-only mode)
  - **TC-092**: External US no sync (default: all permissions=false)
    - Given external US-002E, all permissions=false, GitHub updated
    - When sync executed
    - Then NO sync from GitHub (read-only mode)
  - **TC-093**: Internal US push with canUpdateExternalItems=true
    - Given internal US-001, canUpdateExternalItems=true
    - When sync executed
    - Then living docs → GitHub (push only)
  - **TC-094**: External US pull with canUpsertInternalItems=true
    - Given external US-002E, canUpsertInternalItems=true, GitHub updated
    - When sync executed
    - Then GitHub → living docs (pull only)
  - **TC-095**: Full sync with all permissions enabled
    - Given US-001, canUpsertInternalItems=true, canUpdateExternalItems=true, canUpdateStatus=true
    - When sync executed
    - Then both push and pull enabled with conflict detection
  - **TC-096**: Config validation prevents invalid settings
    - Given config with incrementToLivingDocs='two-way'
    - When validated
    - Then Error: "MUST be one-way"
- **Coverage Target**: 95%+

**Files Affected**:
- `src/sync/sync-config.ts` (new)
- `src/sync/increment-to-living-docs.ts` (new)
- `src/sync/living-docs-to-external.ts` (new)
- `src/sync/sync-config-validator.ts` (new)
- `tests/integration/sync/sync-direction.test.ts` (new)

**Dependencies**: T-032

---

### T-034: Add origin badges to living docs US files

**User Story**: US-009
**Satisfies ACs**: AC-US9-04, AC-US9-05
**Status**: [ ] pending
**Priority**: P1 (Important)
**Estimated Effort**: 4 hours

**Description**: Update living docs generator to show origin badges and make origin immutable.

**Implementation Steps**:
1. Update `sync-living-docs.js`:
   - Detect origin from US ID (E suffix)
   - Add origin badge to living docs:
     - 🏠 **Internal**
     - 🔗 **GitHub** #638
     - 🎫 **JIRA** SPEC-789
     - 📋 **ADO** 12345
2. Add origin immutability validation:
   - Check metadata.json for existing origin
   - Prevent origin field changes (internal ↔ external)
   - Log warning if attempted
3. Add integration tests

**Test Plan**:
- **File**: `tests/integration/living-docs/origin-badges.test.ts`
- **Tests**:
  - **TC-093**: Render origin badge for internal US
    - Given US-001 (internal)
    - When living docs generated
    - Then us-001-title.md shows "**Origin**: 🏠 Internal"
  - **TC-094**: Render origin badge for external US (GitHub)
    - Given US-002E (external, GitHub)
    - When living docs generated
    - Then us-002e-title.md shows "**Origin**: 🔗 [GitHub #638](...)"
  - **TC-095**: Prevent origin field mutation
    - Given US-001 with origin=internal
    - When attempt to change to origin=external
    - Then Error: "Origin immutable after creation"
- **Coverage Target**: 85%+

**Files Affected**:
- `plugins/specweave/lib/hooks/sync-living-docs.js` (modify)
- `tests/integration/living-docs/origin-badges.test.ts` (new)

**Dependencies**: T-032

---

## User Story: US-009A - External Item Format Preservation

**Linked ACs**: AC-US9A-01, AC-US9A-02, AC-US9A-03, AC-US9A-04, AC-US9A-05, AC-US9A-06, AC-US9A-07, AC-US9A-08, AC-US9A-09, AC-US9A-10
**Tasks**: 6 total, 0 completed

### T-034A: Implement format preservation metadata in living docs

**User Story**: US-009A
**Satisfies ACs**: AC-US9A-06, AC-US9A-10
**Status**: [ ] pending
**Priority**: P0 (Critical)
**Estimated Effort**: 4 hours

**Description**: Add format preservation metadata fields to living docs User Story frontmatter, including `format_preservation`, `external_title`, and origin tracking.

**Implementation Steps**:
1. Extend living docs US frontmatter schema with new fields:
   - `format_preservation: boolean` (true for external items)
   - `external_title: string` (original title for validation)
   - `external_source: string` (github | jira | ado)
2. Update `LivingDocsGenerator` to populate new fields during import
3. Update `ExternalImporter` to set `format_preservation=true` for external items
4. Add validation to ensure `external_title` matches actual external item title

**Test Plan**:
- **File**: `tests/unit/living-docs/format-preservation-metadata.test.ts`
- **Tests**:
  - TC-034A-01: External US has format_preservation=true
  - TC-034A-02: External US stores external_title correctly
  - TC-034A-03: Internal US has format_preservation=false
  - TC-034A-04: Metadata validation detects missing external_title
- **Coverage Target**: 90%+

**Files Affected**:
- `src/generators/spec/living-docs-generator.ts` (modify)
- `src/importers/external-importer.ts` (modify)
- `tests/unit/living-docs/format-preservation-metadata.test.ts` (new)

**Dependencies**: T-032

---

### T-034B: Implement comment-based sync service for external items

**User Story**: US-009A
**Satisfies ACs**: AC-US9A-03, AC-US9A-07, AC-US9A-09
**Status**: [ ] pending
**Priority**: P0 (Critical)
**Estimated Effort**: 6 hours

**Description**: Create FormatPreservationSyncService that routes sync to comment-only mode for external items (no title/description updates) and full sync mode for internal items.

**Implementation Steps**:
1. Create `src/sync/format-preservation-sync.ts` with FormatPreservationSyncService class
2. Implement `syncUserStory()` method with origin-based routing:
   - If `origin=external` → call `addCompletionComment()` only
   - If `origin=internal` → call full sync (title, description, comments, status)
3. Implement `buildCompletionComment()` method to format comment with:
   - Task completion info (✅ [T-XXX] title)
   - AC satisfaction info (✅ **AC-USXX-YY**: description)
   - Progress percentage (8/11 tasks, 73%)
   - Links to living docs
4. Add conditional status update (only if `canUpdateStatus=true`)

**Test Plan**:
- **File**: `tests/integration/sync/format-preservation-sync.test.ts`
- **Tests**:
  - TC-034B-01: External US routes to comment-only mode
  - TC-034B-02: Internal US routes to full sync mode
  - TC-034B-03: Completion comment includes all required sections
  - TC-034B-04: Status NOT updated when canUpdateStatus=false
  - TC-034B-05: Status updated when canUpdateStatus=true
- **Coverage Target**: 90%+

**Files Affected**:
- `src/sync/format-preservation-sync.ts` (new)
- `src/sync/living-docs-to-external.ts` (modify - integrate FormatPreservationSyncService)
- `tests/integration/sync/format-preservation-sync.test.ts` (new)

**Dependencies**: T-034A, T-033

---

### T-034C: Add external tool client comment API methods

**User Story**: US-009A
**Satisfies ACs**: AC-US9A-03
**Status**: [ ] pending
**Priority**: P0 (Critical)
**Estimated Effort**: 3 hours

**Description**: Extend external tool clients (GitHub, JIRA, ADO) with `addComment()` method for posting completion comments to external items.

**Implementation Steps**:
1. Add `addComment(itemId: string, comment: string)` method to ExternalToolClient interface
2. Implement GitHub client comment API:
   - POST `/repos/{owner}/{repo}/issues/{issue_number}/comments`
   - Authenticate with GitHub PAT
3. Implement JIRA client comment API:
   - POST `/rest/api/3/issue/{issueIdOrKey}/comment`
4. Implement ADO client comment API:
   - POST `/{organization}/{project}/_apis/wit/workitems/{id}/comments`

**Test Plan**:
- **File**: `tests/integration/external-tools/comment-api.test.ts`
- **Tests**:
  - TC-034C-01: GitHub client posts comment successfully
  - TC-034C-02: JIRA client posts comment successfully
  - TC-034C-03: ADO client posts comment successfully
  - TC-034C-04: Comment includes markdown formatting
  - TC-034C-05: Handle rate limiting gracefully
- **Coverage Target**: 85%+

**Files Affected**:
- `src/external-tools/external-tool-client.ts` (interface update)
- `src/external-tools/github-client.ts` (modify)
- `src/external-tools/jira-client.ts` (modify)
- `src/external-tools/ado-client.ts` (modify)
- `tests/integration/external-tools/comment-api.test.ts` (new)

**Dependencies**: None

---

### T-034D: Implement format preservation validation

**User Story**: US-009A
**Satisfies ACs**: AC-US9A-01, AC-US9A-02, AC-US9A-08
**Status**: [ ] pending
**Priority**: P1 (Important)
**Estimated Effort**: 3 hours

**Description**: Add validation to ensure external items preserve original title and description during sync, blocking any format-breaking updates.

**Implementation Steps**:
1. Add `validateFormatPreserved()` method to FormatPreservationSyncService
2. Fetch current external item before sync
3. Compare external item title with `external_title` from metadata
4. Throw error if title was modified during sync
5. Log warning if description contains SpecWeave-injected content (ACs/Tasks)

**Test Plan**:
- **File**: `tests/integration/sync/format-preservation-validation.test.ts`
- **Tests**:
  - TC-034D-01: Validation passes when title unchanged
  - TC-034D-02: Validation fails when title modified
  - TC-034D-03: Validation fails when description has ACs injected
  - TC-034D-04: Validation skipped for internal items
- **Coverage Target**: 90%+

**Files Affected**:
- `src/sync/format-preservation-sync.ts` (modify)
- `tests/integration/sync/format-preservation-validation.test.ts` (new)

**Dependencies**: T-034A, T-034B

---

### T-034E: Update hooks to use format preservation sync

**User Story**: US-009A
**Satisfies ACs**: AC-US9A-09
**Status**: [ ] pending
**Priority**: P0 (Critical)
**Estimated Effort**: 4 hours

**Description**: Integrate FormatPreservationSyncService into `post-task-completion.sh` hook to route sync based on origin metadata.

**Implementation Steps**:
1. Update `plugins/specweave/lib/hooks/sync-living-docs.js` to import FormatPreservationSyncService
2. Detect origin from living docs US frontmatter
3. Route to FormatPreservationSyncService instead of direct external client calls
4. Add logging to track which sync mode was used (comment-only vs full)

**Test Plan**:
- **File**: `tests/integration/hooks/format-preservation-hook.test.ts`
- **Tests**:
  - TC-034E-01: Hook detects external origin and routes to comment-only mode
  - TC-034E-02: Hook detects internal origin and routes to full sync mode
  - TC-034E-03: Hook logs sync mode selection
  - TC-034E-04: Hook handles sync errors gracefully
- **Coverage Target**: 85%+

**Files Affected**:
- `plugins/specweave/lib/hooks/sync-living-docs.js` (modify)
- `tests/integration/hooks/format-preservation-hook.test.ts` (new)

**Dependencies**: T-034B

---

### T-034F: Add E2E test for external-first workflow

**User Story**: US-009A
**Satisfies ACs**: AC-US9A-01, AC-US9A-02, AC-US9A-03, AC-US9A-04, AC-US9A-05
**Status**: [ ] pending
**Priority**: P1 (Important)
**Estimated Effort**: 5 hours

**Description**: Create comprehensive E2E test covering the complete external-first workflow from import to task completion to sync.

**Implementation Steps**:
1. Create mock external GitHub issue "My-Specific-Item"
2. Import via `specweave init` → creates US-001E in living docs
3. Manually create increment: `specweave increment "Implement FS-888"`
4. Complete tasks in increment
5. Trigger sync hook
6. Validate:
   - GitHub issue title remains "My-Specific-Item" (NOT [FS-888][US-001])
   - GitHub issue description unchanged
   - Completion comment added with task/AC info
   - Status unchanged (canUpdateStatus=false)

**Test Plan**:
- **File**: `tests/e2e/external-first-workflow.e2e.test.ts`
- **Tests**:
  - TC-034F-01: Complete external-first workflow
  - TC-034F-02: Format preservation throughout entire flow
  - TC-034F-03: Status update with canUpdateStatus=true
  - TC-034F-04: Mixed internal/external items in same increment
- **Coverage Target**: 85%+

**Files Affected**:
- `tests/e2e/external-first-workflow.e2e.test.ts` (new)

**Dependencies**: T-034A, T-034B, T-034C, T-034D, T-034E

---

## User Story: US-010 - External Import Slash Command

**Linked ACs**: AC-US10-01, AC-US10-02, AC-US10-03, AC-US10-04, AC-US10-05, AC-US10-06, AC-US10-07, AC-US10-08, AC-US10-09, AC-US10-10, AC-US10-11, AC-US10-12
**Tasks**: 2 total, 0 completed

### T-035: Create /specweave:import-external command with tool detection

**User Story**: US-010
**Satisfies ACs**: AC-US10-01, AC-US10-02, AC-US10-03, AC-US10-04, AC-US10-05, AC-US10-06, AC-US10-07
**Status**: [ ] pending
**Priority**: P0 (Critical)
**Estimated Effort**: 10 hours

**Description**: Implement dedicated slash command for on-demand external work item import with comprehensive options and progress reporting.

**Implementation Steps**:
1. Create `plugins/specweave/commands/specweave-import-external.md`:
   - Define command syntax: `/specweave:import-external [options]`
   - Document options: --since, --github-only, --jira-only, --ado-only, --dry-run
2. Create `src/cli/commands/import-external.ts`:
   - Implement importExternal(options) function
   - Call detectExternalTools() to find configured platforms
   - Apply platform filters (github-only, jira-only, ado-only)
   - Determine time range (1m, 3m, 6m, all, since-last-import)
3. Create `src/importers/external-tool-detector.ts`:
   - detectExternalTools() - scan for GitHub (.git/config), JIRA (env), ADO (env)
   - Return ExternalTool[] with platform configs
4. Implement import flow:
   - For each active tool: create importer, paginate items, convert to living docs
   - Show progress: "Importing from GitHub... [25/150] ⠋"
   - Track stats: totalImported, totalSkipped
5. Display summary report:
   - "✅ Imported 42 items (GitHub: 30, JIRA: 12). Skipped 5 duplicates."
6. Add command integration tests

**Test Plan**:
- **File**: `tests/integration/commands/import-external.test.ts`
- **Tests**:
  - **TC-096**: Detect configured external tools
    - Given GitHub remote in .git/config
    - When detectExternalTools() called
    - Then tools = [{ platform: 'github', config: {...} }]
  - **TC-097**: Filter by platform (--github-only)
    - Given GitHub and JIRA configured, option --github-only
    - When command executed
    - Then only GitHub items imported
  - **TC-098**: Time range filtering (--since=1m)
    - Given items from last 3 months
    - When --since=1m option used
    - Then only items from last month imported
  - **TC-099**: Progress indicator displayed
    - Given 50 items to import
    - When command executed
    - Then progress shown: "Importing... [25/50]"
  - **TC-100**: Summary report displayed
    - Given 42 items imported, 5 skipped
    - When import completes
    - Then summary shows correct counts
  - **TC-101**: Dry-run mode shows preview
    - Given --dry-run option
    - When command executed
    - Then items listed, NO files created
  - **TC-102**: Create living docs files with E suffix
    - Given external item GH-#638
    - When imported
    - Then us-001e-title.md created in living docs
- **Coverage Target**: 90%+

**Files Affected**:
- `plugins/specweave/commands/specweave-import-external.md` (new)
- `src/cli/commands/import-external.ts` (new)
- `src/importers/external-tool-detector.ts` (new)
- `tests/integration/commands/import-external.test.ts` (new)

**Dependencies**: T-023, T-024, T-026

---

### T-036: Add sync metadata management and duplicate detection

**User Story**: US-010
**Satisfies ACs**: AC-US10-08, AC-US10-09, AC-US10-10, AC-US10-11, AC-US10-12
**Status**: [ ] pending
**Priority**: P0 (Critical)
**Estimated Effort**: 8 hours

**Description**: Implement sync metadata tracking and duplicate detection to prevent re-importing existing items and support "since last import" filtering.

**Implementation Steps**:
1. Create `src/sync/sync-metadata.ts`:
   - Define SyncMetadata interface (per-platform lastImport timestamps)
   - loadSyncMetadata() - read from .specweave/sync-metadata.json
   - updateSyncMetadata(platform, timestamp) - update with latest import time
2. Create `src/importers/duplicate-detector.ts`:
   - checkExistingExternalId(externalId) - search living docs for matching external_id
   - Scan all us-*.md files in living docs, parse frontmatter
   - Return true if external_id found (duplicate), false otherwise
3. Create `src/importers/rate-limiter.ts`:
   - checkGitHubRateLimit() - read X-RateLimit-Remaining header
   - waitIfNeeded(platform) - pause if rate limit low (< 10 remaining)
   - Display warning: "⚠️ GitHub rate limit low. Waiting 60s..."
4. Integrate duplicate detection into import flow:
   - Before converting item, check if externalId exists
   - If exists, skip with log: "Skipped duplicate: GH-#638"
   - Increment totalSkipped counter
5. Integrate sync metadata updates:
   - After import completes, update sync-metadata.json with current timestamp
   - Support "since-last-import" option using stored timestamp
6. Add unit and integration tests

**Test Plan**:
- **File**: `tests/unit/sync/sync-metadata.test.ts`
- **Tests**:
  - **TC-103**: Load sync metadata from file
    - Given .specweave/sync-metadata.json exists
    - When loadSyncMetadata() called
    - Then metadata parsed correctly
  - **TC-104**: Update sync metadata after import
    - Given GitHub import completed
    - When updateSyncMetadata('github', new Date())
    - Then sync-metadata.json updated with timestamp
  - **TC-105**: Use "since-last-import" as time range
    - Given lastImport = "2025-11-01T00:00:00Z"
    - When --since=since-last-import option used
    - Then only items after 2025-11-01 imported

- **File**: `tests/unit/importers/duplicate-detector.test.ts`
- **Tests**:
  - **TC-106**: Detect existing external ID
    - Given US-042E with external_id: GH-#638
    - When checkExistingExternalId('GH-#638') called
    - Then returns true (duplicate found)
  - **TC-107**: Allow new external ID
    - Given no US with external_id: GH-#999
    - When checkExistingExternalId('GH-#999') called
    - Then returns false (safe to import)

- **File**: `tests/unit/importers/rate-limiter.test.ts`
- **Tests**:
  - **TC-108**: Check GitHub rate limit
    - Given GitHub API returns remaining: 5
    - When checkGitHubRateLimit() called
    - Then returns { remaining: 5, resetAt: ... }
  - **TC-109**: Wait if rate limit low
    - Given remaining: 5 (< 10)
    - When waitIfNeeded('github') called
    - Then pauses until reset time
  - **TC-110**: Large import confirmation (> 100 items)
    - Given 250 items to import
    - When import initiated
    - Then prompt: "⚠️ Found 250 items. Continue? (Y/n)"
- **Coverage Target**: 95%+

**Files Affected**:
- `src/sync/sync-metadata.ts` (new)
- `src/importers/duplicate-detector.ts` (new)
- `src/importers/rate-limiter.ts` (new)
- `.specweave/sync-metadata.json` (generated during import)
- `tests/unit/sync/sync-metadata.test.ts` (new)
- `tests/unit/importers/duplicate-detector.test.ts` (new)
- `tests/unit/importers/rate-limiter.test.ts` (new)

**Dependencies**: T-023, T-024, T-035

---

## User Story: US-011 - Multi-Repo Selection Strategy (GitHub Init)

**Linked ACs**: AC-US11-01, AC-US11-02, AC-US11-03, AC-US11-04, AC-US11-05, AC-US11-06, AC-US11-07, AC-US11-08, AC-US11-09, AC-US11-10, AC-US11-11, AC-US11-12
**Tasks**: 4 total, 0 completed

### T-037: Create GitHub repo selector with organization detection

**User Story**: US-011
**Satisfies ACs**: AC-US11-01, AC-US11-02, AC-US11-03, AC-US11-04
**Status**: [ ] pending
**Priority**: P0 (Critical)
**Estimated Effort**: 8 hours

**Description**: Implement comprehensive GitHub repository selector with support for organization and personal account repos.

**Implementation Steps**:
1. Create `src/init/github-repo-selector.ts`:
   - Define `RepoSelectionStrategy` interface (type, organization, pattern, repositories)
   - Define `RepoPreview` interface (fullName, owner, visibility, lastUpdated, hasAccess)
   - Implement `GitHubRepoSelector` class
2. Implement `detectOrganizations()`:
   - Query GitHub API `/user/orgs` endpoint
   - Return list of organization names user belongs to
3. Implement `promptSelectionStrategy()`:
   - Show 4 options: organization, personal, pattern, explicit
   - Display org names for option 1
   - Display personal repo count for option 2
   - Provide examples for pattern matching
4. Implement strategy-specific prompts:
   - `promptOrganizationStrategy()` - select from orgs list
   - `promptPatternStrategy()` - enter glob pattern
   - `promptExplicitStrategy()` - enter comma-separated repos
5. Implement repo listing with pagination:
   - `listOrganizationRepos(org)` - list all repos for org (paginated)
   - `listPersonalRepos()` - list user's owned repos (affiliation=owner)
6. Add unit tests

**Test Plan**:
- **File**: `tests/unit/init/github-repo-selector.test.ts`
- **Tests**:
  - **TC-111**: Detect user's organizations
    - Given GitHub API returns 3 orgs
    - When detectOrganizations() called
    - Then returns ['org1', 'org2', 'org3']
  - **TC-112**: List organization repos with pagination
    - Given org with 250 repos
    - When listOrganizationRepos('org1') called
    - Then returns all 250 repos (3 pages @ 100/page)
  - **TC-113**: List personal repos (owner only)
    - Given user owns 42 repos
    - When listPersonalRepos() called
    - Then returns 42 repos with affiliation=owner
  - **TC-114**: Disable org option if user has no orgs
    - Given user belongs to 0 orgs
    - When promptSelectionStrategy() called
    - Then organization option disabled in prompt
- **Coverage Target**: 95%+

**Files Affected**:
- `src/init/github-repo-selector.ts` (new)
- `tests/unit/init/github-repo-selector.test.ts` (new)

---

### T-038: Implement pattern matching and explicit list strategies

**User Story**: US-011
**Satisfies ACs**: AC-US11-05, AC-US11-06, AC-US11-10
**Status**: [ ] pending
**Priority**: P0 (Critical)
**Estimated Effort**: 6 hours

**Description**: Add pattern matching (glob) and explicit list repository selection strategies with validation.

**Implementation Steps**:
1. Install `minimatch` library for glob pattern support
2. Implement `getMatchingRepos()` function:
   - For pattern strategy: fetch all accessible repos, filter with minimatch
   - For explicit strategy: validate each repo exists and has access
3. Implement `listAllAccessibleRepos()`:
   - Query `/user/repos` without affiliation filter
   - Paginate through all repos user has access to
4. Implement `validateExplicitRepos(repoNames)`:
   - Parse repo names (support "owner/repo" or just "repo")
   - Query `/repos/{owner}/{repo}` for each
   - Collect repos user has access to
   - Warn for repos not found or no access
5. Add validation for pattern matching:
   - Test pattern against sample repos before executing
   - Show count of matched repos
6. Add integration tests

**Test Plan**:
- **File**: `tests/integration/init/repo-pattern-matching.test.ts`
- **Tests**:
  - **TC-115**: Pattern matching with glob (ec-*)
    - Given repos: [ec-backend, ec-frontend, other-repo]
    - When pattern = "ec-*"
    - Then matched: [ec-backend, ec-frontend]
  - **TC-116**: Pattern matching with wildcard (*-backend)
    - Given repos: [api-backend, service-backend, frontend]
    - When pattern = "*-backend"
    - Then matched: [api-backend, service-backend]
  - **TC-117**: Validate explicit list (existing repos)
    - Given repos: ["owner/repo1", "owner/repo2"]
    - When validateExplicitRepos() called
    - Then both repos validated and returned
  - **TC-118**: Warn for non-existent repos in explicit list
    - Given repos: ["owner/repo1", "owner/missing-repo"]
    - When validateExplicitRepos() called
    - Then warning logged: "⚠️ Repository not found: owner/missing-repo"
- **Coverage Target**: 90%+

**Files Affected**:
- `src/init/github-repo-selector.ts` (modify)
- `package.json` (add minimatch dependency)
- `tests/integration/init/repo-pattern-matching.test.ts` (new)

**Dependencies**: T-037

---

### T-039: Add repo preview and confirmation flow

**User Story**: US-011
**Satisfies ACs**: AC-US11-07, AC-US11-09, AC-US11-11
**Status**: [ ] pending
**Priority**: P0 (Critical)
**Estimated Effort**: 5 hours

**Description**: Implement repository preview table showing matched repos before confirmation and config persistence.

**Implementation Steps**:
1. Implement `showPreview(repos)` function:
   - Use `console.table()` to display repo details
   - Columns: Repository, Visibility, Last Updated, Access
   - Format dates as locale strings
   - Show access status (✓ or ✗)
2. Add confirmation prompt:
   - Message: "Connect these N repositories? (Y/n)"
   - Default: true
   - Return boolean (confirmed)
3. Implement `saveToConfig()` function:
   - Create config object with github.repositories array
   - Include selectionStrategy field (type)
   - Conditionally add organization or pattern fields
   - Write to `.specweave/config.json` with pretty printing (indent: 2)
4. Handle private repos detection:
   - Scan matched repos for visibility=private
   - If found, prompt for GitHub PAT if not already provided
   - Validate PAT has required scopes (repo, read:org)
5. Add integration tests

**Test Plan**:
- **File**: `tests/integration/init/repo-preview.test.ts`
- **Tests**:
  - **TC-119**: Display repo preview table
    - Given 5 matched repos
    - When showPreview() called
    - Then console.table() displays all 5 with columns
  - **TC-120**: Save selection to config.json
    - Given strategy: pattern, pattern: "ec-*", repos: [repo1, repo2]
    - When saveToConfig() called
    - Then config.json created with correct structure
  - **TC-121**: Prompt for PAT when private repos detected
    - Given matched repos include private repo
    - When preview shown
    - Then user prompted: "Enter GitHub Personal Access Token"
  - **TC-122**: Validate PAT scopes
    - Given PAT without repo scope
    - When validation attempted
    - Then error: "PAT requires 'repo' and 'read:org' scopes"
- **Coverage Target**: 90%+

**Files Affected**:
- `src/init/github-repo-selector.ts` (modify)
- `.specweave/config.json` (created/updated during init)
- `tests/integration/init/repo-preview.test.ts` (new)

**Dependencies**: T-038

---

### T-040: Integrate multi-repo selection into specweave init command

**User Story**: US-011
**Satisfies ACs**: AC-US11-01, AC-US11-08, AC-US11-12
**Status**: [ ] pending
**Priority**: P0 (Critical)
**Estimated Effort**: 6 hours

**Description**: Integrate GitHubRepoSelector into existing `specweave init` command with seamless flow.

**Implementation Steps**:
1. Update `src/cli/commands/init.ts`:
   - Detect GitHub remote (existing logic)
   - If GitHub detected, show: "🔗 GitHub integration detected"
2. Add GitHub PAT prompt:
   - Check if GITHUB_TOKEN env var exists
   - If not, prompt: "Enter GitHub Personal Access Token (optional for public repos):"
   - Validate token by querying `/user` endpoint
3. Instantiate GitHubRepoSelector:
   - Pass PAT to constructor
   - Call promptSelectionStrategy()
   - Call getMatchingRepos(strategy)
4. Show preview and confirm:
   - Call showPreview(repos)
   - If confirmed, call saveToConfig()
5. Add optional import flow:
   - Prompt: "Import existing issues from these repos? (Y/n)"
   - If yes, call existing import logic (T-025)
6. Handle edge cases:
   - User cancels at any step → skip GitHub integration
   - Rate limit exceeded → suggest waiting
   - Network errors → graceful fallback
7. Add E2E tests

**Test Plan**:
- **File**: `tests/e2e/init-multi-repo.test.ts`
- **Tests**:
  - **TC-123**: Full flow (organization strategy)
    - Given user selects org strategy, org = "acme-corp"
    - When init completes
    - Then config.json contains all org repos
  - **TC-124**: Full flow (pattern strategy)
    - Given user selects pattern strategy, pattern = "ec-*"
    - When init completes
    - Then config.json contains matched repos
  - **TC-125**: Handle GitHub API pagination (250+ repos)
    - Given org has 300 repos
    - When init executes
    - Then all 300 repos processed (4 pages)
  - **TC-126**: Skip import after repo selection
    - Given user confirms repo selection
    - When prompted for import, user selects No
    - Then config saved, no import executed
  - **TC-127**: Edit repos after initial setup
    - Given config.json exists with repos
    - When `specweave config github --edit-repos` executed
    - Then user can modify selection
- **Coverage Target**: 85%+

**Files Affected**:
- `src/cli/commands/init.ts` (modify)
- `src/cli/commands/config.ts` (new - for editing repos)
- `tests/e2e/init-multi-repo.test.ts` (new)

**Dependencies**: T-039

---

## User Story: US-012 - Intelligent FS-XXX Folder Creation with Chronological ID Allocation

**Linked ACs**: AC-US12-01, AC-US12-02, AC-US12-03, AC-US12-04, AC-US12-05, AC-US12-06, AC-US12-07, AC-US12-08, AC-US12-09
**Tasks**: 3 total, 0 completed

### T-041: Create FS-ID allocator with chronological allocation algorithm

**User Story**: US-012
**Satisfies ACs**: AC-US12-01, AC-US12-02, AC-US12-03, AC-US12-04, AC-US12-05, AC-US12-06
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 10 hours

**Description**: Implement intelligent FS-XXX ID allocator that chronologically places external work items based on creation date while preventing collisions.

**Implementation Steps**:
1. Create `src/living-docs/fs-id-allocator.ts`:
   - Define `FeatureMetadata` interface (id, createdAt, origin, externalId)
   - Implement `FSIdAllocator` class
2. Implement `scanExistingIds()`:
   - Scan `.specweave/docs/internal/specs/FS-*/` for active features
   - Scan `.specweave/docs/_archive/specs/FS-*/` for archived features (CRITICAL)
   - Parse README.md frontmatter to extract createdAt timestamp
   - Build Map<string, FeatureMetadata> of all IDs (active + archived)
3. Implement `allocateId(workItem, origin)`:
   - Sort existing IDs by createdAt ascending
   - Iterate through sorted list to find chronological insertion point
   - Check for gaps between consecutive IDs (e.g., FS-010 → FS-020 has gap)
   - If gap exists and workItem fits chronologically, allocate next ID in gap (FS-011E)
   - If no suitable gap, default to append mode: max(ID) + 1 with E suffix
4. Implement `hasCollision()`:
   - Check for exact ID match (FS-042)
   - Check for variant match (FS-042E when checking FS-042)
   - Return true if either exists
5. Implement `getMaxId()`:
   - Extract numeric part from all IDs (ignore E suffix)
   - Return max numeric value
6. Add comprehensive unit tests

**Test Plan**:
- **File**: `tests/unit/living-docs/fs-id-allocator.test.ts`
- **Tests**:
  - **TC-128**: Chronological insertion into gap
    - Given IDs: FS-010 (2025-01-10), FS-020 (2025-01-20)
    - When workItem.createdAt = 2025-01-15
    - Then allocateId() returns FS-011E
  - **TC-129**: Append mode when no suitable gap
    - Given IDs: FS-010, FS-011, FS-012 (consecutive, no gaps)
    - When workItem.createdAt = 2025-02-01 (after all)
    - Then allocateId() returns FS-013E
  - **TC-130**: Detect collision with existing ID
    - Given IDs: FS-010, FS-011E, FS-020
    - When trying to allocate FS-011
    - Then hasCollision() returns true (FS-011E exists)
  - **TC-131**: Scan archived IDs (prevent reuse)
    - Given active: FS-010, archived: FS-020
    - When workItem.createdAt = 2025-01-15
    - Then FS-020 still occupied, allocate FS-011E (not FS-020)
  - **TC-132**: Parse feature metadata from README.md
    - Given FS-042/README.md with frontmatter createdAt
    - When parseFeatureMetadata() called
    - Then extracts createdAt, id, origin correctly
- **Coverage Target**: 95%+

**Files Affected**:
- `src/living-docs/fs-id-allocator.ts` (new)
- `tests/unit/living-docs/fs-id-allocator.test.ts` (new)

---

### T-042: Implement folder creation and ID registry

**User Story**: US-012
**Satisfies ACs**: AC-US12-07, AC-US12-08, AC-US12-09
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 6 hours

**Description**: Create FS-XXX folder structure with origin metadata and atomic ID registry updates.

**Implementation Steps**:
1. Implement `createFeatureFolder()` in fs-id-allocator.ts:
   - Create `.specweave/docs/internal/specs/FS-XXXE/` directory
   - Generate README.md with frontmatter (id, title, origin, external_id, external_url, imported_at, created_at)
   - Add origin badge to content: `**Origin**: 🔗 [GitHub Milestone #42](...)`
   - Add placeholder User Stories section
2. Create `src/living-docs/id-registry.ts`:
   - Define `IDRegistry` class with file-based storage
   - Implement `registerID(fsId, metadata)` with file locking
   - Use `.specweave/.id-registry.json` as storage
3. Implement atomic updates:
   - `acquireLock()` - create lock file before updating
   - `readRegistry()` - read current state
   - Validate no collision in registry
   - Write updated registry atomically
   - `releaseLock()` - remove lock file
4. Add integration tests

**Test Plan**:
- **File**: `tests/integration/living-docs/folder-creation.test.ts`
- **Tests**:
  - **TC-133**: Create FS-XXX folder with metadata
    - Given fsId = FS-042E, workItem with GitHub metadata
    - When createFeatureFolder() called
    - Then folder created with README.md containing all frontmatter fields
  - **TC-134**: Add origin badge to README
    - Given external workItem from GitHub Milestone #42
    - When README generated
    - Then contains: "**Origin**: 🔗 [GitHub Milestone #42](...)"
  - **TC-135**: Atomic ID registration (concurrent access)
    - Given 3 concurrent calls to registerID()
    - When executed in parallel
    - Then only 1 succeeds, others fail with collision error
  - **TC-136**: ID registry prevents collision
    - Given FS-042 already in registry
    - When attempting to register FS-042E
    - Then error: "ID collision: FS-042E conflicts with FS-042"
- **Coverage Target**: 90%+

**Files Affected**:
- `src/living-docs/fs-id-allocator.ts` (modify)
- `src/living-docs/id-registry.ts` (new)
- `.specweave/.id-registry.json` (created at runtime)
- `tests/integration/living-docs/folder-creation.test.ts` (new)

**Dependencies**: T-041

---

### T-043: Integrate FS-ID allocator into external import flow

**User Story**: US-012
**Satisfies ACs**: AC-US12-01, AC-US12-04, AC-US12-05, AC-US12-06
**Status**: [ ] pending
**Priority**: P0 (Critical)
**Estimated Effort**: 5 hours

**Description**: Connect FS-ID allocator to existing external import workflow (T-023, T-024, T-026).

**Implementation Steps**:
1. Update `src/importers/item-converter.ts`:
   - Import `FSIdAllocator` and `IDRegistry`
   - Before creating living docs US files, allocate FS-ID for feature
   - Call `allocator.allocateId(workItem, 'external')`
   - Call `allocator.createFeatureFolder(fsId, workItem)`
   - Register ID: `registry.registerID(fsId, metadata)`
2. Update import flow:
   - Group work items by feature/milestone before processing
   - For each feature group:
     a. Allocate FS-ID chronologically
     b. Create FS-XXX folder
     c. Create US-XXXE files within folder
3. Add logging:
   - Log chronological vs append mode decision
   - Log allocated FS-ID with reasoning
   - Example: "FS-042E allocated (chronological: created 2025-01-15, between FS-040 and FS-050)"
4. Add E2E tests

**Test Plan**:
- **File**: `tests/e2e/external-import-fs-allocation.test.ts`
- **Tests**:
  - **TC-137**: Import external items with chronological allocation
    - Given 3 GitHub milestones (created 2025-01-05, 2025-01-15, 2025-02-01)
    - Given existing FS-010 (2025-01-10), FS-020 (2025-01-20)
    - When import executed
    - Then allocated: FS-011E, FS-016E (or next gap), FS-021E
  - **TC-138**: Import defaults to append when all recent
    - Given existing FS-030 (2025-01-30)
    - When import milestone created 2025-02-05
    - Then allocated: FS-031E (append mode)
  - **TC-139**: Prevent collision during import
    - Given existing FS-042 and FS-042E
    - When import would allocate FS-042
    - Then skips to FS-043E
- **Coverage Target**: 85%+

**Files Affected**:
- `src/importers/item-converter.ts` (modify)
- `tests/e2e/external-import-fs-allocation.test.ts` (new)

**Dependencies**: T-042

---

## User Story: US-013 - Archive Command for Features and Epics

**Linked ACs**: AC-US13-01, AC-US13-02, AC-US13-03, AC-US13-04, AC-US13-05, AC-US13-06, AC-US13-07, AC-US13-08, AC-US13-09, AC-US13-10, AC-US13-11, AC-US13-12
**Tasks**: 3 total, 0 completed

### T-044: Create archive command with feature and epic support

**User Story**: US-013
**Satisfies ACs**: AC-US13-01, AC-US13-02, AC-US13-03, AC-US13-04, AC-US13-05, AC-US13-06
**Status**: [ ] pending
**Priority**: P0 (Critical)
**Estimated Effort**: 8 hours

**Description**: Implement `/specweave:archive` command supporting both feature (cascade) and epic (single US) archiving.

**Implementation Steps**:
1. Create `plugins/specweave/commands/specweave-archive.md`:
   - Define command syntax: `/specweave:archive <type> <id> [--reason=...] [--dry-run]`
   - Document feature and epic archiving behavior
   - Add examples
2. Create `src/cli/commands/archive.ts`:
   - Define `ArchiveOptions` interface (type, id, reason, dryRun)
   - Implement `ArchiveCommand` class
3. Implement `archiveFeature()`:
   - Validate FS-XXX exists in `.specweave/docs/internal/specs/`
   - Scan for all `us-*.md` files in FS-XXX folder
   - Move entire FS-XXX folder to `.specweave/docs/_archive/specs/`
   - Preserve folder structure
4. Implement `archiveEpic()`:
   - Parse epic ID: `SP-FS-047-US-003` → extract FS-047, US-003
   - Validate US file exists
   - Move only specific `us-003*.md` to archive
   - Create archive folder if not exists: `.specweave/docs/_archive/specs/FS-047/`
5. Add archive metadata:
   - Create `.archive-metadata.json` in archived folder
   - Store: archived_at, archived_by, reason, user_stories_count (for features), original_path
6. Add unit tests

**Test Plan**:
- **File**: `tests/unit/cli/archive-command.test.ts`
- **Tests**:
  - **TC-140**: Archive entire feature (cascade)
    - Given FS-042 with 5 User Stories
    - When `/specweave:archive feature FS-042` executed
    - Then entire FS-042/ moved to _archive/specs/FS-042/
  - **TC-141**: Archive single epic
    - Given FS-047 with US-003
    - When `/specweave:archive epic SP-FS-047-US-003` executed
    - Then only us-003*.md moved to _archive/specs/FS-047/
  - **TC-142**: Preserve folder structure in archive
    - Given FS-042/ with nested US folders
    - When archived
    - Then _archive/specs/FS-042/ has identical structure
  - **TC-143**: Add archive metadata
    - Given successful archive
    - When metadata file created
    - Then contains archived_at, archived_by, reason
- **Coverage Target**: 90%+

**Files Affected**:
- `plugins/specweave/commands/specweave-archive.md` (new)
- `src/cli/commands/archive.ts` (new)
- `tests/unit/cli/archive-command.test.ts` (new)

---

### T-045: Add active reference checking and dry-run mode

**User Story**: US-013
**Satisfies ACs**: AC-US13-08, AC-US13-09, AC-US13-11
**Status**: [ ] pending
**Priority**: P1 (Important)
**Estimated Effort**: 6 hours

**Description**: Prevent archiving features/epics referenced by active increments and add dry-run preview mode.

**Implementation Steps**:
1. Implement `findActiveReferences(fsId)`:
   - Scan `.specweave/increments/*/metadata.json` for active status
   - Check if `metadata.epic` field starts with fsId (e.g., SP-FS-042-...)
   - Return array of increment IDs referencing the feature
2. Add validation before archive:
   - If references.length > 0 and !options.force:
     - Block archive with error: "Cannot archive FS-042: Referenced by increments 0050, 0051"
3. Implement `printDryRunPreview()`:
   - Display feature/epic details
   - List User Stories to be archived
   - Calculate total size (KB/MB)
   - Show active increment references (if any)
   - Display confirmation: "Safe to archive" or warning if references exist
4. Update ID registry:
   - Mark FS-ID as "archived" in registry
   - Preserve ID entry (archived IDs remain occupied)
5. Add integration tests

**Test Plan**:
- **File**: `tests/integration/cli/archive-validation.test.ts`
- **Tests**:
  - **TC-144**: Block archive if active increment references feature
    - Given increment 0050 with epic=SP-FS-042-US-001 (active)
    - When `/specweave:archive feature FS-042` executed
    - Then error: "Cannot archive FS-042: Referenced by increments 0050"
  - **TC-145**: Dry-run shows preview without archiving
    - Given FS-042 with 5 USs
    - When `/specweave:archive feature FS-042 --dry-run` executed
    - Then preview printed, no files moved
  - **TC-146**: Update ID registry after archive
    - Given FS-042 archived
    - When registry checked
    - Then FS-042 marked as "archived" (still occupied)
  - **TC-147**: Prevent ID reuse after archive
    - Given FS-042 archived
    - When new feature created
    - Then cannot use FS-042 or FS-042E
- **Coverage Target**: 90%+

**Files Affected**:
- `src/cli/commands/archive.ts` (modify)
- `src/living-docs/id-registry.ts` (modify - add archive status)
- `tests/integration/cli/archive-validation.test.ts` (new)

**Dependencies**: T-044

---

### T-046: Implement restore command and summary report

**User Story**: US-013
**Satisfies ACs**: AC-US13-10, AC-US13-12
**Status**: [ ] pending
**Priority**: P2 (Nice-to-have)
**Estimated Effort**: 4 hours

**Description**: Add `/specweave:restore` command to unarchive features/epics and generate archive summary reports.

**Implementation Steps**:
1. Create `plugins/specweave/commands/specweave-restore.md`:
   - Define syntax: `/specweave:restore <type> <id>`
   - Document restore behavior
2. Implement `restore()` in archive.ts:
   - Validate archived feature exists in `_archive/specs/`
   - Move from `_archive/specs/FS-042/` back to `internal/specs/FS-042/`
   - Update ID registry: change status from "archived" to "active"
   - Log success message
3. Implement `generateSummaryReport()`:
   - Count total archived features
   - Count total archived epics
   - Calculate total archive size (KB/MB/GB)
   - Display: "✅ Archived FS-042 (5 User Stories, 42 KB). Total archived: 8 features, 125 MB."
4. Add integration tests

**Test Plan**:
- **File**: `tests/integration/cli/archive-restore.test.ts`
- **Tests**:
  - **TC-148**: Restore archived feature
    - Given FS-042 in _archive/specs/
    - When `/specweave:restore feature FS-042` executed
    - Then FS-042/ moved back to internal/specs/
  - **TC-149**: Update ID registry on restore
    - Given FS-042 archived
    - When restored
    - Then registry updated: FS-042 status = "active"
  - **TC-150**: Generate archive summary report
    - Given 8 archived features (125 MB total)
    - When summary requested
    - Then output: "Total archived: 8 features, 125 MB"
- **Coverage Target**: 85%+

**Files Affected**:
- `plugins/specweave/commands/specweave-restore.md` (new)
- `src/cli/commands/archive.ts` (modify)
- `tests/integration/cli/archive-restore.test.ts` (new)

**Dependencies**: T-045

---

## Summary

**Total Tasks**: 46
- **US-001**: 4 tasks (Task parser, validation, template, PM agent)
- **US-002**: 3 tasks (AC mapping, cross-reference, orphan detection)
- **US-003**: 5 tasks (Living docs sync, AC checkboxes, hooks, three-permission sync, performance)
- **US-004**: 3 tasks (AC coverage validator, /validate integration, /done validation)
- **US-005**: 4 tasks (Progress tracking, /progress command, frontmatter, visualization)
- **US-006**: 3 tasks (Migration script, dry-run mode, proof-of-concept migration)
- **US-007**: 5 tasks (External importers, init integration, item conversion, config) 🆕
- **US-008**: 4 tasks (ID generator, parser updates, validation, legacy preservation) 🆕
- **US-009**: 3 tasks (Origin metadata, three-permission architecture, living docs badges) 🆕
- **US-010**: 2 tasks (Import command, sync metadata, duplicate detection) 🆕
- **US-011**: 4 tasks (Repo selector, pattern matching, preview, init integration) 🆕
- **US-012**: 3 tasks (FS-ID allocator, folder creation, import integration) 🆕
- **US-013**: 3 tasks (Archive command, validation/dry-run, restore) 🆕

**Estimated Effort**: 15-19 days (264 hours total)

**Original Scope**: 22 tasks, 110 hours (US-001 through US-006)
**Three-Permission Sync Scope**: +12 tasks, +73 hours (US-007 through US-009)
**External Import Command**: +2 tasks, +18 hours (US-010) - Critical for ongoing brownfield sync
**Multi-Repo Selection**: +4 tasks, +25 hours (US-011) - Intelligent GitHub integration for multi-repo orgs
**Chronological FS-ID Allocation**: +3 tasks, +21 hours (US-012) - Timeline-aware folder creation
**Archive Command**: +3 tasks, +18 hours (US-013) - Feature/epic archiving with metadata

**Critical Path** (P0 tasks):
- **Phase 1 (Original)**: T-001 → T-003 → T-008 → T-009 → T-010 → T-013 → T-014 → T-015 (8 tasks, ~40 hours)
- **Phase 2 (Three-Permission Sync)**: T-023 → T-024 → T-025 → T-026 → T-028 → T-029 → T-032 → T-033 (8 tasks, ~54 hours)
- **Phase 3 (Multi-Repo)**: T-037 → T-038 → T-039 → T-040 (4 tasks, ~25 hours)
- **Phase 4 (FS-ID & Archive)**: T-041 → T-042 → T-043 → T-044 → T-045 (5 tasks, ~35 hours)

**Success Criteria**:
- All 46 tasks completed
- All tests passing (95% unit, 85% integration, 90% E2E)
- Migration successful for 4 existing increments
- Living docs show actual task lists (no "No tasks defined")
- AC coverage validation working
- **External import functional** (GitHub, JIRA, ADO)
- **ID collision resolution working** (E suffix for external items)
- **Origin tracking complete** (three-permission architecture operational)
- **Multi-repo selection working** (4 strategies: org, personal, pattern, explicit)
- **GitHub init flow seamless** (detect → select → preview → confirm → import)
- **Chronological FS-ID allocation working** (timeline-aware folder creation with gap insertion)
- **Archive/restore commands functional** (feature cascade, epic individual, dry-run mode)
- **ID registry prevents reuse** (archived IDs remain occupied indefinitely)
- Documentation updated (CLAUDE.md, CONTRIBUTING.MD, MIGRATION_GUIDE.md)

---

**This tasks.md demonstrates the EXACT hierarchical format being implemented - "dog fooding" at its best!**

**ARCHITECTURAL NOTES**:

### Three-Permission Sync Architecture
This increment now includes **complete three-permission sync** architecture (v0.24.0), enabling SpecWeave adoption in brownfield projects with existing external tool data (GitHub issues, JIRA epics, ADO work items). This is a **fundamental requirement** for real-world usage, not a nice-to-have feature.

**Sync Direction Rules**:
1. **Increment → Living Docs**: ALWAYS one-way (immutable - external tools cannot write back to active increments)
2. **Living Docs ↔ External Tool**: Configurable via three independent permissions

**Three Permissions** (all default: FALSE for safety):
- **canUpsertInternalItems**: Allow external tools to CREATE + UPDATE internal items (SpecWeave-created work)
- **canUpdateExternalItems**: Allow SpecWeave to UPDATE external items (tool-created work, full content updates)
- **canUpdateStatus**: Allow status updates (both internal and external items)

**Permission Combinations**:
- **Default (all=false)**: Read-only sync, no data changes
- **Import mode (canUpsertInternalItems=true)**: External tool → SpecWeave only
- **Export mode (canUpdateExternalItems=true)**: SpecWeave → External tool only
- **Full sync (all=true)**: Both directions, requires conflict detection (higher risk)

### Multi-Project Import Detection
External import (T-023, T-024, T-025) **MUST** detect SpecWeave project structure based on platform:
- **GitHub**: Multi-repo detection - prompt user for single/multi repos, repo names as project IDs
- **Azure DevOps**: Single project with boards or area paths
- **JIRA**: Based on JIRA project structure

### External ID Mapping (CRITICAL)
**REQUIREMENT**: ALWAYS preserve exact mapping between SpecWeave IDs and external tool work item IDs.
- **Storage**: `external_id` field in metadata (e.g., `external_id: GH-#638`, `external_id: JIRA-SPEC-789`)
- **Purpose**: Bidirectional traceability for sync operations
- **Immutability**: Once created, external_id CANNOT change
- **Implementation**: See T-026 (item conversion), T-032 (origin metadata)

**Example Mapping**:
```yaml
# spec.md frontmatter
external_items:
  - id: US-004E              # SpecWeave ID (with E suffix)
    origin: external
    source: github
    external_id: GH-#638     # External tool ID (EXACT mapping)
    external_url: https://github.com/owner/repo/issues/638
    imported_at: 2025-11-19T10:30:00Z
```
