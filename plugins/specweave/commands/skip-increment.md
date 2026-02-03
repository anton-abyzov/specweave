# Skip Failed Increment in Auto Mode

Skip a failed increment and move to the next one in queue. Use when an increment has exhausted retries and you want to continue with other work.

## Usage

```bash
/sw:skip-increment [INCREMENT_ID]
```

## Arguments

- `INCREMENT_ID`: Optional. If not provided, skips the current pending skip.

## How It Works

1. Marks the failed increment as "skipped" (not "completed" or "failed")
2. Logs the skip with reason in the session state
3. Moves to the next increment in queue
4. Continues auto mode execution

## When to Use

- When an increment fails repeatedly and you want to move forward
- When a blocking issue requires external resolution
- When prioritizing other increments over the failed one

## Session State

The skip creates a `failedIncrements` entry with skip metadata:

```json
{
  "incrementId": "0001-feature",
  "skipReason": "test_failures",
  "skippedAt": "2024-12-29T10:00:00Z",
  "failureDetails": {
    "file": "tests/auth.spec.ts",
    "error": "timeout waiting for login"
  }
}
```

## Execution

**When this command is invoked**, execute the following:

```bash
SESSION_FILE="$PROJECT_ROOT/.specweave/state/auto-session.json"

if [ ! -f "$SESSION_FILE" ]; then
    echo "No auto session active."
    exit 1
fi

SESSION=$(cat "$SESSION_FILE")
PENDING_SKIP=$(echo "$SESSION" | jq -r '.pendingSkip // null')

if [ "$PENDING_SKIP" = "null" ]; then
    echo "No increment pending skip. Run /sw:auto to continue."
    exit 1
fi

SKIPPED_INCREMENT=$(echo "$PENDING_SKIP" | jq -r '.increment')
SKIP_REASON=$(echo "$PENDING_SKIP" | jq -r '.reason')
NEXT_INCREMENT=$(echo "$SESSION" | jq -r '.incrementQueue[1] // null')

if [ "$NEXT_INCREMENT" = "null" ]; then
    echo "No more increments in queue."
    exit 1
fi

# Move skipped increment to failed list and advance queue
jq --arg skipped "$SKIPPED_INCREMENT" --arg reason "$SKIP_REASON" \
   --arg next "$NEXT_INCREMENT" --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '
   .failedIncrements += [{
     "incrementId": $skipped,
     "skipReason": $reason,
     "skippedAt": $now,
     "failureDetails": .pendingSkip
   }] |
   .currentIncrement = $next |
   .incrementQueue = .incrementQueue[1:] |
   .status = "running" |
   del(.pendingSkip) |
   del(.pauseTime) |
   del(.pauseReason)
' "$SESSION_FILE" > "$SESSION_FILE.tmp" && mv "$SESSION_FILE.tmp" "$SESSION_FILE"

echo "Skipped increment $SKIPPED_INCREMENT, now working on $NEXT_INCREMENT"
```

Then continue with `/sw:do` to start working on the next increment.
