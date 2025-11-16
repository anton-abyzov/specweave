# ULTRATHINK: Project-Specific Tasks Architecture

**Date**: 2025-11-15
**Context**: GitHub Issue #599 shows the gap between current task linking and desired checkable task lists
**Problem**: User stories currently just LINK to increment tasks, but need their OWN project-specific checkable tasks

---

## 🎯 The Core Insight

**Current (WRONG)**:
```
Increment tasks.md:
  - T-001: Setup API endpoint
  - T-002: Create React component
  - T-003: Add DB migration

Backend US-001:
  **Implementation**: [link to tasks.md]

Frontend US-001:
  **Implementation**: [link to tasks.md]

GitHub Issue #123:
  ## Tasks
  - [ ] T-001: Setup API endpoint (link)
  - [ ] T-002: Create React component (link)
```

**Desired (CORRECT)**:
```
Increment tasks.md:
  - T-001: Setup API endpoint (AC: AC-US1-01, AC-US1-02)
  - T-002: Create React component (AC: AC-US1-01)
  - T-003: Add DB migration (AC: AC-US1-02)

Backend US-001:
  ## Tasks
  - [ ] **T-001**: Setup API endpoint
  - [ ] **T-003**: Add DB migration

Frontend US-001:
  ## Tasks
  - [ ] **T-002**: Create React component

GitHub Issue #123 (Backend):
  ## Tasks
  - [ ] **T-001**: Setup API endpoint
  - [ ] **T-003**: Add DB migration

GitHub Issue #456 (Frontend):
  ## Tasks
  - [ ] **T-002**: Create React component
```

---

## 🏗️ Current Architecture Analysis

### spec-distributor.ts:lines:684-726
**generateUserStoryFiles()** creates user story files but:
- ❌ Just finds tasks via `findTasksForUserStory()` (returns TaskReference with links)
- ❌ TaskReference only has: `{ id, title, anchor, path, acIds }`
- ❌ No completion status extracted
- ❌ Tasks are stored as LINKS in Implementation section, not checkable lists

### user-story-issue-builder.ts:lines:208-297
**extractTasks()** reads increment tasks.md and:
- ✅ DOES extract completion status from **Status**: [x] field
- ✅ DOES filter tasks by User Story (via AC-IDs)
- ✅ Returns `Task[]` with `{ id, title, completed }`
- ❌ But only used for GitHub issue creation (not stored in user story file)

### formatUserStoryFile():lines:971-1083
Currently formats user story as:
```markdown
## Implementation
**Increment**: [0031](link)
**Tasks**:
- [T-001: title](link)
- [T-002: title](link)
```

**Should be**:
```markdown
## Tasks
- [ ] **T-001**: Setup API endpoint
- [x] **T-003**: Add DB migration (completed)

## Implementation
**Increment**: [0031](link)
**Source Tasks**: See increment tasks.md for full details
```

---

## 🎨 Proposed Architecture

### Phase 1: User Story File Format Enhancement

**Change user story file format** to include `## Tasks` section:

```markdown
---
id: US-001
feature: FS-031
title: "API Authentication"
project: backend
status: active
---

# US-001: API Authentication

**Feature**: [FS-031](../../_features/FS-031/FEATURE.md)

**As a** backend developer
**I want** to secure API endpoints
**So that** only authenticated users can access them

---

## Acceptance Criteria
- [ ] **AC-US1-01**: JWT token generation works
- [x] **AC-US1-02**: Token validation middleware implemented

---

## Tasks

✨ **NEW SECTION**: Project-specific checkable tasks

- [ ] **T-001**: Setup API endpoint for /auth/login
- [ ] **T-003**: Add DB migration for users table
- [x] **T-005**: Implement JWT token generation

> **Note**: Tasks are project-specific. For the full increment task list, see [0031-external-tool-sync/tasks.md](../../../../../increments/0031-external-tool-sync/tasks.md)

---

## Implementation
**Increment**: [0031-external-tool-sync](../../../../../increments/0031-external-tool-sync)
**Source Tasks**: See increment tasks.md for complete task breakdown
```

### Phase 2: Project-Specific Task Generator

**Similar to ACProjectSpecificGenerator**, create `TaskProjectSpecificGenerator`:

