---
name: increment-planner
description: Creates comprehensive implementation plans for ANY type of SpecWeave increment (feature, hotfix, bug, change-request, refactor, experiment). Supports all work types from features to bug investigations to POCs. Activates for: increment planning, feature planning, hotfix, bug investigation, root cause analysis, SRE investigation, change request, refactor, POC, prototype, spike work, experiment, implementation plan, create increment, organize work, break down work, new product, build project, MVP, SaaS, app development, tech stack planning, production issue, critical bug, stakeholder request.
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

The increment-planner skill automates the creation of implementation plans for ANY type of work:
- Auto-numbered increment directories (`0001-9999` 4-digit format)
- Duplicate detection (prevents creating 0002 when 0002 already exists)
- Complete increment artifacts (spec.md, plan.md, tasks.md with embedded tests, **metadata.json**)
- Proper context manifests for selective loading
- Constitutional compliance
- Separation of WHAT/WHY (spec) from HOW (plan) from STEPS (tasks with test plans)
- **v0.7.0+**: Test-Aware Planning (bidirectional AC↔Task↔Test linking)
- **v0.8.0+**: Multi-Project Support (specs organized by project/team)
- **v0.18.0+**: Bidirectional Task↔User Story Linking (automatic during `/specweave:done`)
- **v0.24.5+**: **MANDATORY metadata.json creation** (enables status tracking, WIP limits, external tool sync)

## Bidirectional Linking (v0.18.0+)

**CRITICAL FEATURE**: When you create tasks, ensure they have **AC**: fields so bidirectional links can be created automatically.

### How It Works

1. **During Planning**: Create tasks with AC-IDs
   ```markdown
   ## T-001: Implement User Login

   **AC**: AC-US1-01, AC-US1-02, AC-US1-03   ← CRITICAL!
   ```

2. **During Completion**: `/specweave:done` automatically:
   - Extracts user stories to `.specweave/docs/internal/specs/{project}/{feature}/`
   - Parses tasks.md for AC-IDs
   - **Injects bidirectional links** into tasks.md
   - Creates complete traceability (Tasks ↔ User Stories)

3. **Result**: Tasks now link back to user stories:
   ```markdown
   ## T-001: Implement User Login

   **User Story**: [US-001: User Authentication](../../docs/internal/specs/default/auth-service/us-001-user-authentication.md)

   **AC**: AC-US1-01, AC-US1-02, AC-US1-03
   ```

### Requirements

**MUST HAVE** for bidirectional linking:
- ✅ Tasks with **AC**: field
- ✅ AC-IDs in format: `AC-US{number}-{criteria}` (e.g., `AC-US1-01`)
- ✅ Matching user stories in spec.md (e.g., `### US-001:` or `#### US-001:`)

**Multi-Project Support**:
- Works with `specs/default/`, `specs/backend/`, `specs/frontend/`, etc.
- Paths automatically adapt to project structure
- No additional configuration needed

### Benefits

- ✅ **Complete Traceability**: Navigate from tasks to user stories and back
- ✅ **Automatic**: Zero manual linking during `/specweave:done`
- ✅ **LLM-Friendly**: AI can understand relationships bidirectionally
- ✅ **Multi-Project Aware**: Works across all projects

**For complete details**: See `.specweave/docs/public/guides/bidirectional-linking.md`

## Increment Types (v0.7.0+)

**Increments can be any type of work**, not just features. SpecWeave supports six types:

| Type | Description | Use When | Limit |
|------|-------------|----------|-------|
| **feature** | Standard feature development | Adding new functionality | Max 2 active |
| **hotfix** | Critical production fixes | Production is broken | Unlimited |
| **bug** | Production bugs with SRE investigation | Bug requires root cause analysis | Unlimited |
| **change-request** | Stakeholder requests | Business requirements change | Max 2 active |
| **refactor** | Code improvement | Technical debt, code quality | Max 1 active |
| **experiment** | POC/spike work | Exploring options, prototypes | Unlimited* |

