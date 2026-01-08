# ADR: Async Reflection Processing Pattern (Ralph-Inspired)

**Date**: 2026-01-07
**Status**: Implemented
**Context**: Stop hook async processing for reflection system

---

## Problem

The original `stop-reflect.sh` implementation spawned background processes using `&`:

```bash
(
    bash "$reflect_script" reflect ... >> log 2>&1
) &
```

**Issues with this approach:**

1. **Orphaned processes** - Background process may outlive the session
2. **Zombie processes** - Parent exits, child becomes zombie
3. **No feedback** - User never knows if reflection succeeded/failed
4. **Race conditions** - Multiple sessions can spawn competing processes
5. **Resource leaks** - No cleanup mechanism for stuck processes

---

## Solution: Queue-Based Async Processing

Inspired by the **Ralph Wiggum plugin** best practices, we implement a **queue-based pattern**:

### Architecture

```
Session Ends
     ↓
Stop Hook (stop-reflect.sh)
     ↓
 Queue Entry Written (JSONL)
     ↓
 Fire-and-Forget Processor Spawn
     ↓
Session Exits Immediately
     ↓
Queue Processor (detached)
     ↓
 Process Queue Entries
     ↓
 Update Queue (remove successful)
     ↓
 Exit (clean termination)
```

### Components

#### 1. Stop Hook (`stop-reflect.sh`)

**Responsibility**: Queue work, don't execute it

```bash
queue_reflection() {
    # Validate inputs
    # Write JSONL entry to queue
    # Spawn detached processor (fire-and-forget)
    # Return immediately
}
```

**Key points:**
- **No blocking** - Returns immediately
- **JSONL format** - Atomic appends, one JSON per line
- **Double-fork pattern** - Detaches processor from parent

#### 2. Queue Processor (`process-reflect-queue.sh`)

**Responsibility**: Process queued work asynchronously

```bash
main() {
    # Acquire lock (concurrency control)
    # Read JSONL queue
    # Process each entry
    # Remove successful entries
    # Keep failed entries for retry
    # Release lock
}
```

**Key points:**
- **Lock-based concurrency** - Only one processor at a time
- **Atomic updates** - Rewrite queue after processing
- **Graceful degradation** - Failed entries stay in queue
- **Automatic cleanup** - Removes processed entries

### Benefits

✅ **No orphaned processes** - Processor runs to completion or fails cleanly
✅ **No zombies** - Double-fork pattern ensures proper reparenting
✅ **Retry mechanism** - Failed entries stay in queue
✅ **Concurrency control** - Lock prevents race conditions
✅ **Feedback** - Logs show processing status
✅ **Clean exit** - Session exits immediately, no blocking

---

## Ralph Plugin Inspiration

The Ralph plugin demonstrates best practices for Claude Code hooks:

### Ralph's Approach

1. **No background processes** - Everything happens in hook lifecycle
2. **State-based control** - Uses state files for coordination
3. **Synchronous decisions** - Returns immediately with clear decision
4. **Clean termination** - No orphaned processes

### Applied to SpecWeave Reflect

We adapted Ralph's principles:

| Ralph Pattern | SpecWeave Application |
|---------------|----------------------|
| **State files** | `reflect-queue.jsonl` for work queue |
| **No `&` spawns** | Fire-and-forget detached processor |
| **Immediate return** | Hook returns in <100ms |
| **Clean termination** | Processor exits cleanly after work |

---

## Implementation Details

### Queue Format (JSONL)

```jsonl
{"transcript":"/path/to/transcript.txt","confidence":"medium","maxLearnings":10,"queuedAt":"2026-01-07T10:30:00Z","status":"queued"}
{"transcript":"/path/to/another.txt","confidence":"high","maxLearnings":5,"queuedAt":"2026-01-07T11:00:00Z","status":"queued"}
```

### Double-Fork Pattern

```bash
(
    # Fork 1: Create subshell
    nohup bash process-reflect-queue.sh >> log 2>&1 &
    # Fork 2: Background process
) &
# Parent exits immediately

disown 2>/dev/null || true
# Detach from job control
```

**Why this works:**
1. First `&` creates subshell (fork 1)
2. `nohup` + second `&` creates detached child (fork 2)
3. Parent exits immediately
4. Child is reparented to `init` (PID 1)
5. `disown` prevents job control messages

### Lock-Based Concurrency

```bash
# Acquire lock with timeout
while [ -f "$LOCK_FILE" ]; do
    if [ $elapsed -ge $timeout ]; then
        # Remove stale lock
        rm -f "$LOCK_FILE"
        break
    fi
    sleep 1
done

echo "$$" > "$LOCK_FILE"
trap "rm -f $LOCK_FILE" EXIT
```

---

## Testing

### Manual Test

```bash
# 1. Enable auto-reflect
/sw:reflect-on

# 2. Make corrections in session
"No, always use logger instead of console.log"

# 3. End session
# Stop hook should queue reflection immediately

# 4. Check queue
cat .specweave/state/reflect-queue.jsonl

# 5. Check logs
tail -f .specweave/logs/reflect/queue-processor.log
```

### Expected Behavior

1. **Session ends** - Hook returns in <100ms
2. **Queue entry created** - JSONL line appended
3. **Processor spawns** - Detached from session
4. **Processing happens** - After session exits
5. **Queue cleaned** - Successful entries removed

---

## Comparison: Before vs After

### Before (Background Spawn)

```bash
# PROBLEM: Orphaned process
(
    bash script.sh >> log 2>&1
) &
```

**Issues:**
- ❌ Parent exits → child orphaned
- ❌ No cleanup
- ❌ No retry on failure
- ❌ Race conditions

### After (Queue-Based)

```bash
# SOLUTION: Queue + detached processor
echo "$entry" >> queue.jsonl
(nohup bash processor.sh >> log 2>&1 &) &
disown
```

**Benefits:**
- ✅ Clean detachment
- ✅ Retry mechanism
- ✅ Concurrency control
- ✅ Graceful degradation

---

## References

- **Ralph Wiggum Plugin**: [GitHub](https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum)
- **Claude Code Hooks**: [Docs](https://code.claude.com/docs/en/hooks)
- **Double-Fork Pattern**: POSIX daemon pattern
- **JSONL Format**: JSON Lines (newline-delimited JSON)

---

## Decision

✅ **Use queue-based async processing** for all stop hook background work

Following Ralph plugin best practices:
- No direct background spawns (`&`)
- Queue work to JSONL file
- Fire-and-forget detached processor
- Lock-based concurrency control
- Graceful degradation and retry

This ensures clean session exits, proper resource management, and reliable async processing.
