# Implementation Plan: US-Task Linkage Architecture

**Increment**: 0047-us-task-linkage
**Priority**: P0 (Critical)
**Estimated Effort**: 5-8 days
**Tech Stack**: TypeScript, Node.js CLI, Vitest

---

## Executive Summary

This plan details the technical implementation of bidirectional US-Task-AC traceability in SpecWeave. The core enhancement adds explicit linkage fields to tasks.md (`userStory` and `satisfiesACs`), enabling automatic living docs synchronization, AC coverage validation, and progress tracking by User Story.

**Key Components**:
1. Task parser extensions (extract new fields)
2. Template updates (generate new format)
3. Living docs sync enhancement (use linkage for auto-update)
4. Validation extensions (AC coverage, orphan detection)
5. Migration tooling (backport to existing increments)

---

## Architecture Overview

### Current State (Broken Traceability)

```
spec.md (User Stories with ACs)
    ↓
tasks.md (Tasks with NO US linkage)
    ↓
living docs US files show "No tasks defined" ← BROKEN!
```

### Target State (Complete Traceability)

```
spec.md (User Stories with AC-IDs)
    ↓
tasks.md (Tasks with userStory + satisfiesACs fields)
    ↓
    ↓ (parsed by sync hook)
    ↓
living docs US files show actual task lists ← FIXED!
    ↓
AC checkboxes auto-update based on task completion
```

---

## Component Design

### 1. Task Parser (`src/generators/spec/task-parser.ts`)

**Purpose**: Extract task metadata including new US linkage fields

**Interface**:
```typescript
// src/generators/spec/task-parser.ts
import { readFileSync } from 'fs';
import path from 'path';

export interface Task {
  id: string;                    // T-001
  title: string;                 // Task title
  userStory?: string;            // US-001 (NEW - optional for backward compat)
  satisfiesACs?: string[];       // [AC-US1-01, AC-US1-02] (NEW)
  status: 'pending' | 'in_progress' | 'completed' | 'transferred';
  priority?: string;             // P0, P1, P2, P3
  estimatedEffort?: string;      // "4 hours", "2 days"
  dependencies?: string[];       // [T-000, T-001]
  description?: string;          // Full task description
  filesAffected?: string[];      // [src/path/file.ts]
}

export interface TasksByUserStory {
  [usId: string]: Task[];        // Group tasks by User Story
}

/**
 * Parse tasks.md and extract all tasks with US linkage
 * @param tasksPath - Path to tasks.md file
 * @returns Map of User Story ID → Tasks
 */
export function parseTasksWithUSLinks(tasksPath: string): TasksByUserStory {
  const content = readFileSync(tasksPath, 'utf-8');
  const tasks: TasksByUserStory = {};

  // Regex patterns
  const taskHeaderRegex = /^###\s+(T-\d{3}):\s*(.+)$/gm;
  const userStoryRegex = /\*\*User Story\*\*:\s*(US-\d{3})/;
  const satisfiesACsRegex = /\*\*Satisfies ACs\*\*:\s*(AC-US\d+-\d{2}(?:,\s*AC-US\d+-\d{2})*)/;
  const statusRegex = /\*\*Status\*\*:\s*\[([x ])\]\s*(\w+)/;

  // Implementation details in code...

  return tasks;
}

/**
 * Validate task US linkage
 * @param task - Task to validate
 * @param validUSIds - List of valid US-IDs from spec.md
 * @param validACIds - List of valid AC-IDs from spec.md
 * @returns Validation errors (empty array if valid)
 */
export function validateTaskLinkage(
  task: Task,
  validUSIds: string[],
  validACIds: string[]
): string[] {
  const errors: string[] = [];

  // Validate userStory field
  if (task.userStory && !validUSIds.includes(task.userStory)) {
    errors.push(`Invalid US-ID: ${task.userStory} (not found in spec.md)`);
  }

  // Validate satisfiesACs field
  if (task.satisfiesACs) {
    for (const acId of task.satisfiesACs) {
      if (!validACIds.includes(acId)) {
        errors.push(`Invalid AC-ID: ${acId} (not found in spec.md)`);
      }
    }
  }

  return errors;
}
```

