# Plan: TDD Enforcement - Behavioral Implementation

## Architecture Overview

This implementation follows the **injection point pattern** - adding TDD behavior at three key control points without major architectural changes:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         TDD ENFORCEMENT ARCHITECTURE                        │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐             │
│  │  CONFIG      │      │  METADATA    │      │  EXECUTION   │             │
│  │              │      │              │      │              │             │
│  │ testMode:TDD │──────▶ testMode:TDD │──────▶ TDD Workflow │             │
│  │ tddEnforce:  │      │ (per incr)   │      │ Enforcement  │             │
│  │   strict     │      │              │      │              │             │
│  └──────────────┘      └──────────────┘      └──────────────┘             │
│         │                     │                     │                      │
│         ▼                     ▼                     ▼                      │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐             │
│  │ GENERATION   │      │  TEMPLATES   │      │  HOOKS       │             │
│  │              │      │              │      │              │             │
│  │ /sw:increment│      │ tasks-tdd-   │      │ tdd-enforce- │             │
│  │ selects TDD  │      │ single.md    │      │ ment-guard   │             │
│  │ template     │      │              │      │ .sh          │             │
│  └──────────────┘      └──────────────┘      └──────────────┘             │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Config Schema Extension

**File**: `src/core/types/config.ts`

```typescript
// Add enforcement level type
export type TDDEnforcement = 'strict' | 'warn' | 'off';

export interface TestingConfig {
  defaultTestMode: TestMode;
  defaultCoverageTarget: number;
  coverageTargets: CoverageTargets;
  tddEnforcement: TDDEnforcement;  // NEW - default: 'warn'
}
```

**Default Behavior**:
- `tddEnforcement: "warn"` - warns but allows violations (safe default)
- Teams can opt-in to `"strict"` for hard enforcement

### 2. TDD Task Templates

**Directory**: `plugins/specweave/skills/increment-planner/templates/`

**New Files**:
```
templates/
├── tasks-single-project.md       # Existing (unchanged)
├── tasks-multi-project.md        # Existing (unchanged)
├── tasks-tdd-single-project.md   # NEW - TDD triplet structure
├── tasks-tdd-multi-project.md    # NEW - TDD for umbrella projects
└── spec-tdd-contract.md          # NEW - TDD guidance snippet
```

**TDD Template Structure**:
```markdown
## Phase N: [Feature Name] (TDD)

### T-001: [RED] Write failing test for [feature]
**User Story**: US-XXX
**Satisfies ACs**: AC-USXXX-01
**Status**: [ ] pending
**Phase**: RED
**Priority**: P0
**Model**: 💎 opus

**Description**: Write test that defines expected behavior. Test MUST fail initially.

**Test File**: `tests/unit/{module}/{feature}.test.ts`

**Test Plan**:
- **Given**: Test file created
- **When**: Run npm test
- **Then**: Test FAILS (red)

---

### T-002: [GREEN] Implement [feature]
**User Story**: US-XXX
**Satisfies ACs**: AC-USXXX-01
**Status**: [ ] pending
**Phase**: GREEN
**Priority**: P0
**Model**: 💎 opus
**Depends On**: T-001 [RED] MUST be completed first

**Description**: Write MINIMAL code to make T-001's test pass.

**Test Plan**:
- **Given**: T-001 test exists and fails
- **When**: Implement minimal code
- **Then**: Test PASSES (green)

---

### T-003: [REFACTOR] Improve [feature] code quality
**User Story**: US-XXX
**Satisfies ACs**: AC-USXXX-01
**Status**: [ ] pending
**Phase**: REFACTOR
**Priority**: P1
**Model**: 💎 opus
**Depends On**: T-002 [GREEN] MUST be completed first

**Description**: Improve code without changing behavior.

**Test Plan**:
- **Given**: T-001 test passes
- **When**: Refactor code
- **Then**: Test STILL passes (green)
```

### 3. Template Selection Logic

**File**: `plugins/specweave/skills/increment-planner/SKILL.md`

**Addition to STEP 0A**:
```markdown
### STEP 0A: Read Config Values (MANDATORY)

```bash
# Read testMode (default: "test-after" for user projects)
testMode=$(cat .specweave/config.json | jq -r '.testing.defaultTestMode // "test-after"')

# Read coverageTarget (default: 80)
coverageTarget=$(cat .specweave/config.json | jq -r '.testing.defaultCoverageTarget // 80')

# NEW: Determine template based on testMode
if [ "$testMode" = "TDD" ]; then
  TASK_TEMPLATE="tasks-tdd-single-project.md"
  SPEC_INCLUDES_TDD_CONTRACT=true
