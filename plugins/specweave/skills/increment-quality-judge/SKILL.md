---
name: increment-quality-judge
description: Optional AI-powered quality assessment for specifications, plans, and tests. Goes beyond rule-based validation to evaluate clarity, testability, edge cases, and architecture soundness. Activates for validate quality, quality check, assess spec, evaluate increment, spec review, quality score.
allowed-tools: Read, Grep, Glob
---

# Increment Quality Judge

AI-powered quality assessment that evaluates specifications, plans, and tests beyond rule-based validation using LLM-as-Judge pattern.

## Purpose

Provide nuanced quality assessment of SpecWeave artifacts (spec.md, plan.md, tests.md) to catch subtle issues that rule-based validation might miss.

## When to Use

**Activates when user mentions:**
- "validate quality"
- "quality check"
- "assess spec"
- "evaluate increment"
- "spec review"
- "quality score"
- "how good is this spec"

**Triggered by:**
- Natural language: "validate quality of increment 0001", "quality check", "assess spec"
- Slash command: `/specweave:validate 0001 --quality` (supports --export, --fix, --always flags)
- Manual invocation when reviewing docs

## What It Does

### 1. Multi-Dimensional Quality Assessment

Evaluates specifications across 6 dimensions:

```yaml
dimensions:
  clarity:
    weight: 0.20
    criteria:
      - "Is the problem statement clear?"
      - "Are objectives well-defined?"
      - "Is terminology consistent?"

  testability:
    weight: 0.25
    criteria:
      - "Are acceptance criteria testable?"
      - "Can success be measured objectively?"
      - "Are edge cases identifiable?"

  completeness:
    weight: 0.20
    criteria:
      - "Are all requirements addressed?"
      - "Is error handling specified?"
      - "Are non-functional requirements included?"

  feasibility:
    weight: 0.15
    criteria:
      - "Is the architecture scalable?"
      - "Are technical constraints realistic?"
      - "Is timeline achievable?"

  maintainability:
    weight: 0.10
    criteria:
      - "Is design modular?"
      - "Are extension points identified?"
      - "Is technical debt addressed?"

  edge_cases:
    weight: 0.10
    criteria:
      - "Are failure scenarios covered?"
      - "Are performance limits specified?"
      - "Are security considerations included?"
```

### 2. Scoring System

```typescript
interface QualityScore {
  overall: number;        // 0.00-1.00 (displayed as 0-100)
  dimensions: {
    clarity: number;
    testability: number;
    completeness: number;
    feasibility: number;
    maintainability: number;
    edge_cases: number;
  };
  issues: Issue[];
  suggestions: Suggestion[];
  confidence: number;     // 0.00-1.00 (how confident the assessment is)
}

interface Issue {
  dimension: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  location: string;       // Section reference
  impact: string;         // What could go wrong
}

interface Suggestion {
  dimension: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
  example: string;        // How to improve
}
```

### 3. Interactive Workflow

```bash
/specweave:validate 001

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALIDATION RESULTS: Increment 0001-authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Rule-Based Validation: PASSED (120/120 checks)
   ✓ Consistency (47/47)
   ✓ Completeness (23/23)
   ✓ Quality (31/31)
   ✓ Traceability (19/19)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤔 Run AI Quality Assessment? (Optional)

This will:
  • Evaluate spec clarity, testability, edge cases
  • Provide detailed improvement suggestions
  • Use ~2,000 tokens (1-2 minutes)

Your choice:
  [Y] Yes, assess quality
  [N] No, skip (default)
  [A] Always run (save to config)

Choice: _
```

**If user selects Yes:**

