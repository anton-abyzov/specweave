---
name: close-all
description: Batch-close all complete increments by delegating each one to `sw:done`. Discovers active/ready-for-review increments with zero pending tasks, then iterates and calls `sw:done` per increment. Use when saying "close all", "close stuck increments", or "batch close".
argument-hint: "[--dry-run]"
---

# Batch Close All Complete Increments

Closes all active increments that have reached 100% task completion by delegating each one to `sw:done`. This skill is a thin batch-discovery loop; all actual closure logic (gates, reports, sync) lives in `sw:done`.

## Step 1: Discover Closeable Increments

```bash
for meta in $(find .specweave/increments -maxdepth 2 -name "metadata.json" | sort); do
  st=$(jq -r '.status' "$meta" 2>/dev/null)
  [ "$st" != "active" ] && [ "$st" != "in-progress" ] && [ "$st" != "ready_for_review" ] && continue
  d=$(dirname "$meta"); id=$(basename "$d"); tasks="$d/tasks.md"
  [ ! -f "$tasks" ] && continue
  pending=$(grep -c '\[ \]' "$tasks" 2>/dev/null || echo 0)
  done_count=$(grep -c '\[x\]' "$tasks" 2>/dev/null || echo 0)
  if [ "$pending" -eq 0 ] && [ "$done_count" -gt 0 ]; then
    echo "CLOSEABLE: $id"
  fi
done
```

If no closeable increments are found, report "No increments ready for closure" and stop.

## Step 2: Dry-run

If the user passed `--dry-run`, print the discovered list and stop without closing anything.

## Step 3: Delegate each to `sw:done`

Iterate the discovered list sequentially. For each `<ID>`:

```
Skill({ skill: "sw:done", args: "<ID>" })
```

`sw:done` owns the actual closure workflow: code-review, simplify, grill, judge-llm, PM validation, external sync, and final status transition. Close sequentially to respect dependency order; if `sw:done` fails for an increment, log the failure and continue with the next.

## Step 4: Summary

Print a final summary with CLOSED / FAILED counts per increment. Failures are not retried here — the user re-runs `sw:done <ID>` individually once blockers are resolved.

## Notes

- All gate logic lives in `sw:done`. This skill MUST NOT duplicate closure behaviour.
- Parallel closure is intentionally not supported — race conditions on shared living docs are a real hazard.