**Examples**:
- **Feature**: "Add user authentication", "Implement payment processing"
- **Hotfix**: "Fix critical security vulnerability CVE-2024-1234"
- **Bug**: "Investigate memory leak in production API", "Performance degradation in checkout flow"
- **Change Request**: "Redesign dashboard per stakeholder feedback"
- **Refactor**: "Extract service layer from monolith", "Migrate to TypeScript"
- **Experiment**: "Evaluate GraphQL vs REST", "Prototype real-time collaboration"

**Key Insight**: The increment structure (spec.md, plan.md, tasks.md) works for ALL types. Even a bug investigation needs:
- **spec.md**: What's broken? Expected vs actual behavior? Impact?
- **plan.md**: Investigation approach, tools, hypothesis
- **tasks.md**: Investigation steps, fix implementation, verification

## When to Use This Skill

Use this skill when:
- **Features**: Creating new functionality from a description
- **Hotfixes**: Planning urgent production fixes
- **Bugs**: Structuring SRE investigations and root cause analysis
- **Change Requests**: Organizing stakeholder-driven changes
- **Refactors**: Planning code improvement work
- **Experiments**: Structuring POCs and technical spikes
- **Brownfield**: Structuring modifications to existing codebases

## When NOT to Use This Skill

Do NOT activate if:
- ❌ User is asking general questions about SpecWeave (use documentation instead)
- ❌ Another skill (e.g., `project-kickstarter`) is already handling the request
- ❌ User is already in an active increment planning workflow
- ❌ Increment files (spec.md, plan.md, tasks.md) are currently being created

---

## Increment Naming Convention

**CRITICAL**: All increments MUST use descriptive names, not just numbers.

**Format**: `####-descriptive-kebab-case-name`

**Examples**:
- ✅ `0001-core-framework`
- ✅ `0002-core-enhancements`
- ✅ `0003-intelligent-model-selection`
- ❌ `0003` (too generic, rejected)
- ❌ `0004` (no description, rejected)

**Rationale**:
- **Clear intent at a glance** - "0003-intelligent-model-selection" tells you exactly what it does
- **Easy to reference** - "the model selection increment" vs "increment 3"
- **Better git history** - Commit messages naturally include feature name
- **Searchable by feature** - `git log --grep="model-selection"` works
- **Self-documenting** - Increment folders are readable without opening files

**Rules**:
- `####` = Zero-padded 4-digit number (0001, 0002, 0003, ...)
- `-descriptive-name` = Kebab-case description (lowercase, hyphens)
- Max 50 chars total (for readability)
- No special characters except hyphens

**When Creating Increments**:
```bash
# ❌ Wrong
/specweave:increment "0004"

# ✅ Correct
/specweave:increment "0004-cost-optimization"
/specweave:increment "0005-github-sync-enhancements"
```

**Enforcement**:
- `/specweave:increment` command validates naming (rejects bare numbers)
- Code review requirement (descriptive names mandatory)

---

## 🔗 External Sync Architecture (CRITICAL)

**Source of Truth**: `.specweave/docs/specs/` (LOCAL) is the permanent source of truth. External tools (GitHub, Jira, ADO) are **MIRRORS**.

**Correct sync direction**:
```
✅ CORRECT:
.specweave/  ↔  GitHub Issues    (Local ↔ External)
.specweave/  ↔  Jira Epics       (Local ↔ External)
.specweave/  ↔  ADO Work Items   (Local ↔ External)

❌ WRONG:
GitHub  ↔  Jira                  (External ↔ External - NO!)
```

**When invoking PM agent**: Ensure it understands sync is **Local ↔ External**, not External ↔ External!

## Activation Triggers

