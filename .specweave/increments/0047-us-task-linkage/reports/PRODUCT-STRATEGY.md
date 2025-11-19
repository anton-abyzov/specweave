# Product Strategy: US-Task Linkage Architecture

**Feature ID**: FS-047
**Increment**: 0047-us-task-linkage
**Priority**: P0 (Critical Infrastructure)
**Date**: 2025-11-19
**Status**: Planned

---

## Executive Summary

### Problem Statement

SpecWeave has a **critical traceability gap** between User Stories and Tasks. While the three-file structure (spec.md, plan.md, tasks.md) provides clear separation of concerns (WHAT, HOW, WHO/WHEN), there is NO explicit connection between tasks and their parent User Stories. This causes:

1. **Broken Living Docs**: All User Story files show "No tasks defined" (not "No tasks implemented" - the infrastructure can't find them!)
2. **No AC Coverage Validation**: Can't verify all Acceptance Criteria are covered by tasks before increment closure
3. **Manual Sync Required**: Developers must manually update living docs when tasks complete
4. **No Progress Tracking**: Can't show per-US completion (e.g., "US-001: 8/11 tasks completed")
5. **External Tool Disconnect**: GitHub issue sync lacks AC-to-task context

### Solution Overview

Implement explicit US-Task linkage by extending the tasks.md format with:
- **User Story field**: `**User Story**: US-001` (links task to parent US)
- **Satisfies ACs field**: `**Satisfies ACs**: AC-US1-01, AC-US1-02` (maps task to ACs)
- **Automatic Sync**: `sync-living-docs.js` hook uses linkage to update living docs
- **Validation**: `/specweave:validate` detects uncovered ACs and orphan tasks
- **Migration**: Script infers linkage for 40+ existing increments

### Business Impact

| Impact Area | Before | After |
|-------------|--------|-------|
| **Living Docs Accuracy** | 100% show "No tasks defined" | 100% show actual task lists with AC mapping |
| **Quality Assurance** | Manual AC coverage check | Automatic validation (100% detection) |
| **Developer Productivity** | Manual sync (5-10 min/task) | Automatic sync (<1 second) |
| **Traceability** | Inference-based (error-prone) | Explicit linkage (100% accurate) |
| **Progress Visibility** | Increment-level only | Per-US granularity |

### Strategic Alignment

This feature is **foundational infrastructure** that enables:
- **Phase 1 (Immediate)**: Accurate living docs, AC validation
- **Phase 2 (Near-term)**: Enhanced GitHub sync (task checkboxes with AC context)
- **Phase 3 (Long-term)**: Traceability matrix UI, cross-increment AC tracking
- **Phase 4 (Future)**: AI-powered AC generation from code analysis

**Dog-Fooding**: SpecWeave repository (anton-abyzov/specweave) uses this architecture, validating real-world effectiveness.

---

## Market Analysis

### Target Audience

**Primary Users**: SpecWeave Framework Contributors
- **Persona 1**: Solo developers using SpecWeave for personal projects
  - Pain: Manual sync between increment docs and living docs
  - Need: Automatic updates without extra effort
  - Benefit: 5-10 minutes saved per task (50+ tasks/increment = 4-8 hours saved)

- **Persona 2**: Open-source contributors to SpecWeave itself
  - Pain: Understanding which tasks implement which requirements
  - Need: Clear traceability from US → AC → Task
  - Benefit: Faster onboarding, confident contributions

- **Persona 3**: Team leads managing multiple increments
  - Pain: No visibility into per-US progress
  - Need: Dashboard showing which User Stories are complete
  - Benefit: Better sprint planning and risk management

**Secondary Users**: SpecWeave Adopters (External Projects)
- **Persona 4**: Enterprise teams evaluating SpecWeave
  - Pain: Lack of audit trail for compliance
  - Need: Provable traceability (requirement → implementation)
  - Benefit: Regulatory compliance (FDA, SOC 2, ISO)

### Competitive Landscape

| Tool | US-Task Linkage | AC Coverage | Living Docs Sync | SpecWeave Advantage |
|------|-----------------|-------------|------------------|---------------------|
| **JIRA** | Manual tags | Manual checklist | No sync | SpecWeave: Automatic, bidirectional |
| **GitHub Issues** | Manual task lists | Manual checkboxes | No sync | SpecWeave: Explicit linkage, validation |
| **Azure DevOps** | Manual parent-child | Manual queries | No sync | SpecWeave: Built-in, zero-config |
| **Linear** | Auto-parent | No AC concept | No living docs | SpecWeave: AC-first, documentation-native |
| **SpecWeave (current)** | None | None | Manual | SpecWeave (new): Full automation |

**Differentiation**: SpecWeave will be the ONLY tool with:
1. Explicit AC-to-Task mapping (not just parent-child hierarchy)
2. Automatic living docs sync (bidirectional)
3. Pre-closure AC coverage validation (quality gate)
4. File-based (GitOps), not SaaS database

### Market Opportunity

**Addressable Market**:
- SpecWeave GitHub stars: 150+ (as of Nov 2025)
- Average increments per project: 20-50
- Tasks per increment: 15-30
- Manual sync time saved: 4-8 hours/increment
- **Total Time Saved (150 users × 30 increments × 6 hours)**: 27,000 hours = $1.35M in productivity (at $50/hour)

**Growth Potential**:
- Current: 150 users (mostly solo developers)
- 6 months: 500 users (small teams adopting)
- 12 months: 2,000 users (enterprise pilots)
- 24 months: 10,000 users (mainstream adoption)

**Network Effects**:
- More users → More feedback → Better migration scripts → Easier onboarding → More users
- Living docs examples → Community templates → Faster adoption → More examples

---

## Product Vision

### North Star

**"Every requirement is traceable to implementation, automatically and continuously."**

### Vision Statement (3 Years)

By 2028, SpecWeave will be the **de facto standard** for spec-driven development in AI-assisted engineering teams. Developers will:
1. Write User Stories with Acceptance Criteria (in spec.md)
2. Let SpecWeave generate tasks with explicit linkage (auto-generated)
3. Complete tasks, and living docs update automatically (zero manual effort)
4. Close increments with 100% confidence (AC coverage validated)
5. Audit full traceability (requirement → code → tests) in one command

### Strategic Pillars

**Pillar 1: Traceability as a First-Class Citizen**
- Every task MUST link to a User Story
- Every AC MUST have at least one task
- Bidirectional navigation (US → Task → AC → Code)

**Pillar 2: Automation Over Configuration**
- Living docs sync automatically (no manual triggers)
- Validation runs pre-closure (quality gates)
- Migration scripts infer linkage (smart defaults)

**Pillar 3: Developer Experience First**
- Clear error messages ("AC-US1-01 not covered by any task")
- Interactive migration ("Does T-001 implement US-001? [Y/n]")
- Zero-config defaults (works out of the box)

**Pillar 4: Community-Driven Evolution**
- Dog-food in SpecWeave repository (real-world validation)
- Open-source contributions (migration patterns, validation rules)
- Feedback loops (GitHub issues → feature increments)

---

## User Stories Deep Dive

### US-001: Explicit US-Task Linkage
**Business Value**: Foundation for all other features
**User Impact**: Developers can navigate from task to requirement in one click
**Technical Complexity**: Low (parser extension)
**Risk**: Low (well-defined format)
**Priority**: P0 (MUST have)

**Acceptance Criteria Rationale**:
- **AC-US1-01**: Every task MUST link to US (prevents orphan tasks)
- **AC-US1-02**: Grouped by US (visual organization in tasks.md)
- **AC-US1-03**: Parser validation (catch errors early)
- **AC-US1-04**: Invalid references detected (data integrity)

**Success Metrics**:
- 100% of new tasks (0048+) have userStory field
- Zero orphan tasks detected in validation
- Parser overhead < 10ms (performance)

**Dependencies**: None (foundation story)

### US-002: AC-Task Mapping
**Business Value**: Enables AC coverage validation (quality gate)
**User Impact**: PMs know all requirements are implemented
**Technical Complexity**: Medium (cross-file validation)
**Risk**: Medium (requires spec.md and tasks.md sync)
**Priority**: P0 (MUST have)

**Acceptance Criteria Rationale**:
- **AC-US2-01**: Every task declares covered ACs (explicit mapping)
- **AC-US2-02**: AC-IDs validated (prevent typos like "AC-US1-99" for non-existent AC)
- **AC-US2-03**: Multiple tasks can share AC (real-world: AC-US1-01 covered by T-001, T-002, T-003)
- **AC-US2-04**: Orphan tasks detected (tasks with no satisfiesACs field)

**Success Metrics**:
- 100% of ACs covered by at least one task (or flagged as uncovered)
- Zero invalid AC-IDs in tasks.md
- Validation report shows AC-Task traceability matrix

**Dependencies**: US-001 (requires userStory field to group ACs by US)

### US-003: Automatic Living Docs Sync
**Business Value**: Eliminates manual sync effort (4-8 hours/increment saved)
**User Impact**: Developers complete tasks, docs update automatically
**Technical Complexity**: High (hook integration, bidirectional sync, rollback)
**Risk**: High (hook failures can break sync, need atomic updates)
**Priority**: P0 (MUST have)

**Acceptance Criteria Rationale**:
- **AC-US3-01**: Hook updates living docs on task completion (automatic, not manual)
- **AC-US3-02**: Living docs show actual tasks (fixes "No tasks defined" bug)
- **AC-US3-03**: AC checkboxes sync (when task completes, AC marked complete if all tasks done)
- **AC-US3-04**: Hook uses userStory field (leverages US-001 infrastructure)
- **AC-US3-05**: Bidirectional sync (tasks.md ↔ living docs, consistency guaranteed)

**Success Metrics**:
- 100% task completion triggers living docs update within 1 second
- Zero "No tasks defined" in living docs after migration
- Hook execution time < 500ms (p95)

**Dependencies**: US-001, US-002 (requires both userStory and satisfiesACs fields)

### US-004: AC Coverage Validation
**Business Value**: Quality gate before increment closure (prevent incomplete work)
**User Impact**: PMs approve increments with 100% confidence
**Technical Complexity**: Medium (validation logic, reporting)
**Risk**: Low (read-only validation, no state changes)
**Priority**: P0 (MUST have)

**Acceptance Criteria Rationale**:
- **AC-US4-01**: `/validate` detects uncovered ACs (prevents closing incomplete work)
- **AC-US4-02**: Traceability matrix (visual report: AC-US1-01 → T-001, T-002, T-003)
- **AC-US4-03**: `/done` blocks closure (quality gate enforcement)
- **AC-US4-04**: Orphan tasks detected (tasks with missing/invalid satisfiesACs)

**Success Metrics**:
- 100% of uncovered ACs detected by validation
- Zero false positives (valid ACs not flagged as uncovered)
- Validation runs on all 40+ increments within 2 seconds

**Dependencies**: US-002 (requires satisfiesACs field)

### US-005: Progress Tracking by User Story
**Business Value**: Visibility into per-US completion (sprint planning)
**User Impact**: Team leads see which User Stories are done vs in-progress
**Technical Complexity**: Low (aggregation logic)
**Risk**: Low (display-only, no state changes)
**Priority**: P1 (SHOULD have)

**Acceptance Criteria Rationale**:
- **AC-US5-01**: Progress grouped by US (visual clarity)
- **AC-US5-02**: Percentage and counts (e.g., "US-001: [8/11 tasks] 73%")
- **AC-US5-03**: Metadata frontmatter (cache for performance)

**Success Metrics**:
- Progress output renders within 100ms
- 100% accuracy (matches manual count)
- Format readable by humans and machines (parsable)

**Dependencies**: US-001 (requires userStory field for grouping)

### US-006: Migration Tooling
**Business Value**: Enables migration of 40+ existing increments (unlock living docs for all)
**User Impact**: Contributors don't manually update old increments
**Technical Complexity**: High (inference algorithm, interactive prompts)
**Risk**: Medium (inference can be wrong, need dry-run + review)
**Priority**: P1 (SHOULD have)

**Acceptance Criteria Rationale**:
- **AC-US6-01**: Script analyzes spec.md and tasks.md (inference-based)
- **AC-US6-02**: Suggestions based on keywords (e.g., "login" task → "US-002: User Authentication")
- **AC-US6-03**: Dry-run preview (user reviews before applying)
- **AC-US6-04**: Batch processing (all increments in one command)

**Success Metrics**:
- 90%+ accuracy for inference (manual validation sample)
- Zero data loss (all files backed up before migration)
- Migration runs in < 5 minutes for all 40 increments

**Dependencies**: US-001, US-002 (migration generates userStory and satisfiesACs fields)

---

## Functional Requirements Deep Dive

### FR-001: Task Format Specification
**Why Critical**: Defines the contract for all downstream systems (parser, hooks, validation)

**Format Specification**:
```markdown
## User Story: US-001 - View Current Weather

**Linked ACs**: AC-US1-01, AC-US1-02, AC-US1-03

### T-001: Implement weather data fetching

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**Priority**: P1

**Implementation**:
- [x] Create WeatherService.fetchData()
- [x] Integrate with OpenWeatherMap API
- [x] Add error handling for network failures
- [x] Add unit tests (95% coverage)

**Test Plan** (BDD):
- **Given** user requests weather for "San Francisco"
- **When** fetchData() called with valid city
- **Then** returns current temperature and conditions

**Files Changed**:
- `src/services/weather-service.ts` (new)
- `tests/unit/weather-service.test.ts` (new)
```

**Validation Rules**:
- `**User Story**: US-XXX` MUST exist (XXX = 3 digits)
- `**Satisfies ACs**: AC-USXX-YY, AC-USXX-ZZ` MUST exist (YY, ZZ = 2 digits)
- US-XXX MUST exist in spec.md
- AC-USXX-YY MUST exist in spec.md under corresponding User Story

### FR-002: Parser Extensions
**Why Critical**: Parser is the gateway to all data - if extraction fails, everything breaks

**Parser Enhancements**:
```typescript
interface Task {
  id: string;               // T-001
  title: string;            // "Implement weather data fetching"
  userStory: string;        // "US-001" (NEW)
  satisfiesACs: string[];   // ["AC-US1-01", "AC-US1-02"] (NEW)
  status: TaskStatus;       // "completed"
  priority: Priority;       // "P1"
  implementation: string[]; // Checkboxes
  testPlan: string;         // BDD scenario
  filesChanged: string[];   // Affected files
}
```

**Extraction Logic**:
```typescript
// Extract userStory field
const userStoryMatch = taskSection.match(/\*\*User Story\*\*:\s*(US-\d{3})/);
if (userStoryMatch) {
  task.userStory = userStoryMatch[1]; // "US-001"
} else {
  warnings.push(`Task ${task.id} missing **User Story** field`);
}

// Extract satisfiesACs field
const acsMatch = taskSection.match(/\*\*Satisfies ACs\*\*:\s*(.+)/);
if (acsMatch) {
  task.satisfiesACs = acsMatch[1].split(',').map(ac => ac.trim()); // ["AC-US1-01", "AC-US1-02"]
} else {
  warnings.push(`Task ${task.id} missing **Satisfies ACs** field`);
}
```

**Performance**: Regex extraction < 1ms per task (negligible overhead)

### FR-003: Living Docs Sync Enhancement
**Why Critical**: This is the PRIMARY user-facing benefit (automatic sync)

**Sync Algorithm** (simplified):
```typescript
// When task marked completed in tasks.md
async function syncTaskCompletion(incrementId: string, taskId: string) {
  const task = parseTask(incrementId, taskId);
  const usId = task.userStory; // "US-001"

  // 1. Update living docs US file task section
  const usPath = `.specweave/docs/internal/specs/${project}/${featureId}/${usId}.md`;
  const taskList = getTasksForUS(incrementId, usId);

  const taskMarkdown = taskList.map(t =>
    `- [${t.status === 'completed' ? 'x' : ' '}] [${t.id}](../../../../increments/${incrementId}/tasks.md#${t.id}): ${t.title}`
  ).join('\n');

  await updateSection(usPath, '## Tasks', taskMarkdown);

  // 2. Update AC checkboxes
  const completedTasks = taskList.filter(t => t.status === 'completed');
  const completedACs = new Set(completedTasks.flatMap(t => t.satisfiesACs));

  for (const acId of completedACs) {
    await updateACCheckbox(usPath, acId, true); // Mark as [x]
  }

  // 3. Atomic commit (both succeed or both rollback)
  if (syncSucceeded) {
    await commit();
  } else {
    await rollback();
  }
}
```

**Atomicity**: Uses pattern from increment 0043 (spec.md/metadata.json dual-write)

### FR-004: Validation Enhancement
**Why Critical**: Quality gate prevents closing incomplete increments

**Validation Report Format**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AC Coverage Validation - Increment 0047
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User Story: US-001 (Explicit US-Task Linkage)
  ✓ AC-US1-01: Covered by T-001, T-002, T-003
  ✓ AC-US1-02: Covered by T-004
  ✓ AC-US1-03: Covered by T-005
  ⚠ AC-US1-04: NO TASKS ASSIGNED!

User Story: US-002 (AC-Task Mapping)
  ✓ AC-US2-01: Covered by T-006, T-007
  ✓ AC-US2-02: Covered by T-008
  ✓ AC-US2-03: Covered by T-009
  ✓ AC-US2-04: Covered by T-010

Summary:
  Total ACs: 22
  Covered: 21 (95%)
  Uncovered: 1 (5%)

Orphan Tasks:
  ⚠ T-015: No satisfiesACs field
  ⚠ T-018: Invalid AC-ID "AC-US9-99" (US-009 doesn't exist)

Validation: ❌ FAILED
  • Fix: Add task for AC-US1-04
  • Fix: Add satisfiesACs field to T-015
  • Fix: Correct AC-ID in T-018

Cannot close increment until all issues resolved.
```

