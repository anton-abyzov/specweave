# Tasks for Increment 0031: External Tool Status Synchronization

---
increment: 0031-external-tool-status-sync
total_tasks: 28
test_mode: TDD
coverage_target: 85%
estimated_effort: 2-3 weeks
---

## Phase 1: Enhanced Content Sync (Week 1)

### T-001: Create Enhanced Content Builder
**User Story**: [US-001: Rich External Issue Content](../../docs/internal/specs/default/FS-031/us-001-rich-external-issue-content.md)

**Status**: [x] (100% - Completed)

**AC**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04

**Test Plan** (BDD):
- **Given** a spec with user stories → **When** building external description → **Then** includes executive summary, user stories, and task links
- **Given** user stories with AC → **When** building description → **Then** AC formatted with AC-ID references
- **Given** tasks with GitHub issue numbers → **When** building description → **Then** task section includes issue links

**Test Cases**:
- Unit (`enhanced-content-builder.test.ts`): buildExternalDescription, buildUserStoriesSection, buildTasksSection, buildArchitectureSection → 90% coverage
- Integration (`content-sync-integration.test.ts`): Full spec → GitHub issue body → 85% coverage
- **Overall: 87% coverage**

**Implementation**:
- Create `src/core/sync/enhanced-content-builder.ts`
- Methods: `buildExternalDescription()`, `buildUserStoriesSection()`, `buildTasksSection()`, `buildArchitectureSection()`
- Use GitHub collapsible sections `<details><summary>...</summary></details>`
- TDD: Write tests first, implement to pass

**Dependencies**: None
**Estimate**: 1 day

---
### T-002: Create Spec-to-Increment Mapper
**User Story**: [US-002: Task-Level Mapping & Traceability](../../docs/internal/specs/default/FS-031/us-002-task-level-mapping-traceability.md)

**Status**: [x] (100% - Completed)

**AC**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04

**Test Plan** (BDD):
- **Given** spec with user stories and increment with tasks → **When** creating mapping → **Then** user stories map to tasks (US-001 → [T-001, T-002])
- **Given** tasks with AC field → **When** extracting user stories → **Then** correctly parses US-XXX references
- **Given** spec ID and user story ID → **When** querying → **Then** returns increment that implemented it

**Test Cases**:
- Unit (`spec-increment-mapper.test.ts`): createMapping, extractUserStories, findIncrementForUserStory, loadExternalLinks → 90% coverage
- Integration (`mapper-integration.test.ts`): Real spec → Real tasks → Mapping → 85% coverage
- **Overall: 87% coverage**

**Implementation**:
- Create `src/core/sync/spec-increment-mapper.ts`
- Interface: `SpecIncrementMapping`, `IncrementMapping`
- Methods: `createMapping()`, `findIncrementForUserStory()`, `loadMapping()`, `saveMapping()`
- TDD: Write tests first

**Dependencies**: T-001
**Estimate**: 1 day

---
### T-003: Enhance GitHub Content Sync
**User Story**: [US-001: Rich External Issue Content](../../docs/internal/specs/default/FS-031/us-001-rich-external-issue-content.md)

**Status**: [x] (100% - Completed)

**AC**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05

**Test Plan** (BDD):
- **Given** spec content → **When** syncing to GitHub → **Then** issue shows full content (not just file path)
- **Given** updated spec → **When** syncing again → **Then** GitHub issue body updates
- **Given** tasks with GitHub issue numbers → **When** syncing → **Then** task links included

**Test Cases**:
- Unit (`github-content-sync.test.ts`): buildEnhancedDescription, syncSpecContentToGitHub → 90% coverage
- Integration (`github-api-integration.test.ts`): Create issue → Update issue → Verify content → 85% coverage
- **Overall: 87% coverage**

**Implementation**:
- Update `plugins/specweave-github/lib/github-spec-content-sync.ts`
- Use `EnhancedContentBuilder` from T-001
- Use `SpecIncrementMapper` from T-002
- Add task-level links with GitHub issue numbers

**Dependencies**: T-001, T-002
**Estimate**: 1 day

