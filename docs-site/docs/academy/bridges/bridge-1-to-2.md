---
sidebar_position: 2
title: "Part 1 → Part 2"
description: "From concepts to code"
---

# Bridge: Foundations → First Application

**You've learned the concepts. Now let's build something.**

---

## What You Mastered in Part 1

| Skill | How It Helps |
|-------|--------------|
| Terminal basics | Navigate, run commands |
| Git fundamentals | Save and share code |
| Engineering principles | Think like a developer |

---

## What's Coming in Part 2

```
Part 1: "Here's how developers think"
    ↓
Part 2: "Here's how developers build"
```

You'll create a real CLI application from scratch.

---

## Connection Points

### Terminal → Node.js Runtime

In Part 1, you learned to run commands:
```bash
git commit -m "message"
```

In Part 2, you'll create commands others can run:
```bash
node task.js add "Buy groceries"
```

**Same terminal, now you're the creator.**

### Git → Project Management

In Part 1, you tracked changes:
```bash
git add .
git commit -m "Add feature"
```

In Part 2, you'll use Git to build incrementally:
```bash
# Commit 1: Project setup
# Commit 2: Add task function
# Commit 3: List tasks
# Commit 4: Complete tasks
```

**Same Git, now with purpose.**

### Principles → Practice

| Part 1 Principle | Part 2 Practice |
|------------------|-----------------|
| Separation of concerns | Different files for different jobs |
| Don't repeat yourself | Reusable functions |
| Single responsibility | Each function does one thing |

---

## Self-Assessment

Before Part 2, you should be comfortable with:

- [ ] Opening terminal and navigating directories
- [ ] Running `git init`, `add`, `commit`, `push`
- [ ] Understanding what a repository is
- [ ] Knowing why version control matters
- [ ] Explaining what "separation of concerns" means

**Unsure about any of these?** Go back to Part 1.

---

## Bridge Exercise

**Before starting Part 2, try this:**

```bash
# 1. Create a new directory
mkdir bridge-test
cd bridge-test

# 2. Initialize Git
git init

# 3. Create a file
echo "Hello from Part 1!" > readme.txt

# 4. Commit it
git add readme.txt
git commit -m "My bridge exercise"

# 5. Show the log
git log --oneline
```

If this felt natural, you're ready for Part 2.

---

## What Changes in Part 2

| Part 1 | Part 2 |
|--------|--------|
| Reading about code | Writing code |
| Understanding concepts | Applying concepts |
| Following examples | Creating from scratch |
| Passive learning | Active building |

---

## Preview: Your First Application

In Part 2, you'll build a **Task Tracker CLI**:

```bash
# What you'll create:
node task.js add "Buy groceries"      # Add task
node task.js list                     # Show all tasks
node task.js complete 1               # Mark complete
node task.js delete 1                 # Remove task
```

By the end, you'll have a working application that:
- Saves tasks to a file
- Handles user commands
- Validates input
- Reports errors gracefully

---

## Ready?

→ [Start Part 2: First Application](/docs/academy/part-2-first-application/)