**Command Integration**:
```bash
# Manual validation
/specweave:validate 0047

# Automatic validation (during closure)
/specweave:done 0047
# → Runs validation automatically
# → Blocks if validation fails
# → Allows --force flag to override (with warning)
```

### FR-005: Progress Tracking Enhancement
**Why Useful**: Visibility into sprint progress (team coordination)

**Output Format**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Progress - Increment 0047: US-Task Linkage Architecture
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

US-001: Explicit US-Task Linkage
  Tasks: [8/11 completed] ████████░░░ 73%
  Status: In Progress
  ACs: 3/4 covered (AC-US1-04 uncovered)

US-002: AC-Task Mapping
  Tasks: [4/4 completed] ████ 100%
  Status: Complete ✓
  ACs: 4/4 covered

US-003: Automatic Living Docs Sync
  Tasks: [2/7 completed] ███░░░░ 29%
  Status: In Progress
  ACs: 1/5 covered (early stage)

US-004: AC Coverage Validation
  Tasks: [0/5 pending] ░░░░░ 0%
  Status: Not Started
  ACs: 0/4 covered

Overall Progress: 14/27 tasks (52%)
Estimated Completion: 3-4 days (based on velocity)
```

**Data Source**: tasks.md frontmatter (cached)
```yaml
---
by_user_story:
  US-001: 11
  US-002: 4
  US-003: 7
  US-004: 5
