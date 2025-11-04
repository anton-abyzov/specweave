---
name: increment-planner
description: Creates comprehensive implementation plans for SpecWeave increments (aka features - both terms are interchangeable). This skill should be used when planning new increments/features, creating specifications, or organizing implementation work. Activates for: increment planning, feature planning, implementation plan, create increment, create feature, plan increment, plan feature, organize work, break down increment, break down feature, new product, build project, MVP, SaaS, app development, product description, tech stack planning, feature list.
---

# Increment Planner Skill

## 📚 Required Reading (LOAD FIRST)

**CRITICAL**: Before planning features, read this guide:
- **[Increment Lifecycle Guide](.specweave/docs/internal/delivery/guides/increment-lifecycle.md)**

This guide contains:
- Complete increment structure (spec.md, plan.md, tasks.md with embedded tests)
- WIP limits and status progression
- Task vs increment decision tree
- Context manifest creation for 70%+ token reduction
- **v0.7.0+**: Test-Aware Planning (tests embedded in tasks.md, no separate tests.md)

**Load this guide using the Read tool BEFORE creating feature plans.**

---

This skill creates comprehensive, well-structured implementation plans for SpecWeave features following the Spec-Driven Development methodology.

## Purpose

The increment-planner skill automates the creation of feature implementation plans, ensuring:
- Auto-numbered feature directories (`0001-9999` 4-digit format)
- Duplicate detection (prevents creating 0002 when 0002 already exists)
- Complete feature artifacts (spec.md, plan.md, tasks.md with embedded tests)
- Proper context manifests for selective loading
- Constitutional compliance
- Separation of WHAT/WHY (spec) from HOW (plan) from STEPS (tasks with test plans)
- **v0.7.0+**: Test-Aware Planning (bidirectional AC↔Task↔Test linking)

## When to Use This Skill

Use this skill when:
- Creating a new feature from a description
- Planning implementation for a user story
- Organizing work for a complex task
- Breaking down epics into executable features
- Structuring brownfield modifications

## Activation Triggers

This skill activates automatically when users say:
- "Plan a feature for..."
- "Create implementation plan for..."
- "I want to add [feature description]"
- "Help me structure [feature]"
- "Break down this feature: ..."

---

## ⚠️ CRITICAL: Living Documentation Workflow

**MANDATORY**: Feature planner must orchestrate **BOTH** living docs and increment files.

### Correct Workflow (MUST FOLLOW)