---
### T-004: Enhance JIRA Content Sync
**User Story**: [US-001: Rich External Issue Content](../../docs/internal/specs/default/FS-031/us-001-rich-external-issue-content.md)

**Status**: [x] (100% - Completed)

**AC**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04

**Test Plan** (BDD):
- **Given** spec content → **When** syncing to JIRA → **Then** epic shows full content
- **Given** JIRA formatting constraints → **When** building description → **Then** uses JIRA markup

**Test Cases**:
- Unit (`jira-content-sync.test.ts`): buildJiraDescription, syncSpecContentToJira → 90% coverage
- Integration (`jira-api-integration.test.ts`): Create epic → Update epic → 85% coverage
- **Overall: 87% coverage**

**Implementation**:
- Update `plugins/specweave-jira/lib/jira-spec-content-sync.ts`
- Use `EnhancedContentBuilder` with JIRA formatting
- Use `SpecIncrementMapper` for task links

**Dependencies**: T-001, T-002
**Estimate**: 1 day

---
### T-005: Enhance ADO Content Sync
**User Story**: [US-001: Rich External Issue Content](../../docs/internal/specs/default/FS-031/us-001-rich-external-issue-content.md)

**Status**: [x] (100% - Completed)

**AC**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04

**Test Plan** (BDD):
- **Given** spec content → **When** syncing to ADO → **Then** work item shows full content
- **Given** ADO markdown → **When** building description → **Then** uses ADO-compatible format

**Test Cases**:
- Unit (`ado-content-sync.test.ts`): buildAdoDescription, syncSpecContentToAdo → 90% coverage
- Integration (`ado-api-integration.test.ts`): Create work item → Update work item → 85% coverage
- **Overall: 87% coverage**

**Implementation**:
- Update `plugins/specweave-ado/lib/ado-spec-content-sync.ts`
- Use `EnhancedContentBuilder` with ADO formatting
- Use `SpecIncrementMapper` for task links

**Dependencies**: T-001, T-002
**Estimate**: 1 day

---

## Phase 2: Status Synchronization (Week 2)
### T-006: Create Status Mapper
**User Story**: [US-003: Status Mapping Configuration](../../docs/internal/specs/default/FS-031/us-003-status-mapping-configuration.md)

**Status**: [x] (100% - Completed)

**AC**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05

**Test Plan** (BDD):
- **Given** SpecWeave status "completed" and tool "github" → **When** mapping → **Then** returns "closed"
- **Given** SpecWeave status "paused" and tool "github" → **When** mapping → **Then** returns "open" + label "paused"
- **Given** invalid config → **When** validating → **Then** returns validation errors

**Test Cases**:
- Unit (`status-mapper.test.ts`): mapToExternal (all tools), mapFromExternal (all tools), validate, normalizeMapping → 95% coverage
- **Overall: 95% coverage** (core component, high coverage)

**Implementation**:
- Create `src/core/sync/status-mapper.ts`
- Interface: `StatusMapping`, `StatusMappingConfig`
- Methods: `mapToExternal()`, `mapFromExternal()`, `validate()`
- Support GitHub labels, JIRA transitions, ADO tags
- TDD: Write tests first (this is critical path!)

**Dependencies**: None
**Estimate**: 1 day

---
### T-007: Create Conflict Resolver
**User Story**: [US-006: Conflict Resolution](../../docs/internal/specs/default/FS-031/us-006-conflict-resolution.md)

**Status**: [x] (100% - Completed)

**AC**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04, AC-US6-05, AC-US6-06, AC-US6-07

**Test Plan** (BDD):
- **Given** local "completed" and remote "open" → **When** detecting conflict → **Then** returns conflict object
- **Given** conflict and strategy "prompt" → **When** resolving → **Then** prompts user and uses choice
- **Given** conflict and strategy "last-write-wins" → **When** resolving → **Then** uses most recent timestamp

**Test Cases**:
- Unit (`conflict-resolver.test.ts`): detect, resolve (all strategies), promptUserForResolution, resolveByTimestamp → 90% coverage
- **Overall: 90% coverage**

