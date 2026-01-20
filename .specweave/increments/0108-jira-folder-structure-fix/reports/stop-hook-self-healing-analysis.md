# Stop Hook Self-Healing Analysis

## Executive Summary

The stop hook detected a test failure and triggered the **self-healing retry mechanism** (1/3 attempts). This is working as designed based on the completion conditions configured in the auto session.

## Root Cause Analysis

### 1. Auto Session Configuration

The auto session (`auto-session.json`) has `completionConditions` configured:

```json
{
  "completionConditions": [
    {
      "type": "build",
      "autoHeal": true,
      "maxRetries": 3
    },
    {
      "type": "tests",
      "autoHeal": false
    },
    {
      "type": "lint",
      "autoHeal": true,
      "maxRetries": 3
    }
  ]
}
```

**Key point**: `tests` condition has `autoHeal: false`, but the system is STILL attempting self-healing!

### 2. Test Failure Detection Flow

When the stop hook runs, it follows this flow:

1. **Parse test results** from transcript ([stop-auto.sh:1863](plugins/specweave/hooks/stop-auto.sh#L1863)):
   ```bash
   TEST_RESULTS=$(parse_test_results "$TRANSCRIPT_PATH")
   TESTS_PASSED=$(echo "$TEST_RESULTS" | jq -r '.passed')
   TESTS_FAILED=$(echo "$TEST_RESULTS" | jq -r '.failed')
   TESTS_RUN=$(echo "$TEST_RESULTS" | jq -r '.testsRun')
   ```

2. **If ANY tests failed**, trigger self-healing ([stop-auto.sh:1871-1879](plugins/specweave/hooks/stop-auto.sh#L1871)):
   ```bash
   if [ "$TESTS_RUN" = "true" ] && [ "$TESTS_FAILED" -gt 0 ]; then
       # Extract failure details
       FAILURE_DETAILS=$(extract_failure_details "$TRANSCRIPT_PATH")

       # Trigger self-healing loop
       handle_test_failure "$FAILURE_DETAILS"
   fi
   ```

3. **Self-healing logic** ([stop-auto.sh:1626-1675](plugins/specweave/hooks/stop-auto.sh#L1626)):
   - Check retry count (max 3 attempts)
   - Build detailed fix prompt with failure details
   - Block session and feed prompt back to Claude
   - Claude attempts to fix and re-run tests
   - Loop continues until tests pass OR 3 retries exhausted

### 3. The Problem: Completion Conditions NOT Checked

**CRITICAL DISCOVERY**: The `validate-completion-conditions.sh` script exists but is **NEVER CALLED** from `stop-auto.sh`!

Evidence:
```bash
$ grep -n "validate-completion-conditions" plugins/specweave/hooks/stop-auto.sh
# NO RESULTS!

$ grep -n "completionConditions" plugins/specweave/hooks/stop-auto.sh
# NO RESULTS!
```

The completion conditions validation script at [validate-completion-conditions.sh](plugins/specweave/hooks/validate-completion-conditions.sh) has the logic to:
- Read `completionConditions` from session
- Auto-detect framework-specific test commands
- Implement self-healing for build/lint failures with configurable retries
- Support `autoHeal` and `maxRetries` per condition type

**But it's never invoked!** The old hardcoded test failure logic in `stop-auto.sh` runs instead.

### 4. Session Status

Current auto session:
- **Status**: `completed` (not running)
- **Iteration**: 1
- **Current Increment**: `0160-plugin-cache-health-monitoring`
- **Completion Conditions**: Defined with `autoHeal: true` for build/lint, `false` for tests

The session ended normally, but during execution, test failures triggered the legacy self-healing path instead of the new completion conditions framework.

## Why This Happened

### Architecture Mismatch

There are **TWO separate test failure handling systems** in the codebase:

#### System 1: Legacy Hardcoded Logic (ACTIVE)
- Located in `stop-auto.sh` lines 1863-1721
- Automatically triggers self-healing for ANY test failure
- Hardcoded 3-retry limit
- Does NOT respect `completionConditions.autoHeal` setting
- **Currently executing**

#### System 2: New Completion Conditions Framework (DORMANT)
- Located in `validate-completion-conditions.sh`
- Respects `autoHeal` and `maxRetries` per condition type
- Framework-agnostic command detection
- **Never invoked** - exists but not integrated

### Why the Disconnect?

Looking at the code history and design:

1. **Increment 0158** ([0158-smart-completion-conditions](../.specweave/increments/0158-smart-completion-conditions/)) was created to add the flexible completion conditions system
2. The `validate-completion-conditions.sh` script was written
3. The auto session config was updated to support `completionConditions` array
4. **BUT**: The integration point was never added to `stop-auto.sh`

The old test failure logic at line 1871-1879 still executes unconditionally, bypassing the new framework entirely.

### Expected vs Actual Behavior

**Expected** (based on `completionConditions`):
```
Test fails → Check if autoHeal: true for "tests" condition
→ autoHeal: false → BLOCK immediately without retry
→ Show error, pause session, require human intervention
```

**Actual** (what happened):
```
Test fails → Hardcoded logic triggers
→ Self-healing retry 1/3 regardless of autoHeal setting
→ Prompt Claude to fix and retry
→ Up to 3 attempts before pausing
```

## Impact Analysis

### What Works
✅ Test failure detection (parse_test_results)
✅ Self-healing retry mechanism (3 attempts)
✅ Detailed failure extraction
✅ Session state tracking

### What Doesn't Work
❌ Completion conditions `autoHeal` setting ignored
❌ Per-condition `maxRetries` configuration ignored
❌ Build/lint/types conditions never validated
❌ Custom command conditions never checked
❌ Framework-agnostic command detection unused

### User Impact

**For this session**: Minor - tests were supposed to NOT auto-heal (`autoHeal: false`), but the system tried anyway. Since the session was simple and completed on iteration 1, the impact was minimal.

**Generally**: Users who configure completion conditions expecting fine-grained control over auto-healing behavior will be surprised when their settings are ignored.

## Resolution Paths

### Option 1: Integrate Completion Conditions Validator

**Add to `stop-auto.sh` at line ~1960** (after task completion check, before legacy test logic):

```bash
# ============================================================================
# COMPLETION CONDITIONS VALIDATION (v0.4.0+)
# Validates build, tests, lint, types, coverage, custom commands
# ============================================================================

if [ -n "$CURRENT_INCREMENT" ]; then
    HAS_CONDITIONS=$(jq -r 'has("completionConditions")' "$SESSION_FILE" 2>/dev/null || echo "false")

    if [ "$HAS_CONDITIONS" = "true" ]; then
        # Run completion conditions validator
        VALIDATOR="$SCRIPT_DIR/validate-completion-conditions.sh"

        if [ -x "$VALIDATOR" ]; then
            if ! bash "$VALIDATOR" "$SESSION_FILE" "$TRANSCRIPT_PATH" 2>&1; then
                # Validator failed - check for auto-heal
                CONDITION_TYPE=$(jq -r '.completionConditions[] | select(.autoHeal == true) | .type' "$SESSION_FILE" | head -1)

                if [ -n "$CONDITION_TYPE" ]; then
                    # Auto-heal enabled for this condition type
                    handle_test_failure "$(extract_failure_details "$TRANSCRIPT_PATH")"
                else
                    # No auto-heal - block immediately
                    block "Completion conditions failed - auto-heal disabled" "..."
                fi
            fi
        fi
    fi
fi

# Legacy test logic below (ONLY runs if completionConditions not defined)
if [ "$HAS_CONDITIONS" != "true" ]; then
    # Original hardcoded test logic here...
fi
```

**Pros**:
- Respects user configuration
- Uses new framework
- Backward compatible (falls back to legacy if no conditions defined)

**Cons**:
- More complex integration
- Need to refactor failure handling

### Option 2: Remove Legacy Test Logic

**Delete lines 1863-1721** and fully rely on completion conditions.

**Pros**:
- Clean architecture
- Single source of truth

**Cons**:
- Breaking change for sessions without `completionConditions`
- Requires migration guide

### Option 3: Make Legacy Logic Respect autoHeal Flag

**Minimal change** - add check at line 1871:

```bash
if [ "$TESTS_RUN" = "true" ] && [ "$TESTS_FAILED" -gt 0 ]; then
    # Check if auto-heal is enabled for tests
    AUTO_HEAL=$(jq -r '.completionConditions[] | select(.type == "tests") | .autoHeal // true' "$SESSION_FILE")

    if [ "$AUTO_HEAL" = "true" ]; then
        handle_test_failure "$FAILURE_DETAILS"
    else
        block "Tests failed - auto-heal disabled" "..."
    fi
fi
```

**Pros**:
- Minimal change
- Quick fix
- Respects autoHeal setting

**Cons**:
- Doesn't use full completion conditions framework
- Ignores maxRetries, build/lint/types conditions

## Recommendation

**Short-term**: Option 3 (make legacy logic respect `autoHeal` flag)
- Quick 5-line fix
- Unblocks user frustration with auto-healing when disabled
- Low risk

**Medium-term**: Option 1 (integrate completion conditions validator)
- Proper architecture
- Full feature support
- Backward compatible

**Long-term**: Option 2 (remove legacy logic entirely)
- Clean codebase
- After Option 1 is battle-tested
- With migration guide

## Files Involved

### Modified
- [plugins/specweave/hooks/stop-auto.sh](plugins/specweave/hooks/stop-auto.sh) - Add completion conditions check

### New (already exists, needs integration)
- [plugins/specweave/hooks/validate-completion-conditions.sh](plugins/specweave/hooks/validate-completion-conditions.sh) - Already written, just needs to be called

### Config
- `.specweave/state/auto-session.json` - Contains `completionConditions` array

## Testing Plan

1. **Create test session** with `autoHeal: false` for tests
2. **Introduce deliberate test failure**
3. **Run auto mode** and verify:
   - If `autoHeal: true` → Self-healing triggers
   - If `autoHeal: false` → Blocks immediately without retry
4. **Test build/lint conditions** similarly
5. **Verify maxRetries** setting is respected (not hardcoded 3)

## Related Increments

- [0158-smart-completion-conditions](../.specweave/increments/0158-smart-completion-conditions/) - Created the completion conditions framework
- [0160-plugin-cache-health-monitoring](../.specweave/increments/0160-plugin-cache-health-monitoring/) - Current increment that triggered the issue
- [0161-hook-execution-visibility-and-command-reliability](../.specweave/increments/0161-hook-execution-visibility-and-command-reliability/) - May need visibility updates

---

**Generated**: 2026-01-07
**Increment**: 0142-jira-folder-structure-fix
**Analysis Type**: Root Cause Investigation