```
User: "I want to build real-time price tracking"
    ↓
increment-planner skill
    ↓
STEP 1: Scan existing docs
├─ Read .specweave/docs/internal/strategy/ (existing requirements)
├─ Read .specweave/docs/internal/architecture/adr/ (existing decisions)
└─ Pass existing context to agents
    ↓
STEP 2: Invoke PM Agent (🚨 MANDATORY - USE TASK TOOL)

YOU MUST USE THE TASK TOOL - DO NOT SKIP:

Task(
  subagent_type: "pm",
  description: "PM product strategy",
  prompt: "Create product strategy for: [user feature description]

  Context from existing docs: [summary of strategy docs from Step 1]

  You MUST create increment spec.md (primary) AND optionally update strategy docs:

  1. Strategy docs (optional, high-level only):
     - IF this is a NEW module/product, create:
       .specweave/docs/internal/strategy/{module-name}/
       * overview.md (high-level product vision, market opportunity, personas)
       * business-case.md (optional - ROI, competitive analysis)
     - IMPORTANT:
       * ❌ NO detailed user stories (those go in spec.md)
       * ❌ NO detailed requirements (those go in spec.md)
       * ❌ NO acceptance criteria (those go in spec.md)
       * ✅ ONLY strategic, high-level business context

  2. Increment spec.md (MANDATORY, source of truth):
     - Create .specweave/increments/{number}-{name}/spec.md
     - This is the COMPLETE requirements spec (not a summary!)
     - Include ALL of:
       * User stories (US-001, US-002, etc.) with full details
       * Acceptance criteria (AC-US1-01, etc.)
       * Functional requirements (FR-001, etc.)
       * Non-functional requirements (NFR-001, etc.)
       * Success criteria (metrics, KPIs)
       * Test strategy
     - Optionally reference strategy/overview.md for business context
     - No line limit (be thorough, this is source of truth)

  Tech stack: [detected tech stack]"
)

Wait for PM agent to complete!
    ↓
STEP 3: Invoke Architect Agent (🚨 MANDATORY - USE TASK TOOL)

YOU MUST USE THE TASK TOOL - DO NOT SKIP:

Task(
  subagent_type: "architect",
  description: "Architect technical design",
  prompt: "Create technical architecture for: [user feature description]

  FIRST, read PM's strategy docs from .specweave/docs/internal/strategy/{module}/

  You MUST create BOTH living docs AND increment files:

  1. Living docs (source of truth):
     - Update .specweave/docs/internal/architecture/system-design.md
     - Create .specweave/docs/internal/architecture/adr/ (at least 3 ADRs):
       * ####-websocket-vs-polling.md
       * ####-database-choice.md
       * ####-deployment-platform.md
     - Create diagrams/{module}/ (Mermaid C4 diagrams)
     - Create data-models/{module}-schema.sql

  2. Increment file:
     - Create .specweave/increments/{number}-{name}/plan.md
     - Keep plan.md < 500 lines (summary only)
     - MUST reference living docs
     - Include links to ../../docs/internal/architecture/adr/

  Tech stack: [detected tech stack]"
)

Wait for Architect agent to complete!
    ↓
STEP 4: Invoke Test-Aware Planner Agent (🚨 MANDATORY - USE TASK TOOL) **NEW in v0.7.0**

YOU MUST USE THE TASK TOOL - DO NOT SKIP:

Task(
  subagent_type: "test-aware-planner",
  description: "Generate tasks with embedded tests",
  prompt: "Create tasks.md with embedded test plans for: [user feature description]

  FIRST, read the increment files:
  - .specweave/increments/{number}-{name}/spec.md (user stories with AC-IDs)
  - .specweave/increments/{number}-{name}/plan.md (technical architecture)

  You MUST create tasks.md with embedded test plans:

  Generate .specweave/increments/{number}-{name}/tasks.md:
  - Parse spec.md for user stories (US1, US2) and AC-IDs (AC-US1-01, etc.)
  - Parse plan.md for technical architecture and test strategy
  - Generate tasks with embedded test plans (NO separate tests.md)
  - Each task includes:
    * Test Plan (Given/When/Then in BDD format)
    * Test Cases (unit/integration/E2E with file paths and function names)
    * Coverage Targets (80-90% overall)
    * Implementation steps
    * TDD workflow (if test_mode: TDD)
  - For non-testable tasks (docs, config): Use Validation section
  - Ensure all AC-IDs from spec.md are covered

  Follow the workflow in plugins/specweave/agents/test-aware-planner/AGENT.md
  Use templates from plugins/specweave/agents/test-aware-planner/templates/

  Tech stack: [detected tech stack]"
)

Wait for test-aware-planner agent to complete!
    ↓
STEP 5: Validate Increment Files
├─ Check .specweave/increments/{number}-{name}/spec.md exists and is complete
├─ Check spec.md contains ALL user stories, requirements, acceptance criteria (with AC-IDs)
├─ Check .specweave/increments/{number}-{name}/plan.md references architecture docs
├─ Check .specweave/increments/{number}-{name}/tasks.md has embedded test plans
├─ Check tasks.md covers ALL AC-IDs from spec.md
├─ Check .specweave/docs/internal/architecture/adr/ has ≥3 ADRs
└─ Check strategy docs (if created) are high-level only (no detailed user stories)
    ↓
✅ SUCCESS: Increment created with spec.md, plan.md, and tasks.md (with embedded tests)
```

### What Gets Created

#### Strategy Docs (Optional, High-Level) ⚠️
```
.specweave/docs/internal/strategy/
└── {module}/                        # ← PM Agent (only if NEW module)
    ├── overview.md                  # High-level product vision, market opportunity
    └── business-case.md             # (optional) ROI, competitive analysis

❌ NO requirements.md (goes in spec.md)
❌ NO user-stories.md (goes in spec.md)
❌ NO success-criteria.md (goes in spec.md)
```

