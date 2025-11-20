# Implementation Plan: US-Task Linkage Architecture

**Increment**: 0047-us-task-linkage
**Priority**: P0 (Critical)
**Estimated Effort**: 8-11 days (original: 5-8 days, +3 days for external format preservation)
**Tech Stack**: TypeScript, Node.js CLI, Vitest

---

## Executive Summary

This plan details the technical implementation of complete US-Task-AC traceability in SpecWeave with granular external tool permissions. The core enhancement adds explicit linkage fields to tasks.md (`userStory` and `satisfiesACs`), enabling automatic living docs synchronization, AC coverage validation, and progress tracking by User Story. External tool sync is controlled by 3 independent permission flags for maximum flexibility.

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

### 6. External Import Service (`src/importers/`)

**Purpose**: Import existing User Stories and Tasks from external tools (GitHub/JIRA/ADO) after `specweave init`

**Architecture**:
```typescript
// src/importers/external-importer.ts
export interface ExternalItem {
  externalId: string;        // GH-#638, JIRA-SPEC-789, ADO-12345
  externalUrl: string;        // Full URL
  title: string;
  description: string;
  status: string;             // External status
  createdAt: Date;
  updatedAt: Date;
  labels?: string[];
  assignee?: string;
}

export interface ImportConfig {
  timeRangeMonths: number;    // Default: 1
  pageSize: number;           // Platform-specific max
  labelFilter?: string[];     // GitHub labels, JIRA issue types
  stateFilter?: string[];     // open, closed, resolved
}

export interface Importer {
  platform: 'github' | 'jira' | 'ado';
  import(config: Import Config): Promise<ExternalItem[]>;
  paginate(config: ImportConfig): AsyncGenerator<ExternalItem[], void, unknown>;
}

// GitHub Importer
export class GitHubImporter implements Importer {
  platform = 'github' as const;

  async import(config: ImportConfig): Promise<ExternalItem[]> {
    const items: ExternalItem[] = [];
    for await (const page of this.paginate(config)) {
      items.push(...page);
    }
    return items;
  }

  async *paginate(config: ImportConfig): AsyncGenerator<ExternalItem[]> {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const since = new Date();
    since.setMonth(since.getMonth() - config.timeRangeMonths);

    let page = 1;
    while (true) {
      const response = await octokit.issues.listForRepo({
        owner: this.owner,
        repo: this.repo,
        since: since.toISOString(),
        state: 'all',
        per_page: config.pageSize,
        page: page
      });

      if (response.data.length === 0) break;

      yield response.data.map(issue => ({
        externalId: `GH-#${issue.number}`,
        externalUrl: issue.html_url,
        title: issue.title,
        description: issue.body || '',
        status: issue.state,
        createdAt: new Date(issue.created_at),
        updatedAt: new Date(issue.updated_at),
        labels: issue.labels.map(l => typeof l === 'string' ? l : l.name || ''),
        assignee: issue.assignee?.login
      }));

      page++;
    }
  }
}

// JIRA Importer
export class JiraImporter implements Importer {
  platform = 'jira' as const;

  async *paginate(config: ImportConfig): AsyncGenerator<ExternalItem[]> {
    const jira = new JiraClient({ host: process.env.JIRA_HOST, ... });
    const jql = `project = SPEC AND created >= -${config.timeRangeMonths * 30}d`;

    let startAt = 0;
    while (true) {
      const response = await jira.searchJira(jql, {
        startAt,
        maxResults: config.pageSize
      });

      if (response.issues.length === 0) break;

      yield response.issues.map(issue => ({
        externalId: issue.key,
        externalUrl: `${process.env.JIRA_HOST}/browse/${issue.key}`,
        title: issue.fields.summary,
        description: issue.fields.description || '',
        status: issue.fields.status.name,
        createdAt: new Date(issue.fields.created),
        updatedAt: new Date(issue.fields.updated),
        labels: issue.fields.labels
      }));

      startAt += response.issues.length;
      if (startAt >= response.total) break;
    }
  }
}

// ADO Importer (similar pattern)
export class ADOImporter implements Importer { ... }

// Import Coordinator
export class ImportCoordinator {
  constructor(private importers: Importer[]) {}

  async importAll(config: ImportConfig): Promise<Map<string, ExternalItem[]>> {
    const results = new Map<string, ExternalItem[]>();

    for (const importer of this.importers) {
      console.log(`Importing from ${importer.platform}...`);
      const items = await importer.import(config);
      results.set(importer.platform, items);
      console.log(`✓ Imported ${items.length} items from ${importer.platform}`);
    }

    return results;
  }
}
```

**Integration with `specweave init`**:
```typescript
// src/cli/commands/init.ts
export async function initCommand(projectPath: string) {
  // ... existing init logic ...

  // Detect external tools
  const hasGitHub = await detectGitHubRemote(projectPath);
  const hasJira = !!process.env.JIRA_HOST;
  const hasADO = !!process.env.ADO_ORG_URL;

  if (hasGitHub || hasJira || hasADO) {
    const answer = await prompts({
      type: 'confirm',
      name: 'importExternal',
      message: 'Import existing items from external tools?',
      initial: true
    });

    if (answer.importExternal) {
      const importers: Importer[] = [];
      if (hasGitHub) importers.push(new GitHubImporter());
      if (hasJira) importers.push(new JiraImporter());
      if (hasADO) importers.push(new ADOImporter());

      const coordinator = new ImportCoordinator(importers);
      const importedItems = await coordinator.importAll({
        timeRangeMonths: 1,
        pageSize: 100
      });

      // Convert to SpecWeave User Stories with format preservation metadata
      await convertAndSyncImportedItems(importedItems, projectPath);
    }
  }
}

async function convertAndSyncImportedItems(
  items: ExternalItem[],
  projectPath: string
): Promise<void> {
  for (const item of items) {
    // Create living docs US file with format preservation metadata
    const usFile = {
      id: await generateUSId('external'),  // US-001E, US-002E, etc.
      title: item.title,                   // Original title
      origin: 'external',                  // NEW: Mark as external
      format_preservation: true,           // NEW: Enable format preservation
      external_source: item.platform,      // NEW: github | jira | ado
      external_id: item.externalId,        // NEW: GH-#638, etc.
      external_url: item.externalUrl,      // NEW: Link to original item
      external_title: item.title,          // NEW: Store original for validation
      imported_at: new Date().toISOString(), // NEW: Import timestamp
      description: item.description,
      status: 'pending',
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };

    await createLivingDocsFile(usFile, projectPath);
  }
}
```

**Critical Metadata Fields** (NEW for format preservation):
- `format_preservation`: Always `true` for external items
- `external_title`: Original title for post-sync validation
- `external_source`: Platform identifier (github | jira | ado)
- `external_id`: Original external ID (GH-#638, JIRA-SPEC-789, etc.)
- `external_url`: Direct link to external item
- `imported_at`: ISO timestamp of import

---

### 7. ID Generator with Origin Tracking (`src/id-generators/`)

**Purpose**: Generate unique IDs with origin suffix (E = External)

**Implementation**:
```typescript
// src/id-generators/us-id-generator.ts
export type Origin = 'internal' | 'external';

export interface UserStoryIdMetadata {
  id: string;              // US-001 or US-001E
  origin: Origin;
  externalId?: string;     // GH-#638, JIRA-SPEC-789
  externalUrl?: string;
}

