---
sidebar_position: 3
title: "05.3 CLI Interface"
description: "Build the command-line interface for your task tracker"
---

# Lesson 05.3: CLI Interface

**Duration**: 45 minutes | **Difficulty**: Beginner

---

## Learning Objectives

By the end of this lesson, you will:
- Parse command-line arguments
- Build a user-friendly CLI
- Display formatted output
- Handle errors gracefully

---

## Understanding Command-Line Arguments

When you run a command:

```bash
node task.js add "Learn JavaScript"
#     ^         ^   ^
#     |         |   └── argument: "Learn JavaScript"
#     |         └────── command: "add"
#     └──────────────── script: "task.js"
```

Node.js provides these in `process.argv`:

```javascript
// node task.js add "Learn JavaScript"
console.log(process.argv);
// [
//   '/usr/bin/node',           // Node executable
//   '/path/to/task.js',        // Script path
//   'add',                     // First argument
//   'Learn JavaScript'         // Second argument
// ]
```

---

## Building the CLI

Replace the contents of `task.js`:

```javascript
// task.js
// CLI entry point for Task Tracker

import {
  addTask,
  listTasks,
  completeTask,
  uncompleteTask,
  deleteTask,
  updateTask,
  getStats
} from './src/tasks.js';

// Get command and arguments
const [,, command, ...args] = process.argv;

// Colors for output (ANSI escape codes)
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m'
};

/**
 * Prints success message
 */
function success(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

/**
 * Prints error message
 */
function error(message) {
  console.error(`${colors.red}✗${colors.reset} ${message}`);
}

/**
 * Prints info message
 */
function info(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

/**
 * Shows usage help
 */
function showHelp() {
  console.log(`
${colors.blue}Task Tracker${colors.reset} - A simple CLI task manager

${colors.yellow}Usage:${colors.reset}
  node task.js <command> [arguments]

${colors.yellow}Commands:${colors.reset}
  add <title>        Add a new task
  list               List all tasks
  list --pending     List pending tasks only
  list --completed   List completed tasks only
  complete <id>      Mark task as complete
  uncomplete <id>    Mark task as incomplete
  update <id> <title> Update task title
  delete <id>        Delete a task
  stats              Show task statistics
  help               Show this help message

${colors.yellow}Examples:${colors.reset}
  node task.js add "Learn JavaScript"
  node task.js list
  node task.js complete 1
  node task.js delete 2
`);
}

/**
 * Formats a task for display
 */
function formatTask(task) {
  const checkbox = task.completed
    ? `${colors.green}[x]${colors.reset}`
    : `${colors.dim}[ ]${colors.reset}`;

  const title = task.completed
    ? `${colors.dim}${task.title}${colors.reset}`
    : task.title;

  return `  ${checkbox} ${task.id}: ${title}`;
}

/**
 * Main CLI handler
 */
async function main() {
  try {
    switch (command) {
      case 'add': {
        const title = args.join(' ');
        if (!title) {
          error('Please provide a task title');
          console.log('Usage: node task.js add "Task title"');
          process.exit(1);
        }
        const task = await addTask(title);
        success(`Added task: ${task.title} (id: ${task.id})`);
        break;
      }

      case 'list': {
        const filter = args[0];
        let options = {};

        if (filter === '--pending') {
          options.completed = false;
        } else if (filter === '--completed') {
          options.completed = true;
        }

        const tasks = await listTasks(options);

        if (tasks.length === 0) {
          info('No tasks found');
        } else {
          console.log('\nTasks:');
          tasks.forEach(task => console.log(formatTask(task)));
          console.log();
        }
        break;
      }

      case 'complete': {
        const id = parseInt(args[0], 10);
        if (isNaN(id)) {
          error('Please provide a valid task ID');
          process.exit(1);
        }
        const task = await completeTask(id);
        if (task) {
          success(`Completed: ${task.title}`);
        } else {
          error(`Task ${id} not found`);
          process.exit(1);
        }
        break;
      }

      case 'uncomplete': {
        const id = parseInt(args[0], 10);
        if (isNaN(id)) {
          error('Please provide a valid task ID');
          process.exit(1);
        }
        const task = await uncompleteTask(id);
        if (task) {
          success(`Uncompleted: ${task.title}`);
        } else {
          error(`Task ${id} not found`);
          process.exit(1);
        }
        break;
      }

      case 'update': {
        const id = parseInt(args[0], 10);
        const newTitle = args.slice(1).join(' ');
        if (isNaN(id) || !newTitle) {
          error('Usage: node task.js update <id> <new title>');
          process.exit(1);
        }
        const task = await updateTask(id, newTitle);
        if (task) {
          success(`Updated task ${id}: ${task.title}`);
        } else {
          error(`Task ${id} not found`);
          process.exit(1);
        }
        break;
      }

      case 'delete': {
        const id = parseInt(args[0], 10);
        if (isNaN(id)) {
          error('Please provide a valid task ID');
          process.exit(1);
        }
        const deleted = await deleteTask(id);
        if (deleted) {
          success(`Deleted task ${id}`);
        } else {
          error(`Task ${id} not found`);
          process.exit(1);
        }
        break;
      }

      case 'stats': {
        const stats = await getStats();
        console.log(`
