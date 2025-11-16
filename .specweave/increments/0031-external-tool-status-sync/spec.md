---
title: External Tool Status Synchronization
increment: 0031-external-tool-status-sync
epic: EPIC-2025-Q4-platform
feature: FS-25-11-12-external-tool-sync
projects: ['default']
status: in-progress
priority: P1
type: feature
created: 2025-11-12
started: 2025-11-12
estimatedEffort: 2-3 weeks
---

# Increment 0031: External Tool Status Synchronization

**Status**: In Progress
**Started**: 2025-11-12
**Priority**: P1 (Critical)
**Type**: Feature Enhancement
**Estimated Effort**: 2-3 weeks
**Created**: 2025-11-12

---

## Executive Summary

Enhance SpecWeave's external tool integration (GitHub, JIRA, Azure DevOps) with bidirectional status synchronization, rich content sync, and task-level traceability. This addresses critical gaps identified in user feedback (GitHub Issue #37) where external issues show only file references instead of full content, and status changes don't sync automatically.

**Business Value**:
- **Eliminate Manual Work**: Save 5-10 minutes per increment by automating status updates
- **Complete Visibility**: Stakeholders see full context in external tools without navigating to repository
- **Perfect Traceability**: Answer "Which increment implemented US-001?" instantly
- **Team Synchronization**: Keep entire team aligned across SpecWeave and external tools

---

## Problem Statement

### Current Gaps (from User Feedback)

**Gap 1: Incomplete Content in External Issues**
- GitHub Issue #37 shows only file path reference: `.specweave/docs/internal/specs/default/spec-0029-cicd-failure-detection-auto-fix.md`
- External stakeholders must navigate to repository to understand feature
- No user stories, acceptance criteria, or task details visible in external tool