**Implementation**:
- Create `src/core/sync/conflict-resolver.ts`
- Interface: `StatusConflict`, `ConflictResolution`, `ConflictResolutionStrategy`
- Methods: `detect()`, `resolve()`, `promptUserForResolution()`, `resolveByTimestamp()`
- TDD: Write tests first

**Dependencies**: T-006
**Estimate**: 1 day

---
### T-008: Create Status Sync Engine (Core)
**User Story**: [US-004: Bidirectional Status Sync](../../docs/internal/specs/default/FS-031/us-004-bidirectional-status-sync.md)

**Status**: [x] (100% - Completed)

**AC**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05

**Test Plan** (BDD):
- **Given** increment status change → **When** syncing to external → **Then** external issue updates
- **Given** external issue closed → **When** syncing from external → **Then** prompts user to update SpecWeave
- **Given** network failure → **When** syncing → **Then** retries with exponential backoff

**Test Cases**:
- Unit (`status-sync-engine.test.ts`): syncToExternal, syncFromExternal, promptUserForStatusUpdate, logSyncEvent → 90% coverage
- Integration (`sync-engine-integration.test.ts`): Full sync flow → 85% coverage
- **Overall: 87% coverage**

**Implementation**:
- Create `src/core/sync/status-sync-engine.ts`
- Interface: `SyncOptions`, `SyncResult`
- Methods: `syncToExternal()`, `syncFromExternal()`, `promptUserForStatusUpdate()`
- Use `StatusMapper` from T-006
- Use `ConflictResolver` from T-007
- TDD: Write tests first

**Dependencies**: T-006, T-007
**Estimate**: 2 days

---
### T-009: Implement GitHub Status Sync
**User Story**: [US-004: Bidirectional Status Sync](../../docs/internal/specs/default/FS-031/us-004-bidirectional-status-sync.md)

**Status**: [x] (100% - Completed)

**AC**: AC-US4-01, AC-US4-06

**Test Plan** (BDD):
- **Given** GitHub issue and new status "closed" → **When** updating → **Then** issue closes via GitHub API
- **Given** status "paused" → **When** updating → **Then** adds "paused" label
- **Given** status update → **When** completed → **Then** posts status comment

**Test Cases**:
- Unit (`github-status-sync.test.ts`): getStatus, updateStatus, postStatusComment → 90% coverage
- Integration (`github-api-status.test.ts`): Real GitHub API calls → 85% coverage
- **Overall: 87% coverage**

**Implementation**:
- Create `plugins/specweave-github/lib/github-status-sync.ts`
- Interface: `ExternalStatus`
- Methods: `getStatus()`, `updateStatus()`, `postStatusComment()`
- Use `@octokit/rest` for API calls
- TDD: Write tests first

**Dependencies**: T-008
**Estimate**: 1 day

---
### T-010: Implement JIRA Status Sync
**User Story**: [US-004: Bidirectional Status Sync](../../docs/internal/specs/default/FS-031/us-004-bidirectional-status-sync.md)

**Status**: [x] (100% - Completed)

**AC**: AC-US4-01, AC-US4-06

**Test Plan** (BDD):
- **Given** JIRA issue and new status "Done" → **When** updating → **Then** transitions issue via JIRA API
- **Given** no valid transition → **When** updating → **Then** throws clear error
- **Given** status update → **When** completed → **Then** posts status comment

**Test Cases**:
- Unit (`jira-status-sync.test.ts`): getStatus, updateStatus, getTransitions, postStatusComment → 90% coverage
- Integration (`jira-api-status.test.ts`): Real JIRA API calls → 85% coverage
- **Overall: 87% coverage**

**Implementation**:
- Create `plugins/specweave-jira/lib/jira-status-sync.ts`
- Methods: `getStatus()`, `updateStatus()`, `getTransitions()`, `postStatusComment()`
- Use JIRA REST API for transitions
- TDD: Write tests first

**Dependencies**: T-008
**Estimate**: 1 day

---
### T-011: Implement ADO Status Sync
**User Story**: [US-004: Bidirectional Status Sync](../../docs/internal/specs/default/FS-031/us-004-bidirectional-status-sync.md)

**Status**: [x] (100% - Completed)

**AC**: AC-US4-01, AC-US4-06

