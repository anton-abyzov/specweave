# Auto Mode Label Visibility Analysis

## Investigation Summary

**Issue**: User reports never seeing labels/box art during `/sw:auto` execution, even though the code clearly generates them.

## Root Cause Analysis

### 1. **Output Stream Separation (CRITICAL)**

The stop hook uses **TWO separate output streams**:

```bash
# Line 647-648, 762-763: Box art goes to STDERR
{
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  🔄 AUTO SESSION CONTINUING                                  ║"
    # ... more box art ...
} >&2  # <--- STDERR redirection

# Line 728, 812-814: JSON decision goes to STDOUT
echo "{\"decision\": \"block\", \"reason\": \"$reason\", \"systemMessage\": $escaped_message}"
```

**Key Finding**: The beautiful box art is written to **STDERR**, while Claude Code reads the JSON decision from **STDOUT**.

### 2. **Where Does STDERR Go?**

During stop hook execution:
- **STDOUT** → Captured by Claude Code for decision parsing (`{"decision": "block"}`)
- **STDERR** → Could go to:
  1. Claude Code's internal logs (not shown to user)
  2. Terminal stderr (if running in terminal mode)
  3. Swallowed entirely (in some execution contexts)
  4. VSCode Debug Console (in extension mode)

### 3. **systemMessage Field Usage**

The stop hook DOES support sending messages to Claude via `systemMessage`:

```bash
# Line 809-812
if [ -n "$system_message" ]; then
    local escaped_message=$(echo "$system_message" | jq -Rs .)
    echo "{\"decision\": \"block\", \"reason\": \"$reason\", \"systemMessage\": $escaped_message}"
fi
```

**However**: The `systemMessage` is used for **continuation prompts** (task details, test failures), NOT for the box art labels!

### 4. **When Labels Are Generated**

Labels are generated in TWO places:

#### A. `approve()` function (lines 625-730)
- Called when session STOPS (approve exit)
- Box art shows: "✅ AUTO SESSION COMPLETE" or "🛑 AUTO SESSION STOPPING"
- **Frequency**: ONCE per session (at the end)

#### B. `block()` function (lines 735-817)
- Called when session CONTINUES (block exit)
- Box art shows: "🔄 AUTO SESSION CONTINUING" with stop criteria
- **Frequency**: EVERY iteration (potentially hundreds of times)

### 5. **Why User Never Sees Labels**

**For `block()` (continuation labels)**:
1. Hook executes, generates box art to STDERR
2. STDERR output is NOT captured by Claude Code's main UI
3. JSON with `{"decision": "block"}` goes to STDOUT → Claude continues
4. User only sees Claude's work output, NOT the hook's STDERR

**For `approve()` (completion labels)**:
1. Hook executes, generates box art to STDERR
2. Session ends, Claude Code exits
3. STDERR from stop hook may be:
   - Lost in session cleanup
   - Sent to terminal but scrolled away
   - Never displayed in UI at all

### 6. **Subagent Behavior**

The code has special handling for subagents (lines 717-723, 791-801):
```bash
if [ "$agent_type" = "orchestrator" ]; then
    # Main orchestrator labels
else
    # Subagent labels: "↩️ SUBAGENT COMPLETE - Returning to parent"
fi
```

**Finding**: Subagents also write to STDERR, so their labels are equally invisible.

## Stop Conditions Analysis

### When Does Auto Mode Stop?

Based on the hook logic (lines 1695-2474):

#### 1. **Immediate Exit (approve)**
- `STOP_HOOK_ACTIVE = true` (prevent infinite loop) - line 1698
- No auto session active - line 1703
- Session status != "running" - line 1720
- Max iterations reached - line 1769
- Max hours exceeded - line 1791
- Completion promise detected (`<auto-complete>DONE</auto-complete>`) - line 1805
- Low confidence score (<0.50) - line 1817
- Multiple credential errors - line 1858
- Human gate pending - line 2342

#### 2. **Continue After Task Completion (block then approve)**
- All tasks complete + all tests passed → line 2228
- All tasks complete + multiple increments in queue → transition to next - line 2246

#### 3. **Continue with Retries (block)**
- Tests not run yet - lines 1965, 1985
- Tests failing (up to 3 retries) - lines 1999, 2020
- TDD mode: 0 tests passed - line 2031
- E2E tests not run - line 2063
- E2E coverage below threshold - line 2099
- Transient failures - line 1513
- Fixable failures - line 1636
- Living docs update in progress - line 2312

#### 4. **Pause Session (approve with pause status)**
- External configuration required - line 1529
- Structural issues - line 1549
- Unfixable issues (with skip option) - line 1569

