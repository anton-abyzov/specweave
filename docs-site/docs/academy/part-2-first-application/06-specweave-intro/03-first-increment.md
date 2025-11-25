---
sidebar_position: 3
title: "06.3 Your First Increment"
description: "Hands-on: Build a feature using SpecWeave"
---

# Lesson 06.3: Your First Increment

**Duration**: 60 minutes | **Difficulty**: Beginner

---

## Learning Objectives

By the end of this lesson, you will:
- Initialize SpecWeave in a project
- Create your first increment
- Review generated specifications
- Execute the build phase
- Complete and validate the increment

---

## Setup: Initialize SpecWeave

First, let's set up SpecWeave in a new project:

```bash
# Create a new project
mkdir specweave-demo
cd specweave-demo

# Initialize Git
git init

# Initialize Node.js
npm init -y

# Initialize SpecWeave
specweave init .
```

You'll see:

```
Initializing SpecWeave...

✓ Created .specweave/config.json
✓ Created .specweave/increments/
✓ Created .specweave/docs/
✓ Added .specweave to .gitignore exceptions

SpecWeave initialized successfully!

Next steps:
  1. Create an increment: /specweave:increment "Your feature"
  2. Execute tasks: /specweave:do
  3. Complete: /specweave:done <id>
```

---

## Step 1: Create the Increment

Let's rebuild our task tracker, but this time with SpecWeave:

```bash
/specweave:increment "Task Tracker CLI - a command-line tool to add, list, complete, and delete tasks with JSON file storage"
```

Watch the AI agents work:

```
Creating increment...

🎯 Analyzing feature request...

📋 PM Agent (Product Manager)
   Analyzing requirements...
   ✓ Identified 4 user capabilities
   ✓ Created 4 user stories
   ✓ Defined 14 acceptance criteria

🏗️ Architect Agent (Software Architect)
   Designing architecture...
   ✓ Created ADR-001: JSON file storage
   ✓ Defined component structure
   ✓ Documented error handling approach

📝 Tech Lead Agent (Technical Lead)
   Planning implementation...
   ✓ Created 12 tasks
   ✓ Mapped task dependencies
   ✓ Wrote BDD test scenarios

═══════════════════════════════════════════════════
  Increment 0001-task-tracker-cli created
═══════════════════════════════════════════════════

Review your specifications:
  spec.md:  .specweave/increments/0001-task-tracker-cli/spec.md
  plan.md:  .specweave/increments/0001-task-tracker-cli/plan.md
  tasks.md: .specweave/increments/0001-task-tracker-cli/tasks.md
```

---

## Step 2: Review spec.md

Open the specification file:

```bash
cat .specweave/increments/0001-task-tracker-cli/spec.md
```

You'll see something like:

```markdown
---
increment: 0001-task-tracker-cli
created: 2024-01-15T10:30:00.000Z
status: planning
---

# Task Tracker CLI

## Feature Overview

A command-line interface for personal task management with persistent
storage, allowing users to manage their daily tasks efficiently.

## User Stories

### US-001: Add Task
**As a** user
**I want to** add a new task with a description
**So that** I can track work I need to complete

#### Acceptance Criteria
- [ ] **AC-US1-01**: Task can be added with a title
- [ ] **AC-US1-02**: Task receives auto-generated unique ID
- [ ] **AC-US1-03**: Task is persisted to storage
- [ ] **AC-US1-04**: Confirmation message shows task title and ID

### US-002: List Tasks
**As a** user
**I want to** view all my tasks
**So that** I can see what needs to be done

#### Acceptance Criteria
- [ ] **AC-US2-01**: All tasks displayed with ID, title, status
- [ ] **AC-US2-02**: Completed tasks visually distinguished
- [ ] **AC-US2-03**: Empty list shows helpful message

### US-003: Complete Task
**As a** user
**I want to** mark a task as complete
**So that** I can track my progress

#### Acceptance Criteria
- [ ] **AC-US3-01**: Task can be marked complete by ID
- [ ] **AC-US3-02**: Completion timestamp recorded
- [ ] **AC-US3-03**: Non-existent ID shows error message

### US-004: Delete Task
**As a** user
**I want to** remove a task
**So that** I can clean up completed or cancelled items

#### Acceptance Criteria
- [ ] **AC-US4-01**: Task can be deleted by ID
- [ ] **AC-US4-02**: Deletion is permanent
- [ ] **AC-US4-03**: Non-existent ID shows error message
```

