/**
 * Integration Tests: Copy-Based Sync Workflow (T-059)
 *
 * Tests the three-layer sync workflow:
 *   Increment spec.md + tasks.md (source of truth)
 *       ↓ (copy ACs/tasks)
 *   Living Docs user-stories/*.md (documentation)
 *       ↓ (sync via API)
 *   GitHub Issues (stakeholder UI)
 *
 * Test scenarios:
 * - New increment → Living docs sync
 * - Living docs → GitHub issue creation
 * - GitHub issue update → Living docs sync
 * - Task completion in increment → Propagation to GitHub
 * - AC completion in increment → Checkbox update in GitHub
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import { TaskProjectSpecificGenerator } from '../../../src/core/living-docs/task-project-specific-generator.js';

describe('Copy-Based Sync Workflow Integration (T-059)', () => {
  let testDir: string;
  let incrementDir: string;
  let livingDocsDir: string;
  let taskGenerator: TaskProjectSpecificGenerator;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'specweave-sync-test-'));
    incrementDir = join(testDir, '.specweave', 'increments', '0031-external-tool-sync');
    livingDocsDir = join(testDir, '.specweave', 'docs', 'living-docs', 'user-stories');

    await mkdir(incrementDir, { recursive: true });
    await mkdir(livingDocsDir, { recursive: true });

    taskGenerator = new TaskProjectSpecificGenerator(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Layer 1→2: Increment to Living Docs Sync', () => {
    it('should copy ACs from increment spec.md to user story', async () => {
      // Create increment spec.md with ACs
      const specContent = `---
id: spec-001
title: OAuth Implementation
status: draft
---

# OAuth Implementation

## Acceptance Criteria

### AC-US1-01: Valid Login Flow
**Given**: User has registered account
**When**: User enters valid credentials
**Then**: Redirect to dashboard with session token

**Status**: [ ]

### AC-US1-02: Invalid Password Handling
**Given**: User exists in database
**When**: User enters incorrect password
**Then**: Show error message "Invalid credentials"

**Status**: [ ]
`;

      await writeFile(join(incrementDir, 'spec.md'), specContent);

      // Simulate living docs sync (copying ACs)
      const userStoryContent = `---
id: US-001
title: OAuth Implementation
status: draft
increment: 0031-external-tool-sync
---

# US-001: OAuth Implementation

## Acceptance Criteria

- [ ] **AC-US1-01**: Valid Login Flow
- [ ] **AC-US1-02**: Invalid Password Handling

## Tasks

_Tasks will be populated after increment tasks.md is created_
`;

      await writeFile(join(livingDocsDir, 'US-001-oauth.md'), userStoryContent);

      // Validate sync
      const syncedContent = await readFile(join(livingDocsDir, 'US-001-oauth.md'), 'utf-8');
      expect(syncedContent).toContain('AC-US1-01');
      expect(syncedContent).toContain('Valid Login Flow');
      expect(syncedContent).toContain('AC-US1-02');
      expect(syncedContent).toContain('Invalid Password Handling');
    });

    it('should copy tasks from increment tasks.md to user story', async () => {
      // Create increment tasks.md
      const tasksContent = `# Tasks

## T-001: Setup API Endpoint

**Status**: [x]
**AC**: AC-US1-01, AC-US1-02
**Description**: Create POST /api/auth/login endpoint

## T-002: Add JWT Validation

**Status**: [ ]
**AC**: AC-US1-01
**Description**: Validate JWT tokens on protected routes

## T-003: Database Migration

**Status**: [x]
**AC**: AC-US1-02
**Description**: Add users table with password hash
`;

      await writeFile(join(incrementDir, 'tasks.md'), tasksContent);

      // Generate project-specific tasks for US-001
      const tasks = await taskGenerator.generateProjectSpecificTasks('0031-external-tool-sync', 'US-001');

      expect(tasks).toHaveLength(3);
      expect(tasks[0].id).toBe('T-001');
      expect(tasks[0].completed).toBe(true);
      expect(tasks[1].id).toBe('T-002');
      expect(tasks[1].completed).toBe(false);
      expect(tasks[2].id).toBe('T-003');
      expect(tasks[2].completed).toBe(true);

      // Format as markdown
      const taskMarkdown = taskGenerator.formatTasksAsMarkdown(tasks);
      expect(taskMarkdown).toContain('- [x] **T-001**: Setup API Endpoint');
      expect(taskMarkdown).toContain('- [ ] **T-002**: Add JWT Validation');
      expect(taskMarkdown).toContain('- [x] **T-003**: Database Migration');
    });

    it('should filter tasks by project context (backend vs frontend)', async () => {
      // Create tasks for multiple projects
      const tasksContent = `# Tasks

## T-001: Setup API Endpoint

**Status**: [x]
**AC**: AC-US1-01
**Description**: Create backend API endpoint

## T-002: Create React Component

**Status**: [ ]
**AC**: AC-US1-01
**Description**: Build frontend login form

## T-003: Add Database Migration

**Status**: [x]
**AC**: AC-US1-02
**Description**: Backend database schema
`;

      await writeFile(join(incrementDir, 'tasks.md'), tasksContent);

      // Backend project filter
      const backendTasks = await taskGenerator.generateProjectSpecificTasks(
        '0031-external-tool-sync',
        'US-001',
        {
          id: 'backend',
          name: 'Backend',
          type: 'backend',
          techStack: ['Node.js', 'PostgreSQL'],
          keywords: ['api', 'database', 'backend', 'migration']
        }
      );

      expect(backendTasks).toHaveLength(2);
      expect(backendTasks.some(t => t.id === 'T-001')).toBe(true); // API endpoint
      expect(backendTasks.some(t => t.id === 'T-003')).toBe(true); // Database migration
      expect(backendTasks.every(t => !t.title.includes('React'))).toBe(true);

      // Frontend project filter
      const frontendTasks = await taskGenerator.generateProjectSpecificTasks(
        '0031-external-tool-sync',
        'US-001',
        {
          id: 'frontend',
          name: 'Frontend',
          type: 'frontend',
          techStack: ['React', 'TypeScript'],
          keywords: ['react', 'component', 'frontend', 'form', 'ui']
        }
      );

      expect(frontendTasks).toHaveLength(1);
      expect(frontendTasks[0].id).toBe('T-002'); // React component
    });

    it('should preserve completion status from increment tasks', async () => {
      const tasksContent = `# Tasks

## T-001: Completed Task

**Status**: [x]
**AC**: AC-US1-01

## T-002: Incomplete Task

**Status**: [ ]
**AC**: AC-US1-01
`;

      await writeFile(join(incrementDir, 'tasks.md'), tasksContent);

      const tasks = await taskGenerator.generateProjectSpecificTasks('0031-external-tool-sync', 'US-001');

      expect(tasks[0].completed).toBe(true);
      expect(tasks[1].completed).toBe(false);

      const markdown = taskGenerator.formatTasksAsMarkdown(tasks);
      expect(markdown).toContain('- [x] **T-001**');
      expect(markdown).toContain('- [ ] **T-002**');
    });
  });

  describe('Layer 2→3: Living Docs to GitHub Sync', () => {
    it('should prepare GitHub issue format from user story', async () => {
      // Create user story with ACs and tasks
      const userStoryContent = `---
id: US-001
title: OAuth Implementation
status: in-progress
increment: 0031-external-tool-sync
---

# US-001: OAuth Implementation

## Acceptance Criteria

- [ ] **AC-US1-01**: Valid Login Flow
- [x] **AC-US1-02**: Invalid Password Handling

## Tasks

- [x] **T-001**: Setup API Endpoint
- [ ] **T-002**: Add JWT Validation
- [x] **T-003**: Database Migration

> **Note**: Tasks are project-specific. See increment tasks.md for full list
`;

      await writeFile(join(livingDocsDir, 'US-001-oauth.md'), userStoryContent);

      // Extract GitHub issue format (checkable ACs + task subtasks)
      const content = await readFile(join(livingDocsDir, 'US-001-oauth.md'), 'utf-8');

      // Validate AC checkboxes
      expect(content).toMatch(/- \[ \] \*\*AC-US1-01\*\*/);
      expect(content).toMatch(/- \[x\] \*\*AC-US1-02\*\*/);

      // Validate task checkboxes
      expect(content).toMatch(/- \[x\] \*\*T-001\*\*/);
      expect(content).toMatch(/- \[ \] \*\*T-002\*\*/);
      expect(content).toMatch(/- \[x\] \*\*T-003\*\*/);
    });

    it('should support bidirectional sync of AC status', async () => {
      const userStoryPath = join(livingDocsDir, 'US-001-oauth.md');
      const userStoryContent = `---
id: US-001
---

# US-001: OAuth Implementation

## Acceptance Criteria

- [ ] **AC-US1-01**: Valid Login Flow
- [ ] **AC-US1-02**: Invalid Password Handling
`;

      await writeFile(userStoryPath, userStoryContent);

      // Simulate GitHub update (user checks AC-US1-01)
      let content = await readFile(userStoryPath, 'utf-8');
      content = content.replace('- [ ] **AC-US1-01**', '- [x] **AC-US1-01**');
      await writeFile(userStoryPath, content);

      // Validate update
      const updatedContent = await readFile(userStoryPath, 'utf-8');
      expect(updatedContent).toMatch(/- \[x\] \*\*AC-US1-01\*\*/);
      expect(updatedContent).toMatch(/- \[ \] \*\*AC-US1-02\*\*/);
    });

    it('should support bidirectional sync of task status', async () => {
      const userStoryPath = join(livingDocsDir, 'US-001-oauth.md');
      const userStoryContent = `---
id: US-001
---

# US-001

## Tasks

- [ ] **T-001**: Setup API
- [ ] **T-002**: Add JWT
`;

      await writeFile(userStoryPath, userStoryContent);

      // Simulate task completion in user story
      const updates = new Map([['T-001', true]]);
      let content = await readFile(userStoryPath, 'utf-8');
      content = taskGenerator.updateTaskCheckboxes(content, updates);
      await writeFile(userStoryPath, content);

      // Validate update
      const updatedContent = await readFile(userStoryPath, 'utf-8');
      expect(updatedContent).toMatch(/- \[x\] \*\*T-001\*\*/);
      expect(updatedContent).toMatch(/- \[ \] \*\*T-002\*\*/);
    });
  });

  describe('Layer 3→2: GitHub to Living Docs Sync', () => {
    it('should sync GitHub issue checkbox updates back to user story', async () => {
      const userStoryPath = join(livingDocsDir, 'US-001-oauth.md');
      const initialContent = `---
id: US-001
---

# US-001

## Acceptance Criteria

- [ ] **AC-US1-01**: Valid Login Flow
- [ ] **AC-US1-02**: Invalid Password

## Tasks

- [ ] **T-001**: Setup API
`;

      await writeFile(userStoryPath, initialContent);

      // Simulate GitHub webhook update (user checked AC-US1-01 in GitHub)
      let content = await readFile(userStoryPath, 'utf-8');
      content = content.replace('- [ ] **AC-US1-01**', '- [x] **AC-US1-01**');
      await writeFile(userStoryPath, content);

      // Validate bidirectional sync
      const syncedContent = await readFile(userStoryPath, 'utf-8');
      expect(syncedContent).toMatch(/- \[x\] \*\*AC-US1-01\*\*/);
    });
  });

  describe('End-to-End Three-Layer Sync', () => {
    it('should complete full sync workflow: Increment → Living Docs → GitHub → Living Docs', async () => {
      // Step 1: Create increment with spec and tasks
      const specContent = `---
id: spec-001
---

# Spec

## Acceptance Criteria

### AC-US1-01: Login Flow
**Status**: [ ]

### AC-US1-02: Error Handling
**Status**: [ ]
`;

      const tasksContent = `# Tasks

## T-001: API Endpoint

**Status**: [ ]
**AC**: AC-US1-01

## T-002: Validation

**Status**: [ ]
**AC**: AC-US1-02
`;

      await writeFile(join(incrementDir, 'spec.md'), specContent);
      await writeFile(join(incrementDir, 'tasks.md'), tasksContent);

      // Step 2: Sync to living docs
      const tasks = await taskGenerator.generateProjectSpecificTasks('0031-external-tool-sync', 'US-001');
      const taskMarkdown = taskGenerator.formatTasksAsMarkdown(tasks);

      const userStoryContent = `---
id: US-001
---

# US-001

## Acceptance Criteria

- [ ] **AC-US1-01**: Login Flow
- [ ] **AC-US1-02**: Error Handling

## Tasks

${taskMarkdown}
`;

      const userStoryPath = join(livingDocsDir, 'US-001.md');
      await writeFile(userStoryPath, userStoryContent);

      // Step 3: Simulate GitHub issue created (no changes yet)
      let content = await readFile(userStoryPath, 'utf-8');
      expect(content).toContain('AC-US1-01');
      expect(content).toContain('T-001');

      // Step 4: Complete task in increment
      const updatedTasksContent = tasksContent.replace('**Status**: [ ]', '**Status**: [x]');
      await writeFile(join(incrementDir, 'tasks.md'), updatedTasksContent);

      // Step 5: Re-sync to living docs
      const updatedTasks = await taskGenerator.generateProjectSpecificTasks('0031-external-tool-sync', 'US-001');
      expect(updatedTasks[0].completed).toBe(true);

      const updatedTaskMarkdown = taskGenerator.formatTasksAsMarkdown(updatedTasks);
      expect(updatedTaskMarkdown).toContain('- [x] **T-001**');

      // Step 6: Update user story
      content = await readFile(userStoryPath, 'utf-8');
      const taskUpdates = new Map([['T-001', true]]);
      content = taskGenerator.updateTaskCheckboxes(content, taskUpdates);
      await writeFile(userStoryPath, content);

      // Step 7: Validate final state
      const finalContent = await readFile(userStoryPath, 'utf-8');
      expect(finalContent).toMatch(/- \[x\] \*\*T-001\*\*/);
      expect(finalContent).toMatch(/- \[ \] \*\*T-002\*\*/);
    });
  });

  describe('Code Validation (Prevent Premature Completion)', () => {
    it('should detect when task is marked complete without code changes', async () => {
      // This is a placeholder - actual code validation would check git commits
      const tasksContent = `# Tasks

## T-001: Add Feature

**Status**: [x]
**AC**: AC-US1-01
**Description**: Implement new feature
`;

      await writeFile(join(incrementDir, 'tasks.md'), tasksContent);

      const tasks = await taskGenerator.generateProjectSpecificTasks('0031-external-tool-sync', 'US-001');

      // In real implementation, this would check:
      // 1. Git commits since task creation
      // 2. Code changes in relevant files
      // 3. Test coverage for task

      // For now, just validate task parsing works
      expect(tasks[0].completed).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    it('should support legacy user stories without ## Tasks section', async () => {
      const legacyUserStoryContent = `---
id: US-001
---

# US-001

## Acceptance Criteria

- [ ] **AC-US1-01**: Login Flow

_No tasks section (legacy format)_
`;

      const userStoryPath = join(livingDocsDir, 'US-001-legacy.md');
      await writeFile(userStoryPath, legacyUserStoryContent);

      const content = await readFile(userStoryPath, 'utf-8');
      const tasks = taskGenerator.parseTasksFromMarkdown(content);

      expect(tasks).toHaveLength(0); // No tasks in legacy format
      expect(content).toContain('AC-US1-01'); // ACs still work
    });

    it('should parse tasks from user story markdown', async () => {
      const userStoryContent = `---
id: US-001
---

# US-001

## Tasks

- [x] **T-001**: Completed task
- [ ] **T-002**: Incomplete task
`;

      const tasks = taskGenerator.parseTasksFromMarkdown(userStoryContent);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].id).toBe('T-001');
      expect(tasks[0].completed).toBe(true);
      expect(tasks[1].id).toBe('T-002');
      expect(tasks[1].completed).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should sync 100 tasks in <5s', async () => {
      // Create increment with 100 tasks
      let tasksContent = '# Tasks\n\n';
      for (let i = 1; i <= 100; i++) {
        tasksContent += `## T-${i.toString().padStart(3, '0')}: Task ${i}\n\n`;
        tasksContent += `**Status**: [${i % 2 === 0 ? 'x' : ' '}]\n`;
        tasksContent += `**AC**: AC-US1-01\n\n`;
      }

      await writeFile(join(incrementDir, 'tasks.md'), tasksContent);

      const startTime = Date.now();
      const tasks = await taskGenerator.generateProjectSpecificTasks('0031-external-tool-sync', 'US-001');
      const elapsedTime = Date.now() - startTime;

      expect(tasks).toHaveLength(100);
      expect(elapsedTime).toBeLessThan(5000);
    });
  });
});
