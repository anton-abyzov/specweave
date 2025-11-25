---
sidebar_position: 1
title: "Module 05: Your First Project"
description: "Build a complete project from scratch - then see how SpecWeave transforms the process"
---

# Module 05: Your First Project

**Duration**: 2-3 hours | **Difficulty**: Beginner

In this module, you'll build a complete project the traditional way. This sets the stage for Module 06, where you'll see how SpecWeave transforms the development process.

---

## What You'll Build

A **Task Tracker CLI** — a command-line application that:
- Adds tasks
- Lists tasks
- Marks tasks complete
- Saves tasks to a file

This is a simplified version of what SpecWeave tracks internally!

---

## What You'll Learn

- Project setup and structure
- Reading/writing files with Node.js
- Command-line argument parsing
- Building a complete application

---

## Why Build the Traditional Way First?

Before learning SpecWeave, you need to experience:

| Traditional Development | Pain Points |
|------------------------|-------------|
| Start coding immediately | No clear requirements |
| Figure out architecture as you go | Decisions not documented |
| Test when you remember | Coverage unknown |
| Document at the end (maybe) | Always outdated |

Module 06 will show how SpecWeave solves these problems.

---

## Module Lessons

| Lesson | Topic | Duration |
|--------|-------|----------|
| [05.1 Project Setup](./01-project-setup) | Create and structure the project | 45 min |
| [05.2 Core Logic](./02-core-logic) | Implement task management | 60 min |
| [05.3 CLI Interface](./03-cli-interface) | Build the command-line interface | 45 min |

---

## Prerequisites

Before starting this module:
- ✅ Completed Module 04 (JavaScript Basics)
- ✅ Node.js installed
- ✅ Comfortable with terminal commands

---

## Project Preview

```bash
# What you'll build
$ node task.js add "Learn JavaScript"
✓ Added task: Learn JavaScript (id: 1)

$ node task.js add "Build first project"
✓ Added task: Build first project (id: 2)

$ node task.js list
Tasks:
  [ ] 1: Learn JavaScript
  [ ] 2: Build first project

$ node task.js complete 1
✓ Completed: Learn JavaScript

$ node task.js list
Tasks:
  [x] 1: Learn JavaScript
  [ ] 2: Build first project
```

---

## Let's Begin

Ready to build your first complete project?

→ [Start Lesson 05.1: Project Setup](./01-project-setup)
