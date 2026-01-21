# Stop Conditions Guide: Don't Stop Until Work is Done

**Increment**: 0158-smart-completion-conditions
**Version**: 1.1.0
**Date**: 2026-01-07

## Overview

Auto mode now supports **user-configurable stop conditions** that prevent session completion until specific quality gates are met. This ensures your autonomous sessions don't stop prematurely with incomplete or untested work.

## The Problem This Solves

**Before**: Auto mode would complete when tasks were marked `[x]`, even if:
- Tests hadn't been run
- E2E coverage was 0%
- Build was broken
- Code quality was poor

**After**: Auto mode continues working until YOU decide it's done, based on explicit conditions.

## Quick Start

### Example 1: Don't stop until all tests pass

```bash
/sw:auto --require-tests
```

**What happens**:
- Auto mode runs normally
- When tasks complete, validation runs
- If ANY tests fail → HARD BLOCK, session continues
- Tests must pass before session can complete

### Example 2: Don't stop until E2E tests pass + 70% coverage

```bash
/sw:auto --require-e2e --require-coverage 70
```

**What happens**:
- Auto mode enforces E2E test execution
- Must achieve ≥70% code coverage
- Session CANNOT complete until both conditions met

### Example 3: Don't stop until LLM judge approves

```bash
/sw:auto --require-judge
```

**What happens**:
- When tasks complete, LLM judge reviews the work
- Judge checks: ACs implemented, tests exist, code quality
- If judge REJECTS → session continues with feedback
- Only completes when judge APPROVES

### Example 4: Comprehensive quality gates

```bash
/sw:auto --require-build --require-tests --require-e2e --require-judge
```

**What happens**:
- Build must succeed
- All unit + integration tests must pass
- E2E tests must pass
- LLM judge must approve quality
- Session continues until ALL conditions met

## CLI Flags Reference

| Flag | Description | Example |
|------|-------------|---------|
| `--require-tests` | Don't stop until ALL tests pass (unit + integration) | `--require-tests` |
| `--require-e2e` | Don't stop until E2E tests pass (Playwright/Cypress) | `--require-e2e` |
| `--require-build` | Don't stop until build succeeds | `--require-build` |
| `--require-coverage N` | Don't stop until code coverage ≥N% | `--require-coverage 80` |
| `--require-judge` | Don't stop until LLM judge approves work quality | `--require-judge` |
| `--no-smart-defaults` | Bypass auto-detection, use only explicit flags | `--no-smart-defaults` |

## How It Works

### 1. Session Setup (setup-auto.sh)

When you start auto mode:

```bash
/sw:auto --require-e2e --require-coverage 80
```

The session is configured with completion conditions:

```json
{
  "completionConditions": [
    { "type": "e2e", "mandatory": true },
    { "type": "coverage", "threshold": 80, "mandatory": true }
  ]
}
```

### 2. Normal Execution

Auto mode runs normally:
- Implements features
- Writes tests
- Marks tasks `[x]`

### 3. Completion Attempt

When all tasks are `[x]`, **validation runs BEFORE approval**:

```
🔍 Validating completion conditions...

Condition 1/2: e2e
  🎭 Running E2E tests: npx playwright test
  ✅ E2E tests passed

Condition 2/2: coverage
  📊 Coverage validation (threshold: 80%)
  ❌ Coverage failed
  Code coverage: 65% (required: 80%)

❌ 1 completion condition(s) FAILED:
  • coverage: 65% < 80%
```

### 4. Hard Block

Session **DOES NOT complete**. Instead:

```
❌ COMPLETION CONDITIONS NOT MET

The auto session cannot complete until ALL mandatory conditions pass.

🔧 Next Steps:
  1. Review the failed conditions above
  2. Fix the issues identified
  3. Session will continue automatically

⚠️  This is a HARD BLOCK - mandatory conditions cannot be bypassed.
```

### 5. Auto-Continuation

Auto mode **automatically continues** to fix the issues:
- Adds more tests
- Improves coverage
- Re-runs validation

### 6. Success

When all conditions pass:

```
✅ All 2 completion conditions passed!

✅ AUTO SESSION COMPLETE
   All tasks completed, tests passed, coverage ≥80%
```

## Smart Defaults vs Explicit Flags

### Smart Defaults (Auto-Detected)

By default, SpecWeave detects your project type and applies smart defaults:

**Web Frontend** (Next.js, React, Vue):
```json
{
  "completionConditions": [
    { "type": "build", "mandatory": true },
    { "type": "tests", "mandatory": true },
    { "type": "e2e", "mandatory": true },
    { "type": "e2e-coverage", "threshold": 70, "mandatory": true },
    { "type": "types", "mandatory": true }
  ]
}
```

**Backend API** (Express, NestJS):
```json
{
  "completionConditions": [
    { "type": "build", "mandatory": true },
    { "type": "tests", "mandatory": true },
    { "type": "integration", "mandatory": true },
    { "type": "coverage", "threshold": 80, "mandatory": true }
  ]
}
```

**Library**:
```json
{
  "completionConditions": [
    { "type": "build", "mandatory": true },
    { "type": "tests", "mandatory": true },
    { "type": "coverage", "threshold": 80, "mandatory": true }
  ]
}
```

### Explicit Flags (User Override)

Flags ADD to or OVERRIDE smart defaults:

```bash
# Start with web-frontend defaults, add judge
/sw:auto --require-judge

# Bypass smart defaults, use only explicit conditions
/sw:auto --no-smart-defaults --require-tests --require-coverage 90
```

**Merge behavior**:
- User flags ADD new conditions
- User flags can INCREASE thresholds
- User flags CANNOT remove mandatory conditions
- User flags CANNOT decrease mandatory thresholds

## LLM Judge Integration

### What is LLM Judge?

An AI-powered quality assessment that reviews your work before allowing completion.

### How It Works

1. **Context Gathering**: Collects spec.md, tasks.md, test results, git changes
2. **API Call**: Sends context to Claude API with strict evaluation prompt
3. **Assessment**: Claude evaluates completion, test coverage, code quality
4. **Decision**: Returns APPROVE or REJECT with reasoning

### Evaluation Criteria

✅ **APPROVE if**:
- All ACs marked [x] AND actually implemented
- Tests exist AND pass for critical paths
- Code quality is production-ready
- No half-finished implementations
- Security best practices followed

❌ **REJECT if**:
- ACs marked [x] but not actually implemented (self-deception)
- Missing tests for critical functionality
- Obvious bugs or security vulnerabilities
- Incomplete error handling
- Poor code quality

### Example Judge Output

```
🤖 LLM JUDGE ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Decision: reject (confidence: 0.85)
Reasoning: While all ACs are marked complete, the authentication
flow lacks proper error handling for expired tokens. E2E tests
only cover the happy path. Production deployment would likely
fail under edge cases.

❌ CONCERNS:
- Missing error handling for expired JWT tokens
- E2E tests don't cover logout failure scenarios
- No rate limiting on login endpoint (security risk)

The LLM judge has REJECTED this work as not production-ready.
Address the concerns above and try again.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Setup Requirements

1. **API Key**: Set `ANTHROPIC_API_KEY` environment variable
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-..."
   ```

2. **Enable in auto**:
   ```bash
   /sw:auto --require-judge
   ```

3. **Optional**: Skip if API key missing (degrades gracefully)

## Common Patterns

### Pattern 1: MVP Development

**Goal**: Ship fast but ensure basics work

```bash
/sw:auto --require-tests --require-e2e
```

- Minimum: Tests + E2E must pass
- Skips: Coverage thresholds, judge
- Use case: Rapid prototyping

### Pattern 2: Production-Grade

**Goal**: Production-ready quality

```bash
/sw:auto --require-build --require-tests --require-e2e --require-coverage 80 --require-judge
```

- All quality gates enforced
- LLM judge final approval
- Use case: Critical features, production deployments

### Pattern 3: Library Publishing

**Goal**: High-quality reusable code

```bash
/sw:auto --require-tests --require-coverage 90 --require-judge
```

- High test coverage (90%)
- Judge ensures API design quality
- Use case: npm packages, shared libraries