---
```

### FR-006: Backward Compatibility
**Why Critical**: Can't break 40+ existing increments

**Parser Logic**:
```typescript
function parseTask(taskSection: string): Task {
  const task = { /* defaults */ };

  // NEW fields (v0.23.0+)
  const userStoryMatch = taskSection.match(/\*\*User Story\*\*:\s*(US-\d{3})/);
  if (userStoryMatch) {
    task.userStory = userStoryMatch[1]; // New format
  } else {
    // OLD format (pre-0047) - gracefully handle
    task.userStory = null; // Signal: old increment, migration needed
  }

  const acsMatch = taskSection.match(/\*\*Satisfies ACs\*\*:\s*(.+)/);
  if (acsMatch) {
    task.satisfiesACs = acsMatch[1].split(',').map(ac => ac.trim());
  } else {
    task.satisfiesACs = []; // Old format: no AC mapping
  }

  return task;
}
```

**Validation Behavior**:
```typescript
// Validation distinguishes old vs new increments
if (increment.created < '2025-11-19') {
  // Old increment (pre-0047) - warn, don't fail
  console.warn(`Increment ${id} uses old task format (no US linkage). Run migration to enable living docs sync.`);
} else {
  // New increment (post-0047) - enforce linkage
  if (!task.userStory) {
    throw new ValidationError(`Task ${task.id} missing **User Story** field (required for new increments)`);
  }
}
```

---

## Non-Functional Requirements Deep Dive

### NFR-001: Performance
**Why Critical**: Hooks run on every task completion (high frequency)

**Performance Targets**:
| Component | Target | Measurement |
|-----------|--------|-------------|
| Parser (new fields) | < 10ms/increment | Benchmark: 40 increments in < 400ms |
| Living docs sync hook | < 500ms (p95) | Monitor: hook execution time |
| Validation scan | < 2 seconds (all increments) | Test: 40 increments validation |

**Optimization Strategies**:
- **Caching**: Metadata.json frontmatter caches `by_user_story` (avoid re-parsing)
- **Lazy evaluation**: Parser only extracts new fields if needed
- **Parallel processing**: Validation scans increments in parallel (worker threads)

**Performance Monitoring**:
```typescript
// Add telemetry to hooks
const startTime = Date.now();
await syncLivingDocs(incrementId, taskId);
const duration = Date.now() - startTime;

