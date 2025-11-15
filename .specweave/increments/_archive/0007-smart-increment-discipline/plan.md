# Implementation Plan: Increment Management v2.0 (0007)

**Feature**: 0007-smart-increment-discipline
**Status**: Implementation
**Created**: 2025-11-03
**Updated**: 2025-11-04

---

## 🚨 ARCHITECTURE PIVOT (2025-11-04)

**Decision**: Eliminate tests.md, embed test plans directly in tasks.md

**See**: [ARCHITECTURE-PIVOT.md](./ARCHITECTURE-PIVOT.md) for full rationale

**Impact on this plan**:
- All references to "tests.md" should be read as "tasks.md (with embedded test plans)"
- All references to "TC-IDs" should be read as "test function names"
- test-aware-planner generates ONE file (tasks.md), not two
- /specweave:check-tests reads embedded test plans from tasks.md

**Key Changes**:
- ✅ No tests.md file
- ✅ Test plans embedded in tasks
- ✅ Simpler agent (one file generation)
- ✅ Timeline compressed (20-28 hours total, not weeks)
- ✅ Coverage target: 80-90% (realistic)

---

## Overview

This plan covers the technical implementation for **two major enhancements**:

- **Part 1: Test-Aware Planning** (Foundation - Weeks 1-4, P1)
- **Part 2: Smart Status Management** (Enhancement - Weeks 5-8, P2)

Both parts enhance the increment lifecycle - Part 1 improves PLANNING quality, Part 2 improves EXECUTION flexibility.

**Delivery Strategy**: Part 1 can ship independently, Part 2 builds on it.

---

## PART 1: TEST-AWARE PLANNING

### Architecture Overview

```
User: "/specweave:inc 'GitHub sync'"
    �
increment-planner skill (ENHANCED)
    �
STEP 1: Scan existing docs
    �
STEP 2: PM Agent (ENHANCED - generates AC-IDs)
       Output: spec.md with AC-US1-01, AC-US1-02, etc.
    �
STEP 3: Architect Agent
       Output: plan.md
    �
STEP 4: test-aware-planner Agent (NEW!)
       Input: spec.md (AC-IDs), plan.md
       Output: tests.md (TC-IDs), tasks.md (with test refs)
       Creates bidirectional links
    �
STEP 5: Validate Test-Task Coupling (NEW!)
       Checks: All tasks have tests, all tests have tasks
       Blocks if validation fails
    �
 Test-aware increment created
```

---

### Component Changes

#### 1. PM Agent (Enhanced)

**File**: `plugins/specweave/agents/pm/AGENT.md`

**Current Behavior**:
```markdown
## User Stories

### US1: User Authentication (P1)
**Acceptance Criteria**:
- [ ] User can login with email/password
- [ ] Invalid credentials show error
```

**New Behavior** (with AC-IDs):
```markdown
## User Stories

### US1: User Authentication (P1)
**Acceptance Criteria**:
- [ ] **AC-US1-01**: User can login with email/password
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1

- [ ] **AC-US1-02**: Invalid credentials show error message
  - **Tests**: (placeholder)
  - **Tasks**: (placeholder)
  - **Priority**: P1
```

**Changes Required**:
```diff
# plugins/specweave/agents/pm/AGENT.md

+ YOU MUST create acceptance criteria with unique IDs:
+
+ Format:
+ - [ ] **AC-US{story}-{number}**: Criterion description
+   - **Tests**: (placeholder - filled by test-aware-planner)
+   - **Tasks**: (placeholder - filled by test-aware-planner)
+   - **Priority**: P1 | P2 | P3
+
+ Each AC MUST be:
+ - Specific and measurable
+ - Testable (can be automated or manually validated)
+ - Uniquely identified (AC-US1-01, AC-US1-02, etc.)
```

---

#### 2. test-aware-planner Agent (NEW!)

**File**: `plugins/specweave/agents/test-aware-planner/AGENT.md`

**Purpose**: Generate tasks.md with embedded test plans (NO tests.md file!)

**Agent Prompt Structure**:

