---
sidebar_position: 3
title: "Add Testing"
description: "Add a comprehensive test suite to the task tracker"
---

# Project: Add Testing

**Part 3 Project** | Duration: 4-5 hours

Add unit tests, integration tests, and E2E tests to your task tracker.

---

## What You'll Add

A complete test suite with:

```bash
# Run all tests
npm test
# ✓ 24 tests passed

# Coverage report
npm run test:coverage
# Statements: 92%
# Branches:   88%
# Functions:  95%
# Lines:      92%
```

---

## Prerequisites

- Complete [CLI Foundation](./01-cli-foundation) project
- Complete [Part 3: Testing](/docs/academy/part-3-testing/) lessons

---

## Step 1: Install Vitest

```bash
# Add Vitest and dependencies
npm install -D vitest @vitest/coverage-v8
```

```json
// package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Step 2: Create Test Structure

```
task-tracker/
├── src/
│   ├── tasks.js
│   ├── storage.js
│   └── cli.js
├── tests/
│   ├── unit/
│   │   ├── tasks.test.js
│   │   ├── storage.test.js
│   │   └── cli.test.js
│   ├── integration/
│   │   └── task-operations.test.js
│   └── e2e/
│       └── cli-commands.test.js
└── vitest.config.js
```

---

## Step 3: Configure Vitest

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['tests/**', 'vitest.config.js']
    },
    include: ['tests/**/*.test.js']
  }
});
```

---

## Step 4: Unit Tests

### Testing tasks.js

```javascript
// tests/unit/tasks.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { addTask, listTasks, completeTask, deleteTask } from '../../src/tasks.js';
import * as storage from '../../src/storage.js';

// Mock storage module
vi.mock('../../src/storage.js');

describe('Task Operations', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
    storage.loadTasks.mockResolvedValue([]);
    storage.saveTasks.mockResolvedValue();
  });

  describe('addTask', () => {
    it('should create task with correct structure', async () => {
      const task = await addTask('Test task');

      expect(task).toMatchObject({
        id: expect.any(Number),
        title: 'Test task',
        completed: false,
        createdAt: expect.any(String)
      });
    });

    it('should auto-increment ID', async () => {
      storage.loadTasks.mockResolvedValue([
        { id: 1, title: 'Existing' }
      ]);

      const task = await addTask('New task');

      expect(task.id).toBe(2);
    });

    it('should reject empty title', async () => {
      await expect(addTask('')).rejects.toThrow('Task title cannot be empty');
    });

    it('should reject title over 200 characters', async () => {
      const longTitle = 'a'.repeat(201);
      await expect(addTask(longTitle)).rejects.toThrow('cannot exceed 200');
    });

    it('should trim whitespace from title', async () => {
      const task = await addTask('  Test task  ');
      expect(task.title).toBe('Test task');
    });
  });

  describe('listTasks', () => {
    it('should return all tasks', async () => {
      const mockTasks = [
        { id: 1, title: 'Task 1' },
        { id: 2, title: 'Task 2' }
      ];
      storage.loadTasks.mockResolvedValue(mockTasks);

      const tasks = await listTasks();

      expect(tasks).toEqual(mockTasks);
    });

    it('should return empty array when no tasks', async () => {
      const tasks = await listTasks();
      expect(tasks).toEqual([]);
    });
  });

  describe('completeTask', () => {
    it('should mark task as completed', async () => {
      storage.loadTasks.mockResolvedValue([
        { id: 1, title: 'Task 1', completed: false }
      ]);

      const task = await completeTask(1);

      expect(task.completed).toBe(true);
      expect(task.completedAt).toBeDefined();
    });

    it('should throw error for non-existent task', async () => {
      storage.loadTasks.mockResolvedValue([]);

      await expect(completeTask(999)).rejects.toThrow('Task 999 not found');
    });
  });

  describe('deleteTask', () => {
    it('should remove task from list', async () => {
      storage.loadTasks.mockResolvedValue([
        { id: 1, title: 'Task 1' },
        { id: 2, title: 'Task 2' }
      ]);

      await deleteTask(1);

      expect(storage.saveTasks).toHaveBeenCalledWith([
        { id: 2, title: 'Task 2' }
      ]);
    });

    it('should throw error for non-existent task', async () => {
      storage.loadTasks.mockResolvedValue([]);

      await expect(deleteTask(999)).rejects.toThrow('Task 999 not found');
    });
  });
});
```

