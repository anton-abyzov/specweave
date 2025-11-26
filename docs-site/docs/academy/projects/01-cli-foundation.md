---
sidebar_position: 2
title: "CLI Foundation"
description: "Build the base task tracker CLI application"
---

# Project: CLI Foundation

**Part 2 Project** | Duration: 3-4 hours

Build a fully functional command-line task tracker in Node.js.

---

## What You'll Build

A CLI task manager with these commands:

```bash
# Add a task
node task.js add "Buy groceries"
# Task added: Buy groceries (ID: 1)

# List all tasks
node task.js list
# [ ] 1: Buy groceries
# [ ] 2: Finish homework
# [x] 3: Call mom

# Mark as complete
node task.js complete 1
# Task 1 marked as complete

# Delete a task
node task.js delete 2
# Task 2 deleted

# Filter tasks
node task.js list --pending
# [ ] 1: Buy groceries

node task.js list --completed
# [x] 3: Call mom
```

---

## Prerequisites

Complete these lessons first:
- [03.1: Terminal Basics](/docs/academy/part-1-foundations/03-terminal)
- [04: JavaScript Basics](/docs/academy/part-2-first-application/04-javascript-basics/)

---

## Project Structure

```
task-tracker/
├── package.json           # Project configuration
├── .gitignore             # Git ignore rules
├── task.js                # CLI entry point
├── src/
│   ├── tasks.js           # Task operations
│   ├── storage.js         # File persistence
│   └── cli.js             # Command parsing
└── data/
    └── tasks.json         # Task data (auto-created)
```

---

## Step 1: Project Setup

Follow [Lesson 05.1: Project Setup](/docs/academy/part-2-first-application/05-first-project/01-project-setup) to create the base project.

**Checkpoint**: Running `node task.js` should output "Task Tracker - Ready".

---

## Step 2: Core Logic

Follow [Lesson 05.2: Core Logic](/docs/academy/part-2-first-application/05-first-project/02-core-logic) to implement task operations.

**Checkpoint**: All functions in `src/tasks.js` should be implemented:
- `addTask(title)` — Creates new task
- `listTasks()` — Returns all tasks
- `completeTask(id)` — Marks task complete
- `deleteTask(id)` — Removes task

---

## Step 3: CLI Interface

Follow [Lesson 05.3: CLI Interface](/docs/academy/part-2-first-application/05-first-project/03-cli-interface) to add command parsing.

### Command Parser

```javascript
// src/cli.js
export function parseArgs(args) {
  const command = args[0];
  const params = args.slice(1);

  return { command, params };
}

export function parseFlags(params) {
  const flags = {};
  const positional = [];

  for (const param of params) {
    if (param.startsWith('--')) {
      const [key, value] = param.slice(2).split('=');
      flags[key] = value ?? true;
    } else {
      positional.push(param);
    }
  }

  return { flags, positional };
}
```

### Entry Point

```javascript
// task.js
import { addTask, listTasks, completeTask, deleteTask } from './src/tasks.js';
import { parseArgs, parseFlags } from './src/cli.js';

const args = process.argv.slice(2);
const { command, params } = parseArgs(args);
const { flags, positional } = parseFlags(params);

async function main() {
  switch (command) {
    case 'add': {
      const title = positional.join(' ');
      if (!title) {
        console.error('Error: Task title required');
        process.exit(1);
      }
      const task = await addTask(title);
      console.log(`Task added: ${task.title} (ID: ${task.id})`);
      break;
    }

    case 'list': {
      const tasks = await listTasks();
      if (tasks.length === 0) {
        console.log('No tasks found.');
        break;
      }

      let filtered = tasks;
      if (flags.pending) {
        filtered = tasks.filter(t => !t.completed);
      } else if (flags.completed) {
        filtered = tasks.filter(t => t.completed);
      }

      for (const task of filtered) {
        const status = task.completed ? '[x]' : '[ ]';
        console.log(`${status} ${task.id}: ${task.title}`);
      }
      break;
    }

    case 'complete': {
      const id = parseInt(positional[0]);
      if (isNaN(id)) {
        console.error('Error: Valid task ID required');
        process.exit(1);
      }
      const task = await completeTask(id);
      if (task) {
        console.log(`Task ${id} marked as complete`);
      } else {
        console.log(`Task ${id} not found`);
      }
      break;
    }

    case 'delete': {
      const id = parseInt(positional[0]);
      if (isNaN(id)) {
        console.error('Error: Valid task ID required');
        process.exit(1);
      }
      const deleted = await deleteTask(id);
      if (deleted) {
        console.log(`Task ${id} deleted`);
      } else {
        console.log(`Task ${id} not found`);
      }
      break;
    }

    case 'help':
    default:
      console.log(`
