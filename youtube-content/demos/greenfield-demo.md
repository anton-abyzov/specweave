# Greenfield Demo: Building TaskMaster from Scratch

**Demo Duration**: ~30 minutes
**Project**: TaskMaster - A collaborative task management application

## Overview

This demo shows the complete SpecWeave workflow for a new project:
1. Project setup
2. Specification creation
3. Feature planning
4. Implementation
5. Testing
6. Documentation auto-update

## Prerequisites

- Node.js 18+ installed
- SpecWeave installed globally: `npm install -g specweave`
- Claude Code extension active
- Terminal ready

## Part 1: Project Setup (5 min)

### Step 1.1: Install SpecWeave

```bash
# Install globally
npm install -g specweave

# Verify installation
specweave --version
# Should output: specweave v1.0.0
```

### Step 1.2: Create New Project

```bash
# Create project directory
mkdir taskmaster
cd taskmaster

# Initialize SpecWeave project
specweave init

# Answer prompts:
# Project name: TaskMaster
# Project type: greenfield
# Tech stack: Node.js, TypeScript, React, PostgreSQL
# Testing framework: Playwright
# Enable hooks: Yes
```

**Expected Output:**
```
✅ Created .specweave/config.yaml
✅ Created .claude/skills/ (core skills installed)
✅ Created specifications/
✅ Created .specweave/docs/
✅ Created features/
✅ Created work/
✅ Created src/
✅ Created tests/
✅ Created CLAUDE.md
✅ Created README.md
✅ Created package.json

🎉 SpecWeave project initialized!

Next steps:
1. Read CLAUDE.md for development guide
2. Create your first specification
3. Plan your first feature
```

### Step 1.3: Verify Directory Structure

```bash
tree -L 2 -a
```

**Expected Structure:**
```
taskmaster/
├── .specweave/
│   └── config.yaml
├── .claude/
│   ├── commands/
│   └── skills/
│       ├── specweave-detector/
│       ├── feature-planner/
│       ├── skill-router/
│       ├── context-loader/
│       ├── spec-author/
│       ├── architect/
│       ├── developer/
│       ├── qa-engineer/
│       └── playwright-tester/
├── specifications/
│   └── overview.md
├── .specweave/docs/
│   ├── getting-started/
│   ├── guides/
│   ├── reference/
│   ├── architecture/
│   ├── decisions/
│   └── changelog/
├── features/
│   └── README.md
├── work/
│   └── backlog.md
├── src/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── CLAUDE.md
├── README.md
└── package.json
```

### Step 1.4: Configure Project

Open `.specweave/config.yaml`:

```yaml
project:
  name: TaskMaster
  type: greenfield
  tech_stack:
    backend:
      language: TypeScript
      framework: Node.js
      database: PostgreSQL
    frontend:
      language: TypeScript
      framework: React
      styling: TailwindCSS

context:
  max_tokens: 50000
  auto_load: true

hooks:
  post_task_completion:
    enabled: true
    actions:
      - update_documentation
      - update_claude_md
      - update_changelog
      - play_notification_sound  # Sound when task completes

  pre_implementation:
    enabled: true
    actions:
      - check_regression_risk
      - verify_specs_exist

  human_input_required:
    enabled: true
    actions:
      - create_notification
      - log_to_progress

testing:
  e2e_framework: playwright
  mandatory_e2e: true
  min_skill_tests: 3
```

## Part 2: Writing Specifications (7 min)

### Step 2.1: Open Claude Code

```bash
# Open in Claude Code (or your preferred editor)
code .
```

In Claude Code terminal:

### Step 2.2: Create System Overview Specification

**Prompt to Claude:**
```
Create a comprehensive specification for TaskMaster, a collaborative
task management application. It should include:

- User authentication (email/password and OAuth)
- Task CRUD operations (create, read, update, delete)
- Task assignment to team members
- Team collaboration (create teams, invite members, roles)
- Real-time updates via WebSocket
- Activity feed
- Notifications

Include:
- Purpose and goals
- Core features with acceptance criteria
- Technical requirements (performance, security, browser support)
- Modular organization (break into authentication, tasks, teams modules)
```