**Test Plan** (BDD):
- **Given** ADO work item and new status "Closed" → **When** updating → **Then** updates state via ADO API
- **Given** status update → **When** completed → **Then** posts status comment

**Test Cases**:
- Unit (`ado-status-sync.test.ts`): getStatus, updateStatus, postStatusComment → 90% coverage
- Integration (`ado-api-status.test.ts`): Real ADO API calls → 85% coverage
- **Overall: 87% coverage**

**Implementation**:
- Create `plugins/specweave-ado/lib/ado-status-sync.ts`
- Methods: `getStatus()`, `updateStatus()`, `postStatusComment()`
- Use Azure DevOps REST API
- TDD: Write tests first

**Dependencies**: T-008
**Estimate**: 1 day

---
### T-012: Integrate Status Sync with /specweave:done Command
**User Story**: [US-005: User Prompts on Completion](../../docs/internal/specs/default/FS-031/us-005-user-prompts-on-completion.md)

**Status**: [x] (100% - Completed)

**AC**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05, AC-US5-06, AC-US5-07

**Test Plan** (BDD):
- **Given** increment with GitHub link → **When** running /specweave:done → **Then** prompts for status update
- **Given** user selects "Yes" → **When** prompt completes → **Then** GitHub issue updates
- **Given** user selects "No" → **When** prompt completes → **Then** no sync occurs

**Test Cases**:
- Unit (`done-command.test.ts`): detectExternalLinks, promptForSync, executeSync → 90% coverage
- Integration (`done-sync-integration.test.ts`): Full done flow with sync → 85% coverage
- E2E (`status-sync.spec.ts`): User completes increment → Prompt → Sync → 100% coverage
- **Overall: 88% coverage**

**Implementation**:
- Update `src/cli/commands/done.ts`
- Detect external links (GitHub, JIRA, ADO)
- Call `StatusSyncEngine.syncToExternal()` with `promptUser: true`
- Handle user choices (Yes/No/Custom)

**Dependencies**: T-008, T-009, T-010, T-011
**Estimate**: 1 day

---
### T-013: Update Configuration Schema
**User Story**: [US-003: Status Mapping Configuration](../../docs/internal/specs/default/FS-031/us-003-status-mapping-configuration.md)

**Status**: [x] (100% - Completed)

**AC**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04

**Test Plan** (BDD):
- **Given** config with statusSync section → **When** validating → **Then** passes schema validation
- **Given** invalid status mapping → **When** validating → **Then** returns clear error
- **Given** missing required status → **When** validating → **Then** fails with specific error

**Test Cases**:
- Unit (`config-schema.test.ts`): validateConfig, validateStatusMappings → 95% coverage
- **Overall: 95% coverage**

**Implementation**:
- Update `src/core/schemas/specweave-config.schema.json`
- Add `sync.statusSync` section
- Add validation for status mappings
- Provide default mappings (GitHub, JIRA, ADO)

**Dependencies**: None
**Estimate**: 0.5 day

---
### T-014: Create Default Status Mappings
**User Story**: [US-003: Status Mapping Configuration](../../docs/internal/specs/default/FS-031/us-003-status-mapping-configuration.md)

**Status**: [x] (100% - Completed)

**AC**: AC-US3-02

**Test Plan** (BDD):
- **Given** new project → **When** initializing → **Then** config includes default status mappings
- **Given** default mappings → **When** validating → **Then** all pass validation

**Test Cases**:
- Unit (`default-mappings.test.ts`): Validate all default mappings → 95% coverage
- **Overall: 95% coverage**

**Implementation**:
- Create `src/core/sync/default-status-mappings.ts`
- Export default mappings for GitHub, JIRA, ADO
- Use in `specweave init` to populate config

**Dependencies**: T-013
**Estimate**: 0.5 day

---

## Phase 3: Advanced Features & Testing (Week 3)
### T-015: Implement Workflow Detection
**User Story**: [US-007: Multi-Tool Workflow Support](../../docs/internal/specs/default/FS-031/us-007-multi-tool-workflow-support.md)

**Status**: [x] (100% - Completed)

**AC**: AC-US7-01