**Parsing Logic**:
1. Read tasks.md content
2. Split into task sections (### T-XXX: Title)
3. Extract fields using regex:
   - `**User Story**: US-001` → `task.userStory = "US-001"`
   - `**Satisfies ACs**: AC-US1-01, AC-US1-02` → `task.satisfiesACs = ["AC-US1-01", "AC-US1-02"]`
4. Group tasks by userStory field
5. Return map: `{ "US-001": [task1, task2], "US-002": [task3] }`

**Error Handling**:
- Missing userStory field: Warn (old format), don't fail
- Invalid US-ID format: Error + validation failure
- Invalid AC-ID format: Error + validation failure
- Non-existent US-ID: Error (cross-reference with spec.md)

---

### 2. Template Generator (`plugins/specweave/skills/spec-generator/templates/tasks.md.mustache`)

**Purpose**: Generate tasks.md with new hierarchical structure

**Template Structure**:
```mustache
---
total_tasks: {{totalTasks}}
completed: {{completedTasks}}
by_user_story:
{{#userStories}}
  {{id}}: {{taskCount}}
{{/userStories}}
test_mode: {{testMode}}
coverage_target: {{coverageTarget}}
---

# Tasks: {{incrementTitle}}

{{#userStories}}
## User Story: {{id}} - {{title}}

**Linked ACs**: {{acIds}}
**Tasks**: {{taskCount}} total, {{completedCount}} completed

{{#tasks}}
### {{id}}: {{title}}

**User Story**: {{userStoryId}}
**Satisfies ACs**: {{acList}}
**Status**: [{{statusCheckbox}}] {{statusText}}
**Priority**: {{priority}}
**Estimated Effort**: {{estimatedEffort}}

**Description**: {{description}}

**Implementation Steps**:
{{#implementationSteps}}
{{stepNumber}}. {{stepText}}
{{/implementationSteps}}

**Test Plan**:
- **File**: `{{testFilePath}}`
- **Tests**: {{testCases}}

**Files Affected**:
{{#filesAffected}}
- `{{filePath}}`
{{/filesAffected}}

{{#dependencies}}
**Dependencies**: {{dependencyList}}
{{/dependencies}}

---

{{/tasks}}
{{/userStories}}
```

**Key Features**:
- **Hierarchical structure**: Group tasks by User Story
- **Frontmatter tracking**: `by_user_story` map for progress tracking
- **Mandatory fields**: userStory and satisfiesACs for all tasks
- **Test integration**: Embedded test plans (v0.7.0+ architecture)

---

### 3. Living Docs Sync Hook (`plugins/specweave/lib/hooks/sync-living-docs.js`)

**Purpose**: Automatically sync task completion to living docs US files

**Current Implementation** (needs enhancement):
```javascript
// plugins/specweave/lib/hooks/sync-living-docs.js
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { parseTasksWithUSLinks } from '../../../../dist/src/generators/spec/task-parser.js';

/**
 * Sync tasks.md to living docs User Story files
 * @param incrementPath - Path to increment directory
 * @param projectId - Project ID (e.g., "specweave", "backend")
 * @param featureId - Feature ID (e.g., "FS-047")
 */
export function syncTasksToLivingDocs(incrementPath, projectId, featureId) {
  const tasksPath = path.join(incrementPath, 'tasks.md');
  const tasksByUS = parseTasksWithUSLinks(tasksPath);

  // For each User Story with tasks
  for (const [usId, tasks] of Object.entries(tasksByUS)) {
    const usPath = path.resolve(
      incrementPath,
      `../../docs/internal/specs/${projectId}/${featureId}/${usId.toLowerCase()}-*.md`
    );

    // Update US file task section
    updateUSTaskSection(usPath, tasks, incrementPath);

    // Update AC checkboxes based on completed tasks
    updateACCheckboxes(usPath, tasks);
  }
}

/**
 * Update task list section in living docs US file
 * @param usPath - Path to US markdown file
 * @param tasks - Tasks linked to this US
 * @param incrementPath - Increment path (for relative links)
 */
function updateUSTaskSection(usPath, tasks, incrementPath) {
  const content = readFileSync(usPath, 'utf-8');
  const incrementId = path.basename(incrementPath);

  // Generate task list with links
  const taskList = tasks.map(t => {
    const checkbox = t.status === 'completed' ? 'x' : ' ';
    const link = `../../../../increments/${incrementId}/tasks.md#${t.id}`;
    return `- [${checkbox}] [${t.id}](${link}): ${t.title}`;
  }).join('\n');

  // Replace "## Tasks" section
  const updatedContent = content.replace(
    /## Tasks\n\n_No tasks defined for this user story_/,
    `## Tasks\n\n${taskList}`
  );

  writeFileSync(usPath, updatedContent, 'utf-8');
}