**Claude Response:**
```
The spec-author skill is creating specifications for TaskMaster...

✅ Created specifications/overview.md
✅ Created specifications/modules/authentication/overview.md
✅ Created specifications/modules/authentication/email-auth/spec.md
✅ Created specifications/modules/authentication/oauth/spec.md
✅ Created specifications/modules/tasks/overview.md
✅ Created specifications/modules/tasks/crud-operations/spec.md
✅ Created specifications/modules/tasks/real-time-sync/spec.md
✅ Created specifications/modules/teams/overview.md
✅ Created specifications/modules/teams/collaboration/spec.md

Specifications created! Review specifications/overview.md for the system overview.
```

### Step 2.3: Review Generated Specification

```bash
cat specifications/overview.md
```

**Expected Content (excerpt):**
```markdown
# TaskMaster System Overview

## Purpose

TaskMaster is a collaborative task management application that enables
teams to create, assign, track, and complete tasks in real-time.

## Goals

1. Simplify task management for distributed teams
2. Enable real-time collaboration
3. Provide visibility into team progress
4. Support flexible workflows

## Core Features

### F-1: User Authentication
- Email/password registration and login
- OAuth support (Google, GitHub)
- Session management with JWT
- Password reset flow
- Email verification

**Acceptance Criteria:**
- [ ] User can register with email/password
- [ ] User can log in with email/password
- [ ] User can log in with Google OAuth
- [ ] User can log in with GitHub OAuth
- [ ] User receives email verification link
- [ ] User can reset forgotten password
- [ ] Session expires after 7 days of inactivity
- [ ] User can log out

### F-2: Task Management
- Create tasks with title, description, priority, due date
- Assign tasks to team members
- Update task status (todo, in-progress, done)
- Filter and sort tasks
- Search tasks
- Delete tasks

**Acceptance Criteria:**
- [ ] User can create task with all fields
- [ ] User can assign task to team member
- [ ] User can change task status
- [ ] User can filter tasks by status, assignee, priority
- [ ] User can search tasks by title/description
- [ ] User can delete own tasks
- [ ] Admin can delete any task

### F-3: Team Collaboration
- Create teams
- Invite members via email
- Role-based permissions (owner, admin, member)
- Activity feed per team
- Member management

**Acceptance Criteria:**
- [ ] User can create team
- [ ] Owner can invite members
- [ ] Invited users receive email invitation
- [ ] Invited users can accept invitation
- [ ] Owner can assign admin role
- [ ] Admin can manage members
- [ ] Member can view team activity
- [ ] Only owner can delete team

### F-4: Real-Time Updates
- WebSocket connections
- Live task updates across clients
- Presence indicators (who's online)
- Real-time notifications

**Acceptance Criteria:**
- [ ] Task updates appear immediately for all team members
- [ ] User sees who else is online
- [ ] User receives real-time notifications
- [ ] Changes persist after reconnection

## Technical Requirements

### Performance
- Page load < 2 seconds
- Real-time updates < 100ms latency
- Support 100 concurrent users per team
- Database queries < 50ms

### Security
- HTTPS only (TLS 1.3+)
- XSS protection
- CSRF tokens
- Rate limiting (5 requests/second per user)
- Password hashing (bcrypt, 10 rounds)
- SQL injection prevention (parameterized queries)

### Browser Support
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile responsive (iOS Safari, Chrome Mobile)

## Data Model

### Users
- id (UUID)
- email (unique, indexed)
- password_hash
- username (unique, indexed)
- oauth_provider (optional)
- oauth_id (optional)
- email_verified (boolean)
- created_at
- updated_at

### Tasks
- id (UUID)
- title (string, max 200 chars)
- description (text)
- priority (enum: low, medium, high)
- status (enum: todo, in_progress, done)
- due_date (timestamp, optional)
- assignee_id (FK to users)
- team_id (FK to teams)
- created_by (FK to users)
- created_at
- updated_at

### Teams
- id (UUID)
- name (string, max 100 chars)
- description (text, optional)
- owner_id (FK to users)
- created_at
- updated_at

### Team_Members
- team_id (FK to teams)
- user_id (FK to users)
- role (enum: owner, admin, member)
- joined_at

## API Endpoints

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- GET /api/auth/verify-email/:token
- GET /api/auth/google (OAuth)
- GET /api/auth/github (OAuth)

### Tasks
- POST /api/tasks
- GET /api/tasks (with filters)
- GET /api/tasks/:id
- PUT /api/tasks/:id
- DELETE /api/tasks/:id

### Teams
- POST /api/teams
- GET /api/teams
- GET /api/teams/:id
- PUT /api/teams/:id
- DELETE /api/teams/:id
- POST /api/teams/:id/members
- DELETE /api/teams/:id/members/:userId
- PUT /api/teams/:id/members/:userId (update role)

### WebSocket
- /ws (WebSocket endpoint)

## Non-Functional Requirements

### Scalability
- Horizontal scaling for API servers
- Database replication for read scaling
- Redis for session storage and real-time updates

### Observability
- Structured logging (JSON)
- Metrics (Prometheus)
- Distributed tracing (OpenTelemetry)
- Error tracking (Sentry)

### Deployment
- Docker containers
- Kubernetes orchestration
- CI/CD pipeline (GitHub Actions)
- Blue-green deployment
```