#### Architecture Docs (Living Documentation) ✅
```
.specweave/docs/internal/architecture/
├── system-design.md              # ← Architect updates this
├── adr/                          # ← Architect creates ADRs
│   ├── ####-websocket-vs-polling.md
│   ├── ####-database-choice.md
│   └── ####-deployment-platform.md
├── diagrams/                     # ← Architect creates diagrams
│   └── {module}/
│       ├── system-context.mmd    # C4 Level 1
│       └── system-container.mmd  # C4 Level 2
└── data-models/
    └── {module}-schema.sql
```

#### Increment Files (Source of Truth for Requirements) ✅
```
.specweave/increments/0001-feature-name/
├── spec.md                 # ← PM Agent (COMPLETE requirements, no line limit)
│                           #    Contains: US-001+, AC-*, FR-*, NFR-*, success criteria
├── plan.md                 # ← Architect Agent (technical design, references ADRs)
├── tasks.md                # ← test-aware-planner Agent (tasks with embedded test plans)
│                           #    v0.7.0+: Tests embedded in each task (BDD format)
│                           #    Each task includes: Test Plan, Given/When/Then, test files
└── context-manifest.yaml   # ← increment-planner creates
```

**v0.7.0 Architecture Pivot**: tests.md eliminated, tests are now embedded directly in tasks.md

---

### Validation Rules (MANDATORY)

Before completing feature planning, verify:

**Strategy Docs (Optional)**:
- [ ] If created, `.specweave/docs/internal/strategy/{module}/overview.md` is high-level only
- [ ] No detailed user stories in strategy docs (US-001, etc.)
- [ ] No detailed requirements in strategy docs (FR-001, NFR-001, etc.)
- [ ] Strategy docs provide business context only

**Architecture Docs (Mandatory)**:
- [ ] `.specweave/docs/internal/architecture/adr/` has ≥3 ADRs
- [ ] ADRs follow template (Context, Decision, Alternatives, Consequences)
- [ ] Diagrams created for module (system-context, system-container)

**Increment spec.md (Mandatory)**:
- [ ] `spec.md` contains ALL user stories (US-001, US-002, etc.) with full details
- [ ] `spec.md` contains ALL acceptance criteria (AC-US1-01, etc.)
- [ ] `spec.md` contains ALL requirements (FR-001, NFR-001, etc.)
- [ ] `spec.md` contains success criteria (metrics, KPIs)
- [ ] `spec.md` may reference `../../docs/internal/strategy/{module}/overview.md` for context
- [ ] No line limit on spec.md (be thorough!)

**Increment plan.md (Mandatory)**:
- [ ] `plan.md` references architecture docs (`../../docs/internal/architecture/adr/`)
- [ ] `plan.md` contains technical implementation details

**Increment tasks.md (Mandatory, v0.7.0+)**:
- [ ] `tasks.md` contains tasks with embedded test plans (NO separate tests.md)
- [ ] Each testable task has Test Plan (Given/When/Then)
- [ ] Each testable task has Test Cases (unit/integration/E2E)
- [ ] Coverage targets specified (80-90% overall)
- [ ] ALL AC-IDs from spec.md are covered by tasks
- [ ] Non-testable tasks have Validation section

**Agents Followed Process**:
- [ ] PM Agent scanned existing strategy docs before creating new ones
- [ ] Architect Agent read PM's strategy docs before creating architecture
- [ ] Architect created ADRs for ALL technical decisions
- [ ] test-aware-planner Agent read spec.md and plan.md before creating tasks.md
- [ ] test-aware-planner covered ALL AC-IDs with tasks

---

## Feature Planning Process

### Step 1: Analyze Feature Description

When a user provides a feature description:

1. **Extract Requirements**:
   - What is the core user value?
   - Why is this feature needed?
   - What problem does it solve?

2. **Identify Scope**:
   - What functionality is included?
   - What is explicitly excluded?
   - Are there dependencies?

3. **Determine Priority**:
   - P1 (Critical): Must-have for MVP
   - P2 (Important): High-value enhancement
   - P3 (Nice-to-have): Polish and optimization

### Step 2: Generate Short Name

From feature description, create a short name following these rules:

1. **Extract Keywords**:
   - Remove stop words (the, a, an, for, with, etc.)
   - Identify 2-4 most meaningful words
   - Use action-noun format where possible

2. **Format**:
   - Lowercase
   - Hyphen-separated
   - Max 50 characters
   - Example: `stripe-payment-integration` from "Integrate Stripe payment processing"

