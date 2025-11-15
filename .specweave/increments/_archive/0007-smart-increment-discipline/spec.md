# Spec: Increment Management v2.0 (0007)

**Feature**: 0007-smart-increment-discipline
**Title**: Complete Increment Management System (Test-Aware Planning + Smart Status Management)
**Priority**: P0 (Critical - Core Framework Enhancement)
**Status**: Planned
**Created**: 2025-11-03

---

## Executive Summary

This increment combines TWO major enhancements to SpecWeave's increment management system:

### Part 1: Test-Aware Planning (P1 - Foundation)
**Problem**: Tests are afterthoughts, created separately from tasks without explicit coupling
**Solution**: Acceptance criteria IDs, bidirectional task↔test linking, test-aware-planner agent, optional TDD mode

### Part 2: Smart Status Management (P2 - Enhancement)
**Problem**: Iron rule (cannot start N+1 until N done) too rigid for real-world scenarios
**Solution**: Pause/resume/abandon commands, increment types, intelligent warnings instead of hard blocks

**Why Combined**: Both enhance increment lifecycle - Part 1 improves PLANNING quality, Part 2 improves EXECUTION flexibility

**Delivery Strategy**:
- ✅ Ship Part 1 first (test-aware planning) - Can work independently
- ✅ Ship Part 2 second (status management) - Builds on Part 1 foundation

---

## Problem Statement

### Problem 1: Tests are Afterthoughts (Part 1)

**Current Behavior**:
```markdown
## tasks.md:
- [ ] T-001: Create Core Type Definitions  ← NO test references!
- [ ] T-002: Implement Plugin Loader       ← NO test references!
...
- [ ] T-005: Unit Tests (...)              ← Tests AFTER implementation
```

**Result**: Tests are afterthoughts, no TDD, poor traceability

---

### Problem 2: Iron Rule Too Rigid (Part 2)

**Current Behavior**:
```bash
/specweave:inc "0007-hotfix"
❌ Cannot create new increment!
Close 0006 first or use --force
```

**Real-World Friction**:
- **Hotfix**: Production down, but must `--force` or abandon feature work
- **Blocked**: Waiting for API keys, but can't start unrelated work
- **Prerequisite**: Discovered blocker, but can't create it mid-feature

---

## User Stories

## PART 1: TEST-AWARE PLANNING

### US1: Acceptance Criteria with IDs (P1)

**As a** contributor
**I want** acceptance criteria to have unique IDs
**So that** I can reference them in tasks and tests

**Acceptance Criteria**:
- [ ] **AC-US1-01**: PM Agent generates AC-IDs in format `AC-US{story}-{number}`
  - **Tests**: TC-001, TC-002
  - **Priority**: P1

- [ ] **AC-US1-02**: Each AC-ID includes test references (placeholder filled by test-aware-planner)
  - **Tests**: TC-003
  - **Priority**: P1

- [ ] **AC-US1-03**: Each AC-ID includes task references
  - **Tests**: TC-004
  - **Priority**: P1

---

### US2: Test-Aware Tasks (P1)

**As a** contributor
**I want** tasks to explicitly reference test cases
**So that** I know which tests validate each task

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Each implementation task has "Test Coverage" section listing TC-IDs
  - **Tests**: TC-006, TC-007
  - **Priority**: P1

- [ ] **AC-US2-02**: Test Coverage section includes test file paths
  - **Tests**: TC-008
  - **Priority**: P1

- [ ] **AC-US2-03**: Tasks reference AC-IDs they satisfy
  - **Tests**: TC-010
  - **Priority**: P1

---

### US3: Task-Aware Tests (P1)

**As a** contributor
**I want** test cases to explicitly reference tasks
**So that** I can trace impact when tests change

**Acceptance Criteria**:
- [ ] **AC-US3-01**: Each test case has "Related Tasks" section listing T-IDs
  - **Tests**: TC-012, TC-013
  - **Priority**: P1

- [ ] **AC-US3-02**: Test cases reference AC-IDs they validate
  - **Tests**: TC-014
  - **Priority**: P1

- [ ] **AC-US3-03**: Test cases use Given/When/Then format
  - **Tests**: TC-015
  - **Priority**: P2

---

### US4: test-aware-planner Agent (P1)