${colors.blue}Task Statistics${colors.reset}
─────────────────
Total:     ${stats.total}
Completed: ${colors.green}${stats.completed}${colors.reset}
Pending:   ${colors.yellow}${stats.pending}${colors.reset}
`);
        break;
      }

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      case undefined:
        showHelp();
        break;

      default:
        error(`Unknown command: ${command}`);
        console.log('Run "node task.js help" for usage information');
        process.exit(1);
    }
  } catch (err) {
    error(err.message);
    process.exit(1);
  }
}

// Run the CLI
main();
```

---

## Testing the CLI

Let's test all commands:

```bash
# Show help
node task.js help

# Add tasks
node task.js add "Learn JavaScript"
node task.js add "Build first project"
node task.js add "Learn SpecWeave"

# List tasks
node task.js list

# Complete a task
node task.js complete 1

# List again
node task.js list

# List only pending
node task.js list --pending

# List only completed
node task.js list --completed

# Update a task
node task.js update 2 "Build task tracker project"

# Show stats
node task.js stats

# Delete a task
node task.js delete 3

# Final list
node task.js list
```

---

## Improving User Experience

### 1. Add npm Script

In `package.json`:

```json
{
  "scripts": {
    "task": "node task.js"
  }
}
```

Now you can run:

```bash
npm run task add "New task"
npm run task list
```

### 2. Create Alias (Optional)

```bash
# Add to ~/.bashrc or ~/.zshrc
alias task='node /path/to/task-tracker/task.js'

# Reload shell
source ~/.bashrc

# Now you can use
task add "Even easier!"
task list
```

---

## Final Project Structure

```
task-tracker/
├── package.json         # Project configuration
├── .gitignore           # Git ignore rules
├── task.js              # CLI entry point
├── src/
│   ├── tasks.js         # Task management logic
│   └── storage.js       # File persistence
└── data/
    └── tasks.json       # Task data (auto-created)
```

---

## Project Complete!

You've built a fully functional task tracker CLI:

✅ Add tasks with validation
✅ List tasks with filters
✅ Complete/uncomplete tasks
✅ Update task titles
✅ Delete tasks
✅ View statistics
✅ Colorful, user-friendly output
✅ Error handling

---

## Commit Final Version

```bash
git add .
git commit -m "feat: Complete CLI interface with all commands"
```

---

## Reflection: What We Didn't Do

We built working software, but professionally, we're missing:

| What's Missing | Why It Matters |
|---------------|----------------|
| **spec.md** | No documented requirements |
| **plan.md** | No architecture decisions recorded |
| **tasks.md** | No implementation plan |
| **Acceptance criteria** | How do we verify correctness? |
| **Test coverage** | What percentage is tested? |
| **BDD scenarios** | No behavior specifications |

### The Traditional Development Problem

```
"How do I know it's done?"
"It works."
"But does it meet the requirements?"
"What requirements?"
"The ones we discussed."
"I don't remember those."
```

This is the problem SpecWeave solves.

---

## Key Takeaways

1. **process.argv provides CLI arguments** — parse them to build commands
2. **Clear output helps users** — colors, icons, formatting
3. **Error codes matter** — process.exit(1) for errors, 0 for success
4. **Help text is essential** — users need to know how to use your tool
5. **Working code != Professional code** — we need specs, tests, docs

---

## Module 05 Complete!

Congratulations! You've built your first complete project:
- ✅ Project setup with npm and Git
- ✅ Core logic with validation
- ✅ Professional CLI interface

---

## Next Module

Now it's time to see how SpecWeave transforms this entire process.

→ [Continue to Module 06: Introduction to SpecWeave](../06-specweave-intro/)
