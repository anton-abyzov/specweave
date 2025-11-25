---
sidebar_position: 1
title: "05.1 Project Setup"
description: "Create and structure your first Node.js project"
---

# Lesson 05.1: Project Setup

**Duration**: 45 minutes | **Difficulty**: Beginner

---

## Learning Objectives

By the end of this lesson, you will:
- Initialize a Node.js project
- Understand package.json
- Create a proper project structure
- Set up Git for version control

---

## Step 1: Create Project Directory

```bash
# Create and enter project folder
mkdir task-tracker
cd task-tracker

# Verify you're in the right place
pwd
# /path/to/task-tracker
```

---

## Step 2: Initialize Git

Version control from day one:

```bash
# Initialize Git repository
git init

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
.DS_Store
*.log
EOF

# Initial commit
git add .gitignore
git commit -m "Initial commit with .gitignore"
```

---

## Step 3: Initialize Node.js Project

```bash
# Create package.json interactively
npm init

# Answer the prompts:
# name: task-tracker
# version: 1.0.0
# description: A simple task tracker CLI
# entry point: task.js
# test command: (leave empty for now)
# git repository: (your repo if you have one)
# keywords: task, cli, tracker
# author: Your Name
# license: MIT
```

Or use defaults:

```bash
npm init -y
```

### Understanding package.json

```json
{
  "name": "task-tracker",
  "version": "1.0.0",
  "description": "A simple task tracker CLI",
  "main": "task.js",
  "scripts": {
    "start": "node task.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": ["task", "cli", "tracker"],
  "author": "Your Name",
  "license": "MIT"
}
```

| Field | Purpose |
|-------|---------|
| `name` | Package identifier |
| `version` | Current version (semantic versioning) |
| `description` | What the project does |
| `main` | Entry point file |
| `scripts` | Runnable commands (`npm run <script>`) |
| `keywords` | Searchable terms |
| `author` | Who made it |
| `license` | Usage terms |

---

## Step 4: Create Project Structure

```bash
# Create directories
mkdir src
mkdir data

# Create main files
touch src/tasks.js
touch src/storage.js
touch task.js

# View structure
ls -la
```

### Project Structure

```
task-tracker/
├── package.json      # Project configuration
├── .gitignore        # Files to ignore in Git
├── task.js           # Entry point (CLI)
├── src/
│   ├── tasks.js      # Task management logic
│   └── storage.js    # File storage operations
└── data/
    └── (tasks.json)  # Will be created at runtime
```

### Why This Structure?

| Folder/File | Purpose |
|-------------|---------|
| `task.js` | Entry point — handles CLI commands |
| `src/tasks.js` | Core logic — task operations |
| `src/storage.js` | Persistence — save/load data |
| `data/` | Data storage — keeps tasks.json |

**Separation of concerns** — each file has one job.

---

## Step 5: Add ESM Support

Modern JavaScript uses ES Modules. Add to package.json:

```json
{
  "name": "task-tracker",
  "version": "1.0.0",
  "type": "module",
  "main": "task.js"
}
```

This enables `import`/`export` syntax instead of `require()`.

---

## Step 6: Create Basic Files

### src/storage.js

```javascript
// src/storage.js
// Handles reading and writing tasks to file

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';

const DATA_FILE = './data/tasks.json';

/**
 * Loads tasks from file
 * @returns {Promise<Array>} Array of tasks
 */
export async function loadTasks() {
  try {
    const data = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist yet — return empty array
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Saves tasks to file
 * @param {Array} tasks - Array of tasks to save
 */
export async function saveTasks(tasks) {
  // Ensure data directory exists
  const dir = dirname(DATA_FILE);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  await writeFile(DATA_FILE, JSON.stringify(tasks, null, 2));
}
```

### src/tasks.js

```javascript
// src/tasks.js
// Task management logic

import { loadTasks, saveTasks } from './storage.js';

/**
 * Gets the next available task ID
 * @param {Array} tasks - Existing tasks
 * @returns {number} Next ID
 */
function getNextId(tasks) {
  if (tasks.length === 0) return 1;
  return Math.max(...tasks.map(t => t.id)) + 1;
}

/**
 * Adds a new task
 * @param {string} title - Task title
 * @returns {Promise<Object>} Created task
 */
export async function addTask(title) {
  const tasks = await loadTasks();

  const newTask = {
    id: getNextId(tasks),
    title,
    completed: false,
    createdAt: new Date().toISOString()
  };

  tasks.push(newTask);
  await saveTasks(tasks);

  return newTask;
}

/**
 * Lists all tasks
 * @returns {Promise<Array>} All tasks
 */
export async function listTasks() {
  return await loadTasks();
}

/**
 * Marks a task as complete
 * @param {number} id - Task ID
 * @returns {Promise<Object|null>} Updated task or null if not found
 */
export async function completeTask(id) {
  const tasks = await loadTasks();
  const task = tasks.find(t => t.id === id);

  if (!task) return null;

  task.completed = true;
  task.completedAt = new Date().toISOString();

  await saveTasks(tasks);
  return task;
}

/**
 * Deletes a task
 * @param {number} id - Task ID
 * @returns {Promise<boolean>} True if deleted
 */
export async function deleteTask(id) {
  const tasks = await loadTasks();
  const index = tasks.findIndex(t => t.id === id);

  if (index === -1) return false;

  tasks.splice(index, 1);
  await saveTasks(tasks);
  return true;
}
```

### task.js (Entry Point)

```javascript
// task.js
// CLI entry point - we'll expand this in Lesson 05.3

import { addTask, listTasks, completeTask } from './src/tasks.js';

console.log('Task Tracker - Ready');
console.log('Commands: add, list, complete, delete');

// We'll add CLI parsing in the next lessons
```

---

## Step 7: Test the Setup

```bash
# Run the entry point
node task.js
# Output: Task Tracker - Ready

# Check that files are created correctly
ls -la src/
# Should show tasks.js and storage.js
```

---

## Step 8: Commit Your Progress

```bash
# Stage all files
git add .

# Check what will be committed
git status

# Commit
git commit -m "feat: Set up project structure with task and storage modules"

# View commit history
git log --oneline
```

---

## What We Built

```
task-tracker/
├── .gitignore           ✓ Created
├── package.json         ✓ Configured with ESM
├── task.js              ✓ Entry point (basic)
├── src/
│   ├── tasks.js         ✓ Task logic (add, list, complete, delete)
│   └── storage.js       ✓ File persistence (load, save)
└── data/
    └── (tasks.json)     Will be created when tasks are added
```

---

## The Traditional Development Problem

Notice what we **didn't do**:
- ❌ No requirements document
- ❌ No architecture decisions recorded
- ❌ No acceptance criteria
- ❌ No test plan
- ❌ No documentation

We just started coding. This is fine for a small project, but in professional development:

| What's Missing | Future Problem |
|---------------|----------------|
| Requirements | "Wait, what was this supposed to do?" |
| Architecture decisions | "Why did we use JSON instead of SQLite?" |
| Acceptance criteria | "How do we know it's done?" |
| Test plan | "Did we test edge cases?" |

**Module 06 will show how SpecWeave captures all of this automatically.**

---

## Key Takeaways

1. **Initialize Git early** — version control from day one
2. **Use package.json** — manage project metadata
3. **Separate concerns** — different files for different jobs
4. **Use ES Modules** — modern JavaScript import/export
5. **Commit frequently** — save your progress

---

## Next Lesson

Now let's implement the core logic — the heart of the application.

→ [Continue to Lesson 05.2: Core Logic](./02-core-logic)
