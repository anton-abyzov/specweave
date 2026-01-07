# Auto Command Implementation Specification

**Version**: 2.0
**Date**: 2026-01-07
**Status**: Draft
**Author**: Ultrathink Analysis

---

## Executive Summary

The `/sw:auto` command is designed for **ultra-long autonomous execution** (days to months) but lacks **mandatory completion conditions** that ensure quality. This specification defines:

1. **Smart project detection** - Auto-detect web/mobile/API/library projects
2. **Mandatory completion conditions** - E2E tests REQUIRED for web apps
3. **Self-healing test execution** - Auto-fix and retry failed tests
4. **Coverage enforcement** - Block completion until thresholds met
5. **Clear stop criteria** - NO ambiguity about when session ends

---

## Core Principle: External Validation Over Self-Assessment

**Ralph Wiggum Pattern**: "I'm helping!" → Keep working until **objective criteria** met, not self-declared completion.

**Key Insight**: Tasks marked `[x]` ≠ Done. Tests passing + coverage met = Done.

---

## 1. Project Type Detection

### 1.1 Detection Algorithm

```typescript
interface ProjectDetection {
  type: ProjectType;
  confidence: number; // 0.0-1.0
  indicators: Indicator[];
  frameworks: Framework[];
  testFrameworks: TestFramework[];
  mandatoryConditions: CompletionCondition[];
}

type ProjectType =
  | 'web-frontend'      // React, Vue, Next.js, Angular
  | 'web-fullstack'     // Next.js with API routes, SvelteKit
  | 'mobile-native'     // React Native, Flutter, Swift, Kotlin
  | 'backend-api'       // Express, FastAPI, NestJS, Go HTTP
  | 'desktop-app'       // Electron, Tauri, Qt
  | 'library'           // npm package, PyPI package, gem
  | 'cli-tool'          // Commander.js, Click, Cobra
  | 'monorepo'          // Nx, Turborepo, Lerna
  | 'generic';          // Unknown/mixed
```

### 1.2 Detection Rules

**Web Frontend** (confidence: high if 3+ indicators):
```typescript
const webFrontendIndicators = [
  { file: 'playwright.config.ts', weight: 0.9 },
  { file: 'cypress.config.ts', weight: 0.9 },
  { file: 'next.config.js', weight: 0.8 },
  { file: 'vite.config.ts', weight: 0.7 },
  { file: 'src/pages/', weight: 0.6 },
  { file: 'src/app/', weight: 0.6 },
  { dependency: 'react', weight: 0.5 },
  { dependency: 'vue', weight: 0.5 },
  { dependency: '@playwright/test', weight: 0.8 },
];

// Confidence = sum(weights) / maxPossible
// Require >= 0.7 for classification
```

**Mobile Native**:
```typescript
const mobileIndicators = [
  { file: '.detoxrc.js', weight: 0.9 },
  { file: 'maestro.yaml', weight: 0.9 },
  { file: 'android/app/', weight: 0.7 },
  { file: 'ios/Podfile', weight: 0.7 },
  { file: 'pubspec.yaml', weight: 0.6 }, // Flutter
  { dependency: 'react-native', weight: 0.8 },
  { dependency: 'detox', weight: 0.8 },
];
```

**Backend API**:
```typescript
const backendIndicators = [
  { file: 'openapi.yaml', weight: 0.9 },
  { file: 'swagger.yaml', weight: 0.9 },
  { file: 'src/routes/', weight: 0.6 },
  { file: 'src/controllers/', weight: 0.6 },
  { dependency: 'express', weight: 0.7 },
  { dependency: 'fastapi', weight: 0.7 },
  { dependency: '@nestjs/core', weight: 0.7 },
  { hasIntegrationTests: true, weight: 0.6 },
];
```

**Library**:
```typescript
const libraryIndicators = [
  { file: 'src/index.ts', weight: 0.5 },
  { file: 'lib/', weight: 0.4 },
  { packageJson: { main: true }, weight: 0.6 },
  { packageJson: { exports: true }, weight: 0.6 },
  { noPages: true, weight: 0.3 },
  { noBuildStep: true, weight: 0.2 },
];
```

