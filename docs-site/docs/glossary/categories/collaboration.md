---
id: collaboration-category
title: Collaboration & Management
sidebar_label: Collaboration & Management
---

# Collaboration & Management

Understanding agile methodologies, project management, and team collaboration practices.

---

## Overview

Collaboration and management terms cover the methodologies, practices, and tools that enable teams to work together effectively. These concepts help teams deliver value iteratively, respond to change, and maintain alignment between technical work and business goals.

## Core Concepts

### Agile Methodologies

**Agile**
- Iterative, incremental approach to software development
- Values: individuals, working software, collaboration, responding to change
- Frameworks: Scrum, Kanban, XP (Extreme Programming)
- When to use: uncertainty, changing requirements, need for feedback

**[Scrum](/docs/glossary/terms/scrum)**
- Agile framework with defined roles and ceremonies
- Roles: Product Owner, Scrum Master, Development Team
- Ceremonies: Sprint Planning, Daily Standup, Review, Retrospective
- Sprint: Time-boxed iteration (1-4 weeks)

**[Kanban](/docs/glossary/terms/kanban)**
- Visual workflow management
- Focus on continuous flow (no sprints)
- WIP (Work In Progress) limits
- When to use: support teams, continuous delivery, less predictable work

### Work Breakdown

**[User Story](/docs/glossary/terms/user-story)**
- Feature from user's perspective
- Format: "As a [role], I want [feature] so that [benefit]"
- Acceptance criteria define "done"
- SpecWeave generates user stories in spec.md

**[Epic](/docs/glossary/terms/epic)**
- Large user story spanning multiple sprints
- Broken down into smaller stories
- Example: "User Authentication" epic → Login, Signup, Password Reset stories
- SpecWeave maps epics to living docs specs

**[Task](/docs/glossary/terms/task)**
- Technical work item (developer perspective)
- Smaller than user story
- Example: "Create database migration", "Add unit tests"
- SpecWeave tracks tasks in tasks.md

**[Spike](/docs/glossary/terms/spike)**
- Time-boxed research/investigation
- Explores unknowns, reduces risk
- No production code (prototype only)
- SpecWeave supports experiment increments

### Estimation & Planning

**[Story Points](/docs/glossary/terms/story-points)**
- Relative effort estimation (not time)
- Common scales: Fibonacci (1, 2, 3, 5, 8, 13), T-shirt sizes (S, M, L)
- Accounts for: complexity, risk, uncertainty
- Not used by SpecWeave (uses time estimates)

**[Velocity](/docs/glossary/terms/velocity)**
- Story points completed per sprint
- Used for predicting future capacity
- Example: Team averages 30 points/sprint
- SpecWeave tracks: tasks completed per increment

**[Sprint Planning](/docs/glossary/terms/sprint-planning)**
- Meeting to plan sprint work
- Select stories from backlog
- Break stories into tasks
- Commit to sprint goal

### Tracking & Collaboration

**[Backlog](/docs/glossary/terms/backlog)**
- Prioritized list of work (stories, bugs, tasks)
- Product Backlog: All work (long-term)
- Sprint Backlog: Work for current sprint
- SpecWeave uses: `.specweave/increments/_backlog/`

**[Jira](/docs/glossary/terms/jira)**
- Issue tracking and project management tool
- Features: boards, sprints, roadmaps, reports
- Most popular in enterprises
- SpecWeave plugin: `specweave-jira` (planned)

**[GitHub Issues](/docs/glossary/terms/github-issues)**
- Issue tracking on GitHub
- Lightweight, integrated with Git
- Labels, milestones, projects
- SpecWeave plugin: `specweave-github` (available)

---

## When to Use These Terms

| Term | Use When | Don't Use When |
|------|----------|----------------|
| **Agile** | Uncertainty, changing requirements, need feedback | Fixed scope, waterfall compliance, stable requirements |
| **Scrum** | Dedicated team, predictable sprint cadence | Support work, kanban better fit, very small teams |
| **Kanban** | Continuous flow, support work, no sprints | Need predictability, sprint commitments important |
| **User Story** | Capturing user needs, prioritizing features | Technical tasks, infrastructure work |
| **Epic** | Large features spanning multiple sprints | Small features, single sprint |
| **Jira** | Enterprise, complex workflows, compliance | Small teams, simple workflows, prefer GitHub |
| **GitHub Issues** | Open source, small teams, simple workflows | Enterprise, complex workflows, strict compliance |

---

## Real-World Examples

### Agile Workflow: Building E-Commerce Platform

**Sprint 0: Initial Planning (Week 0)**

```markdown
# Product Backlog (Prioritized)

## Epic 1: User Management (8 weeks)
- US-001: User registration (5 points) - Sprint 1
- US-002: Email verification (3 points) - Sprint 1
- US-003: Login/logout (5 points) - Sprint 2
- US-004: Password reset (3 points) - Sprint 2
- US-005: User profile (8 points) - Sprint 3

## Epic 2: Product Catalog (6 weeks)
- US-010: Browse products (5 points) - Sprint 4
- US-011: Search products (8 points) - Sprint 4
- US-012: Product details (3 points) - Sprint 5
- US-013: Product reviews (5 points) - Sprint 6

## Epic 3: Shopping Cart (4 weeks)
- US-020: Add to cart (5 points) - Sprint 7
- US-021: Update cart (3 points) - Sprint 7
- US-022: Checkout flow (13 points) - Sprint 8
```