### Stop Hook Invocation Frequency

**Per Agent Model** (v2.3+):
- Main orchestrator: Hook runs on EVERY natural exit attempt
- Subagents: Hook runs ONLY if `stop_hooks: true` in Task tool call
- Iteration count is SHARED across all agents via `auto-session.json`

**Key Insight**: The hook could run:
- **Hundreds of times** for a large increment (50+ tasks)
- **Once per task completion** if Claude naturally tries to exit
- **Multiple times per failing test** (retry loop)

## Verification Steps

### Check if Labels Were Generated

```bash
# 1. Check stop hook execution logs
tail -100 /Users/antonabyzov/Projects/github/specweave/.specweave/logs/auto-stop-reasons.log

# 2. Check iteration logs
tail -100 /Users/antonabyzov/Projects/github/specweave/.specweave/logs/auto-iterations.log

# 3. Check session logs
cat /Users/antonabyzov/Projects/github/specweave/.specweave/logs/auto-sessions.log

# 4. Check if hook is being called
grep -c "decision.*block" /Users/antonabyzov/Projects/github/specweave/.specweave/logs/auto-stop-reasons.log
```

### Find STDERR Output

```bash
# Check Claude Code logs directory
ls -la ~/.claude-code/logs/

# Check for stderr capture
grep -r "AUTO SESSION CONTINUING" ~/.claude-code/

# Check current terminal history (if running in terminal)
# Look for box art in scrollback
```

## Recommendations

### Option 1: Send Labels via systemMessage (BEST)

Modify `block()` and `approve()` to include box art in `systemMessage`:

```bash
block() {
    local reason="$1"
    local system_message="$2"

    # Generate box art
    local box_art=$(cat <<'EOF'
╔══════════════════════════════════════════════════════════════╗
║  🔄 AUTO SESSION CONTINUING                                  ║
║  $agent_display                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
)

    # Prepend box art to system message
    local full_message="$box_art

$system_message"

    # Send to stdout as systemMessage
    local escaped_message=$(echo "$full_message" | jq -Rs .)
    echo "{\"decision\": \"block\", \"reason\": \"$reason\", \"systemMessage\": $escaped_message}"
}
```

**Pros**:
- Labels would be visible to Claude AND user
- No changes to Claude Code needed
- Works across all execution contexts

**Cons**:
- Adds ~500 chars to every continuation prompt
- May clutter Claude's context slightly

### Option 2: Add Label Output to Claude Code

Modify Claude Code to display STDERR from stop hooks:

```typescript
// In stop hook execution
const { stdout, stderr } = await exec(stopHookPath, { input: JSON.stringify(input) });
const decision = JSON.parse(stdout);

// NEW: Display stderr to user if present
if (stderr) {
    console.log(stderr); // or send to UI
}
```

**Pros**:
- Cleanly separates decision logic (stdout) from user UI (stderr)
- Labels don't affect context size
- Works for all hooks

**Cons**:
- Requires changes to Claude Code codebase
- May show unwanted hook debugging output

### Option 3: Periodic Status Reports

Instead of labels on every iteration, send status reports every N iterations:

```bash
# In stop hook, every 10 iterations
if [ $((ITERATION % 10)) -eq 0 ]; then
    send_status_report_to_systemMessage
fi
```

**Pros**:
- Less context pollution
- Still provides visibility
- Configurable frequency

**Cons**:
- User doesn't see real-time status
- Delayed feedback on stop criteria

## Conclusion

**Primary Issue**: Labels are written to STDERR, which is not captured/displayed by Claude Code's UI during stop hook execution.

**Immediate Solution**: Modify stop hook to include box art in `systemMessage` field for `block()` calls, so labels appear in Claude's context and are visible to users.

**Long-term Solution**: Enhance Claude Code to surface stop hook STDERR to users, either as console output or in a dedicated "Stop Hook Output" panel.

**Stop Conditions Work Correctly**: The logic for when to stop/continue is sound and comprehensive. The issue is purely a UI/visibility problem, not a logic problem.

## Test Plan

To verify labels are generated correctly:

1. Run auto mode with verbose logging enabled
2. Check `auto-stop-reasons.log` for "approve_called" and "block_called" entries
3. Verify session progresses correctly (check `auto-iterations.log`)
4. Look for STDERR output in terminal if running from command line
5. Test Option 1 fix by modifying `block()` to include box art in systemMessage

**Expected Behavior After Fix**:
- User sees box art labels in Claude's conversation
- Labels show stop criteria, iteration count, test status
- Labels update on every continuation (may be verbose, can tune)