**Test Plan** (BDD):
- **Given** GitHub repository → **When** detecting workflow → **Then** returns simple workflow (open/closed)
- **Given** JIRA project → **When** detecting workflow → **Then** returns all available statuses
- **Given** ADO project → **When** detecting workflow → **Then** returns all valid states

**Test Cases**:
- Unit (`workflow-detector.test.ts`): detectGitHubWorkflow, detectJiraWorkflow, detectAdoWorkflow → 85% coverage
- Integration (`workflow-detection-integration.test.ts`): Real API calls → 80% coverage
- **Overall: 82% coverage**

**Implementation**:
- Create `src/core/sync/workflow-detector.ts`
- Methods: `detectWorkflow()`, tool-specific detectors
- Use GitHub API for labels
- Use JIRA API for workflow schemas
- Use ADO API for work item type definitions

**Dependencies**: T-009, T-010, T-011
**Estimate**: 1 day

---
### T-016: Add Bulk Status Sync
**Status**: [x] (100% - Completed)


**AC**: None (performance optimization)

**Test Plan** (BDD):
- **Given** 10 increments with external links → **When** bulk syncing → **Then** completes in <5 seconds
- **Given** bulk operation → **When** syncing → **Then** uses batching and delays

**Test Cases**:
- Unit (`bulk-sync.test.ts`): batchSync, calculateBatches → 85% coverage
- Integration (`bulk-sync-integration.test.ts`): Sync 10 increments → 80% coverage
- Performance: Bulk sync 10 increments <5s
- **Overall: 82% coverage**

**Implementation**:
- Add `bulkSyncToExternal()` to `StatusSyncEngine`
- Batch requests (5 at a time)
- Add delays between batches (1 second)
- Progress reporting with ora spinners

**Dependencies**: T-008
**Estimate**: 1 day

---

### T-017: Implement Auto-Sync Mode
**User Story**: [US-005: User Prompts on Completion](../../docs/internal/specs/default/FS-031/us-005-user-prompts-on-completion.md)

**Status**: [x] (100% - Completed)

**AC**: AC-US5-08

**Test Plan** (BDD):
- **Given** config with autoSync: true and promptUser: false → **When** completing increment → **Then** syncs without prompt
- **Given** auto-sync enabled → **When** sync fails → **Then** shows error but doesn't block

**Test Cases**:
- Unit (`auto-sync.test.ts`): autoSyncEnabled, executeAutoSync → 90% coverage
- E2E (`auto-sync.spec.ts`): Complete increment → Auto-sync → No prompt → 100% coverage
- **Overall: 92% coverage**

**Implementation**:
- Update `StatusSyncEngine.syncToExternal()` to check `promptUser` config
- If `promptUser: false`, skip prompt and sync directly
- Log auto-sync events

**Dependencies**: T-012
**Estimate**: 0.5 day

---
### T-018: Add Sync Event Logging
**User Story**: [US-004: Bidirectional Status Sync](../../docs/internal/specs/default/FS-031/us-004-bidirectional-status-sync.md)

**Status**: [x] (100% - Completed)

**AC**: AC-US4-04, AC-US6-07

**Test Plan** (BDD):
- **Given** status sync → **When** completed → **Then** logs event with timestamp, tool, statuses, user
- **Given** conflict resolution → **When** resolved → **Then** logs resolution strategy and outcome

**Test Cases**:
- Unit (`sync-logging.test.ts`): logSyncEvent, logConflictEvent, loadSyncHistory → 90% coverage
- **Overall: 90% coverage**

**Implementation**:
- Create `src/core/sync/sync-event-logger.ts`
- Log to `.specweave/logs/sync-events.json`
- Methods: `logSyncEvent()`, `logConflictEvent()`, `loadSyncHistory()`
- Include: incrementId, tool, fromStatus, toStatus, timestamp, triggeredBy, conflictResolution

**Dependencies**: T-008, T-007
**Estimate**: 0.5 day

---
### T-019: Create E2E Tests for Status Sync
**Status**: [x] (100% - Completed)


**AC**: All AC (E2E validation)