### 1.3 Multi-Type Projects

**Monorepo Detection**:
```typescript
if (hasFile('pnpm-workspace.yaml') || hasFile('nx.json')) {
  // Detect each workspace package separately
  const packages = scanWorkspaces();
  return {
    type: 'monorepo',
    subProjects: packages.map(detectProjectType)
  };
}
```

**Fullstack Apps** (Next.js, SvelteKit):
```typescript
if (type === 'web-frontend' && hasAPIRoutes()) {
  return {
    ...detection,
    type: 'web-fullstack',
    mandatoryConditions: [
      ...webFrontendConditions,
      ...backendAPIConditions
    ]
  };
}
```

---

## 2. Mandatory Completion Conditions

### 2.1 Condition Matrix

| Project Type | Build | Unit Tests | Integration Tests | E2E Tests | E2E Coverage | Type Check | Lint |
|--------------|-------|------------|-------------------|-----------|--------------|------------|------|
| **web-frontend** | ✅ | ✅ | - | ✅ **MANDATORY** | ≥70% | ✅ | ⚠️ |
| **web-fullstack** | ✅ | ✅ | ✅ | ✅ **MANDATORY** | ≥70% | ✅ | ⚠️ |
| **mobile-native** | ✅ | ✅ | - | ✅ **MANDATORY** | ≥60% | - | ⚠️ |
| **backend-api** | ✅ | ✅ | ✅ **MANDATORY** | - | - | ✅ | ⚠️ |
| **desktop-app** | ✅ | ✅ | - | ✅ | ≥60% | ✅ | ⚠️ |
| **library** | ✅ | ✅ **MANDATORY** | - | - | - | ✅ | ⚠️ |
| **cli-tool** | ✅ | ✅ | - | ⚠️ | - | ✅ | - |
| **generic** | - | ✅ | - | - | - | - | - |

**Legend**:
- ✅ = Enforced by default
- ✅ **MANDATORY** = Cannot be disabled
- ⚠️ = Optional but recommended
- `-` = Not applicable

### 2.2 Condition Definitions

```typescript
interface CompletionCondition {
  type: ConditionType;
  mandatory: boolean;        // Cannot be skipped
  threshold?: number;        // For coverage conditions (0-100)
  autoHeal?: boolean;        // Auto-fix on failure
  maxRetries?: number;       // For auto-heal (default: 3)
  framework?: string;        // Detected framework
  detectedCommand?: string;  // Auto-detected command
  customCommand?: string;    // User override
}

type ConditionType =
  | 'build'           // Compilation succeeds
  | 'tests'           // Unit + integration tests pass
  | 'e2e'             // End-to-end tests pass
  | 'lint'            // Linting passes
  | 'types'           // Type-checking passes
  | 'coverage'        // Code coverage meets threshold
  | 'e2e-coverage'    // E2E route/viewport coverage
  | 'security'        // Security scan (npm audit, Snyk)
  | 'performance'     // Performance budget met (Lighthouse)
  | 'accessibility'   // A11y audit passes (axe-core)
  | 'command';        // Custom shell command
```

### 2.3 Auto-Heal vs Manual Fix

**Auto-Heal Enabled** (build, lint, types):
```bash
# Loop up to maxRetries (default: 3)
for attempt in 1..3; do
  run_command
  if success; then break; fi

  # Auto-fix via LLM
  analyze_failure
  generate_fix
  apply_fix
done

if still_failing; then
  BLOCK_COMPLETION
  log_failure("Exhausted retries")
fi
```

**Manual Fix** (tests, e2e, coverage):
```bash
run_command
if failure; then
  BLOCK_COMPLETION_IMMEDIATELY
  log_failure("Tests must pass - fix manually")
fi
```

**Rationale**: Tests should NOT be auto-fixed. Failing tests = bugs. LLM should fix THE CODE, not the tests.

---

## 3. E2E Test Enforcement (Critical for Web/Mobile)

### 3.1 Detection Flow