else
  TASK_TEMPLATE="tasks-single-project.md"
  SPEC_INCLUDES_TDD_CONTRACT=false
fi

echo "Using testMode: $testMode"
echo "Using task template: $TASK_TEMPLATE"
```

**Store these values for use in STEP 4 and STEP 7!**
```

### 4. /sw:do TDD Awareness

**File**: `plugins/specweave/commands/do.md`

**New Section after Step 1**:
```markdown
### Step 1.5: Check TDD Mode (v1.0.111+)

**Read testMode from metadata.json:**

```bash
INCREMENT_PATH=".specweave/increments/<id>"
TEST_MODE=$(cat "$INCREMENT_PATH/metadata.json" | jq -r '.testMode // "test-after"')
```

**If TEST_MODE == "TDD":**

Display TDD reminder banner:

```
┌─────────────────────────────────────────────────────────────┐
│  🔴 TDD MODE ACTIVE                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  This increment uses Test-Driven Development.               │
│                                                             │
│  WORKFLOW:                                                  │
│  1. [RED]      Write failing test FIRST                     │
│  2. [GREEN]    Minimal code to make test pass               │
│  3. [REFACTOR] Improve code, keep tests green               │
│                                                             │
│  ⚠️  GREEN tasks depend on their RED counterpart!           │
│  💡 Tip: Use /sw:tdd-cycle for guided workflow              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**When executing tasks, detect and display phase:**

```bash
CURRENT_TASK_TITLE="T-001: [RED] Write failing test for login"

if [[ "$CURRENT_TASK_TITLE" == *"[RED]"* ]]; then
  PHASE="🔴 RED - Writing failing test"
elif [[ "$CURRENT_TASK_TITLE" == *"[GREEN]"* ]]; then
  PHASE="🟢 GREEN - Making test pass"
elif [[ "$CURRENT_TASK_TITLE" == *"[REFACTOR]"* ]]; then
  PHASE="🔵 REFACTOR - Improving code quality"
fi

echo "Current Phase: $PHASE"
```
```

### 5. Enforcement Hook Enhancement

**File**: `plugins/specweave/hooks/v2/guards/tdd-enforcement-guard.sh`

**Enhanced Logic**:
```bash
#!/bin/bash
# TDD Enforcement Guard
# Validates RED-GREEN-REFACTOR order based on enforcement level

set -e

PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
INCREMENT_PATH="$1"

# Skip if not a tasks.md edit
if [[ "$INCREMENT_PATH" != *"tasks.md"* ]]; then
  exit 0
fi

# Get increment directory
INCREMENT_DIR=$(dirname "$INCREMENT_PATH")

# Read testMode from metadata
TEST_MODE=$(cat "$INCREMENT_DIR/metadata.json" 2>/dev/null | jq -r '.testMode // "test-after"')

# Skip if not TDD mode
if [ "$TEST_MODE" != "TDD" ]; then
  exit 0
fi

# Read enforcement level from config
ENFORCEMENT=$(cat "$PROJECT_ROOT/.specweave/config.json" 2>/dev/null | jq -r '.testing.tddEnforcement // "warn"')

# Parse completed tasks and check for violations
VIOLATIONS=()

