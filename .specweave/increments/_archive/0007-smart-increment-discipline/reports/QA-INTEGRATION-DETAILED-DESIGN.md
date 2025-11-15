# QA System Integration - Detailed Design

**Created**: 2025-01-04
**Increment**: 0007-smart-increment-discipline
**Related**: QA-COMMAND-COMPREHENSIVE-DESIGN.md
**Status**: Integration Specification

---

## Overview

This document specifies **HOW** the new @qa command system integrates with SpecWeave's existing quality infrastructure (rule-based validation, PM gates, test-aware planning, living docs sync, etc.).

---

## Table of Contents

1. [Integration Points](#integration-points)
2. [Integration with Rule-Based Validation](#integration-with-rule-based-validation)
3. [Integration with PM Gates](#integration-with-pm-gates)
4. [Integration with Test-Aware Planning](#integration-with-test-aware-planning)
5. [Integration with Living Docs Sync](#integration-with-living-docs-sync)
6. [Integration with CI/CD](#integration-with-cicd)
7. [Configuration](#configuration)
8. [Migration Strategy](#migration-strategy)

---

## Integration Points

### Existing Quality Systems (6 Major)

1. **Rule-Based Validation** → `/specweave:validate`
2. **AI Quality Judge** → `increment-quality-judge` skill
3. **Test-Aware Planning** → `test-aware-planner` agent
4. **Test Coverage Validation** → `/specweave:validate-coverage`
5. **PM Gates** → `/specweave:done`
6. **Living Completion Reports** → `COMPLETION-REPORT.md`

### New @qa Command (3 Modes)

1. **Quick Mode** → `/qa {id}` (single agent, 2-3 min)
2. **Full Mode** → `/qa {id} --full` (orchestrator + 6 subagents, 5-10 min)
3. **Gate Mode** → `/qa {id} --gate` (comprehensive check before `/specweave:done`)

### Integration Matrix

| Existing System | Integration Point | Trigger | Impact |
|----------------|-------------------|---------|--------|
| Rule-Based Validation | Always run first | `/qa` invocation | Blocks if failed |
| AI Quality Judge | Replaced/Enhanced | `/qa` invocation | Extended with risk assessment |
| Test-Aware Planning | Pre-check | `/specweave:inc` completion | Catch issues early |
| Test Coverage Validation | Parallel check | `/qa --full` | Enhanced reporting |
| PM Gates | Automatic QA gate | `/specweave:done` | Blocks if FAIL |
| Living Docs Sync | Quick QA check | Post-task hook | Detect regressions |

---

## Integration with Rule-Based Validation

### Current Behavior

```bash
/specweave:validate 0001

# Runs 120 rule-based checks:
# - Consistency (47 rules)
# - Completeness (23 rules)
# - Quality (31 rules)
# - Traceability (19 rules)

# Output:
# ✅ PASSED (120/120) or ❌ FAILED (95/120)
```

### New Behavior with @qa

```bash
/qa 0001

# Step 1: Rule-based validation (120 checks) - MANDATORY
# ├── If FAILED → Stop, show errors, exit
# └── If PASSED → Continue to Step 2

# Step 2: AI Quality Assessment (optional)
# ├── Quick mode: Single agent (spec quality + risk)
# └── Full mode: Orchestrator + 6 subagents
```

**Code Integration**:

```typescript
// File: src/cli/commands/qa.ts

async function runQA(incrementId: string, options: QAOptions): Promise<void> {
  // Step 1: ALWAYS run rule-based validation first
  console.log('🔍 Running rule-based validation (120 checks)...\n');

  const ruleBasedResult = await runRuleBasedValidation(incrementId);

  if (!ruleBasedResult.passed) {
    // FAIL FAST - Don't run AI checks if structure is broken
    console.error('❌ RULE-BASED VALIDATION: FAILED');
    console.error(`   ${ruleBasedResult.failedCount}/${ruleBasedResult.totalCount} checks failed\n`);

    // Show detailed errors
    displayRuleBasedErrors(ruleBasedResult.errors);

    console.log('\n💡 Fix structural issues before running AI quality checks.');
    process.exit(1);
  }

  console.log('✅ RULE-BASED VALIDATION: PASSED (120/120)\n');

  // Step 2: AI Quality Assessment (conditional)
  if (options.aiQuality !== false) {
    if (options.full) {
      await runFullQA(incrementId, ruleBasedResult);
    } else {
      await runQuickQA(incrementId, ruleBasedResult);
    }
  } else {
    console.log('⏭️  Skipping AI quality checks (--no-ai flag provided)\n');
  }
}
```

**Why Rule-Based First?**

1. ✅ **Fast** - No API calls, instant feedback
2. ✅ **Free** - No token cost
3. ✅ **Catches structural issues** - Missing files, malformed YAML, broken links
4. ✅ **Fail fast** - Don't waste tokens on fundamentally broken specs

---

## Integration with PM Gates

### Current Behavior (`/specweave:done`)

```bash
/specweave:done 0001

# Current checks (v0.7.0):
# 1. ✅ All tasks completed?
# 2. ✅ Completion report exists?
# 3. ✅ Living docs synced?

# If all pass → Mark increment as complete
# If any fail → Show blockers, exit
```

### New Behavior with @qa Integration

```bash
/specweave:done 0001

# Enhanced checks (v0.8.0+):
# 1. ✅ All tasks completed? (existing)
# 2. ✅ Completion report exists? (existing)
# 3. ✅ Living docs synced? (existing)
# 4. 🆕 Quality gate passed? (NEW!)
#    → Automatically run: /qa 0001 --gate
#    → Check result: PASS/CONCERNS/FAIL

# Gate decision:
# - PASS → Proceed with completion
# - CONCERNS → Warn user, allow override
# - FAIL → Block completion, show blockers
```

**Code Integration**:

```typescript
// File: src/cli/commands/done.ts

async function closeIncrement(incrementId: string, options: DoneOptions): Promise<void> {
  // Existing checks (v0.7.0)
  const allTasksComplete = await checkAllTasksComplete(incrementId);
  const completionReportExists = await checkCompletionReport(incrementId);
  const livingDocsSynced = await checkLivingDocsSync(incrementId);

  // NEW: Quality gate check (v0.8.0+)
  console.log('\n🔍 Running quality gate check...\n');

  const qualityGateResult = await runQualityGate(incrementId);

  if (qualityGateResult.decision === 'FAIL') {
    console.error('❌ QUALITY GATE: FAIL\n');
    console.error('Blockers found (MUST fix before closing):\n');

    for (const blocker of qualityGateResult.blockers) {
      console.error(`  🔴 ${blocker.title}`);
      console.error(`     ${blocker.description}`);
      console.error(`     Mitigation: ${blocker.mitigation}\n`);
    }

    console.log('💡 Fix blockers and rerun: /specweave:done 0001\n');

    if (!options.force) {
      process.exit(1);
    } else {
      console.warn('⚠️  --force flag provided, skipping quality gate (DANGEROUS!)\n');
    }
  }

  if (qualityGateResult.decision === 'CONCERNS') {
    console.warn('🟡 QUALITY GATE: CONCERNS\n');
    console.warn('Issues found (SHOULD fix):\n');

    for (const concern of qualityGateResult.concerns) {
      console.warn(`  🟡 ${concern.title}`);
      console.warn(`     ${concern.description}\n`);
    }

    // Prompt user
    const shouldProceed = await promptUser(
      'Proceed with closing increment despite concerns?',
      ['Yes', 'No (fix concerns first)']
    );

    if (shouldProceed === 'No') {
      console.log('\n💡 Fix concerns and rerun: /specweave:done 0001\n');
      process.exit(0);
    }
  }

  if (qualityGateResult.decision === 'PASS') {
    console.log('✅ QUALITY GATE: PASS\n');
  }

  // Proceed with closing increment
  await markIncrementComplete(incrementId);
  console.log('✅ Increment 0001 marked as complete\n');
}

async function runQualityGate(incrementId: string): Promise<QualityGateResult> {
  // Run comprehensive QA check
  return await runQA(incrementId, { gate: true, full: true });
}
```

**Configuration** (`.specweave/config.json`):

```json
{
  "qa": {
    "enableAutoQAGate": true,
    "autoQAGateMode": "full",
    "blockOnFail": true,
    "warnOnConcerns": true
  }
}
```

**Opt-Out Option**:

```bash
# Skip quality gate (not recommended)
/specweave:done 0001 --skip-qa

# Force complete despite failures (dangerous!)
/specweave:done 0001 --force
```

---

## Integration with Test-Aware Planning

### Current Behavior (`/specweave:inc`)

```bash
/specweave:inc "Add user authentication"

# Workflow (v0.7.0):
# 1. PM agent generates spec.md (user stories, AC-IDs)
# 2. Architect agent generates plan.md (architecture, test strategy)
# 3. test-aware-planner generates tasks.md (BDD tests embedded)
# 4. Save to .specweave/increments/0008-user-authentication/
```

### New Behavior with Pre-Implementation QA

```bash
/specweave:inc "Add user authentication"

# Enhanced workflow (v0.8.0+):
# 1. PM agent generates spec.md
# 2. Architect agent generates plan.md
# 3. test-aware-planner generates tasks.md
# 4. 🆕 PRE-IMPLEMENTATION QA CHECK (NEW!)
#    → Run: /qa 0008 --pre
#    → Checks: Spec quality, risk assessment, test strategy
#    → Gate decision: PASS/CONCERNS/FAIL
# 5. If PASS → Proceed to /specweave:do
#    If CONCERNS → Warn, allow proceed
#    If FAIL → Block, show issues
```

**Code Integration**:

```typescript
// File: plugins/specweave/skills/increment-planner/SKILL.md

## STEP 5: Pre-Implementation QA Check (🆕 NEW v0.8.0)

**MANDATORY**: After generating spec.md, plan.md, and tasks.md, run pre-implementation QA:

Task(
  subagent_type: "qa-orchestrator",
  description: "Pre-implementation QA check",
  prompt: "Run pre-implementation QA for increment 0008-user-authentication

  Check:
  1. Spec quality (clarity, testability, completeness)
  2. Risk assessment (identify issues early)
  3. Architecture soundness (plan.md)
  4. Test strategy (tasks.md test plans)

  Files to check:
  - .specweave/increments/0008-user-authentication/spec.md
  - .specweave/increments/0008-user-authentication/plan.md
  - .specweave/increments/0008-user-authentication/tasks.md

  Return: Quality gate decision (PASS/CONCERNS/FAIL) with detailed report"
)

Wait for QA result...

If QA result = FAIL:
  → Show blockers
  → Update spec.md/plan.md/tasks.md to fix issues
  → Rerun QA check
  → Loop until PASS or CONCERNS

If QA result = CONCERNS:
  → Show concerns
  → Prompt user: "Proceed with concerns or fix first?"
  → If user chooses proceed → Continue
  → If user chooses fix → Update files, rerun QA

If QA result = PASS:
  → Continue to final message
```

**Benefits**:

1. ✅ **Catch issues early** - Before implementation starts
2. ✅ **Save time** - Don't implement flawed specs
3. ✅ **Reduce rework** - Fix design issues upfront
4. ✅ **Higher quality** - Start with solid foundation

---

## Integration with Living Docs Sync

### Current Behavior (Post-Task Completion Hook)

```bash
# After task completion (TodoWrite detects all tasks done):
# .claude/hooks/post-task-completion.sh fires

# Current actions (v0.7.0):
# 1. Detect session ending (15s inactivity)
# 2. Play completion sound
# 3. Log hook execution
```

### New Behavior with Quick QA Check

```bash
# Enhanced post-task-completion hook (v0.8.0+):
# 1. Detect session ending (15s inactivity)
# 2. 🆕 Run quick QA check (NEW!)
#    → /qa {current_increment} --quick
#    → Check: Spec ↔ implementation consistency
#    → Detect quality regressions early
# 3. Play completion sound
# 4. Log results
```

**Code Integration**:

```bash
# File: .claude/hooks/post-task-completion.sh

#!/bin/bash

# ... existing inactivity detection logic ...

if [[ $session_ending == true ]]; then
  echo "📊 Running quick QA check..." >> "$LOG_FILE"

  # Get current increment
  CURRENT_INCREMENT=$(get_current_increment)

  if [[ -n "$CURRENT_INCREMENT" ]]; then
    # Run quick QA (non-blocking, background)
    specweave qa "$CURRENT_INCREMENT" --quick --silent >> "$LOG_FILE" 2>&1 &

    # Store PID for later checking
    echo $! > "$SPECWEAVE_DIR/logs/qa-check.pid"
  fi

  # Play completion sound
  play_completion_sound
fi
```

**Quick QA Mode Optimizations**:

1. ✅ **Fast** - Single agent, ~2-3 min
2. ✅ **Lightweight** - ~3K tokens (~$0.03)
3. ✅ **Non-blocking** - Runs in background
4. ✅ **Silent** - No user prompts

**Output Example**:

```bash
# If QA finds issues:
📊 Quick QA Check: 🟡 CONCERNS

Issues detected:
  • Spec ↔ code mismatch: AC-US1-03 not implemented
  • Test coverage dropped to 72% (was 85%)

View details: cat .specweave/logs/qa-quick-0008.log
Rerun full QA: /qa 0008 --full
```

---

## Integration with CI/CD

### GitHub Actions Integration

**File**: `.github/workflows/specweave-qa.yml`

```yaml
name: SpecWeave QA

on:
  pull_request:
    paths:
      - '.specweave/increments/**'
  push:
    branches:
      - main
      - develop

jobs:
  qa-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install SpecWeave
        run: npm install -g specweave

      - name: Run QA Gate
        run: |
          # Find modified increments
          INCREMENTS=$(git diff --name-only ${{ github.event.before }} ${{ github.sha }} | \
            grep '.specweave/increments' | \
            cut -d'/' -f3 | \
            sort -u)

          # Run QA on each modified increment
          for increment in $INCREMENTS; do
            echo "Running QA on $increment..."
            specweave qa $increment --gate --ci
          done
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Upload QA Reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: qa-reports
          path: .specweave/logs/qa-*.json
```

**CI-Specific Flags**:

```bash
/qa 0001 --ci
```

**CI Mode Behavior**:
- ✅ Exit code 1 if FAIL (blocks merge)
- ✅ Exit code 0 if PASS or CONCERNS (allows merge)
- ✅ JSON output for parsing
- ✅ No interactive prompts
- ✅ Structured logging

---

## Configuration

### Global Configuration (`.specweave/config.json`)

```json
{
  "qa": {
    // Auto-run settings
    "enableAutoQAGate": true,
    "autoQAGateOnDone": true,
    "autoQACheckOnHook": true,

    // Mode settings
    "defaultMode": "quick",
    "fullModeThreshold": "always",

    // Quality gate thresholds (BMAD pattern)
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

    // Subagent configuration
    "subagents": {
      "specQuality": { "enabled": true, "weight": 0.25 },
      "riskAssessment": { "enabled": true, "weight": 0.25 },
      "testCoverage": { "enabled": true, "weight": 0.20 },
      "codeReview": { "enabled": true, "weight": 0.15 },
      "securityAudit": { "enabled": true, "weight": 0.10 },
      "performanceReview": { "enabled": true, "weight": 0.05 }
    },

    // Cost optimization
    "costOptimization": {
      "cacheResults": true,
      "cacheDuration": 300,
      "skipUnchangedFiles": true
    },

    // Integration settings
    "integrations": {
      "cicd": {
        "enabled": true,
        "exitOnFail": true,
        "jsonOutput": true
      },
      "hooks": {
        "postTaskCompletion": true,
        "preDone": true,
        "postInc": true
      }
    }
  }
}
```

### Per-Increment Configuration (Optional)

**File**: `.specweave/increments/0008-user-authentication/.qa-config.json`

```json
{
  "overrides": {
    "qualityGateThresholds": {
      "fail": {
        "testCoverage": 90,
        "riskScore": 7.0
      }
    }
  },
  "customChecks": [
    {
      "name": "HIPAA Compliance",
      "description": "Verify PHI encryption at rest and in transit",
      "severity": "critical"
    }
  ]
}
```

---

## Migration Strategy

### Phase 1: Soft Launch (v0.8.0)

**Goal**: Introduce @qa command without breaking existing workflows

**Approach**:
1. ✅ New `/qa` command available (opt-in)
2. ✅ Existing commands unchanged (`/specweave:validate`, `/specweave:done`)
3. ✅ No automatic QA checks (users must explicitly call `/qa`)
4. ✅ Backward compatible (all existing features work)

**User Experience**:

```bash
# Old way (still works)
/specweave:validate 0001

# New way (opt-in)
/qa 0001
```

---

### Phase 2: Gradual Integration (v0.8.1)

**Goal**: Add automatic QA checks with opt-out

**Approach**:
1. ✅ Enable auto-QA-gate on `/specweave:done` (default: on, can opt-out)
2. ✅ Enable quick QA on post-task hook (default: on, can opt-out)
3. ✅ Show migration notices

**User Experience**:

```bash
# /specweave:done now includes QA gate
/specweave:done 0001

# Output:
# ✅ All tasks completed
# ✅ Completion report exists
# 🔍 Running quality gate check... (NEW!)
# ✅ Quality gate: PASS
# ✅ Increment closed

# Opt-out:
/specweave:done 0001 --skip-qa
```

**Migration Notice**:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📢 NEW IN v0.8.1: Automatic Quality Gates
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SpecWeave now runs automatic quality checks before closing increments.

Benefits:
  ✅ Catch issues before they reach production
  ✅ Consistent quality standards across all increments
  ✅ Risk assessment (BMAD pattern)
  ✅ Security audit (OWASP Top 10)

To opt-out: Add to .specweave/config.json:
  "qa": { "enableAutoQAGate": false }

To skip once: /specweave:done 0001 --skip-qa

Learn more: https://spec-weave.com/docs/qa-system
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Phase 3: Full Integration (v0.9.0)

**Goal**: Make QA an integral part of SpecWeave workflow

**Approach**:
1. ✅ Auto-QA-gate is default (most users keep it on)
2. ✅ Pre-implementation QA on `/specweave:inc` (can opt-out)
3. ✅ Quick QA on hooks (can opt-out)
4. ✅ CI/CD templates include QA checks

**User Experience**:

```bash
# Default workflow now includes QA at every stage:

/specweave:inc "feature"
# → PM generates spec
# → Architect generates plan
# → test-aware-planner generates tasks
# → 🆕 Pre-implementation QA (automatic)
# → Ready for /specweave:do

/specweave:do
# → Implement tasks
# → After each task completion → 🆕 Quick QA (hook)

/specweave:done
# → All tasks complete
# → 🆕 Final QA gate (automatic)
# → Close increment
```

---

## Rollback Plan

### If QA System Causes Issues

**Config Flag** (`.specweave/config.json`):

```json
{
  "qa": {
    "enableAutoQAGate": false,
    "autoQACheckOnHook": false,
    "autoQAPreImplementation": false
  }
}
```

**Emergency Disable** (environment variable):

```bash
export SPECWEAVE_DISABLE_AUTO_QA=true
```

**Graceful Degradation**:
- ✅ If QA subagent fails → Log error, continue without QA
- ✅ If API rate limit → Show warning, skip AI checks
- ✅ If no API key → Skip AI checks, run rule-based only

---

## Monitoring & Observability

### QA Execution Logs

**File**: `.specweave/logs/qa-execution.log`

```json
{
  "timestamp": "2025-01-04T10:30:00Z",
  "increment_id": "0008",
  "mode": "full",
  "duration_seconds": 127,
  "token_usage": 12450,
  "cost_usd": 0.12,
  "result": {
    "rule_based": { "passed": true, "checks": 120 },
    "spec_quality": { "score": 87, "issues": 2 },
    "risk_assessment": { "score": 4.2, "risks": 3 },
    "test_coverage": { "percentage": 85, "gaps": 1 },
    "quality_gate": "PASS"
  }
}
```

### Metrics Dashboard (Future)

```bash
/qa stats

# Output:
QA Statistics (Last 30 Days)

Total QA Runs: 47
  • Quick mode: 32 (68%)
  • Full mode: 15 (32%)

Quality Gate Results:
  • PASS: 38 (81%)
  • CONCERNS: 7 (15%)
  • FAIL: 2 (4%)

Average Scores:
  • Spec quality: 84/100
  • Test coverage: 87%
  • Risk score: 3.8/10 (LOW-MEDIUM)

Total Cost: $5.64 (~$0.12 per assessment)
Total Time Saved: ~23 hours (by catching issues early)
```

---

## Summary

This integration design ensures that the new @qa command system:

1. ✅ **Builds on existing foundation** - Extends rule-based validation, doesn't replace it
2. ✅ **Non-disruptive** - Opt-in initially, gradual rollout
3. ✅ **Automatic quality gates** - Integrated into key workflow points
4. ✅ **Configurable** - Teams can customize thresholds and behavior
5. ✅ **Fail-safe** - Graceful degradation if issues occur
6. ✅ **Observable** - Comprehensive logging and metrics

**Next Steps**: Proceed with Phase 1 implementation (soft launch with opt-in QA command)

---

**Document Status**: ✅ COMPLETE
**For Questions**: See `.specweave/increments/0007-smart-increment-discipline/`
