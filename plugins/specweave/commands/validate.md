---
name: specweave:validate
description: Validate SpecWeave increment with rule-based checks and optional AI quality assessment
---

# Validate Increment

You are helping the user validate a SpecWeave increment with optional AI-powered quality assessment.

## Usage

```bash
/specweave:validate <increment-id> [--quality] [--export] [--fix] [--always]
```

## Arguments

- `<increment-id>`: Required. Increment ID (e.g., "001", "0001", "1", "0042")

## Flags

- `--quality`: **Run LLM-as-Judge gate** (AI quality assessment, ~2k tokens, 1-2 minutes)
- `--export`: Export AI suggestions to tasks.md automatically
- `--fix`: Auto-fix HIGH priority issues (experimental, requires confirmation)

## Quality Gates

This command implements a **two-gate validation system**:

```
┌─────────────────────────────────────────────────────────────┐
│              GATE 1: Rule-Based Validation                  │
│                    (Always runs, FREE)                      │
├─────────────────────────────────────────────────────────────┤
│  130+ automated checks:                                     │
│  • Structure (file existence, format)                       │
│  • Three-file canonical (ADR-0047 compliance)              │
│  • Consistency (cross-document alignment)                   │
│  • Completeness (required sections)                         │
│  • Traceability (AC-ID linkage)                            │
│                                                             │
│  Result: PASS (all checks) or FAIL (with specific errors)  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              GATE 2: LLM-as-Judge                           │
│                 (Optional, --quality flag)                  │
├─────────────────────────────────────────────────────────────┤
│  AI-powered evaluation using chain-of-thought reasoning:   │
│  • 6 quality dimensions (clarity, testability, etc.)       │
│  • Evidence-based scoring (0-100 per dimension)            │
│  • Structured suggestions with code examples               │
│  • Formal verdict (score + recommendations)                │
│                                                             │
│  Pattern: "LLM-as-Judge" (established AI/ML technique)     │
│  Cost: ~$0.02-0.05 per assessment                          │
└─────────────────────────────────────────────────────────────┘
```

**Why two gates?**
- **Gate 1** catches structural issues (FREE, instant)
- **Gate 2** catches semantic issues (paid, ~30 seconds)
- Run Gate 1 first to avoid wasting tokens on invalid specs

## Workflow

### Step 1: Parse and Validate Arguments

1. **Extract increment ID**:
   - Parse from command: `/specweave:validate 001` → "001"
   - Normalize to 4-digit format: "0001"
   - Support formats: "1", "01", "001", "0001"

2. **Extract flags**:
   - Check for `--quality` flag
   - Check for `--export` flag
   - Check for `--fix` flag
   - Check for `--always` flag

3. **Validate increment exists**:
   - List directories in `.specweave/increments/`
   - Find matching increment (e.g., `0001-authentication`, `0001-auth`, etc.)
   - If not found: Show error with available increments

**Example output if not found**:
```
❌ Error: Increment 0001 not found

Available increments:
  • 0002-core-enhancements
  • 0003-payment-processing
  • 0004-reporting-dashboard

Usage: /specweave:validate-increment <id> [--quality] [--export] [--fix] [--always]
```

### Step 1.5: Sync AC Status (NEW - v0.33.0)

**Before running validation, synchronize spec.md ACs with tasks.md completion status**:

```typescript
import { ACStatusManager } from '../../../src/core/increment/ac-status-manager.js';

// Sync ACs BEFORE validation to prevent false positives
// This ensures spec.md ACs reflect actual task completion from tasks.md
console.log('🔄 Syncing AC status before validation...');
const acManager = new ACStatusManager(projectRoot);
const acSyncResult = await acManager.syncACStatus(incrementId);

if (acSyncResult.synced && acSyncResult.updated.length > 0) {
  console.log(`✅ Pre-validation sync: Updated ${acSyncResult.updated.length} ACs`);
  acSyncResult.updated.forEach(acId => console.log(`   ${acId} → [x]`));
} else {
  console.log('✅ AC status already in sync');
}
```

