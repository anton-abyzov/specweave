# Lesson 1: Hands-On SpecWeave Tutorial

**Build a Complete Feature from Scratch**

> This lesson walks you through building a real feature using SpecWeave, showing every command, every file, and every decision.

---

## Prerequisites

- Node.js 20+
- Git repository initialized
- Claude Code CLI installed
- ~30 minutes of focused time

---

## The Project: Building a Task Manager API

We'll build a simple task management API with:
- Create, read, update, delete tasks
- Task priorities and due dates
- Basic authentication

This is a realistic feature that demonstrates SpecWeave's full workflow.

---

## Step 1: Initialize SpecWeave

### Terminal Commands

```bash
# Create project directory
mkdir task-manager-api && cd task-manager-api

# Initialize npm project
npm init -y

# Initialize git
git init

# Install SpecWeave globally (if not already)
npm install -g specweave

# Initialize SpecWeave in this project
specweave init .
```

### What the Init Wizard Asks

```
Welcome to SpecWeave!

? Select your git provider:
  > GitHub
    GitLab
    Azure DevOps
    None

? Would you like to connect external tools?
  > GitHub Issues (recommended)
    JIRA
    Azure DevOps Work Items
    Skip for now

? Documentation approach:
  > Incremental (build as you go) - recommended for new projects
    Comprehensive (detailed upfront)

? Default test coverage threshold: 60%

Initializing SpecWeave...
  ✓ Created .specweave/
  ✓ Created config.json
  ✓ Created increments/ directory
  ✓ Created docs/ structure
  ✓ Updated .gitignore

SpecWeave initialized successfully!

Next: Run /specweave:increment "your first feature" to start planning
```

### Verify the Structure

```bash
ls -la .specweave/
```

Output:
```
.specweave/
├── config.json          # Project configuration
├── increments/          # Your work lives here
│   └── README.md
├── docs/                # Living documentation
│   ├── public/
│   └── internal/
├── cache/               # Performance optimization
├── state/               # Hook state tracking
└── metrics/             # DORA metrics
```

---

## Step 2: Plan Your First Increment

### Create the Increment

In Claude Code, run:

```bash
/specweave:increment "Build task management API with CRUD operations and authentication"
```

### Watch the Agent Orchestration

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PLANNING INCREMENT: 0001-task-management-api
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 PM Agent analyzing requirements...

Identified scope:
  • Task CRUD operations (Create, Read, Update, Delete)
  • Task properties: title, description, priority, due date, status
  • User authentication for task ownership
  • RESTful API design

Creating user stories...
  ✓ US-001: Create Task
  ✓ US-002: View Tasks
  ✓ US-003: Update Task
  ✓ US-004: Delete Task
  ✓ US-005: User Authentication

Defining acceptance criteria...
  ✓ 15 acceptance criteria defined

→ spec.md created

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏗️ Architect Agent designing solution...

Technical decisions:
  • Framework: Express.js (lightweight, well-documented)
  • Database: SQLite (simple, no setup required)
  • Auth: JWT tokens (stateless, scalable)
  • Validation: Zod (TypeScript-first validation)

Component design:
  ✓ TaskController - HTTP handlers
  ✓ TaskService - Business logic
  ✓ TaskRepository - Data access
  ✓ AuthMiddleware - JWT validation
  ✓ Database schema

→ plan.md created

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👨‍💻 Tech Lead creating tasks...

Breaking down into tasks:
  ✓ T-001: Project setup and dependencies (P1)
  ✓ T-002: Database schema and migrations (P1)
  ✓ T-003: Task model and repository (P1)
  ✓ T-004: Task service layer (P1)
  ✓ T-005: Task controller (CRUD endpoints) (P1)
  ✓ T-006: Authentication middleware (P1)
  ✓ T-007: Input validation (P2)
  ✓ T-008: Error handling (P2)
  ✓ T-009: Integration tests (P1)
  ✓ T-010: API documentation (P2)

