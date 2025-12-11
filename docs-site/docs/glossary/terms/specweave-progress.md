---
id: specweave-progress
title: /sw:progress Command
sidebar_label: specweave:progress
---

# /sw:progress Command

The **`/sw:progress`** command shows detailed progress for active [increments](/docs/glossary/terms/increments).

## What It Does

**Key information:**
- Task completion status (X/Y tasks, Z%)
- Time tracking (elapsed, estimated remaining)
- Current phase and next phase
- Recent completions
- Upcoming tasks

## Usage

```bash
# Show all active increments
/sw:progress

# Show specific increment
/sw:progress 0007
```

## Output Example

```bash
$ /sw:progress 0007

📊 Progress: 0007-user-authentication

📈 Overall: 60% complete (25/42 tasks)

⏱️ Time:
  - Elapsed: 1.2 weeks
  - Remaining: 0.8 weeks (estimated)

📍 Current Phase: Implementation (Phase 3/5)
  └── Next: Testing (Phase 4/5)

✅ Recent Completions:
  - T-020: Add password hashing (2h ago)
  - T-019: Create login endpoint (4h ago)
  - T-018: Set up JWT tokens (yesterday)

📝 Upcoming Tasks:
  - T-021: Add rate limiting [next]
  - T-022: Implement refresh tokens
  - T-023: Add session management

💡 Estimate: Complete in ~3 days at current pace
```

## Progress Calculation

Progress is calculated from [tasks.md](/docs/glossary/terms/tasks-md):

```typescript
// Count completed tasks: [x] or [X]
const completed = tasks.filter(t => t.status === 'completed');

// Calculate percentage
const progress = (completed.length / total.length) * 100;
```

## Phases

Typical increment phases:

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1. Setup | T-001 to T-005 | Project scaffolding |
| 2. Core | T-006 to T-015 | Main functionality |
| 3. Implementation | T-016 to T-030 | Full features |
| 4. Testing | T-031 to T-038 | Test coverage |
| 5. Polish | T-039 to T-042 | Documentation, cleanup |

## Related

- [tasks.md](/docs/glossary/terms/tasks-md) - Task tracking
- [Increments](/docs/glossary/terms/increments) - Work units
- [/sw:do](/docs/glossary/terms/specweave-do) - Execute tasks
- [/sw:status](/docs/glossary/terms/specweave-status) - Overview of all increments
- [WIP Limits](/docs/glossary/terms/wip-limits) - Work-in-progress limits
