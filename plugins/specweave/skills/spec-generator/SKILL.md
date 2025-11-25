---
name: spec-generator
description: Generates comprehensive specifications (spec.md, plan.md, tasks.md with embedded tests) for SpecWeave increments using proven templates and flexible structure. Activates when users create new increments, plan features, or need structured documentation. Keywords: specification, spec, plan, tasks, tests, increment planning, feature planning, requirements.
---

# Spec Generator - Flexible Increment Documentation

**Purpose**: Automatically generate comprehensive specification documentation (spec.md, plan.md, tasks.md with embedded tests) for SpecWeave increments using proven templates and flexible, context-aware structure.

**When to Use**:
- Creating new increments (`/specweave:inc`)
- Planning features or products
- Generating structured documentation
- Converting ideas into actionable specs

**Based On**: Flexible Spec Generator (V2) - context-aware, non-rigid templates

---

## How Spec Generator Works

### 1. Flexible Spec Generation (spec.md)

**Adapts to Context**:
- **New Product**: Full PRD with market analysis, user personas, competitive landscape
- **Feature Addition**: Focused user stories, acceptance criteria, integration points
- **Bug Fix**: Problem statement, root cause, solution, impact analysis
- **Refactoring**: Current state, proposed changes, benefits, migration plan

**Core Sections** (Always Present):
```markdown
# Product Specification: [Increment Name]

**Increment**: [ID]
**Title**: [Title]
**Status**: Planning
**Priority**: [P0-P3]
**Created**: [Date]

## Executive Summary
[1-2 paragraph overview]

## Problem Statement
### Current State
### User Pain Points
### Target Audience

## User Stories & Acceptance Criteria

<!--
⚠️ MULTI-PROJECT MODE: If umbrella.enabled=true in config.json,
   user stories MUST be project-scoped! See section below.
-->

### US-001: [Title]
**As a** [user type]
**I want** [goal]
**So that** [benefit]

**Acceptance Criteria**:
- ✅ [Criterion 1]
- ✅ [Criterion 2]

## Success Metrics
[How we'll measure success]

## Non-Goals (Out of Scope)
[What we're NOT doing in this increment]
```

**Flexible Sections** (Context-Dependent):
- **Competitive Analysis** (if new product)
- **Technical Requirements** (if complex feature)
- **API Design** (if backend API)
- **UI/UX Requirements** (if frontend)
- **Security Considerations** (if auth/data)
- **Migration Plan** (if breaking change)

### 2. Technical Plan Generation (plan.md)

**Adapts to Complexity**:
- **Simple Feature**: Component list, data flow, implementation steps
- **Complex System**: Full architecture, C4 diagrams, sequence diagrams, ER diagrams
- **Infrastructure**: Deployment architecture, scaling strategy, monitoring

**Core Sections**:
```markdown
# Technical Plan: [Increment Name]

## Architecture Overview
[System design, components, interactions]

## Component Architecture
### Component 1
[Purpose, responsibilities, interfaces]

## Data Models
[Entities, relationships, schemas]

## Implementation Strategy
### Phase 1: [Name]
### Phase 2: [Name]

## Testing Strategy
[Unit, integration, E2E approach]

## Deployment Plan
[How we'll roll this out]

## Risks & Mitigations
```

### 3. Task Breakdown Generation (tasks.md)

**Smart Task Creation**:
```markdown
# Implementation Tasks: [Increment Name]

## Task Overview
**Total Tasks**: [N]
**Estimated Duration**: [X weeks]
**Priority**: [P0]

---

## Phase 1: Foundation (Week 1) - X tasks

### T-001: [Task Title]
**Priority**: P0
**Estimate**: [X hours]
**Status**: pending

**Description**:
[What needs to be done]

**Files to Create/Modify**:
- `path/to/file.ts`

**Implementation**:
```[language]
[Code example or approach]
```

**Acceptance Criteria**:
- ✅ [Criterion 1]
- ✅ [Criterion 2]

---

[Repeat for all tasks]

## Task Dependencies
[Dependency graph if complex]
```

