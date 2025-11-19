---
total_tasks: 22
completed: 13
by_user_story:
  US-001: 4
  US-002: 3
  US-003: 5
  US-004: 3
  US-005: 4
  US-006: 3
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

### T-011: Implement bidirectional sync (tasks.md ↔ living docs)

**User Story**: US-003
**Satisfies ACs**: AC-US3-05
**Status**: [ ] pending
**Priority**: P1 (Important)
**Estimated Effort**: 6 hours

**Description**: Enable bidirectional synchronization so changes in living docs can update tasks.md (future enhancement).

**Implementation Steps**:
1. Create sync-from-living-docs.js hook
2. Detect changes in living docs AC checkboxes
3. Update corresponding tasks.md status
4. Add conflict resolution (what if both changed?)
5. Add E2E tests

**Test Plan**:
- **File**: `tests/e2e/bidirectional-sync.test.ts` (new)
- **Tests**:
  - **TC-031**: Sync AC checkbox → task status
    - Given living docs AC checkbox checked manually
    - When sync-from-living-docs executed
    - Then corresponding task marked completed in tasks.md
  - **TC-032**: Detect sync conflicts
    - Given both tasks.md and living docs changed
    - When sync attempted
    - Then conflict reported, manual resolution required
- **Coverage Target**: 85%+

**Files Affected**:
- `plugins/specweave/lib/hooks/sync-from-living-docs.js` (new)
- `tests/e2e/bidirectional-sync.test.ts` (new)

**Dependencies**: T-008, T-009

---

### T-012: Add sync performance optimization

**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Status**: [ ] pending
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
**Status**: [ ] pending
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
**Status**: [ ] pending
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
**Status**: [ ] pending
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
**Status**: [ ] pending
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
**Status**: [ ] pending
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
**Status**: [ ] pending
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
**Status**: [ ] pending
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

## Summary

**Total Tasks**: 22
- **US-001**: 4 tasks (Task parser, validation, template, PM agent)
- **US-002**: 3 tasks (AC mapping, cross-reference, orphan detection)
- **US-003**: 5 tasks (Living docs sync, AC checkboxes, hooks, bidirectional, performance)
- **US-004**: 3 tasks (AC coverage validator, /validate integration, /done validation)
- **US-005**: 4 tasks (Progress tracking, /progress command, frontmatter, visualization)
- **US-006**: 3 tasks (Migration script, dry-run mode, proof-of-concept migration)

**Estimated Effort**: 5-8 days (110 hours total)

**Critical Path** (P0 tasks): T-001 → T-003 → T-008 → T-009 → T-010 → T-013 → T-014 → T-015 (8 tasks, ~40 hours)

**Success Criteria**:
- All 22 tasks completed
- All tests passing (95% unit, 85% integration, 90% E2E)
- Migration successful for 4 existing increments
- Living docs show actual task lists (no "No tasks defined")
- AC coverage validation working
- Documentation updated (CLAUDE.md, CONTRIBUTING.md)

---

**This tasks.md demonstrates the EXACT hierarchical format being implemented - "dog fooding" at its best!**