export class USIdGenerator {
  /**
   * Get next available User Story ID
   * @param existingIds - All existing US IDs (internal and external)
   * @param origin - Origin of new item
   * @returns Next sequential ID with appropriate suffix
   */
  getNextId(existingIds: string[], origin: Origin): string {
    // Extract numeric part from all IDs (ignore E suffix)
    const numbers = existingIds.map(id => {
      const match = id.match(/US-(\d+)E?/);
      return match ? parseInt(match[1], 10) : 0;
    });

    // Find max ID across BOTH internal and external
    const maxId = Math.max(0, ...numbers);
    const nextId = maxId + 1;
    const paddedId = String(nextId).padStart(3, '0');

    // Apply suffix based on origin
    return origin === 'external' ? `US-${paddedId}E` : `US-${paddedId}`;
  }

  /**
   * Validate ID uniqueness
   * @param id - ID to validate
   * @param existingIds - All existing IDs
   * @throws Error if ID already exists
   */
  validateUniqueness(id: string, existingIds: string[]): void {
    if (existingIds.includes(id)) {
      throw new Error(`ID collision detected: ${id} already exists`);
    }
  }

  /**
   * Parse origin from ID
   * @param id - User Story ID
   * @returns Origin type
   */
  parseOrigin(id: string): Origin {
    return id.endsWith('E') ? 'external' : 'internal';
  }
}

// Example usage:
const generator = new USIdGenerator();
const existing = ['US-001', 'US-002', 'US-003E', 'US-004'];

generator.getNextId(existing, 'internal');  // US-005
generator.getNextId(existing, 'external'); // US-006E
```

**Task ID Generator** (similar pattern):
```typescript
// src/id-generators/task-id-generator.ts
export class TaskIdGenerator {
  getNextId(existingIds: string[], origin: Origin): string {
    const numbers = existingIds.map(id => {
      const match = id.match(/T-(\d+)E?/);
      return match ? parseInt(match[1], 10) : 0;
    });

    const maxId = Math.max(0, ...numbers);
    const nextId = maxId + 1;
    const paddedId = String(nextId).padStart(3, '0');

    return origin === 'external' ? `T-${paddedId}E` : `T-${paddedId}`;
  }
}
```

---

### 8. Sync Direction Coordinator (`src/sync/`)

**Purpose**: Orchestrate sync between increment, living docs, and external tools with granular permissions

**CRITICAL RULES**:
1. **Increment → Living Docs**: ALWAYS ONE-WAY (immutable, not configurable)
2. **Living Docs → External Tool**: PERMISSION-CONTROLLED (3 independent flags)
3. **External US → Increment**: MANUAL ONLY (user creates increment explicitly)

**Architecture**:
```typescript
// .specweave/config.json structure
{
  "sync": {
    "enabled": true,
    "profiles": {...},
    "activeProfile": "github-default",
    "settings": {
      // Q1: Can SpecWeave CREATE + UPDATE internal items in external tools?
      "canUpsertInternalItems": false,    // UPSERT = CREATE initially + UPDATE ongoing

      // Q2: Can SpecWeave UPDATE external items (comment-only)?
      "canUpdateExternalItems": false,    // UPDATE via comments (preserves format)

      // Q3: Can SpecWeave UPDATE status for ALL items?
      "canUpdateStatus": false            // Status updates for both internal & external
    }
  }
}

// src/sync/sync-config.ts (TypeScript interface)
export interface SyncSettings {
  canUpsertInternalItems: boolean;    // Default: false
  canUpdateExternalItems: boolean;    // Default: false
  canUpdateStatus: boolean;           // Default: false
}

export interface SyncConfig {
  enabled: boolean;
  profiles: Record<string, SyncProfile>;
  activeProfile: string | null;
  settings: SyncSettings;

  direction: {
    // Increment → Living Docs (ALWAYS one-way, immutable)
    incrementToLivingDocs: 'one-way';  // NOT configurable

    // Living Docs ↔ External Tool (configurable)
    livingDocsToExternal: {
      internal: 'push-only' | 'push-pull';  // Default: push-only
      external: 'pull-only' | 'pull-push';  // Default: pull-only
    };
  };

  conflictResolution: 'prompt' | 'external-wins' | 'internal-wins';
  syncInterval: number;  // seconds
  autoIncrementCreation: false;  // MUST be false (immutable)
}

// src/sync/increment-to-living-docs.ts
export class IncrementToLivingDocsSync {
  /**
   * Sync increment to living docs (ALWAYS one-way)
   * NEVER reads from living docs to update increment
   */
  async sync(incrementPath: string): Promise<void> {
    const spec = await readSpecMd(incrementPath);
    const tasks = await readTasksMd(incrementPath);

    // ONLY PUSH to living docs (never pull)
    await this.updateLivingDocsFromIncrement(spec, tasks);

    // Direction is IMMUTABLE (not configurable)
  }
}

// src/sync/living-docs-to-external.ts
export class LivingDocsToExternalSync {
  constructor(
    private config: SyncConfig,
    private externalSyncers: Map<string, ExternalSyncer>
  ) {}

  /**
   * Sync living docs with external tools (direction depends on config)
   */
  async sync(livingDocsPath: string): Promise<void> {
    const items = await this.readLivingDocsItems(livingDocsPath);

    for (const item of items) {
      if (item.origin === 'internal') {
        await this.syncInternalUS(item);
      } else {
        await this.syncExternalUS(item);
      }
    }
  }

  /**
   * Sync internal US (permission-controlled)
   */
  private async syncInternalUS(item: UserStory): Promise<void> {
    const syncer = this.getSyncer(item.platform);

    // Q1: Can we UPSERT (CREATE + UPDATE) external items for internal US?
    if (!this.config.settings.canUpsertInternalItems) {
      // Permission denied: skip external item creation/updates entirely
      return;
    }

    // Push: Living Docs → External Tool (CREATE initially, UPDATE ongoing)
    await syncer.push(item, {
      updateTitle: true,
      updateDescription: true,
      updateACs: true,
      updateStatus: this.config.settings.canUpdateStatus  // Q3: Status permission
    });
  }

  /**
   * Sync external US (permission-controlled)
   */
  private async syncExternalUS(item: UserStory): Promise<void> {
    const syncer = this.getSyncer(item.platform);

    // ALWAYS pull: External Tool → Living Docs (refresh snapshot)
    const updates = await syncer.pull(item.externalId);
    if (updates) {
      await this.updateLivingDocs(item.id, updates);
    }

    // Q2: Can we update external items created elsewhere?
    if (!this.config.settings.canUpdateExternalItems) {
      // Permission denied: skip push to external tool
      // Note: Living spec remains as read-only snapshot
      return;
    }

    // Push: Living Docs → External Tool (full content updates)
    // NOTE: Full updates allowed (title, description, ACs, tasks, comments)
    await syncer.push(item, {
      updateTitle: true,          // Update title (enforce format: [FS-XXX][US-YYY])
      updateDescription: true,    // Update description (sync from living spec)
      updateACs: true,            // Update acceptance criteria
      updateTasks: true,          // Update tasks/subtasks
      updateStatus: this.config.settings.canUpdateStatus,  // Q3: Status permission
      addComments: true           // Add progress comments
    });
  }

  /**
   * Detect and resolve conflicts (only when both permissions enabled)
   */
  async detectConflicts(items: UserStory[]): Promise<SyncConflict[]> {
    // Only check conflicts when we have both upsert and update permissions
    if (!this.config.settings.canUpsertInternalItems || !this.config.settings.canUpdateExternalItems) {
      return [];  // No conflicts in one-way mode
    }

    const conflicts: SyncConflict[] = [];

    for (const item of items) {
      const livingDocsVersion = await this.getLivingDocsVersion(item.id);
      const externalVersion = await this.getExternalVersion(item.externalId!);

      if (this.hasConflict(livingDocsVersion, externalVersion)) {
        conflicts.push({
          itemId: item.id,
          livingDocsVersion,
          externalVersion,
          conflictType: 'concurrent-update'
        });
      }
    }

    return conflicts;
  }
}