```typescript
interface ProjectSpecificTask {
  id: string;           // T-001
  title: string;        // Setup API endpoint
  completed: boolean;   // Read from increment tasks.md
  acIds: string[];      // AC-US1-01, AC-US1-02
  project?: string;     // backend, frontend, etc.
}

class TaskProjectSpecificGenerator {
  /**
   * Filter and format tasks for a specific project/user story
   *
   * Input: All increment tasks + User Story ID + Project context
   * Output: Project-specific tasks with checkboxes
   */
  generateProjectSpecificTasks(
    allTasks: TaskReference[],
    userStoryId: string,
    projectContext: ProjectContext
  ): ProjectSpecificTask[] {
    // 1. Filter tasks by User Story (via AC-IDs)
    const relevantTasks = this.filterTasksByUserStory(allTasks, userStoryId);

    // 2. Filter by project keywords (optional, for multi-project features)
    const projectTasks = this.filterTasksByProject(relevantTasks, projectContext);

    // 3. Extract completion status from increment tasks.md
    const tasksWithStatus = this.enrichWithCompletionStatus(projectTasks);

    return tasksWithStatus;
  }
}
```

### Phase 3: Update spec-distributor.ts

**Modify `generateUserStoryFilesByProject()`**:

```typescript
private async generateUserStoryFilesByProject(
  storiesByProject: Map<string, UserStory[]>,
  featureMapping: FeatureMapping,
  incrementId: string
): Promise<Map<string, UserStoryFile[]>> {
  const filesByProject = new Map<string, UserStoryFile[]>();

  // Load tasks for linking
  const taskMap = await this.loadTaskReferences(incrementId);

  // ✨ NEW: Initialize task generator
  const taskGenerator = new TaskProjectSpecificGenerator();

  for (const [project, stories] of storiesByProject.entries()) {
    const userStoryFiles: UserStoryFile[] = [];

    // Get project context for task transformation
    const rawProjectContext = await this.hierarchyMapper.getProjectContext(project);

    for (const userStory of stories) {
      // ✨ NEW: Generate project-specific tasks (not just references!)
      const projectSpecificTasks = taskGenerator.generateProjectSpecificTasks(
        Array.from(taskMap.values()),
        userStory.id,
        rawProjectContext
      );

      userStoryFiles.push({
        id: userStory.id,
        epic: featureMapping.featureId,
        title: userStory.title,
        // ... other fields
        tasks: projectSpecificTasks, // ✅ Now contains completion status!
        project,
      });
    }

    filesByProject.set(project, userStoryFiles);
  }

  return filesByProject;
}
```

**Modify `formatUserStoryFile()`**:

```typescript
private formatUserStoryFile(userStory: UserStoryFile): string {
  const lines: string[] = [];

  // ... frontmatter, title, description, AC ...

  // ✨ NEW: Tasks section with checkboxes
  if (userStory.tasks && userStory.tasks.length > 0) {
    lines.push('## Tasks');
    lines.push('');
    for (const task of userStory.tasks) {
      const checkbox = task.completed ? '[x]' : '[ ]';
      lines.push(`- ${checkbox} **${task.id}**: ${task.title}`);
    }
    lines.push('');
    lines.push('> **Note**: Tasks are project-specific. For the full increment task list, see increment tasks.md');
    lines.push('');
  }

  // Implementation section (source reference)
  lines.push('## Implementation');
  lines.push(`**Increment**: [${userStory.implementation.increment}](link)`);
  lines.push(`**Source Tasks**: See increment tasks.md for complete task breakdown`);

  return lines.join('\n');
}
```

### Phase 4: GitHub Sync Enhancement

**Modify `user-story-issue-builder.ts`**:

```typescript
private buildBody(data: {
  frontmatter: UserStoryFrontmatter;
  userStoryStatement: string;
  acceptanceCriteria: AcceptanceCriteria[];
  tasks: Task[];  // ✅ Already extracted in extractTasks()
  bodyContent: string;
}): string {
  const sections: string[] = [];

  // ... AC section ...

  // ✨ ENHANCED: Read tasks from user story file (not increment tasks.md)
  if (data.tasks.length > 0) {
    sections.push('## Tasks');
    sections.push('');
    for (const task of data.tasks) {
      const checkbox = task.completed ? '[x]' : '[ ]';
      sections.push(`- ${checkbox} **${task.id}**: ${task.title}`);
    }
    sections.push('');
  }

  return sections.join('\n');
}
```