**Test Plan** (BDD):
- **Given** increment with GitHub link → **When** completing → **Then** prompt appears
- **Given** user selects "Yes" → **When** confirmed → **Then** GitHub issue closes
- **Given** external issue closed → **When** syncing from external → **Then** SpecWeave prompts

**Test Cases**:
- E2E (`status-sync-prompt.spec.ts`): Complete → Prompt → Sync → 100% critical path
- E2E (`status-sync-github.spec.ts`): GitHub issue close → SpecWeave prompt → 100% critical path
- E2E (`status-sync-conflict.spec.ts`): Conflict → Resolution → 100% critical path
- **Overall: 100% critical paths**

**Implementation**:
- Playwright tests
- Test all user flows (Yes/No/Custom)
- Test all tools (GitHub, JIRA, ADO)
- Test conflict scenarios
- Mock external APIs for E2E

**Dependencies**: T-012
**Estimate**: 2 days

---

### T-020: Performance Optimization
**Status**: [x] (100% - Completed)


**AC**: None (performance requirement)

**Test Plan** (BDD):
- **Given** status sync → **When** executed → **Then** completes in <2 seconds
- **Given** conflict detection → **When** executed → **Then** completes in <1 second

**Test Cases**:
- Performance: Status sync <2s (GitHub, JIRA, ADO)
- Performance: Conflict detection <1s
- Performance: Bulk sync 10 increments <5s

**Implementation**:
- Profile status sync operations
- Optimize API calls (reduce roundtrips)
- Add caching for external status (5 min TTL)
- Implement parallel sync for bulk operations

**Dependencies**: T-008, T-016
**Estimate**: 1 day

---

### T-021: Error Handling & Retry Logic
**User Story**: [US-004: Bidirectional Status Sync](../../docs/internal/specs/default/FS-031/us-004-bidirectional-status-sync.md)

**Status**: [x] (100% - Completed)

**AC**: AC-US4-05

**Test Plan** (BDD):
- **Given** network failure → **When** syncing → **Then** retries with exponential backoff
- **Given** API error (403 Forbidden) → **When** syncing → **Then** shows clear error message
- **Given** rate limit exceeded → **When** syncing → **Then** waits and retries

**Test Cases**:
- Unit (`error-handling.test.ts`): handleNetworkError, handleApiError, retryWithBackoff → 90% coverage
- Integration (`error-scenarios.test.ts`): Simulate errors → Verify retry logic → 85% coverage
- **Overall: 87% coverage**

**Implementation**:
- Add retry logic to `StatusSyncEngine`
- Exponential backoff (1s, 2s, 4s, 8s, max 3 retries)
- Clear error messages for API errors
- Rate limit detection and wait

**Dependencies**: T-008
**Estimate**: 1 day

---
### T-022: Create User Documentation
**Status**: [x] (100% - Completed)


**AC**: None (documentation)

**Test Plan**: Manual review (link checker, build check)

**Implementation**:
- Create `.specweave/docs/public/guides/status-sync-guide.md`
- Topics:
  - How to configure status mappings
  - How to use status sync
  - How to resolve conflicts
  - FAQ and troubleshooting
- Create `.specweave/docs/internal/architecture/adr/0031-*.md` (ADRs from plan.md)

**Dependencies**: T-001 through T-021
**Estimate**: 1 day

---

### T-023: Create Migration Guide
**Status**: [x] (100% - Completed)


**AC**: None (migration documentation)

**Test Plan**: Manual review

**Implementation**:
- Create `.specweave/docs/public/guides/status-sync-migration.md`
- Topics:
  - How to upgrade from old sync
  - How to configure status mappings
  - How to test status sync
  - Backwards compatibility notes
- Include examples for GitHub, JIRA, ADO

**Dependencies**: T-022
**Estimate**: 0.5 day

---

### T-024: Final Integration Testing
**Status**: [x] (100% - Completed)


**AC**: All AC (integration validation)

**Test Plan** (BDD):
- **Given** real GitHub project → **When** syncing → **Then** all features work
- **Given** real JIRA project → **When** syncing → **Then** all features work
- **Given** real ADO project → **When** syncing → **Then** all features work