```yaml
---
name: test-aware-planner
description: Creates tasks and tests together with bidirectional linking. Ensures every task has test coverage and every test references tasks. Enforces TDD discipline when enabled.
tools: Read, Write, Edit
model: haiku  # Fast and cheap for structured generation
---

# Test-Aware Planner Agent

You are a specialist in creating test-aware implementation plans. Your role is to generate `tasks.md` and `tests.md` that are **explicitly linked** to ensure complete test coverage.

## Your Responsibilities

### 1. Read Inputs
- Read `spec.md` (contains AC-IDs: AC-US1-01, AC-US1-02, etc.)
- Read `plan.md` (contains technical architecture)
- Extract all user stories and acceptance criteria
- Extract implementation approach and file structure

### 2. Generate tests.md FIRST
- Map each AC-ID � test cases (TC-IDs)
- Specify test types (unit, integration, E2E, manual)
- Assign priorities (P1, P2, P3)
- Use Given/When/Then format for clarity
- Leave "Related Tasks" field empty (filled after tasks.md)

**Template**:
```markdown
### TC-001: {Test Name}
**Type**: Unit | Integration | E2E | Manual
**Priority**: P1 | P2 | P3
**User Story**: US1
**Acceptance Criteria**: AC-US1-01
**Related Tasks**: (filled after tasks.md generated)
**Status**: Pending

**Scenario** (Given/When/Then):
- **Given** {precondition}
- **When** {action}
- **Then** {expected outcome}
- **And** {additional outcome}

**Test File**: `tests/{type}/{module}.test.ts`
**Run**: `npm test {module}`
```

### 3. Generate tasks.md SECOND
- Break down plan.md into executable tasks
- Reference AC-IDs each task satisfies
- Reference TC-IDs that validate each task
- Include test file paths
- Include run commands
- Add TDD Workflow section (if TDD mode enabled)

**Template** (TDD mode disabled):
```markdown
### T-001: {Task Title}
**User Story**: US1
**Acceptance Criteria**: AC-US1-01, AC-US1-02
**Test Coverage**:
- TC-001: Unit test (tests/unit/module.test.ts)
- TC-002: Integration test (tests/integration/module.test.ts)
**Priority**: P1
**Status**: pending

**Implementation**:
1. {Step 1}
2. {Step 2}
3. {Step 3}
```

**Template** (TDD mode enabled):
```markdown
### T-001: {Task Title}
**User Story**: US1
**Acceptance Criteria**: AC-US1-01, AC-US1-02
**Test Coverage**:
- TC-001: Unit test (tests/unit/module.test.ts)
- TC-002: Integration test (tests/integration/module.test.ts)
**Priority**: P1
**Status**: pending

**TDD Workflow**:
1. =� Write test first: TC-001 ({description})
   - File: tests/unit/module.test.ts
   - Expected: L Test fails ({reason})
2.  Implement: src/module.ts
3. =� Run test: `npm test module`
   - Expected:  Test passes