**Notice**: Every requirement is documented with testable acceptance criteria!

---

## Step 3: Review plan.md

```bash
cat .specweave/increments/0001-task-tracker-cli/plan.md
```

```markdown
---
increment: 0001-task-tracker-cli
---

# Architecture Plan

## Component Overview

```
┌─────────────────────────────────────────┐
│                 CLI Layer               │
│              (task.js)                  │
│    Parses commands, displays output     │
└────────────────────┬────────────────────┘
                     │
┌────────────────────▼────────────────────┐
│            Task Manager                 │
│           (src/tasks.js)                │
│   Business logic, validation            │
└────────────────────┬────────────────────┘
                     │
┌────────────────────▼────────────────────┐
│           Storage Layer                 │
│          (src/storage.js)               │
│    File I/O, JSON serialization         │
└─────────────────────────────────────────┘
```

## Architecture Decisions

### ADR-001: JSON File Storage

**Status**: Accepted

**Context**:
We need persistent storage for tasks that survives application restarts.

**Options Considered**:
1. SQLite - Structured, querying, overhead
2. JSON file - Simple, no dependencies, human-readable
3. In-memory - Fast, no persistence

**Decision**:
JSON file storage in `./data/tasks.json`

**Rationale**:
- No external dependencies
- Human-readable for debugging
- Sufficient for CLI task management
- Easy backup (copy file)

**Trade-offs**:
- Not suitable for large datasets (>10k tasks)
- No concurrent write safety (acceptable for single-user CLI)

### ADR-002: Error Handling Strategy

**Status**: Accepted

**Decision**:
All errors throw custom Error objects with descriptive messages.
CLI layer catches errors and displays user-friendly messages.

**Implementation**:
- Validation errors: "Task title cannot be empty"
- Not found errors: "Task 123 not found"
- Storage errors: "Could not save tasks: [reason]"
```

**Notice**: Every technical decision is documented with rationale!

---

## Step 4: Review tasks.md

```bash
cat .specweave/increments/0001-task-tracker-cli/tasks.md
```

```markdown
---
increment: 0001-task-tracker-cli
---

# Implementation Tasks

## T-001: Project Setup
**User Story**: All
**Status**: [ ] pending
**Dependencies**: None

### Implementation Notes
- Initialize npm project with ESM support
- Create directory structure: src/, data/
- Set up package.json scripts

### Test Plan
- Verify package.json exists and is valid
- Verify directory structure created

---

## T-002: Storage Module
**User Story**: US-001, US-002, US-003, US-004
**Satisfies ACs**: None directly (infrastructure)
**Status**: [ ] pending
**Dependencies**: T-001

### Implementation Notes
- Create src/storage.js
- Implement loadTasks(): Promise<Task[]>
- Implement saveTasks(tasks): Promise<void>
- Handle file-not-exists gracefully

### Test Plan (BDD)
```gherkin
Scenario: Load tasks from empty file
  Given no tasks.json exists
  When loadTasks is called
  Then an empty array is returned

Scenario: Save and load tasks
  Given tasks array with 2 items
  When saveTasks is called
  And loadTasks is called
  Then the same 2 tasks are returned
```

---

## T-003: Task Manager - Add
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [ ] pending
**Dependencies**: T-002

### Implementation Notes
- Create addTask(title) function
- Generate unique ID (max existing + 1)
- Validate title is non-empty
- Save to storage

### Test Plan (BDD)
```gherkin
Scenario: Add valid task
  Given empty task list
  When addTask("Learn SpecWeave") is called
  Then task with id 1 and title "Learn SpecWeave" exists

Scenario: Add task with empty title
  When addTask("") is called
  Then error "Task title cannot be empty" is thrown
```

[... more tasks ...]
```

**Notice**: Every task has BDD test scenarios defined before implementation!

---

## Step 5: Execute the Build

Now, implement the plan:

```bash
/specweave:do
```

