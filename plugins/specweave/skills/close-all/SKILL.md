---
name: close-all
description: Batch-close all increments at 100% completion. Discovers "ready for review" and "active" increments with all tasks done, then closes each via sw-closer subagent (Claude Code) or sw:done (non-cloud). Use when saying "close all", "close stuck increments", "batch close".
argument-hint: "[--dry-run]"
---

# Batch Close All Complete Increments

Close all increments that are at 100% task completion but have not been formally closed via `sw:done`.

## Step 1: Discover Closeable Increments

```bash
echo "=== Scanning for closeable increments ==="
for meta in $(find .specweave/increments -maxdepth 2 -name "metadata.json" 2>/dev/null | sort); do
  st=$(jq -r '.status' "$meta" 2>/dev/null)
  # Only consider active/in-progress/ready_for_review
  [ "$st" != "active" ] && [ "$st" != "in-progress" ] && [ "$st" != "ready_for_review" ] && continue
  d=$(dirname "$meta")
  id=$(basename "$d")
  # Check for pending tasks
  tasks_file="$d/tasks.md"
  [ ! -f "$tasks_file" ] && continue
  pending=$(grep -c '\[ \]' "$tasks_file" 2>/dev/null || echo "0")
  total=$(grep -c '\[x\]' "$tasks_file" 2>/dev/null || echo "0")
  if [ "$pending" -eq 0 ] && [ "$total" -gt 0 ]; then
    echo "CLOSEABLE: $id (status: $st, tasks: $total/$total)"
  fi
done
```

If no closeable increments found, report "No increments ready for closure" and stop.

## Step 2: Check for --dry-run

If the user passed `--dry-run`, print the list of closeable increments and stop. Do not close anything.

## Step 3: Close Each Increment

### Step 3a: Claude Code (Agent tool available — preferred)

For each closeable increment, spawn an `sw-closer` subagent in a fresh context:

```typescript
Agent({
  subagent_type: "sw:sw-closer",
  prompt: "Close increment <ID>. Increment path: .specweave/increments/<ID>/",
  description: "Close increment <ID>"
})
```

**Close sequentially** (one at a time) to respect dependency order and avoid race conditions.

Wait for each sw-closer to return before spawning the next. If a closer fails, log the failure and continue to the next increment.

### Step 3b: Non-cloud fallback (no Agent tool)

For each closeable increment, invoke closure directly:

```
Skill({ skill: "sw:done", args: "<increment-id>" })
```

Non-cloud tools have fresh context per skill invocation, so inline closure works without overflow.

## Step 4: Summary

Print a summary table of results:

```
BATCH CLOSURE SUMMARY
═══════════════════════════════════════════
ID                              Status    Reason
──────────────────────────────  ────────  ──────
0593-fix-refresh-plugins        CLOSED    All gates passed
0589-cli-complete-improvements  FAILED    Gate 1: grill BLOCKER found
0587-fix-github-sync-dedup      CLOSED    All gates passed
═══════════════════════════════════════════
Closed: 2 | Failed: 1 | Total: 3
```