**Test Cases**:
- Integration: End-to-end flow (GitHub) → 95% coverage
- Integration: End-to-end flow (JIRA) → 95% coverage
- Integration: End-to-end flow (ADO) → 95% coverage

**Implementation**:
- Test with real projects (anton-abyzov/specweave for GitHub)
- Test all user flows
- Test error scenarios
- Verify all AC met

**Dependencies**: T-001 through T-023
**Estimate**: 2 days

---

## Phase 4: Immutable Descriptions + Progress Comments (Enhancement)

### T-025: Create Progress Comment Builder

**User Story**: [US-001: Rich External Issue Content](../../docs/internal/specs/default/FS-031/us-001-rich-external-issue-content.md)

**Status**: [ ] (0% - Not Started)

**AC**: AC-US1-06 (Content updates when spec.md changes)

**Test Plan** (BDD):
- **Given** user story with ACs and tasks → **When** building progress comment → **Then** includes AC checkboxes, task checkboxes, and percentage
- **Given** completed ACs and tasks → **When** formatting → **Then** checkboxes marked with [x]
- **Given** P1/P2/P3 priorities → **When** formatting → **Then** priorities displayed inline

**Test Cases**:
- Unit (`progress-comment-builder.test.ts`): buildProgressComment, formatACList, formatTaskList, calculateProgress → 90% coverage
- Integration (`comment-builder-integration.test.ts`): Real user story → Progress comment → 85% coverage
- **Overall: 87% coverage**

**Implementation**:
- Create `plugins/specweave-github/lib/progress-comment-builder.ts`
- Methods: `buildProgressComment(userStoryPath)`, `formatACCheckboxes()`, `formatTaskCheckboxes()`, `calculateProgressPercentage()`
- Format template:
```markdown
📊 **Progress Update from Increment {incrementId}**

**Status**: Core Complete (4/6 AC implemented - 67%)

## Completed Acceptance Criteria:
- [x] **AC-US2-01**: Spec frontmatter includes linked_increments mapping (P1)
- [x] **AC-US2-02**: User stories map to specific tasks (US-001 → T-001, T-002) (P1)
- [x] **AC-US2-03**: Tasks include GitHub/JIRA/ADO issue numbers (P1)
- [x] **AC-US2-04**: Can query "which increment implemented US-001?" (P2)

## Remaining Work (P2-P3):
- [ ] **AC-US2-05**: Traceability report shows complete history (P2)
- [ ] **AC-US2-06**: Acceptance criteria map to task validation (P3)

---
🤖 Auto-synced by SpecWeave | [View increment](link)
```

**Dependencies**: None
**Estimate**: 0.5 day

---

### T-026: Implement Immutable Issue Description Pattern

**User Story**: [US-001: Rich External Issue Content](../../docs/internal/specs/default/FS-031/us-001-rich-external-issue-content.md)

**Status**: [ ] (0% - Not Started)

**AC**: AC-US1-06 (Content updates via comments, not description edits)

**Test Plan** (BDD):
- **Given** GitHub issue created → **When** spec changes → **Then** description remains unchanged
- **Given** GitHub issue exists → **When** posting progress → **Then** creates comment, not edit
- **Given** multiple progress updates → **When** posting → **Then** each creates new comment (audit trail)

**Test Cases**:
- Unit (`immutable-description.test.ts`): shouldUpdateViaComment, isIssueDescriptionImmutable → 90% coverage
- Integration (`github-comment-post.test.ts`): Create issue → Post comment → Verify description unchanged → 85% coverage
- **Overall: 87% coverage**

**Implementation**:
- Update `plugins/specweave-github/lib/github-spec-content-sync.ts`
- Add `postProgressComment(issueNumber, comment)` method
- Modify `updateGitHubIssue()` to:
  - **NEVER edit issue body** after creation
  - **ALWAYS post comments** for progress updates
  - Only update: labels, milestone, assignees (metadata only)
- Use GitHub API: `POST /repos/{owner}/{repo}/issues/{issue_number}/comments`

**Dependencies**: T-025
**Estimate**: 1 day

---

### T-027: Update Post-Task-Completion Hook