## Part 3: Feature Planning (8 min)

### Step 3.1: Plan First Feature (User Authentication)

**Prompt to Claude:**
```
Plan the implementation of the user authentication feature
using the specifications. Focus on email/password first,
OAuth can be a separate feature.
```

**Claude Response:**
```
The feature-planner skill is creating an implementation plan...

✅ Created features/001-user-authentication/
✅ Created features/001-user-authentication/spec.md
✅ Created features/001-user-authentication/plan.md
✅ Created features/001-user-authentication/tasks.md
✅ Created features/001-user-authentication/tests.md
✅ Created features/001-user-authentication/context-manifest.yaml

Feature 001 planned! Review the plan at features/001-user-authentication/plan.md
```

### Step 3.2: Review Feature Plan

```bash
cat features/001-user-authentication/plan.md
```

**Expected Content:**
```markdown
# Implementation Plan: User Authentication

## Overview

Implement email/password authentication with JWT tokens, session management,
email verification, and password reset.

## Phase 1: Database Setup

### 1.1 Create Users Table
- Create migration: `001_create_users_table.sql`
- Columns:
  - id (UUID, primary key)
  - email (VARCHAR(255), unique, not null)
  - password_hash (VARCHAR(255), not null)
  - username (VARCHAR(50), unique, not null)
  - email_verified (BOOLEAN, default false)
  - verification_token (VARCHAR(255), nullable)
  - reset_token (VARCHAR(255), nullable)
  - reset_token_expires (TIMESTAMP, nullable)
  - created_at (TIMESTAMP, default now())
  - updated_at (TIMESTAMP, default now())
- Indexes:
  - email (unique)
  - username (unique)
  - verification_token
  - reset_token

### 1.2 Create Sessions Table (optional, if using server-side sessions)
- Create migration: `002_create_sessions_table.sql`
- Columns:
  - sid (VARCHAR, primary key)
  - sess (JSON, not null)
  - expire (TIMESTAMP, not null)
- Index on expire for cleanup

## Phase 2: Backend API

### 2.1 Setup Dependencies
- bcrypt (password hashing)
- jsonwebtoken (JWT generation)
- nodemailer (email sending)
- express-validator (input validation)

### 2.2 Create Auth Service (`src/services/auth.service.ts`)
```typescript
class AuthService {
  async register(email, password, username)
  async login(email, password)
  async verifyEmail(token)
  async forgotPassword(email)
  async resetPassword(token, newPassword)
  async changePassword(userId, oldPassword, newPassword)
}
```

### 2.3 Create Auth Controller (`src/controllers/auth.controller.ts`)
```typescript
class AuthController {
  register(req, res)
  login(req, res)
  logout(req, res)
  me(req, res)
  verifyEmail(req, res)
  forgotPassword(req, res)
  resetPassword(req, res)
}
```

### 2.4 Create Middleware (`src/middleware/authenticate.ts`)
```typescript
function authenticateToken(req, res, next)
```

### 2.5 Create Routes (`src/routes/auth.routes.ts`)
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me (protected)
- GET /api/auth/verify-email/:token
- POST /api/auth/forgot-password
- POST /api/auth/reset-password

### 2.6 Create Email Templates (`src/templates/email/`)
- verification-email.html
- password-reset-email.html

## Phase 3: Frontend

### 3.1 Setup Auth Context (`src/contexts/AuthContext.tsx`)
```typescript
interface AuthContextType {
  user: User | null;
  login: (email, password) => Promise<void>;
  logout: () => void;
  register: (email, password, username) => Promise<void>;
  isAuthenticated: boolean;
}
```

### 3.2 Create Components
- `src/components/auth/RegisterForm.tsx`
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/ForgotPasswordForm.tsx`
- `src/components/auth/ResetPasswordForm.tsx`