```bash
# 1. Detect E2E framework
if [ -f "playwright.config.ts" ]; then
  E2E_FRAMEWORK="playwright"
  E2E_COMMAND="npx playwright test"
elif [ -f "cypress.config.ts" ]; then
  E2E_FRAMEWORK="cypress"
  E2E_COMMAND="npx cypress run"
elif [ -f ".detoxrc.js" ]; then
  E2E_FRAMEWORK="detox"
  E2E_COMMAND="detox test -c ios.sim.debug"
elif [ -f "maestro.yaml" ]; then
  E2E_FRAMEWORK="maestro"
  E2E_COMMAND="maestro test ."
fi

# 2. If framework detected → E2E is MANDATORY
if [ -n "$E2E_FRAMEWORK" ]; then
  MANDATORY_CONDITIONS+=("e2e")
  MANDATORY_CONDITIONS+=("e2e-coverage:70")
fi
```

### 3.2 E2E Execution Validation

**NOT SUFFICIENT** (current behavior):
```bash
# Weak - just checks for string in transcript
grep -q "playwright test" "$TRANSCRIPT_PATH"
```

**REQUIRED** (new behavior):
```bash
# 1. Run E2E tests
npx playwright test --reporter=json > e2e-results.json 2>&1
EXIT_CODE=$?

# 2. Parse structured output
TESTS_PASSED=$(jq '.suites[].tests[] | select(.status == "passed") | length' e2e-results.json)
TESTS_FAILED=$(jq '.suites[].tests[] | select(.status == "failed") | length' e2e-results.json)

# 3. Validate exit code + results
if [ $EXIT_CODE -ne 0 ] || [ $TESTS_FAILED -gt 0 ]; then
  BLOCK_COMPLETION
  extract_failure_details  # For LLM to fix
fi

# 4. Validate coverage manifest
if [ -f ".e2e-coverage.json" ]; then
  ROUTE_COVERAGE=$(jq '.coverage.routes' .e2e-coverage.json)
  if [ $ROUTE_COVERAGE -lt 70 ]; then
    BLOCK_COMPLETION
    list_untested_routes
  fi
fi
```

### 3.3 E2E Coverage Tracking

**Manifest Generation** (auto-generated on first run):
```json
{
  "framework": "playwright",
  "routes": [
    {
      "path": "/",
      "tested": true,
      "viewports": ["mobile", "desktop"],
      "lastTested": "2026-01-07T12:00:00Z"
    },
    {
      "path": "/login",
      "tested": true,
      "viewports": ["mobile", "desktop"],
      "actions": ["submit", "validation", "redirect"]
    },
    {
      "path": "/dashboard",
      "tested": false,
      "reason": "No test file found"
    }
  ],
  "coverage": {
    "routes": 67,
    "viewports": 83,
    "actions": 75
  },
  "gaps": [
    {
      "type": "untested_route",
      "route": "/dashboard",
      "severity": "high"
    },
    {
      "type": "missing_viewport",
      "route": "/login",
      "viewport": "tablet",
      "severity": "medium"
    }
  ]
}
```

**Update on Test Run** (automatic via Playwright reporter):
```typescript
// playwright.config.ts
import { E2ECoverageReporter } from '@specweave/e2e-coverage';

export default {
  reporter: [
    ['list'],
    ['json', { outputFile: 'e2e-results.json' }],
    [E2ECoverageReporter, { manifestPath: '.e2e-coverage.json' }]
  ]
};
```

---

## 4. Stop Hook Integration

### 4.1 Validation Order

```bash
# stop-auto.sh execution flow
1. Check stop_hook_active flag (prevent loops)
2. Load session from auto-session.json
3. Update heartbeat
4. Detect agent type (orchestrator vs subagent)
5. Check iteration limits (2500 max)
6. Check time limits (600 hours max)
7. **VALIDATE COMPLETION CONDITIONS** ← NEW
8. Check tasks completion
9. Check test execution
10. Decide: approve or block
```

### 4.2 Condition Validation Logic

