# Tasks: Project Registry with EDA-Based Synchronization

## Phase 1: Core Registry (P0)

### T-001: Create Project Types & Interfaces
**User Story**: US-001
**Satisfies ACs**: AC-US1-02, AC-US1-03
**Status**: [x] completed

Create TypeScript interfaces in `src/core/project/types/project-types.ts`:
- `Project` interface with id, name, description, techStack, team, keywords
- `ExternalMapping` interface with github?, ado?, jira? sub-mappings
- `GitHubMapping`, `ADOMapping`, `JiraMapping` interfaces
- `ProjectRegistryData` for the JSON schema

---

### T-002: Implement ProjectRegistry Class
**User Story**: US-001, US-002
**Satisfies ACs**: AC-US1-01, AC-US1-04
**Status**: [x] completed

Create `src/core/project/project-registry.ts`:
- Class with private `projects: Map<string, Project>`
- Constructor loads from `.specweave/state/projects.json`
- Lazy initialization (create file if doesn't exist)
- Thread-safe file operations

---

### T-003: Implement CRUD Operations
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05, AC-US2-06
**Status**: [x] completed

Add methods to ProjectRegistry:
- `addProject(project: Project): void` - validates and adds
- `updateProject(id: string, updates: Partial<Project>): void`
- `removeProject(id: string): void`
- `getProject(id: string): Project | null`
- `listProjects(): Project[]`
- Validation: no duplicate IDs, required name field

---

### T-004: Implement ProjectEventBus
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05, AC-US3-06
**Status**: [x] completed

Create `src/core/project/project-event-bus.ts`:
- EventEmitter-based implementation
- Support event types: ProjectCreated, ProjectUpdated, ProjectDeleted, ProjectSyncRequested
- `on(eventType, handler)` for registering handlers
- `emit(eventType, payload)` for triggering events
- Async handler execution with error isolation

---

### T-005: Connect Registry to Event Bus
**User Story**: US-002, US-003
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [x] completed

Modify CRUD operations to emit events:
- `addProject()` → emit `ProjectCreated`
- `updateProject()` → emit `ProjectUpdated`
- `removeProject()` → emit `ProjectDeleted`
- Pass full project data in event payload

---

### T-006: Implement Migration from config.json
**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04, AC-US7-05
**Status**: [x] completed

Add migration logic to ProjectRegistry:
- On first load, check if `.specweave/state/projects.json` exists
- If not, read from `config.json` (both single and multi-project)
- Create `projects.json` with migrated data
- Log: "Migrated N projects to registry"
- Don't delete config.json projects (read-only)

---

### T-007: Unit Tests for Core Registry
**User Story**: US-001, US-002
**Satisfies ACs**: AC-US1-05
**Status**: [x] completed

Create `tests/unit/core/project/project-registry.test.ts`:
- Test CRUD operations
- Test validation (duplicate IDs, required fields)
- Test file persistence
- Test migration from config.json
- Test event emission

---

### T-008: Unit Tests for Event Bus
**User Story**: US-003
**Satisfies ACs**: AC-US3-06
**Status**: [x] completed

Create `tests/unit/core/project/project-event-bus.test.ts`:
- Test handler registration
- Test event emission
- Test async handler execution
- Test error isolation between handlers
- Test multiple handlers for same event

---

## Phase 2: External Tool Adapters (P1)

### T-009: Implement GitHub Project Adapter
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05
**Status**: [x] completed

Create `src/core/project/adapters/github-project-adapter.ts`:
- Subscribe to ProjectCreated, ProjectUpdated, ProjectDeleted
- On create: Create `project:{id}` label via GitHub API
- On update: Update label name/description
- On delete: Rename label to `_archived_project:{id}`
- Store sync status in registry

---

### T-010: Implement ADO Project Adapter
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05
**Status**: [x] completed

Create `src/core/project/adapters/ado-project-adapter.ts`:
- Subscribe to project events
- Map project ID to area path
- Create area path on ProjectCreated (if permissions allow)
- Handle ADO rate limits with retry logic
- Graceful error handling

---

### T-011: Implement JIRA Project Adapter
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04, AC-US6-05
**Status**: [x] completed

Create `src/core/project/adapters/jira-project-adapter.ts`:
- Subscribe to project events
- Store JIRA project key mapping
- Validate project exists via JIRA API
- Note: JIRA projects can't be created via API
- Verify mapping on sync request

---

### T-012: Unit Tests for Adapters
**User Story**: US-004, US-005, US-006
**Satisfies ACs**: AC-US4-05, AC-US5-05, AC-US6-05
**Status**: [x] completed

Create adapter tests:
- `tests/unit/core/project/adapters/github-adapter.test.ts`
- `tests/unit/core/project/adapters/ado-adapter.test.ts`
- `tests/unit/core/project/adapters/jira-adapter.test.ts`
- Mock external API calls
- Test event handling
- Test error scenarios

---

## Phase 3: CLI & Integration (P1)

### T-013: Implement CLI project list
**User Story**: US-008
**Satisfies ACs**: AC-US8-01
**Status**: [x] completed

Create `src/cli/commands/project.ts`:
- `specweave project list` command
- Display: ID, Name, Tech Stack, Sync Status
- Table format with colors
- Show last sync time per tool

---

### T-014: Implement CLI project add/remove
**User Story**: US-008
**Satisfies ACs**: AC-US8-02, AC-US8-03
**Status**: [x] completed

Add to project.ts:
- `specweave project add <id> --name "Name" [--github] [--ado] [--jira]`
- `specweave project remove <id>` with confirmation prompt
- Validate input
- Emit events for sync

---

### T-015: Implement CLI project sync/show
**User Story**: US-008
**Satisfies ACs**: AC-US8-04, AC-US8-05
**Status**: [x] completed

Add to project.ts:
- `specweave project sync [<id>]` - Force sync to external tools
- `specweave project show <id>` - Show project details
- Display external mappings and sync status

---

### T-016: Integrate with Living Docs Sync
**User Story**: US-009
**Satisfies ACs**: AC-US9-01, AC-US9-02, AC-US9-03, AC-US9-04
**Status**: [x] completed

Modify `src/core/living-docs/living-docs-sync.ts`:
- Before sync, validate `**Project**:` against registry
- If project not found: warn user, suggest adding
- Optionally add techStack/team to generated us-*.md

---

### T-017: E2E Tests for CLI
**User Story**: US-008
**Satisfies ACs**: AC-US8-01, AC-US8-02, AC-US8-03, AC-US8-04, AC-US8-05
**Status**: [x] completed

Create `tests/e2e/project-cli.test.ts`:
- Test full workflow: add → list → sync → show → remove
- Test error cases
- Test multi-project scenarios

---

## Phase 4: Discovery & Polish (P2)

### T-018: Implement Project Discovery
**User Story**: US-010
**Satisfies ACs**: AC-US10-01, AC-US10-02, AC-US10-03, AC-US10-04
**Status**: [x] completed

Add discovery commands:
- `specweave project discover --github` - List `project:*` labels
- `specweave project discover --ado` - List area paths
- `specweave project discover --jira` - List JIRA projects
- `specweave project import <id>` - Add to registry

---

### T-019: Update Documentation
**User Story**: All
**Satisfies ACs**: Documentation
**Status**: [x] completed

Update documentation:
- CLAUDE.md: Add Project Registry section
- Add user guide for CLI commands
- Update architecture docs
- Add ADR for registry design decision

---

### T-020: Integration Tests
**User Story**: All
**Satisfies ACs**: All
**Status**: [x] completed

Create integration tests:
- Full sync flow test
- Migration test
- Multi-project test
- Error handling test

---

### T-021: Final Review & Cleanup
**User Story**: All
**Satisfies ACs**: All
**Status**: [x] completed

Final tasks:
- Code review
- Remove deprecated code paths
- Performance optimization
- Final documentation review
