# Auto Mode Label Visibility Fix (v2.9)

## Problem

Users never saw auto mode labels/box art during `/sw:auto` execution because:
1. Labels were written to STDERR (`} >&2`)
2. Claude Code only reads STDOUT for decision JSON
3. STDERR output was discarded or hidden from users
4. Result: Beautiful status labels were generated but never visible

## Solution (v2.9)

**Include labels in `systemMessage` field of JSON output.**

### Changes Made

#### 1. New Helper Function: `build_status_label()`

Location: [plugins/specweave/hooks/stop-auto.sh](plugins/specweave/hooks/stop-auto.sh:625-739)

```bash
build_status_label() {
    local label_type="$1"  # approve_success, approve_stop, block_continue, etc.
    local reason="$2"
    local agent_display="$3"
    # ... build and return label as string
}
```

**Supported label types**:
- `approve_success` - ✅ AUTO SESSION COMPLETE (successful completion)
- `approve_stop` - 🛑 AUTO SESSION STOPPING (stopped early)
- `approve_subagent` - ↩️ SUBAGENT COMPLETE (subagent finished)
- `block_continue` - 🔄 AUTO SESSION CONTINUING (blocking continuation)
- `block_subagent` - 🔧 SUBAGENT CONTINUING WORK (subagent working)

#### 2. Modified `approve()` Function

Location: [plugins/specweave/hooks/stop-auto.sh](plugins/specweave/hooks/stop-auto.sh:741-790)

**Before**:
```bash
approve() {
    # ... generate label to STDERR ...
    } >&2

    echo "{\"decision\": \"approve\", \"reason\": \"$reason\"}"
    exit 0
}
```

**After**:
```bash
approve() {
    # Build label
    local status_label=$(build_status_label "$label_type" ...)

    # Still output to STDERR (for logs)
    echo "$status_label" >&2

    # NEW: Include label in systemMessage
    local escaped_label=$(echo "$status_label" | jq -Rs .)
    echo "{\"decision\": \"approve\", \"reason\": \"$reason\", \"systemMessage\": $escaped_label}"
    exit 0
}
```

#### 3. Modified `block()` Function

Location: [plugins/specweave/hooks/stop-auto.sh](plugins/specweave/hooks/stop-auto.sh:792-856)

**Before**:
```bash
block() {
    # ... generate label to STDERR ...
    } >&2

    if [ -n "$system_message" ]; then
        echo "{\"decision\": \"block\", \"systemMessage\": $escaped_message}"
    else
        echo "{\"decision\": \"block\", \"reason\": \"$reason\"}"
    fi
    exit 0
}
```

**After**:
```bash
block() {
    # Build label
    local status_label=$(build_status_label "$label_type" ...)

    # Still output to STDERR (for logs)
    echo "$status_label" >&2

    # NEW: Prepend label to existing system message
    if [ -n "$system_message" ]; then
        full_message="$status_label

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$system_message"
    else
        full_message="$status_label"
    fi

    local escaped_message=$(echo "$full_message" | jq -Rs .)
    echo "{\"decision\": \"block\", \"systemMessage\": $escaped_message}"
    exit 0
}
```

## Impact

### Before v2.9

**What users saw**:
- ❌ No labels at all
- ❌ No stop criteria indication
- ❌ No iteration count visible
- ❌ No test status visible
- Just Claude working without context

**What was generated (but hidden in STDERR)**:
```
╔══════════════════════════════════════════════════════════════╗
║  🔄 AUTO SESSION CONTINUING                                  ║
║  🤖 Main Orchestrator                                        ║
╠══════════════════════════════════════════════════════════════╣
║  Why: Work incomplete, continuing...                         ║
║  Iteration: 42/2500                                         ║
║  Increment: 0001-user-auth                                  ║
╚══════════════════════════════════════════════════════════════╝
```

### After v2.9