```bash
# Insert at step 7 in stop-auto.sh
validate_completion_conditions() {
  local session_file="$1"
  local transcript="$2"

  # Check if conditions exist
  local has_conditions=$(jq -r 'has("completionConditions")' "$session_file")
  if [ "$has_conditions" = "false" ]; then
    return 0  # No conditions = pass
  fi

  # Run validation script
  if ! "$SCRIPT_DIR/validate-completion-conditions.sh" "$session_file" "$transcript"; then
    # At least one condition failed
    local failed=$(get_failed_conditions "$session_file")

    block "Completion conditions not met" "⚠️ AUTO MODE BLOCKED - CONDITIONS FAILED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FAILED CONDITIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$failed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIRED ACTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Auto mode will NOT complete until ALL conditions pass.
Fix the failures above and continue with /sw:do"

    return 1
  fi

  return 0
}

# Call in main flow
if ! validate_completion_conditions "$SESSION_FILE" "$TRANSCRIPT_PATH"; then
  exit 0  # Exit hook, block Claude from completing
fi
```

### 4.3 Failed Condition Reporting

```bash
get_failed_conditions() {
  local session_file="$1"
  local conditions=$(jq -r '.completionConditions[]' "$session_file")
  local output=""

  for condition in $conditions; do
    local type=$(echo "$condition" | jq -r '.type')
    local status=$(get_condition_status "$type")

    if [ "$status" = "failed" ]; then
      local details=$(get_failure_details "$type")
      output="${output}❌ ${type^^}: ${details}\n"
    fi
  done

  echo "$output"
}
```

**Example Output**:
```
❌ E2E: Playwright tests failed (3/10 tests failing)
   → tests/auth.spec.ts:45 - Login redirect broken
   → tests/checkout.spec.ts:12 - Payment form validation
   → tests/profile.spec.ts:8 - Avatar upload timeout

❌ E2E-COVERAGE: Route coverage 45% (threshold: 70%)
   Untested routes:
   → /dashboard
   → /settings/billing
   → /admin/users

✅ BUILD: Passed
✅ TESTS: Passed (42/42)
✅ TYPES: Passed
```

---

## 5. Configuration & Overrides

### 5.1 Global Config (`.specweave/config.json`)

```json
{
  "auto": {
    "completionConditions": {
      "enforceDefaults": true,
      "overrideMode": "add-only",
      "defaults": {
        "web-frontend": [
          { "type": "build", "mandatory": true },
          { "type": "tests", "mandatory": true },
          { "type": "e2e", "mandatory": true },
          { "type": "e2e-coverage", "threshold": 70, "mandatory": true },
          { "type": "types", "mandatory": true }
        ],
        "backend-api": [
          { "type": "build", "mandatory": true },
          { "type": "tests", "mandatory": true },
          { "type": "coverage", "threshold": 80, "mandatory": true }
        ]
      },
      "projectType": "auto",
      "customConditions": []
    }
  }
}
```

**Config Fields**:
- `enforceDefaults`: If true, mandatory conditions cannot be removed
- `overrideMode`:
  - `"replace"` - User conditions replace defaults
  - `"add-only"` - User can only add, not remove
  - `"merge"` - Intelligent merge (default)
- `projectType`: `"auto"` (detect) or explicit type
- `customConditions`: Additional user-defined conditions

### 5.2 Increment-Specific Overrides

```json
// .specweave/increments/0001-feature/metadata.json
{
  "increment": "0001-feature",
  "completionConditions": {
    "override": true,
    "conditions": [
      { "type": "build" },
      { "type": "tests" },
      { "type": "e2e", "mandatory": true },
      { "type": "e2e-coverage", "threshold": 90 },
      { "type": "performance", "customCommand": "lighthouse --budget-path=budget.json" }
    ]
  }
}
```

### 5.3 CLI Flag Overrides

```bash
# Explicit conditions (override all defaults)
/sw:auto --conditions "build,tests,e2e,lint"

# Add to defaults
/sw:auto --add-conditions "security,performance"

# Remove non-mandatory conditions
/sw:auto --skip-conditions "lint,types"

# Force skip ALL (dangerous!)
/sw:auto --no-conditions  # Requires confirmation
```

**Precedence** (highest to lowest):
1. CLI flags (`--conditions`)
2. Increment metadata.json
3. Project .specweave/config.json
4. Global ~/.specweave/config.json
5. Smart defaults (project type detection)

---

## 6. Test Execution Loop (Ralph Pattern)

### 6.1 Self-Healing Loop

