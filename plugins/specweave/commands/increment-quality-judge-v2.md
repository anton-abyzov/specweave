---
name: increment-quality-judge-v2
description: AI-powered quality assessment using LLM-as-Judge pattern with BMAD risk scoring and formal gate decisions. Use for evaluating increment specs, assessing task completeness, or making quality gate decisions (PASS/CONCERNS/FAIL). Chain-of-thought reasoning ensures transparent evaluation.
allowed-tools: Read, Grep, Glob
---

# Increment Quality Judge v2.0

**LLM-as-Judge Pattern Implementation**

AI-powered quality assessment using the **LLM-as-Judge** pattern - an established AI/ML evaluation technique where an LLM evaluates outputs with chain-of-thought reasoning, BMAD-pattern risk scoring, and formal quality gate decisions (PASS/CONCERNS/FAIL).

## LLM-as-Judge: What It Is

**LLM-as-Judge (LaaJ)** is a recognized pattern in AI/ML evaluation where a large language model assesses quality using structured reasoning.

```
┌─────────────────────────────────────────────────────────────┐
│                 LLM-as-Judge Pattern                        │
├─────────────────────────────────────────────────────────────┤
│  Input:  spec.md, plan.md, tasks.md                        │
│                                                             │
│  Process:                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ <thinking>                                          │   │
│  │   1. Read and understand the specification          │   │
│  │   2. Evaluate against 7 quality dimensions          │   │
│  │   3. Identify risks (P×I scoring)                   │   │
│  │   4. Form evidence-based verdict                    │   │
│  │ </thinking>                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Output: Structured verdict with:                          │
│  • Dimension scores (0-100)                                │
│  • Risk assessment (CRITICAL/HIGH/MEDIUM/LOW)              │
│  • Quality gate decision (PASS/CONCERNS/FAIL)              │
│  • Actionable recommendations                              │
└─────────────────────────────────────────────────────────────┘
```

**Why LLM-as-Judge works:**
- **Consistency**: Uniform evaluation criteria without human fatigue
- **Reasoning**: Chain-of-thought explains WHY something is an issue
- **Scalability**: Evaluates in seconds vs hours of manual review
- **Industry standard**: Used by OpenAI, Anthropic, Google for AI evals

**References:**
- "Judging LLM-as-a-Judge" (NeurIPS 2023)
- LMSYS Chatbot Arena evaluation methodology
- AlpacaEval, MT-Bench frameworks

## IMPORTANT: This is a SKILL (Not an Agent)

**DO NOT try to spawn this as an agent via Task tool.**

This is a **skill** that auto-activates when you discuss quality assessment. To run quality assessment:

```bash
# Use the CLI command directly
specweave qa 0001 --pre

# Or use the slash command
/sw:qa 0001
```

The skill provides guidance and documentation. The CLI handles execution.

**Why no agent?** Having both a skill and agent with the same name (`increment-quality-judge-v2`) caused Claude to incorrectly construct agent type names. The skill-only approach eliminates this confusion.

## What's New in v2.0

1. **Risk Assessment Dimension** - Probability × Impact scoring (0-10 scale, BMAD pattern)
2. **Quality Gate Decisions** - Formal PASS/CONCERNS/FAIL with thresholds
3. **NFR Checking** - Non-functional requirements (performance, security, scalability)
4. **Enhanced Output** - Blockers, concerns, recommendations with actionable mitigations
5. **7 Dimensions** - Added "Risk" to the existing 6 dimensions

## Purpose

Provide comprehensive quality assessment that goes beyond structural validation to evaluate:
- ✅ Specification quality (6 dimensions)
- ✅ **Risk levels (BMAD P×I scoring)** - NEW!
- ✅ **Quality gate readiness (PASS/CONCERNS/FAIL)** - NEW!

## When to Use

**Auto-activates for**:
- `/qa {increment-id}` command
- `/qa {increment-id} --pre` (pre-implementation check)
- `/qa {increment-id} --gate` (quality gate check)
- Natural language: "assess quality of increment 0001"

**Keywords**:
- validate quality, quality check, assess spec
- evaluate increment, spec review, quality score
- risk assessment, qa check, quality gate
- PASS/CONCERNS/FAIL

## Evaluation Dimensions (7 total, was 6)