**Why this matters**:
- Background hooks (`post-task-completion.sh`) run async and may not complete before validation
- This explicit sync prevents "0 ACs checked" false positives
- Idempotent: safe to call multiple times (no-op if already synced)

### Step 2: Run Rule-Based Validation (Always)

Run 130+ validation rules across 7 categories:

**CRITICAL: Always run structure validation FIRST to prevent duplicate task files**

1. **Structure Rules (5 checks)** - v0.18.4:
   - Only ONE tasks.md file exists (no tasks-detailed.md, tasks-final.md)
   - Only allowed root files present (spec.md, plan.md, tasks.md, metadata.json, README.md)
   - Unknown files moved to subdirectories (reports/, scripts/, logs/)
   - No root-level pollution (analysis.md, summary.md moved to reports/)
   - Metadata.json structure valid

2. **Three-File Canonical Structure (10 checks)** - ADR-0047 (v0.21.3):
   - **tasks.md validations (CRITICAL)**:
     - ❌ Does NOT contain "**Acceptance Criteria**:" sections
     - ✅ MUST have "**Implementation**:" sections for each task
     - ✅ MUST have "**Test Plan (BDD)**" sections
     - ✅ MUST have **AC-IDs** references linking to spec.md
     - ❌ Does NOT contain "As a user..." user story language
   - **spec.md validations**:
     - ❌ Does NOT contain task IDs (T-001, T-002, etc.)
     - ❌ Does NOT contain technical class/file names
     - ✅ MUST have "## Acceptance Criteria" section
   - **plan.md validations**:
     - ❌ Does NOT contain "Acceptance Criteria" sections
     - ❌ Does NOT contain task checkboxes

3. **Consistency Rules (47 checks)**:
   - User stories in spec.md → sections in plan.md
   - Components in plan.md → tasks in tasks.md
   - Test cases (TC-0001) in spec.md → tests.md coverage
   - Cross-document consistency (IDs, priorities, dependencies)

4. **Completeness Rules (23 checks)**:
   - spec.md: Frontmatter, problem statement, user stories, acceptance criteria
   - plan.md: Architecture, components, data model, API contracts, security
   - tasks.md: Task IDs, descriptions, priorities, estimates

5. **Quality Rules (31 checks)**:
   - spec.md: Technology-agnostic, testable acceptance criteria
   - plan.md: Technical details, ADRs exist, security addressed
   - tasks.md: Actionable, reasonable estimates (<1 day)

6. **Traceability Rules (19 checks)**:
   - TC-0001 format, sequential numbering
   - ADR references exist
   - Diagram references valid

7. **AC Coverage & Traceability (NEW - v0.23.0)**:
   - All Acceptance Criteria have implementing tasks (0% uncovered)
   - All tasks link to valid User Stories (**User Story**: US-XXX)
   - All tasks link to valid Acceptance Criteria (**Satisfies ACs**: AC-USXX-YY)
   - No orphan tasks (tasks without AC linkage)
   - AC-Task traceability matrix builds successfully
   - Per-User Story coverage calculated

**Display results**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALIDATION RESULTS: Increment 0001-authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Rule-Based Validation: PASSED (141/141 checks)
   ✓ Structure (5/5)
   ✓ Three-File Canonical (10/10) [ADR-0047]
   ✓ Consistency (47/47)
   ✓ Completeness (23/23)
   ✓ Quality (31/31)
   ✓ Traceability (19/19)
   ✓ AC Coverage & Traceability (6/6) [NEW - v0.23.0]
      • 100% AC coverage (15/15 ACs covered)
      • 0 orphan tasks
      • All tasks linked to valid User Stories

Files validated:
  • spec.md (250 lines, 6 user stories)
  • plan.md (480 lines, 8 components)
  • tasks.md (42 tasks, P0-P2)
  • tests.md (12 test cases, 85% coverage)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**If errors found**:
```
❌ Rule-Based Validation: FAILED (128/141 checks)
   ❌ Structure (3/5) - 2 CRITICAL ERRORS
   ❌ Three-File Canonical (7/10) - 3 CRITICAL ERRORS [ADR-0047]
   ✓ Consistency (45/47) - 2 errors
   ✓ Completeness (23/23)
   ⚠️  Quality (28/31) - 3 warnings
   ✓ Traceability (19/19)
   ❌ AC Coverage & Traceability (3/6) - 3 ERRORS [NEW - v0.23.0]
      • 73% AC coverage (11/15 ACs covered) - 4 uncovered
      • 2 orphan tasks detected
      • All US linkage valid

CRITICAL STRUCTURE ERRORS (MUST FIX FIRST):
  ❌ Duplicate task files detected: tasks.md, tasks-detailed.md
     → Only ONE tasks.md allowed per increment
     → Move tasks-detailed.md to reports/tasks-detailed.md
  ❌ Unknown root-level file: analysis.md
     → Move to reports/ directory

CRITICAL THREE-FILE VIOLATIONS (ADR-0047):
  🚨 tasks.md:45 - Contains "**Acceptance Criteria**:" section
     → ACs belong in spec.md ONLY
     → Replace with "**Implementation**:" and add AC-ID references
  🚨 tasks.md:78 - Task T-003 missing "**Implementation**:" section
     → Add checkable implementation steps
  🚨 spec.md:102 - Contains task ID reference "T-001"
     → Tasks belong in tasks.md, use AC-IDs to link instead

AC COVERAGE ERRORS (3) [NEW - v0.23.0]:
  🔴 4 Acceptance Criteria uncovered by tasks:
     → AC-US2-03: Real-time notification delivery (no implementing tasks)
     → AC-US3-01: API rate limiting (no implementing tasks)
     → AC-US3-05: Error handling for network failures (no implementing tasks)
     → AC-US4-02: Audit logging for security events (no implementing tasks)
  🔴 2 Orphan tasks (no AC linkage):
     → T-008: Refactor authentication module (no **Satisfies ACs** field)
     → T-015: Update documentation (no **Satisfies ACs** field)

ERRORS (2):
  🔴 spec.md:45 - Missing acceptance criteria for US-003
  🔴 Inconsistency: spec.md mentions "real-time updates" but plan.md doesn't address it

WARNINGS (3):
  🟡 Task T012 exceeds size guideline (5 days, should be <1 day)
  🟡 No security considerations in plan.md
  🟡 ADR-0005 referenced but doesn't exist (plan.md:89)

Action required:
1. ❗ FIX STRUCTURE ERRORS FIRST (single source of truth violation)
2. 🚨 FIX THREE-FILE VIOLATIONS (ADR-0047 compliance):
   - Run refactoring script: .specweave/increments/XXXX/scripts/refactor-tasks-ac-to-implementation.sh
   - Or manually replace "**Acceptance Criteria**:" with "**Implementation**:"
   - Add "**AC-IDs**: AC-US-XX-YY" references to link tasks to spec.md
3. 🔴 FIX AC COVERAGE ERRORS (v0.23.0 - US-Task Linkage):
   - Create tasks for 4 uncovered ACs (AC-US2-03, AC-US3-01, AC-US3-05, AC-US4-02)
   - Add **Satisfies ACs** field to 2 orphan tasks (T-008, T-015)
   - Run: /specweave:validate 0001 to verify 100% coverage
4. Fix missing acceptance criteria for US-003
5. Address "real-time updates" in plan.md or remove from spec.md
6. Consider breaking down T012 into smaller tasks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 3: Determine If Quality Assessment Should Run

**Check in this order**:

1. **If `--quality` flag provided**: Run quality assessment (skip prompt)
2. **Else**: Prompt user

**Prompt format** (if needed):
```
🤔 Run AI Quality Assessment? (Optional)

This will:
  • Evaluate spec clarity, testability, edge cases
  • Provide detailed improvement suggestions
  • Use ~2,000 tokens (1-2 minutes)
  • Cost: ~$0.05 (Claude Opus 4.5)

Your choice:
  [Y] Yes, assess quality
  [N] No, skip (default)
  [A] Always run (save to config)