```bash
execute_with_retry() {
  local condition_type="$1"
  local command="$2"
  local max_retries="${3:-3}"
  local auto_heal="${4:-false}"

  local attempt=0

  while [ $attempt -lt $max_retries ]; do
    attempt=$((attempt + 1))

    echo "Running $condition_type (attempt $attempt/$max_retries)..."

    # Execute command
    set +e
    eval "$command" 2>&1 | tee "${condition_type}-output.log"
    local exit_code=$?
    set -e

    # Success - break loop
    if [ $exit_code -eq 0 ]; then
      echo "✅ $condition_type passed"
      return 0
    fi

    # Failure - check if auto-heal enabled
    if [ "$auto_heal" = "true" ] && [ $attempt -lt $max_retries ]; then
      echo "⚠️ $condition_type failed (attempt $attempt/$max_retries)"
      echo "Analyzing failure and attempting auto-fix..."

      # Extract error details
      local errors=$(parse_errors "${condition_type}-output.log")

      # Ask LLM to fix
      prompt_llm_fix "$condition_type" "$errors"

      # Retry
      continue
    else
      # No auto-heal or exhausted retries
      echo "❌ $condition_type failed after $attempt attempts"
      return 1
    fi
  done

  return 1
}
```

### 6.2 LLM Fix Prompt

```typescript
function prompt_llm_fix(conditionType: string, errors: string): void {
  const systemMessage = `
You are in AUTO MODE self-healing loop.

The ${conditionType} check failed with the following errors:

${errors}

Your task:
1. Analyze the error details
2. Identify the root cause
3. Fix the issue in the codebase
4. DO NOT modify the ${conditionType} configuration
5. After fixing, the check will re-run automatically

You have ${maxRetries - currentAttempt} attempts remaining.
`;

  // Send to Claude via stop hook re-feed
  feedPrompt(systemMessage);
}
```

### 6.3 Error Classification

```typescript
interface TestFailure {
  type: FailureType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: FailureCategory;
  message: string;
  location?: CodeLocation;
  suggestion?: string;
  autoFixable: boolean;
}

type FailureType =
  | 'assertion'         // expect(...).toBe(...) failed
  | 'timeout'           // Test exceeded time limit
  | 'exception'         // Uncaught exception
  | 'network'           // Network/HTTP error
  | 'compilation'       // TypeScript/syntax error
  | 'import'            // Module not found
  | 'env'               // Missing env var
  | 'permission';       // File/process permission

type FailureCategory =
  | 'transient'         // Flaky test, retry
  | 'fixable'           // LLM can fix (assertion, logic)
  | 'structural'        // Requires refactoring
  | 'external'          // Env/config issue
  | 'unfixable';        // Manual intervention required
```

**Example Classification**:
```typescript
const failure = {
  type: 'assertion',
  category: 'fixable',
  message: 'Expected "Welcome" but received "Welcom"',
  location: { file: 'src/components/Header.tsx', line: 45 },
  suggestion: 'Fix typo in Header component',
  autoFixable: true
};
```

---

## 7. Monitoring & Observability

### 7.1 Auto Session Logs

**Structured Logging** (`.specweave/logs/auto-iterations.log`):
```json
{"timestamp":"2026-01-07T12:00:00Z","event":"session_start","sessionId":"auto-xyz","projectType":"web-frontend","conditions":["build","tests","e2e"]}
{"timestamp":"2026-01-07T12:05:00Z","event":"iteration","iteration":1,"task":"T-001","status":"in_progress"}
{"timestamp":"2026-01-07T12:10:00Z","event":"condition_check","type":"build","status":"passed","duration":45000}
{"timestamp":"2026-01-07T12:15:00Z","event":"condition_check","type":"tests","status":"passed","tests":{"passed":42,"failed":0}}
{"timestamp":"2026-01-07T12:20:00Z","event":"condition_check","type":"e2e","status":"failed","tests":{"passed":7,"failed":3}}
{"timestamp":"2026-01-07T12:25:00Z","event":"auto_heal","condition":"e2e","attempt":1,"action":"fixing_test_failures"}
{"timestamp":"2026-01-07T12:30:00Z","event":"condition_check","type":"e2e","status":"passed","tests":{"passed":10,"failed":0}}
{"timestamp":"2026-01-07T12:35:00Z","event":"session_complete","duration":2100000,"iterations":15}
```