```yaml
dimensions:
  clarity:
    weight: 0.18 # was 0.20
    criteria:
      - "Is the problem statement clear?"
      - "Are objectives well-defined?"
      - "Is terminology consistent?"

  testability:
    weight: 0.22 # was 0.25
    criteria:
      - "Are acceptance criteria testable?"
      - "Can success be measured objectively?"
      - "Are edge cases identifiable?"

  completeness:
    weight: 0.18 # was 0.20
    criteria:
      - "Are all requirements addressed?"
      - "Is error handling specified?"
      - "Are non-functional requirements included?"

  feasibility:
    weight: 0.13 # was 0.15
    criteria:
      - "Is the architecture scalable?"
      - "Are technical constraints realistic?"
      - "Is timeline achievable?"

  maintainability:
    weight: 0.09 # was 0.10
    criteria:
      - "Is design modular?"
      - "Are extension points identified?"
      - "Is technical debt addressed?"

  edge_cases:
    weight: 0.09 # was 0.10
    criteria:
      - "Are failure scenarios covered?"
      - "Are performance limits specified?"
      - "Are security considerations included?"

  # NEW: Risk Assessment (BMAD pattern)
  risk:
    weight: 0.11 # NEW!
    criteria:
      - "Are security risks identified and mitigated?"
      - "Are technical risks (scalability, performance) addressed?"
      - "Are implementation risks (complexity, dependencies) managed?"
      - "Are operational risks (monitoring, support) considered?"
```

## Risk Assessment (BMAD Pattern) - NEW!

### Risk Scoring Formula

```
Risk Score = Probability × Impact

Probability (0.0-1.0):
- 0.0-0.3: Low (unlikely to occur)
- 0.4-0.6: Medium (may occur)
- 0.7-1.0: High (likely to occur)

Impact (1-10):
- 1-3: Minor (cosmetic, no user impact)
- 4-6: Moderate (some impact, workaround exists)
- 7-9: Major (significant impact, no workaround)
- 10: Critical (system failure, data loss, security breach)

Final Score (0.0-10.0):
- 9.0-10.0: CRITICAL risk (FAIL quality gate)
- 6.0-8.9: HIGH risk (CONCERNS quality gate)
- 3.0-5.9: MEDIUM risk (PASS with monitoring)
- 0.0-2.9: LOW risk (PASS)
```

### Risk Categories

1. **Security Risks**
   - OWASP Top 10 vulnerabilities
   - Data exposure, authentication, authorization
   - Cryptographic failures

2. **Technical Risks**
   - Architecture complexity, scalability bottlenecks
   - Performance issues, technical debt

3. **Implementation Risks**
   - Tight timeline, external dependencies
   - Technical complexity

4. **Operational Risks**
   - Lack of monitoring, difficult to maintain
   - Poor documentation

### Risk Assessment Prompt

```markdown
You are evaluating SOFTWARE RISKS for an increment using BMAD's Probability × Impact scoring.

Read increment files:
- .specweave/increments/{id}/spec.md
- .specweave/increments/{id}/plan.md

For EACH risk you identify:

1. **Calculate PROBABILITY** (0.0-1.0)
   - Based on spec clarity, past experience, complexity
   - Low: 0.2, Medium: 0.5, High: 0.8

2. **Calculate IMPACT** (1-10)
   - 10 = Critical (security breach, data loss, system failure)
   - 7-9 = Major (significant user impact, no workaround)
   - 4-6 = Moderate (some impact, workaround exists)
   - 1-3 = Minor (cosmetic, no user impact)

3. **Calculate RISK SCORE** = Probability × Impact

4. **Provide MITIGATION** strategy

5. **Link to ACCEPTANCE CRITERIA** (if applicable)

Output format (JSON):
{
  "risks": [
    {
      "id": "RISK-001",
      "category": "security",
      "title": "Password storage not specified",
      "description": "Spec doesn't mention password hashing algorithm",
      "probability": 0.9,
      "impact": 10,
      "score": 9.0,
      "severity": "CRITICAL",
      "mitigation": "Use bcrypt or Argon2, never plain text",
      "location": "spec.md, Authentication section",
      "acceptance_criteria": "AC-US1-01"
    }
  ],
  "overall_risk_score": 7.5,
  "dimension_score": 0.35
}
```

## Quality Gate Decisions - NEW!

### Decision Logic

```typescript
enum QualityGateDecision {
  PASS = "PASS",          // Ready for production
  CONCERNS = "CONCERNS",  // Issues found, should address
  FAIL = "FAIL"           // Blockers, must fix
}

Thresholds (BMAD pattern):

FAIL if any:
- Risk score ≥ 9.0 (CRITICAL)
- Test coverage < 60%
- Spec quality < 50
- Critical security vulnerabilities ≥ 1

CONCERNS if any:
- Risk score 6.0-8.9 (HIGH)
- Test coverage < 80%
- Spec quality < 70
- High security vulnerabilities ≥ 1

PASS otherwise
```