# Find all completed GREEN tasks
while IFS= read -r green_task; do
  task_num=$(echo "$green_task" | grep -oE 'T-[0-9]+')

  # Calculate expected RED task number (GREEN - 1 in triplet)
  green_num=${task_num#T-}
  red_num=$(printf "T-%03d" $((10#$green_num - 1)))

  # Check if RED task is completed
  if ! grep -q "\[x\].*$red_num.*\[RED\]" "$INCREMENT_PATH"; then
    VIOLATIONS+=("$task_num [GREEN] completed but $red_num [RED] not complete")
  fi
done < <(grep "\[x\].*\[GREEN\]" "$INCREMENT_PATH" 2>/dev/null || true)

# Similarly check REFACTOR tasks...
# (abbreviated for plan document)

# Handle violations based on enforcement level
if [ ${#VIOLATIONS[@]} -gt 0 ]; then
  case "$ENFORCEMENT" in
    "strict")
      echo ""
      echo "❌ TDD ENFORCEMENT BLOCKED"
      echo ""
      echo "   Your increment is configured for TDD mode with STRICT enforcement."
      echo ""
      echo "   Violations detected:"
      for v in "${VIOLATIONS[@]}"; do
        echo "   • $v"
      done
      echo ""
      echo "   💡 TDD Discipline: RED → GREEN → REFACTOR"
      echo "      1. 🔴 Complete RED (test) task FIRST"
      echo "      2. 🟢 Then complete GREEN (implementation) task"
      echo "      3. 🔵 Finally complete REFACTOR task"
      echo ""
      echo "   To bypass: Set testing.tddEnforcement: \"warn\" in config.json"
      echo ""
      exit 1  # BLOCK
      ;;

    "warn")
      echo ""
      echo "⚠️  TDD DISCIPLINE WARNING"
      echo ""
      echo "   Your increment is configured for TDD mode (testMode: TDD)"
      echo ""
      echo "   Potential violations detected:"
      for v in "${VIOLATIONS[@]}"; do
        echo "   • $v"
      done
      echo ""
      echo "   💡 TDD Best Practice: RED → GREEN → REFACTOR"
      echo ""
      exit 0  # WARN only
      ;;

    "off")
      # No output, no enforcement
      exit 0
      ;;
  esac
fi

exit 0
```

### 6. Auto Mode TDD Injection

**File**: `plugins/specweave/hooks/setup-auto.sh` (enhancement)

**Addition**:
```bash
# Read testMode for prompt injection
TEST_MODE=$(cat "$INCREMENT_PATH/metadata.json" | jq -r '.testMode // "test-after"')

if [ "$TEST_MODE" = "TDD" ]; then
  # Set environment variable for prompt assembly
  export SPECWEAVE_TDD_MODE="true"

  # Copy TDD prompt injection to session
  TDD_PROMPT=".specweave/prompts/tdd-workflow-injection.md"
  if [ -f "$TDD_PROMPT" ]; then
    export SPECWEAVE_TDD_PROMPT="$TDD_PROMPT"
  fi
fi
```

**New File**: `.specweave/prompts/tdd-workflow-injection.md`

```markdown
## TDD ENFORCEMENT (testMode: TDD)

**CRITICAL WORKFLOW - DO NOT SKIP:**

For EVERY feature/function you implement:

1. **FIRST**: Write test file with failing test
   - File: `tests/unit/{module}/{feature}.test.ts`
   - Test must assert expected behavior
   - Run test, confirm it FAILS (no implementation yet)

2. **THEN**: Write minimal implementation
   - Only enough code to make test pass
   - No extra features, no optimization

3. **FINALLY**: Refactor if needed
   - Keep tests green throughout
   - Extract helpers, improve names

**FORBIDDEN in TDD mode:**
- ❌ Writing implementation before test
- ❌ Writing test after implementation
- ❌ Skipping test for "simple" features
- ❌ Marking GREEN task complete without test existing

**Example flow:**
```
1. Create tests/unit/auth/login.test.ts with:
   it('should return 401 for invalid credentials', ...)

2. Run: npm test -- login.test.ts
   → Should FAIL (function doesn't exist)

3. Create src/auth/login.ts with minimal implementation

4. Run: npm test -- login.test.ts
   → Should PASS

5. Refactor if needed, keep tests green
```

**Task Completion Rules:**
- [RED] task: Test file MUST exist and FAIL before marking complete
- [GREEN] task: Test MUST PASS before marking complete
- [REFACTOR] task: Test MUST still PASS after marking complete
```

## File Changes Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/core/types/config.ts` | MODIFY | Add TDDEnforcement type |
| `templates/tasks-tdd-single-project.md` | CREATE | TDD triplet template |
| `templates/tasks-tdd-multi-project.md` | CREATE | TDD template for umbrella |
| `templates/spec-tdd-contract.md` | CREATE | TDD guidance snippet |
| `increment-planner/SKILL.md` | MODIFY | Template selection logic |
| `commands/do.md` | MODIFY | TDD awareness, banner, phase display |
| `hooks/v2/guards/tdd-enforcement-guard.sh` | MODIFY | Configurable enforcement |
| `hooks/setup-auto.sh` | MODIFY | TDD prompt injection |
| `.specweave/prompts/tdd-workflow-injection.md` | CREATE | Auto mode TDD prompt |

## Testing Strategy

### Unit Tests
- Template selection based on testMode
- Config schema validation for tddEnforcement
- Phase marker parsing
- Dependency validation

### Integration Tests
- Full increment creation with TDD config
- /sw:do execution with TDD banner
- Enforcement blocking in strict mode

### E2E Tests
- Complete TDD workflow from increment to done
- Auto mode with TDD prompt injection

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing increments | Default to "test-after" if no testMode |
| Hook performance | Keep enforcement logic simple, <50ms |
| Template complexity | Clear documentation, examples |
| User confusion | Gradual adoption with "warn" default |

## Backwards Compatibility

- Increments without `testMode` → default to "test-after" (no TDD)
- Config without `tddEnforcement` → default to "warn"
- Existing TDD mode increments → now get actual enforcement
- No changes to test-after or manual modes