**As a** contributor
**I want** an agent that generates tasks and tests together
**So that** they are automatically linked from the start

**Acceptance Criteria**:
- [ ] **AC-US4-01**: Agent reads spec.md (with AC-IDs) and plan.md as input
  - **Tests**: TC-017, TC-018
  - **Priority**: P1

- [ ] **AC-US4-02**: Agent generates tests.md FIRST (maps AC-IDs → TC-IDs)
  - **Tests**: TC-019
  - **Priority**: P1

- [ ] **AC-US4-03**: Agent generates tasks.md SECOND (references TC-IDs)
  - **Tests**: TC-020
  - **Priority**: P1

- [ ] **AC-US4-04**: Agent creates bidirectional links
  - **Tests**: TC-021
  - **Priority**: P1

---

### US5: Optional TDD Mode (P2)

**As a** contributor
**I want** optional TDD mode that enforces test-first workflow
**So that** tests are written before implementation

**Acceptance Criteria**:
- [ ] **AC-US5-01**: TDD mode configurable via .specweave/config.yaml
  - **Tests**: TC-023, TC-024
  - **Priority**: P2

- [ ] **AC-US5-02**: When enabled, tasks include "TDD Workflow" section
  - **Tests**: TC-025
  - **Priority**: P2

- [ ] **AC-US5-03**: TDD Workflow includes expected outcomes (❌ fails first, ✅ passes after)
  - **Tests**: TC-026
  - **Priority**: P3

---

### US6: Test Coverage Validation (P1)

**As a** contributor
**I want** a command that validates test-task coupling
**So that** I can check coverage before marking increment complete

**Acceptance Criteria**:
- [ ] **AC-US6-01**: `/specweave:validate-coverage` command exists
  - **Tests**: TC-028
  - **Priority**: P1

- [ ] **AC-US6-02**: Command generates coverage report (tasks with/without tests)
  - **Tests**: TC-029, TC-030
  - **Priority**: P1

- [ ] **AC-US6-03**: Report shows AC coverage
  - **Tests**: TC-031
  - **Priority**: P1

---

### US7: Enhanced increment-planner (P1)

**As a** contributor
**I want** increment-planner to invoke test-aware-planner automatically
**So that** new increments are test-aware by default

**Acceptance Criteria**:
- [ ] **AC-US7-01**: increment-planner invokes PM Agent with AC-ID generation
  - **Tests**: TC-034
  - **Priority**: P1

- [ ] **AC-US7-02**: increment-planner invokes test-aware-planner after Architect (Step 4)
  - **Tests**: TC-035
  - **Priority**: P1

- [ ] **AC-US7-03**: increment-planner validates test-task coupling (Step 5)
  - **Tests**: TC-036
  - **Priority**: P1

---

## PART 2: SMART STATUS MANAGEMENT

### US8: Pause Blocked Work (P2)

**As a** developer blocked by external dependency
**I want** to pause current increment
**So that** I can start unrelated work without losing context

**Acceptance Criteria**:
- [ ] **AC-US8-01**: `/specweave:pause <id> --reason="..."` marks as paused
  - **Tests**: TC-040
  - **Priority**: P2

- [ ] **AC-US8-02**: Paused increments don't count toward active limit
  - **Tests**: TC-041
  - **Priority**: P2

- [ ] **AC-US8-03**: `/specweave:resume <id>` returns to active state
  - **Tests**: TC-042
  - **Priority**: P2

---

### US9: Abandon Obsolete Work (P2)

**As a** developer with changed requirements
**I want** to abandon incomplete increment
**So that** I can close work that's no longer needed

**Acceptance Criteria**:
- [ ] **AC-US9-01**: `/specweave:abandon <id> --reason="..."` marks as abandoned
  - **Tests**: TC-043
  - **Priority**: P2

- [ ] **AC-US9-02**: Abandoned increments moved to `_abandoned/` folder
  - **Tests**: TC-044
  - **Priority**: P2

- [ ] **AC-US9-03**: Reason documented in metadata
  - **Tests**: TC-045
  - **Priority**: P2

---

### US10: Increment Types (P2)

**As a** developer
**I want** to specify increment type
**So that** framework applies appropriate rules

**Acceptance Criteria**:
- [ ] **AC-US10-01**: `/specweave:inc "title" --type=hotfix|feature|refactor|experiment`
  - **Tests**: TC-046
  - **Priority**: P2