/**
 * Update AC checkboxes based on task completion
 * @param usPath - Path to US markdown file
 * @param tasks - Tasks linked to this US
 */
function updateACCheckboxes(usPath, tasks) {
  const content = readFileSync(usPath, 'utf-8');

  // Collect all AC-IDs satisfied by completed tasks
  const satisfiedACs = new Set();
  tasks.forEach(task => {
    if (task.status === 'completed' && task.satisfiesACs) {
      task.satisfiesACs.forEach(acId => satisfiedACs.add(acId));
    }
  });

  // Update AC checkboxes
  let updatedContent = content;
  satisfiedACs.forEach(acId => {
    // Replace - [ ] **AC-US1-01** with - [x] **AC-US1-01**
    const regex = new RegExp(`- \\[ \\] \\*\\*${acId}\\*\\*`, 'g');
    updatedContent = updatedContent.replace(regex, `- [x] **${acId}**`);
  });

  writeFileSync(usPath, updatedContent, 'utf-8');
}
```

**Key Changes**:
1. Use `parseTasksWithUSLinks()` to get tasks grouped by US
2. For each US, update its living docs file task section
3. Update AC checkboxes based on `satisfiesACs` field
4. Generate task links with proper relative paths

**Hook Integration**:
```bash
# plugins/specweave/hooks/post-task-completion.sh
#!/bin/bash

# Triggered after task marked completed in tasks.md
# Calls sync-living-docs.js with increment context

INCREMENT_PATH="$1"
PROJECT_ID="$2"       # From metadata.json or config
FEATURE_ID="$3"       # From spec.md frontmatter (epic field)

node plugins/specweave/lib/hooks/sync-living-docs.js \
  "$INCREMENT_PATH" \
  "$PROJECT_ID" \
  "$FEATURE_ID"
```

---

### 4. AC Coverage Validator (`src/validators/ac-coverage-validator.ts`)

**Purpose**: Detect uncovered acceptance criteria and orphan tasks

**Interface**:
```typescript
// src/validators/ac-coverage-validator.ts
import { Task, parseTasksWithUSLinks } from '../generators/spec/task-parser.js';
import { parseSpecMd } from '../generators/spec/spec-parser.js';

export interface ACCoverageReport {
  totalACs: number;
  coveredACs: number;
  uncoveredACs: string[];          // AC-IDs with no tasks
  orphanTasks: string[];            // Task IDs with no satisfiesACs
  coveragePercentage: number;       // 0-100
  acToTasksMap: Map<string, string[]>;  // AC-ID → [Task IDs]
  taskToACsMap: Map<string, string[]>;  // Task ID → [AC-IDs]
}

/**
 * Validate AC coverage for an increment
 * @param incrementPath - Path to increment directory
 * @returns Coverage report
 */
export function validateACCoverage(incrementPath: string): ACCoverageReport {
  const specPath = path.join(incrementPath, 'spec.md');
  const tasksPath = path.join(incrementPath, 'tasks.md');

  // Parse spec.md to get all AC-IDs
  const { userStories } = parseSpecMd(specPath);
  const allACIds = extractAllACIds(userStories);

  // Parse tasks.md to get task-AC mappings
  const tasksByUS = parseTasksWithUSLinks(tasksPath);
  const allTasks = Object.values(tasksByUS).flat();

  // Build coverage maps
  const acToTasksMap = buildACToTasksMap(allTasks);
  const taskToACsMap = buildTaskToACsMap(allTasks);

  // Detect uncovered ACs
  const uncoveredACs = allACIds.filter(acId => !acToTasksMap.has(acId));

  // Detect orphan tasks (no satisfiesACs field or empty)
  const orphanTasks = allTasks
    .filter(t => !t.satisfiesACs || t.satisfiesACs.length === 0)
    .map(t => t.id);

  // Calculate coverage
  const coveredACs = allACIds.length - uncoveredACs.length;
  const coveragePercentage = Math.round((coveredACs / allACIds.length) * 100);

  return {
    totalACs: allACIds.length,
    coveredACs,
    uncoveredACs,
    orphanTasks,
    coveragePercentage,
    acToTasksMap,
    taskToACsMap
  };
}

/**
 * Print coverage report to console
 * @param report - Coverage report
 */