### 7.2 Completion Report

**Generated at session end** (`.specweave/logs/auto-{sessionId}-summary.md`):

```markdown
# Auto Session Summary

**Session ID**: auto-2026-01-07-xyz
**Project Type**: web-frontend
**Duration**: 2h 15m
**Status**: ✅ Completed Successfully

## Execution Stats

- **Iterations**: 15 / 2500
- **Tasks Completed**: 12/12
- **Tests Executed**: 52 (42 unit, 10 E2E)
- **Test Failures**: 3 (all auto-healed)

## Completion Conditions

| Condition | Status | Details |
|-----------|--------|---------|
| Build | ✅ Passed | 1 attempt, 45s |
| Tests | ✅ Passed | 42/42 unit tests |
| E2E | ✅ Passed | 10/10 E2E tests (3 failures auto-healed) |
| E2E Coverage | ✅ Passed | 72% route coverage (threshold: 70%) |
| Types | ✅ Passed | 0 type errors |

## Auto-Heal Summary

- **Build failures**: 0
- **Test failures**: 3 (2 retries, all fixed)
- **E2E failures**: 3 (1 retry, all fixed)

## Timeline

1. [12:00] Session started
2. [12:05-12:15] Tasks T-001 to T-003 completed
3. [12:20] E2E tests failed (3 failures)
4. [12:25] Auto-heal: Fixed test failures
5. [12:30] E2E tests passed
6. [12:35] Session completed

## Quality Metrics

- **Code Coverage**: 87%
- **E2E Route Coverage**: 72%
- **Viewport Coverage**: 100% (mobile, tablet, desktop)
- **Test Success Rate**: 94% (52/55 total attempts)

## Recommendations

✅ All quality gates passed
✅ Ready for deployment
⚠️ Consider increasing E2E coverage to 80%
```

### 7.3 Real-Time Status

**CLI Command** (`/sw:auto-status`):
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTO SESSION STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Session ID: auto-2026-01-07-xyz
Project Type: web-frontend
Status: 🟢 RUNNING

Progress:
  Iteration: 15 / 2500
  Elapsed: 2h 15m / 600h
  Current Task: T-009 (Checkout flow)

Completion Conditions:
  ✅ Build (passed)
  ✅ Tests (42/42)
  🔄 E2E (in progress - 7/10 passed)
  ⏸️  E2E Coverage (pending)
  ⏸️  Types (pending)

Recent Activity:
  [12:35] E2E test for login flow passed
  [12:30] Fixed timeout in payment form test
  [12:25] Running E2E tests...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SESSION WILL COMPLETE WHEN:
  • All tasks marked [x] in tasks.md
  • ALL 5 completion conditions pass
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 8. Migration & Rollout Plan

### 8.1 Gradual Rollout

**Phase 1**: Opt-in (v1.0.110)
```bash
# Default behavior unchanged
/sw:auto  # No mandatory conditions

# Opt-in to smart defaults
/sw:auto --smart-defaults

# Or via config
{ "auto": { "completionConditions": { "enforceDefaults": true } } }
```

**Phase 2**: Opt-out (v1.1.0)
```bash
# Default enables smart defaults
/sw:auto  # Auto-detects project type, enforces conditions

# Opt-out (with warning)
/sw:auto --no-smart-defaults
# ⚠️ WARNING: Smart defaults disabled. E2E tests NOT enforced.
```

**Phase 3**: Mandatory (v2.0.0)
```bash
# Smart defaults always enabled
/sw:auto  # Conditions enforced based on project type

# Override only via config
{ "auto": { "completionConditions": { "overrideMode": "replace" } } }
```

### 8.2 Migration Guide