Choice: _
```

### Step 4: Run AI Quality Assessment (If Approved)

**IMPORTANT**: Use the `increment-quality-judge-v2` **skill** (auto-activated) or CLI command:

```bash
# Preferred: Use CLI command directly
specweave qa 0001 --pre

# The skill auto-activates when assessing quality
# DO NOT spawn agents - use CLI instead
```

Assessment parameters:
- increment_id: "0001"
- files: ["spec.md", "plan.md", "tests.md"]
- dimensions: ["clarity", "testability", "completeness", "feasibility", "maintainability", "edge_cases"]

**Quality judge evaluates 6 dimensions**:

1. **Clarity** (weight: 0.20)
   - Is problem statement clear?
   - Are objectives well-defined?
   - Is terminology consistent?

2. **Testability** (weight: 0.25)
   - Are acceptance criteria testable?
   - Can success be measured objectively?
   - Are edge cases identifiable?

3. **Completeness** (weight: 0.20)
   - All requirements addressed?
   - Error handling specified?
   - Non-functional requirements included?

4. **Feasibility** (weight: 0.15)
   - Architecture scalable?
   - Technical constraints realistic?
   - Timeline achievable?

5. **Maintainability** (weight: 0.10)
   - Design modular?
   - Extension points identified?
   - Technical debt addressed?

6. **Edge Cases** (weight: 0.10)
   - Failure scenarios covered?
   - Performance limits specified?
   - Security considerations included?

**Display quality results**:
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
ISSUES FOUND (3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 MAJOR: Acceptance criteria not fully testable
    Dimension: Testability
    Location: spec.md, section "Success Criteria" (line 78)
    Issue: "User can log in successfully" is vague
    Impact: QA won't know when feature is complete

🔴 MAJOR: Rate limiting edge case not addressed
    Dimension: Edge Cases
    Location: plan.md, section "Security" (line 145)
    Issue: No mention of brute-force protection
    Impact: Security vulnerability risk (OWASP A07:2021)

🔸 MINOR: Performance requirements missing
    Dimension: Completeness
    Location: spec.md, section "Non-Functional Requirements"
    Issue: No latency or throughput targets specified
    Impact: Hard to measure success objectively

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUGGESTIONS (3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 HIGH PRIORITY: Make acceptance criteria measurable

   Current:
   "User can log in successfully"

   Improved:
   "User can log in with valid credentials within 2 seconds,
    receiving a JWT token with 24h expiry. Success rate >99.9%."

   Why: Testable criteria = clear success definition

🎯 HIGH PRIORITY: Specify edge case handling

   Add section: "Error Scenarios"
   - Rate limiting: 5 failed attempts → 15 min lockout
   - Invalid token: Return 401 with error code AUTH_INVALID
   - Expired session: Redirect to login with message
   - Network timeout: Retry 3 times with exponential backoff

   Why: Edge cases cause 60% of production bugs

🔹 MEDIUM PRIORITY: Add performance requirements

   Suggested addition to spec.md:
   - Login latency: p95 < 500ms, p99 < 1s
   - Concurrent logins: Support 100 requests/sec
   - Token validation: < 10ms per request
   - Uptime SLA: 99.9% (43 min downtime/month)

   Why: Performance is a feature, not an afterthought

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ This specification is GOOD (87/100)

Strengths:
  • Clear problem statement and objectives
  • Architecture is sound and scalable
  • Good coverage of functional requirements
  • Strong maintainability score

Areas for improvement:
  • Make acceptance criteria more testable (2 items)
  • Address edge cases (rate limiting, errors)
  • Add performance requirements

Recommendation: Address HIGH priority suggestions before
implementation. MEDIUM priority can be added incrementally.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 5: Handle Export Flag

**If `--export` flag OR user chooses "Export"**:

1. Parse all suggestions from quality assessment
2. Add to `.specweave/increments/0001-name/tasks.md`
3. Format as tasks with priority labels

**Example tasks.md addition**:
```markdown
## Quality Improvement Tasks (from AI assessment)