export function printCoverageReport(report: ACCoverageReport): void {
  console.log('\n📊 AC Coverage Report\n');
  console.log(`Total ACs: ${report.totalACs}`);
  console.log(`Covered: ${report.coveredACs} (${report.coveragePercentage}%)`);
  console.log(`Uncovered: ${report.uncoveredACs.length}\n`);

  if (report.uncoveredACs.length > 0) {
    console.log('⚠️  Uncovered Acceptance Criteria:');
    report.uncoveredACs.forEach(acId => {
      console.log(`   - ${acId}: No tasks assigned`);
    });
    console.log();
  }

  if (report.orphanTasks.length > 0) {
    console.log('⚠️  Orphan Tasks (no AC coverage):');
    report.orphanTasks.forEach(taskId => {
      console.log(`   - ${taskId}: Missing satisfiesACs field`);
    });
    console.log();
  }

  // Detailed traceability matrix
  console.log('📋 Traceability Matrix:\n');
  for (const [acId, taskIds] of report.acToTasksMap.entries()) {
    console.log(`✓ ${acId}: Covered by ${taskIds.join(', ')}`);
  }
}
```

**Validation Logic**:
1. Extract all AC-IDs from spec.md (parse User Stories)
2. Extract all task-AC mappings from tasks.md (satisfiesACs field)
3. Build bidirectional maps (AC → Tasks, Task → ACs)
4. Detect uncovered ACs (AC-IDs with no tasks)
5. Detect orphan tasks (tasks with no satisfiesACs)
6. Calculate coverage percentage

---

### 5. Command Integration

#### `/specweave:validate` Enhancement

**File**: `plugins/specweave/commands/specweave-validate.md`

**Updated Implementation**:
```typescript
// src/cli/commands/validate.ts
import { validateACCoverage, printCoverageReport } from '../../validators/ac-coverage-validator.js';

export async function validateCommand(incrementId: string, options = {}) {
  const incrementPath = `.specweave/increments/${incrementId}`;

  console.log(`\n🔍 Validating increment ${incrementId}...\n`);

  // Existing validations (spec structure, task format, etc.)
  // ...

  // NEW: AC coverage validation
  console.log('Running AC coverage validation...');
  const coverageReport = validateACCoverage(incrementPath);
  printCoverageReport(coverageReport);

  // Fail validation if coverage < 80% (configurable)
  const minCoverage = options.minCoverage || 80;
  if (coverageReport.coveragePercentage < minCoverage) {
    console.error(`\n❌ AC coverage below minimum (${minCoverage}%)`);
    process.exit(1);
  }

  console.log('\n✅ Validation passed!\n');
}
```

#### `/specweave:done` Enhancement

**File**: `plugins/specweave/commands/specweave-done.md`

**Updated Implementation**:
```typescript
// src/cli/commands/done.ts
import { validateACCoverage } from '../../validators/ac-coverage-validator.js';

export async function doneCommand(incrementId: string, options = {}) {
  console.log(`\n📋 Closing increment ${incrementId}...\n`);

  // Pre-closure validation
  console.log('Running pre-closure validation...\n');

  const incrementPath = `.specweave/increments/${incrementId}`;
  const coverageReport = validateACCoverage(incrementPath);

  // Check for orphan tasks
  if (coverageReport.orphanTasks.length > 0 && !options.force) {
    console.error('❌ Cannot close increment: Orphan tasks detected');
    console.error('   Tasks with no AC coverage:', coverageReport.orphanTasks.join(', '));
    console.error('\n   Fix by adding **Satisfies ACs** field to tasks');
    console.error('   Or use --force flag to override (not recommended)\n');
    process.exit(1);
  }

  // Check for uncovered ACs
  if (coverageReport.uncoveredACs.length > 0 && !options.force) {
    console.error('❌ Cannot close increment: Uncovered ACs detected');
    console.error('   Acceptance criteria with no tasks:', coverageReport.uncoveredACs.join(', '));
    console.error('\n   Fix by creating tasks or updating scope in spec.md');
    console.error('   Or use --force flag to override (not recommended)\n');
    process.exit(1);
  }

  console.log('✓ All tasks linked to User Stories');
  console.log(`✓ All ACs covered (${coverageReport.totalACs}/${coverageReport.totalACs}, 100%)`);
  console.log('✓ No orphan tasks detected');
  console.log('✓ Living docs synchronized\n');

  console.log('✅ Increment ready to close\n');

  // Proceed with closure (generate completion report, update metadata, etc.)
  // ...
}
```

---

## Data Model

### Task Interface (Updated)

```typescript
interface Task {
  // Existing fields
  id: string;                    // T-001
  title: string;                 // Task title
  status: TaskStatus;            // pending | in_progress | completed | transferred
  priority?: string;             // P0, P1, P2, P3
  estimatedEffort?: string;      // "4 hours", "2 days"
  dependencies?: string[];       // [T-000, T-001]
  description?: string;          // Full description
  filesAffected?: string[];      // [src/path/file.ts]