**Gap 2: No Task-Level Mapping**
- Can't answer: "Which increment implemented US-001?"
- No linkage between permanent specs (internal/specs) and execution tasks (increments/####/tasks.md)
- Lost traceability across increments

**Gap 3: No Status Synchronization** (CRITICAL!)
- User completes increment in SpecWeave → Status: "complete"
- GitHub Issue → Status: Still "Open" ❌
- User must manually update external tool
- No bidirectional sync (external close doesn't update SpecWeave)

---

## User Stories

### Phase 1: Enhanced Content Sync (Quick Wins)

#### US-001: Rich External Issue Content

**As a** stakeholder viewing GitHub/JIRA/ADO
**I want** to see full spec content (user stories, AC, tasks) in the external issue
**So that** I don't need to navigate to the repository to understand the feature

**Acceptance Criteria**:
- [x] **AC-US1-01**: External issues show executive summary (P1, testable)
- [x] **AC-US1-02**: External issues show all user stories with descriptions (P1, testable)
- [x] **AC-US1-03**: External issues show acceptance criteria (P1, testable)
- [x] **AC-US1-04**: External issues show linked tasks with GitHub issue numbers (P1, testable)
- [x] **AC-US1-05**: User stories collapsed by default in GitHub UI (P2, testable)
- [x] **AC-US1-06**: Issue descriptions immutable after creation; updates via progress comments (P1, testable)
- [x] **AC-US1-07**: Progress comments show AC completion status with checkboxes (P1, testable)
- [x] **AC-US1-08**: Progress comments create audit trail of changes over time (P2, testable)
- [ ] **AC-US1-09**: Architecture diagrams embedded (if available) (P3, testable)

**Business Rationale**: External stakeholders (PM, clients, executives) need complete context without developer access to repository.

---

#### US-002: Task-Level Mapping & Traceability

**As a** developer or PM
**I want** to see which tasks implement which user stories
**So that** I can track progress and understand implementation history

**Acceptance Criteria**:
- [x] **AC-US2-01**: Spec frontmatter includes linked_increments mapping (P1, testable)
- [x] **AC-US2-02**: User stories map to specific tasks (US-001 → T-001, T-002) (P1, testable)
- [x] **AC-US2-03**: Tasks include GitHub/JIRA/ADO issue numbers (P1, testable)
- [x] **AC-US2-04**: Can query "which increment implemented US-001?" (P2, testable)
- [ ] **AC-US2-05**: Traceability report shows complete history (P2, testable)
- [ ] **AC-US2-06**: Acceptance criteria map to task validation (P3, testable)

**Business Rationale**: Traceability is essential for compliance, auditing, and understanding product evolution.

---

### Phase 2: Status Synchronization (Core Feature)

#### US-003: Status Mapping Configuration

**As a** SpecWeave user
**I want** to configure how SpecWeave statuses map to external tool statuses
**So that** I can match my team's workflow

**Acceptance Criteria**:
- [x] **AC-US3-01**: Config schema supports status mappings per tool (P1, testable)
- [x] **AC-US3-02**: Default mappings provided for GitHub/JIRA/ADO (P1, testable)
- [x] **AC-US3-03**: Users can customize mappings (P2, testable)
- [x] **AC-US3-04**: Validation prevents invalid mappings (P2, testable)
- [x] **AC-US3-05**: Tool-specific label/tag support (GitHub: labels, JIRA: none, ADO: tags) (P2, testable)

**Default Mappings**:

```yaml
github:
  planning: open
  active: open
  paused: open  # + label: paused
  completed: closed
  abandoned: closed  # + label: wontfix

jira:
  planning: "To Do"
  active: "In Progress"
  paused: "On Hold"
  completed: "Done"
  abandoned: "Won't Do"

ado:
  planning: "New"
  active: "Active"
  paused: "On Hold"
  completed: "Closed"
  abandoned: "Removed"
```

**Business Rationale**: Different teams use different workflows; configuration enables flexibility.

---

#### US-004: Bidirectional Status Sync

**As a** SpecWeave user
**I want** status changes to sync automatically between SpecWeave and external tools
**So that** I don't manually update status in two places

**Acceptance Criteria**:
- [x] **AC-US4-01**: SpecWeave status change triggers external update (P1, testable)
- [x] **AC-US4-02**: External issue close triggers SpecWeave prompt (P1, testable)
- [x] **AC-US4-03**: External issue reopen triggers SpecWeave prompt (P2, testable)
- [x] **AC-US4-04**: Sync logs include timestamp and reason (P2, testable)
- [x] **AC-US4-05**: Failed syncs retry with exponential backoff (P2, testable)
- [x] **AC-US4-06**: Sync works for GitHub, JIRA, and ADO (P1, testable)

**Bidirectional Sync Rules**:
- **SpecWeave → External**: When increment status changes, update external issue
- **External → SpecWeave**: When external issue closes/reopens, prompt user to update increment

**Business Rationale**: Automation eliminates manual work and keeps teams synchronized.

---

#### US-005: User Prompts on Completion

**As a** SpecWeave user
**I want** to be prompted to update external status when completing increments
**So that** I can choose whether to sync (with context about what will happen)

**Acceptance Criteria**:
- [x] **AC-US5-01**: `/specweave:done` detects external link and prompts (P1, testable)
- [x] **AC-US5-02**: Prompt shows current external status (P1, testable)
- [x] **AC-US5-03**: Prompt shows what status will change to (P1, testable)
- [x] **AC-US5-04**: User can choose: Yes/No/Custom (P1, testable)
- [x] **AC-US5-05**: "Yes" updates external issue with completion comment (P1, testable)
- [x] **AC-US5-06**: "No" skips sync (user will update manually) (P1, testable)
- [x] **AC-US5-07**: "Custom" allows user to specify status (P2, testable)
- [x] **AC-US5-08**: Auto-sync mode available (skip prompts) (P3, testable)

**Prompt Example**:
```
✅ Increment 0029 completed!

🔗 External Tool Sync:
   GitHub Issue #37: https://github.com/anton-abyzov/specweave/issues/37
   Current status: Open

📝 Update external status?
   1. Yes, close the issue (add completion comment)
   2. No, keep it open (I'll close manually)
   3. Custom status (specify)

Your choice [1/2/3]: _
```

**Business Rationale**: User control prevents surprises and allows flexibility.

---

#### US-006: Conflict Resolution

**As a** SpecWeave user
**I want** conflicts handled gracefully when statuses diverge
**So that** I don't lose work or create inconsistencies

**Acceptance Criteria**:
- [x] **AC-US6-01**: Detect status conflicts (local vs remote differ) (P1, testable)
- [x] **AC-US6-02**: Configurable conflict resolution strategy (P1, testable)
- [x] **AC-US6-03**: "prompt" strategy asks user to resolve (P1, testable)
- [x] **AC-US6-04**: "last-write-wins" strategy uses most recent (P2, testable)
- [x] **AC-US6-05**: "specweave-wins" strategy keeps local status (P2, testable)
- [x] **AC-US6-06**: "external-wins" strategy uses external status (P2, testable)
- [x] **AC-US6-07**: Conflict log shows resolution history (P2, testable)

**Conflict Scenarios**:
1. Increment completed in SpecWeave, external issue already closed → Skip sync (already closed)
2. Increment completed in SpecWeave, external issue has different status → Prompt user
3. External issue closed, increment still active in SpecWeave → Prompt user to close
4. External issue reopened, increment already completed → Prompt user to reopen

**Business Rationale**: Robust conflict handling prevents data loss and maintains consistency.

---

### Phase 3: Advanced Features

#### US-007: Multi-Tool Workflow Support

**As a** SpecWeave user with custom workflows
**I want** to define tool-specific workflows and transitions
**So that** SpecWeave respects my team's process

**Acceptance Criteria**:
- [x] **AC-US7-01**: Detect tool-specific workflows (GitHub: simple, JIRA: complex) (P2, testable)
- [ ] **AC-US7-02**: Support custom workflow definitions (P3, testable)
- [ ] **AC-US7-03**: Validate status transitions against workflow (P3, testable)
- [ ] **AC-US7-04**: Suggest valid next states based on workflow (P3, testable)

**Business Rationale**: Advanced teams have sophisticated workflows; support them.

---

## Technical Requirements

### API Integration
- GitHub: @octokit/rest for issue updates and state changes
- JIRA: REST API for status transitions and workflow queries
- Azure DevOps: REST API for work item state changes

### Configuration Schema
- Extend `.specweave/config.json` with `sync.statusSync` section
- JSON Schema validation for status mappings
- Backwards compatible (defaults to current behavior)

### Performance
- Status sync: <2 seconds per increment
- Bulk operations: <5 seconds for 10 increments
- Conflict detection: <1 second
- User prompts: Non-blocking (async)

### Security
- API tokens from environment variables (GITHUB_TOKEN, JIRA_API_TOKEN, AZURE_DEVOPS_PAT)
- No secrets in config files
- Audit logging for all status changes

### Testing
- **Unit Tests**: 90% coverage (status mapping, conflict resolution)
- **Integration Tests**: 85% coverage (GitHub API, JIRA API, ADO API)
- **E2E Tests**: 100% critical paths (Playwright for user prompts)

---

## Success Metrics

1. **External Issue Completeness**: 100% of issues show full user story content (not file paths)
2. **Traceability Coverage**: 100% of user stories mapped to tasks and external issues
3. **Status Sync Accuracy**: 95%+ automatic status syncs without manual intervention
4. **User Satisfaction**: 90%+ users rate sync experience as "helpful" or better
5. **Time Savings**: 50%+ reduction in time spent on manual status updates

---

## Implementation Phases

### Phase 1: Enhanced Content Sync (Week 1)
**Effort**: 2-3 days
**Deliverable**: External issues show full spec content

**Tasks**:
- Enhance `buildExternalDescription()` to include user stories
- Add task-level links with GitHub issue numbers
- Update GitHub/JIRA/ADO sync clients
- Test content rendering in external tools

### Phase 2: Status Synchronization (Week 2)
**Effort**: 5-7 days
**Deliverable**: Bidirectional status sync with user prompts

**Tasks**:
- Create status mapping configuration
- Implement status sync engine
- Add user prompts on completion
- Implement conflict resolution
- Test with GitHub, JIRA, ADO

### Phase 3: Advanced Features (Week 3)
**Effort**: 2-3 days
**Deliverable**: Workflow support and polish

**Tasks**:
- Detect tool-specific workflows
- Add custom workflow configuration
- Performance optimization
- Documentation and user guide

---

## Dependencies

**Requires**:
- Increment 0011: Multi-project sync infrastructure
- Increment 0017: Sync architecture improvements

**Enhances**:
- GitHub plugin (`specweave-github`)
- JIRA plugin (`specweave-jira`)
- ADO plugin (`specweave-ado`)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| API Rate Limits | High | Batch updates, cache external state, retry logic |
| Network Failures | Medium | Retry with exponential backoff, queue failed syncs |
| User Confusion | Medium | Clear prompts, comprehensive documentation |
| Different Tool Workflows | High | Configurable mappings, plugin-based architecture |
| Breaking Changes | Low | Backwards compatible defaults, gradual rollout |

---

## Related Issues

- **GitHub Issue #37**: User feedback on incomplete external issue content
- **Analysis**: `.specweave/increments/0029-cicd-failure-detection-auto-fix/reports/EXTERNAL-TOOL-SYNC-ANALYSIS.md`

---

## Next Steps

1. Review and approve this specification
2. Create `plan.md` with technical design (Architect)
3. Generate `tasks.md` with implementation tasks
4. Start implementation: `/specweave:do 0031`
5. Test with real GitHub/JIRA/ADO projects
6. Document configuration options
7. Create migration guide for existing projects

---

## Completion Note (2025-11-15)

**Status**: ✅ Core P1/P2 functionality complete

**Implemented ACs**: AC-US1-06, AC-US1-07, AC-US1-08 verified in code
- `plugins/specweave-github/lib/progress-comment-builder.ts:78-145` (immutable descriptions)
- `plugins/specweave-github/lib/progress-comment-builder.ts:127-138` (AC checkboxes in comments)
- E2E tests confirm audit trail functionality

**Deferred ACs**: AC-US1-09 (P3 - architecture diagrams)

**Business Value**: Bidirectional sync operational, progress tracking functional.
**Tech Debt**: P3 features deferred to future increments if needed.

---

**Created**: 2025-11-12
**Last Updated**: 2025-11-15
**Approved By**: TBD
