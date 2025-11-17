---
name: specweave:progress
description: Show progress for all active increments with task completion status
---

# Progress Tracking

Simple, fast progress check for all active increments.

## Usage

```bash
/specweave:progress
```

## Implementation

```bash
#!/bin/bash

echo ""
echo "📊 Increment Progress"
echo "================================"
echo ""

# Counters
active_count=0
other_count=0

# Scan all increments
for dir in .specweave/increments/*/; do
  [ ! -d "$dir" ] && continue

  increment=$(basename "$dir")
  metadata="$dir/metadata.json"

  # Skip if no metadata
  [ ! -f "$metadata" ] && continue

  # Get status
  inc_status=$(jq -r '.status' "$metadata" 2>/dev/null)

  # Skip completed/archived
  [ "$inc_status" = "completed" ] && continue
  [ "$inc_status" = "archived" ] && continue

  # Count for summary
  if [ "$inc_status" = "in-progress" ]; then
    active_count=$((active_count + 1))
  else
    other_count=$((other_count + 1))
  fi

  # Get task stats from tasks.md
  tasks_file="$dir/tasks.md"
  if [ -f "$tasks_file" ]; then
    # Count tasks (headers with T-NNN format - both ### and ####)
    total=$(grep -cE '^#{3,4}\s*T-[0-9]' "$tasks_file" 2>/dev/null | tr -d '\n' || echo "0")
    # Count completed (various formats)
    completed=$(grep -cE '(✅ COMPLETE|\[COMPLETED\]|\[x\] Completed)' "$tasks_file" 2>/dev/null | tr -d '\n' || echo "0")

    # Ensure we have valid numbers (fallback to 0 if empty)
    total=${total:-0}
    completed=${completed:-0}

    if [ "$total" -gt 0 ] 2>/dev/null; then
      percent=$((completed * 100 / total))
    else
      percent=0
    fi
  else
    total=0
    completed=0
    percent=0
  fi

  # Display based on status
  if [ "$inc_status" = "in-progress" ]; then
    echo "🟢 ACTIVE: $increment"
    echo "   Status: $inc_status"
    echo "   Tasks: $completed/$total completed ($percent%)"
    echo "   Next: /specweave:do $increment"
    echo ""
  else
    echo "⏸️  $inc_status: $increment"
    echo "   Tasks: $completed/$total ($percent%)"
    echo ""
  fi
done

echo "================================"
echo "Summary:"
echo "  Active increments: $active_count"
echo "  Other non-completed: $other_count"

if [ "$active_count" -eq 0 ]; then
  echo ""
  echo "💡 No active work. Run /specweave:increment to start new work"
elif [ "$active_count" -gt 0 ]; then
  echo ""
  echo "💡 Continue with /specweave:do"
fi

echo ""
```

## Example Output

```
📊 Increment Progress
================================

🟢 ACTIVE: 0037-project-specific-tasks
   Status: in-progress
   Tasks: 72/85 completed (84%)
   Next: /specweave:do 0037-project-specific-tasks

⏸️  planning: 0039-ultra-smart-next-command
   Tasks: 0/45 (0%)

================================
Summary:
  Active increments: 1
  Other non-completed: 1

💡 Continue with /specweave:do
```

## What It Shows

- **Active increments** (in-progress): Shown first with green indicator
- **Other non-completed**: planning, paused, blocked, etc.
- **Task completion**: X/Y completed (Z%)
- **Next action**: Which command to run

**Note**: Skips completed and archived increments.