Task Tracker - A simple CLI task manager

Commands:
  add <title>        Add a new task
  list               List all tasks
  list --pending     List pending tasks only
  list --completed   List completed tasks only
  complete <id>      Mark a task as complete
  delete <id>        Delete a task
  help               Show this help message
      `);
  }
}

main().catch(console.error);
```

**Checkpoint**: All CLI commands work correctly.

---

## Step 4: Error Handling

Add robust error handling:

```javascript
// src/errors.js
export class TaskNotFoundError extends Error {
  constructor(id) {
    super(`Task ${id} not found`);
    this.name = 'TaskNotFoundError';
    this.id = id;
  }
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

```javascript
// src/tasks.js (updated)
import { TaskNotFoundError, ValidationError } from './errors.js';

export async function addTask(title) {
  if (!title || title.trim().length === 0) {
    throw new ValidationError('Task title cannot be empty');
  }

  if (title.length > 200) {
    throw new ValidationError('Task title cannot exceed 200 characters');
  }

  // ... rest of implementation
}

export async function completeTask(id) {
  const tasks = await loadTasks();
  const task = tasks.find(t => t.id === id);

  if (!task) {
    throw new TaskNotFoundError(id);
  }

  // ... rest of implementation
}
```

---

## Step 5: Add Features

Enhance the CLI with additional features:

### Priority Levels

```javascript
// Add priority to tasks
export async function addTask(title, priority = 'medium') {
  const validPriorities = ['low', 'medium', 'high'];
  if (!validPriorities.includes(priority)) {
    throw new ValidationError(`Invalid priority. Use: ${validPriorities.join(', ')}`);
  }

  const newTask = {
    id: getNextId(tasks),
    title,
    priority,
    completed: false,
    createdAt: new Date().toISOString()
  };

  // ...
}
```

### Due Dates

```javascript
// Add due date support
export async function addTask(title, options = {}) {
  const newTask = {
    id: getNextId(tasks),
    title,
    priority: options.priority || 'medium',
    dueDate: options.dueDate || null,
    completed: false,
    createdAt: new Date().toISOString()
  };

  // ...
}
```

### Search

```javascript
// Add search functionality
export async function searchTasks(query) {
  const tasks = await loadTasks();
  const lowerQuery = query.toLowerCase();

  return tasks.filter(task =>
    task.title.toLowerCase().includes(lowerQuery)
  );
}
```

---

## Validation Checklist

Before moving on, verify:

- [ ] `node task.js add "Test"` creates a task
- [ ] `node task.js list` shows all tasks
- [ ] `node task.js list --pending` filters correctly
- [ ] `node task.js list --completed` filters correctly
- [ ] `node task.js complete 1` marks task complete
- [ ] `node task.js delete 1` removes task
- [ ] Error messages are helpful
- [ ] Data persists between runs
- [ ] Git has clean commits

---

## What's Next

In Part 3, you'll add tests to this project:

```bash
# Run tests (we'll add these)
npm test

# Coverage report
npm run test:coverage
```

→ [Continue: Add Testing](./02-testing)

---

## Common Issues

### "Cannot find module"

```bash
# Check you're using ES modules
# package.json must have "type": "module"
```

### "ENOENT: no such file"

```bash
# The data directory should be created automatically
# Check storage.js creates directory if missing
```

### "JSON parse error"

```bash
# Delete corrupted data file
rm data/tasks.json
# Tasks will start fresh
```

---

## Learning Reflection

After completing this project, you should understand:

1. **Node.js basics** — Running JavaScript outside the browser
2. **ES Modules** — Import/export syntax
3. **File I/O** — Reading and writing JSON files
4. **CLI parsing** — Processing command-line arguments
5. **Error handling** — Custom errors and graceful failures
6. **Project structure** — Organizing code by responsibility

These skills form the foundation for everything that follows.
