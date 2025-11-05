# Planning Complete: Increment 0012

**Date**: 2025-11-05
**Status**: ✅ PLANNING COMPLETE - Ready for Implementation

---

## Summary

Successfully planned **Increment 0012: Multi-Project Internal Docs & Brownfield Import** - a comprehensive enterprise-scale enhancement enabling multi-project/team scenarios with brownfield documentation import.

---

## What Was Planned

### 1. Multi-Project Support
- **Structure**: `.specweave/docs/internal/projects/{id}/`
- **Projects**: Unlimited projects per SpecWeave instance
- **Organization**: Specs, modules, team docs, architecture per project
- **Key Insight**: Single project = multi-project with 1 project (no special cases!)

### 2. Module Documentation
- **Location**: `projects/{id}/modules/`
- **Purpose**: Module/component-level docs (auth, payments, ML pipeline)
- **Separation**: Clear distinction from system-wide architecture

### 3. Team Playbooks
- **Location**: `projects/{id}/team/`
- **Contents**: Onboarding, conventions, workflows, contacts
- **Value**: Faster onboarding, consistent patterns

### 4. Brownfield Import
- **Analyzer**: File classification (specs vs modules vs team vs legacy)
- **Sources**: Notion exports, Confluence, GitHub Wiki, custom markdown
- **Accuracy**: Target 80%+ classification accuracy
- **Migration**: Legacy docs preserved in `projects/{id}/legacy/{source}/`

### 5. Unified Architecture
- **No Special Cases**: Single project uses `projects/default/` (same as multi-project)
- **Auto-Migration**: Transparent migration of existing `specs/` to `projects/default/specs/`
- **Backward Compatible**: Existing setups continue to work

---

## Deliverables

### Core Components (5 new files)

1. **ProjectManager** (`src/core/project-manager.ts`)
   - Path resolution for active project
   - Project switching
   - Project structure creation
   - ~400 lines

2. **BrownfieldAnalyzer** (`src/core/brownfield/analyzer.ts`)
   - File classification algorithm
   - Keyword-based scoring
   - Confidence calculation
   - ~300 lines

3. **BrownfieldImporter** (`src/core/brownfield/importer.ts`)
   - Import orchestration
   - File copying
   - Migration report generation
   - ~250 lines

4. **Auto-Migration Script** (`src/cli/commands/migrate-to-multiproject.ts`)
   - Transparent single → multi migration
   - Backup creation
   - Config updates
   - ~200 lines

5. **Config Schema Updates** (`src/core/schemas/specweave-config.schema.json`)
   - MultiProject section
   - Brownfield section
   - ~100 lines

### CLI Commands (3 new commands)

1. `/specweave:init-multiproject` - Enable multi-project mode
2. `/specweave:import-docs` - Import brownfield docs
3. `/specweave:switch-project` - Switch active project

### Integration Points

- **With 0011** (Multi-Project External Sync): Projects link to sync profiles
- **With increment-planner**: Uses ProjectManager for spec path resolution

---

## Technical Specifications

### Directory Structure

```
.specweave/docs/internal/
├── strategy/              # Existing (cross-project)
├── architecture/          # Existing (shared ADRs)
├── delivery/              # Existing (cross-project)
├── operations/            # Existing (cross-project)
├── governance/            # Existing (cross-project)
│
├── specs/                 # DEPRECATED → projects/default/specs/
│
└── projects/              # 🆕 NEW!
    ├── default/           # Single project mode
    │   ├── README.md
    │   ├── specs/         # Living docs specs
    │   ├── modules/       # Module docs
    │   ├── team/          # Team playbooks
    │   ├── architecture/  # Project-specific architecture
    │   └── legacy/        # Brownfield imports
    │
    ├── alpha/             # Additional projects
    ├── beta/
    └── gamma/
```

### Configuration Schema

```json
{
  "multiProject": {
    "enabled": false,  // Default: single project
    "activeProject": "default",
    "projects": [{
      "id": "default",
      "name": "Default Project",
      "description": "Main project",
      "techStack": ["TypeScript", "Node.js"],
      "team": "Engineering Team",
      "syncProfiles": ["specweave-dev"]
    }]
  },
  "brownfield": {
    "importHistory": [{
      "source": "notion",
      "workspace": "acme-corp",
      "importedAt": "2025-11-06T10:30:00Z",
      "project": "default",
      "filesImported": 47,
      "destination": "..."
    }]
  }
}
```

---

## Implementation Plan

### Phase Breakdown (33 hours total)

| Phase | Tasks | Hours | Coverage |
|-------|-------|-------|----------|
| **Phase 1**: Core Infrastructure | T-001 to T-003 | 8h | 92% |
| **Phase 2**: Brownfield Analyzer | T-004 to T-005 | 6h | 91% |
| **Phase 3**: CLI Commands | T-006 to T-008 | 6h | 90% |
| **Phase 4**: Integration | T-009 to T-010 | 3h | 86% |
| **Phase 5**: Testing & Docs | T-011 to T-015 | 10h | 90% |

### Key Tasks (15 total)

1. **T-001**: Create ProjectManager Class (3h)
2. **T-002**: Update Config Schema (2h)
3. **T-003**: Auto-Migration Script (3h)
4. **T-004**: File Classification Algorithm (3h)
5. **T-005**: Brownfield Import Logic (3h)
6. **T-006**: `/specweave:init-multiproject` Command (2h)
7. **T-007**: `/specweave:import-docs` Command (2h)
8. **T-008**: `/specweave:switch-project` Command (2h)
9. **T-009**: Update increment-planner for Multi-Project (2h)
10. **T-010**: Project README Templates (1h)
11. **T-011**: Unit Tests (3h)
12. **T-012**: Integration Tests (2h)
13. **T-013**: E2E Tests (1h)
14. **T-014**: User Documentation (2h)
15. **T-015**: Internal Documentation (2h)

