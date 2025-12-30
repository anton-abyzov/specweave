---
id: US-011
feature: FS-148
title: TDD Enforcement for Auto Mode
status: planned
priority: P1
created: 2025-12-29
project: specweave
external:
  github:
    issue: 961
    url: https://github.com/anton-abyzov/specweave/issues/961
---

# US-011: TDD Enforcement for Auto Mode

## User Story

**As a** developer, I want auto mode to strongly recommend or enforce TDD (test-first), so that autonomous execution has clear success criteria.

## Background

Tests define "done" objectively. Without tests, how does Claude know it succeeded? TDD provides:
- Clear success criteria (tests pass = done)
- Prevents infinite loops trying to determine completion
- Builds confidence in autonomous code changes
- Enables objective validation gates

## Acceptance Criteria

- [ ] **AC-US11-01**: When starting auto session, check increment's `testMode` setting
- [ ] **AC-US11-02**: If `testMode: test-after`, prompt user to switch to `test-first` for auto mode
- [ ] **AC-US11-03**: Config option `auto.enforceTestFirst: true` blocks auto mode for test-after increments
- [ ] **AC-US11-04**: In auto mode, always write failing tests BEFORE implementation (RED phase)
- [ ] **AC-US11-05**: Run tests after implementation to verify GREEN phase
- [ ] **AC-US11-06**: Coverage gates: block increment closure if coverage < threshold
- [ ] **AC-US11-07**: Test results drive "done" determination, not subjective judgment

## Technical Notes

### Test Mode Detection

```typescript
// In session initialization
const increment = await loadIncrement(incrementId);
const testMode = increment.spec?.testMode || 'test-after';

if (testMode === 'test-after' && config.auto.enforceTestFirst) {
  throw new Error('Auto mode requires test-first development');
}
```

### TDD Flow in Auto Mode

```
1. Read task from tasks.md
2. Write failing test (RED)
3. Run tests - verify FAIL
4. Implement minimal code (GREEN)
5. Run tests - verify PASS
6. Refactor if needed
7. Mark task complete
```

### Coverage Integration

```json
{
  "auto": {
    "enforceTestFirst": true,
    "coverageThreshold": 80,
    "coverageCommand": "npm run test:coverage"
  }
}
```