This skill activates automatically when users say:
- **Features**: "Plan a feature for...", "Create implementation plan for..."
- **Hotfixes**: "Fix critical bug in production", "Emergency security patch"
- **Bugs**: "Investigate memory leak", "Debug performance issue", "Root cause analysis for..."
- **Change Requests**: "Stakeholder requested...", "Business wants to change..."
- **Refactors**: "Refactor...", "Extract service layer", "Improve code quality"
- **Experiments**: "Prototype...", "Evaluate...", "POC for...", "Spike work"
- **General**: "Create increment for...", "Help me structure [work]", "Break down this work: ..."

---

## 🆕 Multi-Project Support (v0.8.0+ | Flattened v0.16.11+)

**Key Changes**:
- ✅ **CORRECT** (v0.16.11+): Specs organized with FLATTENED structure: `.specweave/docs/internal/specs/{project-id}/`
- ❌ **OLD** (v0.8.0-v0.16.10): `.specweave/docs/internal/projects/{project-id}/specs/` (DEPRECATED nested structure)
- Use `ProjectManager` (from `src/core/project-manager.ts`) to get correct paths (always returns flattened structure)
- Single project uses `specs/default/` automatically (transparent)
- Multi-project mode allows multiple teams/repos
- Parent repo content goes to `specs/_parent/` (for multi-repo setups with parent repositories)

**Path Resolution**:
```typescript
import { ProjectManager } from '../../core/project-manager';

const projectManager = new ProjectManager(projectRoot);
const activeProject = projectManager.getActiveProject();

// Get correct paths for active project (flattened structure v0.16.11+)
const specsPath = projectManager.getSpecsPath();  // specs/{activeProject.id}/
const modulesPath = projectManager.getModulesPath();  // modules/{activeProject.id}/
const teamPath = projectManager.getTeamPath();  // team/{activeProject.id}/
```

**In PM Agent Instructions**:
- DO NOT hardcode `.specweave/docs/internal/specs/`
- USE ProjectManager to get correct path for active project
- Living docs are created via `/specweave:sync-docs update` (not manually):
  - Feature overviews: `.specweave/docs/internal/specs/_features/FS-{number}/FEATURE.md`
  - User stories: `.specweave/docs/internal/specs/{project}/FS-{number}/us-{id}-{slug}.md`

---

## ⚠️ CRITICAL: Living Documentation Workflow

**MANDATORY**: Feature planner must orchestrate **BOTH** living docs and increment files.

### Correct Workflow (MUST FOLLOW)

