---
id: US-003
feature: FS-148
title: Leverage Claude Code's Built-in Session Recovery
status: planned
priority: P1
created: 2025-12-29
project: specweave
external:
  github:
    issue: 953
    url: https://github.com/anton-abyzov/specweave/issues/953
---

# US-003: Leverage Claude Code's Built-in Session Recovery

## User Story

**As a** developer, I want SpecWeave to leverage Claude Code's existing `/resume` and `--continue` commands rather than reinvent session management, so that recovery is consistent with Claude Code UX.

## Background

Claude Code ALREADY has session persistence! `/resume` picks sessions, `--continue` resumes last. SpecWeave should track **increment state** (tasks.md, spec.md), not duplicate Claude's session layer.

## Acceptance Criteria

- [ ] **AC-US3-01**: Track progress in `tasks.md` (source of truth), NOT in separate session state
- [ ] **AC-US3-02**: On `/sw:do`, detect incomplete tasks and continue from last incomplete task
- [ ] **AC-US3-03**: Use Claude Code's `/resume` for session recovery (don't reinvent)
- [ ] **AC-US3-04**: Generate session summary in `.specweave/logs/` on graceful completion
- [ ] **AC-US3-05**: `/sw:progress` shows resumable state based on tasks.md checkboxes
- [ ] **AC-US3-06**: Recovery is **increment-based**, not session-based: "Increment 0148 has 5/12 tasks done. Continuing..."

## Technical Notes

### Recovery Flow

```
User closes tab (crash or intentional)
        │
        ▼
User starts new Claude session
        │
        ▼
Runs /sw:do or /sw:progress
        │
        ▼
SpecWeave reads tasks.md
        │
        ├── 5/12 tasks [x] completed
        ├── 7/12 tasks [ ] pending
        │
        ▼
"Increment 0148: 5/12 tasks done. Continuing from T-006..."
```

### Why Increment-Based Recovery?

| Approach | Pros | Cons |
|----------|------|------|
| Session-based | Exact conversation state | Duplicates Claude Code, complex |
| **Increment-based** | Simple, source of truth | Can't recover conversation context |

**Winner**: Increment-based. Tasks.md checkboxes ARE the state.

### Claude Code Commands to Use

```bash
# Resume previous session (keeps full conversation)
/resume

# Continue from CLI (e.g., in scheduled runs)
claude --continue

# Pick specific session
claude --resume "auth-feature"
```

SpecWeave doesn't need to implement any of this - it's built in!