Watch the implementation happen:

```
Loading increment 0001-task-tracker-cli...

📋 Tasks: 0/12 complete

▶ T-001: Project Setup
  Creating package.json...
  Creating directory structure...
  ✓ T-001 complete

▶ T-002: Storage Module
  Creating src/storage.js...
  Implementing loadTasks...
  Implementing saveTasks...
  ✓ T-002 complete

▶ T-003: Task Manager - Add
  Creating src/tasks.js...
  Implementing addTask with validation...
  Writing tests...
  ✓ T-003 complete

[... continues for all tasks ...]

════════════════════════════════════════
  Implementation Progress: 12/12 complete
════════════════════════════════════════
```

---

## Step 6: Verify the Work

Check what was created:

```bash
# List files
ls -la
ls -la src/
ls -la data/

# Test the CLI
node task.js add "My first SpecWeave task"
node task.js list
node task.js complete 1
node task.js list
```

---

## Step 7: Complete the Increment

Validate and finalize:

```bash
/specweave:done 0001
```

```
Validating increment 0001-task-tracker-cli...

📋 Task Completion
   ✓ 12/12 tasks complete

✅ Acceptance Criteria
   ✓ AC-US1-01: Task can be added with title (T-003)
   ✓ AC-US1-02: Task receives auto-generated ID (T-003)
   ✓ AC-US1-03: Task is persisted to storage (T-003)
   ✓ AC-US1-04: Confirmation shows title and ID (T-007)
   ✓ AC-US2-01: All tasks displayed (T-004, T-007)
   ✓ AC-US2-02: Completed tasks distinguished (T-007)
   ✓ AC-US2-03: Empty list shows message (T-007)
   ✓ AC-US3-01: Task marked complete by ID (T-005)
   ✓ AC-US3-02: Completion timestamp recorded (T-005)
   ✓ AC-US3-03: Non-existent ID shows error (T-005)
   ✓ AC-US4-01: Task deleted by ID (T-006)
   ✓ AC-US4-02: Deletion is permanent (T-006)
   ✓ AC-US4-03: Non-existent ID shows error (T-006)
   ✓ 14/14 satisfied

🧪 Test Coverage
   ✓ src/storage.js: 92%
   ✓ src/tasks.js: 88%
   ✓ task.js: 75%
   ✓ Overall: 85% (threshold: 70%)

🔒 Code Quality
   ✓ No linting errors
   ✓ No security vulnerabilities

════════════════════════════════════════════════════
  INCREMENT 0001-task-tracker-cli COMPLETE
════════════════════════════════════════════════════

📄 Completion report saved:
   .specweave/increments/0001-task-tracker-cli/completion-report.md

📊 Summary:
   - 4 user stories implemented
   - 14 acceptance criteria satisfied
   - 85% test coverage
   - 0 issues
```

---

## Step 8: Commit Everything

```bash
git add .
git commit -m "feat: Task Tracker CLI via SpecWeave increment 0001

Implements:
- US-001: Add Task
- US-002: List Tasks
- US-003: Complete Task
- US-004: Delete Task

14/14 acceptance criteria satisfied
85% test coverage

Increment: .specweave/increments/0001-task-tracker-cli/"
```

---

## Compare: Before and After

### Traditional Development (Module 05)

```
Time: 2-3 hours
Output: Working code
Documentation: None
Tests: Manual testing only
Traceability: None
Future maintainer: "Good luck!"
```

### SpecWeave Development (This Module)

```
Time: 1-2 hours (specs accelerate implementation!)
Output: Working code + full documentation
Documentation: spec.md, plan.md, tasks.md
Tests: BDD scenarios + automated tests
Traceability: Every line traces to AC
Future maintainer: "Everything is documented!"
```

---

## Key Takeaways

1. **Initialize once** — `specweave init .` sets up the project
2. **Describe features clearly** — better descriptions → better specs
3. **Review before building** — specs guide everything
4. **Let AI implement** — with full context from specs
5. **Validate quality** — gates ensure completeness

---

## Next Lesson

Now let's dive deeper into understanding the artifacts SpecWeave creates.

→ [Continue to Lesson 06.4: Understanding the Artifacts](./04-artifacts)