Embedding test plans...
  ✓ 32 test cases defined
  ✓ BDD scenarios for each task

→ tasks.md created

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INCREMENT READY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Increment: 0001-task-management-api
Location: .specweave/increments/0001-task-management-api/
Tasks: 10 (estimated 16 hours)
Priority: 6 P1 tasks, 4 P2 tasks

Next: Review the generated files, then run /specweave:do to start
```

---

## Step 3: Review Generated Files

### Examine spec.md

```bash
cat .specweave/increments/0001-task-management-api/spec.md
```

**Generated spec.md:**

```markdown
---
increment: 0001-task-management-api
status: planning
created: 2025-11-25
---

# Task Management API

## Summary

Build a RESTful API for task management with full CRUD operations,
user authentication, and task organization features. The API will
allow users to create, view, update, and delete their tasks with
support for priorities and due dates.

## User Stories

### US-001: Create Task
**As a** authenticated user,
**I want** to create a new task with title, description, priority, and due date,
**So that** I can track my work items.

#### Acceptance Criteria
- **AC-US1-01**: POST /api/tasks creates a new task and returns 201
- **AC-US1-02**: Task requires title (1-200 characters)
- **AC-US1-03**: Priority accepts values: low, medium, high, urgent
- **AC-US1-04**: Due date is optional, must be future date if provided
- **AC-US1-05**: Task is automatically associated with authenticated user

### US-002: View Tasks
**As a** authenticated user,
**I want** to view my tasks with filtering and sorting options,
**So that** I can find and organize my work.

#### Acceptance Criteria
- **AC-US2-01**: GET /api/tasks returns user's tasks (not others')
- **AC-US2-02**: Support filtering by status (pending, in-progress, completed)
- **AC-US2-03**: Support filtering by priority
- **AC-US2-04**: Support sorting by due date, priority, or created date
- **AC-US2-05**: Pagination with limit and offset parameters

### US-003: Update Task
**As a** authenticated user,
**I want** to update my existing tasks,
**So that** I can modify details as requirements change.

