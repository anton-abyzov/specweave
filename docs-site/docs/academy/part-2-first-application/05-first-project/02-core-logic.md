---
sidebar_position: 2
title: "05.2 Core Logic"
description: "Implement task management functionality"
---

# Lesson 05.2: Core Logic

**Duration**: 60 minutes | **Difficulty**: Beginner

---

## Learning Objectives

By the end of this lesson, you will:
- Understand the task data model
- Test task functions interactively
- Handle edge cases
- Add input validation

---

## Understanding the Data Model

Each task is an object:

```javascript
{
  id: 1,                                    // Unique identifier
  title: "Learn JavaScript",                // Task description
  completed: false,                         // Status
  createdAt: "2024-01-15T10:30:00.000Z",   // When created
  completedAt: null                         // When completed (if applicable)
}
```

Tasks are stored as an array in `data/tasks.json`:

```json
[
  {
    "id": 1,
    "title": "Learn JavaScript",
    "completed": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "completedAt": "2024-01-15T14:00:00.000Z"
  },
  {
    "id": 2,
    "title": "Build first project",
    "completed": false,
    "createdAt": "2024-01-15T10:31:00.000Z"
  }
]
```

---

## Testing Functions Interactively

Let's test our functions. Create a test file:

```javascript
// test-tasks.js
import { addTask, listTasks, completeTask, deleteTask } from './src/tasks.js';

async function test() {
  console.log('Testing Task Tracker...\n');

  // Test 1: Add tasks
  console.log('1. Adding tasks...');
  const task1 = await addTask('Learn JavaScript');
  console.log(`   Added: ${task1.title} (id: ${task1.id})`);

  const task2 = await addTask('Build first project');
  console.log(`   Added: ${task2.title} (id: ${task2.id})`);

  // Test 2: List tasks
  console.log('\n2. Listing tasks...');
  const tasks = await listTasks();
  tasks.forEach(t => {
    const status = t.completed ? '[x]' : '[ ]';
    console.log(`   ${status} ${t.id}: ${t.title}`);
  });

  // Test 3: Complete a task
  console.log('\n3. Completing task 1...');
  const completed = await completeTask(1);
  if (completed) {
    console.log(`   Completed: ${completed.title}`);
  }

  // Test 4: List again
  console.log('\n4. Listing tasks after completion...');
  const updatedTasks = await listTasks();
  updatedTasks.forEach(t => {
    const status = t.completed ? '[x]' : '[ ]';
    console.log(`   ${status} ${t.id}: ${t.title}`);
  });

  // Test 5: Delete a task
  console.log('\n5. Deleting task 2...');
  const deleted = await deleteTask(2);
  console.log(`   Deleted: ${deleted}`);

  // Test 6: Final list
  console.log('\n6. Final task list...');
  const finalTasks = await listTasks();
  finalTasks.forEach(t => {
    const status = t.completed ? '[x]' : '[ ]';
    console.log(`   ${status} ${t.id}: ${t.title}`);
  });

  console.log('\nAll tests passed!');
}

test().catch(console.error);
```

Run the test:

```bash
node test-tasks.js
```

Expected output:

```
Testing Task Tracker...

1. Adding tasks...
   Added: Learn JavaScript (id: 1)
   Added: Build first project (id: 2)

2. Listing tasks...
   [ ] 1: Learn JavaScript
   [ ] 2: Build first project

3. Completing task 1...
   Completed: Learn JavaScript

4. Listing tasks after completion...
   [x] 1: Learn JavaScript
   [ ] 2: Build first project

5. Deleting task 2...
   Deleted: true

6. Final task list...
   [x] 1: Learn JavaScript

All tests passed!
```

---

## Adding Input Validation

Our functions should handle bad input gracefully. Update `src/tasks.js`:

```javascript
// src/tasks.js
// Task management logic with validation

import { loadTasks, saveTasks } from './storage.js';

/**
 * Gets the next available task ID
 */
function getNextId(tasks) {
  if (tasks.length === 0) return 1;
  return Math.max(...tasks.map(t => t.id)) + 1;
}

/**
 * Validates task title
 * @param {string} title - Title to validate
 * @throws {Error} If title is invalid
 */
function validateTitle(title) {
  if (!title || typeof title !== 'string') {
    throw new Error('Task title is required');
  }

  const trimmed = title.trim();
  if (trimmed.length === 0) {
    throw new Error('Task title cannot be empty');
  }

  if (trimmed.length > 200) {
    throw new Error('Task title must be 200 characters or less');
  }

  return trimmed;
}

/**
 * Validates task ID
 * @param {any} id - ID to validate
 * @throws {Error} If ID is invalid
 */
function validateId(id) {
  const numId = Number(id);
  if (isNaN(numId) || numId < 1 || !Number.isInteger(numId)) {
    throw new Error('Task ID must be a positive integer');
  }
  return numId;
}

/**
 * Adds a new task
 * @param {string} title - Task title
 * @returns {Promise<Object>} Created task
 */
export async function addTask(title) {
  const validTitle = validateTitle(title);
  const tasks = await loadTasks();

  const newTask = {
    id: getNextId(tasks),
    title: validTitle,
    completed: false,
    createdAt: new Date().toISOString()
  };

  tasks.push(newTask);
  await saveTasks(tasks);

  return newTask;
}

/**
 * Lists all tasks
 * @param {Object} options - Filter options
 * @param {boolean} options.completed - Filter by completion status
 * @returns {Promise<Array>} Filtered tasks
 */
export async function listTasks(options = {}) {
  let tasks = await loadTasks();

  // Filter by completion status if specified
  if (typeof options.completed === 'boolean') {
    tasks = tasks.filter(t => t.completed === options.completed);
  }

  return tasks;
}

/**
 * Marks a task as complete
 * @param {number} id - Task ID
 * @returns {Promise<Object|null>} Updated task or null if not found
 */
export async function completeTask(id) {
  const validId = validateId(id);
  const tasks = await loadTasks();
  const task = tasks.find(t => t.id === validId);

  if (!task) return null;

  // Already completed? Return as-is
  if (task.completed) return task;

  task.completed = true;
  task.completedAt = new Date().toISOString();

  await saveTasks(tasks);
  return task;
}

/**
 * Marks a task as incomplete (uncomplete)
 * @param {number} id - Task ID
 * @returns {Promise<Object|null>} Updated task or null if not found
 */
export async function uncompleteTask(id) {
  const validId = validateId(id);
  const tasks = await loadTasks();
  const task = tasks.find(t => t.id === validId);

  if (!task) return null;

  task.completed = false;
  delete task.completedAt;

  await saveTasks(tasks);
  return task;
}

/**
 * Deletes a task
 * @param {number} id - Task ID
 * @returns {Promise<boolean>} True if deleted
 */
export async function deleteTask(id) {
  const validId = validateId(id);
  const tasks = await loadTasks();
  const index = tasks.findIndex(t => t.id === validId);

  if (index === -1) return false;

  tasks.splice(index, 1);
  await saveTasks(tasks);
  return true;
}

/**
 * Gets a single task by ID
 * @param {number} id - Task ID
 * @returns {Promise<Object|null>} Task or null if not found
 */
export async function getTask(id) {
  const validId = validateId(id);
  const tasks = await loadTasks();
  return tasks.find(t => t.id === validId) || null;
}

/**
 * Updates a task's title
 * @param {number} id - Task ID
 * @param {string} title - New title
 * @returns {Promise<Object|null>} Updated task or null if not found
 */
export async function updateTask(id, title) {
  const validId = validateId(id);
  const validTitle = validateTitle(title);

  const tasks = await loadTasks();
  const task = tasks.find(t => t.id === validId);

  if (!task) return null;

  task.title = validTitle;
  task.updatedAt = new Date().toISOString();

  await saveTasks(tasks);
  return task;
}

/**
 * Gets statistics about tasks
 * @returns {Promise<Object>} Task statistics
 */
export async function getStats() {
  const tasks = await loadTasks();
  return {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    pending: tasks.filter(t => !t.completed).length
  };
}
```

