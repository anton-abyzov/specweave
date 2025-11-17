/**
 * Unit Tests for TaskProjectSpecificGenerator
 *
 * Tests project-specific task generation, filtering, and formatting.
 */

import { TaskProjectSpecificGenerator } from '../../../src/core/living-docs/task-project-specific-generator.js';
import fs from 'fs-extra';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('TaskProjectSpecificGenerator', () => {
  let generator: TaskProjectSpecificGenerator;
  let testDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(__dirname, '../../fixtures/temp-task-generator-test');
    await fs.ensureDir(testDir);
    generator = new TaskProjectSpecificGenerator(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  describe('loadIncrementTasks', () => {
    it('should load tasks with completion status from tasks.md', async () => {
      // Create test increment tasks.md
      const incrementId = '0031-test-increment';
      const tasksPath = path.join(testDir, '.specweave', 'increments', incrementId, 'tasks.md');
      await fs.ensureDir(path.dirname(tasksPath));

      const tasksContent = `
### T-001: Setup API endpoint

**Status**: [x] (100% - Completed)

**AC**: AC-US1-01, AC-US1-02

### T-002: Create React component

**Status**: [ ] (0% - Not started)

**AC**: AC-US1-01

### T-003: Add DB migration

**Status**: [x] (100% - Completed)

**AC**: AC-US1-02
`;

      await fs.writeFile(tasksPath, tasksContent);

      // Test private method via public method
      const tasks = await generator.generateProjectSpecificTasks(incrementId, 'US-001');

      expect(tasks).toHaveLength(3);
      expect(tasks[0]).toEqual({
        id: 'T-001',
        title: 'Setup API endpoint',
        completed: true,
        acIds: ['AC-US1-01', 'AC-US1-02'],
        sourceIncrement: incrementId,
      });
      expect(tasks[1]).toEqual({
        id: 'T-002',
        title: 'Create React component',
        completed: false,
        acIds: ['AC-US1-01'],
        sourceIncrement: incrementId,
      });
      expect(tasks[2]).toEqual({
        id: 'T-003',
        title: 'Add DB migration',
        completed: true,
        acIds: ['AC-US1-02'],
        sourceIncrement: incrementId,
      });
    });

    it('should return empty array if tasks.md does not exist', async () => {
      const tasks = await generator.generateProjectSpecificTasks('nonexistent', 'US-001');
      expect(tasks).toEqual([]);
    });

    it('should handle tasks with ## headings', async () => {
      const incrementId = '0032-test-increment';
      const tasksPath = path.join(testDir, '.specweave', 'increments', incrementId, 'tasks.md');
      await fs.ensureDir(path.dirname(tasksPath));

      const tasksContent = `
## T-001: Task with double hash

**Status**: [x] (100% - Completed)

**AC**: AC-US1-01
`;

      await fs.writeFile(tasksPath, tasksContent);

      const tasks = await generator.generateProjectSpecificTasks(incrementId, 'US-001');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('T-001');
    });
  });

  describe('filterTasksByUserStory', () => {
    it('should filter tasks by User Story ID via AC-IDs', async () => {
      const incrementId = '0033-test-increment';
      const tasksPath = path.join(testDir, '.specweave', 'increments', incrementId, 'tasks.md');
      await fs.ensureDir(path.dirname(tasksPath));

      const tasksContent = `
### T-001: Backend task

**Status**: [x]

**AC**: AC-US1-01, AC-US1-02

### T-002: Frontend task

**Status**: [ ]

**AC**: AC-US2-01

### T-003: Another backend task

**Status**: [x]

**AC**: AC-US1-03
`;

      await fs.writeFile(tasksPath, tasksContent);

      // Filter for US-001
      const us1Tasks = await generator.generateProjectSpecificTasks(incrementId, 'US-001');
      expect(us1Tasks).toHaveLength(2);
      expect(us1Tasks.map(t => t.id)).toEqual(['T-001', 'T-003']);

      // Filter for US-002
      const us2Tasks = await generator.generateProjectSpecificTasks(incrementId, 'US-002');
      expect(us2Tasks).toHaveLength(1);
      expect(us2Tasks[0].id).toBe('T-002');
    });

    it('should return empty array for User Story with no matching tasks', async () => {
      const incrementId = '0034-test-increment';
      const tasksPath = path.join(testDir, '.specweave', 'increments', incrementId, 'tasks.md');
      await fs.ensureDir(path.dirname(tasksPath));

      const tasksContent = `
### T-001: Task for US-001

**Status**: [x]

**AC**: AC-US1-01
`;

      await fs.writeFile(tasksPath, tasksContent);

      const tasks = await generator.generateProjectSpecificTasks(incrementId, 'US-999');
      expect(tasks).toEqual([]);
    });
  });

  describe('filterTasksByProject', () => {
    it('should filter tasks by project keywords', async () => {
      const incrementId = '0035-test-increment';
      const tasksPath = path.join(testDir, '.specweave', 'increments', incrementId, 'tasks.md');
      await fs.ensureDir(path.dirname(tasksPath));

      const tasksContent = `
### T-001: Setup API endpoint

**Status**: [x]

**AC**: AC-US1-01

### T-002: Create React component

**Status**: [ ]

**AC**: AC-US1-02

### T-003: Add database migration

**Status**: [x]

**AC**: AC-US1-03
`;

      await fs.writeFile(tasksPath, tasksContent);

      const projectContext = {
        id: 'backend',
        name: 'Backend',
        type: 'backend' as const,
        techStack: ['Node.js', 'PostgreSQL'],
        keywords: ['api', 'database', 'backend'],
      };

      const tasks = await generator.generateProjectSpecificTasks(
        incrementId,
        'US-001',
        projectContext
      );

      // Should filter to only backend-related tasks
      expect(tasks).toHaveLength(2);
      expect(tasks.map(t => t.id)).toEqual(['T-001', 'T-003']);
      expect(tasks[0].project).toBe('backend');
    });

    it('should return all tasks if no keywords provided', async () => {
      const incrementId = '0036-test-increment';
      const tasksPath = path.join(testDir, '.specweave', 'increments', incrementId, 'tasks.md');
      await fs.ensureDir(path.dirname(tasksPath));

      const tasksContent = `
### T-001: Task 1

**Status**: [x]

**AC**: AC-US1-01

### T-002: Task 2

**Status**: [ ]

**AC**: AC-US1-02
`;

      await fs.writeFile(tasksPath, tasksContent);

      const projectContext = {
        id: 'default',
        name: 'Default',
        type: 'generic' as const,
        techStack: [] as string[],
        keywords: [] as string[], // No keywords = return all
      };

      const tasks = await generator.generateProjectSpecificTasks(
        incrementId,
        'US-001',
        projectContext
      );

      expect(tasks).toHaveLength(2);
    });
  });

  describe('formatTasksAsMarkdown', () => {
    it('should format tasks as markdown checkboxes', () => {
      const tasks = [
        {
          id: 'T-001',
          title: 'Setup API endpoint',
          completed: true,
          acIds: ['AC-US1-01'],
        },
        {
          id: 'T-002',
          title: 'Create React component',
          completed: false,
          acIds: ['AC-US1-02'],
        },
      ];

      const markdown = generator.formatTasksAsMarkdown(tasks);

      expect(markdown).toBe(
        '- [x] **T-001**: Setup API endpoint\n- [ ] **T-002**: Create React component'
      );
    });

    it('should return message for empty task list', () => {
      const markdown = generator.formatTasksAsMarkdown([]);
      expect(markdown).toBe('_No tasks defined for this user story_');
    });
  });

  describe('parseTasksFromMarkdown', () => {
    it('should parse task checkboxes from ## Tasks section', () => {
      const content = `
---
id: US-001
---

# US-001: Test User Story

## Acceptance Criteria
- [ ] AC-US1-01: Criterion 1

## Tasks

- [x] **T-001**: Setup API endpoint
- [ ] **T-002**: Create React component
- [x] **T-003**: Add DB migration

> **Note**: Tasks are project-specific

## Implementation
**Increment**: [0031](link)
`;

      const tasks = generator.parseTasksFromMarkdown(content);

      expect(tasks).toHaveLength(3);
      expect(tasks[0]).toEqual({
        id: 'T-001',
        title: 'Setup API endpoint',
        completed: true,
        acIds: [],
      });
      expect(tasks[1]).toEqual({
        id: 'T-002',
        title: 'Create React component',
        completed: false,
        acIds: [],
      });
      expect(tasks[2]).toEqual({
        id: 'T-003',
        title: 'Add DB migration',
        completed: true,
        acIds: [],
      });
    });

    it('should return empty array if no ## Tasks section', () => {
      const content = `
# US-001: Test User Story

## Acceptance Criteria
- [ ] AC-US1-01: Criterion 1
`;

      const tasks = generator.parseTasksFromMarkdown(content);
      expect(tasks).toEqual([]);
    });
  });

  describe('updateTaskCheckboxes', () => {
    it('should update task checkbox state', () => {
      const content = `
## Tasks

- [ ] **T-001**: Setup API endpoint
- [x] **T-002**: Create React component
- [ ] **T-003**: Add DB migration
`;

      const updates = new Map([
        ['T-001', true],  // Mark as completed
        ['T-002', false], // Mark as incomplete
      ]);

      const updated = generator.updateTaskCheckboxes(content, updates);

      expect(updated).toContain('- [x] **T-001**: Setup API endpoint');
      expect(updated).toContain('- [ ] **T-002**: Create React component');
      expect(updated).toContain('- [ ] **T-003**: Add DB migration'); // Unchanged
    });

    it('should handle tasks that do not exist', () => {
      const content = `
## Tasks

- [ ] **T-001**: Setup API endpoint
`;

      const updates = new Map([
        ['T-999', true], // Task that doesn't exist
      ]);

      const updated = generator.updateTaskCheckboxes(content, updates);

      // Should not change anything
      expect(updated).toBe(content);
    });
  });

  describe('enrichTaskReferencesWithStatus', () => {
    it('should enrich TaskReference with completion status', async () => {
      const incrementId = '0037-test-increment';
      const tasksPath = path.join(testDir, '.specweave', 'increments', incrementId, 'tasks.md');
      await fs.ensureDir(path.dirname(tasksPath));

      const tasksContent = `
### T-001: Setup API endpoint

**Status**: [x]

**AC**: AC-US1-01

### T-002: Create React component

**Status**: [ ]

**AC**: AC-US1-02
`;

      await fs.writeFile(tasksPath, tasksContent);

      const taskReferences = [
        {
          id: 'T-001',
          title: 'Setup API endpoint',
          anchor: '#t-001-setup-api-endpoint',
          path: '../../../../../increments/0037/tasks.md#t-001',
          acIds: ['AC-US1-01'],
        },
        {
          id: 'T-002',
          title: 'Create React component',
          anchor: '#t-002-create-react-component',
          path: '../../../../../increments/0037/tasks.md#t-002',
          acIds: ['AC-US1-02'],
        },
      ];

      const enriched = await generator.enrichTaskReferencesWithStatus(
        taskReferences,
        incrementId
      );

      expect(enriched).toHaveLength(2);
      expect(enriched[0].completed).toBe(true);
      expect(enriched[1].completed).toBe(false);
    });
  });

  describe('Integration: Full workflow', () => {
    it('should generate project-specific tasks for multi-project increment', async () => {
      const incrementId = '0038-multi-project';
      const tasksPath = path.join(testDir, '.specweave', 'increments', incrementId, 'tasks.md');
      await fs.ensureDir(path.dirname(tasksPath));

      const tasksContent = `
### T-001: Setup API endpoint for authentication

**Status**: [x]

**AC**: AC-US1-01, AC-US1-02

### T-002: Create React login component

**Status**: [ ]

**AC**: AC-US1-01

### T-003: Add user database table

**Status**: [x]

**AC**: AC-US1-02

### T-004: Style login form with CSS

**Status**: [ ]

**AC**: AC-US1-03
`;

      await fs.writeFile(tasksPath, tasksContent);

      // Backend context
      const backendContext = {
        id: 'backend',
        name: 'Backend',
        type: 'backend' as const,
        techStack: ['Node.js', 'PostgreSQL'],
        keywords: ['api', 'database', 'authentication'],
      };

      // Frontend context
      const frontendContext = {
        id: 'frontend',
        name: 'Frontend',
        type: 'frontend' as const,
        techStack: ['React', 'CSS'],
        keywords: ['react', 'component', 'form', 'css'],
      };

      // Generate backend tasks
      const backendTasks = await generator.generateProjectSpecificTasks(
        incrementId,
        'US-001',
        backendContext
      );

      expect(backendTasks).toHaveLength(2);
      expect(backendTasks.map(t => t.id)).toEqual(['T-001', 'T-003']);
      expect(backendTasks[0].completed).toBe(true);
      expect(backendTasks[1].completed).toBe(true);

      // Generate frontend tasks
      const frontendTasks = await generator.generateProjectSpecificTasks(
        incrementId,
        'US-001',
        frontendContext
      );

      expect(frontendTasks).toHaveLength(2);
      expect(frontendTasks.map(t => t.id)).toEqual(['T-002', 'T-004']);
      expect(frontendTasks[0].completed).toBe(false);
      expect(frontendTasks[1].completed).toBe(false);
    });
  });
});