export interface ExternalSyncer {
  platform: string;
  push(item: UserStory): Promise<void>;  // Living Docs → External Tool
  pull(externalId: string): Promise<Partial<UserStory> | null>;  // External Tool → Living Docs
}
```

**Sync Behavior Matrix (Permission-Based)**:

| Origin | Q1: UPSERT | Q2: UPDATE | Q3: STATUS | External Item? | Title Update | Description Update | Status Update | Comment Updates |
|--------|-----------|------------|------------|---------------|--------------|-------------------|---------------|-----------------|
| **Internal** | ✅ true | - | ✅ true | ✅ Created + Updated | ✅ Enforce `[FS-XXX][US-YYY]` | ✅ Update with ACs/Tasks | ✅ Yes | ✅ Yes |
| **Internal** | ✅ true | - | ❌ false | ✅ Created + Updated | ✅ Enforce `[FS-XXX][US-YYY]` | ✅ Update with ACs/Tasks | ❌ No | ✅ Yes |
| **Internal** | ❌ false | - | - | ❌ **NO external item** | N/A (local only) | N/A (local only) | N/A | N/A |
| **External** | - | ✅ true | ✅ true | 📥 Pre-existing | ✅ Update (enforce format) | ✅ Update with ACs/Tasks | ✅ Yes | ✅ Yes |
| **External** | - | ✅ true | ❌ false | 📥 Pre-existing | ✅ Update (enforce format) | ✅ Update with ACs/Tasks | ❌ No | ✅ Yes |
| **External** | - | ❌ false | ✅ true | 📥 Pre-existing | ❌ NO sync | ❌ NO sync | ✅ Yes (via comment) | ✅ Yes (status comment) |
| **External** | - | ❌ false | ❌ false | 📥 Pre-existing | ❌ NO sync | ❌ NO sync | ❌ No | ❌ No |

**Key Principles**:
- Q1 (UPSERT) controls internal items: CREATE external item initially + UPDATE as work progresses
- Q2 (UPDATE) controls external items: FULL content updates (title, description, ACs, tasks, comments)
- Q3 (STATUS) affects BOTH item types: Status updates for internal AND external items
- External items with UPDATE=true get format enforcement ([FS-XXX][US-YYY] in title)
- Internal items with UPSERT=false remain local-only (no external tool integration)

---

#### Format Preservation Sync Service

```typescript
// src/sync/format-preservation-sync.ts
export class FormatPreservationSyncService {
  constructor(
    private config: SyncConfig,
    private externalClient: ExternalToolClient
  ) {}

  /**
   * Sync user story to external tool with format preservation rules
   */
  async syncUserStory(us: UserStory): Promise<void> {
    const formatPreservation = us.formatPreservation ?? (us.origin === 'external');

    if (formatPreservation) {
      // External item: Comment-only mode (preserve original format)

      // Q2: Check if we can update external items
      if (!this.config.settings.canUpdateExternalItems) {
        // Permission denied: NO sync for external items (read-only snapshot)
        return;
      }

      // Post completion comment (non-invasive update)
      await this.addCompletionComment(us);

      // Q3: Status update only if permitted
      if (this.config.settings.canUpdateStatus) {
        await this.updateStatusViaComment(us);  // Status via comment for external items
      }

      // NEVER update title or description for external items
      this.validateFormatPreserved(us);
    } else {
      // Internal item: Full sync mode (UPSERT)

      // Q1: Check if we can UPSERT (CREATE + UPDATE) internal items
      if (!this.config.settings.canUpsertInternalItems) {
        // Permission denied: NO external item creation/updates (local-only)
        return;
      }

      // Full updates allowed for internal items (CREATE initially, UPDATE ongoing)
      await this.updateTitle(us);
      await this.updateDescription(us);
      await this.addCompletionComment(us);

      // Q3: Status update if permitted
      if (this.config.settings.canUpdateStatus) {
        await this.updateStatus(us);  // Direct status update for internal items
      }
    }
  }

  /**
   * Add completion comment (non-invasive update)
   */
  private async addCompletionComment(us: UserStory): Promise<void> {
    const completedTasks = us.tasks.filter(t => t.status === 'completed');
    const satisfiedACs = this.getSatisfiedACs(completedTasks);

    const comment = this.buildCompletionComment({
      featureId: us.featureId,
      usId: us.id,
      tasks: completedTasks,
      acs: satisfiedACs,
      progress: `${completedTasks.length}/${us.tasks.length}`,
    });

    await this.externalClient.addComment(us.externalId!, comment);
  }

  /**
   * Build completion comment with task, AC, and progress info
   */
  private buildCompletionComment(data: CompletionData): string {
    return `
## ✅ SpecWeave Progress Update

**Feature**: [${data.featureId}](link-to-living-docs)
**User Story**: [${data.usId}](link-to-us)
**Progress**: ${data.progress} tasks completed

### Completed Tasks
${data.tasks.map(t => `- ✅ [${t.id}](link): ${t.title}`).join('\n')}

### Satisfied Acceptance Criteria
${data.acs.map(ac => `- ✅ **${ac.id}**: ${ac.title}`).join('\n')}

---
_Updated by SpecWeave on ${new Date().toISOString()}_
    `.trim();
  }

  /**
   * Update title (ONLY for internal items)
   */
  private async updateTitle(us: UserStory): Promise<void> {
    const newTitle = `[${us.featureId}][${us.id}] ${us.title}`;
    await this.externalClient.updateTitle(us.externalId!, newTitle);
  }

  /**
   * Update description (ONLY for internal items)
   */
  private async updateDescription(us: UserStory): Promise<void> {
    const description = this.buildDescription(us);
    await this.externalClient.updateDescription(us.externalId!, description);
  }

  /**
   * Update status (if canUpdateStatus permission enabled)
   */
  private async updateStatus(us: UserStory): Promise<void> {
    const newStatus = us.status === 'completed' ? 'closed' : 'open';
    await this.externalClient.updateStatus(us.externalId!, newStatus);
  }

  /**
   * Validate format preserved for external items
   */
  private validateFormatPreserved(us: UserStory): void {
    if (us.origin === 'external' && us.formatPreservation) {
      // Fetch current external item
      const externalItem = await this.externalClient.getItem(us.externalId!);

      // CRITICAL: Title MUST NOT be changed
      if (externalItem.title !== us.externalTitle) {
        throw new Error(
          `Format preservation violation: External item title was modified.\n` +
          `  Expected: "${us.externalTitle}"\n` +
          `  Actual: "${externalItem.title}"\n` +
          `  External items MUST preserve original title.`
        );
      }
    }
  }
}
```

---

```typescript
// src/sync/sync-config-validator.ts
export class SyncConfigValidator {
  validate(config: SyncConfig): void {
    // CRITICAL: Increment → Living Docs MUST be one-way
    if (config.direction.incrementToLivingDocs !== 'one-way') {
      throw new Error(
        'INVALID CONFIG: Increment → Living Docs MUST be one-way. ' +
        'This direction is immutable - external tools cannot write back to active increments.'
      );
    }

    // CRITICAL: Auto-increment creation MUST be disabled
    if (config.autoIncrementCreation === true) {
      throw new Error(
        'INVALID CONFIG: Auto-increment creation is forbidden. ' +
        'User MUST manually create increment when ready to work on external US. ' +
        'Set autoIncrementCreation = false'
      );
    }

    // Warn if full sync enabled (all 3 permissions = true)
    const fullSyncEnabled =
      config.sync?.settings?.canUpsertInternalItems &&
      config.sync?.settings?.canUpdateExternalItems &&
      config.sync?.settings?.canUpdateStatus;

    if (fullSyncEnabled) {
      console.warn('⚠️  Full sync enabled (all permissions: upsert internal + update external + update status)');
      console.warn('   Risk: Conflicts if both SpecWeave and external tool update simultaneously');
      console.warn('   Recommendation: Use selective permissions unless full sync needed');
    }
  }
}
```

**GitHub Syncer**:
```typescript
// src/sync/github-syncer.ts
export class GitHubSyncer implements ExternalSyncer {
  platform = 'github';

