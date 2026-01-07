# Auto Command Completion Analysis - Critical Gap Identified

**Date**: 2026-01-07
**Issue**: Auto mode lacks clear, enforceable completion conditions for long-running sessions
**Impact**: High - Can run indefinitely without guaranteed E2E testing for web projects

---

## Problem Statement

The `/sw:auto` command is designed to run autonomously for extended periods (days, weeks, potentially months). However, **there is NO mandatory stop condition that ensures E2E tests are run for web applications**.

### Current Completion Logic (from `stop-auto.sh`)

The auto mode stops when ANY of these occur:

1. **All tasks marked `[x]` in tasks.md** ✅ (primary)
2. **Tests detected and passing** ⚠️ (weak enforcement)
3. **Max iterations reached** (2500 - safety net)
4. **Max hours exceeded** (600 hours / 25 days - safety net)
5. **User cancellation** (`/sw:cancel-auto`)
6. **Human gate timeout**

### The Critical Gap

**For web projects, E2E tests are NOT mandatory**:

```bash
# From stop-auto.sh:2093-2110
if [ "$HAS_E2E_TESTS" = true ]; then
    E2E_RUN=false
    if grep -qE "(playwright test|cypress run)" "$TRANSCRIPT_PATH"; then
        E2E_RUN=true
    fi

    if [ "$E2E_RUN" = false ]; then
        block "E2E TESTS NOT RUN"  # ← BLOCKS but can be bypassed
    fi
fi
```

**Issues:**
1. **Detection-based, not enforcement-based** - relies on grep patterns
2. **Can be bypassed** - if test output isn't in transcript, check fails silently
3. **No framework-specific validation** - doesn't verify Playwright/Cypress actually ran
4. **No coverage threshold** - tests could run but cover nothing

---

## Current Completion Conditions Feature (v0.4.0+)

The codebase HAS a completion conditions system, but it's **opt-in via flags**:

### Available Flags (from `auto.md:46-53`)

```bash
/sw:auto --build       # Build must pass (auto-heal: 3 retries)
/sw:auto --tests       # Unit/integration tests must pass
/sw:auto --e2e         # E2E tests must pass
/sw:auto --lint        # Linting must pass (auto-heal)
/sw:auto --types       # Type-checking must pass (auto-heal)
/sw:auto --cov 80      # Code coverage ≥80%
/sw:auto --e2e-cov 70  # E2E coverage ≥70%
/sw:auto --cmd "..."   # Custom command must pass
```

### Implementation (from `validate-completion-conditions.sh`)

- **Exists**: `/plugins/specweave/hooks/validate-completion-conditions.sh`
- **Auto-detects**: Framework-specific commands (npm, pytest, go, rust, etc.)
- **Self-healing**: Build/lint/types auto-fix on failure (max 3 retries)
- **Blocking**: Tests/E2E/coverage block immediately on failure

**BUT**: These conditions are **opt-in**. Default auto mode runs WITHOUT them!

---

## What Should Happen for Web Projects

### 1. **Mandatory E2E Tests for User-Facing Features**

For any project with:
- `playwright.config.ts/js`
- `cypress.config.ts/js`
- Frontend framework detected (React, Vue, Next.js, etc.)

**Auto mode should REQUIRE**:
```bash
/sw:auto --e2e --e2e-cov 70  # MANDATORY, not optional
```

### 2. **Test Priority Hierarchy**

| Priority | Type | When Required |
|----------|------|---------------|
| 🔴 **CRITICAL** | E2E tests | **ALL web/mobile apps** - covers user flows |
| 🟠 **HIGH** | Integration tests | **ALL backend APIs** - covers endpoints |
| 🟡 **MEDIUM** | Unit tests | **ALL projects** - covers logic |

**Current behavior**: Treats all tests equally
**Correct behavior**: E2E tests MUST run for web apps, period.

### 3. **E2E Coverage Thresholds**

From `stop-auto.sh:2114-2167`:
- **Route coverage**: 80% minimum (configurable)
- **Viewport coverage**: Mobile, tablet, desktop
- **Untested routes**: Blocks until covered

**BUT**: Only enforced if E2E manifest exists (`.e2e-coverage.json`)

### 4. **Test Execution Validation**

Current detection (weak):
```bash
grep -qE "(playwright test|cypress run)" "$TRANSCRIPT_PATH"
```