```
User: "I want to build real-time price tracking"
    ↓
increment-planner skill
    ↓
STEP 1: Determine increment number and check for duplicates
├─ Use the Bash tool to run: node plugins/specweave/skills/increment-planner/scripts/feature-utils.js next
├─ Get next available increment number (e.g., "0021")
├─ Get short name from user description
├─ Check if increment already exists using: node plugins/specweave/skills/increment-planner/scripts/feature-utils.js check-increment {number}
└─ If duplicate found, STOP and tell user: "Increment {number} already exists! Please use the existing increment."
    ↓
STEP 2: Scan existing docs
├─ Read .specweave/docs/internal/strategy/ (existing requirements)
├─ Read .specweave/docs/internal/architecture/adr/ (existing decisions)
└─ Pass existing context to agents
    ↓
STEP 3: Invoke PM Agent (🚨 MANDATORY - USE TASK TOOL)

YOU MUST USE THE TASK TOOL - DO NOT SKIP:

Task(
  subagent_type: "specweave:pm:pm",
  description: "PM product strategy",
  prompt: "Create product strategy for: [user feature description]

  Context from existing docs: [summary of strategy docs from Step 1]

  You MUST create living Spec (living docs - source of truth) AND optionally create increment spec.md:

  1. Spec (living docs - SOURCE OF TRUTH, permanent):
     - IMPORTANT: Living docs are created via `/specweave:sync-docs update` (not manually)
     - Structure (v0.18.0+ - three-layer architecture):
       * Feature overview: `.specweave/docs/internal/specs/_features/FS-{number}/FEATURE.md`
       * User stories: `.specweave/docs/internal/specs/{project}/FS-{number}/us-*.md`
     - This is the COMPLETE, PERMANENT source of truth
     - Include ALL of:
       * User stories (US-001, US-002, etc.) with full details
       * Acceptance criteria (AC-US1-01, etc.)
       * Functional requirements (FR-001, etc.)
       * Non-functional requirements (NFR-001, etc.)
       * Success criteria (metrics, KPIs)
       * Test strategy
     - This spec can be linked to Jira/ADO/GitHub Issues
     - Spec persists even after increment completes
     - No line limit (be thorough, this is source of truth)

  2. Strategy docs (optional, high-level ONLY):
     - IF this is a NEW module/product, create:
       .specweave/docs/internal/strategy/{module-name}/
       * overview.md (high-level product vision, market opportunity, personas)
       * business-case.md (optional - ROI, competitive analysis)
     - IMPORTANT:
       * ❌ NO detailed user stories (those go in living spec.md)
       * ❌ NO detailed requirements (those go in living spec.md)
       * ❌ NO acceptance criteria (those go in living spec.md)
       * ✅ ONLY strategic, high-level business context

  3. Increment spec.md (optional, can duplicate living spec):
     - Create .specweave/increments/{number}-{name}/spec.md
     - This CAN duplicate content from living spec.md (temporary reference - that's OK!)
     - OR it can just reference the spec: \"See [FS-{number}](../../docs/internal/specs/_features/FS-{number}/FEATURE.md) for complete requirements\"
     - Increment spec.md may be deleted after increment completes
     - Living spec.md persists as permanent documentation

  Tech stack: [detected tech stack]"
)

Wait for PM agent to complete!
    ↓
STEP 4: Invoke Architect Agent (🚨 MANDATORY - USE TASK TOOL)

YOU MUST USE THE TASK TOOL - DO NOT SKIP:

Task(
  subagent_type: "specweave:architect:architect",
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
STEP 5: Invoke Test-Aware Planner Agent (🚨 MANDATORY - USE TASK TOOL)

YOU MUST USE THE TASK TOOL - DO NOT SKIP:

Task(
  subagent_type: "specweave:test-aware-planner:test-aware-planner",
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
STEP 6: Validate Living Docs and Increment Files
├─ Check `.specweave/docs/internal/specs/_features/FS-{number}/FEATURE.md` exists (SOURCE OF TRUTH)
├─ Check living spec.md contains ALL user stories, requirements, AC-IDs (with AC-IDs)
├─ Check .specweave/docs/internal/architecture/adr/ has ≥3 ADRs
├─ Check strategy docs (if created) are high-level only (no detailed user stories)
├─ Check .specweave/increments/{number}-{name}/spec.md references or duplicates living spec
├─ Check .specweave/increments/{number}-{name}/plan.md references architecture docs
├─ Check .specweave/increments/{number}-{name}/tasks.md has embedded test plans
└─ Check tasks.md covers ALL AC-IDs from living spec.md
    ↓
✅ SUCCESS: Living spec created (permanent), increment created (temporary)
```

### What Gets Created

#### Living Spec (Living Docs - Source of Truth) ✅
```
.specweave/docs/internal/specs/
├── _features/                       # ← Cross-project feature overviews (v0.18.0+)
│   └── FS-{number}/
│       └── FEATURE.md               # ← Feature summary (created via sync-docs)
└── {project-id}/                    # ← Project-specific user stories
    └── FS-{number}/
        ├── README.md                # ← Project context
        └── us-*.md                  # ← User story details (created via sync-docs)
                                     # COMPLETE user stories, AC, requirements
                                     # This is the PERMANENT source of truth
                                     # Can be linked to Jira/ADO/GitHub Issues
                                     # Persists after increment completes

# Examples (v0.18.0+ Three-Layer):
# Feature overview: specs/_features/FS-001/FEATURE.md
# User stories: specs/specweave/FS-001/us-001-user-auth.md, us-002-password-reset.md
#               specs/mobile/FS-002/us-001-push-notifications.md
#               specs/backend/FS-003/us-001-api-auth.md

# OLD (v0.17.x): specs/{project}/spec-{number}-{name}.md ← DEPRECATED
# OLD (v0.8.0-v0.16.10): projects/default/specs/... ← DEPRECATED
```