  async createOrUpdate(item: SyncItem): Promise<string> {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    if (item.externalId) {
      // Update existing issue
      const issueNumber = this.extractIssueNumber(item.externalId);
      await octokit.issues.update({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        title: item.title,
        state: item.status === 'completed' ? 'closed' : 'open'
      });
      return item.externalId;
    } else {
      // Create new issue
      const response = await octokit.issues.create({
        owner: this.owner,
        repo: this.repo,
        title: `[FS-047][${item.id}] ${item.title}`,
        body: this.generateIssueBody(item)
      });
      return `GH-#${response.data.number}`;
    }
  }

  async getUpdatedItems(): Promise<ExternalItem[]> {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const since = this.getLastSyncTime();

    const response = await octokit.issues.listForRepo({
      owner: this.owner,
      repo: this.repo,
      since: since.toISOString(),
      state: 'all'
    });

    return response.data.map(issue => this.convertToExternalItem(issue));
  }
}
```

### 9. External Import Command (`plugins/specweave/commands/specweave-import-external.md`)

**Purpose**: Dedicated slash command for on-demand external work item import (separate from `specweave init`)

**Command**: `/specweave:import-external [options]`

**Options**:
- `--since=<timerange>` - Time range filter (1m, 3m, 6m, all, or since-last-import)
- `--github-only` - Import from GitHub only
- `--jira-only` - Import from JIRA only
- `--ado-only` - Import from Azure DevOps only
- `--dry-run` - Show what would be imported without creating files
- `--skip-duplicates` - Skip items already imported (default: true)

**Architecture**:
```typescript
// plugins/specweave/commands/specweave-import-external.md
export interface ImportCommandOptions {
  since?: string;           // '1m', '3m', '6m', 'all', 'since-last-import'
  githubOnly?: boolean;
  jiraOnly?: boolean;
  adoOnly?: boolean;
  dryRun?: boolean;
  skipDuplicates?: boolean; // default: true
}

// src/cli/commands/import-external.ts
export async function importExternal(options: ImportCommandOptions = {}) {
  // 1. Detect configured external tools
  const tools = await detectExternalTools();

  if (tools.length === 0) {
    console.log('❌ No external tools configured.');
    console.log('   Configure GitHub, JIRA, or ADO to enable import.');
    return;
  }

  // 2. Apply platform filters
  const activeTools = filterTools(tools, options);

  // 3. Determine time range
  const timeRange = await determineTimeRange(options.since);

  // 4. Load sync metadata (for 'since-last-import')
  const syncMetadata = await loadSyncMetadata();

  // 5. Import from each tool
  let totalImported = 0;
  let totalSkipped = 0;
  const summary: ImportSummary = { byPlatform: {} };

  for (const tool of activeTools) {
    console.log(`\n📥 Importing from ${tool.platform}...`);

    const importer = createImporter(tool);
    const sinceDate = getSinceDate(timeRange, syncMetadata, tool.platform);

    // Paginate and import
    let itemCount = 0;
    for await (const item of importer.paginate(sinceDate)) {
      itemCount++;
      process.stdout.write(`\r   [${itemCount}] ⠋`);

      // Check for duplicates
      if (options.skipDuplicates !== false) {
        const exists = await checkExistingExternalId(item.externalId);
        if (exists) {
          totalSkipped++;
          continue;
        }
      }

      // Convert to living docs format (with E suffix)
      if (!options.dryRun) {
        await convertToLivingDocs(item);
        totalImported++;
      } else {
        console.log(`\n   [DRY-RUN] Would import: ${item.externalId} - ${item.title}`);
      }
    }

    summary.byPlatform[tool.platform] = {
      imported: totalImported,
      skipped: totalSkipped
    };

    // Update sync metadata with last import timestamp
    if (!options.dryRun) {
      await updateSyncMetadata(tool.platform, new Date());
    }
  }

  // 6. Display summary
  console.log('\n\n✅ Import complete!');
  console.log(`   Imported: ${totalImported} items`);
  console.log(`   Skipped: ${totalSkipped} duplicates`);
  console.log('\n📊 By platform:');
  for (const [platform, stats] of Object.entries(summary.byPlatform)) {
    console.log(`   ${platform}: ${stats.imported} imported, ${stats.skipped} skipped`);
  }
}

// src/sync/sync-metadata.ts
export interface SyncMetadata {
  github?: {
    lastImport: string;  // ISO 8601 timestamp
    lastSync: string;
  };
  jira?: {
    lastImport: string;
    lastSync: string;
  };
  ado?: {
    lastImport: string;
    lastSync: string;
  };
}

export async function loadSyncMetadata(): Promise<SyncMetadata> {
  const metadataPath = '.specweave/sync-metadata.json';
  if (await fs.pathExists(metadataPath)) {
    return await fs.readJSON(metadataPath);
  }
  return {};
}

export async function updateSyncMetadata(
  platform: string,
  timestamp: Date
): Promise<void> {
  const metadata = await loadSyncMetadata();

  metadata[platform] = {
    ...metadata[platform],
    lastImport: timestamp.toISOString()
  };

  await fs.writeJSON('.specweave/sync-metadata.json', metadata, { spaces: 2 });
}

// src/importers/external-tool-detector.ts
export interface ExternalTool {
  platform: 'github' | 'jira' | 'ado';
  config: any;
}

export async function detectExternalTools(): Promise<ExternalTool[]> {
  const tools: ExternalTool[] = [];

  // Detect GitHub (check .git/config for remotes)
  const gitConfig = await fs.readFile('.git/config', 'utf-8');
  const githubRemote = gitConfig.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/m);
  if (githubRemote) {
    tools.push({
      platform: 'github',
      config: {
        owner: githubRemote[1],
        repo: githubRemote[2]
      }
    });
  }

  // Detect JIRA (check env vars)
  if (process.env.JIRA_HOST && process.env.JIRA_TOKEN) {
    tools.push({
      platform: 'jira',
      config: {
        host: process.env.JIRA_HOST,
        project: process.env.JIRA_PROJECT
      }
    });
  }

  // Detect Azure DevOps (check env vars)
  if (process.env.ADO_ORG_URL && process.env.ADO_TOKEN) {
    tools.push({
      platform: 'ado',
      config: {
        orgUrl: process.env.ADO_ORG_URL,
        project: process.env.ADO_PROJECT
      }
    });
  }

  return tools;
}
```

**Rate Limiting**:
```typescript
// src/importers/rate-limiter.ts
export class RateLimiter {
  async checkGitHubRateLimit(): Promise<{ remaining: number; resetAt: Date }> {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const { data } = await octokit.rateLimit.get();

    return {
      remaining: data.rate.remaining,
      resetAt: new Date(data.rate.reset * 1000)
    };
  }