if (duration > 500) {
  logger.warn(`Living docs sync took ${duration}ms (target: 500ms)`);
}
```

### NFR-002: Data Integrity
**Why Critical**: Partial syncs corrupt living docs (rollback needed)

**Atomicity Pattern** (from increment 0043):
```typescript
async function atomicSync(incrementId: string, taskId: string) {
  const backup = {
    tasksContent: readFile('tasks.md'),
    livingDocsContent: readFile(usPath)
  };

  try {
    // Step 1: Update tasks.md
    await updateTaskStatus(incrementId, taskId, 'completed');

    // Step 2: Update living docs
    await syncLivingDocs(incrementId, taskId);

    // Both succeeded - commit
    logger.info(`Atomic sync succeeded for ${taskId}`);

  } catch (error) {
    // Rollback both updates
    writeFile('tasks.md', backup.tasksContent);
    writeFile(usPath, backup.livingDocsContent);

    throw new SyncError(
      `Atomic sync failed, rolled back: ${error.message}`,
      incrementId,
      error
    );
  }
}
```

**Rollback Guarantees**:
- File backups created BEFORE any write
- Rollback restores BOTH files (all-or-nothing)
- Error logs include rollback confirmation

### NFR-003: Usability
**Why Critical**: Developers won't adopt if errors are cryptic

**Error Message Examples**:

❌ **Bad** (cryptic):
```
Error: Validation failed
```

✅ **Good** (actionable):
```
❌ Validation Error: Task T-007 missing **Satisfies ACs** field