#### Strategy Docs (Optional, High-Level) ⚠️
```
.specweave/docs/internal/strategy/
└── {module}/                        # ← PM Agent (only if NEW module)
    ├── overview.md                  # High-level product vision, market opportunity
    └── business-case.md             # (optional) ROI, competitive analysis

❌ NO requirements.md (goes in living spec.md)
❌ NO user-stories.md (goes in living spec.md)
❌ NO success-criteria.md (goes in living spec.md)
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

#### Increment Files (Temporary Implementation Tracker) ✅
```
.specweave/increments/0001-feature-name/
├── spec.md                 # ← PM Agent (CAN duplicate living spec.md - temporary reference)
│                           #    OR just reference: "See SPEC-0001-feature-name"
│                           #    May be deleted after increment completes
├── plan.md                 # ← Architect Agent (technical design, references ADRs)
├── tasks.md                # ← test-aware-planner Agent (tasks with embedded test plans)
│                           #    v0.7.0+: Tests embedded in each task (BDD format)
│                           #    Each task includes: Test Plan, Given/When/Then, test files
└── context-manifest.yaml   # ← increment-planner creates
```

**v0.7.0 Architecture Pivot**: tests.md eliminated, tests are now embedded directly in tasks.md

**Key Difference**:
- **Living spec.md** = Permanent source of truth (persists after increment)
- **Increment spec.md** = Temporary reference (can be deleted after increment)

---

### Validation Rules (MANDATORY)

Before completing feature planning, verify:

**Living Spec (Living Docs - Source of Truth, Mandatory)**:
- [ ] `.specweave/docs/internal/specs/_features/FS-{number}/FEATURE.md` exists (created via sync-docs)
- [ ] Living spec.md contains ALL user stories (US-001, US-002, etc.) with full details
- [ ] Living spec.md contains ALL acceptance criteria (AC-US1-01, etc.)
- [ ] Living spec.md contains ALL requirements (FR-001, NFR-001, etc.)
- [ ] Living spec.md contains success criteria (metrics, KPIs)
- [ ] Living spec.md may reference `../../strategy/{module}/overview.md` for context
- [ ] No line limit on living spec.md (be thorough - this is permanent!)

**Strategy Docs (Optional)**:
- [ ] If created, `.specweave/docs/internal/strategy/{module}/overview.md` is high-level only
- [ ] No detailed user stories in strategy docs (US-001, etc. - those go in Spec)
- [ ] No detailed requirements in strategy docs (FR-001, NFR-001, etc. - those go in Spec)
- [ ] Strategy docs provide business context only (market, opportunity, personas)

**Architecture Docs (Mandatory)**:
- [ ] `.specweave/docs/internal/architecture/adr/` has ≥3 ADRs
- [ ] ADRs follow template (Context, Decision, Alternatives, Consequences)
- [ ] Diagrams created for module (system-context, system-container)

**Increment spec.md (Optional - can duplicate living spec)**:
- [ ] `spec.md` either duplicates living spec.md OR references it ("See [FS-{number}](../../docs/internal/specs/_features/FS-{number}/FEATURE.md)")
- [ ] If duplicated, content matches living spec.md

**Increment plan.md (Mandatory)**:
- [ ] `plan.md` references architecture docs (`../../docs/internal/architecture/adr/`)
- [ ] `plan.md` contains technical implementation details

**Increment tasks.md (Mandatory, v0.7.0+)**:
- [ ] `tasks.md` contains tasks with embedded test plans (NO separate tests.md)
- [ ] Each testable task has Test Plan (Given/When/Then)
- [ ] Each testable task has Test Cases (unit/integration/E2E)
- [ ] Coverage targets specified (80-90% overall)
- [ ] ALL AC-IDs from Spec spec.md are covered by tasks
- [ ] Non-testable tasks have Validation section

**Agents Followed Process**:
- [ ] PM Agent created Spec spec.md as permanent source of truth
- [ ] PM Agent scanned existing strategy docs before creating new ones
- [ ] Architect Agent read Spec spec.md before creating architecture
- [ ] Architect created ADRs for ALL technical decisions
- [ ] test-aware-planner Agent read Spec spec.md and plan.md before creating tasks.md
- [ ] test-aware-planner covered ALL AC-IDs from Spec with tasks

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
├── metadata.json           # Increment metadata (MANDATORY - v0.24.5+)
└── context-manifest.yaml   # Context loading specification
```

