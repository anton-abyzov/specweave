# Plan: Project Registry with EDA-Based Synchronization

## Phase 1: Core Registry (P0) - Foundation

### 1.1 Data Model & Storage
- Create `src/core/project/project-registry.ts`
- Define TypeScript interfaces:
  - `Project`
  - `ExternalMapping` (GitHub/ADO/JIRA)
  - `ProjectRegistry`
- Implement file-based storage in `.specweave/state/projects.json`
- Add JSON schema validation

### 1.2 CRUD Operations
- `addProject()` - Create new project
- `updateProject()` - Update existing
- `removeProject()` - Delete project
- `getProject()` - Get by ID
- `listProjects()` - List all
- Add validation (duplicate IDs, required fields)

### 1.3 Event Bus
- Create `src/core/project/project-event-bus.ts`
- Implement EventEmitter-based bus
- Define event types and payloads
- Add async handler execution
- Error isolation between handlers

### 1.4 Migration
- Detect existing config.json projects
- Auto-migrate on first registry access
- Preserve backward compatibility
- Log migration results

---

## Phase 2: External Tool Adapters (P1)

### 2.1 GitHub Adapter
- Create `src/core/project/adapters/github-project-adapter.ts`
- Subscribe to `ProjectCreated`, `ProjectUpdated`, `ProjectDeleted`
- Create/update/archive `project:xxx` labels
- Track sync status in registry

### 2.2 ADO Adapter
- Create `src/core/project/adapters/ado-project-adapter.ts`
- Map projects to area paths
- Handle ADO API rate limits
- Note: Area path creation may require admin permissions

### 2.3 JIRA Adapter
- Create `src/core/project/adapters/jira-project-adapter.ts`
- Read-only mapping (JIRA projects can't be created via API)
- Validate project key exists
- Store mapping in registry

---

## Phase 3: CLI & Integration (P1)

### 3.1 CLI Commands
- `specweave project list`
- `specweave project add`
- `specweave project remove`
- `specweave project sync`
- `specweave project show`

### 3.2 Living Docs Integration
- Validate `**Project**:` against registry before sync
- Add project metadata to generated files
- Error handling for unknown projects

---

## Phase 4: Discovery & Polish (P2)

### 4.1 Project Discovery
- `specweave project discover --github`
- `specweave project discover --ado`
- `specweave project discover --jira`
- `specweave project import`

### 4.2 Testing & Documentation
- Unit tests for all components
- Integration tests for sync flow
- Update CLAUDE.md with registry documentation
- Update user guides

---

## Implementation Order

```
Week 1: Phase 1 (Core Registry)
├── T-001: Project interface & types
├── T-002: ProjectRegistry class
├── T-003: File-based storage
├── T-004: CRUD operations
├── T-005: ProjectEventBus
├── T-006: Event types & handlers
├── T-007: Migration from config.json
└── T-008: Unit tests

Week 2: Phase 2 (Adapters)
├── T-009: GitHub adapter
├── T-010: ADO adapter
├── T-011: JIRA adapter
├── T-012: Adapter unit tests
└── T-013: Integration with existing sync

Week 3: Phase 3 (CLI & Integration)
├── T-014: CLI project list
├── T-015: CLI project add/remove
├── T-016: CLI project sync
├── T-017: Living docs validation
└── T-018: E2E tests

Week 4: Phase 4 (Polish)
├── T-019: Project discovery
├── T-020: Documentation updates
└── T-021: Final integration tests
```

---

## Key Decisions

1. **Storage Location**: `.specweave/state/projects.json` (not config.json)
   - Keeps config.json clean
   - Allows for richer project metadata
   - Separates user config from runtime state

2. **Event-Driven Sync**: Events are fire-and-forget
   - Handlers run asynchronously
   - Errors don't block other handlers
   - Sync status tracked per-tool

3. **Migration Strategy**: Non-destructive
   - Read from both sources during transition
   - Don't delete config.json projects
   - Log all migration actions

4. **Backward Compatibility**: Full
   - Existing specs continue to work
   - config.json projects still supported
   - Gradual adoption path

---

## Files to Create

```
src/core/project/
├── project-registry.ts      # Registry class
├── project-event-bus.ts     # EDA event bus
├── types/
│   └── project-types.ts     # Interfaces
└── adapters/
    ├── github-project-adapter.ts
    ├── ado-project-adapter.ts
    └── jira-project-adapter.ts

src/cli/commands/
└── project.ts               # CLI commands

tests/unit/core/project/
├── project-registry.test.ts
├── project-event-bus.test.ts
└── adapters/
    ├── github-adapter.test.ts
    ├── ado-adapter.test.ts
    └── jira-adapter.test.ts
```

---

## Success Criteria

- [ ] All 10 user stories have passing tests
- [ ] Migration works without data loss
- [ ] GitHub labels sync within 5 seconds
- [ ] CLI commands are intuitive and documented
- [ ] No breaking changes to existing workflows
