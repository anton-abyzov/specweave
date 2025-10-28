# SpecWeave Workspace Instructions

**Framework**: SpecWeave (Spec-Driven Development)
**Adapter**: GitHub Copilot (Basic Automation)

GitHub Copilot reads this file to understand the project structure and provide better code suggestions.

---

## Project Overview

This project uses **SpecWeave** for spec-driven development where specifications are the source of truth.

**Core Principle**: Define WHAT and WHY before HOW. Document before implementing.

---

## Project Structure

```
.specweave/
├── config.yaml                    # Project configuration
├── docs/                          # Documentation (5-pillar structure)
│   ├── internal/
│   │   ├── strategy/              # Business requirements (WHAT/WHY)
│   │   ├── architecture/          # Technical design (HOW)
│   │   ├── delivery/              # Roadmap, CI/CD
│   │   ├── operations/            # Runbooks, monitoring
│   │   └── governance/            # Security, compliance
│   └── public/                    # Published documentation
│
└── increments/                    # Features organized by increments
    └── ####-feature-name/         # Auto-numbered folders
        ├── spec.md                # WHAT & WHY (business requirements)
        ├── plan.md                # HOW (technical design)
        ├── tasks.md               # Implementation steps (checkboxes)
        ├── tests.md               # Test strategy & coverage
        ├── context-manifest.yaml  # What context to load (70%+ token savings)
        ├── logs/                  # Execution logs
        ├── scripts/               # Helper scripts
        └── reports/               # Analysis reports
```

---

## Workflow: Creating Features

### Step 1: Create Increment Folder

```bash
mkdir -p .specweave/increments/####-feature-name
```

Auto-increment number (e.g., 0001, 0002, 0003).

### Step 2: Create spec.md (WHAT & WHY)

**Purpose**: Define business requirements (technology-agnostic)

**Structure**:
```markdown
---
increment: ####-feature-name
title: "Feature Title"
priority: P1
status: planned
---

# Increment ####: Feature Name

## Overview
[Problem statement and solution]

## User Stories

### US-001: User Story Title
**As a** [role]
**I want to** [action]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] **TC-0001**: [testable condition]
- [ ] **TC-0002**: [testable condition]
```

**Important**:
- Technology-agnostic (WHAT/WHY, not HOW)
- User stories with acceptance criteria
- Test case IDs (TC-0001, TC-0002) for traceability

### Step 3: Create plan.md (HOW)

**Purpose**: Define technical implementation

**Structure**:
```markdown
# Technical Plan: Feature Name

## Architecture

### Components
[List components/services]

### Data Model
[Database schema, entities]

### API Contracts
[Endpoints, request/response]

## Implementation Strategy
[Step-by-step technical approach]
```

**Important**:
- Technology-specific details
- Reference ADRs (Architecture Decision Records)
- Component design, data models, APIs

### Step 4: Create tasks.md (Implementation)

**Purpose**: Implementation checklist

**Structure**:
```markdown
---
increment: ####-feature-name
total_tasks: 10
completed_tasks: 0
---

# Implementation Tasks

## Phase 1

### T001: Task Description
- [ ] Subtask 1
- [ ] Subtask 2

[Checkboxes for task tracking]
```

### Step 5: Create context-manifest.yaml (CRITICAL)

**Purpose**: Load ONLY relevant files (70%+ token savings)

**Structure**:
```yaml
---
spec_sections:
  - .specweave/docs/internal/strategy/{module}/spec.md
documentation:
  - .specweave/docs/internal/architecture/{module}/design.md
max_context_tokens: 10000
---
```

**Why Important**:
- Full specs might be 500+ pages (50k tokens)
- Manifest lists only relevant 50 pages (5k tokens)
- Saves 90% tokens = faster, more accurate suggestions

---

## Context Loading (70%+ Token Reduction)

**CRITICAL RULE**: Always reference context-manifest.yaml when working on a feature.

**Example**:
1. Open `.specweave/increments/0002-auth/context-manifest.yaml`
2. See which files are relevant:
   ```yaml
   spec_sections:
     - .specweave/docs/internal/strategy/auth/spec.md
   documentation:
     - .specweave/docs/internal/architecture/auth/design.md
   ```
3. ONLY read those 2 files (not entire docs/ folder)

**Benefit**: Copilot provides suggestions based on relevant context only.

---

## File Naming Conventions