### 4. Test Strategy Generation (tests.md)

**Comprehensive Test Coverage**:
```markdown
# Test Strategy: [Increment Name]

## Test Overview
**Total Test Cases**: [N]
**Test Levels**: [Unit, Integration, E2E, Performance]
**Coverage Target**: 80%+ overall, 90%+ critical

---

## Unit Tests (X test cases)

### TC-001: [Test Name]
```[language]
describe('[Component]', () => {
  it('[should do something]', async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

## Integration Tests (X test cases)
## E2E Tests (X test cases)
## Performance Tests (X test cases)

## Coverage Requirements
- Critical paths: 90%+
- Overall: 80%+
```

---

## Spec Generator Templates

### Template Selection Logic

**Input Analysis**:
1. Analyze increment description (keywords, complexity)
2. Detect domain (frontend, backend, infra, ML, etc.)
3. Determine scope (feature, product, bug fix, refactor)
4. Assess technical complexity (simple, moderate, complex)

**Template Selection**:
```
IF new_product THEN
  spec_template = "Full PRD"
  plan_template = "System Architecture"
ELSE IF feature_addition THEN
  spec_template = "User Stories Focused"
  plan_template = "Component Design"
ELSE IF bug_fix THEN
  spec_template = "Problem-Solution"
  plan_template = "Implementation Steps"
ELSE IF refactoring THEN
  spec_template = "Current-Proposed"
  plan_template = "Migration Strategy"
END IF
```

### Context-Aware Sections

**Auto-Include Based On**:
- **"authentication"** → Security Considerations, JWT/OAuth design
- **"API"** → API Design, OpenAPI spec, rate limiting
- **"database"** → ER diagrams, migration scripts, indexes
- **"frontend"** → Component hierarchy, state management, UI/UX
- **"deployment"** → CI/CD, infrastructure, monitoring
- **"ML"** → Model architecture, training pipeline, evaluation metrics

---

## Usage Examples

### Example 1: Simple Feature
```
User: /specweave:inc "Add dark mode toggle to settings"

Spec Generator:
✓ Detected: Frontend feature (UI component)
✓ Complexity: Simple
✓ Template: User Stories + Component Design

Generating specifications...
✓ spec.md: 3 user stories, UI mockups section
✓ plan.md: Component design, state management, CSS-in-JS
✓ tasks.md: 8 tasks (component, styles, state, tests)
✓ tests.md: Unit tests for component, E2E for toggle
```

### Example 2: Complex System
```
User: /specweave:inc "Multi-tenant SaaS platform with billing"

Spec Generator:
✓ Detected: New product (SaaS, multi-tenant, payments)
✓ Complexity: High
✓ Template: Full PRD + System Architecture

Generating specifications...
✓ spec.md: Market analysis, personas, competitive landscape, 15 user stories
✓ plan.md: Multi-tenant architecture, database per tenant, Stripe integration, C4 diagrams
✓ tasks.md: 40 tasks across 4 weeks (auth, tenancy, billing, UI)
✓ tests.md: 100+ test cases (unit, integration, E2E, load testing)
```

### Example 3: Bug Fix
```
User: /specweave:inc "Fix race condition in user session handling"

Spec Generator:
✓ Detected: Bug fix (concurrency issue)
✓ Complexity: Moderate
✓ Template: Problem-Solution

Generating specifications...
✓ spec.md: Problem statement, root cause analysis, impact, solution
✓ plan.md: Current implementation, proposed fix, Redis locking
✓ tasks.md: 5 tasks (analysis, fix, tests, rollout, monitoring)
✓ tests.md: Concurrency tests, stress tests
```

---

## Integration with /specweave:inc

The Spec Generator is automatically invoked by `/specweave:inc`:

1. **User Intent Analysis**:
   - Analyze increment description
   - Detect keywords, domain, complexity

2. **Template Selection**:
   - Choose appropriate templates
   - Auto-include relevant sections

3. **Specification Generation**:
   - Generate spec.md with PM context
   - Generate plan.md with Architect context
   - Generate tasks.md with breakdown
   - Generate tests.md with coverage strategy

4. **User Review**:
   - Show generated structure
   - Allow refinement
   - Confirm before creating files

---

## Advantages Over Rigid Templates

**Flexible (V2) Approach**:
- ✅ Adapts to increment type (product, feature, bug fix, refactor)
- ✅ Includes only relevant sections
- ✅ Scales complexity up/down
- ✅ Domain-aware (frontend, backend, ML, infra)
- ✅ Faster for simple increments
- ✅ Comprehensive for complex products

**Rigid (V1) Approach**:
- ❌ Same template for everything
- ❌ Many irrelevant sections
- ❌ Wastes time on simple features
- ❌ Insufficient for complex products
- ❌ One-size-fits-none

---

## Configuration

Users can customize spec generation in `.specweave/config.yaml`:

```yaml
spec_generator:
  # Default complexity level
  default_complexity: moderate  # simple | moderate | complex

  # Always include sections
  always_include:
    - executive_summary
    - user_stories
    - success_metrics

  # Never include sections
  never_include:
    - competitive_analysis  # We're not doing market research

  # Domain defaults
  domain_defaults:
    frontend:
      include: [ui_mockups, component_hierarchy, state_management]
    backend:
      include: [api_design, database_schema, authentication]
```

---

## 🔀 Multi-Project User Story Generation (v0.29.0+)

**CRITICAL**: When umbrella/multi-project mode is detected, user stories MUST be generated per-project!

### Detection (MANDATORY FIRST STEP)

**Before generating spec.md, ALWAYS check for multi-project mode:**

```bash
# 1. Check config.json for umbrella mode
cat .specweave/config.json | jq '.umbrella.enabled'

# 2. Check for childRepos configuration
cat .specweave/config.json | jq '.umbrella.childRepos[]'

# 3. Check for project folders in specs/
ls -la .specweave/docs/internal/specs/
```

**If ANY of these conditions are TRUE → Multi-project mode ACTIVE:**
- `umbrella.enabled: true` in config.json
- `umbrella.childRepos` has entries
- Multiple project folders exist in `specs/` (e.g., `sw-app-fe/`, `sw-app-be/`, `sw-app-shared/`)
- User prompt mentions: "3 repos", "frontend repo", "backend API", "shared library"

### Project-Scoped User Story Format (MANDATORY in Multi-Project Mode)

**❌ WRONG (Single-Project Format - DO NOT USE in multi-project!):**
```markdown
## User Stories

### US-001: Thumbnail Upload
As a content creator, I want to upload thumbnails...

### US-002: CTR Prediction API
As a system, I want to predict click-through rates...
```

**✅ CORRECT (Multi-Project Format - ALWAYS USE when umbrella detected!):**
```markdown
## User Stories by Project

### Frontend (sw-thumbnail-ab-fe)

#### US-FE-001: Thumbnail Upload & Comparison (P1)
**Related Repo**: sw-thumbnail-ab-fe
**As a** content creator
**I want** to upload multiple thumbnail variants and compare them side-by-side
**So that** I can visually evaluate my options before testing

**Acceptance Criteria**:
- [ ] **AC-FE-US1-01**: User can drag-and-drop up to 5 thumbnail images (JPG, PNG, WebP)
- [ ] **AC-FE-US1-02**: Images are validated for YouTube specs (1280x720 min, <2MB)
- [ ] **AC-FE-US1-03**: Side-by-side comparison view displays all variants

---

### Backend (sw-thumbnail-ab-be)

#### US-BE-001: Thumbnail Analysis API (P1)
**Related Repo**: sw-thumbnail-ab-be
**As a** frontend application
**I want** to call POST /predict-ctr endpoint
**So that** I can get AI-powered click-through rate predictions

**Acceptance Criteria**:
- [ ] **AC-BE-US1-01**: POST /predict-ctr endpoint accepts thumbnail image
- [ ] **AC-BE-US1-02**: ML model analyzes: face detection, text readability, color psychology

---

### Shared Library (sw-thumbnail-ab-shared)

#### US-SHARED-001: Common Types & Validators (P1)
**Related Repo**: sw-thumbnail-ab-shared
**As a** developer in FE or BE repos
**I want** shared TypeScript types and validators
**So that** API contracts are consistent across projects

**Acceptance Criteria**:
- [ ] **AC-SHARED-US1-01**: ThumbnailMetadata type exported
- [ ] **AC-SHARED-US1-02**: Validation schemas for image specs
```

### Project Classification Rules

When analyzing user descriptions, classify each user story by keywords:

| Keywords | Project | Prefix |
|----------|---------|--------|
| UI, component, page, form, view, drag-drop, theme, builder, menu display | Frontend | FE |
| API, endpoint, CRUD, webhook, analytics, database, service, ML model | Backend | BE |
| types, schemas, validators, utilities, localization, common | Shared | SHARED |
| iOS, Android, mobile app, push notification | Mobile | MOBILE |
| Terraform, K8s, Docker, CI/CD, deployment | Infrastructure | INFRA |

### AC-ID Format by Project

```
AC-{PROJECT}-US{story}-{number}

Examples:
- AC-FE-US1-01 (Frontend, User Story 1, AC #1)
- AC-BE-US1-01 (Backend, User Story 1, AC #1)
- AC-SHARED-US1-01 (Shared, User Story 1, AC #1)
- AC-MOBILE-US1-01 (Mobile, User Story 1, AC #1)
```

### tasks.md Must Reference Project-Scoped User Stories

```markdown
### T-001: Create Thumbnail Upload Component
**User Story**: US-FE-001           ← MUST reference project-scoped ID!
**Satisfies ACs**: AC-FE-US1-01, AC-FE-US1-02
**Status**: [ ] Not Started

### T-004: Database Schema & Migrations
**User Story**: US-BE-001, US-BE-002   ← Backend stories only!
**Satisfies ACs**: AC-BE-US1-01, AC-BE-US2-01
**Status**: [ ] Not Started
```

### Workflow Summary

```
1. DETECT multi-project mode (check config.json, folder structure)
   ↓
2. If multi-project → Group user stories by project (FE/BE/SHARED/MOBILE/INFRA)
   ↓
3. Generate prefixed user stories: US-FE-001, US-BE-001, US-SHARED-001
   ↓
4. Generate prefixed ACs: AC-FE-US1-01, AC-BE-US1-01
   ↓
5. Generate tasks referencing correct project user stories
   ↓
6. Each project folder gets its own filtered spec
```

### Why This Matters

Without project-scoped stories:
- ❌ All issues created in ONE repo (wrong!)
- ❌ No clarity which team owns what
- ❌ Tasks reference wrong user stories
- ❌ GitHub sync broken across repos

With project-scoped stories:
- ✅ Each repo gets only its user stories
- ✅ Clear ownership per team/repo
- ✅ GitHub issues in correct repo
- ✅ Clean separation of concerns

---

## Related Skills

- **Planning workflow**: Guides increment planning (uses Spec Generator internally)
- **Context loading**: Loads relevant context for specification generation
- **Quality validation**: Validates generated specifications for completeness
- **multi-project-spec-mapper**: Splits specs into project-specific files
- **umbrella-repo-detector**: Detects multi-repo architecture

---

## Version History

- **v2.0.0** (0.29.0): Added multi-project user story generation support
- **v1.0.0** (0.8.0): Initial release with flexible template system
- Based on: Flexible Spec Generator (V2) - context-aware, non-rigid templates
