# SpecWeave Quality Assurance & Validation Features - Comprehensive Map

**Last Updated**: 2025-11-04
**Scope**: Complete QA/Validation landscape in SpecWeave v0.7.0+
**Thoroughness**: VERY THOROUGH - All features mapped with locations and workflows

---

## Executive Summary

SpecWeave implements a **multi-layered quality assurance system** combining:

1. **Rule-Based Validation** - 120+ automated checks (fast, free)
2. **AI-Powered Quality Judge** - LLM-as-Judge pattern (optional, deeper analysis)
3. **Test-Aware Planning** - Embedded test plans in tasks.md (BDD format)
4. **Test Coverage Validation** - AC-ID traceability and coverage tracking
5. **PM Gates** - Increment discipline enforcement (prevents scope creep)
6. **Increment Discipline** - Source-of-truth validation (one active increment)

---

## 1. RULE-BASED VALIDATION (Fast, Automated, Free)

### Location & Entry Points

**Command**: `/validate` or `/specweave:validate`
**File**: `/Users/antonabyzov/Projects/github/specweave/plugins/specweave/commands/validate.md`
**Runs Automatically On**: Document save (via hook)

### What It Does

**120 validation rules** across 4 categories:

#### A. Consistency Rules (47 rules)
- **User Story → Plan Consistency** (10 rules)
  - Every user story in spec.md MUST have section in plan.md
  - Priorities must match across documents
  - Dependencies tracked consistently

- **Plan → Tasks Consistency** (12 rules)
  - Every component in plan.md MUST have task(s) in tasks.md
  - Task dependencies match architectural dependencies
  - Risk mitigations addressed

- **Spec → Tests Traceability** (15 rules)
  - Every AC-ID in spec.md must appear in tasks.md embedded tests
  - Test case format consistency
  - BDD format validation (Given/When/Then)

- **Cross-Document Consistency** (10 rules)
  - Increment IDs match across all files
  - Priorities consistent (P0, P1, P2 only)
  - Status fields synchronized

#### B. Completeness Rules (23 rules)
- **spec.md Completeness** (8 rules)
  - Frontmatter: spec ID, title, status, created date
  - Problem statement present and clear
  - User stories (US-001, US-002, ...)
  - Acceptance criteria for each US (AC-US1-01, AC-US1-02, ...)
  - Success criteria with metrics
  - Non-functional requirements
  - Test strategy overview

- **plan.md Completeness** (10 rules)
  - Architecture overview (HLD)
  - Components list
  - Data model (if applicable)
  - API contracts
  - Security considerations (OWASP alignment)
  - Error handling strategy
  - Performance assumptions
  - Deployment strategy
  - ADR references
  - Technology choices

- **tasks.md Completeness** (5 rules)
  - Task IDs (T-001, T-002, ...)
  - Descriptions and acceptance criteria references
  - Priority levels
  - Time estimates
  - Dependencies

#### C. Quality Rules (31 rules)
- **spec.md Quality** (12 rules)
  - Technology-agnostic (no "React", "FastAPI" in spec)
  - Testable acceptance criteria (not vague)
  - Measurable success criteria
  - No implementation details
  - Clear user story format ("As a X, I want Y, So that Z")
  - AC-IDs formatted correctly (AC-US1-01 format)
  - No duplicate acceptance criteria

- **plan.md Quality** (14 rules)
  - Technical details appropriate (NOT in spec)
  - ADRs referenced for decisions
  - Security addressed with controls
  - Error handling defined for each component
  - Performance targets specified
  - Scalability considerations
  - Reasonable tech stack choices
  - Dependencies documented

- **tasks.md Quality** (5 rules)
  - Actionable tasks (clear what to do)
  - Reasonable estimates (< 1 day each)
  - Valid task dependencies
  - Test plans present for testable tasks
  - Clear "N/A" for non-testable tasks

#### D. Traceability Rules (19 rules)
- **AC-ID Formatting** (8 rules)
  - Format: AC-US{story}-{number} (e.g., AC-US1-01)
  - Sequential numbering
  - No gaps in numbering
  - Every AC-ID in spec.md appears in tasks.md

- **ADR References** (6 rules)
  - Referenced ADRs exist (ADR-0001, ADR-0002)
  - Sequential numbering
  - ADR status fields (Proposed, Accepted, Superseded)
  - Linked to architecture decisions in plan.md

- **Diagram References** (5 rules)
  - Diagrams exist if referenced
  - Valid Mermaid or C4 model syntax
  - References use correct file paths
  - Diagrams in `.specweave/docs/internal/architecture/diagrams/`

### Output Format

**Quick Validation (On Save)**:
```
🔍 Validating increment 0002-user-authentication...
✅ Quick validation passed (0 errors, 0 warnings)
✅ All consistency checks passed (47/47)
✅ All completeness checks passed (23/23)
✅ All quality checks passed (31/31)
✅ All traceability checks passed (19/19)

No issues found! Ready for implementation.
```

