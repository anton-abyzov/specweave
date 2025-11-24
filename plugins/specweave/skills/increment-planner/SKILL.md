---
name: increment-planner
description: Creates comprehensive implementation plans for ANY type of SpecWeave increment (feature, hotfix, bug, change-request, refactor, experiment). Supports all work types from features to bug investigations to POCs. Activates for: increment planning, feature planning, hotfix, bug investigation, root cause analysis, SRE investigation, change request, refactor, POC, prototype, spike work, experiment, implementation plan, create increment, organize work, break down work, new product, build project, MVP, SaaS, app development, tech stack planning, production issue, critical bug, stakeholder request.
---

# Increment Planner Skill

**Self-contained increment planning that works in ANY user project after `specweave init`.**

---

## Purpose

Automates creation of increment structure for ANY type of work:
- ✅ Auto-numbered directories (`0001-9999`)
- ✅ Duplicate detection (prevents conflicts)
- ✅ Complete file templates (spec.md, plan.md, tasks.md, metadata.json)
- ✅ Proper YAML frontmatter
- ✅ Works in all user projects (self-contained)

---

## Increment Types

| Type | Description | Use When | WIP Limit |
|------|-------------|----------|-----------|
| **feature** | New functionality | Adding features | Max 2 active |
| **hotfix** | Critical production fixes | Production broken | Unlimited |
| **bug** | Bug investigation with RCA | Needs root cause analysis | Unlimited |
| **change-request** | Stakeholder requests | Business changes | Max 2 active |
| **refactor** | Code improvement | Technical debt | Max 1 active |
| **experiment** | POC/spike work | Exploring options | Unlimited |

---

## When to Use

✅ **USE** when:
- Creating features, hotfixes, bug investigations, refactors, POCs
- Planning structured work in user projects
- Need complete increment scaffold with templates

❌ **DON'T USE** when:
- User asking general questions
- Another skill already handling request
- Already in active increment planning

---

## Critical Rules

### 1. Increment Naming (MANDATORY)

**Format**: `####-descriptive-kebab-case-name`

✅ **CORRECT**:
```
0001-user-authentication
0002-payment-processing
0003-email-notifications
```

❌ **WRONG**:
```
0001              ← No description
0002-feature      ← Too generic
my-feature        ← No number
```

### 2. NO Agent Spawning from Skills (CRITICAL)

**Skills MUST NOT spawn content-generating agents via Task() tool.**

**Why**: Context explosion causes Claude Code crashes:
- Skill (1500 lines) loads into context
- Agent (600 lines) spawned
- Agent output (2000+ lines) generated
- **Total: 4000+ lines = CRASH** 💥

**✅ SAFE Workflow**:
```
1. Skill creates basic templates (50 lines each)
2. Skill outputs: "Tell Claude: 'Complete spec for increment 0005'"
3. Agent activates in MAIN context (NOT nested) = SAFE
```

### 3. metadata.json is MANDATORY

Every increment MUST have `metadata.json` or:
- ❌ Status tracking broken
- ❌ WIP limits don't work
- ❌ External sync fails (GitHub/Jira/ADO)
- ❌ All increment commands fail

**Complete template** (values from `.specweave/config.json`):
```json
{
  "id": "0001-feature-name",
  "status": "planned",
  "type": "feature",
  "priority": "P1",
  "created": "2025-11-24T12:00:00Z",
  "lastActivity": "2025-11-24T12:00:00Z",
  "testMode": "<FROM config.testing.defaultTestMode OR 'TDD'>",
  "coverageTarget": <FROM config.testing.defaultCoverageTarget OR 95>,
  "feature_id": null,
  "epic_id": null,
  "externalLinks": {}
}
```

**NOTE**: Always read `testMode` and `coverageTarget` from config, don't hardcode!

### 4. Increment Structure

**Complete directory structure**:
```
.specweave/increments/0001-feature-name/
├── spec.md          # WHAT & WHY (user stories, acceptance criteria)
├── plan.md          # HOW (technical design, architecture)
├── tasks.md         # STEPS (implementation tasks with embedded tests)
└── metadata.json    # Metadata (MANDATORY)
```

**NO separate tests.md** - tests embedded in tasks.md (v0.7.0+)

---

## Workflow (Safe, Self-Contained)