**For existing users**:
```markdown
# Migration to Auto Mode v2.0

## What Changed?

Auto mode now **auto-detects your project type** and enforces quality gates:

- **Web apps**: E2E tests REQUIRED
- **APIs**: Integration tests REQUIRED
- **Libraries**: Unit tests REQUIRED

## Action Required

### 1. Check Project Detection

```bash
specweave detect-project-type
# Output: web-frontend (confidence: 0.92)
```

### 2. Review Default Conditions

```bash
specweave auto --dry-run
# Shows: Build + Tests + E2E + E2E Coverage (70%)
```

### 3. Add Missing Tests (if needed)

If you don't have E2E tests:
```bash
# Install Playwright
npm install -D @playwright/test
npx playwright install

# Generate first test
npx playwright codegen http://localhost:3000
```

### 4. Run Auto Mode

```bash
/sw:auto  # Now with enforced conditions!
```

## Opt-Out (Not Recommended)

To disable smart defaults:
```json
{
  "auto": {
    "completionConditions": {
      "enforceDefaults": false
    }
  }
}
```
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

**Test Coverage**:
- Project type detection (90%+)
- Condition validation logic (95%+)
- Auto-heal retry mechanism (85%+)
- Error classification (90%+)

**Example Test**:
```typescript
describe('ProjectDetector', () => {
  it('detects web-frontend with high confidence', () => {
    const files = [
      'playwright.config.ts',
      'next.config.js',
      'package.json'
    ];

    const result = detectProjectType(files);

    expect(result.type).toBe('web-frontend');
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.mandatoryConditions).toContainEqual(
      expect.objectContaining({ type: 'e2e', mandatory: true })
    );
  });
});
```

### 9.2 Integration Tests

**Scenarios**:
1. Auto mode with web project → E2E enforced
2. Auto mode with API project → Integration tests enforced
3. Auto mode with failing E2E → Auto-heal + retry
4. Auto mode with coverage gap → Block + report

### 9.3 E2E Tests (Dogfooding)

**Use auto mode to build auto mode features!**

```bash
# Meta: Use auto mode to implement completion conditions
/sw:auto --e2e --e2e-cov 70 0200-completion-conditions

# This ensures:
# 1. Implementation has E2E tests
# 2. Coverage meets 70%
# 3. Self-healing works
# 4. We eat our own dog food
```

---

## 10. Success Metrics

### 10.1 Adoption Metrics

**Target (6 months post-launch)**:
- 80% of web projects use smart defaults
- 95% of auto sessions complete with all conditions passing
- <5% opt-out rate

### 10.2 Quality Metrics

**Target**:
- E2E test execution rate: 40% → 95%
- Production bug rate: 20% → <5%
- Incomplete deployments: 60% → <10%

### 10.3 Performance Metrics

**Target**:
- Auto-heal success rate: >80%
- Avg retries per failure: <2
- Session completion time: ±10% (no significant overhead)

---

## 11. Open Questions & Future Work

### 11.1 Open Questions

1. **Confidence threshold**: Should we require 0.7 or 0.8 for project detection?
2. **Override safety**: Allow disabling mandatory conditions? (security concern)
3. **Multi-language support**: Python + JS in same project?
4. **Monorepo handling**: Per-package conditions or global?

### 11.2 Future Enhancements

**v1.2.0**:
- **Performance budgets**: Lighthouse score ≥90
- **Accessibility audits**: Axe-core violations = 0
- **Security scans**: npm audit, Snyk, OWASP
- **Visual regression**: Percy, Chromatic

**v1.3.0**:
- **Adaptive thresholds**: Learn from project history
- **Intelligent test selection**: Run only affected tests
- **Parallel test execution**: Speed up E2E suite

**v2.0.0**:
- **AI-powered test generation**: Auto-create missing E2E tests
- **Smart coverage**: Focus on critical paths
- **Predictive failures**: Warn before tests fail

---

## Conclusion

This specification defines a **complete, production-ready** implementation of smart completion conditions for auto mode:

✅ **Clear stop criteria** - No ambiguity about when sessions end
✅ **Project-aware** - Different rules for web/mobile/API
✅ **Mandatory E2E** - Web apps MUST have E2E tests
✅ **Self-healing** - Auto-fix build/lint failures
✅ **Observable** - Rich logging and reporting
✅ **Configurable** - Override at project/increment level
✅ **Gradual rollout** - Opt-in → Opt-out → Mandatory

**Next Step**: Create increment and implement! 🚀