### Pattern 4: Bug Fixes

**Goal**: Fix works, doesn't break existing

```bash
/sw:auto --require-tests
```

- Simpler validation
- Focus on regression prevention
- Use case: Hotfixes, small bug fixes

### Pattern 5: Zero-Configuration (Smart Defaults)

**Goal**: Let SpecWeave decide

```bash
/sw:auto
```

- Auto-detects project type
- Applies appropriate defaults
- Use case: Standard projects, trust the defaults

## Troubleshooting

### Issue: "All tests pass but validation fails"

**Cause**: Validation script can't find test command

**Fix**: Ensure test framework is configured:
```json
// package.json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

### Issue: "Coverage validation says 0%"

**Cause**: No coverage report generated

**Fix**: Configure coverage in test framework:
```typescript
// vitest.config.ts
export default {
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary']
    }
  }
}
```

### Issue: "LLM judge always skips"

**Cause**: `ANTHROPIC_API_KEY` not set

**Fix**:
```bash
# Add to .env
ANTHROPIC_API_KEY=sk-ant-...

# Or export in shell
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Issue: "Session blocks forever on failed condition"

**Expected behavior**: Session should continue and attempt to fix

**If stuck**:
1. Check `.specweave/logs/auto-iterations.log` for errors
2. Run `/sw:auto-status` to see current state
3. Run `/sw:cancel-auto` to emergency stop
4. File issue with logs

## Best Practices

### 1. Start Strict, Relax if Needed

```bash
# Start with comprehensive gates
/sw:auto --require-judge --require-coverage 80

# If too slow, relax:
/sw:auto --require-tests
```

### 2. Use Judge for Critical Work

```bash
# Critical feature
/sw:auto --require-judge 0001-authentication

# Minor tweak
/sw:auto 0002-button-color
```

### 3. Combine with TDD Mode

```bash
# Maximum quality enforcement
/sw:auto --tdd --require-judge
```

- `--tdd`: Tests MUST pass at every iteration
- `--require-judge`: Final quality gate

### 4. Document Your Standards

Create project-specific defaults in `.specweave/config.json`:

```json
{
  "auto": {
    "defaultConditions": [
      { "type": "tests", "mandatory": true },
      { "type": "coverage", "threshold": 80, "mandatory": true }
    ]
  }
}
```

## Migration from v1.0

### Before (v1.0)

```bash
# No stop conditions - session completes when tasks done
/sw:auto

# Manual validation required
/sw:validate
```

### After (v1.1)

```bash
# Auto-detected stop conditions
/sw:auto

# Or explicit conditions
/sw:auto --require-e2e --require-judge
```

**Breaking changes**: None (backward compatible)

**New capabilities**:
- Automatic validation before completion
- User-configurable stop conditions
- LLM judge integration
- Hard blocks on quality failures

## FAQ

### Q: Can I bypass mandatory conditions?

**A**: No. Mandatory conditions are enforced and cannot be removed via `--skip-gates`. This is intentional for quality assurance.

### Q: What happens if validation fails 100 times?

**A**: Session will continue attempting to fix issues up to `maxIterations` (default: 2500). Use `/sw:cancel-auto` to emergency stop.

### Q: Does LLM judge cost money?

**A**: Yes, uses Claude API (~$0.01-0.05 per assessment). Set `ANTHROPIC_API_KEY` to enable. Skips gracefully if key missing.

### Q: Can I add custom validation logic?

**A**: Yes! Edit `validate-completion-conditions.sh` to add custom checks. Contributions welcome.

### Q: Do stop conditions work with multi-repo setups?

**A**: Yes. Validation runs in project root, detects all test frameworks across repos.

## Summary

Stop conditions transform auto mode from **task completion** to **outcome achievement**:

| Aspect | Before | After |
|--------|--------|-------|
| **Completion** | Tasks marked `[x]` | Quality gates met |
| **Testing** | Optional | Mandatory (configurable) |
| **Quality** | Self-assessment | Objective validation + LLM judge |
| **Safety** | Manual verification | Automated enforcement |
| **Control** | All-or-nothing | Granular per-condition |

**Recommended for all production deployments.**