**Sprint 1: User Registration (2 weeks)**

```markdown
# Sprint Goal
Users can register and verify email.

# Sprint Backlog
- US-001: User registration (5 points)
  - Task: Create user model + database schema
  - Task: Implement registration API endpoint
  - Task: Add password hashing (bcrypt)
  - Task: Create registration form (React)
  - Task: Add client-side validation
  - Task: Write unit + integration tests

- US-002: Email verification (3 points)
  - Task: Generate verification tokens
  - Task: Send verification email (SendGrid)
  - Task: Verify email endpoint
  - Task: Add email templates
  - Task: Test email flow

# Daily Standup Updates

**Day 1 (Monday)**:
- Alice: Working on user model. No blockers.
- Bob: Starting registration API. No blockers.
- Carol: Designing registration form. No blockers.

**Day 5 (Friday)**:
- Alice: User model done. Starting email templates. No blockers.
- Bob: Registration API done. Starting verification endpoint. No blockers.
- Carol: Form done. Waiting for API (blocked by Bob). Helping Alice with templates.

# Sprint Review (End of Week 2)
✅ US-001: DONE (registration works)
✅ US-002: DONE (email verification works)
Demo: Live demo to stakeholders

# Sprint Retrospective
What went well:
- API development was fast (Bob's experience helped)
- Good collaboration (Carol helped Alice when blocked)

What to improve:
- Better task estimation (underestimated email verification)
- Need staging environment for testing emails

Action items:
- Set up staging environment (Sprint 2)
- Add 20% buffer to time estimates
```

**Velocity Tracking**

```
Sprint 1: 8 points (5 + 3)
Sprint 2: 10 points (5 + 3 + 2)
Sprint 3: 12 points (8 + 4)

Average velocity: 10 points/sprint
Predicted Epic 1 completion: 5 sprints (50 points / 10 points)
```

### SpecWeave + Agile Integration

```markdown
# Increment 0035: User Registration (Epic 1, Sprints 1-2)

## Mapping: Agile ↔ SpecWeave

**Epic** (Jira/GitHub) → **Living Docs Spec** (.specweave/docs/internal/specs/)
- Epic-001: User Management → spec-0010-user-management.md

**Sprint** (2 weeks) → **Increment** (.specweave/increments/)
- Sprint 1 → 0035-user-registration (US-001, US-002)
- Sprint 2 → 0036-user-authentication (US-003, US-004)

**User Story** (Jira) → **Acceptance Criteria** (spec)
- US-001: User registration → AC-US1-01, AC-US1-02, AC-US1-03

**Task** (Jira) → **Task** (tasks)
- Jira: "Create user model" → tasks.md: T-001

## User Stories (from Jira/GitHub)

### US-001: User Registration
**As a** new user
**I want** to create an account
**So that** I can access the platform

**Acceptance Criteria**:
- AC-US1-01: User provides email, password, name
- AC-US1-02: Password must be 8+ chars, include uppercase + number
- AC-US1-03: Email must be unique (no duplicates)
- AC-US1-04: Verification email sent automatically

### US-002: Email Verification
**As a** registered user
**I want** to verify my email
**So that** I can log in

**Acceptance Criteria**:
- AC-US2-01: Verification link sent to email
- AC-US2-02: Link expires after 24 hours
- AC-US2-03: Account activated on successful verification

## Tasks (Generated by SpecWeave)

### T-001: Implement user registration API
**AC**: AC-US1-01, AC-US1-02, AC-US1-03

**Test Plan** (BDD):
- **Given** valid registration data → **When** POST /api/users → **Then** user created + email sent

**Implementation**:
1. Create User model (Prisma schema)
2. Add registration endpoint (POST /api/users)
3. Validate email uniqueness
4. Hash password (bcrypt)
5. Send verification email
6. Return user ID + success message

**Jira Link**: US-001 (https://mycompany.atlassian.net/browse/US-001)

---

### T-002: Implement email verification
**AC**: AC-US2-01, AC-US2-02, AC-US2-03

**Test Plan** (BDD):
- **Given** verification link → **When** click link → **Then** account activated

**Implementation**:
1. Generate verification token (JWT)
2. Store token in database (expires 24h)
3. Send email via SendGrid
4. Add verification endpoint (GET /api/verify/:token)
5. Mark user as verified
6. Test email flow

**Jira Link**: US-002 (https://mycompany.atlassian.net/browse/US-002)

## Integration: SpecWeave ↔ Jira

### Bidirectional Sync

```bash
# Create Jira issue from increment
/jira-create-issue 0035

