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
#
# Instant progress tracking (v0.32.0+)
# Uses pre-computed dashboard cache for <10ms response time
#

# Call instant bash script (reads from cache, no Node.js needed)
bash "$(dirname "${BASH_SOURCE[0]}")"/../scripts/read-progress.sh "$@"
```

## Example Output

### Legacy Format (no User Stories)
```
📊 Increment Progress
============================================================

🟢 ACTIVE: 0037-project-specific-tasks
   ████████████████████████░░░░░░ 84% (72/85 tasks)

   Next: /specweave:do 0037-project-specific-tasks

============================================================
Summary:
  Active increments: 1
  Other non-completed: 0

💡 Continue with /specweave:do
```

### Enhanced Format (with User Story grouping)
```
📊 Increment Progress
============================================================

⏸️  ACTIVE: 0047-us-task-linkage
   ██████████████████░░░░░░░░░░░░ 59% (13/22 tasks)

   Progress by User Story:
   ✅ US-001: ████████████████████ 100% (4/4)
   ✅ US-002: ████████████████████ 100% (3/3)
   ├─ US-003: ████████████░░░░░░░░ 60% (3/5)
   ✅ US-004: ████████████████████ 100% (3/3)
   ├─ US-005: ░░░░░░░░░░░░░░░░░░░░ 0% (0/4)
   ├─ US-006: ░░░░░░░░░░░░░░░░░░░░ 0% (0/3)

   Resume: /specweave:resume 0047-us-task-linkage

============================================================
Summary:
  Active increments: 0
  Other non-completed: 1

💡 No active work. Run /specweave:increment to start new work
```

## What It Shows

- **Overall progress**: Visual bar + percentage + task count
- **Per-User Story progress** (if US linkage exists): Completion status for each US
- **Progress bars**: Color-coded (green ≥80%, yellow 50-79%, red <50%)
- **Completion indicators**: ✅ for 100% complete USs
- **Orphan tasks warning**: If tasks exist without User Story linkage
- **Next action**: Command to continue work

**Note**: Skips completed and archived increments. Automatically detects and displays US-level progress for increments using US-task linkage (v0.23.0+).