  // NEW fields for US-Task linkage
  userStory?: string;            // US-001 (optional for backward compat)
  satisfiesACs?: string[];       // [AC-US1-01, AC-US1-02] (optional)
}

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'transferred';
```

### tasks.md Frontmatter (Updated)

```yaml
---
total_tasks: 25
completed: 18
by_user_story:          # NEW: Task counts by User Story
  US-001: 11
  US-002: 4
  US-003: 4
  US-004: 3
  US-005: 2
  US-006: 1
test_mode: test-after
coverage_target: 90
---
```

---

## File Structure

### New/Modified Files

```
src/
├── generators/spec/
│   └── task-parser.ts              # NEW: Extract US linkage fields
│
├── validators/
│   └── ac-coverage-validator.ts    # NEW: AC coverage validation
│
plugins/specweave/
├── skills/spec-generator/
│   └── templates/
│       └── tasks.md.mustache       # MODIFIED: Hierarchical structure
│
├── lib/hooks/
│   └── sync-living-docs.js         # MODIFIED: Use US linkage
│
├── hooks/
│   └── post-task-completion.sh     # MODIFIED: Pass feature ID
│
└── commands/
    ├── specweave-validate.md       # MODIFIED: Add AC coverage
    └── specweave-done.md           # MODIFIED: Validate linkage

scripts/
└── migrate-task-linkage.ts         # NEW: Migration tool

tests/
├── unit/generators/
│   └── task-parser.test.ts         # NEW: Parser tests
│
├── integration/
│   ├── hooks/
│   │   └── sync-living-docs.test.ts # NEW: Sync tests
│   └── commands/
│       ├── validate-ac-coverage.test.ts  # NEW
│       └── done-validation.test.ts       # NEW
│
└── fixtures/
    └── 0047-test-increment/        # NEW: Test fixture
        ├── spec.md
        └── tasks.md
```

---

## Testing Strategy

### Unit Tests (95%+ coverage target)

**File**: `tests/unit/generators/task-parser.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { parseTasksWithUSLinks, validateTaskLinkage } from '../../../src/generators/spec/task-parser';

describe('parseTasksWithUSLinks', () => {
  it('should extract userStory field from tasks', () => {
    const tasksContent = `
### T-001: Implement login

**User Story**: US-001
**Status**: [x] completed
    `;
    // Test implementation...
  });

  it('should extract satisfiesACs field from tasks', () => {
    const tasksContent = `
### T-001: Implement login

**Satisfies ACs**: AC-US1-01, AC-US1-02
    `;
    // Test implementation...
  });

  it('should group tasks by User Story', () => {
    // Test hierarchical grouping
  });

  it('should handle tasks without US linkage (backward compat)', () => {
    // Old format should not throw errors
  });
});

describe('validateTaskLinkage', () => {
  it('should detect invalid US-ID references', () => {
    const task = { id: 'T-001', userStory: 'US-999' };
    const validUSIds = ['US-001', 'US-002'];
    const errors = validateTaskLinkage(task, validUSIds, []);
    expect(errors).toContain('Invalid US-ID: US-999');
  });

  it('should detect invalid AC-ID references', () => {
    const task = { id: 'T-001', satisfiesACs: ['AC-US1-01', 'AC-US9-99'] };
    const validACIds = ['AC-US1-01', 'AC-US1-02'];
    const errors = validateTaskLinkage(task, [], validACIds);
    expect(errors).toContain('Invalid AC-ID: AC-US9-99');
  });
});
```

**File**: `tests/unit/validators/ac-coverage-validator.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { validateACCoverage } from '../../../src/validators/ac-coverage-validator';