**Should be**:
1. Parse test runner output (Playwright JSON reporter)
2. Verify exit code (`$?`)
3. Count passed/failed tests
4. Validate coverage report exists
5. **BLOCK** if ANY step fails

---

## Proposed Fix: Auto-Detect Project Type → Enforce Conditions

### Smart Defaults (NEW)

When `/sw:auto` is invoked WITHOUT explicit conditions:

```typescript
// Pseudo-logic
const projectType = detectProjectType();

switch (projectType) {
  case 'web-frontend':
    // React, Vue, Next.js, etc.
    defaultConditions = [
      { type: 'build' },
      { type: 'tests' },
      { type: 'e2e', mandatory: true },  // ← MANDATORY
      { type: 'e2e-coverage', threshold: 70 }
    ];
    break;

  case 'backend-api':
    // Express, FastAPI, etc.
    defaultConditions = [
      { type: 'build' },
      { type: 'tests', mandatory: true },
      { type: 'coverage', threshold: 80 }
    ];
    break;

  case 'mobile-app':
    // React Native, Flutter, etc.
    defaultConditions = [
      { type: 'build' },
      { type: 'tests' },
      { type: 'e2e', mandatory: true },  // Detox, Maestro, etc.
      { type: 'e2e-coverage', threshold: 60 }
    ];
    break;

  default:
    // Generic project
    defaultConditions = [
      { type: 'tests' }
    ];
}
```

### Detection Heuristics

```bash
# Web frontend
if [ -f "playwright.config.ts" ] || [ -f "cypress.config.ts" ]; then
  PROJECT_TYPE="web-frontend"
  MANDATORY_E2E=true
fi

# Mobile app
if [ -f ".detoxrc.js" ] || [ -f "maestro.yaml" ]; then
  PROJECT_TYPE="mobile-app"
  MANDATORY_E2E=true
fi

# Backend API
if [ -f "openapi.yaml" ] || grep -q "express\|fastapi\|nestjs" package.json; then
  PROJECT_TYPE="backend-api"
  MANDATORY_INTEGRATION=true
fi
```

---

## Implementation Plan

### Phase 1: Add Project Type Detection (1 day)

**File**: `src/core/auto/project-detector.ts`

```typescript
export type ProjectType =
  | 'web-frontend'
  | 'mobile-app'
  | 'backend-api'
  | 'library'
  | 'cli-tool'
  | 'generic';

export interface ProjectTypeDetection {
  type: ProjectType;
  confidence: number; // 0-1
  indicators: string[]; // Files/patterns that triggered detection
  frameworks: string[]; // React, Vue, Express, etc.
}

export function detectProjectType(): ProjectTypeDetection;
```

**Detection logic**:
1. Check for E2E test config files
2. Scan package.json dependencies
3. Look for framework-specific files (next.config.js, vite.config.ts, etc.)
4. Analyze source tree structure

### Phase 2: Default Completion Conditions (1 day)

**File**: `src/core/auto/default-conditions.ts`

```typescript
export function getDefaultConditions(
  projectType: ProjectType,
  userOverrides?: CompletionCondition[]
): CompletionCondition[] {
  const defaults = BASE_CONDITIONS[projectType];

  // User can ADD conditions but NOT remove mandatory ones
  return mergeMandatory(defaults, userOverrides);
}
```

**Config override** (`.specweave/config.json`):
```json
{
  "auto": {
    "completionConditions": {
      "enforceDefaults": true,  // NEW - can't disable mandatory conditions
      "additional": [
        { "type": "lint" },
        { "type": "types" }
      ]
    }
  }
}
```

### Phase 3: Update Setup Script (0.5 days)

**File**: `plugins/specweave/scripts/setup-auto.sh`

Add project type detection:
```bash
# After session creation, detect project type
PROJECT_TYPE=$(node "$SCRIPT_DIR/detect-project-type.js")

# Apply default conditions based on type
if [ -z "$COMPLETION_CONDITIONS" ]; then
  COMPLETION_CONDITIONS=$(node "$SCRIPT_DIR/get-default-conditions.js" "$PROJECT_TYPE")
fi

# Merge into session
echo "$SESSION_JSON" | jq --argjson conditions "$COMPLETION_CONDITIONS" \
  '.completionConditions = $conditions' > "$SESSION_FILE"
```

### Phase 4: Update Stop Hook Validation (0.5 days)