### Output Example

```bash
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QA ASSESSMENT: Increment 0008-user-authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Score: 82/100 (GOOD) ✓

Dimension Scores:
  Clarity:         90/100 ✓✓
  Testability:     75/100 ⚠️
  Completeness:    88/100 ✓
  Feasibility:     85/100 ✓
  Maintainability: 80/100 ✓
  Edge Cases:      70/100 ⚠️
  Risk Assessment: 65/100 ⚠️  (7.2/10 risk score)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RISKS IDENTIFIED (3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 RISK-001: CRITICAL (9.0/10)
   Category: Security
   Title: Password storage implementation
   Description: Spec doesn't specify password hashing
   Probability: 0.9 (High) × Impact: 10 (Critical)
   Location: spec.md, Authentication section
   Mitigation: Use bcrypt/Argon2, never plain text
   AC: AC-US1-01

🟡 RISK-002: HIGH (6.0/10)
   Category: Security
   Title: Rate limiting not specified
   Description: No brute-force protection mentioned
   Probability: 0.6 (Medium) × Impact: 10 (Critical)
   Location: spec.md, Security section
   Mitigation: Add 5 failed attempts → 15 min lockout
   AC: AC-US1-03

🟢 RISK-003: LOW (2.4/10)
   Category: Technical
   Title: Session storage scalability
   Description: Plan uses in-memory sessions
   Probability: 0.4 (Medium) × Impact: 6 (Moderate)
   Location: plan.md, Architecture section
   Mitigation: Use Redis for session store

Overall Risk Score: 7.2/10 (MEDIUM-HIGH)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY GATE DECISION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟡 CONCERNS (Not Ready for Production)

Blockers (MUST FIX):
  1. 🔴 CRITICAL RISK: Password storage (Risk ≥9)
     → Add task: "Implement bcrypt password hashing"

Concerns (SHOULD FIX):
  2. 🟡 HIGH RISK: Rate limiting not specified (Risk ≥6)
     → Update spec.md: Add rate limiting section
     → Add E2E test for rate limiting

  3. ⚠️  Testability: 75/100 (target: 80+)
     → Make acceptance criteria more measurable

Recommendations (NICE TO FIX):
  4. Edge cases: 70/100
     → Add error handling scenarios
  5. Session scalability
     → Consider Redis for session store

Decision: Address 1 blocker before proceeding

Would you like to:
  [E] Export blockers to tasks.md
  [U] Update spec.md with fixes (experimental)
  [C] Continue without changes
```

## Workflow Integration

### Quick Mode (Default)

```
User: /sw:qa 0001

Step 1: Rule-based validation (120 checks) - FREE, FAST
├── If FAILED → Stop, show errors
└── If PASSED → Continue

Step 2: AI Quality Assessment (Quick)
├── Spec quality (6 dimensions)
├── Risk assessment (BMAD P×I)
└── Quality gate decision (PASS/CONCERNS/FAIL)

Output: Enhanced report with risks and gate decision
```

### Pre-Implementation Mode

```
User: /sw:qa 0001 --pre

Checks:
✅ Spec quality (clarity, testability, completeness)
✅ Risk assessment (identify issues early)
✅ Architecture review (plan.md soundness)
✅ Test strategy (test plan in tasks.md)

Gate decision before implementation starts
```

### Quality Gate Mode

```
User: /sw:qa 0001 --gate

Comprehensive checks:
✅ All pre-implementation checks
✅ Test coverage (AC-ID coverage, gaps)
✅ E2E test coverage
✅ Documentation completeness

Final gate decision before closing increment
```

## Enhanced Scoring Algorithm

### Step 1: Dimension Evaluation (7 dimensions)

For each dimension (including NEW risk dimension), use Chain-of-Thought prompting:

```markdown
<thinking>
1. Read spec.md thoroughly
2. For risk dimension specifically:
   - Identify all risks (security, technical, implementation, operational)
   - For each risk: calculate P, I, Score
   - Group by category
   - Calculate overall risk score
3. For other dimensions: evaluate criteria as before
4. Score 0.00-1.00
5. Identify issues
6. Provide suggestions
</thinking>

Score: 0.XX
```

### Step 2: Weighted Overall Score (NEW weights)

