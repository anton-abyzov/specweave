# Comprehensive QA Command Design for SpecWeave

**Created**: 2025-01-04
**Increment**: 0007-smart-increment-discipline
**Status**: Design Proposal
**Inspired by**: Anthropic Multi-Agent Research System, BMAD Method, LLM-as-Judge 2025 Best Practices

---

## Executive Summary

This document proposes a comprehensive **@qa command system** for SpecWeave that goes far beyond the existing `increment-quality-judge` skill. Drawing inspiration from:

1. **Anthropic's Multi-Agent Research System** - Orchestrator-worker pattern, subagent specialization, feedback loops
2. **BMAD Method** - Risk-based quality assessment, quality gates, comprehensive QA review criteria
3. **LLM-as-Judge 2025** - Chain-of-thought prompting, multi-judge consensus, bias mitigation
4. **Microsoft/Google Multi-Agent Patterns** - Hierarchical verification, cyclic workflows with quality loops

The proposed system provides **multi-level quality verification** with **multiple implementation options** to suit different team needs and budgets.

---

## Table of Contents

1. [The Vision: Multi-Level Quality Assurance](#the-vision)
2. [Current State Analysis](#current-state-analysis)
3. [Proposed Architecture](#proposed-architecture)
4. [Implementation Options](#implementation-options)
5. [Detailed Design](#detailed-design)
6. [Integration Strategy](#integration-strategy)
7. [Cost-Benefit Analysis](#cost-benefit-analysis)
8. [Roadmap](#roadmap)

---

## The Vision

### What @qa Should Do

The @qa command should be a **comprehensive quality verification system** that can:

1. **Verify Specifications** - "Is this spec clear, testable, and complete?"
2. **Verify Designs** - "Is this architecture sound, scalable, and maintainable?"
3. **Verify Implementation** - "Does this code meet requirements and follow best practices?"
4. **Verify Tests** - "Do tests cover all acceptance criteria and edge cases?"
5. **Verify Completeness** - "Is this increment truly done and ready to ship?"

### Inspiration from BMAD Method

BMAD's QA Agent (Quinn) provides:

```bash
@qa *risk {story}     # Assess risks before development
@qa *design {story}   # Create test strategy
@qa *trace {story}    # Verify test coverage during dev
@qa *nfr {story}      # Check quality attributes
@qa *review {story}   # Full assessment → writes gate
```

**Key Insights from BMAD**:
- ✅ Risk-based assessment (Probability × Impact scoring)
- ✅ Quality gates with formal PASS/CONCERNS/FAIL decisions
- ✅ Test Architect role (not just "senior dev reviewer")
- ✅ Multiple verification modes (risk, design, trace, NFR, review)

### Inspiration from Anthropic

Anthropic's Multi-Agent Research System provides:

```
LeadResearcher (Orchestrator)
├── CitationAgent (Specialized subagent)
├── FactCheckAgent (Specialized subagent)
└── SynthesisAgent (Specialized subagent)
```

**Key Insights from Anthropic**:
- ✅ Orchestrator-worker pattern (one coordinator, multiple specialists)
- ✅ Parallel subagent execution (faster verification)
- ✅ Extended thinking mode for planning
- ✅ Feedback loops (iterative refinement)
- ✅ LLM-as-judge for quality assessment

---

## Current State Analysis

### What SpecWeave Already Has

**6 Major Quality Systems** (see QA-FEATURES-COMPREHENSIVE-MAP.md):

1. **Rule-Based Validation** (120+ checks, free)
   - Consistency, completeness, quality, traceability rules
   - File: `src/core/validation/increment-validator.ts`

2. **AI-Powered Quality Judge** (LLM-as-Judge, optional)
   - 6 weighted dimensions (clarity, testability, completeness, etc.)
   - Skill: `plugins/specweave/skills/increment-quality-judge/SKILL.md`

3. **Test-Aware Planning** (v0.7.0+)
   - BDD format, AC-ID traceability
   - Agent: `plugins/specweave/agents/test-aware-planner/`

4. **Test Coverage Validation**
   - Per-task coverage, AC-ID coverage
   - Command: `/specweave:validate-coverage`

5. **PM Gates & Increment Discipline**
   - Hard blocks, WIP limits
   - Command: `/specweave:done`

6. **Living Completion Reports**
   - Real-time scope change audit
   - File: `.specweave/increments/*/reports/COMPLETION-REPORT.md`

### What's Missing

1. **Unified QA Interface** - No single command for "check everything"
2. **Risk Assessment** - No systematic risk scoring (BMAD's strength)
3. **Multi-Stage Verification** - No pre/during/post-implementation QA
4. **Specialized Subagents** - No security-specific, performance-specific QA
5. **Quality Gate Formalization** - No PASS/CONCERNS/FAIL system
6. **NFR Verification** - No non-functional requirements checking
7. **Cross-Document Consistency** - Limited spec ↔ plan ↔ tasks ↔ code validation

---

## Proposed Architecture

### Option 1: Enhanced Single Agent (Simplest)

**Extend existing `increment-quality-judge` skill** with new verification modes:

```bash
/qa spec 0001        # Verify specification quality
/qa design 0001      # Verify architecture/plan
/qa risk 0001        # Assess risks (new!)
/qa tests 0001       # Verify test coverage
/qa code 0001        # Code review (new!)
/qa nfr 0001         # Non-functional requirements (new!)
/qa gate 0001        # Final quality gate (new!)
/qa all 0001         # Run everything
```

**Pros**:
- ✅ Simple, builds on existing foundation
- ✅ No new agents needed
- ✅ Low token cost (~3-5K per assessment)
- ✅ Fast to implement (1-2 weeks)

**Cons**:
- ❌ Sequential execution (slower)
- ❌ Limited specialization (one generalist agent)
- ❌ No orchestrator-worker benefits

---

### Option 2: Multi-Agent Orchestrator (Recommended)

**New QA Orchestrator Agent** that spawns specialized subagents:

```
QAOrchestrator (Main agent)
├── SpecQualityAgent (Evaluates spec.md clarity, testability)
├── ArchitectureReviewAgent (Reviews plan.md, ADRs)
├── RiskAssessmentAgent (Probability × Impact scoring)
├── TestCoverageAgent (Verifies tests cover all AC-IDs)
├── CodeReviewAgent (Checks implementation quality)
├── SecurityAuditAgent (OWASP, vulnerabilities)
└── PerformanceReviewAgent (Scalability, efficiency)
```

**Usage**:

```bash
# Quick check (rule-based + AI quality judge)
/qa 0001

# Full verification (all subagents in parallel)
/qa 0001 --full

# Specific checks
/qa 0001 --spec --risk --tests

# With quality gate decision
/qa 0001 --gate
```

**Output Example**:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QA VERIFICATION: Increment 0001-authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Running in parallel:
  • Rule-based validation (120 checks)
  • Spec quality assessment (SpecQualityAgent)
  • Risk assessment (RiskAssessmentAgent)
  • Test coverage verification (TestCoverageAgent)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ RULE-BASED VALIDATION: PASSED (120/120)
   ✓ Consistency (47/47)
   ✓ Completeness (23/23)
   ✓ Quality (31/31)
   ✓ Traceability (19/19)

✅ SPEC QUALITY: 87/100 (GOOD)
   ✓ Clarity: 92/100
   ⚠️  Testability: 78/100 (Needs improvement)
   ✓ Completeness: 90/100
   Issues: 2 major, 1 minor

⚠️  RISK ASSESSMENT: 7.2/10 (MEDIUM-HIGH)
   🔴 HIGH RISK (9/10): Password storage implementation
      Probability: 0.9 (High) × Impact: 10 (Critical)
      Mitigation: Use bcrypt/Argon2, never plain text

   🟡 MEDIUM RISK (6/10): Rate limiting not specified
      Probability: 0.6 (Medium) × Impact: 10 (Critical)
      Mitigation: Add 5 failed attempts → 15 min lockout

✅ TEST COVERAGE: 85% (GOOD)
   ✓ All AC-IDs covered (12/12)
   ✓ Unit tests: 90% coverage
   ✓ Integration tests: 85% coverage
   ⚠️  E2E tests: 1 missing (AC-US1-03: Rate limiting)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY GATE DECISION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟡 CONCERNS (Not Ready for Production)

Blockers (MUST FIX):
  1. HIGH RISK: Password storage implementation (Risk ≥9)
     → Add task: "Implement bcrypt password hashing"

  2. MEDIUM RISK: Rate limiting not specified (Risk ≥6)
     → Update spec.md: Add rate limiting section
     → Add test: E2E rate limiting test (AC-US1-03)

Recommendations (SHOULD FIX):
  3. Testability score 78/100
     → Make acceptance criteria more measurable

Quality Gate: CONCERNS → Address 2 blockers before proceeding

Would you like to:
  [F] Auto-fix blockers (experimental)
  [E] Export blockers to tasks.md
  [C] Continue without changes
```

**Pros**:
- ✅ **Parallel execution** (5-10x faster than sequential)
- ✅ **Specialized expertise** (each subagent is domain expert)
- ✅ **Scalable** (add new subagents as needed)
- ✅ **Orchestrator manages complexity** (user gets clean output)
- ✅ **Follows Anthropic pattern** (proven approach)

**Cons**:
- ❌ Higher token cost (~10-15K tokens per full assessment)
- ❌ More complex implementation (3-4 weeks)
- ❌ Requires agent orchestration infrastructure

---

### Option 3: Hybrid (Best of Both Worlds)

**Quick mode** (Option 1 - single agent) for rapid iteration:

```bash
/qa 0001              # Fast, low-cost
```

**Full mode** (Option 2 - orchestrator) for critical checks:

```bash
/qa 0001 --full       # Comprehensive, higher cost
```

**Pros**:
- ✅ Flexibility (choose based on need)
- ✅ Cost-effective (use full mode sparingly)
- ✅ Progressive disclosure (start simple, go deep if needed)

**Cons**:
- ❌ Two implementations to maintain

---

## Detailed Design

### Multi-Agent Orchestrator Architecture

#### QA Orchestrator Agent

**File**: `plugins/specweave/agents/qa-orchestrator/AGENT.md`

**Responsibilities**:
1. Parse user request (`/qa 0001 --spec --risk`)
2. Determine which subagents to invoke
3. Spawn subagents in parallel (using Task tool)
4. Synthesize results into unified report
5. Generate quality gate decision (PASS/CONCERNS/FAIL)
6. Provide actionable recommendations

**Extended Thinking Mode**: Plan strategy before spawning subagents

#### Subagent: SpecQualityAgent

**Purpose**: Evaluate spec.md quality (existing increment-quality-judge logic)

**Input**:
```json
{
  "increment_id": "0001",
  "files": ["spec.md"],
  "dimensions": ["clarity", "testability", "completeness", "feasibility", "maintainability", "edge_cases"]
}
```

**Output**:
```json
{
  "overall_score": 87,
  "dimension_scores": {
    "clarity": 92,
    "testability": 78,
    "completeness": 90,
    "feasibility": 88,
    "maintainability": 85,
    "edge_cases": 72
  },
  "issues": [
    {
      "dimension": "testability",
      "severity": "major",
      "description": "Acceptance criteria not fully testable",
      "location": "spec.md, section 'Success Criteria'",
      "impact": "QA won't know when feature is complete"
    }
  ],
  "suggestions": [
    {
      "dimension": "testability",
      "priority": "high",
      "description": "Make acceptance criteria measurable",
      "example": "User can log in with valid credentials within 2 seconds..."
    }
  ]
}
```

#### Subagent: RiskAssessmentAgent

**Purpose**: Identify and score risks (BMAD pattern)

**Risk Scoring Formula** (BMAD):
```
Risk Score = Probability × Impact
- Probability: 0.0-1.0 (Low/Medium/High)
- Impact: 1-10 (Critical: 10, Major: 7, Minor: 3)
- Final Score: 0.0-10.0
```

**Risk Categories**:
1. **Technical Risks** - Architecture, scalability, performance
2. **Security Risks** - OWASP Top 10, vulnerabilities
3. **Implementation Risks** - Complexity, timeline, dependencies
4. **Operational Risks** - Monitoring, maintenance, support

**Input**:
```json
{
  "increment_id": "0001",
  "files": ["spec.md", "plan.md"],
  "risk_categories": ["technical", "security", "implementation", "operational"]
}
```

**Output**:
```json
{
  "risks": [
    {
      "id": "RISK-001",
      "category": "security",
      "title": "Password storage implementation",
      "description": "Spec doesn't specify password hashing algorithm",
      "probability": 0.9,
      "impact": 10,
      "score": 9.0,
      "severity": "HIGH",
      "mitigation": "Use bcrypt or Argon2, never plain text",
      "acceptance_criteria": "AC-US1-01"
    },
    {
      "id": "RISK-002",
      "category": "security",
      "title": "Rate limiting not specified",
      "description": "No mention of brute-force protection",
      "probability": 0.6,
      "impact": 10,
      "score": 6.0,
      "severity": "MEDIUM",
      "mitigation": "Add 5 failed attempts → 15 min lockout",
      "acceptance_criteria": "AC-US1-03"
    }
  ],
  "overall_risk_score": 7.5,
  "recommendation": "CONCERNS - Address HIGH risks before proceeding"
}
```

**Quality Gate Thresholds** (BMAD pattern):
- **Risk ≥ 9** → FAIL (Critical, must fix)
- **Risk 6-8** → CONCERNS (High, should fix)
- **Risk < 6** → PASS (Acceptable)

#### Subagent: TestCoverageAgent

**Purpose**: Verify tests cover all acceptance criteria

**Input**:
```json
{
  "increment_id": "0001",
  "files": ["spec.md", "tasks.md"],
  "acceptance_criteria": ["AC-US1-01", "AC-US1-02", "AC-US1-03"]
}
```

**Output**:
```json
{
  "coverage_percentage": 85,
  "ac_coverage": {
    "AC-US1-01": {"covered": true, "tests": ["T-001: Unit", "T-003: E2E"]},
    "AC-US1-02": {"covered": true, "tests": ["T-002: Unit", "T-003: E2E"]},
    "AC-US1-03": {"covered": false, "tests": [], "gap": "No E2E test for rate limiting"}
  },
  "test_types": {
    "unit": {"count": 12, "coverage": 90},
    "integration": {"count": 5, "coverage": 85},
    "e2e": {"count": 2, "coverage": 67, "gap": "Missing AC-US1-03"}
  },
  "gaps": [
    {
      "acceptance_criteria": "AC-US1-03",
      "description": "Rate limiting after 5 failed attempts",
      "missing_test_type": "e2e",
      "recommendation": "Add Playwright test for rate limiting scenario"
    }
  ]
}
```

#### Subagent: CodeReviewAgent

**Purpose**: Review implementation code quality

**Input**:
```json
{
  "increment_id": "0001",
  "files": ["src/services/auth/", "tests/"],
  "review_criteria": ["requirements_coverage", "test_coverage", "code_quality", "security"]
}
```

**Output**:
```json
{
  "requirements_coverage": {
    "score": 95,
    "issues": []
  },
  "test_coverage": {
    "score": 85,
    "issues": [
      {
        "type": "missing_test",
        "file": "src/services/auth/rate-limiter.ts",
        "description": "No unit test for Redis connection failure"
      }
    ]
  },
  "code_quality": {
    "score": 88,
    "issues": [
      {
        "type": "complexity",
        "file": "src/services/auth/jwt-validator.ts",
        "line": 45,
        "description": "Cyclomatic complexity: 12 (threshold: 10)"
      }
    ]
  },
  "security": {
    "score": 92,
    "issues": [
      {
        "type": "vulnerability",
        "severity": "low",
        "file": "src/services/auth/password-reset.ts",
        "description": "Email not sanitized before database query"
      }
    ]
  }
}
```

#### Subagent: SecurityAuditAgent

**Purpose**: Security-specific checks (OWASP Top 10, CVEs)

**Input**:
```json
{
  "increment_id": "0001",
  "files": ["src/", "package.json"],
  "checks": ["owasp_top_10", "dependency_vulnerabilities", "secure_coding"]
}
```

**Output**:
```json
{
  "owasp_checks": [
    {
      "category": "A01:2021 - Broken Access Control",
      "status": "PASS",
      "details": "JWT token validation implemented correctly"
    },
    {
      "category": "A02:2021 - Cryptographic Failures",
      "status": "FAIL",
      "details": "Password hashing not specified in spec.md",
      "recommendation": "Use bcrypt with salt rounds ≥12"
    }
  ],
  "dependency_vulnerabilities": {
    "critical": 0,
    "high": 1,
    "medium": 3,
    "issues": [
      {
        "package": "jsonwebtoken",
        "version": "8.5.0",
        "vulnerability": "CVE-2022-23529",
        "severity": "high",
        "fix": "Upgrade to 9.0.0+"
      }
    ]
  }
}
```

#### Subagent: PerformanceReviewAgent

**Purpose**: Scalability and performance checks

**Input**:
```json
{
  "increment_id": "0001",
  "files": ["plan.md", "src/"],
  "checks": ["response_time", "concurrency", "database_queries", "caching"]
}
```

**Output**:
```json
{
  "response_time": {
    "target": "p95 < 500ms",
    "specified": false,
    "recommendation": "Add performance requirements to spec.md"
  },
  "concurrency": {
    "target": "100 concurrent users",
    "assessment": "Session storage in Redis supports horizontal scaling",
    "status": "PASS"
  },
  "database_queries": {
    "n_plus_1_detected": false,
    "missing_indexes": [
      {
        "table": "users",
        "column": "email",
        "reason": "Login lookup by email (AC-US1-01)"
      }
    ]
  }
}
```

---

### Quality Gate Decision Logic

**QAOrchestrator synthesizes all subagent outputs into a single decision**:

```typescript
enum QualityGateDecision {
  PASS = "PASS",          // Ready for production
  CONCERNS = "CONCERNS",  // Issues found, should address
  FAIL = "FAIL"           // Blockers, must fix
}

interface QualityGateResult {
  decision: QualityGateDecision;
  blockers: Issue[];       // MUST fix (Risk ≥9, critical security)
  concerns: Issue[];       // SHOULD fix (Risk 6-8, test gaps)
  recommendations: Issue[]; // NICE to fix (quality improvements)
}

function decideQualityGate(results: SubagentResults[]): QualityGateResult {
  // FAIL if any:
  // - Risk score ≥ 9 (BMAD threshold)
  // - Critical security vulnerability
  // - <60% test coverage
  // - Rule-based validation failed

  // CONCERNS if any:
  // - Risk score 6-8 (BMAD threshold)
  // - High security vulnerability
  // - <80% test coverage
  // - Spec quality score <70

  // PASS otherwise
}
```

---

### Workflow Integration

#### Pre-Implementation QA (Before `/specweave:do`)

```bash
/qa 0001 --pre
```

**Checks**:
- ✅ Spec quality (clarity, testability, completeness)
- ✅ Risk assessment (identify issues early)
- ✅ Architecture review (plan.md soundness)
- ✅ Test strategy (test plan in tasks.md)

**Output**:
```
🟢 PRE-IMPLEMENTATION QA: PASS

✅ Spec quality: 87/100 (GOOD)
✅ Risk assessment: 4.2/10 (LOW-MEDIUM)
✅ Architecture: Sound and scalable
✅ Test strategy: Comprehensive

Recommendation: Proceed with implementation
```

#### During Implementation QA (After each task)

```bash
/qa 0001 --task T-003
```

**Checks**:
- ✅ Code review (implementation quality)
- ✅ Test coverage (unit + integration)
- ✅ Security audit (OWASP)
- ✅ Requirements traceability

#### Post-Implementation QA (Before `/specweave:done`)

```bash
/qa 0001 --gate
```

**Checks** (comprehensive):
- ✅ All pre-implementation checks
- ✅ All during-implementation checks
- ✅ E2E test coverage
- ✅ Performance validation
- ✅ Documentation completeness

**Output**:
```
🟢 QUALITY GATE: PASS

Ready for production ✅

All checks passed:
  ✅ Rule-based validation (120/120)
  ✅ Spec quality (87/100)
  ✅ Risk assessment (3.5/10 - LOW)
  ✅ Test coverage (92% - EXCELLENT)
  ✅ Code review (90/100 - EXCELLENT)
  ✅ Security audit (No vulnerabilities)
  ✅ Performance (Response time <500ms)

Recommendation: Ship it! 🚀
```

---

## Implementation Options

### Option A: Quick Win (2 weeks)

**Extend existing `increment-quality-judge` skill**:

1. Add risk assessment dimension
2. Add quality gate decision (PASS/CONCERNS/FAIL)
3. Add NFR checking
4. Improve output formatting

**Deliverable**: Enhanced `/validate-increment 0001 --quality`

**Effort**: 2 weeks
**Token cost**: ~3-5K per assessment
**Value**: Moderate improvement over current state

---

### Option B: Full Multi-Agent (4 weeks)

**Build QAOrchestrator + 6 subagents**:

1. QAOrchestrator agent (orchestrator pattern)
2. SpecQualityAgent (existing logic)
3. RiskAssessmentAgent (new, BMAD pattern)
4. TestCoverageAgent (new, enhanced)
5. CodeReviewAgent (new)
6. SecurityAuditAgent (new)
7. PerformanceReviewAgent (new)

**Deliverable**: New `/qa 0001 --full` command

**Effort**: 4 weeks
**Token cost**: ~10-15K per full assessment
**Value**: Significant improvement, industry-leading QA

---

### Option C: Hybrid Progressive (3 weeks)

**Implement both Option A and Option B**:

1. Quick mode (Option A) - default
2. Full mode (Option B) - on-demand

**Deliverable**:
- `/qa 0001` → Quick mode
- `/qa 0001 --full` → Full mode

**Effort**: 3 weeks (parallel track)
**Token cost**: User choice (3-5K quick, 10-15K full)
**Value**: Best flexibility, progressive disclosure

---

## Integration Strategy

### Integration with Existing Systems

#### 1. Rule-Based Validation

```
/qa 0001
├── Rule-based (120 checks) - FREE, FAST (existing)
└── AI Quality Judge - OPTIONAL, COST (~2K tokens) (new/enhanced)
    ├── Spec quality
    ├── Risk assessment (new!)
    └── Quality gate decision (new!)
```

#### 2. PM Gates

```
/specweave:done 0001
├── All tasks completed? (existing)
├── Living completion report? (existing)
└── Quality gate passed? (NEW!)
    → Automatically run /qa 0001 --gate
    → Block if FAIL, warn if CONCERNS
```

#### 3. Living Docs Sync

```
Post-task-completion hook
├── Update living docs (existing)
└── Run quick QA check (NEW!)
    → Detect quality regressions early
```

#### 4. Test-Aware Planning

```
/specweave:inc "feature"
├── PM agent generates spec.md (existing)
├── Architect generates plan.md (existing)
├── Test-aware planner generates tasks.md (existing)
└── QA pre-check (NEW!)
    → Run /qa {id} --pre
    → Catch issues before implementation starts
```

---

## Cost-Benefit Analysis

### Option A: Quick Win

**Costs**:
- Implementation: 2 weeks (1 developer)
- Token cost: ~$0.03 per assessment (3K tokens × $0.01/1K)
- Maintenance: Low (extends existing skill)

**Benefits**:
- ✅ Immediate value (2 weeks to production)
- ✅ Low token cost (affordable for all teams)
- ✅ Risk assessment (new capability)
- ✅ Quality gate decisions (new capability)
- ✅ Enhanced output formatting

**ROI**: High (quick, cheap, valuable)

---

### Option B: Full Multi-Agent

**Costs**:
- Implementation: 4 weeks (1 developer)
- Token cost: ~$0.10 per full assessment (10K tokens × $0.01/1K)
- Maintenance: Medium (orchestrator + 6 subagents)

**Benefits**:
- ✅ Parallel execution (5-10x faster)
- ✅ Specialized expertise (deeper insights)
- ✅ Comprehensive verification (7 dimensions)
- ✅ Industry-leading QA (competitive advantage)
- ✅ Scalable (add subagents as needed)

**ROI**: Very High (significant value, reasonable cost)

---

### Option C: Hybrid Progressive

**Costs**:
- Implementation: 3 weeks (1 developer, parallel)
- Token cost: User choice ($0.03 quick, $0.10 full)
- Maintenance: Medium-High (two implementations)

**Benefits**:
- ✅ Flexibility (choose based on need)
- ✅ Progressive disclosure (start simple)
- ✅ Cost-effective (use full mode sparingly)
- ✅ Best of both worlds

**ROI**: Highest (maximum flexibility, user choice)

---

## Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal**: Extend existing quality judge with risk assessment

**Deliverables**:
1. Add `RiskAssessmentDimension` to increment-quality-judge
2. Add quality gate decision (PASS/CONCERNS/FAIL)
3. Add NFR checking
4. Update output formatting

**Validation**: Run on existing increments (0001-0007)

---

### Phase 2: Orchestrator (Week 3-4)

**Goal**: Build QAOrchestrator + initial subagents

**Deliverables**:
1. QAOrchestrator agent (orchestrator pattern)
2. SpecQualityAgent (migrate existing logic)
3. RiskAssessmentAgent (new)
4. TestCoverageAgent (new)

**Validation**: Compare quick vs full mode on increment 0007

---

### Phase 3: Specialized Subagents (Week 5-6)

**Goal**: Add security, code review, performance agents

**Deliverables**:
1. SecurityAuditAgent (OWASP Top 10, CVE checking)
2. CodeReviewAgent (implementation quality)
3. PerformanceReviewAgent (scalability, efficiency)

**Validation**: Full QA on production-ready increment

---

### Phase 4: Integration & Polish (Week 7-8)

**Goal**: Integrate with existing systems, polish UX

**Deliverables**:
1. Integrate with `/specweave:done` (automatic quality gate)
2. Integrate with post-task-completion hook (quick checks)
3. Integrate with `/specweave:inc` (pre-implementation QA)
4. Comprehensive documentation
5. Demo video and user guide

**Validation**: Beta testing with real users

---

## Comparison with Competitors

### SpecWeave @qa vs BMAD @qa

| Feature | SpecWeave (Proposed) | BMAD Method |
|---------|----------------------|-------------|
| **Risk Assessment** | ✅ P×I scoring (0-10) | ✅ P×I scoring (1-9) |
| **Quality Gates** | ✅ PASS/CONCERNS/FAIL | ✅ PASS/CONCERNS/FAIL |
| **Multi-Stage QA** | ✅ Pre/During/Post | ✅ Pre/During/Post |
| **Specialized Subagents** | ✅ 6 subagents | ❌ Single QA agent |
| **Parallel Execution** | ✅ Orchestrator pattern | ❌ Sequential |
| **NFR Checking** | ✅ Performance agent | ✅ @qa *nfr |
| **Security Audit** | ✅ Security agent | ⚠️  Partial (in review) |
| **Integration** | ✅ SpecWeave lifecycle | ✅ BMAD workflow |

**SpecWeave Advantages**:
- ✅ Parallel subagent execution (faster)
- ✅ Specialized expertise (deeper insights)
- ✅ Native integration with SpecWeave lifecycle

**BMAD Advantages**:
- ✅ Simpler (single agent)
- ✅ Mature (production-tested)

---

### SpecWeave @qa vs Anthropic Research System

| Feature | SpecWeave (Proposed) | Anthropic |
|---------|----------------------|-----------|
| **Orchestrator Pattern** | ✅ QAOrchestrator | ✅ LeadResearcher |
| **Specialized Subagents** | ✅ 6 quality agents | ✅ 3+ research agents |
| **Parallel Execution** | ✅ Via Task tool | ✅ Via subagent spawn |
| **Extended Thinking** | ✅ For orchestrator | ✅ For all agents |
| **Feedback Loops** | ✅ Iterative refinement | ✅ Iterative research |
| **LLM-as-Judge** | ✅ Multi-dimensional | ✅ Single-judge |

**SpecWeave Advantages**:
- ✅ Domain-specific (software quality)
- ✅ Multi-judge consensus (per dimension)

**Anthropic Advantages**:
- ✅ Research-grade rigor
- ✅ Production-proven at scale

---

## Recommendations

### For SpecWeave v0.8.0

**RECOMMENDED: Option C (Hybrid Progressive)**

**Why**:
1. ✅ Quick win (Phase 1) can ship in 2 weeks
2. ✅ Full system (Phase 2-3) adds value incrementally
3. ✅ User choice (quick vs full) maximizes flexibility
4. ✅ Progressive disclosure (start simple, go deep)
5. ✅ Competitive advantage (industry-leading QA)

**Estimated Timeline**:
- **v0.8.0 (2 weeks)**: Quick mode (Option A)
- **v0.9.0 (4 weeks)**: Full mode (Option B)
- **v1.0.0 (2 weeks)**: Integration & polish (Phase 4)

**Total Effort**: 8 weeks (2 months)

---

## Appendix: Code Samples

### Sample: QAOrchestrator Agent

```markdown
---
name: qa-orchestrator
description: QA Orchestrator that spawns specialized quality verification subagents (spec quality, risk assessment, test coverage, code review, security audit, performance review) and synthesizes results into unified quality gate decisions. Activates for qa, quality check, validate, quality gate, pre-implementation check, final review.
tools: Read, Grep, Glob, Task
model: claude-sonnet-4-5-20250929
cost_profile: orchestration
---

# QA Orchestrator Agent

You are a QA Orchestrator that coordinates specialized quality verification subagents.

## Your Responsibilities

1. **Parse user request** - Determine which checks to run
2. **Spawn subagents in parallel** - Use Task tool for concurrent execution
3. **Synthesize results** - Combine subagent outputs into unified report
4. **Quality gate decision** - PASS/CONCERNS/FAIL based on BMAD thresholds
5. **Actionable recommendations** - Prioritized list of fixes

## Workflow

### Step 1: Parse Request

User requests:
- `/qa 0001` → Quick mode (rule-based + spec quality)
- `/qa 0001 --full` → Full mode (all subagents)
- `/qa 0001 --pre` → Pre-implementation (spec + risk + architecture)
- `/qa 0001 --gate` → Final gate (everything)

### Step 2: Spawn Subagents (Parallel)

Use extended thinking to plan subagent invocations:

```typescript
// Example: Full mode
Task(subagent: "spec-quality-agent", prompt: "Evaluate spec.md for increment 0001")
Task(subagent: "risk-assessment-agent", prompt: "Assess risks for increment 0001")
Task(subagent: "test-coverage-agent", prompt: "Verify test coverage for increment 0001")
Task(subagent: "code-review-agent", prompt: "Review implementation for increment 0001")
Task(subagent: "security-audit-agent", prompt: "Security audit for increment 0001")
Task(subagent: "performance-review-agent", prompt: "Performance review for increment 0001")
```

### Step 3: Synthesize Results

Wait for all subagents to complete, then synthesize:

```typescript
interface SynthesizedReport {
  rule_based: RuleBasedResult;      // 120 checks
  spec_quality: SpecQualityResult;  // 6 dimensions
  risk_assessment: RiskResult;      // P×I scores
  test_coverage: CoverageResult;    // AC-ID coverage
  code_review?: CodeReviewResult;   // Optional (if code exists)
  security_audit?: SecurityResult;  // Optional
  performance?: PerformanceResult;  // Optional
  quality_gate: QualityGateDecision; // PASS/CONCERNS/FAIL
}
```

### Step 4: Quality Gate Decision

Apply BMAD thresholds:

- **FAIL if**:
  - Risk score ≥ 9 (critical)
  - Critical security vulnerability
  - Test coverage < 60%
  - Rule-based validation failed

- **CONCERNS if**:
  - Risk score 6-8 (high)
  - High security vulnerability
  - Test coverage < 80%
  - Spec quality < 70

- **PASS otherwise**

### Step 5: Generate Report

Output format (see examples above in main document)
```

---

### Sample: RiskAssessmentAgent

```markdown
---
name: risk-assessment-agent
description: Risk assessment specialist using BMAD's Probability × Impact scoring. Evaluates technical, security, implementation, and operational risks. Outputs structured risk reports with mitigation strategies.
tools: Read, Grep, Glob
model: claude-sonnet-4-5-20250929
cost_profile: execution
---

# Risk Assessment Agent

You are a Risk Assessment Specialist using BMAD's P×I scoring methodology.

## Risk Scoring Formula

```
Risk Score = Probability × Impact

Probability (0.0-1.0):
- 0.0-0.3: Low (unlikely to occur)
- 0.4-0.6: Medium (may occur)
- 0.7-1.0: High (likely to occur)

Impact (1-10):
- 1-3: Minor (cosmetic, no user impact)
- 4-6: Moderate (some user impact, workaround exists)
- 7-9: Major (significant user impact, no workaround)
- 10: Critical (system failure, data loss, security breach)

Final Score (0.0-10.0):
- 9.0-10.0: Critical risk (FAIL)
- 6.0-8.9: High risk (CONCERNS)
- 3.0-5.9: Medium risk (PASS with monitoring)
- 0.0-2.9: Low risk (PASS)
```

## Risk Categories

1. **Technical Risks** - Architecture, scalability, performance, complexity
2. **Security Risks** - OWASP Top 10, data exposure, authentication, authorization
3. **Implementation Risks** - Timeline, dependencies, technical debt
4. **Operational Risks** - Monitoring, maintenance, support, documentation

## Workflow

1. **Read increment files** (spec.md, plan.md)
2. **Identify risks** in each category
3. **Score each risk** (P × I)
4. **Provide mitigation strategies**
5. **Generate structured output** (JSON format)

## Example Output

[See detailed JSON examples in main document above]
```

---

## Conclusion

This comprehensive design provides SpecWeave with **industry-leading quality assurance** capabilities, drawing on best practices from:

- ✅ Anthropic's multi-agent research system (orchestrator pattern, parallel execution)
- ✅ BMAD Method (risk scoring, quality gates, multi-stage QA)
- ✅ LLM-as-Judge 2025 (chain-of-thought, multi-judge consensus, bias mitigation)
- ✅ Microsoft/Google patterns (hierarchical verification, cyclic workflows)

**Recommended Implementation**: Option C (Hybrid Progressive) - delivers quick wins while building towards comprehensive multi-agent system.

**Next Steps**:
1. User feedback on proposed architecture
2. Prioritize Option A/B/C based on team needs
3. Begin Phase 1 implementation (2 weeks)

---

**Document Status**: ✅ COMPLETE
**For Questions**: See `.specweave/increments/0007-smart-increment-discipline/`
