# QA Command - Proof of Concept Code Samples

**Created**: 2025-01-04
**Increment**: 0007-smart-increment-discipline
**Related**: QA-COMMAND-COMPREHENSIVE-DESIGN.md, QA-INTEGRATION-DETAILED-DESIGN.md
**Status**: Implementation Reference

---

## Overview

This document provides **working code samples** demonstrating how to implement the @qa command system for SpecWeave.

---

## Table of Contents

1. [Option A: Quick Win Implementation](#option-a-quick-win-implementation)
2. [Option B: Full Multi-Agent Implementation](#option-b-full-multi-agent-implementation)
3. [Risk Assessment Algorithm](#risk-assessment-algorithm)
4. [Quality Gate Decision Logic](#quality-gate-decision-logic)
5. [CLI Command Implementation](#cli-command-implementation)
6. [Agent Prompt Templates](#agent-prompt-templates)

---

## Option A: Quick Win Implementation

### Enhanced increment-quality-judge Skill

**File**: `plugins/specweave/skills/increment-quality-judge/SKILL.md`

```markdown
---
name: increment-quality-judge
description: Enhanced AI-powered quality assessment with risk scoring, NFR checking, and quality gate decisions. Evaluates specifications, plans, and tests for clarity, testability, completeness, feasibility, maintainability, edge cases, and RISKS. Activates for validate quality, quality check, assess spec, evaluate increment, spec review, quality score, risk assessment, qa check, quality gate.
allowed-tools: Read, Grep, Glob
---

# Increment Quality Judge (Enhanced v2.0)

AI-powered quality assessment with risk scoring (BMAD pattern) and quality gate decisions.

## New Features (v2.0)

1. **Risk Assessment Dimension** - Probability × Impact scoring (0-10 scale)
2. **Quality Gate Decisions** - PASS/CONCERNS/FAIL (BMAD thresholds)
3. **NFR Checking** - Non-functional requirements (performance, security, scalability)
4. **Enhanced Output** - Blockers, concerns, recommendations

## Evaluation Dimensions (7 total, was 6)

```yaml
dimensions:
  clarity:
    weight: 0.18
    criteria: [...]

  testability:
    weight: 0.22
    criteria: [...]

  completeness:
    weight: 0.18
    criteria: [...]

  feasibility:
    weight: 0.13
    criteria: [...]

  maintainability:
    weight: 0.09
    criteria: [...]

  edge_cases:
    weight: 0.09
    criteria: [...]

  # NEW: Risk Assessment (BMAD pattern)
  risk:
    weight: 0.11
    criteria:
      - "Are security risks identified and mitigated?"
      - "Are technical risks (scalability, performance) addressed?"
      - "Are implementation risks (complexity, dependencies) managed?"
      - "Are operational risks (monitoring, support) considered?"
```

## Risk Scoring (BMAD Pattern)

### Formula

```
Risk Score = Probability × Impact

Probability (0.0-1.0):
- 0.0-0.3: Low (unlikely)
- 0.4-0.6: Medium (may occur)
- 0.7-1.0: High (likely)

Impact (1-10):
- 1-3: Minor
- 4-6: Moderate
- 7-9: Major
- 10: Critical

Final Score (0.0-10.0):
- 9.0-10.0: FAIL (critical)
- 6.0-8.9: CONCERNS (high)
- 3.0-5.9: PASS (medium)
- 0.0-2.9: PASS (low)
```

### Risk Assessment Prompt

```markdown
You are evaluating SOFTWARE RISKS for an increment.

Read increment files:
- .specweave/increments/{id}/spec.md
- .specweave/increments/{id}/plan.md

Identify risks in these categories:

1. **Security Risks**
   - OWASP Top 10 vulnerabilities
   - Data exposure, authentication, authorization
   - Cryptographic failures

2. **Technical Risks**
   - Architecture complexity
   - Scalability bottlenecks
   - Performance issues

3. **Implementation Risks**
   - Tight timeline
   - External dependencies
   - Technical debt accumulation

4. **Operational Risks**
   - Lack of monitoring
   - Difficult to maintain
   - Poor documentation

For EACH risk found:

1. Calculate PROBABILITY (0.0-1.0)
   - Based on spec clarity, past experience, complexity

2. Calculate IMPACT (1-10)
   - 10 = Critical (security breach, data loss, system failure)
   - 7-9 = Major (significant user impact, no workaround)
   - 4-6 = Moderate (some impact, workaround exists)
   - 1-3 = Minor (cosmetic, no user impact)

3. Calculate RISK SCORE = Probability × Impact

4. Provide MITIGATION strategy

Output format:
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
      "severity": "HIGH",
      "mitigation": "Use bcrypt or Argon2, never plain text",
      "location": "spec.md, section 'Authentication'",
      "acceptance_criteria": "AC-US1-01"
    }
  ],
  "overall_risk_score": 7.5,
  "dimension_score": 0.35
}
```

## Quality Gate Decision Logic

```typescript
interface QualityGateDecision {
  decision: 'PASS' | 'CONCERNS' | 'FAIL';
  blockers: Issue[];       // MUST fix (Risk ≥9, critical)
  concerns: Issue[];       // SHOULD fix (Risk 6-8, high)
  recommendations: Issue[]; // NICE to fix (improvements)
}

function decideQualityGate(assessment: QualityAssessment): QualityGateDecision {
  const blockers: Issue[] = [];
  const concerns: Issue[] = [];
  const recommendations: Issue[] = [];

  // Check risks
  for (const risk of assessment.risks) {
    if (risk.score >= 9.0) {
      blockers.push({
        type: 'risk',
        severity: 'critical',
        title: risk.title,
        description: risk.description,
        mitigation: risk.mitigation
      });
    } else if (risk.score >= 6.0) {
      concerns.push({
        type: 'risk',
        severity: 'high',
        title: risk.title,
        description: risk.description,
        mitigation: risk.mitigation
      });
    }
  }

  // Check test coverage
  if (assessment.test_coverage < 60) {
    blockers.push({
      type: 'test_coverage',
      severity: 'critical',
      title: 'Insufficient test coverage',
      description: `Test coverage is ${assessment.test_coverage}% (threshold: 60%)`,
      mitigation: 'Add tests to reach minimum 60% coverage'
    });
  } else if (assessment.test_coverage < 80) {
    concerns.push({
      type: 'test_coverage',
      severity: 'high',
      title: 'Test coverage below target',
      description: `Test coverage is ${assessment.test_coverage}% (target: 80%)`,
      mitigation: 'Add tests to reach 80% coverage'
    });
  }

  // Check spec quality
  if (assessment.overall_score < 50) {
    blockers.push({
      type: 'spec_quality',
      severity: 'critical',
      title: 'Spec quality unacceptable',
      description: `Spec quality is ${assessment.overall_score}/100 (threshold: 50)`,
      mitigation: 'Revise spec to address major issues'
    });
  } else if (assessment.overall_score < 70) {
    concerns.push({
      type: 'spec_quality',
      severity: 'high',
      title: 'Spec quality needs improvement',
      description: `Spec quality is ${assessment.overall_score}/100 (target: 70)`,
      mitigation: 'Address HIGH priority suggestions'
    });
  }

  // Add dimension-specific issues as recommendations
  for (const issue of assessment.issues) {
    if (issue.severity === 'major') {
      concerns.push(issue);
    } else {
      recommendations.push(issue);
    }
  }

  // Decide gate
  let decision: 'PASS' | 'CONCERNS' | 'FAIL';
  if (blockers.length > 0) {
    decision = 'FAIL';
  } else if (concerns.length > 0) {
    decision = 'CONCERNS';
  } else {
    decision = 'PASS';
  }

  return { decision, blockers, concerns, recommendations };
}
```

## Enhanced Output Format

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

🔴 RISK-001: HIGH (9.0/10)
   Category: Security
   Title: Password storage implementation
   Description: Spec doesn't specify password hashing
   Probability: 0.9 (High) × Impact: 10 (Critical)
   Location: spec.md, Authentication section
   Mitigation: Use bcrypt/Argon2, never plain text

🟡 RISK-002: MEDIUM (6.0/10)
   Category: Security
   Title: Rate limiting not specified
   Description: No brute-force protection mentioned
   Probability: 0.6 (Medium) × Impact: 10 (Critical)
   Location: spec.md, Security section
   Mitigation: Add 5 failed attempts → 15 min lockout

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
  1. 🔴 HIGH RISK: Password storage (Risk ≥9)
     → Add task: "Implement bcrypt password hashing"

Concerns (SHOULD FIX):
  2. 🟡 MEDIUM RISK: Rate limiting not specified (Risk ≥6)
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
```

---

## Option B: Full Multi-Agent Implementation

### QA Orchestrator Agent

**File**: `plugins/specweave/agents/qa-orchestrator/AGENT.md`

```markdown
---
name: qa-orchestrator
description: QA Orchestrator that coordinates specialized quality verification subagents (spec quality, risk assessment, test coverage, code review, security audit, performance review) and synthesizes results into unified quality gate decisions. Activates for qa, quality check, validate, quality gate, pre-implementation check, final review.
tools: Read, Grep, Glob, Task
model: claude-sonnet-4-5-20250929
cost_profile: orchestration
---

# QA Orchestrator Agent

You are a QA Orchestrator coordinating specialized quality verification subagents.

## Your Role

**Orchestrate parallel quality checks** and **synthesize results** into unified quality gate decisions.

## Workflow

### Step 1: Parse Request

User provides:
- Increment ID (e.g., "0008")
- Mode: quick / full / pre / gate
- Optional: specific checks (--spec --risk --tests)

### Step 2: Determine Subagents (Extended Thinking)

Use extended thinking to plan:

```typescript
interface SubagentPlan {
  quick_mode: {
    subagents: ['rule-based-validator', 'spec-quality-agent', 'risk-assessment-agent'],
    parallelization: 'full',
    estimated_duration: '2-3 min',
    token_budget: 5000
  },
  full_mode: {
    subagents: [
      'rule-based-validator',
      'spec-quality-agent',
      'risk-assessment-agent',
      'test-coverage-agent',
      'code-review-agent',
      'security-audit-agent',
      'performance-review-agent'
    ],
    parallelization: 'full',
    estimated_duration: '5-10 min',
    token_budget: 15000
  },
  pre_mode: {
    subagents: ['spec-quality-agent', 'risk-assessment-agent', 'test-strategy-validator'],
    parallelization: 'full',
    estimated_duration: '3-5 min',
    token_budget: 7000
  },
  gate_mode: {
    subagents: 'full_mode + additional_validation',
    parallelization: 'full',
    estimated_duration: '7-12 min',
    token_budget: 18000
  }
}
```

### Step 3: Spawn Subagents (Parallel)

**CRITICAL**: Use Task tool to spawn subagents IN PARALLEL

```markdown
I'm spawning {N} subagents in parallel:
- SpecQualityAgent
- RiskAssessmentAgent
- TestCoverageAgent
- [...]

Estimated time: {X} minutes
Token budget: ~{Y}K tokens
```

```typescript
// Spawn all subagents in ONE message (parallel execution)
Task(subagent: "spec-quality-agent", prompt: "...")
Task(subagent: "risk-assessment-agent", prompt: "...")
Task(subagent: "test-coverage-agent", prompt: "...")
Task(subagent: "code-review-agent", prompt: "...")
Task(subagent: "security-audit-agent", prompt: "...")
Task(subagent: "performance-review-agent", prompt: "...")
```

**DO NOT** spawn sequentially. **MUST** spawn all in one message.

### Step 4: Wait for Results

Wait for all subagents to complete...

### Step 5: Synthesize Results

Use extended thinking to synthesize:

```typescript
interface SynthesizedReport {
  increment_id: string;
  mode: 'quick' | 'full' | 'pre' | 'gate';
  timestamp: string;

  // Rule-based (always first)
  rule_based: {
    passed: boolean;
    checks_passed: number;
    checks_total: number;
    errors: RuleError[];
  };

  // Subagent results
  spec_quality?: {
    overall_score: number;
    dimension_scores: Record<string, number>;
    issues: Issue[];
    suggestions: Suggestion[];
  };

  risk_assessment?: {
    overall_risk_score: number;
    risks: Risk[];
  };

  test_coverage?: {
    coverage_percentage: number;
    ac_coverage: Record<string, ACCoverage>;
    gaps: Gap[];
  };

  code_review?: {
    requirements_coverage: number;
    code_quality: number;
    security: number;
    issues: Issue[];
  };

  security_audit?: {
    owasp_checks: OWASPCheck[];
    dependency_vulnerabilities: Vulnerability[];
  };

  performance?: {
    response_time: Assessment;
    concurrency: Assessment;
    database_queries: Assessment;
  };

  // Final decision
  quality_gate: {
    decision: 'PASS' | 'CONCERNS' | 'FAIL';
    blockers: Issue[];
    concerns: Issue[];
    recommendations: Issue[];
  };
}
```

### Step 6: Quality Gate Decision

Apply decision logic (see implementation below).

### Step 7: Generate Report

Output synthesized report to user (see format above).

## Subagent Prompts

### SpecQualityAgent Prompt

```markdown
Evaluate the SPECIFICATION QUALITY for increment {id}.

Read files:
- .specweave/increments/{id}/spec.md

Evaluate these dimensions:
1. Clarity (0.18 weight)
2. Testability (0.22 weight)
3. Completeness (0.18 weight)
4. Feasibility (0.13 weight)
5. Maintainability (0.09 weight)
6. Edge Cases (0.09 weight)
7. Risk (0.11 weight)

Use Chain-of-Thought reasoning:
- Read spec.md thoroughly
- For each dimension, evaluate criteria
- Score 0.00-1.00 per dimension
- Identify issues (critical/major/minor)
- Provide specific suggestions with examples
- Calculate confidence (0.00-1.00)

Output format:
{
  "overall_score": 87,
  "dimension_scores": {...},
  "issues": [...],
  "suggestions": [...]
}
```

### RiskAssessmentAgent Prompt

```markdown
Assess RISKS for increment {id} using BMAD's P×I scoring.

Read files:
- .specweave/increments/{id}/spec.md
- .specweave/increments/{id}/plan.md

Identify risks in categories:
1. Security (OWASP Top 10, data exposure, auth)
2. Technical (architecture, scalability, performance)
3. Implementation (timeline, dependencies, debt)
4. Operational (monitoring, maintenance, docs)

For EACH risk:
1. Calculate Probability (0.0-1.0)
2. Calculate Impact (1-10)
3. Calculate Risk Score = P × I
4. Provide mitigation strategy

Output format:
{
  "risks": [
    {
      "id": "RISK-001",
      "category": "security",
      "title": "...",
      "probability": 0.9,
      "impact": 10,
      "score": 9.0,
      "mitigation": "..."
    }
  ],
  "overall_risk_score": 7.5
}
```

### TestCoverageAgent Prompt

```markdown
Verify TEST COVERAGE for increment {id}.

Read files:
- .specweave/increments/{id}/spec.md (AC-IDs)
- .specweave/increments/{id}/tasks.md (test plans)

Check:
1. ALL AC-IDs from spec.md are covered in tasks.md
2. Each AC has unit + integration + E2E tests (where applicable)
3. Test plans use BDD format (Given/When/Then)
4. Coverage targets are realistic (80-90%)

Output format:
{
  "coverage_percentage": 85,
  "ac_coverage": {
    "AC-US1-01": {"covered": true, "tests": ["T-001", "T-003"]},
    "AC-US1-02": {"covered": false, "gap": "No E2E test"}
  },
  "gaps": [...]
}
```

(Continued for other subagents...)
```

---

### TypeScript Implementation (CLI)

**File**: `src/cli/commands/qa.ts`

```typescript
import { Command } from 'commander';
import { runRuleBasedValidation } from '@/core/validation/increment-validator';
import { spawnQAOrchestrator } from '@/core/agents/qa-orchestrator';
import { displayQAReport } from '@/utils/qa-report-formatter';

interface QAOptions {
  quick?: boolean;
  full?: boolean;
  pre?: boolean;
  gate?: boolean;
  ci?: boolean;
  noAi?: boolean;
  silent?: boolean;
  export?: boolean;
}

export const qaCommand = new Command('qa')
  .description('Run quality assurance checks on increment')
  .argument('<increment-id>', 'Increment ID (e.g., 0008 or 0008-user-auth)')
  .option('--quick', 'Quick mode (rule-based + spec quality + risk)', false)
  .option('--full', 'Full mode (all subagents in parallel)', false)
  .option('--pre', 'Pre-implementation check (spec + risk + architecture)', false)
  .option('--gate', 'Quality gate (comprehensive check before close)', false)
  .option('--ci', 'CI mode (non-interactive, JSON output)', false)
  .option('--no-ai', 'Skip AI checks (rule-based only)', false)
  .option('--silent', 'Silent mode (no output, logs only)', false)
  .option('--export', 'Export blockers to tasks.md', false)
  .action(async (incrementId: string, options: QAOptions) => {
    try {
      await runQA(incrementId, options);
    } catch (error) {
      console.error(`❌ QA failed: ${error.message}`);
      process.exit(1);
    }
  });

async function runQA(incrementId: string, options: QAOptions): Promise<void> {
  const startTime = Date.now();

  // Normalize increment ID (0008 or 0008-user-auth)
  const normalizedId = normalizeIncrementId(incrementId);

  // Determine mode
  const mode = determineMode(options);

  if (!options.silent) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`QA VERIFICATION: Increment ${normalizedId}`);
    console.log(`Mode: ${mode.toUpperCase()}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  }

  // Step 1: Rule-based validation (ALWAYS first)
  if (!options.silent) {
    console.log('🔍 Running rule-based validation (120 checks)...\n');
  }

  const ruleBasedResult = await runRuleBasedValidation(normalizedId);

  if (!ruleBasedResult.passed) {
    console.error('❌ RULE-BASED VALIDATION: FAILED');
    console.error(`   ${ruleBasedResult.failedCount}/${ruleBasedResult.totalCount} checks failed\n`);

    displayRuleBasedErrors(ruleBasedResult.errors);

    console.log('\n💡 Fix structural issues before running AI quality checks.\n');

    if (options.ci) {
      // CI mode: output JSON
      const json = { status: 'FAIL', rule_based: ruleBasedResult };
      console.log(JSON.stringify(json, null, 2));
    }

    process.exit(1);
  }

  if (!options.silent) {
    console.log('✅ RULE-BASED VALIDATION: PASSED (120/120)\n');
  }

  // Step 2: AI Quality Assessment
  if (options.noAi) {
    if (!options.silent) {
      console.log('⏭️  Skipping AI quality checks (--no-ai flag)\n');
    }
    process.exit(0);
  }

  // Spawn QA Orchestrator
  if (!options.silent) {
    console.log(`🤖 Spawning QA Orchestrator (${mode} mode)...\n`);
  }

  const qaResult = await spawnQAOrchestrator(normalizedId, mode, ruleBasedResult);

  const duration = Date.now() - startTime;

  // Display report
  if (options.ci) {
    // CI mode: JSON output
    const json = {
      status: qaResult.quality_gate.decision,
      duration_ms: duration,
      ...qaResult
    };
    console.log(JSON.stringify(json, null, 2));
  } else if (!options.silent) {
    // Interactive mode: formatted report
    displayQAReport(qaResult);
  }

  // Export to tasks.md if requested
  if (options.export && qaResult.quality_gate.blockers.length > 0) {
    await exportBlockersToTasks(normalizedId, qaResult.quality_gate.blockers);
    console.log('\n✅ Exported blockers to tasks.md\n');
  }

  // Exit code based on decision
  if (options.ci) {
    if (qaResult.quality_gate.decision === 'FAIL') {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

function determineMode(options: QAOptions): 'quick' | 'full' | 'pre' | 'gate' {
  if (options.gate) return 'gate';
  if (options.full) return 'full';
  if (options.pre) return 'pre';
  return 'quick'; // default
}

function normalizeIncrementId(id: string): string {
  // Handle both "0008" and "0008-user-auth" formats
  const match = id.match(/^(\d{4})/);
  if (!match) {
    throw new Error(`Invalid increment ID: ${id}`);
  }
  return match[1];
}
```

---

## Risk Assessment Algorithm

### TypeScript Implementation

```typescript
// File: src/core/risk-assessment/risk-calculator.ts

export interface Risk {
  id: string;
  category: 'security' | 'technical' | 'implementation' | 'operational';
  title: string;
  description: string;
  probability: number; // 0.0-1.0
  impact: number;      // 1-10
  score: number;       // 0.0-10.0 (P × I)
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  mitigation: string;
  location: string;
  acceptance_criteria?: string;
}

export interface RiskAssessmentResult {
  risks: Risk[];
  overall_risk_score: number;
  risk_by_category: Record<string, number>;
}

export class RiskCalculator {
  /**
   * Calculate risk score using BMAD formula: P × I
   */
  static calculateRiskScore(probability: number, impact: number): number {
    if (probability < 0 || probability > 1) {
      throw new Error('Probability must be 0.0-1.0');
    }
    if (impact < 1 || impact > 10) {
      throw new Error('Impact must be 1-10');
    }
    return probability * impact;
  }

  /**
   * Determine severity level based on risk score
   */
  static determineSeverity(score: number): Risk['severity'] {
    if (score >= 9.0) return 'CRITICAL';
    if (score >= 6.0) return 'HIGH';
    if (score >= 3.0) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate overall risk score (weighted average)
   */
  static calculateOverallRisk(risks: Risk[]): number {
    if (risks.length === 0) return 0;

    // Weight by severity
    const weights = {
      CRITICAL: 1.0,
      HIGH: 0.7,
      MEDIUM: 0.4,
      LOW: 0.1
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const risk of risks) {
      const weight = weights[risk.severity];
      weightedSum += risk.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Group risks by category and calculate category scores
   */
  static groupRisksByCategory(risks: Risk[]): Record<string, number> {
    const categories = ['security', 'technical', 'implementation', 'operational'];
    const result: Record<string, number> = {};

    for (const category of categories) {
      const categoryRisks = risks.filter(r => r.category === category);
      result[category] = this.calculateOverallRisk(categoryRisks);
    }

    return result;
  }
}

// Example usage:
const risk: Risk = {
  id: 'RISK-001',
  category: 'security',
  title: 'Password storage not specified',
  description: 'Spec doesn\'t mention password hashing',
  probability: 0.9,
  impact: 10,
  score: RiskCalculator.calculateRiskScore(0.9, 10), // 9.0
  severity: RiskCalculator.determineSeverity(9.0),    // CRITICAL
  mitigation: 'Use bcrypt or Argon2',
  location: 'spec.md, Authentication section',
  acceptance_criteria: 'AC-US1-01'
};
```

---

## Quality Gate Decision Logic

### TypeScript Implementation

```typescript
// File: src/core/quality-gate/decision-logic.ts

export interface QualityGateDecision {
  decision: 'PASS' | 'CONCERNS' | 'FAIL';
  blockers: Issue[];
  concerns: Issue[];
  recommendations: Issue[];
  reasoning: string;
}

export interface Issue {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  mitigation?: string;
  location?: string;
}

export interface QualityGateThresholds {
  fail: {
    riskScore: number;        // ≥9.0 = FAIL
    testCoverage: number;     // <60% = FAIL
    specQuality: number;      // <50 = FAIL
    criticalVulnerabilities: number; // ≥1 = FAIL
  };
  concerns: {
    riskScore: number;        // ≥6.0 = CONCERNS
    testCoverage: number;     // <80% = CONCERNS
    specQuality: number;      // <70 = CONCERNS
    highVulnerabilities: number; // ≥1 = CONCERNS
  };
}

export const DEFAULT_THRESHOLDS: QualityGateThresholds = {
  fail: {
    riskScore: 9.0,
    testCoverage: 60,
    specQuality: 50,
    criticalVulnerabilities: 1
  },
  concerns: {
    riskScore: 6.0,
    testCoverage: 80,
    specQuality: 70,
    highVulnerabilities: 1
  }
};

export class QualityGateDecider {
  constructor(private thresholds: QualityGateThresholds = DEFAULT_THRESHOLDS) {}

  decide(assessment: QualityAssessment): QualityGateDecision {
    const blockers: Issue[] = [];
    const concerns: Issue[] = [];
    const recommendations: Issue[] = [];

    // Check 1: Risk Assessment
    if (assessment.risk_assessment) {
      const riskScore = assessment.risk_assessment.overall_risk_score;

      if (riskScore >= this.thresholds.fail.riskScore) {
        // Find all critical risks
        const criticalRisks = assessment.risk_assessment.risks.filter(
          r => r.score >= this.thresholds.fail.riskScore
        );

        for (const risk of criticalRisks) {
          blockers.push({
            type: 'risk',
            severity: 'critical',
            title: `CRITICAL RISK: ${risk.title}`,
            description: risk.description,
            mitigation: risk.mitigation,
            location: risk.location
          });
        }
      } else if (riskScore >= this.thresholds.concerns.riskScore) {
        // Find all high risks
        const highRisks = assessment.risk_assessment.risks.filter(
          r => r.score >= this.thresholds.concerns.riskScore &&
               r.score < this.thresholds.fail.riskScore
        );

        for (const risk of highRisks) {
          concerns.push({
            type: 'risk',
            severity: 'high',
            title: `HIGH RISK: ${risk.title}`,
            description: risk.description,
            mitigation: risk.mitigation,
            location: risk.location
          });
        }
      }
    }

    // Check 2: Test Coverage
    if (assessment.test_coverage) {
      const coverage = assessment.test_coverage.coverage_percentage;

      if (coverage < this.thresholds.fail.testCoverage) {
        blockers.push({
          type: 'test_coverage',
          severity: 'critical',
          title: 'Insufficient test coverage',
          description: `Coverage is ${coverage}% (minimum: ${this.thresholds.fail.testCoverage}%)`,
          mitigation: `Add tests to reach ${this.thresholds.fail.testCoverage}% coverage`
        });
      } else if (coverage < this.thresholds.concerns.testCoverage) {
        concerns.push({
          type: 'test_coverage',
          severity: 'high',
          title: 'Test coverage below target',
          description: `Coverage is ${coverage}% (target: ${this.thresholds.concerns.testCoverage}%)`,
          mitigation: `Add tests to reach ${this.thresholds.concerns.testCoverage}% coverage`
        });
      }

      // Check AC-ID coverage gaps
      for (const gap of assessment.test_coverage.gaps) {
        concerns.push({
          type: 'test_gap',
          severity: 'high',
          title: `Missing test: ${gap.acceptance_criteria}`,
          description: gap.description,
          mitigation: gap.recommendation
        });
      }
    }

    // Check 3: Spec Quality
    if (assessment.spec_quality) {
      const score = assessment.spec_quality.overall_score;

      if (score < this.thresholds.fail.specQuality) {
        blockers.push({
          type: 'spec_quality',
          severity: 'critical',
          title: 'Specification quality unacceptable',
          description: `Score is ${score}/100 (minimum: ${this.thresholds.fail.specQuality})`,
          mitigation: 'Revise spec to address critical issues'
        });
      } else if (score < this.thresholds.concerns.specQuality) {
        concerns.push({
          type: 'spec_quality',
          severity: 'high',
          title: 'Specification quality needs improvement',
          description: `Score is ${score}/100 (target: ${this.thresholds.concerns.specQuality})`,
          mitigation: 'Address HIGH priority suggestions'
        });
      }

      // Add dimension-specific issues
      for (const issue of assessment.spec_quality.issues) {
        if (issue.severity === 'critical') {
          blockers.push(issue);
        } else if (issue.severity === 'major') {
          concerns.push(issue);
        } else {
          recommendations.push(issue);
        }
      }
    }

    // Check 4: Security Vulnerabilities
    if (assessment.security_audit) {
      const criticalVulns = assessment.security_audit.dependency_vulnerabilities
        .filter(v => v.severity === 'critical');

      if (criticalVulns.length >= this.thresholds.fail.criticalVulnerabilities) {
        for (const vuln of criticalVulns) {
          blockers.push({
            type: 'security',
            severity: 'critical',
            title: `Critical vulnerability: ${vuln.vulnerability}`,
            description: `Package: ${vuln.package}@${vuln.version}`,
            mitigation: vuln.fix
          });
        }
      }

      const highVulns = assessment.security_audit.dependency_vulnerabilities
        .filter(v => v.severity === 'high');

      if (highVulns.length >= this.thresholds.concerns.highVulnerabilities) {
        for (const vuln of highVulns) {
          concerns.push({
            type: 'security',
            severity: 'high',
            title: `High vulnerability: ${vuln.vulnerability}`,
            description: `Package: ${vuln.package}@${vuln.version}`,
            mitigation: vuln.fix
          });
        }
      }
    }

    // Decide gate
    let decision: 'PASS' | 'CONCERNS' | 'FAIL';
    let reasoning: string;

    if (blockers.length > 0) {
      decision = 'FAIL';
      reasoning = `Found ${blockers.length} blocker(s) that MUST be fixed before proceeding.`;
    } else if (concerns.length > 0) {
      decision = 'CONCERNS';
      reasoning = `Found ${concerns.length} concern(s) that SHOULD be addressed.`;
    } else {
      decision = 'PASS';
      reasoning = 'All quality checks passed. Ready for production.';
    }

    return {
      decision,
      blockers,
      concerns,
      recommendations,
      reasoning
    };
  }
}

// Example usage:
const decider = new QualityGateDecider(DEFAULT_THRESHOLDS);
const result = decider.decide(assessmentResult);

if (result.decision === 'FAIL') {
  console.error('❌ QUALITY GATE: FAIL');
  console.error(result.reasoning);
  process.exit(1);
}
```

---

## Agent Prompt Templates

### Chain-of-Thought Prompt Template

```markdown
# LLM-as-Judge Evaluation (Chain-of-Thought)

You are evaluating [{DIMENSION}] for a software specification.

## Step 1: Read Specification

Read the following specification:

```
{SPEC_CONTENT}
```

## Step 2: Identify Criteria

Evaluate based on these criteria:
{CRITERIA_LIST}

## Step 3: Think Through Each Criterion

For each criterion, think step-by-step:

**Criterion 1**: {CRITERION_1}

<thinking>
- Does the spec meet this criterion?
- What evidence supports this?
- What's missing or unclear?
- How could it be improved?
</thinking>

Score: {0.0-1.0}

**Criterion 2**: {CRITERION_2}

<thinking>
[Same process...]
</thinking>

Score: {0.0-1.0}

## Step 4: Calculate Dimension Score

Average scores from all criteria:
Dimension Score = ({SCORE_1} + {SCORE_2} + ...) / {N}

## Step 5: Identify Issues

Based on low-scoring criteria, identify specific issues:

Issue 1:
- Severity: critical / major / minor
- Description: [What's wrong?]
- Location: [Where in spec?]
- Impact: [Why does this matter?]

## Step 6: Provide Suggestions

For each issue, suggest improvements with examples:

Suggestion 1:
- Priority: high / medium / low
- Description: [How to fix?]
- Example: [Show concrete improvement]

## Final Output

```json
{
  "dimension": "{DIMENSION}",
  "score": 0.85,
  "issues": [...],
  "suggestions": [...],
  "confidence": 0.90
}
```
```

---

## Summary

These code samples provide:

1. ✅ **Working TypeScript implementations** for core QA logic
2. ✅ **Agent prompt templates** following best practices
3. ✅ **Risk assessment algorithms** (BMAD pattern)
4. ✅ **Quality gate decision logic** with configurable thresholds
5. ✅ **CLI command structure** for user interaction
6. ✅ **Chain-of-thought prompting** for LLM-as-judge reliability

**Ready for implementation**: These samples can be directly integrated into SpecWeave codebase.

---

**Document Status**: ✅ COMPLETE
**For Questions**: See `.specweave/increments/0007-smart-increment-discipline/`