**What users see** (in Claude's conversation):
- ✅ Full status labels with box art
- ✅ Stop criteria clearly shown ("WHEN WILL SESSION STOP?")
- ✅ Iteration count and progress
- ✅ Test status (passed/failed)
- ✅ TDD mode indication if enabled
- ✅ Subagent activity tracking

**Example `block()` output visible to user**:
```
╔══════════════════════════════════════════════════════════════╗
║  🔄 AUTO SESSION CONTINUING                                  ║
║  🤖 Main Orchestrator                                        ║
╠══════════════════════════════════════════════════════════════╣
║  Why: Work incomplete, continuing...                         ║
║  Iteration: 42/2500                                         ║
║  Increment: 0001-user-auth                                  ║
║  Subagents used: 3                                          ║
╠══════════════════════════════════════════════════════════════╣
║  🎯 WHEN WILL SESSION STOP?                                  ║
║  ├─ Mode: STANDARD MODE                                     ║
║  └─ Criteria: ALL tasks [x] completed + tests passing       ║
║  ✅ Tests: 42 passed, 0 failed                              ║
╚══════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[continuation prompt with task details...]
```

**Example `approve()` output visible to user**:
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ✅ AUTO SESSION COMPLETE                                   ┃
┃  🤖 Main Orchestrator                                       ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  Status: SUCCESS - All work completed                       ┃
┃  Reason: All tasks completed, all tests passed             ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  📊 SESSION SUMMARY                                         ┃
┃  ├─ Iterations: 47/100                                      ┃
┃  ├─ Increment: 0001-user-auth                              ┃
┃  ├─ Subagents spawned: 3                                   ┃
┃  └─ Tests: 42 passed, 0 failed                             ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Testing

Created comprehensive test suite: [tests/unit/hooks/stop-auto-labels.test.sh](tests/unit/hooks/stop-auto-labels.test.sh)

**Test results**:
```bash
$ bash tests/unit/hooks/stop-auto-labels.test.sh

✓ Test 1: Approve includes 🛑 AUTO SESSION STOPPING label
✓ Test 2: Block includes 🔄 AUTO SESSION CONTINUING label
✓ Test 3: Block returns decision: block
✓ Test 4: systemMessage is valid JSON

✓ ALL TESTS PASSED (4/4)
```

## Benefits

1. **User Visibility**: Users now see what auto mode is doing in real-time
2. **Stop Criteria Transparency**: "WHEN WILL SESSION STOP?" shown on every iteration
3. **Progress Tracking**: Iteration count, test status visible at all times
4. **Debugging**: Easier to understand why session continues or stops
5. **Context Awareness**: Labels appear in Claude's conversation, providing context
6. **Backward Compatible**: Still outputs to STDERR for terminal/log compatibility

## Context Size Impact

**Minimal**:
- Labels add ~500-800 characters per continuation
- Only shown when hook runs (once per natural exit attempt)
- Removed from context during Claude Code's auto-compaction
- Provides valuable context worth the small cost

**Frequency**:
- `block()`: Every time Claude tries to exit (1-50+ times per increment)
- `approve()`: Once per session end
- Subagent labels: Only if subagent has stop hooks enabled

## Migration Notes

**No action required for users!** This is a transparent enhancement.

**For contributors**:
- Labels are now in `systemMessage` field of JSON output
- STDERR output still exists (for terminal logging)
- Use `build_status_label()` helper for consistent formatting
- Test with `tests/unit/hooks/stop-auto-labels.test.sh`

## Related Files

- [plugins/specweave/hooks/stop-auto.sh](plugins/specweave/hooks/stop-auto.sh) - Main implementation
- [tests/unit/hooks/stop-auto-labels.test.sh](tests/unit/hooks/stop-auto-labels.test.sh) - Test suite
- [src/core/reflection/auto-label-visibility-analysis.md](src/core/reflection/auto-label-visibility-analysis.md) - Original investigation

## Future Enhancements

1. **Periodic Labels**: Show labels every N iterations instead of every iteration (reduce verbosity)
2. **Compact Mode**: Shorter labels for low-context scenarios
3. **Color Coding**: Use ANSI colors in terminal mode (already works via STDERR)
4. **User Preferences**: Let users configure label frequency and detail level

## Changelog Entry

```markdown
### v2.9 - Auto Mode Label Visibility (2026-01-06)

**ENHANCEMENT**: Auto mode status labels now visible to users!

- Labels (box art) now appear in systemMessage field of stop hook output
- Users can see iteration count, stop criteria, test status in real-time
- Both block (continuation) and approve (completion) labels visible
- Backward compatible - still outputs to STDERR for logging
- Tests: 4/4 passing (stop-auto-labels.test.sh)

**Impact**: Users finally see the beautiful status labels that were always generated but hidden!
```

## Credits

- Investigation: Deep analysis of STDERR vs STDOUT separation
- Implementation: Added `build_status_label()` helper, modified `approve()`/`block()`
- Testing: Comprehensive test suite with JSON validation
- Documentation: This file + analysis document