### Testing storage.js

```javascript
// tests/unit/storage.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadTasks, saveTasks } from '../../src/storage.js';
import { readFile, writeFile, rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import os from 'os';
import path from 'path';

describe('Storage Operations', () => {
  let testDir;
  let originalDataFile;

  beforeEach(async () => {
    // Create temp directory for tests
    testDir = path.join(os.tmpdir(), `task-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    // Point storage to test directory
    // (You may need to modify storage.js to support custom paths)
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe('loadTasks', () => {
    it('should return empty array for missing file', async () => {
      const tasks = await loadTasks();
      expect(tasks).toEqual([]);
    });

    it('should parse JSON from file', async () => {
      const testTasks = [{ id: 1, title: 'Test' }];
      await writeFile(
        path.join(testDir, 'tasks.json'),
        JSON.stringify(testTasks)
      );

      const tasks = await loadTasks();
      expect(tasks).toEqual(testTasks);
    });
  });

  describe('saveTasks', () => {
    it('should create directory if missing', async () => {
      const tasks = [{ id: 1, title: 'Test' }];
      await saveTasks(tasks);

      expect(existsSync(path.join(testDir, 'data'))).toBe(true);
    });

    it('should write JSON to file', async () => {
      const tasks = [{ id: 1, title: 'Test' }];
      await saveTasks(tasks);

      const content = await readFile(
        path.join(testDir, 'data', 'tasks.json'),
        'utf-8'
      );
      expect(JSON.parse(content)).toEqual(tasks);
    });
  });
});
```

### Testing cli.js

```javascript
// tests/unit/cli.test.js
import { describe, it, expect } from 'vitest';
import { parseArgs, parseFlags } from '../../src/cli.js';

describe('CLI Parser', () => {
  describe('parseArgs', () => {
    it('should extract command and params', () => {
      const result = parseArgs(['add', 'Buy', 'groceries']);

      expect(result.command).toBe('add');
      expect(result.params).toEqual(['Buy', 'groceries']);
    });

    it('should handle single command', () => {
      const result = parseArgs(['list']);

      expect(result.command).toBe('list');
      expect(result.params).toEqual([]);
    });

    it('should handle empty args', () => {
      const result = parseArgs([]);

      expect(result.command).toBeUndefined();
      expect(result.params).toEqual([]);
    });
  });

  describe('parseFlags', () => {
    it('should extract boolean flags', () => {
      const result = parseFlags(['--pending']);

      expect(result.flags.pending).toBe(true);
      expect(result.positional).toEqual([]);
    });

    it('should extract value flags', () => {
      const result = parseFlags(['--priority=high']);

      expect(result.flags.priority).toBe('high');
    });

    it('should separate positional arguments', () => {
      const result = parseFlags(['task', 'title', '--pending']);

      expect(result.positional).toEqual(['task', 'title']);
      expect(result.flags.pending).toBe(true);
    });
  });
});
```

---

## Step 5: Integration Tests

```javascript
// tests/integration/task-operations.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { addTask, listTasks, completeTask, deleteTask } from '../../src/tasks.js';
import { rm } from 'fs/promises';
import path from 'path';

describe('Task Operations (Integration)', () => {
  const dataFile = path.join(process.cwd(), 'data', 'tasks.json');

  beforeEach(async () => {
    // Clean data file before each test
    await rm(dataFile, { force: true });
  });

  afterEach(async () => {
    // Clean up after tests
    await rm(dataFile, { force: true });
  });

  it('should persist tasks across operations', async () => {
    // Add task
    const task1 = await addTask('First task');
    const task2 = await addTask('Second task');

    // Verify list
    let tasks = await listTasks();
    expect(tasks).toHaveLength(2);

    // Complete task
    await completeTask(task1.id);
    tasks = await listTasks();
    expect(tasks.find(t => t.id === task1.id).completed).toBe(true);

    // Delete task
    await deleteTask(task2.id);
    tasks = await listTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe(task1.id);
  });

  it('should handle concurrent operations', async () => {
    // Add multiple tasks concurrently
    const promises = [
      addTask('Task 1'),
      addTask('Task 2'),
      addTask('Task 3')
    ];

    const results = await Promise.all(promises);

    // All should have unique IDs
    const ids = results.map(t => t.id);
    const uniqueIds = [...new Set(ids)];
    expect(uniqueIds).toHaveLength(3);
  });
});
```

---

## Step 6: E2E Tests

```javascript
// tests/e2e/cli-commands.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { rm } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
const dataFile = path.join(process.cwd(), 'data', 'tasks.json');