```typescript
overall_score =
  (clarity * 0.18) +
  (testability * 0.22) +
  (completeness * 0.18) +
  (feasibility * 0.13) +
  (maintainability * 0.09) +
  (edge_cases * 0.09) +
  (risk * 0.11)  // NEW!
```

### Step 3: Quality Gate Decision

```typescript
gate_decision = decide({
  spec_quality: overall_score,
  risk_score: risk_assessment.overall_risk_score,
  test_coverage: test_coverage.percentage, // if available
  security_audit: security_audit  // if available
})
```

## Token Usage

**Estimated per increment** (Quick mode):
- Small spec (<100 lines): ~2,500 tokens (~$0.025)
- Medium spec (100-250 lines): ~3,500 tokens (~$0.035)
- Large spec (>250 lines): ~5,000 tokens (~$0.050)

**Cost increase from v1.0**: +25% (added risk assessment dimension)

**Optimization**:
- Only evaluate spec.md + plan.md for risks
- Cache risk patterns for 5 min
- Skip risk assessment if spec < 50 lines (too small to assess)

## Configuration

```json
{
  "qa": {
    "qualityGateThresholds": {
      "fail": {
        "riskScore": 9.0,
        "testCoverage": 60,
        "specQuality": 50,
        "criticalVulnerabilities": 1
      },
      "concerns": {
        "riskScore": 6.0,
        "testCoverage": 80,
        "specQuality": 70,
        "highVulnerabilities": 1
      }
    },
    "dimensions": {
      "risk": {
        "enabled": true,
        "weight": 0.11
      }
    }
  }
}
```

## Migration from v1.0

**v1.0 (6 dimensions)**:
- Clarity, Testability, Completeness, Feasibility, Maintainability, Edge Cases

**v2.0 (7 dimensions, NEW: Risk)**:
- All v1.0 dimensions + Risk Assessment
- Weights adjusted to accommodate new dimension
- Quality gate decisions added
- BMAD risk scoring added

**Backward Compatibility**:
- v1.0 skills still work (auto-upgrade to v2.0 if risk assessment enabled)
- Existing scores rescaled to new weights automatically
- Can disable risk assessment in config to revert to v1.0 behavior

## Best Practices

1. **Run early and often**: Use `--pre` mode before implementation
2. **Fix blockers immediately**: Don't proceed if FAIL
3. **Address concerns before release**: CONCERNS = should fix
4. **Use risk scores to prioritize**: Fix CRITICAL risks first
5. **Export to tasks.md**: Convert blockers/concerns to actionable tasks

## Limitations

**What quality-judge v2.0 CAN'T do**:
- ❌ Understand domain-specific compliance (HIPAA, PCI-DSS)
- ❌ Verify technical feasibility with actual codebase
- ❌ Replace human expertise and security audits
- ❌ Predict actual probability without historical data

**What quality-judge v2.0 CAN do**:
- ✅ Catch vague or ambiguous language
- ✅ Identify missing security considerations (OWASP-based)
- ✅ Spot untestable acceptance criteria
- ✅ Suggest industry best practices
- ✅ Flag missing edge cases
- ✅ **Assess risks systematically (BMAD pattern)** - NEW!
- ✅ **Provide formal quality gate decisions** - NEW!

## Summary

**increment-quality-judge v2.0** adds comprehensive risk assessment and quality gate decisions:

✅ **Risk assessment** (BMAD P×I scoring, 0-10 scale)
✅ **Quality gate decisions** (PASS/CONCERNS/FAIL with thresholds)
✅ **7 dimensions** (added "Risk" to existing 6)
✅ **NFR checking** (performance, security, scalability)
✅ **Enhanced output** (blockers, concerns, recommendations)
✅ **Chain-of-thought** (LLM-as-Judge 2025 best practices)
✅ **Backward compatible** (can disable risk assessment)

**Use it when**: You want comprehensive quality assessment with risk scoring and formal gate decisions before implementation or release.

**Skip it when**: Quick iteration, tight token budget, or simple features where rule-based validation suffices.

---

**Version**: 2.0.0
**Related**: /sw:qa command, QAOrchestrator agent

## Project-Specific Learnings

**Before starting work, check for project-specific learnings:**

```bash
# Check if skill memory exists for this skill
cat .specweave/skill-memories/increment-quality-judge-v2.md 2>/dev/null || echo "No project learnings yet"
```

Project learnings are automatically captured by the reflection system when corrections or patterns are identified during development. These learnings help you understand project-specific conventions and past decisions.