- [ ] **AC-US10-02**: Default type = "feature" (if omitted)
  - **Tests**: TC-047
  - **Priority**: P2

- [ ] **AC-US10-03**: Different limits per type (hotfix=unlimited, feature=2)
  - **Tests**: TC-048
  - **Priority**: P2

---

### US11: Context Switching Warning (P2)

**As a** developer starting 2nd feature
**I want** to see productivity cost warning
**So that** I can make informed decision

**Acceptance Criteria**:
- [ ] **AC-US11-01**: Starting 2nd feature shows context switching cost (20-40%)
  - **Tests**: TC-050
  - **Priority**: P2

- [ ] **AC-US11-02**: Clear options: Continue current, Pause current, Start parallel
  - **Tests**: TC-051
  - **Priority**: P2

- [ ] **AC-US11-03**: User choice saved (not blocked)
  - **Tests**: TC-052
  - **Priority**: P2

---

### US12: Hotfix Bypasses Limits (P2)

**As a** developer with production bug
**I want** to create hotfix increment immediately
**So that** I can fix critical issues without closing feature work

**Acceptance Criteria**:
- [ ] **AC-US12-01**: `--type=hotfix` bypasses all active increment limits
  - **Tests**: TC-055
  - **Priority**: P2

- [ ] **AC-US12-02**: Hotfix increments clearly marked in `/specweave:status`
  - **Tests**: TC-056
  - **Priority**: P2

- [ ] **AC-US12-03**: Can have unlimited hotfixes in parallel
  - **Tests**: TC-057
  - **Priority**: P2

---

## Functional Requirements

### FR-001: Acceptance Criteria ID Format (Part 1)

**Format**: `AC-US{story}-{number}` (e.g., AC-US1-01, AC-US1-02)

**Validation**:
- Must start with `AC-US`
- Must have story number (1-999)
- Must have 2-digit sequential number (01-99)
- Must be unique within increment

---

### FR-002: Test Coverage Section Format (Part 1)

**Format**:
```markdown
**Test Coverage**:
- TC-XXX: {Test type} ({test file path})
- TC-YYY: {Test type} ({test file path})
```

**Validation**:
- Must have "Test Coverage" header
- Each line references TC-ID
- Test file path included
- Or "N/A (documentation)" for non-testable tasks

---

### FR-003: Related Tasks Section Format (Part 1)

**Format**:
```markdown
**Related Tasks**: T-XXX, T-YYY, T-ZZZ
```

---

### FR-004: Increment Metadata Schema (Part 2)

**File**: `.specweave/increments/{id}/metadata.json`

```json
{
  "id": "0007-smart-increment-discipline",
  "status": "active",  // active | paused | blocked | completed | abandoned
  "type": "feature",   // hotfix | feature | refactor | experiment | spike
  "created": "2025-11-03T10:00:00Z",
  "lastActivity": "2025-11-03T15:30:00Z",
  "pausedReason": null,
  "abandonedReason": null
}
```

---

### FR-005: Type-Based Limits (Part 2)

| Type | Max Active | Auto-Abandon | Notes |
|------|-----------|--------------|-------|
| `hotfix` | Unlimited | Never | Critical production fixes |
| `feature` | 2 | Never | Standard features |
| `refactor` | 1 | Never | High focus requirement |
| `experiment` | Unlimited | 14 days | POC/spike work |

---

## Non-Functional Requirements

### NFR-001: Backward Compatibility

**Requirement**: Existing increments (0001-0006) work without modification

**Implementation**:
- New format applies to 0007+
- No migration required for old increments
- Validation commands work with both formats

---

### NFR-002: Performance

- Status checks <10ms
- test-aware-planner completes <2 minutes
- Dependency validation <50ms

---

### NFR-003: Usability

Error messages must be actionable:

**Good**:
```
❌ T-005 has no test references
💡 Add "Test Coverage:" section with TC-IDs
📄 See tasks.md:T-005
```

**Bad**:
```
❌ Validation failed
```

---

## Success Criteria

### Part 1 (Test-Aware Planning):
- ✅ 100% AC coverage (every AC has linked TC-IDs)
- ✅ 100% testable task coverage (every task references tests)
- ✅ 0 "run tests" tasks (tests integrated)
- ✅ Bidirectional linking works (tasks ↔ tests)

