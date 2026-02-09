---
description: Show status of parallel development agents launched by team-orchestrate. Activates for: team status, agent status, parallel status, check agents.
---

# Team Status

**Show progress of parallel development agents.**

## Usage

```bash
/sw:team-status
```

## What This Skill Does

Reads the parallel session state and each agent's increment to produce a status table.

## Implementation Steps

1. **Read session state** from `.specweave/state/parallel/session.json`
2. **For each agent**, read its increment's `tasks.md` to compute completion percentage
3. **Check agent task status** via TaskOutput (if still running)
4. **Display summary table**

## Output Format

```
Team Status: session-uuid (started 2h ago)

| Agent    | Increment               | Tasks  | Progress | Status  |
|----------|-------------------------|--------|----------|---------|
| frontend | 0193-checkout-frontend  | 5/8    | 62%      | running |
| backend  | 0194-checkout-backend   | 3/6    | 50%      | running |
| shared   | 0195-checkout-shared    | 4/4    | 100%     | done    |

Overall: 12/18 tasks (67%)
```

## Error Handling

- If no session file exists, report "No active team session"
- If an agent's increment is missing, report "increment not found"
- If a task file can't be parsed, show "?" for progress