| File | Purpose | Technology |
|------|---------|------------|
| **spec.md** | Business requirements (WHAT/WHY) | Agnostic |
| **plan.md** | Technical design (HOW) | Specific |
| **tasks.md** | Implementation checklist | N/A |
| **tests.md** | Test strategy and coverage | N/A |
| **context-manifest.yaml** | Context loading config | N/A |

---

## Increment Lifecycle

### Status Progression

```
planned → in-progress → completed → closed
```

### Update spec.md Frontmatter

When starting work:
```yaml
status: in-progress
started: 2025-10-27
```

When finishing:
```yaml
status: completed
completed: 2025-10-27
```

---

## Best Practices

### Spec.md (Technology-Agnostic)

**Good**:
```markdown
## FR-001: User Authentication
Users must be able to securely log in with email and password.
```

**Bad** (too technical):
```markdown
## FR-001: User Authentication
Users authenticate via JWT tokens stored in httpOnly cookies.
```

Technical details go in plan.md, not spec.md.

### Plan.md (Technology-Specific)

**Good**:
```markdown
## Authentication Implementation
- JWT tokens (jsonwebtoken library)
- httpOnly cookies (secure: true, sameSite: 'strict')
- bcrypt password hashing (10 rounds)
```

### Tasks.md (Checkboxes)

Use checkboxes for task tracking:
```markdown
- [ ] Not started
- [x] Completed
- [-] In progress (optional)
```

---

## Test Case Traceability

### Four Levels

1. **Specification** (TC-0001 in spec.md):
   ```markdown
   - [ ] **TC-0001**: Valid credentials → redirect to dashboard
   ```

2. **Feature Test Strategy** (tests.md):
   Maps TC-0001 to test file location

3. **Code Tests** (tests/ directory):
   ```typescript
   test('TC-0001: Valid Login Flow', async () => {
     // Implementation
   });
   ```

**Benefit**: Complete traceability from requirements to tests.

---

## Understanding Roles (for Context)

When creating files, think about the role's perspective:

### PM (Product Manager)
- **Focus**: WHAT and WHY
- **File**: spec.md
- **Content**: User stories, acceptance criteria, business value

### Architect
- **Focus**: HOW (technical)
- **File**: plan.md
- **Content**: System design, components, data models, ADRs

### DevOps
- **Focus**: Infrastructure, deployment
- **File**: plan.md (infrastructure section), scripts/
- **Content**: Terraform, Kubernetes, CI/CD

### QA Lead
- **Focus**: Testing strategy
- **File**: tests.md
- **Content**: Test coverage, test cases, quality metrics

---

## Common Patterns

### Creating a Feature
1. Create increment folder (auto-numbered)
2. Create spec.md (PM perspective - WHAT/WHY)
3. Create plan.md (Architect perspective - HOW)
4. Create tasks.md (implementation checklist)
5. Create context-manifest.yaml (list relevant files)

### Implementing a Feature
1. Read context-manifest.yaml
2. Load ONLY files listed there
3. Follow tasks.md checklist
4. Update task completion (checkboxes)

### Testing a Feature
1. Read tests.md for test strategy
2. Implement E2E/unit/integration tests
3. Reference TC-0001 IDs in test names
4. Verify all acceptance criteria covered

---

## Copilot Integration

**How Copilot Uses These Instructions**:

1. **Better Code Suggestions**:
   - Understands SpecWeave structure
   - Suggests code following patterns
   - Respects file naming conventions

2. **Context Awareness**:
   - Reads context-manifest.yaml
   - Provides suggestions based on relevant docs
   - Avoids suggesting irrelevant code

3. **Pattern Recognition**:
   - Learns from spec.md, plan.md structure
   - Suggests consistent formatting
   - Follows test case ID patterns (TC-0001)

---

## Quick Reference

**Create Increment**:
```bash
mkdir -p .specweave/increments/####-feature-name
```

**Files to Create**:
1. spec.md (WHAT/WHY, technology-agnostic)
2. plan.md (HOW, technology-specific)
3. tasks.md (implementation checklist)
4. context-manifest.yaml (context loading)

**Context Loading**:
- Always reference context-manifest.yaml
- Load ONLY files listed there
- Saves 70%+ tokens

**Test Traceability**:
- TC-0001 in spec.md
- Mapped in tests.md
- Referenced in test code

---

**For complete documentation, see SPECWEAVE.md in project root.**