**With Errors**:
```
❌ Quick validation found 3 errors, 5 warnings:

ERRORS:
  - Missing acceptance criteria for US-003 (spec.md:45)
  - Inconsistency: spec.md mentions "real-time updates" but plan.md doesn't address it
  - Traceability broken: TC-0007 in spec.md not in tests.md

WARNINGS:
  - Task T012 exceeds size guideline (5 days)
  - No security considerations in plan.md
  - Missing error handling strategy
  [More warnings...]
```

### Implementation Details

**Source Code**:
- Located in: Plugin-based (markdown/agent-based, not TypeScript)
- Validation logic: Executed via agents and skills
- Rules defined in: `/Users/antonabyzov/Projects/github/specweave/plugins/specweave/commands/validate.md`

**Execution Flow**:
1. User saves spec.md/plan.md/tasks.md
2. Hook triggers: `.claude/hooks/post-document-save.sh`
3. Calls: increment-validator skill (quick validation - 5-10s)
4. If errors > 0: Invokes validator agent (deep analysis - 30-60s)
5. Generates: `.specweave/increments/####/reports/validation-report.md`

**Severity Levels**:
- 🔴 **ERROR** (Blocking) - Must fix before implementation
- 🟡 **WARNING** (Important) - Fix when convenient
- 🟢 **INFO** (Nice-to-have) - Can be addressed later

---

## 2. AI-POWERED QUALITY JUDGE (Optional, Deeper)

### Location & Entry Points

**Skill**: `increment-quality-judge`
**File**: `/Users/antonabyzov/Projects/github/specweave/plugins/specweave/skills/increment-quality-judge/SKILL.md`
**Invocation**: 
- `/validate <id> --quality` (flag)
- "Validate quality of increment 0001" (intent-based)
- "Quality check" (keyword-based)

### What It Does

**LLM-as-Judge Pattern** - Uses Claude's judgment to evaluate 6 dimensions:

#### 6 Quality Dimensions (Weighted)

```yaml
Clarity:         20% weight
  - Is problem statement clear?
  - Are objectives well-defined?
  - Is terminology consistent?

Testability:     25% weight (Highest weight!)
  - Are acceptance criteria testable?
  - Can success be measured objectively?
  - Are edge cases identifiable?

Completeness:    20% weight
  - All requirements addressed?
  - Error handling specified?
  - Non-functional requirements included?

Feasibility:     15% weight
  - Architecture scalable?
  - Technical constraints realistic?
  - Timeline achievable?

Maintainability: 10% weight
  - Design modular?
  - Extension points identified?
  - Technical debt addressed?

Edge Cases:      10% weight
  - Failure scenarios covered?
  - Performance limits specified?
  - Security considerations included?
```

### Scoring System

**Output**: 0-100 scale (0.00-1.00 internally)

**Quality Grades**:
- **90-100**: ⭐⭐⭐⭐⭐ Excellent
- **80-89**: ⭐⭐⭐⭐ Good (Typical target)
- **70-79**: ⭐⭐⭐ Acceptable
- **60-69**: ⭐⭐ Needs Improvement
- **0-59**: ⭐ Poor (Significant Issues)

**Confidence Score**: 0-100%
- How confident the assessment is
- Low confidence (<80%) may indicate spec is too short/specialized

### Example Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI QUALITY ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Score: 87/100 (GOOD) ✓

Dimension Scores:
  Clarity:         92/100 ✓✓
  Testability:     78/100 ✓  (Needs improvement)
  Completeness:    90/100 ✓✓
  Feasibility:     88/100 ✓✓
  Maintainability: 85/100 ✓
  Edge Cases:      72/100 ⚠️  (Action needed)