  async waitIfNeeded(platform: string): Promise<void> {
    if (platform === 'github') {
      const { remaining, resetAt } = await this.checkGitHubRateLimit();

      if (remaining < 10) {
        const waitMs = resetAt.getTime() - Date.now();
        console.warn(`⚠️  GitHub rate limit low (${remaining} remaining)`);
        console.warn(`   Waiting ${Math.ceil(waitMs / 1000)}s until reset...`);
        await new Promise(resolve => setTimeout(resolve, waitMs + 1000));
      }
    }
  }
}
```

**Duplicate Detection**:
```typescript
// src/importers/duplicate-detector.ts
export async function checkExistingExternalId(
  externalId: string
): Promise<boolean> {
  const livingDocsPath = '.specweave/docs/internal/specs';

  // Search all US files for matching externalId in frontmatter
  const usFiles = await glob(`${livingDocsPath}/**/**/us-*.md`);

  for (const file of usFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const { data } = matter(content);

    if (data.external_id === externalId) {
      return true;  // Duplicate found
    }
  }

  return false;  // Not found, safe to import
}
```

---

### 10. Multi-Repo Selection Strategy (`src/init/`)

**Purpose**: Intelligent GitHub repository selection during `specweave init` for multi-repo organizations

**User Flow**:
```
1. User runs: specweave init .
2. CLI detects GitHub remote
3. CLI queries GitHub API for user's orgs and repos
4. CLI presents 4 selection strategies:
   ┌─────────────────────────────────────────────────────────────┐
   │ How would you like to select GitHub repositories?          │
   │                                                             │
   │ 1. All repos from an organization                          │
   │    → You belong to: acme-corp, microservices-team          │
   │                                                             │
   │ 2. All repos from your personal account                    │
   │    → Found 42 repos owned by @username                     │
   │                                                             │
   │ 3. Pattern matching                                        │
   │    → Example: ec-*, *-backend, microservice-*              │
   │                                                             │
   │ 4. Explicit list                                           │
   │    → Enter comma-separated repo names                      │
   └─────────────────────────────────────────────────────────────┘
5. Show preview of matched repos (table format)
6. Ask for confirmation
7. Save to .specweave/config.json
8. Proceed with import (if requested)
```

**Architecture**:

```typescript
// src/init/github-repo-selector.ts
import { Octokit } from '@octokit/rest';
import prompts from 'prompts';
import minimatch from 'minimatch';

export interface RepoSelectionStrategy {
  type: 'organization' | 'personal' | 'pattern' | 'explicit';
  organization?: string;       // For type: organization
  pattern?: string;             // For type: pattern (e.g., "ec-*")
  repositories?: string[];      // For type: explicit
}

export interface RepoPreview {
  fullName: string;             // owner/repo
  owner: string;
  name: string;
  visibility: 'public' | 'private';
  lastUpdated: Date;
  hasAccess: boolean;           // User has read access
}

export class GitHubRepoSelector {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * Detect user's organizations
   */
  async detectOrganizations(): Promise<string[]> {
    const { data } = await this.octokit.orgs.listForAuthenticatedUser();
    return data.map(org => org.login);
  }

  /**
   * Prompt user for repository selection strategy
   */
  async promptSelectionStrategy(): Promise<RepoSelectionStrategy> {
    const orgs = await this.detectOrganizations();
    const personalRepoCount = await this.countPersonalRepos();

    const response = await prompts({
      type: 'select',
      name: 'strategyType',
      message: 'How would you like to select GitHub repositories?',
      choices: [
        {
          title: `All repos from an organization`,
          description: `You belong to: ${orgs.join(', ')}`,
          value: 'organization',
          disabled: orgs.length === 0
        },
        {
          title: `All repos from your personal account`,
          description: `Found ${personalRepoCount} repos owned by you`,
          value: 'personal'
        },
        {
          title: `Pattern matching (glob)`,
          description: `Example: ec-*, *-backend, microservice-*`,
          value: 'pattern'
        },
        {
          title: `Explicit list (comma-separated)`,
          description: `Enter repo names manually`,
          value: 'explicit'
        }
      ]
    });

    // Strategy-specific prompts
    switch (response.strategyType) {
      case 'organization':
        return await this.promptOrganizationStrategy(orgs);

      case 'personal':
        return { type: 'personal' };

      case 'pattern':
        return await this.promptPatternStrategy();

      case 'explicit':
        return await this.promptExplicitStrategy();
    }
  }

  /**
   * Prompt for organization selection
   */
  private async promptOrganizationStrategy(orgs: string[]): Promise<RepoSelectionStrategy> {
    const response = await prompts({
      type: 'select',
      name: 'organization',
      message: 'Select organization:',
      choices: orgs.map(org => ({ title: org, value: org }))
    });

    return {
      type: 'organization',
      organization: response.organization
    };
  }

  /**
   * Prompt for pattern matching
   */
  private async promptPatternStrategy(): Promise<RepoSelectionStrategy> {
    const response = await prompts({
      type: 'text',
      name: 'pattern',
      message: 'Enter glob pattern (e.g., ec-*, *-backend):',
      validate: (value) => value.length > 0 || 'Pattern cannot be empty'
    });

    return {
      type: 'pattern',
      pattern: response.pattern
    };
  }

  /**
   * Prompt for explicit list
   */
  private async promptExplicitStrategy(): Promise<RepoSelectionStrategy> {
    const response = await prompts({
      type: 'text',
      name: 'repoList',
      message: 'Enter comma-separated repo names (e.g., repo1, repo2, repo3):',
      validate: (value) => value.length > 0 || 'List cannot be empty'
    });

    const repositories = response.repoList
      .split(',')
      .map((r: string) => r.trim())
      .filter((r: string) => r.length > 0);

    return {
      type: 'explicit',
      repositories
    };
  }

  /**
   * Get repos matching strategy
   */
  async getMatchingRepos(strategy: RepoSelectionStrategy): Promise<RepoPreview[]> {
    let repos: any[] = [];

    switch (strategy.type) {
      case 'organization':
        repos = await this.listOrganizationRepos(strategy.organization!);
        break;

      case 'personal':
        repos = await this.listPersonalRepos();
        break;

      case 'pattern':
        repos = await this.listAllAccessibleRepos();
        repos = repos.filter(r => minimatch(r.name, strategy.pattern!));
        break;

      case 'explicit':
        repos = await this.validateExplicitRepos(strategy.repositories!);
        break;
    }

    // Convert to RepoPreview format
    return repos.map(repo => ({
      fullName: repo.full_name,
      owner: repo.owner.login,
      name: repo.name,
      visibility: repo.private ? 'private' : 'public',
      lastUpdated: new Date(repo.updated_at),
      hasAccess: true  // Already validated by GitHub API
    }));
  }

  /**
   * List organization repos (with pagination)
   */
  private async listOrganizationRepos(org: string): Promise<any[]> {
    const repos: any[] = [];
    let page = 1;

    while (true) {
      const { data } = await this.octokit.repos.listForOrg({
        org,
        per_page: 100,
        page
      });

      if (data.length === 0) break;
      repos.push(...data);
      page++;
    }

    return repos;
  }

