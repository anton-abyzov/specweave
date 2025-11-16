# System Design: Project-Specific Tasks

**Version**: 0.18.3+
**Date**: 2025-11-15
**Status**: Implemented

---

## Overview

This document describes the architecture for generating project-specific task lists in user story files, enabling better traceability and GitHub collaboration.

### Problem Statement

**Before v0.18.3**:
- User stories only had LINKS to increment tasks
- No separation between backend/frontend tasks
- GitHub issues had no checkable task lists
- Stakeholders had to navigate to increment tasks.md

**After v0.18.3**:
- User stories have their OWN checkable task lists
- Tasks filtered by project (backend ≠ frontend)
- GitHub issues have checkable checkboxes
- Clear traceability per user story

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  Increment tasks.md                          │
│                  (Source of Truth)                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│            TaskProjectSpecificGenerator                      │
│                                                              │
│  • loadIncrementTasks() - Read with completion status       │
│  • filterTasksByUserStory() - Filter by AC-IDs              │
│  • filterTasksByProject() - Optional keyword matching       │
│  • formatTasksAsMarkdown() - Generate checkboxes            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  SpecDistributor                             │
│                                                              │
│  • generateUserStoryFilesByProject()                         │
│  • Orchestrates task generation per user story               │
│  • Calls TaskProjectSpecificGenerator                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│          User Story File (## Tasks section)                  │
│                                                              │
│  - [ ] **T-001**: Setup API endpoint                         │
│  - [x] **T-003**: Add DB migration                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│             UserStoryIssueBuilder                            │
│                                                              │
│  • extractTasks() - Read from ## Tasks section (NEW)         │
│  • extractTasksLegacy() - Fallback to increment tasks.md     │
│  • buildIssueBody() - Generate GitHub issue body             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  GitHub Issue                                │
│                  (Checkable task list)                       │
│                                                              │
│  ## Tasks                                                    │
│  - [ ] **T-001**: Setup API endpoint                         │
│  - [x] **T-003**: Add DB migration                           │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. TaskProjectSpecificGenerator

**Location**: `src/core/living-docs/task-project-specific-generator.ts`

**Responsibilities**:
- Load tasks from increment tasks.md with completion status
- Filter tasks by User Story ID (via AC-IDs)
- Optional project keyword filtering
- Format tasks as markdown checkboxes
- Parse/update task checkboxes (for future bidirectional sync)

**Key Methods**:
```typescript
class TaskProjectSpecificGenerator {
  // Main entry point
  async generateProjectSpecificTasks(
    incrementId: string,
    userStoryId: string,
    projectContext?: ProjectContext
  ): Promise<ProjectSpecificTask[]>

  // Load all tasks with completion status
  private async loadIncrementTasks(incrementId: string): Promise<ProjectSpecificTask[]>

  // Filter by User Story via AC-IDs
  private filterTasksByUserStory(
    tasks: ProjectSpecificTask[],
    userStoryId: string
  ): ProjectSpecificTask[]

  // Optional keyword-based filtering
  private filterTasksByProject(
    tasks: ProjectSpecificTask[],
    projectContext: ProjectContext
  ): ProjectSpecificTask[]

  // Format as markdown
  formatTasksAsMarkdown(tasks: ProjectSpecificTask[]): string

  // Parse from markdown (bidirectional sync)
  parseTasksFromMarkdown(content: string): ProjectSpecificTask[]

  // Update checkboxes (bidirectional sync)
  updateTaskCheckboxes(content: string, updates: Map<string, boolean>): string
}
```

**Algorithm**:
1. Read increment tasks.md
2. Parse tasks with **Status**: [x] field
3. Extract AC-IDs from **AC**: field
4. Filter tasks by User Story ID:
   - `AC-US1-01` → `US-001`
   - `AC-US2-01` → `US-002`
5. Optional: Filter by project keywords
6. Return ProjectSpecificTask[] with completion status

#### 2. SpecDistributor Enhancements

**Location**: `src/core/living-docs/spec-distributor.ts`

**Changes**:
```typescript
private taskGenerator: TaskProjectSpecificGenerator;

constructor(projectRoot: string, config?: Partial<DistributionConfig>) {
  // Initialize task generator
  this.taskGenerator = new TaskProjectSpecificGenerator(projectRoot);
}

private async generateUserStoryFilesByProject(
  storiesByProject: Map<string, UserStory[]>,
  featureMapping: FeatureMapping,
  incrementId: string
): Promise<Map<string, UserStoryFile[]>> {
  // For each user story...
  for (const userStory of stories) {
    // ✅ NEW: Generate project-specific tasks
    const projectSpecificTasks = await this.taskGenerator.generateProjectSpecificTasks(
      incrementId,
      userStory.id,
      projectContext
    );

    userStoryFiles.push({
      // ... other fields ...
      tasks: projectSpecificTasks, // ✅ NEW field
      implementation: {
        increment: incrementId,
        tasks: taskReferences, // LEGACY: backward compatibility
      },
    });
  }
}

private formatUserStoryFile(userStory: UserStoryFile): string {
  // ✅ NEW: ## Tasks section
  if (userStory.tasks && userStory.tasks.length > 0) {
    lines.push('## Tasks');
    for (const task of userStory.tasks) {
      const checkbox = task.completed ? '[x]' : '[ ]';
      lines.push(`- ${checkbox} **${task.id}**: ${task.title}`);
    }
    lines.push('> **Note**: Tasks are project-specific');
  }

  // Implementation section (source reference)
  lines.push('## Implementation');
  lines.push('**Increment**: [link]');
  lines.push('**Source Tasks**: See increment tasks.md');
}
```

#### 3. UserStoryIssueBuilder Enhancements

**Location**: `plugins/specweave-github/lib/user-story-issue-builder.ts`

**Changes**:
```typescript
private async extractTasks(
  userStoryContent: string,
  userStoryId: string
): Promise<Task[]> {
  // ✅ NEW: Look for ## Tasks section in user story file
  const tasksMatch = userStoryContent.match(
    /##\s+Tasks\s*\n+([\s\S]*?)(?=\n##|>?\s*\*\*Note\*\*:|---+|$)/i
  );

  if (!tasksMatch) {
    // FALLBACK: Try old architecture (read from increment tasks.md)
    return this.extractTasksLegacy(userStoryContent, userStoryId);
  }

  const tasksSection = tasksMatch[1];

  // Pattern: - [x] **T-001**: Task title
  const taskPattern = /^[-*]\s+\[([x ])\]\s+\*\*(T-\d+)\*\*:\s+(.+)$/gm;

  while ((match = taskPattern.exec(tasksSection)) !== null) {
    const completed = match[1] === 'x';
    const taskId = match[2];
    const taskTitle = match[3].trim();

    tasks.push({ id: taskId, title: taskTitle, completed });
  }

  return tasks;
}
```

---

## Data Model

### ProjectSpecificTask

**NEW Type** (`src/core/living-docs/types.ts`):

```typescript
export interface ProjectSpecificTask {
  id: string;           // T-001
  title: string;        // Setup API endpoint
  completed: boolean;   // ✅ NEW: Read from increment tasks.md
  acIds: string[];      // [AC-US1-01, AC-US1-02]
  project?: string;     // backend, frontend, etc. (optional)
  sourceIncrement?: string; // 0031-external-tool-sync
}
```

### UserStoryFile Enhancement

**Updated Type** (`src/core/living-docs/types.ts`):

```typescript
export interface UserStoryFile {
  // ... existing fields ...
  tasks?: ProjectSpecificTask[]; // ✅ NEW: Project-specific tasks
  implementation: {
    increment: string;
    tasks: TaskReference[]; // LEGACY: For backward compatibility
  };
}
```

---

## Filtering Logic

### By User Story ID (Mandatory)

**AC-ID Format**: `AC-US{number}-{criteria}`

**Examples**:
- `AC-US1-01` → User Story `US-001`
- `AC-US2-03` → User Story `US-002`
- `AC-US10-01` → User Story `US-010`

**Algorithm**:
```typescript
// Extract US number from userStoryId (US-001 → "1")
const usMatch = userStoryId.match(/US-(\d+)/);
const usNumber = parseInt(usMatch[1], 10); // 1

// Filter tasks that reference this user story's AC-IDs
return tasks.filter((task) => {
  return task.acIds.some((acId) => {
    // Extract US number from AC-ID (AC-US1-01 → "1")
    const acMatch = acId.match(/AC-US(\d+)-\d+/);
    const acUsNumber = parseInt(acMatch[1], 10);
    return acUsNumber === usNumber;
  });
});
```

### By Project Keywords (Optional)

**Configuration** (`.specweave/config.json`):

```json
{
  "multiProject": {
    "projects": {
      "backend": {
        "keywords": ["api", "database", "backend", "server"]
      },
      "frontend": {
        "keywords": ["react", "component", "ui", "css"]
      }
    }
  }
}
```

**Algorithm**:
```typescript
return tasks.filter((task) => {
  const taskText = task.title.toLowerCase();

  // Check if any project keyword appears in task title
  const hasKeyword = projectContext.keywords.some((keyword) =>
    taskText.includes(keyword.toLowerCase())
  );

  return hasKeyword;
});
```

**When Used**:
- Multi-project features where tasks span multiple projects
- Helps separate backend, frontend, mobile, infrastructure tasks
- Falls back to "all tasks" if no keywords configured

---

## Workflow

### Living Docs Update

```bash
/specweave:sync-docs update
```

**Steps**:
1. Parse increment spec.md → Extract user stories
2. Load increment tasks.md → Read ALL tasks with completion status
3. **FOR EACH PROJECT**:
   - **FOR EACH USER STORY**:
     - Call `taskGenerator.generateProjectSpecificTasks()`
       - Filter tasks by User Story ID (via AC-IDs)
       - Optional: Filter tasks by project keywords
     - Generate user story file with `## Tasks` section
     - Write to `.specweave/docs/internal/specs/{project}/{FS-XXX}/`

**Result**: User story files have project-specific checkable tasks!

### GitHub Sync

```bash
/specweave-github:sync-spec specweave/FS-031
```

**Steps**:
1. Find all user stories in `FS-031/` across all projects
2. **FOR EACH USER STORY**:
   - Read user story file
   - Call `userStoryIssueBuilder.extractTasks()`
     - Try to read from `## Tasks` section
     - Fallback to legacy extraction if not found
   - Build GitHub issue body with task checkboxes
   - Create or update GitHub issue

**Result**: GitHub issues have checkable task lists!

---

## Backward Compatibility

### Legacy Extraction Fallback

**UserStoryIssueBuilder**:
```typescript
private async extractTasks(
  userStoryContent: string,
  userStoryId: string
): Promise<Task[]> {
  // ✅ Try NEW architecture first
  const tasksMatch = userStoryContent.match(/##\s+Tasks\s*\n+/);

  if (!tasksMatch) {
    // ❌ No ## Tasks section found
    // ✅ Fallback to LEGACY extraction
    return this.extractTasksLegacy(userStoryContent, userStoryId);
  }

  // ... read from ## Tasks section ...
}
```

**Benefits**:
- Old user story files still work
- No breaking changes for existing increments
- Gradual migration path

### Migration Strategy

**For Existing Increments**:
1. Re-run `/specweave:sync-docs update`
2. User story files regenerated with `## Tasks` sections
3. GitHub issues updated on next sync

**For New Increments**:
- Automatically include `## Tasks` sections
- No additional steps required

---

## Testing Strategy

### Unit Tests

**File**: `tests/unit/living-docs/task-project-specific-generator.test.ts`

**Coverage**:
- ✅ Load tasks with completion status
- ✅ Filter tasks by User Story ID
- ✅ Filter tasks by project keywords
- ✅ Format tasks as markdown
- ✅ Parse tasks from markdown
- ✅ Update task checkboxes
- ✅ Enrich TaskReference with status

### Integration Tests

**File**: `tests/integration/living-docs/spec-distributor-tasks.test.ts`

**Coverage**:
- ✅ Generate user story files with `## Tasks` section
- ✅ Preserve task completion status
- ✅ Handle multi-project task filtering
- ✅ Backward compatibility with old format
- ✅ Handle increments without user stories

### E2E Tests

**File**: `tests/e2e/github-user-story-tasks-sync.spec.ts`

**Coverage**:
- ✅ Full workflow: Increment → Living Docs → GitHub Issue
- ✅ Verify user story files have correct tasks
- ✅ Verify GitHub issues have checkable task lists
- ✅ Test multi-project task filtering
- ✅ Test completion status preservation

---

## Performance Considerations

### Task Loading Optimization

**Problem**: Reading increment tasks.md for every user story could be slow.

**Solution**: Load tasks ONCE per increment, then filter for each user story.

**Implementation**:
```typescript
// Load tasks ONCE
const allTasks = await this.loadIncrementTasks(incrementId);

// Filter for each user story (in memory)
for (const userStory of stories) {
  const userStoryTasks = this.filterTasksByUserStory(allTasks, userStory.id);
  const projectTasks = this.filterTasksByProject(userStoryTasks, projectContext);
}
```

### Caching

**Future Enhancement**: Cache parsed tasks.md in memory for repeated syncs.

---

## Security Considerations

### Input Validation

**Risk**: Malformed tasks.md could cause parsing errors.

**Mitigation**:
- Regex patterns validated with test cases
- Graceful error handling (empty array on parse failure)
- Console warnings for invalid formats

### File Path Validation

**Risk**: Path traversal attacks via incrementId.

**Mitigation**:
- IncrementId validated by upstream code
- Paths constructed using `path.join()` (prevents traversal)

---

## Future Enhancements

### 1. Bidirectional Sync (GitHub → SpecWeave)

**Status**: Architecture ready, implementation pending

**Methods**:
- `parseTasksFromMarkdown()` - Read checkbox state from user story
- `updateTaskCheckboxes()` - Update checkbox state

**Workflow**:
1. GitHub webhook fires on issue update
2. Fetch GitHub issue body
3. Parse task checkboxes
4. Update user story file
5. Optionally: Update increment tasks.md

### 2. Progress Comments

**Status**: Planned

**Workflow**:
1. Task completion detected
2. Calculate progress (completed/total)
3. Post progress comment to GitHub issue
4. Include updated task list

### 3. Task-Level GitHub Issues

**Status**: Planned (optional feature)

**Workflow**:
1. Create GitHub issue per task (not just per user story)
2. Link task issues to user story issue
3. Enable finer-grained tracking

---

## Related Documentation

- [ULTRATHINK Architecture](../../increments/0034-github-ac-checkboxes-fix/reports/ULTRATHINK-PROJECT-SPECIFIC-TASKS-ARCHITECTURE.md)
- [Implementation Complete](../../increments/0034-github-ac-checkboxes-fix/reports/PROJECT-SPECIFIC-TASKS-IMPLEMENTATION-COMPLETE.md)
- [Public Guide](../public/guides/project-specific-tasks.md)

---

**Last Updated**: 2025-11-15
**Version**: 0.18.3
