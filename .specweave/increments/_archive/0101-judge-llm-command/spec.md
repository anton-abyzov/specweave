---
increment: 0101-judge-llm-command
title: "Judge LLM Command - Ad-hoc Work Validation"
priority: P2
status: completed
created: 2025-12-03
type: feature
dependencies: []
structure: user-stories
tech_stack:
  detected_from: "package.json"
  language: "typescript"
  framework: "nodejs-cli"
  testing: "vitest"
---

# Judge LLM Command - Ad-hoc Work Validation

## Problem Statement

Users completing ad-hoc work (not within SpecWeave increments) have no quick way to validate their work using LLM-as-Judge pattern. The current `/specweave:qa` command is **increment-bound** and cannot assess arbitrary file changes or work outside the increment system.

**Current Gap:**
- `/specweave:qa` requires an increment ID
- `/specweave-core:code-review` is prompt-based (not judge LLM pattern)
- No command for "validate this work I just did" on arbitrary files
- Users resort to verbose "ultrathink to validate..." requests

## Solution Overview

Introduce `/specweave:judge` command that uses LLM-as-Judge pattern to validate any completed work:
- Works on specific files, git diffs, or staged changes
- Uses extended thinking or chain-of-thought for deep reasoning
- Returns verdict with detailed reasoning chain
- Independent of increment system

## User Stories

### US-001: Basic File Validation

**As a** developer
**I want to** validate specific files using judge LLM
**So that** I can get AI-powered verification of my work without creating an increment

**Acceptance Criteria:**
- [x] **AC-US1-01**: Command accepts file paths: `/specweave:judge src/file.ts`
- [x] **AC-US1-02**: Command validates multiple files: `/specweave:judge src/*.ts`
- [x] **AC-US1-03**: Returns verdict: APPROVED | CONCERNS | REJECTED
- [x] **AC-US1-04**: Includes confidence score (0.0-1.0)
- [x] **AC-US1-05**: Provides detailed reasoning chain

### US-002: Git-Aware Validation

**As a** developer
**I want to** validate my git changes using judge LLM
**So that** I can verify staged or committed changes before pushing

**Acceptance Criteria:**
- [x] **AC-US2-01**: `--staged` flag validates staged git changes
- [x] **AC-US2-02**: `--last-commit` validates most recent commit
- [x] **AC-US2-03**: `--diff <branch>` validates diff against branch
- [x] **AC-US2-04**: Shows which files are being validated
- [x] **AC-US2-05**: Graceful handling when no git repo present

### US-003: Validation Modes

**As a** developer
**I want** different validation depths
**So that** I can balance thoroughness vs speed/cost

**Acceptance Criteria:**
- [x] **AC-US3-01**: `--quick` mode for fast validation (~10 seconds)
- [x] **AC-US3-02**: `--deep` mode uses extended thinking (default for Opus)
- [x] **AC-US3-03**: `--strict` mode fails on any concern
- [x] **AC-US3-04**: Default mode auto-selects based on model capability

### US-004: Issue Reporting

**As a** developer
**I want** clear issue reporting
**So that** I know exactly what to fix

**Acceptance Criteria:**
- [x] **AC-US4-01**: Issues categorized: CRITICAL | HIGH | MEDIUM | LOW
- [x] **AC-US4-02**: Each issue includes: title, description, location, suggestion
- [x] **AC-US4-03**: `--fix` flag suggests specific code fixes
- [x] **AC-US4-04**: Issues can be exported to markdown report

### US-005: Slash Command Implementation

**As a** user
**I want** `/specweave:judge` as a slash command
**So that** I can invoke it easily from Claude Code

**Acceptance Criteria:**
- [x] **AC-US5-01**: Command registered in `plugins/specweave/commands/`
- [x] **AC-US5-02**: Command provides usage help when invoked without args
- [x] **AC-US5-03**: Command handles errors gracefully with clear messages

## Functional Requirements

### FR-001: Judge LLM Pattern
- Use chain-of-thought prompting for reasoning
- Structure: Read → Analyze → Evaluate → Verdict
- Support extended thinking when available (Opus model)

### FR-002: Input Sources
- Specific file paths
- Glob patterns (*.ts, src/**/*.js)
- Git staged changes
- Git commit(s)
- Git diff between branches

### FR-003: Output Format
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JUDGE VERDICT: <APPROVED | CONCERNS | REJECTED>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Confidence: 0.XX
Files Analyzed: N

REASONING:
<Chain-of-thought explanation>

ISSUES (if any):
🔴 CRITICAL: <title>
   <description>
   📍 <location>
   💡 <suggestion>

🟡 CONCERN: <title>
   ...

VERDICT: <summary>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### FR-004: Evaluation Criteria
The judge evaluates:
1. **Correctness**: Does the code do what it's supposed to?
2. **Completeness**: Are all edge cases handled?
3. **Security**: Any security vulnerabilities?
4. **Performance**: Any obvious performance issues?
5. **Maintainability**: Is the code clean and maintainable?

## Non-Functional Requirements

### NFR-001: Performance
- Quick mode: < 15 seconds
- Default mode: < 30 seconds
- Deep mode: < 60 seconds

### NFR-002: Cost Efficiency
- Quick mode: ~$0.02-0.05
- Default mode: ~$0.05-0.10
- Deep mode: ~$0.10-0.20

### NFR-003: Accuracy
- False positive rate < 10%
- Critical issues detection rate > 95%

## Out of Scope

- ❌ Full test execution (use test runners for that)
- ❌ Continuous monitoring (one-time validation)
- ❌ Auto-fix application (only suggestions)
- ❌ Integration with CI/CD (manual invocation only)

## Success Criteria

1. ✅ Command works on any file set
2. ✅ Verdict is actionable (clear pass/fail with reasoning)
3. ✅ Performance targets met
4. ✅ Cost per invocation reasonable
5. ✅ No crashes during validation

## Differentiation from Existing Commands

| Aspect | `/specweave:qa` | `/specweave:judge` |
|--------|-----------------|-------------------|
| **Scope** | Increments only | Any files |
| **Input** | Increment ID | Files, git diff |
| **Pattern** | 7-dimension scoring | Judge LLM reasoning |
| **Focus** | Spec quality | Work correctness |
| **Output** | PASS/CONCERNS/FAIL + scores | Verdict + reasoning chain |

## Related

- ADR: To be created (0178-judge-llm-pattern)
- Skill: `increment-quality-judge-v2` (similar pattern, increment-bound)
- Agent: `ado-sync-judge` (uses judge pattern for sync validation)