### 3.3 Create Pages
- `src/pages/Register.tsx`
- `src/pages/Login.tsx`
- `src/pages/ForgotPassword.tsx`
- `src/pages/ResetPassword.tsx`
- `src/pages/VerifyEmail.tsx`

### 3.4 Create Protected Route Wrapper
- `src/components/ProtectedRoute.tsx`

### 3.5 Setup API Client
- `src/api/auth.api.ts` (API calls to backend)

## Phase 4: Testing

### 4.1 Unit Tests
- `tests/unit/auth.service.test.ts` (AuthService methods)
- `tests/unit/auth.controller.test.ts` (AuthController endpoints)

### 4.2 Integration Tests
- `tests/integration/auth-flow.test.ts` (full registration → login flow)

### 4.3 E2E Tests (Playwright)
- `tests/e2e/auth.spec.ts`
  - Registration flow
  - Login flow
  - Email verification flow
  - Password reset flow
  - Protected routes

## Phase 5: Documentation

### 5.1 API Documentation
- Document all auth endpoints in `.specweave/docs/api/api.md`

### 5.2 Architecture Documentation
- Create `.specweave/docs/architecture/authentication.md`

## Dependencies

### npm packages
```json
{
  "bcrypt": "^5.1.1",
  "jsonwebtoken": "^9.0.2",
  "nodemailer": "^6.9.7",
  "express-validator": "^7.0.1",
  "uuid": "^9.0.1"
}
```

## Environment Variables

```env
JWT_SECRET=<random-secret>
JWT_EXPIRES_IN=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<email>
EMAIL_PASSWORD=<password>
FRONTEND_URL=http://localhost:3000
```

## Acceptance Criteria

- [ ] User can register with email/password
- [ ] Registration sends verification email
- [ ] User can verify email via link
- [ ] User can log in with verified email
- [ ] Login returns JWT token
- [ ] JWT token expires after 7 days
- [ ] User can access protected routes with valid token
- [ ] User can log out (token invalidated)
- [ ] User can request password reset
- [ ] Password reset email sent with token
- [ ] User can reset password via token
- [ ] Reset token expires after 1 hour
- [ ] Passwords are hashed with bcrypt
- [ ] Input validation prevents injection attacks
- [ ] Rate limiting prevents brute force

## Estimated Effort

- Phase 1 (Database): 2 hours
- Phase 2 (Backend): 8 hours
- Phase 3 (Frontend): 6 hours
- Phase 4 (Testing): 4 hours
- Phase 5 (Documentation): 1 hour

**Total**: ~21 hours (3 days)
```

### Step 3.3: Review Context Manifest

```bash
cat features/001-user-authentication/context-manifest.yaml
```

**Expected Content:**
```yaml
---
spec_sections:
  - specifications/modules/authentication/overview.md
  - specifications/modules/authentication/email-auth/spec.md
  - specifications/overview.md#f-1-user-authentication

documentation:
  - .specweave/docs/architecture/authentication.md  # Will be created

code:
  # No existing code (greenfield)

dependencies:
  specifications:
    - specifications/modules/shared/security.md  # If exists

