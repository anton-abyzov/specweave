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
- Complete increment artifacts (spec.md, plan.md, tasks.md with embedded tests)
- Proper context manifests for selective loading
- Constitutional compliance
- Separation of WHAT/WHY (spec) from HOW (plan) from STEPS (tasks with test plans)
- **v0.7.0+**: Test-Aware Planning (bidirectional AC↔Task↔Test linking)
- **v0.8.0+**: Multi-Project Support (specs organized by project/team)

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

## 🆕 Multi-Project Support (v0.8.0+)

**Key Changes**:
- Specs are now organized by project: `.specweave/docs/internal/projects/{project-id}/specs/`
- Use `ProjectManager` (from `src/core/project-manager.ts`) to get correct paths
- Single project uses `projects/default/` automatically (transparent)
- Multi-project mode allows multiple teams/repos

**Path Resolution**:
```typescript
import { ProjectManager } from '../../core/project-manager';

const projectManager = new ProjectManager(projectRoot);
const activeProject = projectManager.getActiveProject();

// Get correct paths for active project
const specsPath = projectManager.getSpecsPath();  // projects/{activeProject.id}/specs/
const modulesPath = projectManager.getModulesPath();  // projects/{activeProject.id}/modules/
const teamPath = projectManager.getTeamPath();  // projects/{activeProject.id}/team/
```

**In PM Agent Instructions**:
- DO NOT hardcode `.specweave/docs/internal/specs/`
- USE ProjectManager to get correct path for active project
- Specs go to: `{projectManager.getSpecsPath()}/spec-{number}-{name}.md`

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

  You MUST create living Spec (living docs - source of truth) AND optionally create increment spec.md:

  1. Spec (living docs - SOURCE OF TRUTH, permanent):
     - IMPORTANT: Use ProjectManager to get correct path for active project
     - Create at: {projectManager.getSpecsPath()}/spec-{number}-{name}.md
       (This resolves to projects/{activeProject}/specs/ automatically)
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
     - OR it can just reference the spec: \"See SPEC-{number}-{name} for complete requirements\"
     - Increment spec.md may be deleted after increment completes
     - Living spec.md persists as permanent documentation

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
STEP 4: Invoke Test-Aware Planner Agent (🚨 MANDATORY - USE TASK TOOL)

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
STEP 5: Validate Living Docs and Increment Files
├─ Check .specweave/docs/internal/specs/spec-{number}-{name}/spec.md exists (SOURCE OF TRUTH)
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
.specweave/docs/internal/projects/{project-id}/specs/  # ← Multi-project (v0.8.0+)
└── spec-{number}-{name}.md          # ← PM Agent (MANDATORY)
                                     # COMPLETE user stories, AC, requirements
                                     # This is the PERMANENT source of truth
                                     # Can be linked to Jira/ADO/GitHub Issues
                                     # Persists after increment completes

# Examples:
# Single project: projects/default/specs/spec-001-user-auth.md
# Multi-project: projects/web-app/specs/spec-001-user-auth.md
#                projects/mobile/specs/spec-001-push-notifications.md
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
- [ ] `.specweave/docs/internal/specs/spec-{number}-{name}/spec.md` exists
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
- [ ] `spec.md` either duplicates living spec.md OR references it ("See SPEC-{number}-{name}")
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

### Step 6: Detect Required Plugins & Check PM Tool (INTELLIGENT AUTO-LOADING + PM SYNC)

**Purpose**: Analyze spec content to identify required SpecWeave plugins AND check if external PM tool sync is configured.

**⚠️ CRITICAL**: For ALL plugin installations, consult the `plugin-expert` skill for correct syntax. NEVER use `@marketplace` suffix!

**Why This Matters**:
1. SpecWeave's plugin system enables context efficiency (70%+ reduction) by loading only relevant capabilities
2. PM tool integration enables automatic sync of increment progress to external systems (GitHub Issues, Jira, Azure DevOps)