**v0.7.0 Change**: tests.md eliminated - tests are now embedded in each task in tasks.md

**⚠️ CRITICAL (v0.24.5+)**: `metadata.json` is **MANDATORY** regardless of invocation method (natural language prompt or `/specweave:increment`). Without it:
- ❌ Status line shows nothing (no active increment tracking)
- ❌ WIP limits don't work (can't count active increments)
- ❌ External sync breaks (no GitHub/JIRA/ADO links)
- ❌ All increment management commands fail (`/status`, `/pause`, `/resume`, `/done`)

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

### Step 6: Check PM Tool Configuration (PM SYNC)

**Purpose**: Check if external PM tool sync is configured for automatic increment tracking.

**Why This Matters**: PM tool integration enables automatic sync of increment progress to external systems (GitHub Issues, Jira, Azure DevOps).

**⚠️ NOTE**: All SpecWeave plugins (19+) are already installed during `specweave init`. No plugin detection or installation needed!

**Check External PM Tool Configuration**:

1. **Read `.specweave/config.json`**:
   - If `externalPM.enabled = true` and `externalPM.tool` is set:
     - Corresponding plugin is already installed (specweave-github, specweave-jira, or specweave-ado)
     - Prepare to auto-create external issue/work item after increment creation
   - If `externalPM.enabled = false` or not configured:
     - Skip PM tool sync (local-only mode)

2. **Auto-Sync to PM Tool** (v0.8.0+):

   **🚨 CRITICAL: SpecWeave Repo Dog-Food Requirement**:
   - IF repo = "anton-abyzov/specweave"
     - Read `.specweave/config.json`
     - Check: `plugins.settings.specweave-github.repo = "anton-abyzov/specweave"`
     - IF NOT configured → ❌ **HARD ERROR** (block increment creation):
       ```
       ❌ SpecWeave repo MUST use GitHub sync!

       This is a "dog food" requirement (ADR-0007):
       - SpecWeave demonstrates its own features
       - GitHub Issues show public progress
       - Community can track development

       Fix: Create .specweave/config.json with GitHub settings
       See: CLAUDE.md for config structure
       ```
     - IF configured → Continue to auto-sync (required)

   **For All Other Repos** (normal behavior):
   - **If PM tool configured and plugin installed**:
     ```
     🔗 External PM Tool Sync:
        Tool: GitHub Issues
        Auto-sync: Enabled

     Creating GitHub issue for increment 0007-user-authentication...
     ✅ GitHub Issue #42 created
        URL: https://github.com/myorg/myapp/issues/42
        Linked to: .specweave/increments/0007-user-authentication/metadata.json

     Progress will sync automatically after each task completion!
     ```
   - **If PM tool configured but plugin NOT installed**:
     ```
     ⚠️  External PM Tool Configured: GitHub Issues
        Plugin missing: specweave-github

     To enable auto-sync: /plugin install specweave-github
     Or continue without PM sync (local-only mode)
     ```
   - **If PM tool not configured**:
     ```
     ℹ️  No external PM tool configured (local-only mode)
        To enable GitHub/Jira/ADO sync: Run project initialization or update config
     ```