### STEP 0: Read Config Values (MANDATORY)

**Read testing configuration from `.specweave/config.json`**:

```bash
# Read testMode (default: "TDD")
testMode=$(cat .specweave/config.json | jq -r '.testing.defaultTestMode // "TDD"')

# Read coverageTarget (default: 95)
coverageTarget=$(cat .specweave/config.json | jq -r '.testing.defaultCoverageTarget // 95')

echo "Using testMode: $testMode"
echo "Using coverageTarget: $coverageTarget"
```

**Store these values for use in STEP 4 and STEP 7!**

### STEP 1: Get Next Increment Number

Use helper script:
```bash
node plugins/specweave/skills/increment-planner/scripts/feature-utils.js next
# Returns: "0021"
```

Or manually scan:
```bash
ls -1 .specweave/increments/ | grep -E '^[0-9]{4}-' | sort | tail -1
# Get highest number, add 1
```

### STEP 2: Check for Duplicates

```bash
node plugins/specweave/skills/increment-planner/scripts/feature-utils.js check-increment 0021
# If exists: STOP and inform user
```

### STEP 3: Create Directory Structure

```bash
mkdir -p .specweave/increments/0021-feature-name
```

### STEP 4: Create spec.md Template

Create `.specweave/increments/0021-feature-name/spec.md`:

```markdown
---
increment: 0021-feature-name
title: "Feature Name"
type: feature
priority: P1
status: planned
created: 2025-11-24
structure: user-stories
test_mode: <VALUE FROM config.testing.defaultTestMode OR 'TDD'>
coverage_target: <VALUE FROM config.testing.defaultCoverageTarget OR 95>
---

# Feature: [Title]

## Overview

[High-level description - WHAT this feature does and WHY it's needed]

## User Stories

### US-001: [Story Title] (P1)

**As a** [user type]
**I want** [goal]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] **AC-US1-01**: [Specific, testable criterion]
- [ ] **AC-US1-02**: [Another criterion]

### US-002: [Story Title] (P2)

[Repeat structure]

## Functional Requirements

### FR-001: [Requirement]
[Detailed description]

## Success Criteria

[Measurable outcomes - metrics, KPIs]

## Out of Scope

[What this explicitly does NOT include]

## Dependencies

[Other features or systems this depends on]
```

### STEP 5: Create plan.md Template

Create `.specweave/increments/0021-feature-name/plan.md`:

```markdown
# Implementation Plan: [Feature Title]

## Overview

[Technical summary of implementation approach]

## Architecture

### Components
- [Component 1]: [Purpose]
- [Component 2]: [Purpose]

### Data Model
- [Entity 1]: [Fields, relationships]
- [Entity 2]: [Fields, relationships]

### API Contracts
- `POST /api/resource`: [Purpose, request/response]
- `GET /api/resource/:id`: [Purpose, request/response]

## Technology Stack

- **Language/Framework**: [Choice]
- **Libraries**: [List]
- **Tools**: [List]

**Architecture Decisions**:
- [Decision 1]: [Why this choice? Alternatives considered?]
- [Decision 2]: [Rationale]

## Implementation Phases

### Phase 1: Foundation
- [Setup, infrastructure, base components]

### Phase 2: Core Functionality
- [Primary features from P1 user stories]

### Phase 3: Enhancement
- [P2 features and optimizations]

## Testing Strategy

[High-level testing approach - details in tasks.md]

## Technical Challenges

### Challenge 1: [Description]
**Solution**: [Approach]
**Risk**: [Mitigation]
```

### STEP 6: Create tasks.md Template

Create `.specweave/increments/0021-feature-name/tasks.md`:

```markdown
# Tasks: [Feature Title]

## Task Notation

- `[T###]`: Task ID
- `[P]`: Parallelizable
- `[ ]`: Not started
- `[x]`: Completed
- Model hints: ⚡ haiku, 🧠 sonnet, 💎 opus

## Phase 1: Setup

- [ ] [T001] [P] ⚡ haiku - Initialize project structure
- [ ] [T002] ⚡ haiku - Setup testing framework

## Phase 2: Core Implementation

### US-001: [User Story Title] (P1)

#### T-003: Implement [component]

**Description**: [What needs to be done]

**References**: AC-US1-01, AC-US1-02

**Implementation Details**:
- [Step 1]
- [Step 2]

**Test Plan**:
- **File**: `tests/unit/component.test.ts`
- **Tests**:
  - **TC-001**: [Test name]
    - Given [precondition]
    - When [action]
    - Then [expected result]
  - **TC-002**: [Test name]
    - Given [precondition]
    - When [action]
    - Then [expected result]

**Dependencies**: None
**Status**: [ ] Not Started

## Phase 3: Testing

- [ ] [T050] Run integration tests
- [ ] [T051] Verify all acceptance criteria
```

### STEP 7: Create metadata.json (MANDATORY)

**IMPORTANT**: Read `testMode` and `coverageTarget` from `.specweave/config.json`:

```bash
# Read config to get defaultTestMode and defaultCoverageTarget
cat .specweave/config.json | jq -r '.testing.defaultTestMode // "TDD"'
cat .specweave/config.json | jq -r '.testing.defaultCoverageTarget // 95'
```

Create `.specweave/increments/0021-feature-name/metadata.json`:

```json
{
  "id": "0021-feature-name",
  "status": "planned",
  "type": "feature",
  "priority": "P1",
  "created": "2025-11-24T12:00:00Z",
  "lastActivity": "2025-11-24T12:00:00Z",
  "testMode": "<VALUE FROM config.testing.defaultTestMode OR 'TDD'>",
  "coverageTarget": <VALUE FROM config.testing.defaultCoverageTarget OR 95>,
  "feature_id": null,
  "epic_id": null,
  "externalLinks": {}
}
```

**Use Write tool to create this file immediately after creating increment.**

**Example Logic**:
```javascript
// Read config
const config = JSON.parse(fs.readFileSync('.specweave/config.json', 'utf8'));
const testMode = config?.testing?.defaultTestMode || 'TDD';
const coverageTarget = config?.testing?.defaultCoverageTarget || 95;

// Create metadata with config values
const metadata = {
  id: "0021-feature-name",
  status: "planned",
  type: "feature",
  priority: "P1",
  created: new Date().toISOString(),
  lastActivity: new Date().toISOString(),
  testMode: testMode,  // ← FROM CONFIG!
  coverageTarget: coverageTarget,  // ← FROM CONFIG!
  feature_id: null,
  epic_id: null,
  externalLinks: {}
};
```

### STEP 8: Guide User to Complete Planning

**Output this guidance to user**:

```
✅ Increment structure created: .specweave/increments/0021-feature-name/

📋 Basic templates created:
   • spec.md (user stories, acceptance criteria)
   • plan.md (technical design, architecture)
   • tasks.md (implementation steps with test plans)
   • metadata.json (increment metadata)

🚀 To complete planning, run these commands in sequence:

1. Complete product specification:
   Tell Claude: "Complete the spec for increment 0021-feature-name"
   (PM expertise will activate automatically in main conversation)

2. Create technical architecture:
   Tell Claude: "Design architecture for increment 0021-feature-name"
   (Architect will create detailed design in main conversation)

3. Generate implementation tasks:
   Tell Claude: "Create tasks for increment 0021-feature-name"
   (Test-aware planner will generate tasks with embedded tests)

⚠️  These commands run in MAIN conversation (NOT nested agents) to prevent crashes!
```

**DO NOT invoke Task() tool to spawn agents from this skill!**

---

## Model Selection for Tasks

When creating tasks, assign optimal models:

**⚡ Haiku** (fast, cheap):
- Clear instructions with specific file paths
- Detailed acceptance criteria (3+ points)
- Simple CRUD, configuration, setup
- Mechanical work with defined approach

**🧠 Sonnet** (thinking, balanced):
- Architecture decisions
- Multiple valid approaches
- Integration between components
- Complex business logic
- Error handling strategies

**💎 Opus** (critical, expensive):
- Critical system architecture
- Security-critical decisions
- Performance-critical algorithms
- Novel problem-solving

---

## Validation Checklist

Before marking increment planning complete, verify:

**Increment Structure**:
- [ ] Directory exists: `.specweave/increments/####-name/`
- [ ] spec.md has valid YAML frontmatter
- [ ] plan.md has technical design
- [ ] tasks.md has embedded test plans (NO separate tests.md)
- [ ] metadata.json exists and is valid

**spec.md Content**:
- [ ] User stories with AC-IDs (AC-US1-01, etc.)
- [ ] Functional requirements
- [ ] Success criteria (measurable)
- [ ] Out of scope defined
- [ ] Dependencies identified

**plan.md Content**:
- [ ] Components identified
- [ ] Data model defined
- [ ] API contracts specified
- [ ] Technology choices explained
- [ ] Architecture decisions documented

**tasks.md Content**:
- [ ] All tasks have embedded test plans
- [ ] Test cases in BDD format (Given/When/Then)
- [ ] All AC-IDs from spec covered by tasks
- [ ] Model hints assigned (⚡🧠💎)
- [ ] Dependencies explicitly stated

**metadata.json Content**:
- [ ] Valid JSON syntax
- [ ] All required fields present
- [ ] Status is "planned"
- [ ] Type matches increment purpose
- [ ] Timestamps in ISO-8601 format

---

## Helper Scripts

Located in `plugins/specweave/skills/increment-planner/scripts/`:

**Get next increment number**:
```bash
node plugins/specweave/skills/increment-planner/scripts/feature-utils.js next
```

**Check for duplicates**:
```bash
node plugins/specweave/skills/increment-planner/scripts/feature-utils.js check-increment 0021
```

**Generate short name from description**:
```bash
node plugins/specweave/skills/increment-planner/scripts/generate-short-name.js "Add user authentication"
# Returns: "user-authentication"
```

---

## Common Patterns

### Pattern 1: Simple Feature

**User request**: "Add user authentication"

**Process**:
1. Get next number: `0015`
2. Generate short name: `user-authentication`
3. Create: `.specweave/increments/0015-user-authentication/`
4. Create templates (spec.md, plan.md, tasks.md, metadata.json)
5. Guide user to complete in main conversation

### Pattern 2: Critical Hotfix

**User request**: "Fix critical security vulnerability CVE-2024-1234"

**Process**:
1. Get next number: `0016`
2. Short name: `security-fix-cve-2024-1234`
3. Type: `hotfix` (in metadata.json)
4. Priority: `P1`
5. Create templates with urgency markers
6. Guide user to complete quickly

### Pattern 3: Bug Investigation

**User request**: "Investigate memory leak in production API"

**Process**:
1. Get next number: `0017`
2. Short name: `memory-leak-investigation`
3. Type: `bug` (in metadata.json)
4. spec.md focuses on: What's broken? Expected vs actual? Impact?
5. plan.md focuses on: Investigation approach, tools, hypothesis
6. tasks.md focuses on: Investigation steps, fix implementation, verification

---

## Troubleshooting

**Issue**: Feature number conflict
**Solution**: Always run duplicate check before creating increment

**Issue**: metadata.json missing after creation
**Solution**: Verify Write tool succeeded, check file exists with Read tool

**Issue**: Claude Code crashes during planning
**Solution**: This skill creates templates only - completion happens in main conversation (NOT via nested agent spawning)

**Issue**: User stories don't have AC-IDs
**Solution**: Ensure AC-IDs follow format: `AC-US{number}-{criteria}` (e.g., `AC-US1-01`)

**Issue**: Tasks missing test plans
**Solution**: Each testable task MUST have Test Plan section with BDD format (Given/When/Then)

---

## Integration with External Tools

**GitHub Issues**: After increment creation, optionally sync to GitHub:
```bash
/specweave-github:create-issue 0021
```

**Jira Epics**: Sync to Jira:
```bash
/specweave-jira:sync 0021
```

**Azure DevOps**: Sync to ADO work items:
```bash
/specweave-ado:create-workitem 0021
```

---

## Best Practices

**✅ DO**:
- Always create metadata.json (MANDATORY)
- Use descriptive increment names
- Include AC-IDs in all acceptance criteria
- Embed tests in tasks.md (NO separate tests.md)
- Guide user to complete in main conversation
- Check for duplicates before creating

**❌ DON'T**:
- Use bare numbers (0001) without description
- Spawn agents from this skill (causes crashes)
- Skip metadata.json creation
- Create separate tests.md (deprecated v0.7.0+)
- Reference SpecWeave internal docs/ADRs (users won't have them)
- Over-plan in skill (keep templates simple)

---

**This skill is self-contained and works in ANY user project after `specweave init`.**