describe('validateACCoverage', () => {
  it('should detect uncovered ACs', () => {
    const incrementPath = 'tests/fixtures/0047-test-increment';
    const report = validateACCoverage(incrementPath);

    expect(report.totalACs).toBe(15);
    expect(report.coveredACs).toBe(13);
    expect(report.uncoveredACs).toEqual(['AC-US2-05', 'AC-US3-04']);
    expect(report.coveragePercentage).toBe(87);
  });

  it('should detect orphan tasks', () => {
    const report = validateACCoverage('tests/fixtures/0047-test-increment');
    expect(report.orphanTasks).toEqual(['T-015', 'T-020']);
  });

  it('should build AC-to-tasks traceability map', () => {
    const report = validateACCoverage('tests/fixtures/0047-test-increment');
    expect(report.acToTasksMap.get('AC-US1-01')).toEqual(['T-001', 'T-002']);
  });
});
```

### Integration Tests (85%+ coverage target)

**File**: `tests/integration/hooks/sync-living-docs.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { syncTasksToLivingDocs } from '../../../plugins/specweave/lib/hooks/sync-living-docs';
import fs from 'fs-extra';

describe('syncTasksToLivingDocs', () => {
  const testDir = 'tests/fixtures/0047-test-increment';

  beforeEach(async () => {
    // Setup test increment with tasks.md and living docs
    await fs.copy('tests/fixtures/templates/increment', testDir);
  });

  afterEach(async () => {
    // Cleanup
    await fs.remove(testDir);
  });

  it('should update living docs US file task section', async () => {
    await syncTasksToLivingDocs(testDir, 'specweave', 'FS-047');

    const usPath = `${testDir}/../../docs/internal/specs/specweave/FS-047/us-001-*.md`;
    const content = await fs.readFile(usPath, 'utf-8');

    expect(content).toContain('- [x] [T-001](../../../../increments/0047/tasks.md#T-001): Implement task parser');
    expect(content).not.toContain('_No tasks defined for this user story_');
  });

  it('should update AC checkboxes based on task completion', async () => {
    await syncTasksToLivingDocs(testDir, 'specweave', 'FS-047');

    const usPath = `${testDir}/../../docs/internal/specs/specweave/FS-047/us-001-*.md`;
    const content = await fs.readFile(usPath, 'utf-8');

    // T-001 completed and satisfies AC-US1-01
    expect(content).toContain('- [x] **AC-US1-01**');

    // AC-US1-02 not yet satisfied
    expect(content).toContain('- [ ] **AC-US1-02**');
  });
});
```

### E2E Tests (90%+ scenarios covered)

**File**: `tests/e2e/us-task-linkage.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('US-Task Linkage E2E', () => {
  it('should validate AC coverage before closure', () => {
    // Create test increment
    execSync('specweave increment "Test Feature" --test-mode');

    // Attempt closure with uncovered ACs
    const result = execSync('specweave done 0048', { encoding: 'utf-8' });

    expect(result).toContain('Cannot close increment: Uncovered ACs detected');
    expect(result).toContain('AC-US2-05');
  });

  it('should sync task completion to living docs', () => {
    // Mark task as completed
    execSync('specweave do --task T-001 --complete');

    // Check living docs updated
    const usContent = fs.readFileSync('.specweave/docs/internal/specs/specweave/FS-048/us-001-*.md', 'utf-8');
    expect(usContent).toContain('- [x] [T-001]');
  });
});
```

---

## Migration Strategy

### Phase 1: Backward Compatible Parser (Day 1)

**Goal**: Support both old and new task formats

**Implementation**:
1. Create task-parser.ts with optional fields (userStory?, satisfiesACs?)
2. Parser warns but doesn't fail for tasks without US linkage
3. Unit tests cover both formats

**Success Criteria**:
- All existing increments (0001-0046) parse without errors
- New increments can use new format
- No breaking changes to existing workflows

---

### Phase 2: Template & Generator Updates (Day 2)

**Goal**: Generate tasks.md with new hierarchical structure

**Implementation**:
1. Update tasks.md.mustache template
2. Update spec-generator to populate userStory and satisfiesACs fields
3. Update PM agent prompt to include US linkage requirements
4. Integration tests for generator

**Success Criteria**:
- New increments (0048+) generated with US linkage
- Template produces valid tasks.md structure
- Frontmatter includes by_user_story map

---

### Phase 3: Living Docs Sync Enhancement (Days 3-4)

**Goal**: Auto-sync task completion to living docs

**Implementation**:
1. Update sync-living-docs.js to use parseTasksWithUSLinks()
2. Implement updateUSTaskSection() function
3. Implement updateACCheckboxes() function
4. Update post-task-completion.sh hook to pass feature ID
5. Integration tests for sync behavior

**Success Criteria**:
- Task completion updates living docs US files
- AC checkboxes sync based on satisfiesACs field
- Sync completes in < 500ms (95th percentile)
- No "No tasks defined" messages in living docs

---

### Phase 4: Validation Extensions (Day 5)

**Goal**: Detect uncovered ACs and orphan tasks

**Implementation**:
1. Create ac-coverage-validator.ts
2. Update `/specweave:validate` command
3. Update `/specweave:done` with closure validation gate
4. Command integration tests

**Success Criteria**:
- `/specweave:validate` detects all uncovered ACs
- `/specweave:done` blocks closure if validation fails
- Clear error messages with actionable fixes
- --force flag allows override (logged)

---

### Phase 5: Migration Tooling (Days 6-7)

**Goal**: Backport US linkage to existing increments

**Implementation**:
1. Create migrate-task-linkage.ts script
2. Implement inference algorithm (keyword matching, AC-ID extraction)
3. Add dry-run mode and interactive prompts
4. Test migration on increments 0043-0046

**Migration Algorithm**:
```typescript
function inferUSLinkage(specPath: string, tasksPath: string): TaskLinkageSuggestions {
  // 1. Parse spec.md to get User Stories and AC-IDs
  const { userStories } = parseSpecMd(specPath);

  // 2. Parse tasks.md to get tasks
  const tasks = parseTasks(tasksPath);

  // 3. For each task, infer User Story based on:
  //    - AC-IDs mentioned in task description
  //    - Keywords matching US title
  //    - File paths matching US scope

  const suggestions = [];
  tasks.forEach(task => {
    const inferredUS = inferUserStoryFromTask(task, userStories);
    const inferredACs = inferACsFromTask(task, userStories);

    suggestions.push({
      taskId: task.id,
      userStory: inferredUS,
      satisfiesACs: inferredACs,
      confidence: calculateConfidence(task, inferredUS, inferredACs)
    });
  });

  return suggestions;
}
```

**Success Criteria**:
- 90%+ accuracy in US linkage inference
- Interactive confirmation for low-confidence suggestions
- Dry-run mode shows changes before applying
- Batch migration supports all increments (0001-0046)

---

### Phase 6: Documentation & Rollout (Day 8)

**Goal**: Update documentation and migrate existing increments

**Implementation**:
1. Update CLAUDE.md with new task format section
2. Update CONTRIBUTING.md with examples
3. Update PM agent prompt to require US linkage
4. Run migration on all existing increments
5. Create completion report

**Documentation Updates**:

**CLAUDE.md**:
```markdown
## Task Format (v0.23.0+)