- [ ] **[HIGH]** Make acceptance criteria measurable (spec.md:78)
      Current: "User can log in successfully"
      Improved: "User can log in with valid credentials within 2 seconds, receiving JWT with 24h expiry"
      Estimated: 1h

- [ ] **[HIGH]** Specify edge case handling for rate limiting (plan.md:145)
      Add: Rate limiting (5 attempts → 15min lockout), invalid token handling, session expiry flow
      Estimated: 2h

- [ ] **[MEDIUM]** Add performance requirements (spec.md:120)
      Add: Login latency (p95 <500ms), concurrent logins (100/sec), token validation (<10ms)
      Estimated: 1h
```

**Display confirmation**:
```
✅ Exported 3 suggestions to tasks.md

Added tasks:
  • Make acceptance criteria measurable (HIGH, 1h)
  • Specify edge case handling (HIGH, 2h)
  • Add performance requirements (MEDIUM, 1h)

Total estimated effort: 4 hours
```

### Step 6: Handle Fix Flag (Experimental)

**If `--fix` flag provided**:

**Warning**: Auto-fix is experimental. Always show diff and ask confirmation.

1. **Identify fixable issues**:
   - Only attempt to fix HIGH priority issues
   - Only fix issues with clear, unambiguous improvements
   - Skip issues requiring domain knowledge

2. **Generate fixes**:
   - Use Edit tool to apply suggestions
   - Show diff before applying

3. **Show diff and ask confirmation**:
```
🔧 Auto-Fix Available (2/3 suggestions)

Fix 1: Make acceptance criteria measurable
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
File: spec.md (line 78)

- User can log in successfully
+ User can log in with valid credentials within 2 seconds,
+ receiving a JWT token with 24h expiry. Success rate >99.9%.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fix 2: Add performance requirements
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
File: spec.md (line 120)

+ ## Performance Requirements
+
+ - Login latency: p95 < 500ms, p99 < 1s
+ - Concurrent logins: Support 100 requests/sec
+ - Token validation: < 10ms per request
+ - Uptime SLA: 99.9% (43 min downtime/month)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Apply these fixes?
  [Y] Yes, apply all
  [S] Show more details
  [N] No, cancel
  [E] Export to tasks instead

Choice: _
```

4. **If user approves**:
   - Apply fixes using Edit tool
   - Re-run validation to confirm improvements
   - Show summary

**After applying fixes**:
```
✅ Applied 2 fixes successfully

Changes:
  • spec.md: Made acceptance criteria measurable (+3 lines)
  • spec.md: Added performance requirements section (+8 lines)

Re-validating...

✅ Rule-Based Validation: PASSED (120/120)
🔍 AI Quality Score: 92/100 (EXCELLENT) ✓✓

Improvement: 87 → 92 (+5 points)

Remaining issues: 1 (requires manual review)
```

### Step 7: Handle Always Flag

**If `--always` flag OR user selects "Always run"**:

1. SpecWeave uses auto-detection
```yaml
validation:
  quality_judge:
    enabled: true
    always_run: true      # ← Set to true
    auto_prompt: false    # ← Disable prompt
    thresholds:
      excellent: 90
      good: 80
      acceptable: 70
    dimensions:
      clarity: true
      testability: true
      completeness: true
      feasibility: true
      maintainability: true
      edge_cases: true
    max_tokens: 2000
    export_to_tasks: false  # User can still use --export flag
```

2. **Display confirmation**:
```
✅ Configuration updated

Quality assessment will now run automatically for all future validations.

To disable:
  1. Initialize your project
  2. Set validation.quality_judge.always_run: false

Or run: /specweave:validate-increment <id> (quality will run automatically)
```

### Step 8: Generate Validation Report

**Always generate detailed report** at:
`.specweave/increments/0001-name/reports/validation-report.md`

**Report structure**:
```markdown
# Validation Report: Increment 0001-authentication

Generated: 2025-10-28 14:32:15 UTC
Command: /specweave:validate-increment 001 --quality

## Executive Summary

**Overall Status**: ✅ PASSED (with recommendations)