---

## Testing Edge Cases

Update test file to test edge cases:

```javascript
// test-edge-cases.js
import { addTask, completeTask, deleteTask, getStats } from './src/tasks.js';

async function testEdgeCases() {
  console.log('Testing edge cases...\n');

  // Test: Empty title
  console.log('1. Empty title...');
  try {
    await addTask('');
  } catch (error) {
    console.log(`   ✓ Caught: ${error.message}`);
  }

  // Test: Whitespace title
  console.log('\n2. Whitespace title...');
  try {
    await addTask('   ');
  } catch (error) {
    console.log(`   ✓ Caught: ${error.message}`);
  }

  // Test: Invalid ID
  console.log('\n3. Invalid ID...');
  try {
    await completeTask('abc');
  } catch (error) {
    console.log(`   ✓ Caught: ${error.message}`);
  }

  // Test: Non-existent task
  console.log('\n4. Non-existent task...');
  const result = await completeTask(9999);
  console.log(`   ✓ Result: ${result} (null means not found)`);

  // Test: Delete non-existent
  console.log('\n5. Delete non-existent...');
  const deleted = await deleteTask(9999);
  console.log(`   ✓ Result: ${deleted} (false means not found)`);

  // Test: Very long title
  console.log('\n6. Very long title (201 chars)...');
  try {
    await addTask('a'.repeat(201));
  } catch (error) {
    console.log(`   ✓ Caught: ${error.message}`);
  }

  // Test: Stats
  console.log('\n7. Getting stats...');
  const stats = await getStats();
  console.log(`   ✓ Total: ${stats.total}, Completed: ${stats.completed}, Pending: ${stats.pending}`);

  console.log('\nAll edge case tests passed!');
}

testEdgeCases().catch(console.error);
```

Run:

```bash
node test-edge-cases.js
```

---

## Error Handling Pattern

The standard pattern for handling errors:

```javascript
try {
  const task = await addTask(userInput);
  console.log(`✓ Added: ${task.title}`);
} catch (error) {
  console.error(`✗ Error: ${error.message}`);
  process.exit(1);
}
```

This pattern:
1. **Try** the operation
2. **Handle success** — show confirmation
3. **Catch errors** — show message, exit with error code

---

## Clean Up Test Data

Before moving on, clean up test data:

```bash
# Remove test data file
rm -f data/tasks.json

# Remove test files
rm -f test-tasks.js test-edge-cases.js
```

---

## What We Built

```
src/tasks.js now has:
├── addTask(title)           - Create task with validation
├── listTasks(options)       - List with optional filter
├── getTask(id)              - Get single task
├── completeTask(id)         - Mark complete
├── uncompleteTask(id)       - Mark incomplete
├── updateTask(id, title)    - Update title
├── deleteTask(id)           - Remove task
└── getStats()               - Get counts
```

---

## The Missing Pieces (Still!)

We've built functional code, but we still don't have:
- ❌ **Requirements**: What should each function accept/return?
- ❌ **Design decisions**: Why JSON instead of SQLite?
- ❌ **Acceptance criteria**: How do we know validation is correct?
- ❌ **Test coverage**: Are all edge cases covered?

We're winging it. It works, but it's not professional.

**In Module 06, SpecWeave will capture all of this before we write code.**

---

## Commit Your Progress

```bash
git add .
git commit -m "feat: Add task management with validation and edge case handling"
```

---

## Key Takeaways

1. **Validate inputs** — never trust user data
2. **Handle edge cases** — empty strings, invalid IDs, missing items
3. **Return meaningful values** — null for not found, false for failed delete
4. **Test interactively** — quick tests catch obvious bugs
5. **Clean up test data** — keep repo clean

---

## Next Lesson

Now let's build the CLI interface — the user-facing part of our application.

→ [Continue to Lesson 05.3: CLI Interface](./03-cli-interface)