---

## Testing Strategy

### Test Modes
- **TDD Mode**: Enabled (write tests first)
- **Coverage Target**: 90% overall

### Test Breakdown

**Unit Tests**:
- ProjectManager (95% coverage)
- BrownfieldAnalyzer (95% coverage)
- BrownfieldImporter (95% coverage)
- Auto-migration (95% coverage)
- CLI commands (90% coverage)

**Integration Tests**:
- Multi-project setup (90% coverage)
- Brownfield import with real Notion export (85% coverage)
- Project switching (85% coverage)

**E2E Tests (Playwright)**:
- `/specweave:init-multiproject` flow (100% critical path)
- `/specweave:import-docs` flow (100% critical path)
- `/specweave:switch-project` flow (100% critical path)

---

## User Stories Coverage

### Planned User Stories (6 total)

1. **US-001**: Multi-Project Organization (P0) - ✅ Covered by T-001, T-002, T-003
2. **US-002**: Module Documentation (P0) - ✅ Covered by T-001, T-010
3. **US-003**: Team Playbooks (P1) - ✅ Covered by T-001, T-010
4. **US-004**: Brownfield Import (P0) - ✅ Covered by T-004, T-005, T-007
5. **US-005**: Unified Architecture (P0) - ✅ Covered by T-001, T-003
6. **US-006**: Cross-Cutting Documentation (P1) - ✅ Covered by T-010, T-015

### Acceptance Criteria (23 total)

All 23 acceptance criteria mapped to specific tasks (see tasks.md for details).

---

## Success Metrics

### Functional
- Users can create 3+ projects per SpecWeave instance
- Users can import 100+ brownfield docs in <5 minutes
- Module docs clearly separate from architecture docs
- 80%+ accuracy in brownfield file classification

### Performance
- Auto-migration: <10 seconds for 100 specs
- Brownfield import: <1 minute for 500 markdown files
- Path resolution: <1ms per operation

### UX
- Single project users see NO changes (transparent migration)
- Multi-project users understand structure from READMEs
- Clear documentation for all workflows

---

## Dependencies

### Internal
- ✅ Increment 0011 (Multi-Project External Sync) - Sync profiles integration
- ✅ Config schema (`src/core/schemas/specweave-config.schema.json`)
- ✅ Path utilities (`src/utils/path.ts`)

### External
- None (pure filesystem operations)

---

## Risks & Mitigation

1. **Migration Breaks Workflows** → Backup config, provide rollback, test extensively
2. **File Classification Inaccuracy** → Show preview, allow manual override, legacy folder for uncertain files
3. **Path Resolution Performance** → Cache project context, benchmark <1ms target

---

## Next Steps

### Immediate
1. **Close increment 0002** - ✅ **DONE** (100% complete)
2. **Review increment 0012 planning** - ✅ **DONE** (this report)
3. **Begin implementation** - Start with Phase 1 (T-001: ProjectManager)

### Implementation Order
1. Phase 1: Core Infrastructure (ProjectManager, config schema, auto-migration)
2. Phase 2: Brownfield Analyzer (classification, import logic)
3. Phase 3: CLI Commands (init-multiproject, import-docs, switch-project)
4. Phase 4: Integration (increment-planner, README templates)
5. Phase 5: Testing & Documentation (unit, integration, E2E, docs)

---

## Files Created

### Planning Documents (3 files)
1. `spec.md` (13,500 words, comprehensive specification)
2. `plan.md` (7,500 words, detailed implementation plan)
3. `tasks.md` (5,000 words, 15 tasks with embedded BDD tests)

### Reports
4. `reports/PLANNING-COMPLETE.md` (this file)

**Total**: ~26,000 words of planning documentation

---

## Comparison with Increment 0011

**Increment 0011** (Multi-Project External Sync):
- External sync to GitHub/JIRA/ADO
- Sync profiles per project
- Time range filtering
- Rate limit protection
- **Status**: Phase 1 complete, Phase 2-4 remaining

**Increment 0012** (Multi-Project Internal Docs):
- Internal docs structure per project
- Module and team documentation
- Brownfield import (Notion, Confluence, Wiki)
- Auto-migration from single to multi-project
- **Status**: Planning complete, ready for implementation

**Integration**: 0011 provides sync profiles, 0012 provides internal structure. Projects link sync profiles to internal docs.

---

## Enterprise Use Cases

### Use Case 1: Platform Engineering Team
- **Scenario**: Manages 5 terraform repos + 3 app repos
- **Solution**:
  - Project "platform": terraform specs, runbooks
  - Project "web-app": application specs
  - Project "mobile-app": mobile specs
  - Each links to its own GitHub/ADO sync profile (0011)

### Use Case 2: Microservices Architecture
- **Scenario**: 12 services, 8 teams, 3 GitHub orgs
- **Solution**:
  - Project per team (team-alpha, team-beta, ...)
  - Module docs per service (auth-service, payment-service, ...)
  - Team playbooks per team (conventions, workflows)

### Use Case 3: Brownfield Migration
- **Scenario**: 200+ Notion docs to migrate
- **Solution**:
  - Export Notion workspace to markdown
  - Run `/specweave:import-docs /path/to/export --source=notion`
  - Analyzer classifies: 50 specs, 80 modules, 70 legacy
  - Manual review and adjustment

---

**Status**: ✅ PLANNING COMPLETE
**Estimated Effort**: 33 hours (4-5 working days)
**Coverage Target**: 90% overall
**Ready for**: Implementation (Phase 1, T-001)

---

**Next Command**: `/specweave:do` (begin implementation)