**Detection Algorithm**:

1. **Scan spec.md for keywords**:
   ```
   Keywords → Plugin Mapping:
   - "GitHub", "issue", "pull request", "PR" → specweave-github
   - "Jira", "ticket", "epic" → specweave-jira
   - "Azure DevOps", "ADO", "work item" → specweave-ado
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

2. **Check External PM Tool Configuration** (NEW v0.8.0):
   - Read `.specweave/config.json`
   - If `externalPM.enabled = true` and `externalPM.tool` is set:
     - Check if corresponding plugin installed (specweave-github, specweave-jira, or specweave-ado)
     - Prepare to auto-create external issue/work item after increment creation
   - If `externalPM.enabled = false` or not configured:
     - Skip PM tool sync (local-only mode)

3. **Check if plugins are already installed**:
   - For Claude Code: Check if plugin available via `/plugin list --installed`
   - Skip already-installed plugins

4. **🚨 AUTOMATIC PLUGIN INSTALLATION** (if plugins detected):

   **IMPORTANT**: When you detect required plugins, you MUST:
   - ✅ Proactively offer to install them (not just suggest)
   - ✅ Explain WHY each plugin is needed (based on detected keywords)
   - ✅ Show clear install commands
   - ✅ Remind user that plugins provide expert AI agents and capabilities

   **Output Format**:
   ```
   🔌 Detected plugin requirements from spec content:

   REQUIRED (will significantly improve implementation):
   • specweave-github - GitHub Issues integration
     Detected: "sync tasks to GitHub issues", "create pull requests"
     Provides: GitHub sync, PR automation, issue tracking
     → Without this: Manual GitHub sync required

   • specweave-kubernetes - Kubernetes deployment
     Detected: "deploy to production cluster", "kubectl apply"
     Provides: K8s expert agent, Helm chart generation, deployment validation
     → Without this: Manual K8s configuration, no validation

   OPTIONAL (helpful but not critical):
   • specweave-diagrams - Architecture diagrams
     Detected: "system architecture", "component diagram"
     Provides: Mermaid + C4 diagram generation
     → Without this: Manual diagram creation

   📦 Install recommended plugins:
     /plugin install specweave-github
     /plugin install specweave-kubernetes

   📦 Install optional plugins:
     /plugin install specweave-diagrams

   💡 Benefits:
     • Plugins provide specialized AI agents (GitHub expert, K8s expert, etc.)
     • Skills auto-activate based on context (zero manual invocation)
     • 70%+ context reduction (only load what you need)
     • Best practices built-in (from real-world experience)

   Would you like me to wait while you install these plugins? (Recommended)
   Or shall I continue without them? (Limited capabilities)
   ```

   **User Decision Points**:
   - If user installs plugins → continue with full capabilities
   - If user skips → continue but remind about limitations later
   - NEVER block increment creation (plugins are enhancements, not requirements)

5. **Auto-Sync to PM Tool** (v0.8.0+):

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

🔌 Plugin Detection:
   Detected: "user authentication", "JWT tokens", "session management"
   → No additional plugins required

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
- Plugin detection is a **suggestion step** (not blocking)
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

### Step 10: Validate and Finalize

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
  subagent_type: "test-aware-planner",
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

**Step 10**: Validate
- ✅ spec.md is technology-agnostic with AC-IDs
- ✅ plan.md documents Stripe SDK choice + test strategy
- ✅ tasks.md has embedded test plans (BDD format)
- ✅ tasks.md covers all P1 AC-IDs with tests
- ✅ Constitutional compliance verified

**Output**:
```
✅ Feature created: 0003-stripe-payment-integration

Location: .specweave/increments/0003-stripe-payment-integration/
Files created:
- spec.md (12 user stories, 34 AC-IDs)
- plan.md (5 phases, architecture diagrams, test strategy)
- tasks.md (23 tasks with embedded tests, 85% coverage target)
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