**KEY CHANGE**: Instead of reading from increment tasks.md, read from user story file's `## Tasks` section!

### Phase 5: Bidirectional Sync

**GitHub → SpecWeave** (Status sync reads checkbox state):

```typescript
/**
 * Sync task completion from GitHub issue to user story file
 */
async function syncTaskCompletionFromGitHub(
  issueNumber: number,
  userStoryPath: string
): Promise<void> {
  // 1. Fetch GitHub issue
  const issue = await client.getIssue(issueNumber);

  // 2. Extract task checkboxes from issue body
  const taskCheckboxes = extractTaskCheckboxes(issue.body);
  // Result: Map<taskId, completed>

  // 3. Read user story file
  let content = await fs.readFile(userStoryPath, 'utf-8');

  // 4. Update task checkboxes in ## Tasks section
  for (const [taskId, completed] of taskCheckboxes.entries()) {
    const checkbox = completed ? '[x]' : '[ ]';
    const pattern = new RegExp(
      `^(\\s*-\\s*)\\[[x ]\\](\\s*\\*\\*${taskId}\\*\\*:.*)$`,
      'gm'
    );
    content = content.replace(pattern, `$1${checkbox}$2`);
  }

  // 5. Write updated content
  await fs.writeFile(userStoryPath, content, 'utf-8');
}
```

**SpecWeave → GitHub** (Progress comment with updated task list):

```typescript
/**
 * Post progress comment when tasks are updated locally
 */
async function postTaskProgressComment(
  issueNumber: number,
  userStoryPath: string
): Promise<void> {
  // 1. Extract tasks from user story file
  const tasks = await extractTasksFromUserStory(userStoryPath);

  // 2. Calculate completion
  const completed = tasks.filter(t => t.completed).length;
  const total = tasks.length;
  const percentage = Math.round((completed / total) * 100);

  // 3. Build progress comment
  const comment = `## 📊 Task Progress Update

**Progress**: ${completed}/${total} tasks completed (${percentage}%)

### Current Tasks
${tasks.map(t => `- ${t.completed ? '[x]' : '[ ]'} **${t.id}**: ${t.title}`).join('\n')}

_Updated automatically by SpecWeave_`;

  // 4. Post comment
  await client.addComment(issueNumber, comment);
}
```

---

## 🔄 Complete Workflow

### Workflow 1: Living Docs Update (Increment → User Stories)

```bash
/specweave:sync-docs update
```

**Steps**:
1. `spec-distributor.distribute(incrementId)`
2. Parse increment spec.md → User Stories
3. Load increment tasks.md → All tasks with AC-IDs
4. **FOR EACH PROJECT**:
   - Filter user stories for this project
   - **FOR EACH USER STORY**:
     - Filter tasks by User Story (via AC-IDs)
     - Filter tasks by project (optional keyword matching)
     - Extract completion status from increment tasks.md
     - Generate user story file with `## Tasks` section
5. Write user story files to `.specweave/docs/internal/specs/{project}/{FS-XXX}/`

**Result**: Each user story file has its own checkable task list!

### Workflow 2: GitHub Sync (User Stories → GitHub Issues)

```bash
/specweave-github:sync-spec specweave/FS-031
```

**Steps**:
1. Find all user stories in `FS-031/` across all projects
2. **FOR EACH USER STORY**:
   - Read user story file
   - Extract: frontmatter, AC, **tasks from ## Tasks section**
   - Build GitHub issue body with:
     - AC checkboxes
     - Task checkboxes (from user story, not increment!)
   - Create or update GitHub issue
3. Store GitHub issue URL in frontmatter

**Result**: GitHub issues have project-specific task checkboxes!

### Workflow 3: Status Sync (GitHub → SpecWeave)

```bash
# Triggered by GitHub webhook or manual sync
/specweave-github:sync-from specweave/FS-031
```

**Steps**:
1. Fetch GitHub issue
2. Parse issue body → Extract task checkboxes
3. Read user story file
4. Update `## Tasks` section checkboxes
5. Write updated user story file

**Result**: Local user story files reflect GitHub checkbox state!

---

## 📊 Data Model Changes

