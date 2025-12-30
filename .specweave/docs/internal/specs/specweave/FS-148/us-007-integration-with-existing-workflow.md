---
id: US-007
feature: FS-148
title: Auto-Aware Existing Workflow Commands
status: planned
priority: P1
created: 2025-12-29
project: specweave
external:
  github:
    issue: 957
    url: https://github.com/anton-abyzov/specweave/issues/957
---

# US-007: Auto-Aware Existing Workflow Commands

## User Story

**As a** developer, I want existing commands (`/sw:do`, `/sw:done`, `/sw:next`, `/sw:progress`, `/sw:status`) to be auto-aware by default, showing session info and continuing execution automatically.

## Background

No new commands needed - existing commands become smarter.

## Acceptance Criteria

- [ ] **AC-US7-01**: Update `/sw:do` to continue until ALL tasks complete (stop hook loop by default)
- [ ] **AC-US7-02**: Update `/sw:do` to add `--manual` flag to opt-out of auto-continuation
- [ ] **AC-US7-03**: Update `/sw:next` to auto-transition and continue execution by default
- [ ] **AC-US7-04**: Update `/sw:next` to show queue and dependencies when auto session active
- [ ] **AC-US7-05**: Update `/sw:done` to auto-transition to next queued increment
- [ ] **AC-US7-06**: Update `/sw:progress` to show auto session info (iteration, cost, queue, circuit breakers)
- [ ] **AC-US7-07**: Update `/sw:status` to show auto session indicator and pending human gates
- [ ] **AC-US7-08**: All commands respect existing PM validation gates (tasks, tests, docs)
- [ ] **AC-US7-09**: All commands update tasks.md and spec.md checkboxes via existing Edit operations
- [ ] **AC-US7-10**: When no auto session active, commands behave as before (backwards compatible)

## Technical Notes

### Command Behavior Changes

| Command | Without Auto Session | With Auto Session |
|---------|---------------------|-------------------|
| `/sw:do` | Execute tasks, stop when done | Loop until ALL tasks complete |
| `/sw:next` | Suggest next increment | Auto-transition and continue |
| `/sw:done` | Close increment | Close + auto-start next |
| `/sw:progress` | Show basic progress | + iteration, cost, circuit breakers |
| `/sw:status` | Show increment status | + auto session indicator |

### Backwards Compatibility

```typescript
function isAutoSessionActive(): boolean {
  const sessionPath = '.specweave/state/auto-session.json';
  return fs.existsSync(sessionPath);
}

// All commands check this first
if (options.manual || !isAutoSessionActive()) {
  // Legacy behavior
} else {
  // Auto-aware behavior
}
```

### Manual Flag Usage

```bash
# Opt-out of auto behavior for single command
/sw:do --manual        # Execute tasks but don't loop
/sw:next --manual      # Show next without auto-starting
/sw:done --manual      # Close without auto-transitioning
```