max_context_tokens: 8000
priority: high
auto_refresh: false
---
```

## Part 4: Implementation (10 min)

### Step 4.1: Implement the Feature

**Prompt to Claude:**
```
Implement feature 001-user-authentication following the plan.
Create all necessary files for database, backend, and frontend.
```

**Claude Response:**
```
The developer skill is implementing user authentication...
Loading context from features/001-user-authentication/context-manifest.yaml...
Context loaded: 7,234 tokens (84% reduction from full codebase)

Creating database migrations...
✅ Created src/db/migrations/001_create_users_table.sql

Creating backend services...
✅ Created src/services/auth.service.ts
✅ Created src/controllers/auth.controller.ts
✅ Created src/middleware/authenticate.ts
✅ Created src/routes/auth.routes.ts

Creating email templates...
✅ Created src/templates/email/verification-email.html
✅ Created src/templates/email/password-reset-email.html

Creating frontend components...
✅ Created src/contexts/AuthContext.tsx
✅ Created src/components/auth/RegisterForm.tsx
✅ Created src/components/auth/LoginForm.tsx
✅ Created src/components/auth/ForgotPasswordForm.tsx
✅ Created src/components/auth/ResetPasswordForm.tsx
✅ Created src/components/ProtectedRoute.tsx

Creating frontend pages...
✅ Created src/pages/Register.tsx
✅ Created src/pages/Login.tsx
✅ Created src/pages/ForgotPassword.tsx
✅ Created src/pages/ResetPassword.tsx
✅ Created src/pages/VerifyEmail.tsx

Creating API client...
✅ Created src/api/auth.api.ts

Implementation complete! Review the code and proceed with testing.
```

### Step 4.2: Review Generated Code (Sample)

```bash
cat src/services/auth.service.ts | head -50
```

**Expected Code:**
```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { sendEmail } from '../utils/email';

export class AuthService {
  /**
   * Register a new user
   */
  async register(email: string, password: string, username: string) {
    // Validate email format
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength (min 8 chars, 1 uppercase, 1 number)
    if (!this.isStrongPassword(password)) {
      throw new Error('Password must be at least 8 characters with 1 uppercase and 1 number');
    }

    // Check if user exists
    const existingEmail = await db.users.findByEmail(email);
    if (existingEmail) {
      throw new Error('Email already registered');
    }

    const existingUsername = await db.users.findByUsername(username);
    if (existingUsername) {
      throw new Error('Username already taken');
    }

    // Hash password (spec: bcrypt, 10 rounds)
    const password_hash = await bcrypt.hash(password, 10);

    // Generate verification token
    const verification_token = uuidv4();

    // Create user
    const user = await db.users.create({
      email,
      password_hash,
      username,
      email_verified: false,
      verification_token,
    });

    // Send verification email
    await sendEmail({
      to: email,
      subject: 'Verify your TaskMaster account',
      template: 'verification-email',
      data: {
        username,
        verificationUrl: `${process.env.FRONTEND_URL}/verify-email/${verification_token}`,
      },
    });

    return { userId: user.id, email: user.email, username: user.username };
  }

  // ... (more methods)
}
```

## Part 5: Testing (5 min)

### Step 5.1: Generate Tests

**Prompt to Claude:**
```
Generate comprehensive tests for the authentication feature.
Include unit tests, integration tests, and E2E tests with Playwright.
```

**Claude Response:**
```
The qa-engineer skill is generating tests...

✅ Created tests/unit/auth.service.test.ts (12 tests)
✅ Created tests/unit/auth.controller.test.ts (10 tests)
✅ Created tests/integration/auth-flow.test.ts (8 tests)

The playwright-tester skill is generating E2E tests...

✅ Created tests/e2e/auth.spec.ts (15 tests)

All tests generated! Run them with:
  npm run test:unit
  npm run test:integration
  npm run test:e2e
```

### Step 5.2: Run Tests

```bash
# Run unit tests
npm run test:unit

# Expected output:
# PASS tests/unit/auth.service.test.ts
#   AuthService
#     register
#       ✓ should create user with hashed password (45ms)
#       ✓ should reject invalid email (12ms)
#       ✓ should reject weak password (10ms)
#       ✓ should reject duplicate email (23ms)
#       ✓ should send verification email (18ms)
#     login
#       ✓ should return JWT for valid credentials (32ms)
#       ✓ should reject unverified email (15ms)
#       ✓ should reject invalid credentials (20ms)
# ... (all 12 tests pass)