ALL tasks MUST include US linkage fields:

### T-001: Task Title

**User Story**: US-001                        ← Link to parent US
**Satisfies ACs**: AC-US1-01, AC-US1-02      ← AC coverage
**Status**: [x] completed
**Priority**: P0

...
```

**CONTRIBUTING.md**:
```markdown
## Writing Tasks with US Linkage

When creating tasks in tasks.md:

1. Group tasks by User Story
2. Always include **User Story** field
3. Always include **Satisfies ACs** field
4. Reference valid AC-IDs from spec.md

Example:
```markdown
## User Story: US-001 - User Authentication

### T-001: Implement login API

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
...
```
```

**Success Criteria**:
- All documentation updated
- Migration successful for 90%+ of increments
- Completion report documents results
- No regressions in existing workflows

---

## Performance Targets

### Parsing Performance
- Task parser: < 100ms for 100 tasks
- Spec parser: < 50ms for 20 user stories
- Total parse time: < 200ms for typical increment

### Sync Performance
- Living docs sync: < 500ms for 50 user stories (95th percentile)
- AC checkbox updates: < 100ms for 20 ACs
- Total sync time: < 1 second for typical increment

### Validation Performance
- AC coverage validation: < 500ms for 20 user stories
- Orphan task detection: < 100ms for 100 tasks
- Total validation: < 1 second for typical increment

**Optimization Techniques**:
1. Lazy parsing (only parse when needed)
2. Caching (cache parsed results during command execution)
3. Batch file updates (reduce I/O operations)
4. Parallel processing (validate multiple increments concurrently)

---

## Error Handling

### Parser Errors
```typescript
try {
  const tasks = parseTasksWithUSLinks(tasksPath);
} catch (error) {
  if (error instanceof TaskParseError) {
    console.error(`Parse error in ${tasksPath}:`);
    console.error(`  Line ${error.lineNumber}: ${error.message}`);
    console.error(`  Fix: ${error.suggestedFix}`);
  }
  throw error;
}
```

### Validation Errors
```typescript
const report = validateACCoverage(incrementPath);
if (report.uncoveredACs.length > 0) {
  console.error('❌ Uncovered Acceptance Criteria:');
  report.uncoveredACs.forEach(acId => {
    const usId = extractUSFromACId(acId);  // AC-US1-01 → US-001
    console.error(`  ${acId}: Add task to satisfy this AC`);
    console.error(`    Suggestion: Create task linked to ${usId}`);
  });
}
```

### Sync Errors
```typescript
try {
  syncTasksToLivingDocs(incrementPath, projectId, featureId);
} catch (error) {
  console.error('❌ Living docs sync failed:', error.message);
  console.error('   Run manually: /specweave:sync-docs update');
  // Don't fail the entire operation, just warn
}
```

---

## Rollback Plan

### If Parser Breaks Existing Increments

**Detection**: Integration tests fail, existing increments unparseable

**Rollback Steps**:
1. Revert task-parser.ts changes: `git revert <commit>`
2. Restore old template: `git restore plugins/specweave/skills/spec-generator/templates/tasks.md.mustache`
3. Run smoke tests: `npm run test:smoke`
4. Document failure reason: `.specweave/increments/0047/reports/rollback-report.md`

**Root Cause Analysis**:
- Why did backward compatibility fail?
- What test cases were missed?
- How to prevent in future?

---

### If Living Docs Sync Corrupts Data

**Detection**: Living docs files have malformed content, git diff shows unexpected changes

**Rollback Steps**:
1. Restore living docs from git: `git restore .specweave/docs/internal/specs/`
2. Disable sync hook temporarily: `chmod -x plugins/specweave/hooks/post-task-completion.sh`
3. Revert sync-living-docs.js changes: `git revert <commit>`
4. Manual sync until fixed: `/specweave:sync-docs update`

**Prevention**:
- Add dry-run mode to sync hook (preview changes before applying)
- Add backup/snapshot before sync (rollback on failure)
- Add schema validation (verify living docs structure before write)

---

## References

### Related ADRs (To Be Created)

- **ADR-0084**: US-Task Linkage Architecture (core decision)
- **ADR-0085**: Task Format Specification (format choice)
- **ADR-0086**: Backward Compatibility Strategy (migration approach)

### Related Documentation

- **Increment Lifecycle Guide**: `.specweave/docs/internal/delivery/guides/increment-lifecycle.md`
- **Living Docs Architecture**: `.specweave/docs/internal/architecture/hld-system.md` (traceability section)
- **Bidirectional Linking Guide**: `.specweave/docs/public/guides/bidirectional-linking.md`
- **Proposal**: `.specweave/increments/0046-console-elimination/reports/US-TASK-LINKAGE-PROPOSAL.md`

### Related Increments

- **0043**: Spec.md Desync Fix (dual-write pattern reference)
- **0044**: Integration Testing (source of truth violation incident)
- **0046**: Console Elimination (demonstrates the problem)

---

## Success Metrics

### Implementation Success

- [ ] All unit tests passing (95%+ coverage)
- [ ] All integration tests passing (85%+ coverage)
- [ ] E2E tests covering full lifecycle
- [ ] Performance targets met (< 1s sync, < 500ms validation)
- [ ] Backward compatibility verified (increments 0001-0046 work)

### Adoption Success

- [ ] 100% of new increments (0048+) use US linkage
- [ ] 90%+ of existing increments migrated
- [ ] Zero "No tasks defined" in living docs (new increments)
- [ ] `/specweave:validate` catches 100% of uncovered ACs

### Quality Success

- [ ] No regressions in existing workflows
- [ ] Documentation complete (CLAUDE.md, CONTRIBUTING.md, living docs)
- [ ] Migration tooling reliable (90%+ accuracy)
- [ ] Clear error messages with actionable fixes

---

**This plan provides complete technical implementation details for US-Task Linkage Architecture. Estimated effort: 5-8 days.**