### Before (TaskReference):
```typescript
interface TaskReference {
  id: string;        // T-001
  title: string;     // Setup API endpoint
  anchor: string;    // #t-001-setup-api-endpoint
  path: string;      // ../../../../../increments/0031/tasks.md#...
  acIds: string[];   // [AC-US1-01, AC-US1-02]
}
```

### After (ProjectSpecificTask):
```typescript
interface ProjectSpecificTask {
  id: string;          // T-001
  title: string;       // Setup API endpoint
  completed: boolean;  // ✅ NEW: Read from increment tasks.md
  acIds: string[];     // [AC-US1-01, AC-US1-02]
  project?: string;    // backend, frontend (optional filtering)
  sourceIncrement?: string; // 0031-external-tool-sync
}
```

### UserStoryFile Enhancement:
```typescript
interface UserStoryFile {
  id: string;
  epic: string;
  title: string;
  // ... existing fields ...
  tasks: ProjectSpecificTask[];  // ✅ CHANGED: From TaskReference[] to ProjectSpecificTask[]
  implementation: {
    increment: string;
    sourceTasksPath?: string;  // ✅ NEW: Link to increment tasks.md for reference
  };
}
```

---

## 🎯 Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create `TaskProjectSpecificGenerator` class
- [ ] Add `completed` field to task loading logic
- [ ] Update `UserStoryFile` interface with new task format

### Phase 2: Living Docs Generation
- [ ] Modify `generateUserStoryFilesByProject()` to use task generator
- [ ] Update `formatUserStoryFile()` to include `## Tasks` section
- [ ] Remove old task links from Implementation section

### Phase 3: GitHub Sync (Create/Update)
- [ ] Update `user-story-issue-builder.ts` to read tasks from user story file
- [ ] Ensure task checkboxes are included in issue body
- [ ] Test issue creation with project-specific tasks

### Phase 4: Bidirectional Sync
- [ ] Implement `syncTaskCompletionFromGitHub()`
- [ ] Implement `postTaskProgressComment()`
- [ ] Add webhook handler for GitHub checkbox updates

### Phase 5: Testing
- [ ] Unit tests for `TaskProjectSpecificGenerator`
- [ ] Integration tests for living docs update
- [ ] E2E tests for GitHub sync with task checkboxes
- [ ] Test bidirectional sync (local ↔ GitHub)

---

## 🚀 Benefits

1. **Traceability**: Each user story has explicit task list (not just links)
2. **Project Isolation**: Backend tasks separate from frontend tasks
3. **GitHub UX**: Stakeholders can check off tasks directly in GitHub
4. **Bidirectional Sync**: Changes in GitHub reflected in SpecWeave and vice versa
5. **Audit Trail**: Progress comments show task evolution over time

---

## ⚠️ Risks & Mitigations

**Risk 1**: Duplication between increment tasks.md and user story tasks
- **Mitigation**: User story tasks are FILTERED view of increment tasks (not duplicated)
- Increment tasks.md remains source of truth for ALL tasks
- User story shows only relevant tasks for that project/story

**Risk 2**: Sync conflicts (user edits tasks manually in both places)
- **Mitigation**: Increment tasks.md = source of truth for task definitions
- User story files = source of truth for completion status (per project)
- GitHub = source of truth for stakeholder visibility

**Risk 3**: Performance (reading increment tasks.md for every user story)
- **Mitigation**: Load tasks ONCE per increment, then filter for each user story
- Cache task map during sync operation

---

## 📝 Migration Path

**For existing increments**:
1. Re-run `/specweave:sync-docs update` to regenerate user story files
2. New user story files will have `## Tasks` section
3. GitHub issues will be updated on next sync
4. Old issues can be manually updated or left as-is

**No breaking changes**: Old user story files still work, just missing task checkboxes

---

## 🎬 Next Steps

1. **Create `TaskProjectSpecificGenerator`** (new file)
2. **Update `spec-distributor.ts`** (generateUserStoryFilesByProject + formatUserStoryFile)
3. **Update `user-story-issue-builder.ts`** (read tasks from user story file)
4. **Add bidirectional sync** (new sync handlers)
5. **Write tests** (unit, integration, E2E)
6. **Update documentation** (user guide + architecture docs)

---

**Status**: Ready for implementation
**Complexity**: High (architectural change across 3 modules)
**Impact**: High (improves traceability and GitHub UX significantly)
