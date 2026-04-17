# Spec: with-15-task-cap

This increment was planned when TASK_CAP = 15 was the team-lead default. Under 1.1.0 the cap is 40, but archived increments must still execute cleanly with the old budget.

## User Stories

### US-001: Respect archived task cap
**As a** team lead resuming this increment
**I want** the 15-task budget honored for this agent
**So that** the work executes as it was originally planned.

#### Acceptance Criteria
- [x] AC-US1-01: metadata.json `taskCap: 15` is read and used for this agent
- [x] AC-US1-02: Tasks list of exactly 15 items is executed in order