  /**
   * List personal repos (with pagination)
   */
  private async listPersonalRepos(): Promise<any[]> {
    const repos: any[] = [];
    let page = 1;

    while (true) {
      const { data } = await this.octokit.repos.listForAuthenticatedUser({
        affiliation: 'owner',
        per_page: 100,
        page
      });

      if (data.length === 0) break;
      repos.push(...data);
      page++;
    }

    return repos;
  }

  /**
   * List all accessible repos (for pattern matching)
   */
  private async listAllAccessibleRepos(): Promise<any[]> {
    const repos: any[] = [];
    let page = 1;

    while (true) {
      const { data } = await this.octokit.repos.listForAuthenticatedUser({
        per_page: 100,
        page
      });

      if (data.length === 0) break;
      repos.push(...data);
      page++;
    }

    return repos;
  }

  /**
   * Validate explicit repo list
   */
  private async validateExplicitRepos(repoNames: string[]): Promise<any[]> {
    const repos: any[] = [];

    for (const repoName of repoNames) {
      // Assume format: owner/repo or just repo (use authenticated user)
      const [owner, name] = repoName.includes('/')
        ? repoName.split('/')
        : [await this.getAuthenticatedUser(), repoName];

      try {
        const { data } = await this.octokit.repos.get({ owner, repo: name });
        repos.push(data);
      } catch (error: any) {
        if (error.status === 404) {
          console.warn(`⚠️  Repository not found or no access: ${owner}/${name}`);
        } else {
          throw error;
        }
      }
    }

    return repos;
  }

  /**
   * Count personal repos
   */
  private async countPersonalRepos(): Promise<number> {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      affiliation: 'owner',
      per_page: 1
    });

    // GitHub returns total_count in response
    return data.length > 0 ? data[0].owner.public_repos || 0 : 0;
  }

  /**
   * Get authenticated user
   */
  private async getAuthenticatedUser(): Promise<string> {
    const { data } = await this.octokit.users.getAuthenticated();
    return data.login;
  }

  /**
   * Show preview table of matched repos
   */
  async showPreview(repos: RepoPreview[]): Promise<boolean> {
    console.log('\n📋 Matched Repositories:\n');
    console.table(
      repos.map(r => ({
        'Repository': r.fullName,
        'Visibility': r.visibility,
        'Last Updated': r.lastUpdated.toLocaleDateString(),
        'Access': r.hasAccess ? '✓' : '✗'
      }))
    );

    const response = await prompts({
      type: 'confirm',
      name: 'confirmed',
      message: `Connect these ${repos.length} repositories?`,
      initial: true
    });

    return response.confirmed;
  }

  /**
   * Save selection to config
   */
  async saveToConfig(
    strategy: RepoSelectionStrategy,
    repos: RepoPreview[],
    configPath: string
  ): Promise<void> {
    const config = {
      github: {
        repositories: repos.map(r => r.fullName),
        selectionStrategy: strategy.type,
        ...(strategy.organization && { organization: strategy.organization }),
        ...(strategy.pattern && { pattern: strategy.pattern })
      }
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`\n✅ Saved configuration to ${configPath}`);
  }
}
```

**Integration with `specweave init`**:

```typescript
// src/cli/commands/init.ts (enhanced)
export async function initCommand(projectPath: string) {
  // ... existing init logic ...

  // Detect GitHub remote
  const hasGitHub = await detectGitHubRemote(projectPath);

  if (hasGitHub) {
    console.log('\n🔗 GitHub integration detected');

    // Prompt for GitHub PAT
    const token = await promptForGitHubToken();

    // Create repo selector
    const selector = new GitHubRepoSelector(token);

    // Prompt for selection strategy
    const strategy = await selector.promptSelectionStrategy();

    // Get matching repos
    const repos = await selector.getMatchingRepos(strategy);

    // Show preview and confirm
    const confirmed = await selector.showPreview(repos);

    if (confirmed) {
      // Save to config
      await selector.saveToConfig(
        strategy,
        repos,
        path.join(projectPath, '.specweave/config.json')
      );

      // Optionally import external items
      const shouldImport = await prompts({
        type: 'confirm',
        name: 'import',
        message: 'Import existing issues from these repos?',
        initial: true
      });

      if (shouldImport.import) {
        await importFromGitHub(repos, projectPath);
      }
    }
  }
}
```

**Key Features**:
1. **Organization Detection**: Auto-detect orgs user belongs to
2. **Personal Repos**: List all repos owned by user
3. **Pattern Matching**: Glob patterns with minimatch library
4. **Explicit List**: Validate repos exist before proceeding
5. **Preview Table**: Show repo details before confirmation
6. **Pagination**: Handle orgs/users with 100+ repos
7. **Access Validation**: Check user has read permissions
8. **Config Persistence**: Save to `.specweave/config.json`

---

### 11. Intelligent FS-XXX Folder Creation (`src/living-docs/`)

**Purpose**: Chronologically allocate FS-XXX IDs for external work items based on creation date

**Problem Statement**:
When importing external work items (GitHub issues, JIRA epics), we need to create FS-XXX folders in living docs. Simply appending to the end (max ID + 1) loses chronological context. We want FS-XXX IDs to roughly reflect the actual timeline of work creation.

**Solution: Chronological ID Allocation Algorithm**

```
Algorithm: AllocateFeatureID(workItem)
  1. Extract createdAt timestamp from workItem metadata
  2. Scan active living docs: .specweave/docs/internal/specs/FS-*/
  3. Scan archive: .specweave/docs/_archive/specs/FS-*/
  4. Build ID map: { FS-001: {createdAt: 2024-12-01}, FS-002: {createdAt: 2024-12-15}, ... }
  5. Sort by createdAt ascending
  6. Find insertion point: where workItem.createdAt fits chronologically
  7. If gap exists (e.g., between FS-010 and FS-020), use next available ID in gap (FS-011E)
  8. If no gap (most common), append to end: max(IDs) + 1 with E suffix
  9. Validate no collision (check both FS-XXX and FS-XXXE)
  10. Create folder: .specweave/docs/internal/specs/FS-XXXE/
  11. Update ID registry atomically
```

**Example Scenarios**:

**Scenario 1: Chronological Insertion (Gap)**
```
Existing living docs:
- FS-010 (created 2025-01-10)
- FS-020 (created 2025-01-20)
- FS-030 (created 2025-01-30)

External work item:
- GitHub Milestone #42 (created 2025-01-15)

Allocation:
- workItem.createdAt = 2025-01-15 falls between FS-010 and FS-020
- Next available ID in gap: FS-011
- Allocate: FS-011E (with E suffix for external origin)
```

**Scenario 2: Append Mode (Most Common)**
```
Existing living docs:
- FS-010 (created 2025-01-10)
- FS-020 (created 2025-01-20)
- FS-030 (created 2025-01-30)

External work item:
- GitHub Milestone #99 (created 2025-02-05)

Allocation:
- workItem.createdAt = 2025-02-05 > all existing dates
- Max ID = 030
- Allocate: FS-031E (append to end)
```

**Scenario 3: Collision Detection**
```
Existing living docs:
- FS-010 (created 2025-01-10)
- FS-011E (created 2025-01-12, external)
- FS-020 (created 2025-01-20)

External work item:
- JIRA Epic SPEC-789 (created 2025-01-11)

Allocation:
- workItem.createdAt = 2025-01-11 falls between FS-010 and FS-011E
- Next available: FS-012 (not FS-011, already occupied by FS-011E)
- Allocate: FS-012E
```

**Architecture**:

```typescript
// src/living-docs/fs-id-allocator.ts
export interface FeatureMetadata {
  id: string;              // FS-010, FS-011E
  createdAt: Date;
  origin: 'internal' | 'external';
  externalId?: string;     // GH-Milestone-#42
}