Confidence: 92%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ISSUES FOUND (2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  MAJOR: Acceptance criteria not fully testable
    Dimension: Testability
    Location: spec.md, section "Success Criteria"
    Issue: "User can log in successfully" is vague
    Impact: QA won't know when feature is complete

🔸 MINOR: Rate limiting edge case not addressed
    Dimension: Edge Cases
    Location: spec.md, section "Security"
    Issue: No mention of brute-force protection
    Impact: Security vulnerability risk

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUGGESTIONS (3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 HIGH PRIORITY: Make acceptance criteria measurable

   Current:
   "User can log in successfully"

   Improved:
   "User can log in with valid credentials within 2 seconds,
    receiving a JWT token with 24h expiry. Success rate >99.9%."
```

### Interactive Features

**Prompt Options** (After quality assessment):
- `[F]` - Auto-fix HIGH priority issues (experimental)
- `[E]` - Export suggestions to tasks.md
- `[C]` - Continue without changes

### Token Usage & Cost

**Estimated per increment**:
- Small spec (<100 lines): ~1,500 tokens (~$0.015)
- Medium spec (100-250 lines): ~2,000 tokens (~$0.020)
- Large spec (>250 lines): ~3,000 tokens (~$0.030)

**Model**: Claude Sonnet 4.5 (for cost efficiency)

### Configuration

```json
{
  "validation": {
    "quality_judge": {
      "enabled": true,
      "always_run": false,     // Default: prompt user
      "auto_prompt": true,     // Show "Run AI quality check?" prompt
      "thresholds": {
        "excellent": 90,
        "good": 80,
        "acceptable": 70
      },
      "max_tokens": 2000
    }
  }
}
```

### Limitations

**What Quality Judge CAN'T do**:
- ❌ Understand domain-specific requirements (healthcare compliance, finance regulations)
- ❌ Validate against company-specific standards (unless in spec)
- ❌ Verify technical feasibility with actual codebase
- ❌ Replace human expertise and judgment

**What Quality Judge CAN do**:
- ✅ Catch vague or ambiguous language
- ✅ Identify missing error handling
- ✅ Spot untestable acceptance criteria
- ✅ Suggest industry best practices
- ✅ Flag missing edge cases

### Test Cases (TC-001-004)

```
TC-001: Basic Quality Assessment
  Given: Valid spec.md with minor issues
  When: quality-judge runs
  Then: Returns score 70-85 with specific suggestions

TC-002: Excellent Spec
  Given: High-quality spec with clear criteria
  When: quality-judge runs
  Then: Returns score 90+ with minimal suggestions

TC-003: Poor Spec
  Given: Vague spec with unclear requirements
  When: quality-judge runs
  Then: Returns score <60 with critical issues

TC-004: Export to Tasks
  Given: Quality assessment with 3 suggestions
  When: User selects "Export to tasks"
  Then: 3 tasks added to tasks.md with priority labels
```

---

## 3. TEST-AWARE PLANNING (NEW v0.7.0)

### Location & Entry Points

**Agent**: `test-aware-planner`
**File**: `/Users/antonabyzov/Projects/github/specweave/plugins/specweave/agents/test-aware-planner/AGENT.md`
**Invocation**: Automatic after PM spec generation
**Generates**: `.specweave/increments/####/tasks.md`

### Architecture Change (v0.7.0)

**OLD** (pre-v0.7.0):
```
spec.md (user stories)
plan.md (architecture)
tasks.md (implementation tasks - references TC-IDs)
tests.md (test cases with TC-IDs) ← SEPARATE FILE
```

**NEW** (v0.7.0+):
```
spec.md (user stories with AC-IDs)
plan.md (architecture)
tasks.md (tasks with EMBEDDED test plans) ← SINGLE FILE
```

### Why the Change?

✅ Single source of truth (no spec.md ↔ tests.md sync issues)
✅ Simpler (one file vs two)
✅ Industry-aligned (BDD, Agile patterns)
✅ Clearer workflow ("Complete T-001" = implement + pass tests)
✅ Better test coverage tracking (AC-ID → T-ID → tests)

### Task Format (NEW With Embedded Tests)

```markdown
### T-001: Implement Feature X

**User Story**: US1
**Acceptance Criteria**: AC-US1-01, AC-US1-02
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** user is logged in
- **When** user clicks "Login" button
- **Then** user is redirected to dashboard
- **And** welcome email is sent

**Test Cases**:
1. **Unit**: `tests/unit/auth.test.ts`
   - testValidLogin(): Verify JWT generation
   - testInvalidPassword(): Verify error handling
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/auth-flow.test.ts`
   - testFullLoginFlow(): Complete flow end-to-end
   - **Coverage Target**: 85%

3. **E2E**: `tests/e2e/auth.spec.ts`
   - userCanLoginWithValidCreds(): Browser-based test
   - **Coverage Target**: 100% (critical path)

**Overall Coverage Target**: 85-90%

**Implementation**:
1. Step 1: Create AuthService.ts
2. Step 2: Implement login() function
3. Step 3: Add JWT generation
4. Step 4: Run unit tests (should pass: 2/2)
5. Step 5: Run integration tests (should pass: 1/1)
6. Step 6: Run E2E tests (should pass: 1/1)

**TDD Workflow** (if enabled):
1. 📝 Write all N tests above (should fail)
2. ❌ Run tests: `npm test` (0/N passing)
3. ✅ Implement feature (step-by-step)
4. 🟢 Run tests: `npm test` (N/N passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥85%
```

### Frontmatter (tasks.md Header)

```yaml
---
increment: 0007-smart-increment-discipline
total_tasks: 24
completed_tasks: 0
test_mode: TDD  # or "standard"
coverage_target: 85%
---
```

### Test Plan Format (BDD)

All test plans use **Given-When-Then** (Gherkin) format:
- **Given** - Precondition/setup
- **When** - Action or event
- **Then** - Expected outcome
- **And** - Additional conditions (optional)

### Coverage Targets

Per-task guidance:
- **Unit tests**: 80-90%
- **Integration tests**: 75-85%
- **E2E tests**: 100% for critical paths, 50%+ for others
- **Overall target**: 85-90%

### AC-ID to Task Mapping

```
spec.md:
  AC-US1-01: User can login

tasks.md:
  T-001: (AC: AC-US1-01)

check-tests output:
  AC-US1-01 → Covered by T-001 ✅
```

### Workflow Integration

Invoked automatically when:
1. User creates increment: `/specweave:inc "feature"`
2. PM Agent creates spec.md
3. Architect creates plan.md
4. test-aware-planner generates tasks.md with embedded tests

### TDD Workflow Mode

When `test_mode: TDD` is set:
1. Red: Write failing tests first
2. Green: Implement minimal code to pass
3. Refactor: Improve code while keeping tests green

---

## 4. TEST COVERAGE VALIDATION

### Location & Entry Points

**Command**: `/check-tests` or `/specweave:validate-coverage`
**File**: `/Users/antonabyzov/Projects/github/specweave/plugins/specweave/commands/check-tests.md`
**Validation**: `/specweave/commands/validate-coverage.md` (OLD format)
**Test**: `.specweave/integration/increment-quality-judge/increment-quality-judge.test.ts`

### What It Does

Validates test coverage from tasks.md (NEW format):
- ✅ Task test coverage (which tasks have tests)
- ✅ Test pass/fail status (if implemented)
- ✅ Coverage targets vs actual coverage
- ✅ AC-ID coverage (which acceptance criteria are tested)
- ✅ Missing tests or gaps

### Output Example

```bash
/check-tests 0007

📊 Test Status Report: 0007-smart-increment-discipline

═══════════════════════════════════════════════════════════════

Task Coverage Analysis:

✅ T-001: Update plan.md (N/A - documentation)
   Validation: Manual review complete

✅ T-003: Create test-aware-planner structure (2 test cases, 85% coverage)
   - Manual: Directory structure verified ✅
   - Integration: tests/integration/test-aware-planner/agent-invocation.test.ts
     • testAgentCanBeInvoked() ✅ (passed)
     • testAgentReadsSpecPlan() ✅ (passed)
   Coverage: 87% (target: 85%) ✅

⚠️  T-007: Create check-tests command (0 test cases, 0% coverage)
   WARNING: No test plan defined!
   Action: Add test cases to T-007 or mark as non-testable

❌ T-008: Implement check-tests logic (3 test cases, 45% coverage)
   - Unit: tests/unit/check-tests.test.ts
     • testParseTasksMd() ❌ (failing: Expected 3 tasks, got 2)
     • testExtractTestCases() ✅ (passed)
     • testCalculateCoverage() ⏸️  (not implemented)
   Coverage: 45% ❌ (target: 85%, below threshold!)
   Action: Fix failing test, implement missing test

═══════════════════════════════════════════════════════════════

Overall Coverage: 72% ⚠️  (target: 80-90%)

Breakdown:
- Testable tasks: 15/24 (62%)
- Non-testable tasks: 9/24 (38%) ✅
- Average coverage (testable): 78% ⚠️
- Tests passing: 12/18 (67%) ⚠️
- Tests failing: 3/18 (17%) ❌
- Tests not implemented: 3/18 (17%) ⏸️

═══════════════════════════════════════════════════════════════

Acceptance Criteria Coverage:

✅ AC-US1-01: Covered by T-001, T-003 (6 tests, 88% coverage)
✅ AC-US1-02: Covered by T-002, T-004 (4 tests, 92% coverage)
⚠️  AC-US2-01: Partially covered by T-007 (0 tests)
   Missing: Unit tests for command logic
❌ AC-US3-05: Not covered by any task
   Action: Add task for AC-US3-05 or mark as won't-do
```

### Flags

```bash
/check-tests 0007                    # Basic report
/check-tests 0007 --detailed         # Expanded with line numbers
/check-tests 0007 --ac-coverage      # AC-ID coverage only
```

### Integration with Workflow

Run at these points:
1. **During development**: After implementing tasks
2. **Before PR**: Ensure coverage meets targets
3. **In CI/CD**: Automated validation
4. **PM Gate 2**: Part of `/specweave:done` (runs automatically)

### Exit Codes (For CI/CD)

```
0 = All tests passing, coverage ≥80%
1 = Tests failing
2 = Coverage <80%
3 = AC-IDs not covered
4 = Command error
```

### Backward Compatibility

Supports BOTH formats:
- **NEW** (v0.7.0+): Parse tasks.md for embedded tests
- **OLD** (pre-v0.7.0): Parse tests.md for TC-IDs

Auto-detects format and uses appropriate parser.

---

## 5. PM GATES (Increment Discipline)

### Location & Entry Points

**Agent**: PM Agent (`/specweave/agents/pm/AGENT.md`)
**Enforcer**: IncrementStatusDetector (`src/core/increment-status.ts`)
**Trigger Points**: 
- `/specweave:inc` - Plan new increment
- `/specweave:done` - Close increment
- Auto-validation on progress check

### The Iron Rule

**"You CANNOT start increment N+1 until increment N is DONE"**

This is **NON-NEGOTIABLE** and **ENFORCED**.

### What Constitutes "DONE"

Increment is DONE if **ONE** of:
1. ✅ All tasks in `tasks.md` marked `[x] Completed`
2. ✅ `COMPLETION-SUMMARY.md` or `COMPLETION-REPORT.md` exists with "COMPLETE" status
3. ✅ Explicit closure via `/specweave:close` with documentation

### Enforcement Mechanism

**Step 0A (MANDATORY Pre-Planning Validation)**

```typescript
// Before planning any new increment

// Import the status detector
import { IncrementStatusDetector } from '../../src/core/increment-status';

// Check for incomplete increments
const detector = new IncrementStatusDetector();
const incomplete = await detector.getAllIncomplete();

if (incomplete.length > 0) {
  // ❌ BLOCK IMMEDIATELY
  console.log('❌ Cannot plan new increment! Previous increments incomplete.');
  
  incomplete.forEach(status => {
    console.log(`📋 ${status.id}: ${status.percentComplete}% complete`);
    console.log(`   ${status.completedTasks}/${status.totalTasks} tasks done`);
  });

  console.log('💡 Use /specweave:close to close incomplete increments.');
  
  // EXIT - Do NOT plan
  throw new Error('Increment discipline violation');
}

// ✅ If we reach here, proceed with planning
```

### User Experience When Blocked

```bash
/specweave:inc "new-feature"

❌ Cannot create new increment!

Previous increments are incomplete:

📋 Increment 0002-core-enhancements
   Status: 73% complete (11/15 tasks)
   Pending:
     - T-008: Migrate DIAGRAM-CONVENTIONS.md content
     - T-010: Create context-manifest.yaml
     - T-012: Test agent invocation manually
     - T-013: Run skill test suite
     - T-015: Create PR when increment complete

📋 Increment 0003-intelligent-model-selection
   Status: 50% complete (11/22 tasks)
   Pending: 11 tasks

💡 What would you like to do?

1️⃣  Close incomplete increments: /specweave:close
2️⃣  Check status: /specweave:status
3️⃣  Force create (DANGEROUS): Add --force flag to bypass
```

### Why This Rule Exists

**Without discipline**:
- Multiple incomplete increments pile up (0002, 0003, 0006 all in progress)
- No clear source of truth ("which increment are we working on?")
- Living docs become stale (sync doesn't know what's current)
- Scope creep (jumping between features without finishing)
- Quality degradation (tests not run, docs not updated)

**With discipline**:
- ✅ ONE increment active at a time
- ✅ Clear source of truth
- ✅ Living docs stay current
- ✅ Focus on completion
- ✅ Quality enforced

### Three Options for Closing Incomplete Increments

#### Option 1: Adjust Scope (Simplest, Recommended)

```bash
# 1. Edit spec.md - remove features you're not doing
# 2. Delete plan.md and tasks.md
# 3. Regenerate from spec
/specweave:inc "same increment" --regenerate

# Now tasks match reduced scope → 100% complete!
```

#### Option 2: Move Scope to Next Increment

```bash
# Via /specweave:close
# Select "Move tasks to next increment"
# Tasks are migrated with documentation
# Old increment closed, new increment gets the work
```

#### Option 3: Extend Existing Increment (Merge Work)

```bash
# Instead of creating 0003, extend 0002:
# 1. Update spec.md to include new features
# 2. Update plan.md with new implementation details
# 3. Add new tasks to tasks.md

# Work on combined scope in ONE increment
/specweave:do
```

### WIP Limits Configuration

```json
{
  "limits": {
    "maxActiveIncrements": 1,     // Default: 1 active (focus)
    "hardCap": 2,                 // Emergency ceiling (never exceeded)
    "allowEmergencyInterrupt": true, // hotfix/bug can interrupt
    "typeBehaviors": {
      "canInterrupt": ["hotfix", "bug"], // Emergency types
      "autoAbandonDays": {
        "experiment": 14  // Auto-abandon stale experiments
      }
    }
  }
}
```

**Enforcement**:
- **0 active** → Create new (no warnings)
- **1 active** → Warn about context switching (allow with confirmation)
- **2 active** → HARD BLOCK (must complete or pause one first)
- **Exception**: Hotfix/bug can interrupt to start 2nd active (emergency only)

### Exception: The --force Flag

For **emergencies only**:

```bash
/specweave:inc "urgent-security-fix" --force
```

**This bypasses the check** but:
- ✅ Logs the force creation
- ✅ Warns in CLI output
- ✅ Should be explained in PR/standup
- ✅ Should close previous increments ASAP

---

## 6. LIVING COMPLETION REPORTS (v0.7.0+)

### Location

**File**: `.specweave/increments/{id}/reports/COMPLETION-REPORT.md`

### Purpose

Track scope changes in real-time with audit trail:

**OLD** (traditional approach):
```
Start increment: Plan 10 user stories
During work: Scope changes 5 times (not documented)
End increment: Write report "Completed 8/10 stories"
Future: "Why was Story 5 removed?" → No one remembers!
```

**NEW** (SpecWeave approach):
```
Start: Initialize completion report (v1.0)
During work:
  - 2025-11-06: Added US6 (dark mode) → /update-scope → v1.1
  - 2025-11-07: Deferred US3 (CSV export) → /update-scope → v1.2
  - 2025-11-08: WebSockets → Polling pivot → /update-scope → v1.3
End: Finalize report with complete scope evolution history
Future: "Why was Story 5 removed?" → Check report, find exact reason!
```

### Workflow

```bash
# 1. Create increment
/specweave:inc "User dashboard"
# Creates: COMPLETION-REPORT.md (v1.0)

# 2. Log changes during work
/specweave:update-scope "Added dark mode toggle (stakeholder request, +16 hours)"
# Updates: COMPLETION-REPORT.md (v1.1)

# 3. Finalize at completion
/specweave:done 0008
# Validates report completeness
# Marks increment as complete
```

### Entry Format

```markdown
### 2025-11-06: Added user story

**Changed**: US6: Dark mode toggle
**Reason**: Stakeholder request from CMO (high priority, blocks marketing launch)
**Impact**: +16 hours
**Decision**: PM + CMO
**Documentation**: GitHub issue #45
```

---

## 7. AGENTS & ORCHESTRATION

### Quality-Related Agents

**1. PM Agent** (`agents/pm/AGENT.md`)
- **Role**: Product Manager
- **Responsibility**: Enforce increment discipline, gate planning
- **Key Task**: Step 0A validation (check for incomplete increments)

**2. Test-Aware Planner Agent** (`agents/test-aware-planner/AGENT.md`)
- **Role**: Generate tasks.md with embedded test plans
- **Responsibility**: BDD format, AC-ID mapping, coverage targets

**3. QA Lead Agent** (`agents/qa-lead/AGENT.md`)
- **Role**: Quality assurance specialist
- **Responsibility**: Test strategy, coverage validation

**4. Architect Agent** (`agents/architect/AGENT.md`)
- **Role**: Technical architecture design
- **Responsibility**: plan.md creation, ADR decisions

**5. Security Agent** (`agents/security/AGENT.md`)
- **Role**: Security specialist
- **Responsibility**: Security considerations, vulnerability checks

**6. Tech Lead Agent** (`agents/tech-lead/AGENT.md`)
- **Role**: Technical leadership
- **Responsibility**: Technology stack decisions, best practices

**7. TDD Orchestrator Agent** (`agents/tdd-orchestrator/AGENT.md`)
- **Role**: Test-Driven Development workflow
- **Responsibility**: Red-Green-Refactor cycle coordination

**8. Performance Agent** (`agents/performance/AGENT.md`)
- **Role**: Performance optimization
- **Responsibility**: Performance targets, profiling, optimization

---

## 8. SKILLS (Auto-Activating)

### Quality-Related Skills

**1. increment-quality-judge** (`skills/increment-quality-judge/SKILL.md`)
- **Description**: AI-powered quality assessment
- **Activation**: "validate quality", "quality check", "assess spec"
- **Tools**: Read, Grep, Glob
- **Cost**: ~$0.02 per assessment

**2. increment-planner** (`skills/increment-planner/SKILL.md`)
- **Description**: Feature planning and breakdown
- **Activation**: "plan feature", "create increment", "new feature"

**3. context-optimizer** (`skills/context-optimizer/SKILL.md`)
- **Description**: Token efficiency optimization
- **Activation**: "optimize context", "reduce tokens"

**4. specweave-framework** (`skills/specweave-framework/SKILL.md`)
- **Description**: Framework knowledge
- **Activation**: "specweave rules", "how does specweave work"

---

## 9. COMMANDS

### Validation Commands

1. **`/validate`** or **`/specweave:validate`**
   - Run 120 rule-based checks
   - Optional AI quality assessment
   - Flags: `--quality`, `--export`, `--fix`, `--always`

2. **`/check-tests`** or **`/specweave:validate-coverage`**
   - Validate test coverage from tasks.md
   - AC-ID coverage report
   - Flags: `--detailed`, `--ac-coverage`

3. **`/progress`** or **`/specweave:progress`**
   - Show increment progress
   - Test coverage status
   - Next actions

4. **`/done`** or **`/specweave:done`**
   - Close increment
   - Auto-runs `/check-tests`
   - Validates completion

### Plan/Create Commands

5. **`/inc`** or **`/specweave:inc`**
   - Create new increment
   - Enforces increment discipline (Step 0A validation)
   - Generates spec, plan, tasks with embedded tests

6. **`/do`** or **`/specweave:do`**
   - Execute tasks
   - Smart resume of incomplete work

---

## 10. HOOKS (Automated Validation)

### Post-Document-Save Hook

**File**: `.claude/hooks/post-document-save.sh`
**Trigger**: User saves spec.md, plan.md, tasks.md, or tests.md
**Action**: Auto-runs quick validation (5-10s)
**Output**: Immediate feedback on save

---

## 11. BMAD METHOD EXPERT

### What Is BMAD?

**BMAD** = (Acronym - context in codebase suggests specialized methodology)

**Location**: `/Users/antonabyzov/Projects/github/specweave/tests/integration/bmad-method-expert/bmad-method-expert.test.ts`

**Status**: Test placeholder (tests TODO)
**Evidence**: Comparison file at `youtube-content/comparisons/bmad-comparison.md`

**Likely Purpose**: Specialized quality methodology or assessment framework

---

## 12. INTEGRATION POINTS

### Validation Workflow

```
User saves spec.md/plan.md/tasks.md
        ↓
Post-document-save hook fires
        ↓
increment-validator skill (quick validation - 5-10s)
    - 120 validation rules
    - Consistency, completeness, quality, traceability
        ↓
    ✅ Clean? → Report success
    ❌ Issues? → Invoke validator agent
        ↓
increment-validator agent (deep analysis - 30-60s)
    - PM perspective (business requirements)
    - Architect perspective (technical design)
    - QA perspective (test coverage)
    - Security perspective (security considerations)
        ↓
Generate: validation-report.md in increment/reports/
        ↓
Notify user with actionable recommendations
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml

- name: Validate increment
  run: npx specweave validate $INCREMENT_ID

- name: Check test coverage
  run: npx specweave check-tests $INCREMENT_ID
  
- name: Verify quality
  run: npx specweave validate $INCREMENT_ID --quality
```

### Closing Increments

```bash
/done 0007
  ↓
1. Validates spec.md exists and is complete
2. Validates plan.md exists and is complete
3. Validates tasks.md and runs /check-tests
   - Must have ≥80% test coverage
   - All AC-IDs must be covered
   - Tests must pass
4. Generates COMPLETION-REPORT.md
5. Marks increment as COMPLETE
6. Enforces: Cannot start 0008 until 0007 is DONE
```

---

## 13. GAPS & LIMITATIONS

### Known Gaps

1. **BMAD Method Expert**
   - Status: Test placeholder (tests not implemented)
   - Location: `/tests/integration/bmad-method-expert/`
   - Todo: Implement actual test cases

2. **Increment Quality Judge Tests**
   - Status: Test placeholder (tests not implemented)
   - Location: `/tests/integration/increment-quality-judge/`
   - Todo: Implement actual test logic

3. **Auto-Fix (Experimental)**
   - Limited to HIGH priority issues with clear improvements
   - Requires manual review before applying

4. **Domain-Specific Validation**
   - Cannot validate against company standards
   - Cannot understand domain-specific requirements (healthcare, finance)
   - Requires domain expertise input

5. **Cross-Increment Validation**
   - Currently validates in isolation
   - Could track patterns across all increments (future)

### What's Not (Yet) Implemented

- ❌ Visual coverage reports (HTML generation)
- ❌ Coverage trend tracking (over time)
- ❌ Parallel test execution for speed
- ❌ Custom quality criteria per project
- ❌ IDE integration (VS Code extension)

---

## 14. CONFIGURATION

### Validation Configuration

**File**: `.specweave/config.json` or `.specweave/config.yaml`

```json
{
  "validation": {
    "enabled": true,
    "auto_validate": true,              // Validate on save
    "severity_threshold": "warning",    // When to invoke agent

    "rules": {
      "consistency": true,
      "completeness": true,
      "quality": true,
      "traceability": true,
      "risk_assessment": true
    },

    "quality_judge": {
      "enabled": true,
      "always_run": false,
      "auto_prompt": true,
      "thresholds": {
        "excellent": 90,
        "good": 80,
        "acceptable": 70
      },
      "max_tokens": 2000
    },

    "reports": {
      "save_to": "reports/validation-report.md",
      "format": "markdown",              // markdown | json | html
      "include_line_numbers": true,
      "include_suggestions": true
    }
  },

  "limits": {
    "maxActiveIncrements": 1,
    "hardCap": 2,
    "allowEmergencyInterrupt": true
  }
}
```

---

## 15. SUMMARY TABLE

| Feature | Location | Type | Scope | Cost | Status |
|---------|----------|------|-------|------|--------|
| **Rule-Based Validation** | `plugins/specweave/commands/validate.md` | Command | 120 rules, 4 categories | Free | ✅ Complete |
| **Quality Judge (LLM)** | `plugins/specweave/skills/increment-quality-judge/` | Skill | 6 dimensions | ~$0.02/assessment | ✅ Complete |
| **Test-Aware Planning** | `plugins/specweave/agents/test-aware-planner/` | Agent | BDD tasks, AC-ID mapping | Included | ✅ Complete |
| **Test Coverage Validation** | `plugins/specweave/commands/check-tests.md` | Command | AC-ID traceability, coverage % | Free | ✅ Complete (v0.7.0+) |
| **PM Gates** | `plugins/specweave/agents/pm/` | Agent | Increment discipline enforcement | Free | ✅ Complete |
| **Completion Reports** | `.specweave/increments/####/reports/` | Living Doc | Scope change audit trail | Free | ✅ Complete (v0.7.0+) |
| **Auto-Validation Hooks** | `.claude/hooks/post-document-save.sh` | Hook | Triggers on save | Free | ✅ Complete |
| **BMAD Method Expert** | `tests/integration/bmad-method-expert/` | Skill/Agent | TBD | TBD | 🚧 Placeholder |

---

## 16. KEY ARCHITECTURE DECISIONS

### Single Source of Truth

- **spec.md** is definitive for requirements
- **plan.md** is definitive for architecture
- **tasks.md** embeds both (not separate tests.md)
- No bidirectional sync issues

### Progressive Disclosure

- Quick validation (free, fast)
- Optional deep dive (paid, detailed)
- User decides based on needs

### LLM-as-Judge Pattern

- Not replacing human judgment
- Supplementing rule-based checks
- Catching subtle issues (vagueness, edge cases)
- Confidence scores indicate reliability

### Increment Discipline = Quality

- One active increment forces focus
- Prevents scope creep
- Ensures completion
- Maintains living docs accuracy

---

## 17. RECOMMENDED USAGE PATTERNS

### For Daily Development

```bash
# 1. Create increment
/specweave:inc "feature name"
# Auto-runs: PM validation, Architect planning, test-aware task generation

# 2. Implement tasks
/specweave:do
# Auto-runs: Post-task hooks, living docs sync

# 3. Check progress
/specweave:progress
# Shows: Task completion %, test coverage, next actions

# 4. Close increment
/specweave:done
# Auto-runs: Quality checks, test validation, completion report
```

### For Quality Gates

```bash
# Before implementation
/validate <id> --quality
# Runs: 120 rule checks + AI quality assessment

# After development
/check-tests <id>
# Shows: Test status, coverage %, AC-ID coverage

# Final validation
/done <id>
# Blocks unless ≥80% test coverage + all AC-IDs covered
```

### For High-Risk Features

```bash
# 1. Create with strict quality
/specweave:inc "risky-feature"
/validate 0007 --quality --always
# Sets: Always run quality assessment for this increment

# 2. Implement with TDD
# (test_mode: TDD in tasks.md)

# 3. Export suggestions
/validate 0007 --quality --export
# Adds: Quality suggestions as tasks

# 4. Close with confidence
/done 0007
# Requires: All tests passing, coverage ≥90%, all AC-IDs tested
```

---

## CONCLUSION

SpecWeave implements a **comprehensive, multi-layered QA system** that combines:

1. **Automated Rule-Based Validation** (fast, free, reliable)
2. **AI-Powered Quality Assessment** (deeper, optional, paid)
3. **Test-Aware Planning** (BDD, embedded tests, AC-ID traceability)
4. **Test Coverage Validation** (per-task, per-AC-ID, trending)
5. **Discipline Enforcement** (increment discipline = quality)
6. **Living Documentation** (scope change audit trail)
7. **Intelligent Orchestration** (agents, hooks, skill activation)

This architecture ensures:
- ✅ **High-quality specs** before implementation
- ✅ **Complete test coverage** (AC-ID traceability)
- ✅ **Clear scope management** (no creep)
- ✅ **Maintained living docs** (always current)
- ✅ **Quality enforcement** (gates at every stage)

---

**Generated**: 2025-11-04
**Scope**: SpecWeave v0.7.0+ (v0.3.8+)
**Completeness**: VERY THOROUGH (All features mapped)