# Result:
# ✅ Created Jira epic: PLAT-100 "User Registration"
# ✅ Created Jira stories:
#    - PLAT-101: User registration (US-001)
#    - PLAT-102: Email verification (US-002)
# ✅ Linked to increment: 0035-user-registration

# Sync status: SpecWeave → Jira
/jira-sync 0035

# Result:
# ✅ T-001 done → PLAT-101 status updated to "Done"
# ✅ T-002 in progress → PLAT-102 status updated to "In Progress"
```

### Status Mapping

| SpecWeave | Jira |
|-----------|------|
| Not started | To Do |
| In progress | In Progress |
| Completed | Done |
| Blocked | Blocked |
```

---

## How SpecWeave Uses Collaboration Terms

### 1. Agile Workflow Integration

SpecWeave maps to Agile concepts:

```
Agile Concept          → SpecWeave Equivalent
─────────────────────────────────────────────────
Epic                   → Living Docs Spec (.specweave/docs/internal/specs/)
Sprint (2 weeks)       → Increment (.specweave/increments/)
User Story             → Acceptance Criteria (AC-US1-01)
Task                   → Task (tasks.md: T-001)
Backlog                → .specweave/increments/_backlog/
Sprint Planning        → /specweave:increment (increment planning)
Daily Standup          → /specweave:progress (status update)
Sprint Review          → /specweave:done (completion report)
Sprint Retrospective   → COMPLETION-REPORT.md (lessons learned)
```

### 2. External PM Tool Integration

**specweave-github plugin** (available):
```bash
# Sync increment ↔ GitHub issue
/github-create-issue 0035 "User Registration"
/github-sync 0035
```

**specweave-jira plugin** (planned):
```bash
# Sync increment ↔ Jira epic/stories
/jira-create-issue 0035
/jira-sync 0035
```

**specweave-ado plugin** (planned):
```bash
# Sync increment ↔ Azure DevOps work item
/ado-create-issue 0035
/ado-sync 0035
```

### 3. Living Documentation for Collaboration

Team collaboration documented in:
```
.specweave/docs/internal/
├── strategy/
│   ├── product-vision.md          # Product strategy
│   └── roadmap.md                 # Feature roadmap
├── delivery/
│   ├── agile-workflow.md          # Team processes
│   └── definition-of-done.md      # Completion criteria
└── rfc/
    └── rfc-0010-user-management.md # Feature specifications
```

### 4. Increment as Sprint Equivalent

```markdown
# Increment = Sprint (SpecWeave's unit of work)

**Duration**: Typically 1-2 weeks (flexible)
**Planning**: /specweave:increment (generate spec.md, plan.md, tasks)
**Execution**: /specweave:do (implement tasks)
**Daily Updates**: /specweave:progress (check status)
**Completion**: /specweave:done (close increment, generate report)

**Key Difference from Scrum**:
- ✅ No fixed sprint length (increments are flexible)
- ✅ Focus on ONE increment at a time (WIP limits)
- ✅ Living docs auto-sync (no manual updates)
```

### 5. Velocity Tracking

```bash
/specweave:status

# Output:
# Increment History:
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ID    | Name              | Tasks | Duration | Status
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 0032  | User Reg          | 5/5   | 8 days   | ✅ Done
# 0033  | User Auth         | 7/7   | 10 days  | ✅ Done
# 0034  | Password Reset    | 4/4   | 5 days   | ✅ Done
# 0035  | User Profile      | 6/8   | 12 days  | ⏳ In Progress
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# Velocity Metrics:
# - Average duration: 8.3 days/increment
# - Average tasks: 5.5 tasks/increment
# - Completion rate: 95% (19/20 tasks)
# - Predicted completion (0035): 2 days
```

---

## Related Categories

- **[DevOps & Tools](/docs/glossary/categories/devops-category)** - Development workflows
- **[Architecture & Design](/docs/glossary/categories/architecture-category)** - Technical decisions
- **[Testing & Quality](/docs/glossary/categories/testing-category)** - Quality practices

---

## Learn More

### Guides
- [Development Workflow](/docs/delivery/guides/development-workflow)
- [Increment Lifecycle](/docs/delivery/guides/increment-lifecycle)
- [Branch Strategy](/docs/delivery/branch-strategy)

### Books
- "Agile Estimating and Planning" by Mike Cohn
- "User Stories Applied" by Mike Cohn
- "Scrum: The Art of Doing Twice the Work in Half the Time" by Jeff Sutherland
- "The Phoenix Project" by Gene Kim
- "Accelerate" by Nicole Forsgren

### External Resources
- [Agile Manifesto](https://agilemanifesto.org/)
- [Scrum Guide](https://scrumguides.org/)
- [Atlassian Agile Coach](https://www.atlassian.com/agile)
- [Mountain Goat Software (Mike Cohn)](https://www.mountaingoatsoftware.com/)
- [Scrum.org Resources](https://www.scrum.org/resources)

---

**Navigation**:
- [← Back to Glossary](/docs/glossary/)
- [Browse by Category](/docs/glossary/index-by-category)
- [Alphabetical Index](/docs/glossary/README)