**User Story**: [US-004: Bidirectional Status Sync](../../docs/internal/specs/default/FS-031/us-004-bidirectional-status-sync.md)

**Status**: [ ] (0% - Not Started)

**AC**: AC-US4-01 (Automatic sync after task completion)

**Test Plan** (BDD):
- **Given** task completed → **When** hook fires → **Then** posts progress comment (not edit)
- **Given** multiple user stories in increment → **When** task complete → **Then** updates all affected user story issues
- **Given** hook failure → **When** error occurs → **Then** logs error but doesn't block

**Test Cases**:
- Unit (`hook-comment-update.test.ts`): detectAffectedUserStories, postProgressComments → 90% coverage
- E2E (`post-task-hook.spec.ts`): Complete task → Hook fires → Comment posted → 100% coverage
- **Overall: 92% coverage**

**Implementation**:
- Update `plugins/specweave-github/hooks/post-task-completion.sh`
- Replace `gh issue edit` calls with `gh issue comment` calls
- Use `ProgressCommentBuilder` from T-025
- For each affected user story:
  1. Parse user story file for current AC/task status
  2. Build progress comment
  3. Post comment via `gh issue comment {issue_number} --body "{comment}"`
- Add error handling (non-blocking)

**Dependencies**: T-025, T-026
**Estimate**: 1 day

---

### T-028: Add Comprehensive Tests for Comment-Based Updates

**User Story**: [US-001: Rich External Issue Content](../../docs/internal/specs/default/FS-031/us-001-rich-external-issue-content.md)

**Status**: [ ] (0% - Not Started)

**AC**: AC-US1-06 (Content updates when spec.md changes)

**Test Plan** (BDD):
- **Given** increment with 3 user stories → **When** completing tasks → **Then** all 3 user story issues get progress comments
- **Given** AC status changes → **When** posting comment → **Then** checkboxes updated correctly
- **Given** 10 progress updates → **When** viewing issue → **Then** 10 separate comments visible (audit trail)

**Test Cases**:
- Integration (`comment-based-sync-integration.test.ts`): Full increment → Task completion → Comments posted → 90% coverage
- E2E (`immutable-description.spec.ts`): Create issue → Complete tasks → Verify description unchanged + comments added → 100% coverage
- E2E (`multi-us-sync.spec.ts`): 3 user stories → Complete tasks → All issues updated → 100% coverage
- **Overall: 93% coverage**

**Implementation**:
- Playwright tests for E2E validation
- Mock GitHub API for integration tests
- Test scenarios:
  - Initial issue creation (immutable description)
  - Progress comment posting
  - Multiple user stories per increment
  - Error handling (API failures)
  - Audit trail verification

**Dependencies**: T-025, T-026, T-027
**Estimate**: 1 day

---

## Summary

**Total Tasks**: 28 (24 original + 4 new)
**Estimated Effort**: 2-3 weeks + 3.5 days (Phase 4)
**Test Coverage Target**: 85% overall (90% unit, 85% integration, 100% E2E critical paths)
**Test Mode**: TDD (test-first for critical components: T-006, T-007, T-008, T-025, T-026)

**Phase Breakdown**:
- **Phase 1** (Enhanced Content Sync): 5 tasks, 1 week
- **Phase 2** (Status Synchronization): 9 tasks, 1 week
- **Phase 3** (Advanced Features & Testing): 10 tasks, 1 week
- **Phase 4** (Immutable Descriptions + Progress Comments): 4 tasks, 3.5 days

**Critical Path**: T-006 → T-007 → T-008 → T-009/T-010/T-011 → T-012 → T-025 → T-026 → T-027 → T-028

**Success Metrics**:
- All 45+ acceptance criteria met
- 85%+ test coverage achieved
- Status sync completes in <2 seconds
- Progress comments create audit trail
- Issue descriptions immutable after creation
- User satisfaction: 90%+ rate as "helpful"

---

**Created**: 2025-11-12
**Updated**: 2025-11-15 (Added Phase 4)
**Status**: Phase 1-3 Complete, Phase 4 Ready for Implementation
**Next Step**: `/specweave:do 0031` (resume for Phase 4)