3. **Validate**:
   - Check for existing features with similar names
   - Ensure uniqueness
   - Avoid abbreviations unless well-known

### Step 3: Auto-Number Feature

Determine the next feature number:

1. **Scan Existing**:
   - Read `.specweave/increments/` directory
   - Extract all `0001-9999` prefixes (4-digit format)
   - Also check legacy `001-999` formats (3-digit) to prevent conflicts
   - Find highest number

2. **Increment**:
   - Add 1 to highest number
   - Zero-pad to 4 digits (e.g., 0001, 0002, ..., 0010, 0011, ..., 0999, 1000, ..., 9999)

3. **Duplicate Detection**:
   - Check if increment number already exists
   - Throw error if duplicate found (prevents creating 0002 when 0002 exists)
   - This prevents the naming conflict shown in the image where two 0002-* increments existed

4. **Create Path**:
   - Format: `.specweave/increments/0001-short-name/`
   - Example: `.specweave/increments/0003-stripe-payment-integration/`

### Step 4: Create Feature Structure

Generate the complete feature directory with all required files:

```
.specweave/increments/####-short-name/
├── spec.md                 # Feature specification (WHAT and WHY)
├── plan.md                 # Implementation plan (HOW)
├── tasks.md                # Executable tasks (STEPS) with embedded test plans (v0.7.0+)
└── context-manifest.yaml   # Context loading specification
```

**v0.7.0 Change**: tests.md eliminated - tests are now embedded in each task in tasks.md

### Step 5: Generate spec.md

**Purpose**: Define WHAT this feature does and WHY it's needed.

**Structure**:
```yaml
---
feature: 0001-short-name
title: "Human-Readable Feature Title"
priority: P1 | P2 | P3
status: planned
created: YYYY-MM-DD
---

# Feature: [Title]

## Overview
[High-level description of the feature]

## User Value
[Why this feature matters to users]

## User Stories

### US1: [Title] (P1)
**As a** [user type]
**I want** [goal]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] [Specific, measurable criterion]
- [ ] [Another criterion]

### US2: [Title] (P2)
...

## Functional Requirements

### FR-001: [Requirement]
[Detailed description]

### FR-002: [Requirement]
...

## Success Criteria
[Measurable outcomes that define feature success]

## Out of Scope
[What this feature explicitly does NOT include]

## Dependencies
[Other features or systems this depends on]

## References
- [Related specs]
- [Architecture docs]
- [ADRs]
```

**Key Principles**:
- Technology-agnostic (no HOW, only WHAT and WHY)
- Focused on user value
- Measurable acceptance criteria
- Prioritized user stories (P1/P2/P3)

### Step 6: Detect Required Plugins (INTELLIGENT AUTO-LOADING)

**Purpose**: Analyze spec content to identify required SpecWeave plugins and suggest installation.

**Why This Matters**: SpecWeave's plugin system enables context efficiency (70%+ reduction) by loading only relevant capabilities. This step ensures users have the right tools before implementation begins.

**Detection Algorithm**:

1. **Scan spec.md for keywords**:
   ```
   Keywords → Plugin Mapping:
   - "GitHub", "issue", "pull request", "PR" → specweave-github
   - "Kubernetes", "K8s", "Helm", "kubectl" → specweave-kubernetes
   - "Figma", "design system", "design tokens" → specweave-figma
   - "Stripe", "PayPal", "billing", "subscriptions" → specweave-payments
   - "React", "Next.js", "Vue", "Angular" → specweave-frontend
   - "Express", "Fastify", "NestJS", "FastAPI" → specweave-backend
   - "TensorFlow", "PyTorch", "ML", "training" → specweave-ml
   - "Prometheus", "Grafana", "monitoring" → specweave-infrastructure
   - "Playwright", "E2E", "browser tests" → specweave-testing
   - "Mermaid", "C4", "diagrams", "architecture diagrams" → specweave-diagrams
   ```

2. **Check if plugins are already installed**:
   - For Claude Code: Check if plugin available via `/plugin list --installed`
   - Skip already-installed plugins