```bash
🔍 Analyzing increment quality...

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
    receiving a JWT token with 24h expiry"

🎯 HIGH PRIORITY: Specify edge case handling

   Add section: "Error Scenarios"
   - Rate limiting: 5 failed attempts → 15 min lockout
   - Invalid token: Return 401 with error code
   - Expired session: Redirect to login with message

🔹 MEDIUM PRIORITY: Add performance requirements

   Suggested addition:
   - Login latency: p95 < 500ms
   - Concurrent logins: Support 100/sec
   - Token validation: < 10ms

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ This specification is GOOD (87/100)

Strengths:
  • Clear problem statement and objectives
  • Architecture is sound and scalable
  • Good coverage of functional requirements

Areas for improvement:
  • Make acceptance criteria more testable (2 items)
  • Address edge cases (rate limiting, errors)
  • Add performance requirements

Recommendation: Address HIGH priority suggestions before
implementation. MEDIUM priority can be added incrementally.

Would you like to:
  [F] Auto-fix HIGH priority issues (experimental)
  [E] Export suggestions to tasks.md
  [C] Continue without changes

Choice: _
```

## Configuration



## Usage Examples

### Example 1: Basic Quality Check

```bash
User: "Validate increment 001"

increment-quality-judge:
✅ Rule-based: 120/120 passed
🤔 Run AI quality check? [Y/n]: Y

🔍 Analyzing...

Overall: 87/100 (GOOD)
Issues: 2 major, 1 minor
Suggestions: 3 high priority

[Full report shown above]
```

### Example 2: Auto-Run Mode

```bash
User: "Validate increment 001 --quality"

increment-quality-judge:
✅ Rule-based: 120/120 passed
🔍 AI Quality: 87/100 (GOOD)

[Full report shown automatically]
```

### Example 3: Export Suggestions to Tasks

```bash
User: "Validate increment 001"
[After quality assessment shows suggestions]

User: E (Export to tasks.md)

increment-quality-judge:
✅ Exported 3 suggestions to .specweave/increments/0001-auth/tasks.md

Added tasks:
- [ ] Make acceptance criteria measurable (HIGH)
- [ ] Specify edge case handling (HIGH)
- [ ] Add performance requirements (MEDIUM)
```

## Scoring Algorithm

### Step 1: Dimension Evaluation

For each dimension, evaluate using prompt:

```markdown
You are evaluating a software specification for {dimension}.

Specification:
{spec_content}

Criteria:
{dimension_criteria}

Score 0.00-1.00 based on:
- 1.00: Exceptional, industry best practice
- 0.80-0.99: Good, minor improvements possible
- 0.60-0.79: Acceptable, notable gaps
- 0.00-0.59: Needs work, significant issues

Provide:
1. Score (0.00-1.00)
2. Issues found (if any)
3. Suggestions for improvement
4. Confidence (0.00-1.00)

Format:
{
  "score": 0.85,
  "issues": [...],
  "suggestions": [...],
  "confidence": 0.90
}
```

### Step 2: Weighted Overall Score

```typescript
overall_score =
  (clarity * 0.20) +
  (testability * 0.25) +
  (completeness * 0.20) +
  (feasibility * 0.15) +
  (maintainability * 0.10) +
  (edge_cases * 0.10)
```

### Step 3: Confidence Calculation

```typescript
confidence = average(dimension_confidences)

if (confidence < 0.80) {
  show_warning = "⚠️ Low confidence. Results may be less accurate."
}
```

## Integration with Validation Workflow

### Current: Rule-Based Only

```
User: /specweave:validate-increment 001
↓
Run 120 rule-based checks
↓
Show results: ✅ PASSED or ❌ FAILED
```

### With Quality Judge (Interactive)

```
User: /specweave:validate-increment 001
↓
Run 120 rule-based checks
↓
Show results: ✅ PASSED
↓
Prompt: "Run AI quality check? [Y/n]"
↓ (if Yes)
Run quality assessment (~2k tokens)
↓
Show detailed quality report with scores
↓
Prompt: "Export suggestions to tasks? [Y/n]"
```

### With Quality Judge (Always-On)

```
User: /specweave:validate-increment 001
↓
Run in parallel:
  • Rule-based checks (120 rules)
  • AI quality assessment
↓
Show combined results:
  ✅ Rule-based: 120/120
  🔍 Quality: 87/100
↓
Show detailed report
```

## Token Usage

**Estimated per increment:**
- Small spec (<100 lines): ~1,500 tokens
- Medium spec (100-250 lines): ~2,000 tokens
- Large spec (>250 lines): ~3,000 tokens