async function runCLI(args) {
  try {
    const { stdout, stderr } = await execAsync(`node task.js ${args}`);
    return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
  } catch (error) {
    return {
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || '',
      exitCode: error.code
    };
  }
}

describe('CLI Commands (E2E)', () => {
  beforeEach(async () => {
    await rm(dataFile, { force: true });
  });

  afterEach(async () => {
    await rm(dataFile, { force: true });
  });

  describe('add command', () => {
    it('should add a task', async () => {
      const result = await runCLI('add "Buy groceries"');

      expect(result.stdout).toMatch(/Task added: Buy groceries/);
      expect(result.stdout).toMatch(/ID: 1/);
    });

    it('should reject empty task', async () => {
      const result = await runCLI('add ""');

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/title required/i);
    });
  });

  describe('list command', () => {
    it('should list all tasks', async () => {
      await runCLI('add "Task 1"');
      await runCLI('add "Task 2"');

      const result = await runCLI('list');

      expect(result.stdout).toContain('Task 1');
      expect(result.stdout).toContain('Task 2');
    });

    it('should filter pending tasks', async () => {
      await runCLI('add "Task 1"');
      await runCLI('add "Task 2"');
      await runCLI('complete 1');

      const result = await runCLI('list --pending');

      expect(result.stdout).not.toContain('Task 1');
      expect(result.stdout).toContain('Task 2');
    });

    it('should filter completed tasks', async () => {
      await runCLI('add "Task 1"');
      await runCLI('add "Task 2"');
      await runCLI('complete 1');

      const result = await runCLI('list --completed');

      expect(result.stdout).toContain('Task 1');
      expect(result.stdout).not.toContain('Task 2');
    });
  });

  describe('complete command', () => {
    it('should complete a task', async () => {
      await runCLI('add "Task 1"');

      const result = await runCLI('complete 1');

      expect(result.stdout).toMatch(/Task 1 marked as complete/);
    });

    it('should error for non-existent task', async () => {
      const result = await runCLI('complete 999');

      expect(result.stdout).toContain('not found');
    });
  });

  describe('delete command', () => {
    it('should delete a task', async () => {
      await runCLI('add "Task 1"');

      const result = await runCLI('delete 1');

      expect(result.stdout).toMatch(/Task 1 deleted/);

      const listResult = await runCLI('list');
      expect(listResult.stdout).not.toContain('Task 1');
    });
  });

  describe('help command', () => {
    it('should display help text', async () => {
      const result = await runCLI('help');

      expect(result.stdout).toContain('Commands:');
      expect(result.stdout).toContain('add');
      expect(result.stdout).toContain('list');
      expect(result.stdout).toContain('complete');
      expect(result.stdout).toContain('delete');
    });
  });
});
```

---

## Step 7: Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/tasks.test.js

# Run in watch mode during development
npm run test:watch
```

---

## Coverage Targets

Aim for these coverage levels:

| File | Target |
|------|--------|
| tasks.js | 95%+ |
| storage.js | 90%+ |
| cli.js | 90%+ |
| **Overall** | 85%+ |

---

## Validation Checklist

Before moving on:

- [ ] Unit tests pass for all modules
- [ ] Integration tests verify data persistence
- [ ] E2E tests cover all CLI commands
- [ ] Coverage meets 85% threshold
- [ ] Tests run quickly (< 10 seconds)
- [ ] No flaky tests

---

## What's Next

In Part 4, you'll add quality tooling:
- ESLint for code quality
- TypeScript for type safety
- Pre-commit hooks

→ [Continue: Add Quality Tooling](./03-quality)

---

## Testing Patterns Reference

### Test Isolation

```javascript
// Each test starts fresh
beforeEach(async () => {
  await resetTestData();
});
```

### Mocking

```javascript
// Mock external dependencies
vi.mock('../../src/storage.js');
storage.loadTasks.mockResolvedValue([]);
```

### Async Testing

```javascript
// Wait for async operations
await expect(addTask('')).rejects.toThrow();
```

### Test Organization

```javascript
// Group related tests
describe('Feature', () => {
  describe('success cases', () => { ... });
  describe('error cases', () => { ... });
});
```