- Rule-Based Validation: 120/120 checks passed
- AI Quality Score: 87/100 (GOOD)
- Issues Found: 3 (2 major, 1 minor)
- Suggestions: 3 (2 high, 1 medium priority)

## Rule-Based Validation Results

### Consistency (47/47) ✓
- User story → plan alignment: ✓
- Plan → tasks alignment: ✓
- Spec → tests traceability: ✓
- Cross-document consistency: ✓

### Completeness (23/23) ✓
- spec.md sections: ✓
- plan.md sections: ✓
- tasks.md structure: ✓

### Quality (31/31) ✓
- Technology-agnostic spec: ✓
- Testable acceptance criteria: ✓
- Actionable tasks: ✓

### Traceability (19/19) ✓
- TC-0001 format: ✓
- ADR references: ✓
- Diagram references: ✓

## AI Quality Assessment

### Overall Score: 87/100 (GOOD)

### Dimension Scores

| Dimension | Score | Grade | Status |
|-----------|-------|-------|--------|
| Clarity | 92/100 | ✓✓ | Excellent |
| Testability | 78/100 | ✓ | Needs improvement |
| Completeness | 90/100 | ✓✓ | Excellent |
| Feasibility | 88/100 | ✓✓ | Excellent |
| Maintainability | 85/100 | ✓ | Good |
| Edge Cases | 72/100 | ⚠️ | Action needed |

### Issues Found

#### 🔴 MAJOR: Acceptance criteria not fully testable
- **Dimension**: Testability
- **Location**: spec.md:78, section "Success Criteria"
- **Issue**: "User can log in successfully" is vague
- **Impact**: QA won't know when feature is complete
- **Recommendation**: Make criteria measurable with specific metrics

#### 🔴 MAJOR: Rate limiting edge case not addressed
- **Dimension**: Edge Cases
- **Location**: plan.md:145, section "Security"
- **Issue**: No mention of brute-force protection
- **Impact**: Security vulnerability risk (OWASP A07:2021)
- **Recommendation**: Add rate limiting (5 attempts → 15min lockout)

#### 🔸 MINOR: Performance requirements missing
- **Dimension**: Completeness
- **Location**: spec.md:120
- **Issue**: No latency or throughput targets
- **Impact**: Hard to measure success objectively
- **Recommendation**: Add p95 latency, concurrent users, SLA targets

### Suggestions

[Full suggestions with before/after examples]

## Recommendations

### Before Implementation
1. ✅ Fix 2 major issues (testability, edge cases)
2. ✅ Estimated effort: 3-4 hours

### During Implementation
1. Monitor testability of acceptance criteria
2. Add security tests for rate limiting
3. Set up performance monitoring

### Post-Implementation
1. Re-validate to confirm improvements
2. Update documentation with actual performance metrics
3. Create runbook for handling edge cases

## Files Validated

- spec.md (250 lines, 6 user stories, 15 requirements)
- plan.md (480 lines, 8 components, 3 ADRs)
- tasks.md (42 tasks, estimated 3-4 weeks)
- tests.md (12 test cases, 85% coverage)

## Validation History

| Date | Rule-Based | Quality Score | Command |
|------|------------|---------------|---------|
| 2025-10-28 | 120/120 | 87/100 | /specweave:validate-increment 001 --quality |
| 2025-10-25 | 115/120 | N/A | Auto-validation on save |
| 2025-10-24 | 110/120 | N/A | Auto-validation on save |

---

Generated by SpecWeave validation system
For details: .specweave/docs/internal/delivery/guides/increment-validation.md
```

**Notify user**:
```
📋 Full validation report saved:
   .specweave/increments/0001-authentication/reports/validation-report.md
```

## Examples

### Example 1: Basic Validation (Rule-Based Only)

```bash
/specweave:validate 001
```

**Output**:
```
✅ Rule-Based Validation: PASSED (120/120 checks)

🤔 Run AI Quality Assessment? [Y/n]: _
```

### Example 2: Validation with Quality Assessment

```bash
/specweave:validate 001 --quality
```

**Output**:
```
✅ Rule-Based: 120/120
🔍 AI Quality: 87/100 (GOOD)