3. **Suggest installation** (if plugins detected):
   ```
   🔌 This increment requires additional plugins:

   Required:
   • specweave-github - GitHub integration (detected: "sync tasks to GitHub issues")
   • specweave-kubernetes - K8s deployment (detected: "deploy to production cluster")

   Optional:
   • specweave-diagrams - Architecture diagrams (helpful for "system architecture")

   📦 Install plugins:
   /plugin install specweave-github@specweave
   /plugin install specweave-kubernetes@specweave
   /plugin install specweave-diagrams@specweave

   💡 Plugins will auto-activate during implementation!
   ```

4. **Wait for user to install** (don't block, but remind):
   - If user proceeds without installing, remind them before task execution
   - Skills from uninstalled plugins won't be available
   - User can install later: plugins activate on next Claude Code session

**When to Suggest**:
- ✅ After spec.md generation (Step 5 complete)
- ✅ Before plan.md generation (gives context for planning)
- ❌ Don't block increment creation (plugins optional, not required)

**Example Output**:

```
📝 Spec created: .specweave/increments/0007-github-sync/spec.md

🔌 Plugin Detection:
   Detected: "GitHub Issues", "bidirectional sync"
   → Suggested: specweave-github

   To install: /plugin install specweave-github@specweave
   Or continue without it (can install later)

Continue with plan.md generation? [Y/n]
```

**Integration with Existing Workflow**:
- This is a **suggestion step**, not a blocking requirement
- Increment creation continues regardless of plugin installation
- Plugins can be installed any time (they auto-activate when needed)
- This implements the "load on demand" philosophy

### Step 7: Generate plan.md

**Purpose**: Define HOW to implement the feature technically.

**Structure**:
```markdown
# Implementation Plan: [Feature Title]

## Overview
[Technical summary of implementation approach]

## Architecture

### Components
[List major components to build/modify]

### Data Model
[Entities, relationships, schema changes]

### API Contracts
[Endpoints, methods, request/response formats]

### Integration Points
[External services, internal modules]

## Technology Decisions

### Technology Stack
- [Language/framework]
- [Libraries]
- [Tools]

### ADRs Required
- [List architecture decisions to document]

## Implementation Approach

### Phase 1: Foundation
[Setup, infrastructure, base components]

### Phase 2: Core Functionality
[Primary features from P1 user stories]

### Phase 3: Enhancement
[P2 features and optimizations]

### Phase 4: Polish
[P3 features, error handling, edge cases]

## Technical Challenges

### Challenge 1: [Description]
**Solution**: [Approach]
**Risk**: [Mitigation strategy]

## File Structure
```
[Show directory structure of code to create/modify]
```

## Testing Strategy
[High-level testing approach - tests embedded in tasks.md (v0.7.0+)]

## Deployment Considerations
[Infrastructure, environment, rollout]

## Performance Targets
[Response times, throughput, resource usage]

## Security Considerations
[Authentication, authorization, data protection]
```

**Key Principles**:
- Technology-specific (HOW to build it)
- Architectural decisions documented
- Challenges and solutions identified
- Constitutional compliance checked

### Step 8: Generate tasks.md

**Purpose**: Break down implementation into executable steps with intelligent model selection.

**CRITICAL**: Use the model detection utility to assign optimal models to tasks:
```typescript
import { detectModelForTask, formatModelHint } from '../utils/model-selection';
```

**Structure**:
```markdown
# Tasks: [Feature Title]

## Task Notation

- `[T###]`: Sequential task ID
- `[P]`: Parallelizable (no file conflicts)
- `[US#]`: User story reference
- `[ ]`: Not started
- `[x]`: Completed
- Model hints: ⚡ haiku (fast), 🧠 sonnet (thinking), 💎 opus (critical)

## Phase 1: Setup and Foundation

- [ ] [T001] [P] ⚡ haiku - Initialize project structure
- [ ] [T002] [P] ⚡ haiku - Setup testing framework
- [ ] [T003] ⚡ haiku - Install dependencies

## Phase 2: Core Implementation

### US1: [User Story Title] (P1)

- [ ] [T004] ⚡ haiku - Write test for [component]
- [ ] [T005] ⚡ haiku - Implement [component] in src/path/file.ts
- [ ] [T006] [P] ⚡ haiku - Create [another component]
- [ ] [T007] 🧠 sonnet - Integrate components (requires decision-making)
- [ ] [T008] ⚡ haiku - Verify US1 acceptance criteria

### US2: [User Story Title] (P2)

- [ ] [T009] ⚡ haiku - Write test for [feature]
- [ ] [T010] 🧠 sonnet - Implement [feature] (complex logic)
...

## Phase 3: Testing and Validation

- [ ] [T050] Run integration tests
- [ ] [T051] Performance testing
- [ ] [T052] Security review
- [ ] [T053] Documentation update

## Phase 4: Deployment

- [ ] [T060] Prepare deployment scripts
- [ ] [T061] Staging deployment
- [ ] [T062] Production deployment

## Dependencies

T005 depends on T004 (test must exist first)
T007 depends on T005, T006 (components must exist)
T051 depends on T050 (integration must pass first)
```

**Key Principles**:
- Story-centric organization (not layer-centric)
- Test-first sequence (tests before implementation)
- Exact file paths specified
- Parallelizable tasks marked `[P]`
- Dependencies explicitly stated
- **Model hints for cost optimization**: Each task labeled with optimal model
  - ⚡ haiku: Clear instructions, mechanical work (3x faster, 20x cheaper)
  - 🧠 sonnet: Complex decisions, creative problem-solving
  - 💎 opus: Critical architecture (rare, use sparingly)

**Model Selection Guidelines**:
1. **Use Haiku (⚡) when**:
   - Task has specific file path (e.g., `src/components/LoginForm.tsx`)
   - Acceptance criteria are detailed (3+ specific points)
   - Implementation approach is defined in plan.md
   - Simple CRUD operations, configuration, setup tasks

2. **Use Sonnet (🧠) when**:
   - Task requires architecture decisions
   - Multiple valid approaches exist
   - Integration between components
   - Complex business logic
   - Error handling strategies

3. **Use Opus (💎) when**:
   - Critical system architecture
   - Security-critical decisions
   - Performance-critical algorithms
   - Novel problem-solving required

### Step 9: Embed Tests in tasks.md (v0.7.0+ Architecture)

**Purpose**: Ensure every task includes comprehensive test plans directly in tasks.md.

**v0.7.0 Architecture Pivot**: tests.md eliminated. Tests are now embedded in each task for:
- ✅ Closer proximity to implementation (no sync issues)
- ✅ Bidirectional AC↔Task↔Test linking
- ✅ Test-first development (tests defined before implementation)
- ✅ Clear traceability (each task knows its tests)

**Task Structure with Embedded Tests**:
```markdown
### T-001: Implement login API endpoint

**Description**: Create REST API endpoint for user authentication

**References**: AC-US1-01, AC-US1-02

**Implementation Details**:
- Validate email format
- Check password against bcrypt hash
- Generate JWT token
- Return 401 for invalid credentials

**Test Plan**:
- **File**: `tests/unit/auth-service.test.ts`
- **Tests**:
  - **TC-001**: Valid credentials
    - Given valid email and password
    - When POST /api/auth/login
    - Then return 200 with JWT token
  - **TC-002**: Invalid email
    - Given malformed email
    - When POST /api/auth/login
    - Then return 401 with error message
  - **TC-003**: Wrong password
    - Given correct email, wrong password
    - When POST /api/auth/login
    - Then return 401, no details leaked

**Dependencies**: None
**Estimated Effort**: 4 hours
**Status**: [ ] Not Started
```

**Key Features**:
- **References**: Links to acceptance criteria (bidirectional traceability)
- **Test Plan**: Specific test file and test functions
- **BDD Format**: Given/When/Then for clarity
- **Coverage**: Each testable task MUST have test plan

**test-aware-planner Agent**:
- Generates tasks.md with embedded tests
- Ensures 80%+ coverage of testable tasks
- Marks non-testable tasks (documentation, config)
- Uses BDD format throughout

**Validation**:
- Use `/validate-coverage` to check AC and task coverage
- Target: 80-90% coverage (not 100% - diminishing returns)
- Integration with `/done` command (runs validation before completion)

### Step 10: Generate context-manifest.yaml

**Purpose**: Declare exactly what specifications, architecture docs, and ADRs are needed for this feature.

**Structure**:
```yaml
---
# Context Manifest for Feature: 0001-short-name

# Specification sections to load
spec_sections:
  - specs/modules/[relevant-module]/**/*.md
  - specs/constitution.md#[relevant-article]
  - specs/overview.md

# Architecture documents to load
architecture:
  - architecture/system-design.md#[relevant-section]
  - architecture/data/database-schema.md#[relevant-tables]
  - architecture/[component]/[relevant-doc].md

# Architecture Decision Records to reference
adrs:
  - adrs/0001-[relevant-decision].md

# Context budget (max tokens to load)
max_context_tokens: 10000

# Priority level
priority: high | medium | low

# Auto-refresh context on spec changes
auto_refresh: false

# Related features
related_features:
  - 0001-[other-feature]

# Tags for search and categorization
tags:
  - [category]
  - [domain]
---
```

**Key Principles**:
- Precision loading (only what's needed)
- Section-level granularity (e.g., `#authentication-flow`)
- Token budget to prevent bloat
- Related features for dependency tracking

### Step 10: Validate and Finalize

Before completing:

1. **Constitutional Compliance**:
   - Article V: Modular Scalability (proper structure)
   - Article VI: Separation of Concerns (spec vs plan vs tasks)
   - Article IX: Testing Mandate (tests.md comprehensive)

2. **Quality Checks**:
   - spec.md is technology-agnostic
   - plan.md has sufficient technical detail
   - tasks.md has exact file paths
   - tests.md covers all P1 user stories
   - context-manifest.yaml is precise

3. **Update Features Index**:
   - Add feature to `features/README.md`
   - Update current features list

4. **Notify User**:
   - Feature number and path
   - Next steps (review spec, approve plan)
   - How to start implementation

## Best Practices

### Writing Effective Specs

1. **Focus on User Value**:
   - Start with "As a user, I want..."
   - Explain WHY, not just WHAT
   - Measurable success criteria

2. **Prioritize Ruthlessly**:
   - P1: Must-have for MVP
   - P2: Important but not blocking
   - P3: Nice-to-have

3. **Be Specific**:
   - Acceptance criteria are testable
   - Out-of-scope is explicitly defined
   - Dependencies are identified

### Writing Effective Plans

1. **Document Decisions**:
   - Why this technology choice?
   - What alternatives were considered?
   - What are the trade-offs?

2. **Identify Challenges**:
   - Technical risks
   - Complexity areas
   - Mitigation strategies

3. **Show Structure**:
   - File organization
   - Component relationships
   - Integration points

### Writing Effective Tasks

1. **Story-Centric Organization**:
   - Group by user story, not by layer
   - Enables independent implementation
   - Supports incremental delivery

2. **Test-First Sequencing**:
   - Test task before implementation task
   - Enforce TDD workflow
   - Red-green-refactor

3. **Clear Dependencies**:
   - Explicitly state what depends on what
   - Identify parallelizable work
   - Enable concurrent execution

## Example: Creating a Feature

### User Request
"I want to add Stripe payment integration to handle subscriptions"

### Execution

**Step 1**: Analyze
- Core value: Process recurring payments
- Problem: Need subscription billing
- Priority: P1 (required for MVP)

**Step 2**: Short name
- Keywords: stripe, payment, integration
- Format: `stripe-payment-integration`

**Step 3**: Auto-number
- Scan .specweave/increments/: 0001, 0002
- Next: 0003
- Path: `.specweave/increments/0003-stripe-payment-integration/`

**Step 4**: Create structure
```
.specweave/increments/0003-stripe-payment-integration/
├── spec.md
├── plan.md
├── tasks.md
├── tests.md
└── context-manifest.yaml
```

**Step 5**: Generate spec.md
```yaml
---
feature: 003-stripe-payment-integration
title: "Stripe Payment Integration"
priority: P1
status: planned
created: 2025-01-25
---

# Feature: Stripe Payment Integration

## Overview
Integrate Stripe to handle subscription payments...

## User Stories

### US1: Process Subscription Payment (P1)
As a customer
I want to subscribe to a plan
So that I can access premium features

Acceptance Criteria:
- [ ] Customer can select subscription plan
- [ ] Payment processed via Stripe
- [ ] Subscription activated on success
...
```

**Step 6**: Generate plan.md
```markdown
# Implementation Plan: Stripe Payment Integration

## Technology Decisions
- Stripe SDK: stripe-node v11.x
- Backend: Express.js middleware
- Frontend: Stripe Elements

## Components
- StripeService: Payment processing
- SubscriptionController: API endpoints
- WebhookHandler: Stripe events
...
```

**Step 7**: Generate tasks.md
```markdown
# Tasks: Stripe Payment Integration

## Phase 2: Core Implementation

### US1: Process Subscription Payment (P1)

- [ ] [T001] Write test for StripeService.createSubscription()
- [ ] [T002] Implement StripeService in src/services/stripe-service.ts
- [ ] [T003] [P] Create SubscriptionController in src/controllers/subscription.ts
...
```

**Step 8**: Generate tests.md
```markdown
# Test Strategy: Stripe Payment Integration

## Test Cases

### TC-001: Successful Subscription Creation
Type: Integration
Priority: P1
User Story: US1

Scenario:
- Given a valid customer and plan ID
- When createSubscription() is called
- Then subscription is created in Stripe
- And webhook confirms activation
...
```

**Step 9**: Generate context-manifest.yaml
```yaml
spec_sections:
  - specs/modules/payments/overview.md
  - specs/modules/payments/stripe/spec.md
architecture:
  - architecture/data/database-schema.md#subscriptions
adrs:
  - adrs/005-payment-provider-choice.md
max_context_tokens: 8000
priority: high
```

**Step 10**: Validate
- ✅ spec.md is technology-agnostic
- ✅ plan.md documents Stripe SDK choice
- ✅ tasks.md follows test-first
- ✅ tests.md covers all P1 stories
- ✅ Constitutional compliance verified

**Output**:
```
✅ Feature created: 0003-stripe-payment-integration

Location: .specweave/increments/0003-stripe-payment-integration/
Files created:
- spec.md
- plan.md
- tasks.md
- tests.md
- context-manifest.yaml

Next steps:
1. Review spec.md - verify user stories and acceptance criteria
2. Approve plan.md - validate technical approach
3. Start implementation: specweave implement 0003
```

## Helper Scripts

### `scripts/create-feature.js`

Creates feature directory structure and generates all files.

**Usage**:
```javascript
const featurePlanner = require('./create-feature.js');

const feature = await featurePlanner.createFeature({
  description: "Add Stripe payment integration",
  priority: "P1",
  # Configuration auto-detected
});

console.log(`Created: .specweave/increments/${feature.number}-${feature.shortName}/`);
```

### `scripts/generate-short-name.js`

Generates short names from descriptions.

**Usage**:
```javascript
const { generateShortName } = require('./generate-short-name.js');

const shortName = generateShortName("Integrate Stripe payment processing");
// Returns: "stripe-payment-integration"
```

### `scripts/next-feature-number.js`

Determines next available feature number.

**Usage**:
```javascript
const { getNextFeatureNumber } = require('./feature-utils.js');

const next = getNextFeatureNumber(".specweave/increments/");
// Returns: "0003"
```

## Constitutional Compliance

This skill enforces:

- **Article V**: Modular Scalability - Auto-numbered features prevent conflicts
- **Article VI**: Separation of Concerns - spec vs plan vs tasks are distinct
- **Article IX**: Skill Testing Mandate - tests.md ensures comprehensive testing

## Integration with Other Skills

- **context-loader**: Uses context manifests to load relevant specs
- **spec-author**: Collaborates on specification creation
- **architect**: Collaborates on technical planning
- **developer**: Consumes tasks.md for implementation
- **docs-updater**: Updates features/README.md automatically

## Troubleshooting

### Issue: Feature number conflict
**Solution**: The `incrementNumberExists()` function now prevents this by checking for duplicate numbers before creating new increments. If you see this error, use `getNextFeatureNumber()` to get the next available number.

### Issue: Short name too long
**Solution**: Use abbreviations for well-known terms (e.g., auth, api, db)

### Issue: Context manifest too broad
**Solution**: Use section anchors (e.g., `#specific-section`) instead of full files

### Issue: Legacy 3-digit increments (001, 002, 003)
**Solution**: The utility now detects both 3-digit and 4-digit formats to prevent conflicts. New increments always use 4-digit format (0001-9999).

---

This skill ensures every SpecWeave feature is properly planned, structured, and ready for implementation with constitutional compliance and best practices built-in.
