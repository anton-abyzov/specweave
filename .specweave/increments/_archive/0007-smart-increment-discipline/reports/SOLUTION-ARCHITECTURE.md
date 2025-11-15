# Solution Architecture: Smart Increment Discipline (0007)

**Date**: 2025-11-03
**Status**: Design Phase
**Problem**: Tests are afterthoughts, not integrated into tasks
**Goal**: Make tests first-class citizens in increment planning

---

## Executive Summary

Based on comprehensive research of industry best practices (Agile, TDD, BDD, Jira, Azure DevOps) and analysis of SpecWeave's current architecture, this document proposes a **test-aware increment planning system** that:

✅ **Keeps files separate** (tasks.md, tests.md) - Industry consensus
✅ **Adds acceptance criteria IDs** (AC-US1-01, AC-US1-02) - Traceability
✅ **Strengthens bidirectional linking** (tasks ↔ tests) - Explicit relationships
✅ **Makes TDD optional but integrated** - When enabled, enforces test-first workflow
✅ **Updates increment-planner** - Generates test-aware tasks automatically

---

## Problem Statement

### Current State (What's Broken)

**Evidence from .specweave/increments/0003-intelligent-model-selection/**:

```markdown
## tasks.md (broken):
- [ ] T-001: Create Core Type Definitions  ← NO test references!
- [ ] T-002: Implement Plugin Loader        ← NO test references!
...
- [ ] T-005: Unit Tests for Agent Model Manager  ← Tests AFTER implementation!
- [ ] T-007: Unit Tests for Phase Detector      ← Tests AFTER implementation!
```

**Result**: Tests become afterthoughts, TDD discipline not enforced.

### Root Causes

1. **No test-aware-planner agent** - Tasks generated WITHOUT test context
2. **increment-planner doesn't enforce test-task coupling** - No validation
3. **PM/Architect agents don't create acceptance criteria IDs** - No traceability
4. **Templates lack test fields** - tasks.md template has no "Test Coverage" section
5. **Validation is weak** - No check for test-task coupling

---

## Industry Best Practices (Research Summary)

### Consensus: Separate Files + Strong Linking

From research of Agile, TDD, BDD, Jira, Azure DevOps, GitHub, Linear:

| Approach | Verdict | Reason |
|----------|---------|--------|
| **Separate files (Jira/Azure)** | ✅ RECOMMENDED | Tooling, scalability, SSOT |
| **Embedded tests (single file)** | ❌ NOT RECOMMENDED | Not executable, poor scalability |
| **Bidirectional linking** | ✅ MANDATORY | Traceability, impact analysis |
| **Acceptance criteria IDs** | ✅ RECOMMENDED | Makes AC first-class entities |
| **BDD (Gherkin)** | 🟡 OPTIONAL | For BDD-focused teams only |

### Key Patterns from Tools

**Jira** (with Xray plugin):
- Acceptance criteria as checklist custom field
- Test cases as separate issue type
- Bidirectional links: Tests → Requirements, Requirements → Tests

**Azure DevOps**:
- Test Cases as work items (equal status to stories/tasks)
- Requirement-based test suites (auto-link test cases to user stories)
- Traceability queries: "Find all tests for requirement X"

**GitHub Issues**:
- Markdown checklists for acceptance criteria
- Issue references for linking (#123 links to test case issue)
- Labels for categorization (test, acceptance-criteria, P1)

---

## Proposed Solution

### Architecture Overview

```
User: "I want to add GitHub sync"
    ↓
increment-planner skill (enhanced)
    ↓
STEP 1: Scan existing docs
    ↓
STEP 2: Invoke PM Agent (enhanced)
│       Creates:
│       - .specweave/docs/internal/strategy/github-sync/
│       - spec.md WITH acceptance criteria IDs (AC-US1-01, AC-US1-02)
    ↓
STEP 3: Invoke Architect Agent
│       Creates:
│       - .specweave/docs/internal/architecture/adr/
│       - plan.md
    ↓
STEP 4: Invoke test-aware-planner Agent (NEW!)
│       Generates BOTH files together:
│       - tests.md (with task references)
│       - tasks.md (with test references)
│       Enforces bidirectional linking
    ↓
STEP 5: Validate test-task coupling (NEW!)
│       Checks:
│       - All implementation tasks reference TC-IDs
│       - All test cases reference task IDs
│       - No "run tests" task at end (tests integrated)
    ↓
✅ SUCCESS: Test-aware increment created
```

---

## Component Design

### 1. Enhanced spec.md Format (Acceptance Criteria IDs)

**Current** (0002, lines 1-100):
```markdown
## User Stories

### US1: Create C4 Context Diagram (P1)
**Acceptance Criteria**:
- [ ] User request detected
- [ ] Skill identifies diagram type
- [ ] Agent creates Mermaid syntax
```

**Proposed** (with AC-IDs):
```markdown
## User Stories

### US1: Create C4 Context Diagram (P1)

**Acceptance Criteria**:
- [ ] **AC-US1-01**: User request detected
  - **Tests**: TC-001, TC-002
  - **Tasks**: T-001, T-003
  - **Priority**: P1

- [ ] **AC-US1-02**: Skill identifies diagram type
  - **Tests**: TC-003, TC-004
  - **Tasks**: T-002
  - **Priority**: P1

- [ ] **AC-US1-03**: Agent creates correct Mermaid syntax
  - **Tests**: TC-005, TC-006
  - **Tasks**: T-004, T-005
  - **Priority**: P1
```

**Benefits**:
✅ AC become first-class entities (like FR-001, TC-001)
✅ Explicit mapping: AC → Tests, AC → Tasks
✅ Traceability: "Which AC does T-005 satisfy?" → AC-US1-03
✅ Coverage tracking: "Which AC have no tests?" → Query AC with no linked TCs

---

### 2. Enhanced tasks.md Format (Test-Aware Tasks)

**Current** (0003, line 34):
```markdown
### T-001: Create Core Type Definitions

**Acceptance Criteria**:
- [x] All interfaces defined
- [x] TypeScript compiles without errors
- [x] Exports available in index.ts
```

**Proposed** (with test references):
```markdown
### T-001: Create Core Type Definitions

**User Story**: US1
**Acceptance Criteria**: AC-US1-01, AC-US1-02
**Test Coverage**:
- TC-006: Unit test (tests/unit/plugin-loader.test.ts)
- TC-012: Integration test (tests/integration/plugin-lifecycle.test.ts)
**Priority**: P1
**Status**: pending

**TDD Workflow** (if TDD mode enabled):
1. 📝 Write test first: TC-006 (plugin-loader validates types)
   - File: tests/unit/plugin-loader.test.ts
   - Run: `npm test plugin-loader`
   - Expected: ❌ Test fails (types don't exist yet)
2. ✅ Implement: src/core/types/plugin.ts
3. 🟢 Run test again: `npm test plugin-loader`
   - Expected: ✅ Test passes
4. ♻️  Refactor if needed

**Implementation**:
- Create src/core/types/plugin.ts
- Define PluginManifest, PluginMetadata interfaces
- Export types in index.ts
```

**Benefits**:
✅ Clear task → test mapping
✅ TDD workflow embedded (when enabled)
✅ Test files explicitly referenced
✅ Run commands included

---

### 3. Enhanced tests.md Format (Task-Aware Tests)

**Current** (0002, line 91-100):
```markdown
| TC ID | Acceptance Criteria | Test Type | Test Location | Priority | Status |
|-------|---------------------|-----------|---------------|----------|--------|
| TC-0001 | User request detected | Agent Test | `diagrams-architect/test-cases/test-1-c4-context.yaml` | P1 | Planned |
```

**Proposed** (with task references):
```markdown
### TC-001: User Request Detection

**Test ID**: TC-001
**Type**: Agent Test
**Priority**: P1
**User Story**: US1
**Acceptance Criteria**: AC-US1-01
**Related Tasks**: T-001, T-003
**Status**: ✅ Pass

**Scenario** (Given/When/Then):
- **Given** user requests "create system context diagram for authentication flow"
- **When** diagrams-generator skill processes the request
- **Then** skill detects C4 Context diagram type
- **And** skill invokes diagrams-architect agent
- **And** agent receives user request as context

**Test File**: `src/agents/diagrams-architect/test-cases/test-1-c4-context.yaml`
**Run**: Manual validation (agent invocation test)
**Coverage**: AC-US1-01 ✅
```

**Benefits**:
✅ Bidirectional links (Test → Task, Test → AC)
✅ Given/When/Then format (BDD-style, clear)
✅ Test file location explicit
✅ Run instructions included

---

### 4. New Agent: test-aware-planner

**Location**: `plugins/specweave/agents/test-aware-planner/AGENT.md`

**Purpose**: Generate tasks.md and tests.md TOGETHER with bidirectional linking

**Responsibilities**:

1. **Read inputs**:
   - spec.md (acceptance criteria with AC-IDs)
   - plan.md (technical architecture)

2. **Generate tests.md FIRST**:
   - Map each AC-ID → test cases (TC-IDs)
   - Specify test types (unit, integration, E2E)
   - Assign priorities (P1, P2, P3)
   - Leave "Related Tasks" empty (to be filled)

3. **Generate tasks.md SECOND**:
   - Map each task → AC-IDs (acceptance criteria)
   - Map each task → TC-IDs (test coverage)
   - Specify TDD workflow (if TDD mode enabled)
   - Include test file locations

4. **Bidirectional linking**:
   - Update tests.md "Related Tasks" field
   - Ensure tasks.md "Test Coverage" field accurate
   - Cross-validate: Every task references tests, every test references tasks

5. **Validation**:
   - All implementation tasks have test coverage
   - All test cases relate to tasks
   - No "run tests" task at end (tests integrated)
   - AC coverage 100% (every AC has tests)

**Invocation** (from increment-planner skill):
```markdown
STEP 4: Invoke test-aware-planner Agent (🚨 MANDATORY - USE TASK TOOL)

Task(
  subagent_type: "test-aware-planner",
  description: "Generate test-aware tasks",
  prompt: "Create tasks.md and tests.md for increment: {number}-{name}

  INPUTS:
  - spec.md: [path to spec.md]
  - plan.md: [path to plan.md]

  YOU MUST:
  1. Generate tests.md FIRST (map AC-IDs → TC-IDs)
  2. Generate tasks.md SECOND (reference TC-IDs)
  3. Create bidirectional links (task ↔ test)
  4. Validate 100% test coverage for implementation tasks

  TDD MODE: {enabled|disabled}
  - If enabled: Add TDD workflow section to each task
  - If disabled: Just reference tests (no TDD steps)

  OUTPUT:
  - .specweave/increments/{number}-{name}/tests.md
  - .specweave/increments/{number}-{name}/tasks.md
  - Both files MUST be generated together!"
)
```

---

### 5. Enhanced increment-planner Skill

**Changes**:

#### Step 2: PM Agent (Enhanced)

**Add to prompt**:
```
You MUST create acceptance criteria with unique IDs:

Format:
- [ ] **AC-US1-01**: First criterion for US1
- [ ] **AC-US1-02**: Second criterion for US1
- [ ] **AC-US2-01**: First criterion for US2

Each AC MUST be:
- Specific and measurable
- Testable (can be automated or manually validated)
- Linked to test cases (filled in later by test-aware-planner)
```

#### Step 4: NEW - Invoke test-aware-planner Agent

**Insert after Architect agent (Step 3)**:

```markdown
STEP 4: Invoke test-aware-planner Agent (🚨 MANDATORY - USE TASK TOOL)

YOU MUST USE THE TASK TOOL - DO NOT SKIP:

Task(
  subagent_type: "test-aware-planner",
  description: "Generate test-aware tasks",
  prompt: "Create tasks.md and tests.md for: [increment description]

  FIRST, read PM's spec.md and Architect's plan.md:
  - spec.md: [path] (contains AC-IDs)
  - plan.md: [path] (contains technical approach)

  You MUST create BOTH files with bidirectional linking:

  1. tests.md (generate FIRST):
     - Map AC-IDs → TC-IDs (test cases)
     - Specify test types (unit, integration, E2E)
     - Use Given/When/Then format
     - Leave 'Related Tasks' empty (fill after tasks.md)

  2. tasks.md (generate SECOND):
     - Reference AC-IDs in each task
     - Reference TC-IDs in 'Test Coverage' field
     - Include test file locations
     - Add TDD workflow (if TDD mode enabled)

  3. Update tests.md:
     - Fill 'Related Tasks' field (bidirectional link)

  TDD MODE: {enabled|disabled}
  Tech stack: [detected tech stack]"
)

Wait for test-aware-planner agent to complete!
```

#### Step 5: NEW - Validate Test-Task Coupling

**Insert after test-aware-planner (Step 4)**:

```markdown
STEP 5: Validate Test-Task Coupling (🚨 MANDATORY)

Check the following BEFORE completing increment planning:

**Test Coverage Validation**:
- [ ] ALL implementation tasks reference TC-IDs
- [ ] ALL test cases reference task IDs
- [ ] tasks.md has "Test Coverage" section per task
- [ ] tests.md has "Related Tasks" section per test
- [ ] NO "run tests" task at end (tests integrated into tasks)

**Acceptance Criteria Coverage**:
- [ ] ALL AC-IDs have linked TC-IDs
- [ ] ALL TC-IDs reference AC-IDs
- [ ] Coverage: 100% of AC have tests

**TDD Workflow** (if TDD mode enabled):
- [ ] Each task has TDD workflow section
- [ ] Workflow includes: write test → implement → run test → refactor

If ANY validation fails → BLOCK increment creation → Show error
```

---

### 6. TDD Mode (Optional Feature)

**Purpose**: Make TDD optional but integrated when enabled

**Configuration**:

**File**: `.specweave/config.yaml`

```yaml
# SpecWeave Configuration

tdd_mode:
  enabled: false  # Set to true to enable TDD workflow
  strict: false   # If true, blocks task execution if test doesn't exist

# When enabled:
# - tasks.md includes TDD workflow section
# - /specweave:do checks test exists before implementation
# - Tests MUST be written before code
```

**Behavior**:

**When TDD mode DISABLED** (default):
```markdown
### T-001: Create Core Type Definitions

**Test Coverage**:
- TC-006: Unit test (tests/unit/plugin-loader.test.ts)
- TC-012: Integration test (tests/integration/plugin-lifecycle.test.ts)

**Implementation**:
- Create src/core/types/plugin.ts
- Define interfaces
- Export types
```

**When TDD mode ENABLED**:
```markdown
### T-001: Create Core Type Definitions

**Test Coverage**:
- TC-006: Unit test (tests/unit/plugin-loader.test.ts)
- TC-012: Integration test (tests/integration/plugin-lifecycle.test.ts)

**TDD Workflow**:
1. 📝 Write test first: TC-006
   - File: tests/unit/plugin-loader.test.ts
   - Expected: ❌ Test fails (types don't exist)
2. ✅ Implement: src/core/types/plugin.ts
3. 🟢 Run test: `npm test plugin-loader`
   - Expected: ✅ Test passes
4. ♻️  Refactor if needed

**Implementation**:
- Create src/core/types/plugin.ts
- Define interfaces
- Export types
```

**Strict Mode** (optional):

If `tdd_mode.strict: true`, `/specweave:do` command will:
1. Check if test file exists (from TC-ID reference)
2. Block task execution if test doesn't exist
3. Show error: "❌ Test TC-006 not found. Create test before implementing."

---

### 7. Validation Command: /specweave:validate-coverage

**Purpose**: Check test-task coupling for increment

**Usage**:
```bash
/specweave:validate-coverage 0007
```

**Output**:
```
📊 Test Coverage Report: 0007-smart-increment-discipline

✅ T-001: Implement authentication (3 tests: TC-001, TC-002, TC-003)
✅ T-002: Create login form (2 tests: TC-004, TC-005)
⚠️  T-003: Add user dashboard (0 tests - is this testable?)
✅ T-004: Update README.md (N/A - documentation)
❌ T-005: Implement password reset (0 tests - MISSING!)

Coverage: 60% of testable tasks have tests (3/5)

Acceptance Criteria Coverage:
✅ AC-US1-01: Covered by TC-001, TC-002 (2 tests)
✅ AC-US1-02: Covered by TC-003 (1 test)
❌ AC-US1-03: No tests found! (MISSING)

🎯 Recommendations:
- Add tests for T-005 (password reset)
- Add tests for AC-US1-03 (session expiry)
- Mark T-003 as testable or not testable
```

**Implementation**:

**File**: `plugins/specweave/commands/validate-coverage.md`

```yaml
---
name: validate-coverage
description: Validate test-task coupling for an increment. Shows coverage report with missing tests, untestable tasks, and acceptance criteria coverage.
---

# /specweave:validate-coverage

Validate test coverage for an increment.

## Usage

/specweave:validate-coverage <increment-number>

## What It Does

1. Reads spec.md (acceptance criteria with AC-IDs)
2. Reads tasks.md (tasks with TC-ID references)
3. Reads tests.md (test cases with task references)
4. Generates coverage report:
   - Tasks with tests
   - Tasks without tests (but testable)
   - Tasks marked as not testable
   - AC coverage (each AC has tests?)

## Output

Shows:
- ✅ Tasks with full test coverage
- ⚠️  Tasks with partial or unclear coverage
- ❌ Tasks missing tests (but testable)
- 📊 Overall coverage percentage

## Example

/specweave:validate-coverage 0007

Output:
✅ T-001: 3 tests
❌ T-005: 0 tests (MISSING!)
```

---

## Implementation Plan

### Phase 1: Quick Win (Low Effort, High Impact)

**Goal**: Add test references to existing templates

1. **Update task template** (tasks.md.template):
   - Add "Test Coverage" field
   - Add "TDD Workflow" section (if TDD mode enabled)
   - Make TC-ID references mandatory

2. **Update increment-planner skill**:
   - Add validation: ALL tasks MUST reference TC-IDs
   - Block increment creation if test-task coupling missing

**Effort**: 4 hours
**Impact**: Forces test discipline immediately

---

### Phase 2: Medium-Term (Moderate Effort)

**Goal**: Create test-aware-planner agent

3. **Create test-aware-planner agent**:
   - Reads spec.md + plan.md
   - Generates tasks.md + tests.md TOGETHER
   - Enforces bidirectional linking

4. **Extend PM Agent**:
   - Generate AC-IDs (AC-US1-01 format)
   - Create test coverage matrix template

5. **Add /specweave:validate-coverage command**:
   - Check test-task coupling
   - Generate coverage report

**Effort**: 16 hours
**Impact**: Automated test-aware planning

---

### Phase 3: Long-Term (High Effort, High Reward)

**Goal**: Full TDD integration

6. **Build TDD mode** into config:
   - .specweave/config.yaml (tdd_mode: enabled/disabled)
   - Tasks include TDD workflow section

7. **Enforce TDD** in /specweave:do:
   - Check test exists before task execution
   - Block if test missing (strict mode)
   - Run test before/after implementation

8. **Living test docs**:
   - Add .specweave/docs/internal/testing/
   - Test strategy evolves with project
   - tests.md references living test docs

**Effort**: 24 hours
**Impact**: True TDD discipline enforced by framework

---

## Success Metrics

### Quantitative

- ✅ **100% AC coverage**: Every AC-ID has linked TC-IDs
- ✅ **100% testable task coverage**: Every implementation task references tests
- ✅ **0 "run tests" tasks**: No generic test tasks at end
- ✅ **Bidirectional linking**: tasks → tests AND tests → tasks

### Qualitative

- ✅ **Tests BEFORE code**: TDD workflow enforced
- ✅ **Clear traceability**: "Which test validates this task?" → Instant answer
- ✅ **Impact analysis**: "If FR-001 changes, which tests update?" → Instant answer
- ✅ **Coverage visibility**: "Which AC have no tests?" → Instant answer

---

## Comparison: Before vs. After

### Before (Current - Increment 0003)

```markdown
## tasks.md:
- [ ] T-001: Create Core Type Definitions  ← NO test references
- [ ] T-002: Implement Plugin Loader       ← NO test references
...
- [ ] T-005: Unit Tests (...)              ← Tests AFTER implementation
- [ ] T-007: Unit Tests (...)              ← Tests AFTER implementation

## tests.md:
### TC-001: Load Plugin with Valid Manifest
Type: Unit
Priority: P1
User Story: US1
Status: Pending

← NO task references!
```

**Result**: Tests are afterthoughts, no TDD, poor traceability

---

### After (Proposed - Increment 0007)

```markdown
## spec.md:
### US1: Plugin Loading (P1)
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Load plugin with valid manifest
  - **Tests**: TC-001, TC-002
  - **Tasks**: T-001

## tasks.md:
### T-001: Create Core Type Definitions
**User Story**: US1
**Acceptance Criteria**: AC-US1-01
**Test Coverage**:
- TC-001: Unit test (tests/unit/plugin-loader.test.ts)
- TC-002: Integration test (tests/integration/plugin-lifecycle.test.ts)

**TDD Workflow** (if enabled):
1. Write test: TC-001 (should fail)
2. Implement: src/core/types/plugin.ts
3. Run test: `npm test plugin-loader` (should pass)

## tests.md:
### TC-001: Load Plugin with Valid Manifest
**Type**: Unit
**Priority**: P1
**User Story**: US1
**Acceptance Criteria**: AC-US1-01
**Related Tasks**: T-001
**Status**: ✅ Pass
```

**Result**: Tests first-class citizens, full traceability, TDD enforced

---

## Open Questions

1. **AC-ID format**: `AC-US1-01` or `AC-FR001-01` or `AC-001`?
   - **Recommendation**: `AC-US1-01` (ties to user story, clearest)

2. **TDD mode default**: Enabled or disabled by default?
   - **Recommendation**: Disabled (opt-in for TDD practitioners)

3. **Validation strictness**: Block increment creation if coverage < 100%?
   - **Recommendation**: Warn, but don't block (allow non-testable tasks)

4. **Backward compatibility**: Update existing increments (0001-0006)?
   - **Recommendation**: No (only new increments use new format)

5. **Manual vs automated tests**: How to mark manual validation tests?
   - **Recommendation**: Add "Type: Manual" in tests.md (no automation required)

---

## Next Steps

1. ✅ **Review this architecture** - Validate approach with stakeholders
2. ⏳ **Create increment 0007 spec.md** - Use NEW format (AC-IDs)
3. ⏳ **Create increment 0007 plan.md** - Technical implementation
4. ⏳ **Create increment 0007 tasks.md** - Test-aware tasks (NEW format)
5. ⏳ **Create increment 0007 tests.md** - Task-aware tests (NEW format)
6. ⏳ **Implement Phase 1** (Quick Win) - Update templates, validation
7. ⏳ **Implement Phase 2** (test-aware-planner agent) - Automated generation
8. ⏳ **Implement Phase 3** (TDD mode) - Full TDD integration

---

## References

- **Research Report**: Industry best practices (Agile, TDD, BDD, Jira, Azure DevOps)
- **Current Architecture Analysis**: .specweave/increments/0002, 0003, 0004
- **increment-planner skill**: plugins/specweave/skills/increment-planner/SKILL.md
- **CLAUDE.md**: Testing philosophy, increment discipline

---

**Document Status**: ✅ COMPLETE - Ready for review
**Author**: Claude (Sonnet 4.5)
**Date**: 2025-11-03
