---
id: US-010
feature: FS-148
title: Intelligent "Ask User When Stuck" Behavior
status: planned
priority: P1
created: 2025-12-29
project: specweave
external:
  github:
    issue: 960
    url: https://github.com/anton-abyzov/specweave/issues/960
---

# US-010: Intelligent "Ask User When Stuck" Behavior

## User Story

**As a** developer, I want auto mode to intelligently pause and ask me when it's stuck or needs clarification, so that execution can continue without getting into infinite loops.

## Background

Auto mode should ask (not guess) when genuinely uncertain. This prevents wasted iterations and ensures human oversight at critical decision points.

## Acceptance Criteria

- [ ] **AC-US10-01**: When no work available (empty queue, no backlog, no external items), prompt user for next action
- [ ] **AC-US10-02**: When tests fail 3x consecutively, offer options: review error, fix manually, skip task
- [ ] **AC-US10-03**: When ambiguous technical decision arises, present options with tradeoffs
- [ ] **AC-US10-04**: When dependency is blocked (increment depends on incomplete work), offer: wait, skip, ask
- [ ] **AC-US10-05**: When "stuck" (no progress for N iterations), escalate to user with context
- [ ] **AC-US10-06**: Track "stuck" metrics: consecutive failures, no-progress iterations, blocked time

## Technical Notes

### Stuck Detection

```typescript
interface StuckMetrics {
  consecutiveFailures: number;      // Tests failing repeatedly
  noProgressIterations: number;     // Iterations without task completion
  blockedTime: number;              // Time waiting on dependencies
  lastSuccessfulAction: Date;       // For timeout detection
}

function isStuck(metrics: StuckMetrics): boolean {
  return (
    metrics.consecutiveFailures >= 3 ||
    metrics.noProgressIterations >= 5 ||
    metrics.blockedTime > 30 * 60 * 1000  // 30 minutes
  );
}
```

### User Prompt Patterns

**No Work Available:**
```
🤔 Auto mode has nothing to work on.

Options:
1. Create new increment: Describe what you'd like to build
2. Import external items: Check GitHub/JIRA for new work
3. Exit auto mode: Return to manual control

What would you like to do?
```

**Tests Failing:**
```
⚠️ Tests have failed 3 times for task T-005.

Error: Expected 200, got 404

Options:
1. Show me the full error - I'll review and fix
2. Skip this task - move to next
3. Retry with different approach

What would you like to do?
```

**Ambiguous Decision:**
```
🔀 Technical decision needed for authentication implementation.

Options:
A. JWT tokens (stateless, scalable, larger payload)
B. Session cookies (stateful, simpler, smaller payload)
C. Both (JWT for API, cookies for web)

Which approach should I use?
```

### Integration with Stop Hook

When stuck, the stop hook receives:
```json
{
  "decision": "block",
  "reason": "User input required",
  "prompt": "[stuck prompt content]",
  "waitForUser": true
}
```

This ensures Claude doesn't exit but waits for user response.