**Cost (Claude Sonnet 4.5):**
- Small: ~$0.015 per assessment
- Medium: ~$0.020 per assessment
- Large: ~$0.030 per assessment

**Optimization:**
- Only evaluate spec.md by default
- Optional: Include plan.md and tests.md
- Cache common patterns for 5 min

## Test Cases

### TC-001: Basic Quality Assessment
**Given:** Valid spec.md with minor issues
**When:** quality-judge runs
**Then:** Returns score 70-85 with specific suggestions

### TC-002: Excellent Spec
**Given:** High-quality spec with clear criteria
**When:** quality-judge runs
**Then:** Returns score 90+ with minimal suggestions

### TC-003: Poor Spec
**Given:** Vague spec with unclear requirements
**When:** quality-judge runs
**Then:** Returns score <60 with critical issues

### TC-004: Export to Tasks
**Given:** Quality assessment with 3 suggestions
**When:** User selects "Export to tasks"
**Then:** 3 tasks added to tasks.md with priority labels

### TC-005: Auto-Run Mode
**Given:** User provides --quality flag
**When:** User requests validation ("validate increment 001 --quality")
**Then:** Quality check runs automatically without prompt

## Best Practices

### 1. Use After Rule-Based Validation

Always run rule-based checks first:
- Faster (no API calls)
- Catches structural issues
- Free (no token cost)

Then optionally run quality judge for nuanced feedback.

### 2. Review Suggestions, Don't Auto-Apply

Quality judge provides suggestions, but:
- User reviews for context
- User decides what to apply
- Some suggestions may not fit domain

### 3. Adjust Thresholds for Your Domain

Healthcare/Finance may need 90+ scores.
Internal tools may accept 70+ scores.

### 4. Use Confidence Scores

If confidence < 80%, consider:
- Spec might be too short (not enough signal)
- Spec might use domain jargon (unfamiliar to LLM)
- Manual review recommended

## Limitations

**What quality-judge CAN'T do:**
- ❌ Understand domain-specific requirements (healthcare compliance, finance regulations)
- ❌ Validate against company-specific standards (unless in spec)
- ❌ Verify technical feasibility with actual codebase
- ❌ Replace human expertise and judgment

**What quality-judge CAN do:**
- ✅ Catch vague or ambiguous language
- ✅ Identify missing error handling
- ✅ Spot untestable acceptance criteria
- ✅ Suggest industry best practices
- ✅ Flag missing edge cases

## Future Enhancements

### Phase 2: Cross-Document Validation
- Check spec.md ↔ plan.md consistency
- Verify tests.md covers all acceptance criteria
- Detect missing ADRs for architectural decisions

### Phase 3: Historical Learning
- Compare with past increments
- Learn from user feedback (which suggestions were applied)
- Adapt scoring based on project type

### Phase 4: Custom Criteria
- Company-specific quality standards
- Domain-specific requirements (HIPAA, PCI-DSS)
- Team-specific conventions

## Resources

- [LLM-as-Judge Pattern](https://arxiv.org/abs/2306.05685) - Research paper
- [G-Eval Framework](https://arxiv.org/abs/2303.16634) - Quality scoring methodology
- [Anthropic Evals](https://github.com/anthropics/evals) - Evaluation best practices

---

## Summary

**increment-quality-judge** extends SpecWeave's validation with AI-powered quality assessment:

✅ **Multi-dimensional scoring** (6 dimensions, weighted)
✅ **Interactive workflow** (prompt user, optional)
✅ **Actionable suggestions** (with examples)
✅ **Export to tasks** (convert suggestions to work items)
✅ **Configurable** (thresholds, dimensions, auto-run)
✅ **Token-efficient** (~2k tokens per assessment)
✅ **Complements rule-based validation** (catches different issues)

**Use it when:** You want high-quality specs that go beyond structural correctness to ensure clarity, testability, and completeness.

**Skip it when:** Quick iteration, tight token budget, or simple features where rule-based validation is sufficient.