4. {  Refactor if needed

**Implementation**:
1. {Step 1}
2. {Step 2}
3. {Step 3}
```

### 4. Update tests.md (Bidirectional Link)
- Go back to tests.md
- Fill "Related Tasks" field for each test
- Format: `**Related Tasks**: T-001, T-003, T-005`

### 5. Validate
-  ALL implementation tasks have Test Coverage section
-  ALL test cases have Related Tasks section
-  ALL AC-IDs have linked TC-IDs
-  NO "run tests" task at end (tests integrated)

## TDD Mode Detection

Check `.specweave/config.yaml`:
```yaml
tdd_mode:
  enabled: true/false
  strict: true/false
```

- If `enabled: true` � Include TDD Workflow section in tasks
- If `enabled: false` � Omit TDD Workflow section

## Example Output

**tests.md** (generated FIRST):
```markdown
### TC-001: Load Plugin with Valid Manifest
**Type**: Unit
**Priority**: P1
**User Story**: US1
**Acceptance Criteria**: AC-US1-01
**Related Tasks**: (filled after tasks.md)
**Status**: Pending

**Scenario**:
- **Given** a valid plugin manifest file
- **When** PluginLoader.load() is called
- **Then** plugin is loaded successfully
- **And** plugin metadata is validated

**Test File**: `tests/unit/plugin-loader.test.ts`
**Run**: `npm test plugin-loader`
```

**tasks.md** (generated SECOND):
```markdown
### T-001: Create Plugin Types
**User Story**: US1
**Acceptance Criteria**: AC-US1-01
**Test Coverage**:
- TC-001: Unit test (tests/unit/plugin-loader.test.ts)
- TC-002: Integration test (tests/integration/plugin-lifecycle.test.ts)
**Priority**: P1
**Status**: pending

**Implementation**:
1. Create src/core/types/plugin.ts
2. Define PluginManifest interface
3. Define PluginMetadata interface
4. Export types in index.ts
```

**tests.md** (UPDATED with bidirectional link):
```markdown
### TC-001: Load Plugin with Valid Manifest
**Related Tasks**: T-001, T-003  � FILLED!
```

## Important Notes

- **Non-testable tasks**: Mark as `**Test Coverage**: N/A (documentation)`
- **Manual tests**: Mark as `**Type**: Manual` (no automation required)
- **Cross-cutting tests**: E2E tests may reference multiple tasks
- **Coverage goal**: 100% of implementation tasks have tests

## Validation Rules

If ANY of these fail, report error:
- L Implementation task has no Test Coverage section
- L Test case has no Related Tasks section
- L AC-ID has no linked TC-IDs
- L Generic "run tests" task exists at end

## Your Output

You MUST generate BOTH files and update tests.md with task references:
1. tests.md (complete)
2. tasks.md (complete)
3. tests.md (updated with Related Tasks)

Report validation status:
-  Coverage: 100% of {X} tasks have tests
-  AC Coverage: 100% of {Y} ACs have tests
-  Bidirectional linking: Complete
```

**Location**: `plugins/specweave/agents/test-aware-planner/`
- `AGENT.md` (main agent prompt)
- `templates/` (task and test templates)
- `test-cases/` (3+ agent test cases)

---

#### 3. increment-planner Skill (Enhanced)

**File**: `plugins/specweave/skills/increment-planner/SKILL.md`

**Changes**: Add Step 4 (test-aware-planner) and Step 5 (validation)

**New Steps**:

```markdown
STEP 4: Invoke test-aware-planner Agent (=� MANDATORY - USE TASK TOOL)

YOU MUST USE THE TASK TOOL - DO NOT SKIP:

Task(
  subagent_type: "test-aware-planner",
  description: "Generate test-aware tasks",
  prompt: "Create tasks.md and tests.md for: [increment description]

  INPUTS:
  - spec.md: [path] (contains AC-IDs)
  - plan.md: [path] (contains technical approach)

  TDD MODE: {check .specweave/config.yaml}

  You MUST:
  1. Generate tests.md FIRST (map AC-IDs � TC-IDs)
  2. Generate tasks.md SECOND (reference TC-IDs)
  3. Update tests.md (fill Related Tasks)
  4. Validate 100% coverage

  OUTPUT:
  - .specweave/increments/{id}/tests.md
  - .specweave/increments/{id}/tasks.md
  "
)

Wait for test-aware-planner agent to complete!
    �
STEP 5: Validate Test-Task Coupling (=� MANDATORY)

Check the following BEFORE completing increment planning:

**Test Coverage Validation**:
- [ ] ALL implementation tasks reference TC-IDs
- [ ] ALL test cases reference task IDs
- [ ] tasks.md has "Test Coverage" section per task
- [ ] tests.md has "Related Tasks" section per test
- [ ] NO "run tests" task at end

**Acceptance Criteria Coverage**:
- [ ] ALL AC-IDs have linked TC-IDs
- [ ] ALL TC-IDs reference AC-IDs
- [ ] Coverage: 100% of AC have tests

**TDD Workflow** (if TDD mode enabled):
- [ ] Each task has TDD workflow section
- [ ] Workflow includes: write test � implement � run test � refactor

If ANY validation fails � BLOCK increment creation � Show error
```

---

#### 4. /specweave:validate-coverage Command (NEW!)

**File**: `plugins/specweave/commands/validate-coverage.md`

```yaml
---
name: validate-coverage
description: Validate test-task coupling for an increment. Shows coverage report with missing tests, untestable tasks, and acceptance criteria coverage.
---

# /specweave:validate-coverage

Validate test coverage for an increment.

## Usage

/specweave:validate-coverage <increment-number>

## What It Does

1. Reads spec.md (AC-IDs)
2. Reads tasks.md (TC-ID references)
3. Reads tests.md (task references)
4. Generates coverage report

## Output Example

```
=� Test Coverage Report: 0007-smart-increment-discipline

Task Coverage:
 T-001: Implement authentication (3 tests: TC-001, TC-002, TC-003)
 T-002: Create login form (2 tests: TC-004, TC-005)
�  T-003: Add user dashboard (0 tests - is this testable?)
 T-004: Update README.md (N/A - documentation)
L T-005: Implement password reset (0 tests - MISSING!)

Coverage: 60% of testable tasks have tests (3/5)

Acceptance Criteria Coverage:
 AC-US1-01: Covered by TC-001, TC-002 (2 tests)
 AC-US1-02: Covered by TC-003 (1 test)
L AC-US1-03: No tests found! (MISSING)

<� Recommendations:
- Add tests for T-005 (password reset)
- Add tests for AC-US1-03 (session expiry)
- Mark T-003 as testable or not testable
```

## Implementation

```typescript
// src/commands/validate-coverage.ts
export async function validateCoverage(incrementId: string): Promise<void> {
  const spec = await readSpecMd(incrementId);
  const tasks = await readTasksMd(incrementId);
  const tests = await readTestsMd(incrementId);

  // Extract AC-IDs from spec
  const acIds = extractAcIds(spec);

  // Extract tasks with/without test coverage
  const tasksWithTests = tasks.filter(t => t.testCoverage.length > 0);
  const tasksWithoutTests = tasks.filter(t => t.testCoverage.length === 0 && t.testCoverage !== 'N/A');

  // Extract TC-IDs linked to AC-IDs
  const acCoverage = acIds.map(acId => ({
    acId,
    tests: tests.filter(t => t.acceptanceCriteria.includes(acId))
  }));

  // Generate report
  console.log('=� Test Coverage Report:', incrementId);
  console.log('');
  console.log('Task Coverage:');
  tasksWithTests.forEach(t => console.log(` ${t.id}: ${t.title} (${t.testCoverage.length} tests)`));
  tasksWithoutTests.forEach(t => console.log(`L ${t.id}: ${t.title} (0 tests - MISSING!)`));
  console.log('');
  console.log(`Coverage: ${Math.round(tasksWithTests.length / (tasksWithTests.length + tasksWithoutTests.length) * 100)}%`);
  console.log('');
  console.log('Acceptance Criteria Coverage:');
  acCoverage.forEach(ac => {
    if (ac.tests.length > 0) {
      console.log(` ${ac.acId}: Covered by ${ac.tests.map(t => t.id).join(', ')} (${ac.tests.length} tests)`);
    } else {
      console.log(`L ${ac.acId}: No tests found! (MISSING)`);
    }
  });
}
```

---

#### 5. TDD Mode Configuration (Optional)

**File**: `.specweave/config.yaml` (user project, not framework)

```yaml
# SpecWeave Configuration

tdd_mode:
  enabled: false  # Set to true to enable TDD workflow
  strict: false   # If true, blocks task execution if test doesn't exist

# When enabled:
# - tasks.md includes TDD workflow section
# - /specweave:do checks test exists before implementation
# - Tests MUST be written before code
```

**Behavior**:
- If `enabled: false` � Tasks have "Test Coverage" section only
- If `enabled: true` � Tasks have "Test Coverage" + "TDD Workflow" sections
- If `strict: true` � `/specweave:do` blocks if test file doesn't exist

---

### File Structure Changes (Part 1)

**New Files**:
```
plugins/specweave/
   agents/
      test-aware-planner/         � NEW!
          AGENT.md
          templates/
             task-template.md
             test-template.md
          test-cases/             � 3+ tests required
              test-1-basic.yaml
              test-2-tdd-mode.yaml
              test-3-validation.yaml
   commands/
      validate-coverage.md        � NEW!
   skills/
       increment-planner/
           SKILL.md                � UPDATED (Step 4, Step 5)

src/commands/
   validate-coverage.ts            � NEW!

.specweave/config.yaml               � OPTIONAL (user project)
```

**Updated Files**:
```
plugins/specweave/
   agents/
       pm/
           AGENT.md                � UPDATED (AC-ID generation)
```

---

### Templates Updates (Part 1)

**tasks.md Template**:
```markdown
### T-XXX: {Task Title}

**User Story**: US{X}
**Acceptance Criteria**: AC-US{X}-{YY}, AC-US{X}-{ZZ}
**Test Coverage**:
- TC-XXX: {Test type} ({test file path})
- TC-YYY: {Test type} ({test file path})
**Priority**: P1 | P2 | P3
**Status**: pending | in_progress | completed

**TDD Workflow** (if TDD mode enabled):
1. =� Write test first: TC-XXX ({description})
   - File: {test file path}
   - Expected: L Test fails ({reason})
2.  Implement: {implementation file path}
3. =� Run test: `{run command}`
   - Expected:  Test passes
4. {  Refactor if needed

**Implementation**:
1. {Step 1}
2. {Step 2}
3. {Step 3}
```

**tests.md Template**:
```markdown
### TC-XXX: {Test Name}

**Test ID**: TC-XXX
**Type**: Unit | Integration | E2E | Manual
**Priority**: P1 | P2 | P3
**User Story**: US{X}
**Acceptance Criteria**: AC-US{X}-{YY}
**Related Tasks**: T-XXX, T-YYY
**Status**: Pending | Pass | Fail

**Scenario** (Given/When/Then):
- **Given** {precondition}
- **When** {action}
- **Then** {expected outcome}
- **And** {additional outcome}

**Test File**: `tests/{type}/{module}.test.ts`
**Run**: `npm test {module}`
**Coverage**: AC-US{X}-{YY} 
```

---

## PART 2: SMART STATUS MANAGEMENT

### Architecture Overview

```
Increment Lifecycle (Enhanced):

active � paused � resumed � active
   �        �
completed  abandoned

Status Transitions:
- /specweave:inc � active
- /specweave:pause � paused
- /specweave:resume � active
- /specweave:done � completed
- /specweave:abandon � abandoned
```

---

### Component Changes

#### 1. Increment Metadata Schema (Enhanced)

**Current** (v0.6.0):
```
.specweave/increments/0007/
   spec.md
   plan.md
   tasks.md
   tests.md
```

**New** (v0.7.0+):
```
.specweave/increments/0007/
   spec.md
   plan.md
   tasks.md
   tests.md
   metadata.json  � NEW!
```

**metadata.json Schema**:
```json
{
  "id": "0007-smart-increment-discipline",
  "status": "active",      // active | paused | blocked | completed | abandoned
  "type": "feature",       // hotfix | feature | refactor | experiment | spike
  "assignee": null,        // For team mode (Phase 4, future)
  "created": "2025-11-03T10:00:00Z",
  "lastActivity": "2025-11-03T15:30:00Z",
  "pausedReason": null,    // Filled when paused
  "pausedAt": null,        // Timestamp when paused
  "abandonedReason": null, // Filled when abandoned
  "abandonedAt": null,     // Timestamp when abandoned
  "dependencies": {        // Phase 3 (future)
    "blockedBy": [],
    "blocks": [],
    "related": []
  }
}
```

**TypeScript Types**:
```typescript
// src/core/types/increment-status.ts (NEW)
export enum IncrementStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  BLOCKED = 'blocked',  // Phase 3
  COMPLETED = 'completed',
  ABANDONED = 'abandoned'
}

export enum IncrementType {
  HOTFIX = 'hotfix',
  FEATURE = 'feature',
  REFACTOR = 'refactor',
  EXPERIMENT = 'experiment',
  SPIKE = 'spike'
}

export interface IncrementMetadata {
  id: string;
  status: IncrementStatus;
  type: IncrementType;
  assignee?: string;
  created: string;  // ISO 8601
  lastActivity: string;  // ISO 8601
  pausedReason?: string;
  pausedAt?: string;
  abandonedReason?: string;
  abandonedAt?: string;
  dependencies?: {
    blockedBy: string[];
    blocks: string[];
    related: string[];
  };
}
```

---

#### 2. Status Management Commands (NEW!)

##### /specweave:pause

**File**: `plugins/specweave/commands/pause.md`

```yaml
---
name: pause
description: Pause an active increment (e.g., blocked by external dependency). Removes from active count, records reason, tracks staleness.
---

# /specweave:pause

Pause an active increment.

## Usage

/specweave:pause <increment-id> --reason="<reason>"

## Example

/specweave:pause 0007 --reason="Waiting for Stripe API keys"

## What It Does

1. Updates metadata.json:
   - status: "active" � "paused"
   - pausedReason: "<reason>"
   - pausedAt: "<timestamp>"
2. Removes from active increment count
3. Shows in `/specweave:status` under "Paused" section

## When to Use

- Blocked by external dependency
- Waiting for code review
- Deprioritized (intentionally shelved)

## Resuming

/specweave:resume 0007

## Warnings

- Paused >7 days � staleness warning
- Paused >30 days � recommend abandon
```

**Implementation**:
```typescript
// src/commands/pause.ts
export async function pauseIncrement(id: string, reason: string): Promise<void> {
  const metadata = await readMetadata(id);

  if (metadata.status !== IncrementStatus.ACTIVE) {
    throw new Error(`Cannot pause increment ${id}: Status is ${metadata.status}, not active`);
  }

  metadata.status = IncrementStatus.PAUSED;
  metadata.pausedReason = reason;
  metadata.pausedAt = new Date().toISOString();
  metadata.lastActivity = metadata.pausedAt;

  await writeMetadata(id, metadata);

  console.log(` Increment ${id} paused`);
  console.log(`   Reason: ${reason}`);
  console.log(`   Resume with: /specweave:resume ${id}`);
}
```

---

##### /specweave:resume

**File**: `plugins/specweave/commands/resume.md`

```yaml
---
name: resume
description: Resume a paused increment. Clears pause reason, returns to active status.
---

# /specweave:resume

Resume a paused increment.

## Usage

/specweave:resume <increment-id>

## Example

/specweave:resume 0007

## What It Does

1. Updates metadata.json:
   - status: "paused" � "active"
   - pausedReason: cleared
   - pausedAt: cleared
2. Adds to active increment count
3. Shows in `/specweave:status` under "Active" section
```

**Implementation**:
```typescript
// src/commands/resume.ts
export async function resumeIncrement(id: string): Promise<void> {
  const metadata = await readMetadata(id);

  if (metadata.status !== IncrementStatus.PAUSED) {
    throw new Error(`Cannot resume increment ${id}: Status is ${metadata.status}, not paused`);
  }

  const pausedDuration = Date.now() - new Date(metadata.pausedAt!).getTime();
  const daysPaused = Math.floor(pausedDuration / (1000 * 60 * 60 * 24));

  metadata.status = IncrementStatus.ACTIVE;
  metadata.pausedReason = undefined;
  metadata.pausedAt = undefined;
  metadata.lastActivity = new Date().toISOString();

  await writeMetadata(id, metadata);

  console.log(` Increment ${id} resumed`);
  if (daysPaused > 7) {
    console.log(`   �  Warning: Paused for ${daysPaused} days - context may be stale`);
  }
}
```

---

##### /specweave:abandon

**File**: `plugins/specweave/commands/abandon.md`

```yaml
---
name: abandon
description: Abandon an increment (no longer needed). Moves to _abandoned/ folder, records reason.
---

# /specweave:abandon

Abandon an increment.

## Usage

/specweave:abandon <increment-id> --reason="<reason>"

## Example

/specweave:abandon 0008 --reason="Requirements changed, feature no longer needed"

## What It Does

1. Updates metadata.json:
   - status: "active" | "paused" � "abandoned"
   - abandonedReason: "<reason>"
   - abandonedAt: "<timestamp>"
2. Moves increment folder to `_abandoned/`
3. Removes from active/paused counts

## Undo

Can be un-abandoned if needed (rare):
mv .specweave/increments/_abandoned/0008-* .specweave/increments/
/specweave:resume 0008
```

**Implementation**:
```typescript
// src/commands/abandon.ts
export async function abandonIncrement(id: string, reason: string): Promise<void> {
  const metadata = await readMetadata(id);

  if (metadata.status === IncrementStatus.COMPLETED) {
    throw new Error(`Cannot abandon completed increment ${id}`);
  }

  metadata.status = IncrementStatus.ABANDONED;
  metadata.abandonedReason = reason;
  metadata.abandonedAt = new Date().toISOString();
  metadata.lastActivity = metadata.abandonedAt;

  // Write metadata before moving
  await writeMetadata(id, metadata);

  // Move to _abandoned/
  const srcPath = path.join('.specweave/increments', id);
  const destPath = path.join('.specweave/increments/_abandoned', id);
  await fs.move(srcPath, destPath);

  console.log(` Increment ${id} abandoned`);
  console.log(`   Reason: ${reason}`);
  console.log(`   Moved to: .specweave/increments/_abandoned/${id}`);
}
```

---

#### 3. Enhanced /specweave:inc (Type-Based Limits)

**File**: `plugins/specweave/commands/inc.md` (MAJOR UPDATE)

**New Behavior**:
```bash
/specweave:inc "0007-refactoring" --type=refactor

=� You have 1 active feature (0006-i18n: 50% done, 2 days old)

9  Refactor increments require high focus (limit: 1 active)

=� Context Switching Cost: 20-40% productivity loss

Options:
1�  Continue 0006 first (recommended)
2�  Pause 0006 and start 0007
3�  Start both in parallel (high overhead)

What would you like to do? [1/2/3]: _
```

**Type-Based Limits**:
```typescript
// src/core/increment/limits.ts (NEW)
export const TYPE_LIMITS: Record<IncrementType, { maxActive: number, autoAbandonDays?: number }> = {
  [IncrementType.HOTFIX]: { maxActive: Infinity },  // Unlimited
  [IncrementType.FEATURE]: { maxActive: 2 },
  [IncrementType.REFACTOR]: { maxActive: 1 },
  [IncrementType.EXPERIMENT]: { maxActive: Infinity, autoAbandonDays: 14 },
  [IncrementType.SPIKE]: { maxActive: Infinity }
};

export function checkIncrementLimits(newType: IncrementType): void {
  const activeIncrements = getActiveIncrements();

  if (newType === IncrementType.HOTFIX) {
    // Bypass all checks
    return;
  }

  const activeOfType = activeIncrements.filter(i => i.type === newType).length;
  const limit = TYPE_LIMITS[newType].maxActive;

  if (activeOfType >= limit) {
    showWarning({
      type: newType,
      active: activeOfType,
      limit,
      activeIncrements
    });
  }
}
```

---

#### 4. Enhanced /specweave:status

**File**: `plugins/specweave/commands/status.md` (MAJOR UPDATE)

**New Output**:
```bash
/specweave:status

=� Active Increments (2):
  =� 0005-payment-hotfix [hotfix] (90% done, 6 hours old)
     Assignee: alice@example.com
  =' 0006-i18n [feature] (50% done, 2 days old)
     Assignee: bob@example.com

�  Paused Increments (1):
  = 0007-stripe [feature] (30% done, paused 3 days)
     Reason: Waiting for Stripe API keys
     Paused by: alice@example.com

 Completed (4):
  0001-core-framework
  0002-core-enhancements
  0003-intelligent-model-selection
  0004-plugin-architecture

�  Warnings:
  - 0007-stripe paused for 3 days (review or abandon?)
  - 2 active increments = 20-40% context switching cost

=� Suggestions:
  - Complete 0005-payment-hotfix (high priority, almost done)
  - Resume or abandon 0007-stripe
```

**Filters**:
```bash
/specweave:status --active     # Only active
/specweave:status --stale      # Paused >7 days
/specweave:status --mine       # Only assigned to me (team mode, Phase 4)
```

---

### File Structure Changes (Part 2)

**New Files**:
```
plugins/specweave/commands/
   pause.md          � NEW!
   resume.md         � NEW!
   abandon.md        � NEW!
   inc.md            � UPDATED (type-based limits)

src/commands/
   pause.ts          � NEW!
   resume.ts         � NEW!
   abandon.ts        � NEW!
   inc.ts            � UPDATED

src/core/
   types/
      increment-status.ts  � NEW! (IncrementStatus, IncrementType enums)
   increment/
       limits.ts     � NEW! (type-based limit logic)

.specweave/increments/####/
   metadata.json     � NEW! (per increment)
```

**Updated Files**:
```
plugins/specweave/commands/
   status.md         � UPDATED (show status, type, warnings)

src/commands/
   status.ts         � UPDATED (read metadata.json)
```

---

## Migration Strategy

### Auto-Migration (First Run)

When a user runs v0.7.0 for the first time:

```typescript
// src/core/migration/migrate-increments.ts (NEW)
export async function migrateIncrementsToV070(): Promise<void> {
  const increments = await getAllIncrements();

  for (const inc of increments) {
    const metadataPath = path.join(inc.path, 'metadata.json');

    // Check if already migrated
    if (await fs.pathExists(metadataPath)) {
      continue;
    }

    // Create metadata.json
    const metadata: IncrementMetadata = {
      id: inc.id,
      status: inc.isComplete() ? IncrementStatus.COMPLETED : IncrementStatus.ACTIVE,
      type: IncrementType.FEATURE,  // Default
      created: inc.createdDate || new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    await fs.writeJson(metadataPath, metadata, { spaces: 2 });
    console.log(` Migrated ${inc.id} to v0.7.0`);
  }

  console.log('');
  console.log('<� Migration complete!');
  console.log('   All increments now have metadata.json');
  console.log('   New commands available:');
  console.log('   - /specweave:pause <id> --reason="..."');
  console.log('   - /specweave:resume <id>');
  console.log('   - /specweave:abandon <id> --reason="..."');
}
```

**Trigger**: Run automatically on first `/specweave:*` command in v0.7.0

---

## Testing Strategy

### Part 1: Test-Aware Planning

**Unit Tests**:
- test-aware-planner agent generates correct structure
- AC-ID format validation (AC-US1-01, AC-US1-02)
- TC-ID format validation (TC-001, TC-002)
- Bidirectional linking correctness

**Integration Tests**:
- increment-planner � PM Agent � test-aware-planner flow
- Validation blocks incomplete coupling
- /specweave:validate-coverage command works

**Manual Tests**:
- Create real increment (0008) using new format
- Verify spec.md has AC-IDs
- Verify tasks.md has Test Coverage sections
- Verify tests.md has Related Tasks sections
- Run /specweave:validate-coverage 0008

---

### Part 2: Smart Status Management

**Unit Tests**:
- metadata.json creation
- pause/resume/abandon commands
- Status transitions
- Type-based limit logic

**Integration Tests**:
- /specweave:inc with type-based limits
- Hotfix bypasses limits
- Staleness warnings (paused >7 days)
- Auto-abandon experiments (>14 days)

**Manual Tests**:
- Create increment with --type=hotfix
- Pause increment
- Resume increment
- Abandon increment
- Check /specweave:status output

---

## Performance Considerations

### Part 1:
- **test-aware-planner agent**: Use Haiku (fast, cheap, ~$0.25 per increment)
- **Validation**: File reads only, <10ms per increment
- **AC-ID parsing**: Regex-based, <1ms per file

### Part 2:
- **metadata.json I/O**: <5ms per increment (JSON parse/stringify)
- **Status checks**: File existence checks, <10ms total
- **Migration**: One-time cost, ~100ms per existing increment

---

## Security Considerations

### Part 1:
- **No security impact** (metadata only, no execution)
- AC-IDs/TC-IDs are alphanumeric identifiers (safe)

### Part 2:
- **metadata.json validation**: Ensure status/type enums are valid
- **File moves** (`_abandoned/`): Use fs.move (atomic operation)
- **Reason fields**: Sanitize for XSS if ever displayed in UI

---

## Rollback Plan

**If Part 1 or Part 2 fails**:

1. **Feature flag**: `.specweave/config.yaml`
   ```yaml
   discipline:
     useTestAwarePlanning: false  # Revert to v0.6.0 planning
     useSmartDiscipline: false    # Revert to iron rule
   ```

2. **Backward compatibility**: Old format still works
   - Old increments (0001-0006) work without migration
   - New format (0007+) isolated to new increments

3. **Revert migration**: Delete metadata.json files
   ```bash
   find .specweave/increments -name "metadata.json" -delete
   ```

---

## Deployment Strategy

### Phase 1 (Weeks 1-4): Test-Aware Planning
-  Ship as v0.7.0
-  Can be used independently
-  Backward compatible

### Phase 2 (Weeks 5-8): Smart Status Management
-  Ship as v0.8.0
-  Builds on v0.7.0
-  Auto-migration included

**Beta Testing**:
- Use internally for SpecWeave development (dogfooding)
- Create increment 0008 using new format
- Collect feedback before public release

---

## Success Criteria

### Part 1:
-  New increments (0008+) use AC-IDs
-  100% test coverage for all testable tasks
-  /specweave:validate-coverage works
-  Bidirectional linking complete

### Part 2:
-  <5% increments use `--force`
-  Hotfixes bypass limits
-  Context switching warnings work
-  Paused increments tracked correctly

---

## Documentation Updates

**Files to update**:
- `CLAUDE.md` - Show new format examples
- `.specweave/docs/internal/delivery/guides/increment-lifecycle.md` - Add Part 1 + Part 2 workflows
- `README.md` - Mention test-aware planning
- `CHANGELOG.md` - Document v0.7.0 and v0.8.0 changes

---

**Plan Status**:  COMPLETE
**Next Step**: Create tasks.md (phased implementation)