### Part 2 (Smart Status Management):
- ✅ <5% of increments use `--force`
- ✅ 80%+ reach "completed" status
- ✅ <2 active increments per user average
- ✅ Hotfixes bypass all limits

---

## Implementation Phases

### Phase 1: Test-Aware Planning (Weeks 1-4) - P1

**Can ship independently**

**Deliverables**:
- ✅ AC-ID format in PM Agent
- ✅ test-aware-planner agent
- ✅ Enhanced increment-planner (Step 4, Step 5)
- ✅ `/specweave:validate-coverage` command
- ✅ Updated templates (tasks.md, tests.md)
- ✅ Optional TDD mode (config.yaml)

**Success Criteria**:
- New increments (0008+) use AC-IDs
- tasks.md and tests.md have bidirectional links
- Validation command works

---

### Phase 2: Smart Status Management (Weeks 5-8) - P2

**Builds on Phase 1 foundation**

**Deliverables**:
- ✅ `/specweave:pause` command
- ✅ `/specweave:resume` command
- ✅ `/specweave:abandon` command
- ✅ `--type` flag in `/specweave:inc`
- ✅ Type-based limit enforcement
- ✅ Context switching warnings
- ✅ Enhanced `/specweave:status`
- ✅ Metadata migration script

**Success Criteria**:
- Can pause/resume/abandon increments
- Hotfixes bypass limits
- Iron rule replaced with intelligent warnings

---

## Out of Scope

### Part 1 (Future):
1. **Living test docs** (`.specweave/docs/internal/testing/`) - Phase 3
2. **Automated test execution** - Focus is planning, not execution
3. **Test code generation** - Agent generates test PLANS, not CODE
4. **Retroactive updates** - Existing increments NOT migrated

### Part 2 (Future):
1. **Dependency tracking** (`blocked-by` relationships) - Future increment
2. **Advanced analytics dashboard** - Future increment
3. **AI-suggested dependencies** - Future enhancement
4. **Team collaboration** (multi-user) - Future increment
5. **Cross-project dependencies** - Future increment

---

## Dependencies

### Internal:
- **increment-planner skill** - Must be enhanced (Step 4, Step 5)
- **PM Agent** - Must generate AC-IDs
- **CLAUDE.md** - Must be updated with new format examples

### External:
- None (all changes internal to SpecWeave)

---

## Risks and Mitigations

### Risk 1: Scope Too Large

**Risk**: Combining both parts = huge increment

**Mitigation**:
- ✅ Phase 1 can ship independently
- ✅ Phase 2 builds on Phase 1 (not parallel)
- ✅ Phase 1 = P1 (ship first), Phase 2 = P2 (ship later)

### Risk 2: Agent Complexity

**Risk**: test-aware-planner uses more tokens

**Mitigation**:
- ✅ Use Haiku for test-aware-planner (fast, cheap)
- ✅ Cache plan.md and spec.md
- ✅ Optimize prompt

### Risk 3: Too Permissive (Part 2)

**Risk**: Removing iron rule leads to scope creep

**Mitigation**:
- ✅ Strong warnings at 2 active features
- ✅ Show context-switching cost metrics
- ✅ Analytics track patterns
- ✅ Feature flag to revert if needed

---

## References

### Internal Docs:
- **Solution Architecture**: [SOLUTION-ARCHITECTURE.md](./SOLUTION-ARCHITECTURE.md)
- **RFC-0007**: [rfc-0007-smart-increment-discipline.md](../../docs/internal/architecture/rfc/rfc-0007-smart-increment-discipline.md)
- **Research Report**: Stored in task output (industry best practices)

### External Resources:
- **Agile AC**: Mike Cohn's User Story format
- **Jira Xray**: Test case linking patterns
- **Azure DevOps**: Requirement-based test suites

---

## Approval

**Status**: Draft → Ready for Planning
**Created**: 2025-11-03
**Next Steps**:
1. Create plan.md (technical architecture for BOTH parts)
2. Create tasks.md (phased implementation - Part 1 then Part 2)
3. Create tests.md (test cases for BOTH parts)
4. Begin Phase 1 implementation

---

**Version**: 2.0 (Combined)
**Last Updated**: 2025-11-03
**Maintainer**: SpecWeave Core Team