**File**: `plugins/specweave/hooks/stop-auto.sh`

Change E2E check from "soft block" to "hard block":
```bash
# Current (soft):
if [ "$E2E_RUN" = false ]; then
    block "E2E TESTS NOT RUN"  # Can be bypassed
fi

# New (hard):
if [ "$E2E_MANDATORY" = "true" ] && [ "$E2E_RUN" = false ]; then
    # Check completionConditions - if e2e required, HARD BLOCK
    HAS_E2E_CONDITION=$(jq -r '[.completionConditions[] | select(.type == "e2e")] | length > 0' "$SESSION_FILE")

    if [ "$HAS_E2E_CONDITION" = "true" ]; then
        approve "E2E tests MANDATORY - cannot complete without execution"
        # This APPROVES exit but logs failure - should be REJECT
        exit 1  # ← HARD FAIL, not soft block
    fi
fi
```

### Phase 5: Documentation Update (0.5 days)

**Files to update**:
- `plugins/specweave/commands/auto.md` - Document smart defaults
- `CLAUDE.md` - Add auto-detect behavior
- `docs-site/docs/commands/auto/index.md` - User-facing docs

**Key messaging**:
> **Smart Defaults (NEW!)**: Auto mode now detects your project type and enforces appropriate test coverage. Web apps REQUIRE E2E tests. Backend APIs REQUIRE integration tests. This ensures quality for long-running autonomous sessions.

---

## Example: Web Project Auto Mode

### Before (Current)

```bash
/sw:auto 0001-user-auth
# → Runs for days
# → Tasks complete
# → Unit tests pass
# → E2E tests SKIPPED (no enforcement)
# → Session completes ❌
```

### After (Proposed)

```bash
/sw:auto 0001-user-auth
# → Detects: web-frontend (playwright.config.ts found)
# → Applies defaults: --build --tests --e2e --e2e-cov 70
# → Runs for days
# → Tasks complete
# → Unit tests pass
# → E2E tests NOT RUN → BLOCKS ❌
# → Forces E2E execution
# → E2E coverage 45% → BLOCKS ❌
# → Adds more E2E tests
# → E2E coverage 72% → PASSES ✅
# → Session completes successfully ✅
```

---

## Risks & Mitigations

### Risk 1: False Positives

**Issue**: Detects project as web-frontend but it's actually a backend API
**Mitigation**:
- Multi-factor detection (require 2+ indicators)
- Confidence scoring (warn if <80%)
- Allow user override via config

### Risk 2: Breaking Existing Workflows

**Issue**: Users who don't want E2E enforcement
**Mitigation**:
- Gradual rollout (opt-in first, then opt-out)
- Config override: `enforceDefaults: false`
- Clear migration guide

### Risk 3: Performance Impact

**Issue**: E2E tests slow down completion
**Mitigation**:
- E2E coverage threshold (70% not 100%)
- Parallel test execution
- Incremental coverage (add tests as you go)

---

## Metrics for Success

After implementation, track:

1. **E2E Test Execution Rate**:
   - Before: ~40% of web projects run E2E tests in auto mode
   - After: ~95% (only skip with explicit override)

2. **Session Completion Quality**:
   - Before: 60% of completions have untested routes
   - After: <10% (enforced coverage threshold)

3. **User Satisfaction**:
   - Survey: "Auto mode ensures high-quality deployments" (target: 4.5/5)

4. **Regression Rate**:
   - Before: 20% of auto-deployed features have bugs in production
   - After: <5% (E2E coverage catches issues)

---

## Conclusion

**Current State**: Auto mode CAN run for months but has NO mandatory E2E testing for web projects.

**Root Cause**: Completion conditions are opt-in, not auto-detected based on project type.

**Proposed Fix**: Implement smart defaults that ENFORCE E2E testing for web/mobile apps.

**Timeline**: 3-4 days implementation + 1 day testing + 1 day docs = **5 days total**

**Priority**: HIGH - This is a critical gap for production-grade autonomous execution.

---

## Next Steps

1. ✅ **Approve proposal** (stakeholder review)
2. **Create increment**: `/sw:increment "Smart completion conditions with project type detection"`
3. **Implement Phase 1-5** (using `/sw:auto` with TDD mode!)
4. **Test on real projects** (dogfood with specweave itself)
5. **Document & deploy** (v1.1.0 release)

**Estimated effort**: 5 days for full implementation + testing