Issues: 2 major, 1 minor
Suggestions: 3 (2 high, 1 medium)

📋 Full report: .specweave/increments/0001-auth/reports/validation-report.md
```

### Example 3: Validate and Export Suggestions

```bash
/specweave:validate 001 --quality --export
```

**Output**:
```
✅ Rule-Based: 120/120
🔍 AI Quality: 87/100

✅ Exported 3 suggestions to tasks.md
   • Make acceptance criteria measurable (HIGH)
   • Specify edge case handling (HIGH)
   • Add performance requirements (MEDIUM)
```

### Example 4: Auto-Fix Issues

```bash
/specweave:validate 001 --quality --fix
```

**Output**:
```
✅ Rule-Based: 120/120
🔍 AI Quality: 87/100

🔧 Auto-fix available for 2/3 issues

[Shows diff]

Apply fixes? [Y/s/n/e]: Y

✅ Applied 2 fixes
Re-validated: 92/100 (improvement: +5)
```

### Example 5: Make Quality Assessment Default

```bash
/specweave:validate 001 --always
```

**Output**:
```
✅ Rule-Based: 120/120
🔍 AI Quality: 87/100

✅ Configuration updated
Quality assessment will run automatically for future validations.
```

## Error Handling

### Increment Not Found
```
❌ Error: Increment 0001 not found

Available increments:
  • 0002-core-enhancements
  • 0003-payment-processing

Usage: /specweave:validate-increment <id> [--quality] [--export] [--fix] [--always]
```

### Invalid Flags
```
❌ Error: Invalid flag '--qualitty'

Valid flags:
  --quality   Run AI quality assessment
  --export    Export suggestions to tasks.md
  --fix       Auto-fix issues (experimental)
  --always    Make quality assessment default

Usage: /specweave:validate-increment <id> [--quality] [--export] [--fix] [--always]
```

### Quality Assessment Failed
```
⚠️  Warning: AI quality assessment failed (API error)

✅ Rule-based validation completed successfully (120/120)

You can:
  1. Try again: /specweave:validate-increment 001 --quality
  2. Continue with rule-based results
  3. Check logs: .specweave/increments/0001-name/logs/validation.log
```

### No Fixable Issues
```
ℹ️  No auto-fixable issues found

All issues require manual review:
  • Architectural decision (requires ADR)
  • Domain-specific requirement (requires expertise)
  • Ambiguous context (requires clarification)

Export suggestions to tasks? [Y/n]: _
```

## Integration with Hooks

This command can be triggered by:

1. **Manual execution**: `/specweave:validate 001 --quality`
2. **Post-document-save hook**: Auto-runs rule-based validation
3. **Pre-implementation hook**: Validates before starting tasks
4. **CI/CD pipeline**: Automated validation in GitHub Actions

**Hook integration** (`.claude/hooks/post-document-save.sh`):
```bash
#!/bin/bash
# Auto-validate on save

if [[ "$FILE" =~ spec\.md|plan\.md|tasks\.md|tests\.md ]]; then
  # Extract increment ID from path
  INCREMENT_ID=$(echo "$FILE" | grep -oP '(?<=increments/)\d{4}')

  # Run validation (rule-based only, no quality unless config says so)
  /specweave:validate-increment "$INCREMENT_ID"
fi
```

## Configuration

All validation settings use sensible defaults. Quality assessment is prompted each time unless `--quality` flag is used.

## Related Commands

- `/create-increment`: Create new increment (auto-validates on creation)
- `/specweave:sync-docs`: Review strategic documentation before implementation
- `/close-increment`: Close increment (validates before closing)
- `/sync-github`: Sync to GitHub (validates before sync)

## Related Skills

- `increment-quality-judge`: AI-powered quality assessment
- `increment-validator`: Rule-based validation (120 checks)
- `increment-planner`: Creates increments with validation built-in

---

**Important**: This command works alongside intent-based validation. Users can say:
- "Validate quality of increment 001" (intent-based)
- `/specweave:validate 001 --quality` (slash command)

Both routes activate the same validation logic for consistency.