export class FSIdAllocator {
  /**
   * Scan living docs and archive for all FS-XXX IDs
   */
  async scanExistingIds(): Promise<Map<string, FeatureMetadata>> {
    const idMap = new Map();

    // Scan active living docs
    const activeFolders = await glob('.specweave/docs/internal/specs/FS-*/');
    for (const folder of activeFolders) {
      const metadata = await this.parseFeatureMetadata(folder);
      idMap.set(metadata.id, metadata);
    }

    // Scan archive (CRITICAL - archived IDs still occupied)
    const archivedFolders = await glob('.specweave/docs/_archive/specs/FS-*/');
    for (const folder of archivedFolders) {
      const metadata = await this.parseFeatureMetadata(folder);
      idMap.set(metadata.id, metadata);
    }

    return idMap;
  }

  /**
   * Allocate FS-XXX ID chronologically
   */
  async allocateId(
    workItem: ExternalWorkItem,
    origin: 'internal' | 'external'
  ): Promise<string> {
    const existingIds = await this.scanExistingIds();

    // Sort by createdAt
    const sorted = Array.from(existingIds.entries())
      .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime());

    // Try chronological insertion
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i][1];
      const next = sorted[i + 1][1];

      // Check if workItem fits between current and next
      if (
        workItem.createdAt > current.createdAt &&
        workItem.createdAt < next.createdAt
      ) {
        // Find gap between current and next IDs
        const currentNum = parseInt(current.id.match(/FS-(\d+)/)[1], 10);
        const nextNum = parseInt(next.id.match(/FS-(\d+)/)[1], 10);

        if (nextNum - currentNum > 1) {
          // Gap exists, use next available
          const newId = currentNum + 1;
          const paddedId = String(newId).padStart(3, '0');
          const fsId = origin === 'external' ? `FS-${paddedId}E` : `FS-${paddedId}`;

          // Validate no collision
          if (!this.hasCollision(fsId, existingIds)) {
            return fsId;
          }
        }
      }
    }

    // Default: append to end (most common)
    const maxId = this.getMaxId(existingIds);
    const nextId = maxId + 1;
    const paddedId = String(nextId).padStart(3, '0');
    return origin === 'external' ? `FS-${paddedId}E` : `FS-${paddedId}`;
  }

  /**
   * Check for ID collision
   */
  private hasCollision(
    fsId: string,
    existingIds: Map<string, FeatureMetadata>
  ): boolean {
    // Check exact match
    if (existingIds.has(fsId)) {
      return true;
    }

    // Check variant (FS-042 vs FS-042E)
    const baseId = fsId.replace(/E$/, '');
    const externalId = baseId + 'E';

    return existingIds.has(baseId) || existingIds.has(externalId);
  }

  /**
   * Get max numeric ID (ignore E suffix)
   */
  private getMaxId(existingIds: Map<string, FeatureMetadata>): number {
    let max = 0;

    for (const id of existingIds.keys()) {
      const match = id.match(/FS-(\d+)E?/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    }

    return max;
  }

  /**
   * Create FS-XXX folder structure
   */
  async createFeatureFolder(
    fsId: string,
    workItem: ExternalWorkItem
  ): Promise<void> {
    const folderPath = `.specweave/docs/internal/specs/${fsId}/`;

    // Create folder
    await fs.mkdir(folderPath, { recursive: true });

    // Create README.md with origin metadata
    const readme = `---
id: ${fsId}
title: ${workItem.title}
origin: external
external_id: ${workItem.externalId}
external_url: ${workItem.externalUrl}
imported_at: ${new Date().toISOString()}
created_at: ${workItem.createdAt.toISOString()}
---

# ${workItem.title}

**Origin**: 🔗 [${workItem.source} ${workItem.externalId}](${workItem.externalUrl})

${workItem.description}

## User Stories

_No user stories defined yet. Import will create US-XXXE files here._
`;

    await fs.writeFile(`${folderPath}/README.md`, readme, 'utf-8');

    console.log(`✅ Created feature folder: ${fsId}`);
  }
}
```

**ID Registry (Atomic Updates)**:

```typescript
// src/living-docs/id-registry.ts
export class IDRegistry {
  private registryPath = '.specweave/.id-registry.json';

  /**
   * Atomically update registry with new ID
   */
  async registerID(
    fsId: string,
    metadata: FeatureMetadata
  ): Promise<void> {
    // File-based lock for atomic updates
    const lockPath = `${this.registryPath}.lock`;

    try {
      // Acquire lock
      await this.acquireLock(lockPath);

      // Read current registry
      const registry = await this.readRegistry();

      // Validate no collision
      if (registry[fsId]) {
        throw new Error(`ID collision: ${fsId} already registered`);
      }

      // Add new ID
      registry[fsId] = metadata;

      // Write back atomically
      await fs.writeFile(
        this.registryPath,
        JSON.stringify(registry, null, 2),
        'utf-8'
      );
    } finally {
      // Release lock
      await this.releaseLock(lockPath);
    }
  }
}
```

---

### 12. Archive Command for Features and Epics (`src/cli/commands/`)

**Purpose**: Dedicated command to archive entire features or specific epics (User Stories) with proper metadata tracking

**User Flows**:

**Flow 1: Archive Feature (Cascade)**
```bash
/specweave:archive feature FS-042

# What happens:
1. Validate FS-042 exists in .specweave/docs/internal/specs/
2. Check for active increments referencing FS-042
   - If found: Block with error "Cannot archive FS-042: Referenced by increment 0050"
3. Scan FS-042/ for all User Story folders (us-001e-title.md, us-002e-title.md, ...)
4. Create archive destination: .specweave/docs/_archive/specs/FS-042/
5. Move entire FS-042/ folder to archive (preserves structure)
6. Add metadata: .specweave/docs/_archive/specs/FS-042/.archive-metadata.json
   {
     "archived_at": "2025-11-19T10:30:00Z",
     "archived_by": "user@example.com",
     "reason": "Obsolete after pivot",
     "user_stories_count": 5,
     "original_path": ".specweave/docs/internal/specs/FS-042/"
   }
7. Update ID registry: mark FS-042 as archived (still occupied)
8. Display summary: "✅ Archived FS-042 (5 User Stories, 42 KB)"
```

**Flow 2: Archive Epic (Single US)**
```bash
/specweave:archive epic SP-FS-047-US-003

# What happens:
1. Parse epic ID to extract FS-047 and US-003
2. Validate US-003 exists in .specweave/docs/internal/specs/FS-047/
3. Check for active increments referencing US-003
4. Create archive path: .specweave/docs/_archive/specs/FS-047/
5. Move only us-003-title.md to archive
6. Add metadata to .archive-metadata.json (append to array)
7. Update ID registry
8. Display summary: "✅ Archived US-003 from FS-047"
```

**Flow 3: Dry-Run Mode**
```bash
/specweave:archive feature FS-042 --dry-run

# Output:
📋 Archive Preview (Dry-Run):
  Feature: FS-042 - Multi-Repo Selection
  Location: .specweave/docs/internal/specs/FS-042/
  Destination: .specweave/docs/_archive/specs/FS-042/

  User Stories to archive:
    - us-001e-repo-selector.md
    - us-002e-pattern-matching.md
    - us-003e-preview-flow.md
    - us-004e-init-integration.md
    - us-005e-edit-command.md

  Total size: 42 KB
  Active increment references: None

