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

- `--quality`: Run AI quality assessment (LLM-as-judge, ~2k tokens, 1-2 minutes)
- `--export`: Export AI suggestions to tasks.md automatically
- `--fix`: Auto-fix HIGH priority issues (experimental, requires confirmation)

## Workflow

### Step 1: Parse and Validate Arguments

1. **Extract increment ID**:
   - Parse from command: `/validate-increment 001` → "001"
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

Usage: /validate-increment <id> [--quality] [--export] [--fix] [--always]
```

### Step 2: Run Rule-Based Validation (Always)

Run 120 validation rules across 4 categories:

1. **Consistency Rules (47 checks)**:
   - User stories in spec.md → sections in plan.md
   - Components in plan.md → tasks in tasks.md
   - Test cases (TC-0001) in spec.md → tests.md coverage
   - Cross-document consistency (IDs, priorities, dependencies)

2. **Completeness Rules (23 checks)**:
   - spec.md: Frontmatter, problem statement, user stories, acceptance criteria
   - plan.md: Architecture, components, data model, API contracts, security
   - tasks.md: Task IDs, descriptions, priorities, estimates

3. **Quality Rules (31 checks)**:
   - spec.md: Technology-agnostic, testable acceptance criteria
   - plan.md: Technical details, ADRs exist, security addressed
   - tasks.md: Actionable, reasonable estimates (<1 day)

4. **Traceability Rules (19 checks)**:
   - TC-0001 format, sequential numbering
   - ADR references exist
   - Diagram references valid

**Display results**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALIDATION RESULTS: Increment 0001-authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Rule-Based Validation: PASSED (120/120 checks)
   ✓ Consistency (47/47)
   ✓ Completeness (23/23)
   ✓ Quality (31/31)
   ✓ Traceability (19/19)

Files validated:
  • spec.md (250 lines, 6 user stories)
  • plan.md (480 lines, 8 components)
  • tasks.md (42 tasks, P0-P2)
  • tests.md (12 test cases, 85% coverage)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**If errors found**:
```
❌ Rule-Based Validation: FAILED (115/120 checks)
   ✓ Consistency (45/47) - 2 errors
   ✓ Completeness (23/23)
   ⚠️  Quality (28/31) - 3 warnings
   ✓ Traceability (19/19)

ERRORS (2):
  🔴 spec.md:45 - Missing acceptance criteria for US-003
  🔴 Inconsistency: spec.md mentions "real-time updates" but plan.md doesn't address it

WARNINGS (3):
  🟡 Task T012 exceeds size guideline (5 days, should be <1 day)
  🟡 No security considerations in plan.md
  🟡 ADR-0005 referenced but doesn't exist (plan.md:89)

Action required:
1. Fix missing acceptance criteria for US-003
2. Address "real-time updates" in plan.md or remove from spec.md
3. Consider breaking down T012 into smaller tasks

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
  • Cost: ~$0.02 (Claude Sonnet 4.5)

Your choice:
  [Y] Yes, assess quality
  [N] No, skip (default)
  [A] Always run (save to config)

Choice: _
```

### Step 4: Run AI Quality Assessment (If Approved)

**Invoke `increment-quality-judge` skill** with these parameters:
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

Or run: /validate-increment <id> (quality will run automatically)
```

### Step 8: Generate Validation Report

**Always generate detailed report** at:
`.specweave/increments/0001-name/reports/validation-report.md`

**Report structure**:
```markdown
# Validation Report: Increment 0001-authentication

Generated: 2025-10-28 14:32:15 UTC
Command: /validate-increment 001 --quality

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
| 2025-10-28 | 120/120 | 87/100 | /validate-increment 001 --quality |
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

Usage: /validate-increment <id> [--quality] [--export] [--fix] [--always]
```

### Invalid Flags
```
❌ Error: Invalid flag '--qualitty'

Valid flags:
  --quality   Run AI quality assessment
  --export    Export suggestions to tasks.md
  --fix       Auto-fix issues (experimental)
  --always    Make quality assessment default

Usage: /validate-increment <id> [--quality] [--export] [--fix] [--always]
```

### Quality Assessment Failed
```
⚠️  Warning: AI quality assessment failed (API error)

✅ Rule-based validation completed successfully (120/120)

You can:
  1. Try again: /validate-increment 001 --quality
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

1. **Manual execution**: `/validate-increment 001 --quality`
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
  /validate-increment "$INCREMENT_ID"
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
- `/validate-increment 001 --quality` (slash command)

Both routes activate the same validation logic for consistency.