6. **Wait for user to install** (don't block, but remind):
   - If user proceeds without installing, remind them before task execution
   - Skills from uninstalled plugins won't be available
   - User can install later: plugins activate on next Claude Code session

**When to Execute**:
- ✅ After spec.md generation (Step 5 complete)
- ✅ Before plan.md generation (gives context for planning)
- ✅ After ALL increment files created (spec.md, plan.md, tasks.md)
- ❌ Don't block increment creation (plugins optional, not required)

**Example Output (Full Flow)**:

```
📝 Increment created: 0007-user-authentication

Files:
• spec.md (user stories, acceptance criteria)
• plan.md (technical architecture)
• tasks.md (implementation steps with embedded tests)

🔗 External PM Tool Sync:
   Tool: GitHub Issues
   Plugin: specweave-github ✅ Installed

   Creating GitHub issue...
   ✅ Issue #42 created: "Increment 0007: User Authentication"
      URL: https://github.com/myorg/myapp/issues/42

   Auto-sync enabled:
   • Progress updates posted after each task completion
   • Issue closed automatically when increment done

Next steps:
1. Review spec.md - verify user stories
2. Approve plan.md - validate architecture
3. Start work: /specweave:do
```

**Integration with Existing Workflow**:
- All plugins are already installed during `specweave init` (no detection needed)
- PM tool sync is **automatic** if configured (zero manual intervention)
- Increment creation continues regardless of PM tool status
- This implements the "seamless integration" philosophy

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

### Step 11: Generate metadata.json (⚠️ MANDATORY - v0.24.5+)

**Purpose**: Create increment metadata for status tracking, WIP limits, and external tool sync.

**CRITICAL**: This step is **NON-NEGOTIABLE** regardless of how the increment was created (natural language prompt, `/specweave:increment`, or any other method).

**Execution Workflow (MUST USE TOOLS)**:

**STEP 1: Check if metadata.json exists**
```
Use Read tool:
file_path: .specweave/increments/{incrementId}/metadata.json
```

**STEP 2: If missing (file not found), create it immediately**
```
Use Write tool:
file_path: .specweave/increments/{incrementId}/metadata.json
content: {
  "id": "{incrementId}",
  "status": "planned",
  "type": "{type}",
  "priority": "{priority}",
  "created": "{ISO-8601-timestamp}",
  "lastActivity": "{ISO-8601-timestamp}",
  "testMode": "TDD",
  "coverageTarget": 95,
  "feature_id": null,
  "epic_id": null,
  "externalLinks": {}
}
```

**Field Extraction (from spec.md frontmatter)**:
- `id`: Increment directory name (e.g., "0001-user-authentication")
- `type`: Extract from `type:` in spec.md frontmatter OR default to "feature"
- `priority`: Extract from `priority:` in spec.md frontmatter OR default to "P1"
- `created`/`lastActivity`: Current timestamp in ISO-8601 format (e.g., "2025-11-22T19:30:00Z")
- `testMode`: Extract from `test_mode:` in spec.md frontmatter OR default to "TDD"
- `coverageTarget`: Extract from `coverage_target:` in spec.md frontmatter OR default to 95

**STEP 3: Validate creation succeeded**
```
Use Read tool again:
file_path: .specweave/increments/{incrementId}/metadata.json
```

If Read succeeds, output:
```
✅ metadata.json created successfully
   Status: planned
   Type: {type}
   Ready for /specweave:do
```

**Why This Cannot Be Skipped**:
Without metadata.json, the increment is **effectively broken**:
- Status line won't show it as active
- WIP limit enforcement fails (infinite increments possible!)
- All increment commands fail (`/status`, `/pause`, `/resume`, `/done`)
- External tool sync (GitHub/JIRA/ADO) completely broken
- Hooks can't detect the increment

**Example metadata.json**:
```json
{
  "id": "0001-user-authentication",
  "status": "planned",
  "type": "feature",
  "priority": "P1",
  "created": "2025-11-22T19:30:00Z",
  "lastActivity": "2025-11-22T19:30:00Z",
  "testMode": "TDD",
  "coverageTarget": 95,
  "feature_id": null,
  "epic_id": null,
  "externalLinks": {}
}
```

**⚠️ ENFORCEMENT**: If you complete increment creation without creating metadata.json, you have **failed the task**. This is not optional.

### Step 12: Validate and Finalize

Before completing:

1. **Constitutional Compliance**:
   - Article V: Modular Scalability (proper structure)
   - Article VI: Separation of Concerns (spec vs plan vs tasks)
   - Article IX: Testing Mandate (tasks.md with embedded tests comprehensive)

2. **Quality Checks**:
   - spec.md is technology-agnostic
   - plan.md has sufficient technical detail + test strategy
   - tasks.md has exact file paths + embedded test plans (BDD format)
   - tasks.md covers all P1 AC-IDs with test cases
   - **metadata.json exists and is valid** (v0.24.5+ MANDATORY)
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

**Step 4**: Create structure (v0.7.0+)
```
.specweave/increments/0003-stripe-payment-integration/
├── spec.md                  # WHAT & WHY
├── plan.md                  # HOW + test strategy
├── tasks.md                 # Implementation + embedded tests (BDD)
└── context-manifest.yaml    # Context loading config
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

**Step 8**: Invoke test-aware-planner Agent (v0.7.0+)
```typescript
// Use Task tool to invoke test-aware-planner agent
Task({
  subagent_type: "specweave:test-aware-planner:test-aware-planner",
  description: "Generate tasks with embedded tests",
  prompt: `Create tasks.md with embedded test plans for Stripe payment integration.

  Read increment files:
  - .specweave/increments/0003-stripe-payment-integration/spec.md
  - .specweave/increments/0003-stripe-payment-integration/plan.md

  Generate tasks.md with:
  - BDD test plans (Given/When/Then) per task
  - Test cases (unit/integration/E2E with file paths)
  - Coverage targets (80-90% overall)
  - AC-ID traceability from spec.md`
});
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

**Step 10**: Generate metadata.json (⚠️ MANDATORY v0.24.5+)
```typescript
// Use Read tool to check if exists
Read({ file_path: ".specweave/increments/0003-stripe-payment-integration/metadata.json" });

// If missing, use Write tool to create
Write({
  file_path: ".specweave/increments/0003-stripe-payment-integration/metadata.json",
  content: JSON.stringify({
    "id": "0003-stripe-payment-integration",
    "status": "planned",
    "type": "feature",
    "priority": "P1",
    "created": "2025-11-22T19:30:00Z",
    "lastActivity": "2025-11-22T19:30:00Z",
    "testMode": "TDD",
    "coverageTarget": 95,
    "feature_id": null,
    "epic_id": null,
    "externalLinks": {}
  }, null, 2)
});

// Validate creation succeeded
Read({ file_path: ".specweave/increments/0003-stripe-payment-integration/metadata.json" });
```

**Step 11**: Validate
- ✅ spec.md is technology-agnostic with AC-IDs
- ✅ plan.md documents Stripe SDK choice + test strategy
- ✅ tasks.md has embedded test plans (BDD format)
- ✅ tasks.md covers all P1 AC-IDs with tests
- ✅ **metadata.json exists and is valid** (v0.24.5+ MANDATORY)
- ✅ Constitutional compliance verified

**Output**:
```
✅ Feature created: 0003-stripe-payment-integration

Location: .specweave/increments/0003-stripe-payment-integration/
Files created:
- spec.md (12 user stories, 34 AC-IDs)
- plan.md (5 phases, architecture diagrams, test strategy)
- tasks.md (23 tasks with embedded tests, 85% coverage target)
- metadata.json ✅ (status: planned, type: feature)
- context-manifest.yaml

Next steps:
1. Review spec.md - verify user stories and acceptance criteria
2. Approve plan.md - validate technical approach
3. Start implementation: /specweave:do 0003
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
- **Article IX**: Testing Mandate - tasks.md with embedded tests ensures comprehensive testing (v0.7.0+)

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