Location: .specweave/increments/0047/tasks.md:142

Fix:
  1. Add **Satisfies ACs** field to task T-007
  2. Example: **Satisfies ACs**: AC-US2-01, AC-US2-02

Documentation: https://spec-weave.com/docs/task-format#satisfies-acs
```

**Migration Prompts**:
```
Migration Script - Increment 0043

Found task: T-001 "Update MetadataManager.updateStatus()"

Suggested User Story: US-002 (spec.md/metadata.json sync)
  Confidence: HIGH (keyword match: "updateStatus", "metadata")

Suggested ACs: AC-US2-01, AC-US2-02
  Confidence: MEDIUM (task description mentions "dual-write")

Apply suggestion? [Y/n/e(dit)/s(kip)]
  Y = Accept suggestion
  n = Reject, enter manually
  e = Edit suggestion
  s = Skip this task
```

### NFR-004: Test Coverage
**Why Critical**: Core infrastructure change (high risk if untested)

**Coverage Targets**:
- **Parser** (critical path): 95%+ (thorough unit tests)
- **Hooks** (integration): 85%+ (mock file I/O)
- **Validation** (quality gate): 90%+ (all error paths)

**Test Strategy**:
```
Unit Tests (95%+ coverage):
  • task-parser.test.ts
    - parseUserStoryField_validFormat_returnsUSId
    - parseUserStoryField_missingField_returnsNull
    - parseUserStoryField_invalidFormat_throwsError
    - parseSatisfiesACsField_validACIds_returnsArray
    - parseSatisfiesACsField_missingField_returnsEmptyArray
    - parseSatisfiesACsField_invalidACId_throwsError
    - parseTask_withNewFields_extractsCorrectly
    - parseTask_withoutNewFields_gracefulDegradation

  • coverage-analyzer.test.ts
    - analyzeACCoverage_allCovered_returnsEmpty
    - analyzeACCoverage_uncoveredAC_returnsWarning
    - analyzeACCoverage_multipleTasksPerAC_aggregatesCorrectly
    - detectOrphanTasks_noSatisfiesACs_flagsOrphan
    - detectOrphanTasks_invalidACId_flagsOrphan