✓ Safe to archive. Run without --dry-run to proceed.
```

**Architecture**:

```typescript
// src/cli/commands/archive.ts
export interface ArchiveOptions {
  type: 'feature' | 'epic';
  id: string;              // FS-042 or SP-FS-047-US-003
  reason?: string;
  dryRun?: boolean;
}

export class ArchiveCommand {
  /**
   * Archive feature or epic
   */
  async execute(options: ArchiveOptions): Promise<void> {
    if (options.type === 'feature') {
      await this.archiveFeature(options);
    } else {
      await this.archiveEpic(options);
    }
  }

  /**
   * Archive entire feature
   */
  private async archiveFeature(options: ArchiveOptions): Promise<void> {
    const fsId = options.id; // FS-042
    const sourcePath = `.specweave/docs/internal/specs/${fsId}/`;
    const destPath = `.specweave/docs/_archive/specs/${fsId}/`;

    // Validate exists
    if (!await fs.pathExists(sourcePath)) {
      throw new Error(`Feature not found: ${fsId}`);
    }

    // Check active increments
    const references = await this.findActiveReferences(fsId);
    if (references.length > 0 && !options.force) {
      throw new Error(
        `Cannot archive ${fsId}: Referenced by increments ${references.join(', ')}`
      );
    }

    // Scan User Stories
    const usFiles = await glob(`${sourcePath}/us-*.md`);

    if (options.dryRun) {
      this.printDryRunPreview(fsId, usFiles, sourcePath, destPath);
      return;
    }

    // Move to archive
    await fs.move(sourcePath, destPath, { overwrite: false });

    // Add metadata
    const metadata = {
      archived_at: new Date().toISOString(),
      archived_by: await this.getCurrentUser(),
      reason: options.reason || 'No reason provided',
      user_stories_count: usFiles.length,
      original_path: sourcePath
    };

    await fs.writeFile(
      `${destPath}/.archive-metadata.json`,
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );

    // Update ID registry
    await this.updateIDRegistry(fsId, 'archived');

    console.log(`✅ Archived ${fsId} (${usFiles.length} User Stories)`);
  }

  /**
   * Archive specific epic
   */
  private async archiveEpic(options: ArchiveOptions): Promise<void> {
    // Parse epic ID: SP-FS-047-US-003 → FS-047, US-003
    const match = options.id.match(/SP-FS-(\d+)-US-(\d+)/);
    if (!match) {
      throw new Error(`Invalid epic ID: ${options.id}`);
    }

    const fsId = `FS-${match[1]}`;
    const usId = `US-${match[2]}`;

    const sourcePath = `.specweave/docs/internal/specs/${fsId}/`;
    const usFile = await glob(`${sourcePath}/us-${match[2]}*.md`);

    if (usFile.length === 0) {
      throw new Error(`Epic not found: ${options.id}`);
    }

    const destPath = `.specweave/docs/_archive/specs/${fsId}/`;
    await fs.mkdir(destPath, { recursive: true });

    // Move US file
    const fileName = path.basename(usFile[0]);
    await fs.move(usFile[0], `${destPath}/${fileName}`, { overwrite: false });

    // Update metadata
    const metadataPath = `${destPath}/.archive-metadata.json`;
    const metadata = await fs.pathExists(metadataPath)
      ? JSON.parse(await fs.readFile(metadataPath, 'utf-8'))
      : { epics: [] };

    metadata.epics.push({
      id: usId,
      archived_at: new Date().toISOString(),
      archived_by: await this.getCurrentUser(),
      reason: options.reason
    });

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

    console.log(`✅ Archived ${usId} from ${fsId}`);
  }

  /**
   * Find active increments referencing feature/epic
   */
  private async findActiveReferences(fsId: string): Promise<string[]> {
    const increments = await glob('.specweave/increments/*/metadata.json');
    const references: string[] = [];

    for (const metadataFile of increments) {
      const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf-8'));

      if (metadata.status === 'active' && metadata.epic?.startsWith(fsId)) {
        const incrementId = path.basename(path.dirname(metadataFile));
        references.push(incrementId);
      }
    }

    return references;
  }

  /**
   * Restore feature from archive
   */
  async restore(fsId: string): Promise<void> {
    const sourcePath = `.specweave/docs/_archive/specs/${fsId}/`;
    const destPath = `.specweave/docs/internal/specs/${fsId}/`;

    if (!await fs.pathExists(sourcePath)) {
      throw new Error(`Archived feature not found: ${fsId}`);
    }

    // Move back to active
    await fs.move(sourcePath, destPath, { overwrite: false });

    // Update ID registry
    await this.updateIDRegistry(fsId, 'active');

    console.log(`✅ Restored ${fsId} from archive`);
  }
}
```

**Slash Command Integration**:

```markdown
<!-- plugins/specweave/commands/specweave-archive.md -->
---
name: specweave:archive
description: Archive features or epics from living docs
---

# Archive Features and Epics

Archive entire features or specific epics to keep living docs clean.

## Usage

```bash
# Archive entire feature
/specweave:archive feature FS-042

# Archive with reason
/specweave:archive feature FS-042 --reason="Obsolete after pivot"

# Archive specific epic
/specweave:archive epic SP-FS-047-US-003

# Dry-run mode
/specweave:archive feature FS-042 --dry-run
```

## Behavior

- **Feature archiving**: Moves entire FS-XXX folder to _archive (cascades to all USs)
- **Epic archiving**: Moves only specific US-XXX file to _archive
- **Blocks if active**: Prevents archiving if increments still reference the feature/epic
- **ID preservation**: Archived IDs remain occupied (cannot reuse)
- **Metadata tracking**: Records archived_at, archived_by, reason

## Restore

```bash
/specweave:restore feature FS-042
```
```

---

## Data Model

### Task Interface (Updated)

```typescript
interface Task {
  // Existing fields
  id: string;                    // T-001 or T-001E
  title: string;                 // Task title
  status: TaskStatus;            // pending | in_progress | completed | transferred
  priority?: string;             // P0, P1, P2, P3
  estimatedEffort?: string;      // "4 hours", "2 days"
  dependencies?: string[];       // [T-000, T-001]
  description?: string;          // Full description
  filesAffected?: string[];      // [src/path/file.ts]

  // NEW fields for US-Task linkage
  userStory?: string;            // US-001 or US-001E (optional for backward compat)
  satisfiesACs?: string[];       // [AC-US1-01, AC-US1-02] (optional)

  // NEW fields for origin tracking
  origin?: 'internal' | 'external';  // Origin of task
  externalId?: string;           // GH-#638-T10, JIRA-SPEC-789-T5
  externalUrl?: string;          // Full URL to external task
  importedAt?: Date;             // When imported (external only)
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
  US-003E: 3          # External user story (imported from GitHub)
  US-004: 4
  US-005E: 2          # External user story (imported from JIRA)
  US-006: 1
test_mode: test-after
coverage_target: 90

# NEW: External item tracking
external_items:
  - id: US-003E
    origin: external
    source: github
    external_id: GH-#638
    external_url: https://github.com/anton-abyzov/specweave/issues/638
    imported_at: 2025-11-19T10:30:00Z

  - id: US-005E
    origin: external
    source: jira
    external_id: SPEC-789
    external_url: https://company.atlassian.net/browse/SPEC-789
    imported_at: 2025-11-19T11:00:00Z

  - id: T-010E
    origin: external
    source: github
    external_id: GH-#638-T10
    external_url: https://github.com/anton-abyzov/specweave/issues/638#task-10
    imported_at: 2025-11-19T10:35:00Z
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