# Run E2E tests
npm run test:e2e

# Expected output:
# Running 15 tests using 3 workers
#
#   ✓  [chromium] › auth.spec.ts:10:1 › User Registration › should register new user (2.1s)
#   ✓  [chromium] › auth.spec.ts:25:1 › User Registration › should reject duplicate email (1.3s)
#   ✓  [chromium] › auth.spec.ts:40:1 › User Login › should login with valid credentials (1.8s)
#   ✓  [chromium] › auth.spec.ts:55:1 › User Login › should reject unverified email (1.5s)
#   ✓  [chromium] › auth.spec.ts:70:1 › Email Verification › complete verification flow (2.5s)
# ... (all 15 tests pass)
#
# 15 passed (18s)
```

All tests pass! ✅

## Part 6: Documentation Auto-Update (2 min)

### Step 6.1: Mark Task Complete

**Prompt to Claude:**
```
Mark the user authentication feature as complete.
```

**Claude Response:**
```
Marking feature 001-user-authentication as complete...

⚠️  Post-Task-Completion Hook Triggered

🔔 Task completed sound notification played!

Detecting changes...
  - New feature: features/001-user-authentication/
  - New database migrations: src/db/migrations/001_*.sql
  - New API endpoints: /api/auth/*
  - New documentation needed

The docs-updater skill is updating documentation...

✅ Updated .specweave/docs/api/api.md (added auth endpoints)
✅ Created .specweave/docs/architecture/authentication.md
✅ Updated .specweave/docs/changelog/2025-01.md
✅ Updated CLAUDE.md (project structure)

Git commit:
  docs: auto-update after feature 001 completion

  - Added API reference for authentication endpoints
  - Created architecture documentation for auth system
  - Updated changelog with feature 001

  🤖 Generated with Claude Code
  Co-Authored-By: Claude <noreply@anthropic.com>

✅ Feature 001 marked as complete!
```

### Step 6.2: Review Auto-Updated Documentation

```bash
cat .specweave/docs/changelog/2025-01.md
```

**Expected Content:**
```markdown
# Changelog - January 2025

## [2025-01-26] Feature 001: User Authentication

### Added
- Email/password registration with email verification
- Login with JWT tokens (7-day expiration)
- Password reset flow
- Session management
- Protected routes

### API Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- GET /api/auth/verify-email/:token
- POST /api/auth/forgot-password
- POST /api/auth/reset-password

### Database
- Created `users` table with email verification support

### Tests
- 12 unit tests
- 8 integration tests
- 15 E2E tests (Playwright)
- All tests passing ✅

### Documentation
- API reference updated
- Architecture documentation created
```

## Summary

**What We Built:**
- ✅ Complete user authentication system
- ✅ Email/password registration with verification
- ✅ JWT-based session management
- ✅ Password reset flow
- ✅ Frontend components and pages
- ✅ Comprehensive tests (35 total)
- ✅ Auto-updated documentation

**SpecWeave Features Demonstrated:**
1. **Specification-first development** - Created detailed specs before code
2. **Context precision** - Loaded only 8k tokens (84% reduction)
3. **Skills auto-routing** - Skills activated automatically based on context
4. **Integrated testing** - Unit, integration, and E2E tests generated
5. **Living documentation** - Docs auto-updated via hooks
6. **Sound notification** - Notification when task completes

**Time Breakdown:**
- Setup: 5 minutes
- Specifications: 7 minutes
- Planning: 8 minutes
- Implementation: 10 minutes
- Testing: 5 minutes
- Documentation: 2 minutes (automatic)

**Total**: 30 minutes from idea to tested, documented feature!

## Next Steps

From here, you would:
1. Plan next feature (e.g., task CRUD operations)
2. Repeat the workflow
3. Build out the entire application
4. Deploy with confidence (all tests passing)

This demo shows the complete greenfield workflow with SpecWeave!