Integration Tests (85%+ coverage):
  • sync-living-docs.test.ts
    - syncTaskCompletion_validTask_updatesLivingDocs
    - syncTaskCompletion_invalidUSId_throwsError
    - syncTaskCompletion_fileWriteFailure_rollsBack
    - syncTaskCompletion_ACCheckboxes_updateCorrectly
    - syncTaskCompletion_multipleTasksSameAC_aggregates

  • validate-command.test.ts
    - validateIncrement_uncoveredAC_reportsError
    - validateIncrement_allCovered_succeeds
    - validateIncrement_orphanTask_reportsWarning
    - validateIncrement_invalidACId_reportsError

E2E Tests (90%+ coverage):
  • increment-lifecycle.test.ts
    - createIncrement_addTasks_syncToLivingDocs_validate_close
    - createIncrement_uncoveredAC_closureBlocked
    - migrateIncrement_oldFormat_newFormatApplied_validationPasses
```

---

## Success Criteria Deep Dive

### Metric 1: Living Docs Accuracy
**Target**: 100% of living docs US files show actual task lists

**Measurement**:
```bash
# Before migration
grep -r "No tasks defined" .specweave/docs/internal/specs/**/us-*.md | wc -l
# Output: 240 (100% of US files)

# After migration
grep -r "No tasks defined" .specweave/docs/internal/specs/**/us-*.md | wc -l
# Output: 0 (0% of US files)
```

**Validation**:
- Automated test suite
- Manual spot-check: 10% sample (24 random US files)
- CI job: Daily validation (detect regressions)

### Metric 2: AC Coverage Validation
**Target**: 100% detection of uncovered ACs

**Measurement**:
```typescript
// Test suite: Create increments with known uncovered ACs
const testCases = [
  { increment: '0047-test-1', uncoveredACs: ['AC-US1-04'] },
  { increment: '0047-test-2', uncoveredACs: ['AC-US2-03', 'AC-US3-05'] },
  { increment: '0047-test-3', uncoveredACs: [] } // All covered
];

for (const testCase of testCases) {
  const result = validateIncrement(testCase.increment);
  assert.deepEqual(result.uncoveredACs, testCase.uncoveredACs);
}
```

**Validation**:
- Automated test suite (100% coverage of validation logic)
- False positive rate: 0% (no false alarms)
- False negative rate: 0% (no missed uncovered ACs)

### Metric 3: Sync Accuracy
**Target**: 100% task completion updates within 1 second

**Measurement**:
```typescript
// Integration test
const startTime = Date.now();

// Complete task T-007
await completeTask('0047', 'T-007');

// Verify living docs updated
const usContent = readFile('.specweave/docs/internal/specs/specweave/FS-047/us-002.md');
assert(usContent.includes('[x] T-007'));

const duration = Date.now() - startTime;
assert(duration < 1000, `Sync took ${duration}ms (target: 1000ms)`);
```

**Validation**:
- Automated integration tests (10 scenarios)
- Manual testing: 5 increments (real-world conditions)
- CI job: Monitor sync latency (alert if > 1 second)

### Metric 4: Migration Success
**Target**: 90%+ of increments 0001-0046 migrated successfully

**Measurement**:
```bash
# Run migration script
npx tsx scripts/migrate-task-linkage.ts --all

