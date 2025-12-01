# Tasks: EDA Hooks Architecture

## Status Summary
- Total: 8 tasks
- Completed: 8
- In Progress: 0

---

### T-001: Create Lifecycle Detector
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04
**Status**: [x] completed

Create `lifecycle-detector.sh` that:
- Stores previous metadata status in `.specweave/state/.prev-status-<inc-id>`
- Compares current vs previous on each call
- Fires events: increment.created, increment.done, increment.archived, increment.reopened

---

### T-002: Create US Completion Detector
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04
**Status**: [x] completed

Create `us-completion-detector.sh` that:
- Parses tasks.md for T-XXX entries with "Satisfies ACs: AC-USXXX"
- Groups tasks by US ID
- Checks if ALL tasks for a US are [x] completed
- Parses spec.md for AC-USXXX checkboxes
- Checks if ALL ACs for that US are [x] checked
- Fires user-story.completed when BOTH conditions met
- Stores previous state, fires user-story.reopened on revert

---

### T-003: Create Living Specs Handler
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04
**Status**: [x] completed

Create `living-specs-handler.sh` that:
- Handles increment.created: Creates spec entry in specs/ folder
- Handles increment.done: Marks as complete
- Handles increment.archived: Moves to archive section
- Handles increment.reopened: Restores from archive
- 60 second throttle per increment

---

### T-004: Create Status Line Handler
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04
**Status**: [x] completed

Create `status-line-handler.sh` that:
- Updates ONLY on: user-story.completed, user-story.reopened
- Updates on: increment.done, increment.archived, increment.reopened
- Does NOT update on every task.md edit
- Uses atomic write to status-line.json

---

### T-005: Update Event Queue with Coalescing
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-03
**Status**: [x] completed

Update `enqueue.sh` to:
- Coalesce same events within 10 second window (not 5s)
- Add event priority field (lifecycle=1, us=2, other=3)

---

### T-006: Update Processor with Locking
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02
**Status**: [x] completed

Update `processor.sh` to:
- Use flock for file locking during processing
- Verify single processor per project with PID check
- Increase idle timeout to 60s
- Route lifecycle events to living-specs-handler
- Route US events to status-line-handler

---

### T-007: Update Post-Tool-Use Dispatcher
**User Story**: US-004, US-005
**Satisfies ACs**: AC-US4-04, AC-US5-04
**Status**: [x] completed

Update `post-tool-use.sh` to:
- Call lifecycle-detector.sh for metadata.json changes
- Call us-completion-detector.sh for tasks.md/spec.md changes
- Remove synchronous status-update.sh call
- All heavy work goes through queue

---

### T-008: Add Safety Measures
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04
**Status**: [x] completed

Add safety measures:
- Verify SPECWEAVE_DISABLE_HOOKS check at top of all scripts
- Add timeout wrapper (30s max) for all handler calls
- Add error logging to `.specweave/logs/hooks.log`
- Ensure all scripts exit 0 (never crash Claude)