#### Acceptance Criteria
- **AC-US3-01**: PUT /api/tasks/:id updates task and returns 200
- **AC-US3-02**: Can only update own tasks (403 for others' tasks)
- **AC-US3-03**: Partial updates supported (only changed fields required)
- **AC-US3-04**: Validation rules same as creation

### US-004: Delete Task
**As a** authenticated user,
**I want** to delete tasks I no longer need,
**So that** I can keep my task list clean.

#### Acceptance Criteria
- **AC-US4-01**: DELETE /api/tasks/:id removes task and returns 204
- **AC-US4-02**: Can only delete own tasks (403 for others' tasks)
- **AC-US4-03**: Deleted tasks are permanently removed (no soft delete)

### US-005: User Authentication
**As a** user,
**I want** to authenticate with email and password,
**So that** my tasks are secure and private.

#### Acceptance Criteria
- **AC-US5-01**: POST /api/auth/register creates new user account
- **AC-US5-02**: POST /api/auth/login returns JWT token
- **AC-US5-03**: JWT token expires after 24 hours
- **AC-US5-04**: All /api/tasks endpoints require valid JWT

## Non-Functional Requirements

- **NFR-001**: API response time < 200ms for single task operations
- **NFR-002**: Support 100 concurrent users
- **NFR-003**: Passwords hashed with bcrypt (cost factor 10)
- **NFR-004**: Input sanitization to prevent SQL injection
```

### Examine plan.md

```bash
cat .specweave/increments/0001-task-management-api/plan.md
```

**Generated plan.md:**

```markdown
# Implementation Plan: Task Management API

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Request                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express Router                           │
│                  /api/tasks, /api/auth                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Auth Middleware                           │
│              (JWT validation, user context)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Controllers                             │
│           TaskController    AuthController                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Services                               │
│            TaskService       AuthService                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Repositories                             │
│          TaskRepository      UserRepository                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   SQLite Database                           │
│              tasks, users tables                            │
└─────────────────────────────────────────────────────────────┘
```

## Components

### TaskController
**Purpose**: Handle HTTP requests for task operations
**File**: `src/controllers/task-controller.ts`

**Endpoints**:
- `POST /api/tasks` - Create task
- `GET /api/tasks` - List tasks (with filters)
- `GET /api/tasks/:id` - Get single task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### TaskService
**Purpose**: Business logic for task operations
**File**: `src/services/task-service.ts`

**Responsibilities**:
- Validate business rules
- Coordinate with repository
- Handle authorization checks
- Apply filtering and sorting

### TaskRepository
**Purpose**: Data access layer for tasks
**File**: `src/repositories/task-repository.ts`

**Methods**:
- `create(task: CreateTaskDTO): Promise<Task>`
- `findById(id: string): Promise<Task | null>`
- `findByUserId(userId: string, filters: TaskFilters): Promise<Task[]>`
- `update(id: string, data: UpdateTaskDTO): Promise<Task>`
- `delete(id: string): Promise<void>`

### AuthMiddleware
**Purpose**: Validate JWT tokens and attach user to request
**File**: `src/middleware/auth-middleware.ts`

**Behavior**:
- Extract token from Authorization header
- Validate JWT signature and expiration
- Attach user object to request
- Return 401 for invalid/missing token

## Data Models

```typescript
// src/types/task.ts
interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed';
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateTaskDTO {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string; // ISO date string
}

interface UpdateTaskDTO {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'pending' | 'in-progress' | 'completed';
  dueDate?: string | null;
}

// src/types/user.ts
interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

interface AuthToken {
  accessToken: string;
  expiresIn: number;
}
```

## Database Schema

```sql
-- migrations/001_initial.sql

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  due_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
```

## Technical Decisions

### TD-001: Express.js over Fastify
**Decision**: Use Express.js as the web framework
**Rationale**:
- Most widely used, extensive ecosystem
- Team familiarity
- Abundant middleware options
**Trade-off**: Slightly slower than Fastify, but negligible for this scale

### TD-002: SQLite over PostgreSQL
**Decision**: Use SQLite for data storage
**Rationale**:
- Zero configuration required
- Perfect for development and small-scale deployment
- Easy to migrate to PostgreSQL later if needed
**Trade-off**: No concurrent write scaling, but sufficient for 100 users

### TD-003: JWT over Sessions
**Decision**: Use JWT tokens for authentication
**Rationale**:
- Stateless (no session storage needed)
- Works well with API clients
- Easy to scale horizontally
**Trade-off**: Cannot invalidate tokens before expiry

## Implementation Phases

### Phase 1: Foundation (4h)
- Project setup with TypeScript
- Database schema and migrations
- Basic Express server

### Phase 2: Core Features (6h)
- Task CRUD operations
- User authentication
- Authorization middleware

### Phase 3: Polish (4h)
- Input validation with Zod
- Error handling
- Integration tests

### Phase 4: Documentation (2h)
- API documentation
- README updates
```

### Examine tasks.md (excerpt)

```bash
head -150 .specweave/increments/0001-task-management-api/tasks.md
```

**Generated tasks.md (first few tasks):**

```markdown
# Tasks: Task Management API

## Progress Summary
- Total: 10 tasks
- Completed: 0/10 (0%)
- Estimated: 16 hours

---

### T-001: Project Setup and Dependencies (P1)

**Effort**: 1h | **AC-IDs**: (Foundation)

**Implementation**:
- [ ] Initialize TypeScript project with strict mode
- [ ] Install dependencies: express, better-sqlite3, jsonwebtoken, bcrypt, zod, uuid
- [ ] Install dev dependencies: typescript, vitest, supertest, @types/*
- [ ] Configure tsconfig.json for ES modules
- [ ] Create src/ directory structure
- [ ] Set up npm scripts (build, dev, test)

**Test Plan** (BDD):
- **Given** a fresh project directory
- **When** npm install and npm run build are executed
- **Then** project compiles without errors

**Test Cases**:
- Build: `npm run build` succeeds without errors
- TypeScript: Strict mode enabled and enforced

**Files Changed**:
- `package.json` (update)
- `tsconfig.json` (new)
- `src/index.ts` (new - entry point)

**Status**: [ ] pending

---

### T-002: Database Schema and Migrations (P1)

**Effort**: 1.5h | **AC-IDs**: (Foundation for all US)

**Implementation**:
- [ ] Create migrations/ directory
- [ ] Write 001_initial.sql with users and tasks tables
- [ ] Create src/db/database.ts for SQLite connection
- [ ] Implement migration runner
- [ ] Add indexes for common queries

**Test Plan** (BDD):
- **Given** an empty database
- **When** migrations are run
- **Then** users and tasks tables exist with correct schema

**Test Cases**:
- Unit (`database.test.ts`):
  - runMigrations_emptyDb_createsTablesSuccessfully
  - getConnection_validPath_returnsDatabase
  - Coverage: >90%

**Files Changed**:
- `migrations/001_initial.sql` (new)
- `src/db/database.ts` (new)
- `src/db/migrations.ts` (new)
- `tests/unit/db/database.test.ts` (new)

**Status**: [ ] pending

---

### T-003: Task Model and Repository (P1)

**Effort**: 2h | **AC-IDs**: AC-US1-01, AC-US2-01, AC-US3-01, AC-US4-01

**Implementation**:
- [ ] Create src/types/task.ts with Task, CreateTaskDTO, UpdateTaskDTO
- [ ] Create src/repositories/task-repository.ts
- [ ] Implement create() method with UUID generation
- [ ] Implement findById() method
- [ ] Implement findByUserId() with filtering support
- [ ] Implement update() method with partial updates
- [ ] Implement delete() method
- [ ] Add input validation at repository level

**Test Plan** (BDD):
- **Given** a task repository connected to test database
- **When** create() called with valid task data
- **Then** task is persisted and returned with generated ID

- **Given** tasks exist for user "user-123"
- **When** findByUserId("user-123", {status: "pending"}) called
- **Then** only pending tasks for that user are returned

**Test Cases**:
- Unit (`task-repository.test.ts`):
  - create_validTask_returnsTaskWithId
  - create_missingTitle_throwsValidationError
  - findById_existingTask_returnsTask
  - findById_nonexistent_returnsNull
  - findByUserId_withFilters_returnsFilteredTasks
  - findByUserId_differentUser_returnsEmpty
  - update_partialData_updatesOnlyProvidedFields
  - delete_existingTask_removesFromDatabase
  - Coverage: >95%

**Files Changed**:
- `src/types/task.ts` (new)
- `src/repositories/task-repository.ts` (new)
- `tests/unit/repositories/task-repository.test.ts` (new)

**Status**: [ ] pending

---

### T-004: Task Service Layer (P1)

**Effort**: 2h | **AC-IDs**: AC-US1-05, AC-US2-01, AC-US3-02, AC-US4-02

**Implementation**:
- [ ] Create src/services/task-service.ts
- [ ] Implement createTask() with user association
- [ ] Implement getTasks() with authorization check
- [ ] Implement getTaskById() with ownership verification
- [ ] Implement updateTask() with ownership check
- [ ] Implement deleteTask() with ownership check
- [ ] Add business rule validations

**Test Plan** (BDD):
- **Given** authenticated user "user-123"
- **When** createTask() called
- **Then** task is created with userId set to "user-123"

- **Given** task owned by "user-456"
- **When** user "user-123" tries to update it
- **Then** ForbiddenError is thrown

**Test Cases**:
- Unit (`task-service.test.ts`):
  - createTask_validData_associatesWithUser
  - getTasks_authenticatedUser_returnsOnlyOwnTasks
  - getTaskById_ownTask_returnsTask
  - getTaskById_othersTask_throwsForbidden
  - updateTask_ownTask_updatesSuccessfully
  - updateTask_othersTask_throwsForbidden
  - deleteTask_ownTask_deletesSuccessfully
  - deleteTask_othersTask_throwsForbidden
  - Coverage: >95%

**Files Changed**:
- `src/services/task-service.ts` (new)
- `src/errors/forbidden-error.ts` (new)
- `tests/unit/services/task-service.test.ts` (new)

**Status**: [ ] pending
```

---

## Step 4: Execute the Work

### Start Implementation

```bash
/specweave:do
```

### Watch the Implementation

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXECUTING: 0001-task-management-api
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Loading increment context...
  ✓ spec.md loaded (5 user stories, 15 ACs)
  ✓ plan.md loaded (architecture understood)
  ✓ tasks.md loaded (10 tasks)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔨 T-001: Project Setup and Dependencies (P1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Creating TypeScript configuration...
  → Writing tsconfig.json

Installing dependencies...
  → npm install express better-sqlite3 jsonwebtoken bcrypt zod uuid
  → npm install -D typescript vitest supertest @types/express @types/node

Creating project structure...
  → Creating src/index.ts
  → Creating src/app.ts

Setting up npm scripts...
  → Updating package.json

Verifying setup...
  → Running npm run build
  ✓ Build successful

Updating tasks.md...
  → T-001 marked complete

✅ T-001 Complete (12 minutes)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔨 T-002: Database Schema and Migrations (P1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Creating migrations directory...
  → mkdir migrations

Writing initial migration...
  → Creating migrations/001_initial.sql
  → Users table with id, email, password_hash, created_at
  → Tasks table with all fields and foreign key
  → Creating indexes

Implementing database module...
  → Creating src/db/database.ts
  → Creating src/db/migrations.ts

Writing tests...
  → Creating tests/unit/db/database.test.ts

Running tests...
  → vitest run tests/unit/db/
  ✓ 4/4 tests passing

Updating tasks.md...
  → T-002 marked complete

✅ T-002 Complete (18 minutes)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Continues for each task...]
```

### Monitor Progress Anytime

```bash
/specweave:progress
```

Output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INCREMENT PROGRESS: 0001-task-management-api
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: IN-PROGRESS

Tasks:
  [x] T-001: Project setup (1h) ✓
  [x] T-002: Database schema (1.5h) ✓
  [x] T-003: Task repository (2h) ✓
  [x] T-004: Task service (2h) ✓
  [▸] T-005: Task controller (2h) ← Current
  [ ] T-006: Auth middleware (2h)
  [ ] T-007: Input validation (1.5h)
  [ ] T-008: Error handling (1.5h)
  [ ] T-009: Integration tests (2h)
  [ ] T-010: API documentation (1h)

Progress: 4/10 tasks (40%)
Time: ~6.5h / 16h estimated

Test Results:
  ✓ 28 tests passing
  Coverage: 87%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 5: Complete and Transition

### When All Tasks Done

```bash
/specweave:next
```

Output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHECKING INCREMENT: 0001-task-management-api
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 PM Validation (3 Gates):

Gate 1: Task Completion
  P1 Tasks: 6/6 complete ✅
  P2 Tasks: 4/4 complete ✅
  Status: ✅ PASS

Gate 2: Test Validation
  Unit Tests: 47/47 passing ✅
  Integration Tests: 12/12 passing ✅
  Coverage: 89% (threshold: 60%) ✅
  Status: ✅ PASS

Gate 3: Documentation
  README.md: Updated ✅
  API docs: Generated ✅
  spec.md ACs: All checked ✅
  Status: ✅ PASS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PM VALIDATION: ✅ READY TO CLOSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Auto-closing increment 0001...
  ✓ Status updated: in-progress → completed
  ✓ Completion date: 2025-11-25
  ✓ Completion report generated
  ✓ WIP slot freed (1/2 → 0/2)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 POST-CLOSURE QUALITY ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Running quality assessment...

Overall Score: 91/100 (EXCELLENT) ✓✓

Dimension Scores:
  Clarity:         95/100 ✓✓ (Well-defined ACs)
  Testability:     92/100 ✓✓ (89% coverage)
  Completeness:    90/100 ✓✓ (All features implemented)
  Feasibility:     94/100 ✓✓ (Clean architecture)
  Maintainability: 88/100 ✓  (Good separation)
  Edge Cases:      85/100 ✓  (Most covered)
  Risk Assessment: 90/100 ✓✓ (Auth properly implemented)

Risks Identified:
  • LOW: Rate limiting not implemented (3/10)
  • LOW: No refresh token mechanism (2/10)

Quality Gate: ✅ PASS

📋 Report saved: .specweave/increments/0001-task-management-api/reports/qa-post-closure.md

🎉 INCREMENT 0001 CLOSED SUCCESSFULLY!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 NEXT WORK SUGGESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No planned increments in backlog.
WIP: 0/2 slots available

Options:
1. Create new increment:
   /specweave:increment "Add rate limiting and refresh tokens"
   /specweave:increment "Add task categories and tags"

2. Review completed work:
   cat .specweave/increments/0001-task-management-api/reports/

💡 Tip: Address the LOW risks identified in QA!
```

---

## Step 6: Review What You Built

### Final Project Structure

```bash
tree -I node_modules
```

```
task-manager-api/
├── .specweave/
│   ├── increments/
│   │   └── 0001-task-management-api/
│   │       ├── spec.md
│   │       ├── plan.md
│   │       ├── tasks.md
│   │       ├── metadata.json
│   │       └── reports/
│   │           └── qa-post-closure.md
│   ├── docs/
│   │   └── public/
│   │       └── FEATURES.md (auto-updated)
│   └── metrics/
├── src/
│   ├── index.ts
│   ├── app.ts
│   ├── controllers/
│   │   ├── task-controller.ts
│   │   └── auth-controller.ts
│   ├── services/
│   │   ├── task-service.ts
│   │   └── auth-service.ts
│   ├── repositories/
│   │   ├── task-repository.ts
│   │   └── user-repository.ts
│   ├── middleware/
│   │   └── auth-middleware.ts
│   ├── db/
│   │   ├── database.ts
│   │   └── migrations.ts
│   ├── types/
│   │   ├── task.ts
│   │   └── user.ts
│   ├── errors/
│   │   └── index.ts
│   └── validation/
│       └── schemas.ts
├── tests/
│   ├── unit/
│   │   ├── repositories/
│   │   ├── services/
│   │   └── middleware/
│   └── integration/
│       └── api.test.ts
├── migrations/
│   └── 001_initial.sql
├── package.json
├── tsconfig.json
└── README.md
```

### Key Artifacts Created

1. **Permanent specs** in `.specweave/increments/0001-*/`
2. **59 tests** with 89% coverage
3. **Living docs** auto-updated
4. **Quality report** with risk assessment
5. **Complete API** ready to use

---

## Key Takeaways

1. **`/specweave:increment`** creates spec.md, plan.md, tasks.md automatically
2. **`/specweave:do`** executes tasks with tests
3. **`/specweave:next`** validates and transitions smoothly
4. **All decisions are preserved** — never lost in chat history
5. **Quality gates enforce standards** before closure

---

## Practice Exercise

Try building your own feature:

```bash
# Create a new project
mkdir my-api && cd my-api && npm init -y && git init

# Initialize SpecWeave
specweave init .

# Plan your feature (pick one):
/specweave:increment "Build a blog API with posts and comments"
/specweave:increment "Build a bookmark manager with tags"
/specweave:increment "Build a simple expense tracker"

# Execute it
/specweave:do

# Complete it
/specweave:next
```

**Challenge**: Can you get a Quality Score above 85?

---

**Next Lesson**: [Deep Dive into the Three-File Structure →](./02-three-file-deep-dive.md)