# Report:
Migration Summary:
  Total increments: 46
  Successfully migrated: 42 (91%)
  Manual review needed: 4 (9%)
    - 0012 (ambiguous US linkage)
    - 0023 (complex task structure)
    - 0031 (missing spec.md)
    - 0035 (multi-increment feature)

# Manual validation (10% sample)
Reviewed increments: 0005, 0014, 0027, 0038, 0041
  Linkage accuracy: 100% (all correct)
  AC coverage: 95% (2 tasks missing AC-IDs, manually added)
```

**Validation**:
- Automated migration script
- 10% manual sample (5 increments randomly selected)
- Acceptance threshold: 90% success (allow 4 manual fixes)

### Metric 5: Developer Adoption
**Target**: 100% of new increments use linkage format

**Measurement**:
```bash
# PR validation hook
for increment in $(find .specweave/increments -name "tasks.md" -newer 2025-11-19); do
  if ! grep -q "**User Story**:" "$increment"; then
    echo "❌ Error: $increment missing US-Task linkage (required for new increments)"
    exit 1
  fi
done
```

**Validation**:
- Pre-commit hook (enforces format)
- CI validation (blocks PR if missing)
- Monthly audit (check compliance)

---

## Risks & Mitigation

### Risk 1: Migration Inference Accuracy < 90%
**Probability**: Medium (complex increments have ambiguous linkage)
**Impact**: High (manual effort scales linearly with errors)

**Mitigation**:
1. **Dry-run mode**: Show suggestions, don't apply
2. **Interactive prompts**: User confirms each suggestion
3. **Confidence scores**: Only auto-apply if confidence > 80%
4. **Fallback**: Manual mode for ambiguous cases
5. **Documentation**: Migration guide with examples

**Contingency**:
- If accuracy < 80%, pause migration
- Improve inference algorithm (keyword dictionary, AC matching)
- Re-run migration after improvements

### Risk 2: Hook Performance Degradation
**Probability**: Low (well-tested pattern from 0043)
**Impact**: High (every task completion affected)

**Mitigation**:
1. **Performance benchmarks**: < 500ms (p95) target
2. **Caching**: Metadata frontmatter avoids re-parsing
3. **Lazy evaluation**: Only sync if task status changed
4. **Monitoring**: Alert if latency > 500ms

**Contingency**:
- If latency > 500ms, disable sync temporarily
- Optimize hot paths (profiling with Chrome DevTools)
- Add queuing (async background sync)

### Risk 3: Partial Sync Corruption
**Probability**: Low (atomic updates with rollback)
**Impact**: Critical (living docs out of sync)

**Mitigation**:
1. **Atomic dual-write**: Both succeed or both rollback
2. **File backups**: Restore on failure
3. **Integration tests**: Test rollback scenarios
4. **Validation**: Daily CI job detects desyncs

**Contingency**:
- If corruption detected, run repair script
- Restore from git history (files are version-controlled)
- Improve rollback logic based on failure analysis

### Risk 4: Community Resistance (New Format)
**Probability**: Low (clear benefits, dog-fooding)
**Impact**: Medium (adoption slower than expected)

**Mitigation**:
1. **Dog-fooding**: Use in SpecWeave repo first
2. **Documentation**: Clear migration guide
3. **Templates**: Auto-generate new increments with linkage
4. **Feedback loop**: GitHub issues for problems

**Contingency**:
- If resistance high, extend backward compatibility period
- Provide opt-out flag (manual sync mode)
- Improve UX based on feedback

---

## Roadmap & Milestones

### Phase 1: Foundation (Days 1-2) - Due: Nov 21
**Deliverables**:
- ✅ Parser extensions (userStory, satisfiesACs fields)
- ✅ Updated tasks.md template
- ✅ Unit tests (95%+ coverage)

**Milestone**: Parser validates new task format

### Phase 2: Living Docs Sync (Days 3-4) - Due: Nov 23
**Deliverables**:
- ✅ sync-living-docs.js hook updated
- ✅ post-task-completion.sh hook updated
- ✅ Integration tests (85%+ coverage)

**Milestone**: Task completion auto-updates living docs

### Phase 3: Validation & Commands (Day 5) - Due: Nov 24
**Deliverables**:
- ✅ /specweave:validate AC coverage checks
- ✅ /specweave:done closure validation
- ✅ /specweave:progress per-US grouping
- ✅ Command integration tests

**Milestone**: Validation detects uncovered ACs, blocks closure

### Phase 4: Migration Tooling (Days 6-7) - Due: Nov 26
**Deliverables**:
- ✅ migrate-task-linkage.ts script
- ✅ Inference algorithm (keyword matching)
- ✅ Dry-run mode + interactive prompts
- ✅ Migration tested on increments 0043-0046

**Milestone**: 90%+ migration success rate

### Phase 5: Documentation & Rollout (Day 8) - Due: Nov 27
**Deliverables**:
- ✅ CLAUDE.md updated (new task format)
- ✅ CONTRIBUTING.md updated (examples)
- ✅ PM Agent prompt updated
- ✅ Migration run on all 40+ increments
- ✅ Completion report

**Milestone**: 100% of existing increments migrated, new format enforced

### Phase 6: Monitoring & Iteration (Ongoing)
**Deliverables**:
- ✅ Daily CI validation (detect desyncs)
- ✅ Performance monitoring (hook latency)
- ✅ User feedback collection (GitHub issues)
- ✅ Monthly compliance audit

**Milestone**: Zero sync failures, 100% adoption

---

## Dependencies & Constraints

### Internal Dependencies (CRITICAL)
1. **ADR-0043** (Spec.md Source of Truth): Dual-write pattern for atomic updates
2. **ADR-0047** (Three-File Structure): Task format rules (no ACs in tasks.md)
3. **ADR-0030** (Living Docs Sync): Three-layer architecture (v0.18.0+)
4. **Increment 0043**: Reuse spec-frontmatter-updater.ts for YAML updates
5. **Increment 0046**: Migration pattern reference (console elimination)

### External Dependencies (NONE)
- Zero external library dependencies (use existing parsers)
- No API integrations required (internal framework only)

### Timeline Constraints
- **Soft deadline**: Nov 27 (before v0.23.0 release)
- **Hard deadline**: Dec 5 (sprint end)
- **Buffer**: 8 days (1 week slack for unexpected issues)

### Resource Constraints
- **Single developer**: Anton (framework author)
- **Part-time availability**: 4-6 hours/day
- **Total effort**: 5-8 days × 5 hours = 25-40 hours

### Technical Constraints
1. **Backward compatibility**: MUST support old format (40+ increments exist)
2. **Performance**: Hook latency < 500ms (user experience)
3. **Data integrity**: Atomic updates (no partial syncs)
4. **Test coverage**: 85%+ (quality requirement)

---

## Out of Scope (Deferred)

### Deferred to Future Increments
1. **GitHub Issue Task Checkboxes** (FS-048)
   - Sync task completion to GitHub issue checkboxes
   - Requires GitHub API research (rate limits, permissions)
   - Estimated effort: 3-5 days

2. **Visual Traceability Matrix UI** (FS-049)
   - Web-based dashboard showing US → AC → Task → Code
   - Requires frontend implementation (React, D3.js)
   - Estimated effort: 10-15 days

3. **Historical Linkage Inference** (FS-050)
   - Analyze git history to infer AC-Task linkage
   - Complex heuristics, low ROI
   - Estimated effort: 5-7 days

4. **Multi-Increment AC Coverage** (FS-051)
   - Track same AC across multiple increments (phased delivery)
   - Edge case (< 5% of ACs), defer
   - Estimated effort: 3-4 days

### Explicitly Not Included
1. **Jira/ADO Sync Enhancements**: GitHub-first approach (ADR-0007)
2. **Task Dependency Graph Visualization**: Out of scope (separate feature)
3. **Automated AC Generation from Code**: Requires AI, complex (separate research)
4. **Cross-Repository Traceability**: Single-repo focus for now

---

## Conclusion

### Strategic Impact

This feature is **foundational infrastructure** that unlocks:
- **Immediate**: Accurate living docs, AC validation, automatic sync
- **Near-term**: Enhanced GitHub sync, better progress tracking
- **Long-term**: Traceability matrix UI, AI-powered AC generation

### Investment vs. Return

**Investment**:
- 5-8 days development effort
- ~15 files modified
- ~18 test files created

**Return**:
- **40+ existing increments**: 4-8 hours saved per increment = 160-320 hours
- **Future increments**: 4-8 hours saved × 100+ increments/year = 400-800 hours/year
- **Quality improvement**: 100% AC coverage validation (prevent incomplete work)
- **Developer experience**: Automatic sync (zero manual effort)

**ROI**: 10x+ (400 hours saved / 40 hours invested)

### Next Steps

1. **Approval**: Review product strategy with stakeholders (Anton)
2. **Planning**: Create plan.md (Architect Agent)
3. **Tasking**: Create tasks.md with US-Task linkage (test-aware-planner)
4. **Execution**: Implement phases 1-5 (Developer)
5. **Validation**: Run /specweave:validate before closure (PM Agent)
6. **Rollout**: Migrate all increments, monitor adoption
7. **Iteration**: Collect feedback, improve migration accuracy

---

**Document Status**: ✅ Complete
**Approval**: Pending review
**Next Action**: Create plan.md (Architect Agent)
