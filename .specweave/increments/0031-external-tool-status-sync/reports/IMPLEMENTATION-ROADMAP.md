# External Tool Sync - Implementation Roadmap

**Date**: 2025-11-13
**Increment**: 0031-external-tool-status-sync
**Priority**: P1 (Critical)
**Timeline**: 4 weeks

---

## Quick Summary

This roadmap implements three critical enhancements to SpecWeave's external tool sync:

1. **Task Checkboxes in GitHub Issues** - Copy tasks as checkboxes instead of file references
2. **Natural Hierarchy Mapping** - Map Capability → Epic → Feature → User Story → Task to external tools
3. **Per-Tool Configuration** - Enable/disable sync per tool with init-time prompts

---

## Week 1: Enhanced Content Sync

### Objectives
- ✅ Show tasks as GitHub checkboxes in issue description
- ✅ Show completion status (✅) and progress bars
- ✅ Add label support ([Bug], [Feature], [Docs])

### Tasks

**T-001: Enhance Content Builder** (2 days, @dev-team)
- File: `src/core/sync/enhanced-content-builder.ts`
- Changes:
  - Update `buildTasksSection()` to generate checkboxes
  - Add progress bar: `████████░░░░ 50% (12/24)`
  - Add completion indicator: `- [x] T-001: Task ✅`
  - Add GitHub issue links: `- [ ] T-002: Task (#47)`

**T-002: Add Label/Tag Support** (1 day, @dev-team)
- File: `src/core/sync/label-detector.ts` (NEW)
- Changes:
  - Detect increment type from frontmatter or spec content
  - Map type to labels: `bug → [Bug]`, `feature → [Feature]`, `docs → [Docs]`
  - Auto-apply labels during GitHub issue creation

**T-003: Update GitHub Sync** (1 day, @dev-team)
- File: `plugins/specweave-github/lib/enhanced-github-sync.ts`
- Changes:
  - Use enhanced content builder with checkbox config
  - Update issue body with task checkboxes
  - Apply labels during creation/update

**T-004: Update Jira Sync** (1 day, @dev-team)
- File: `plugins/specweave-jira/lib/jira-epic-sync.ts`
- Changes:
  - Format tasks for Jira markup (use Jira checkboxes: `(/)` done, `(x)` todo)
  - Handle Jira's description character limits

**T-005: Update ADO Sync** (1 day, @dev-team)
- File: `plugins/specweave-ado/lib/enhanced-ado-sync.ts`
- Changes:
  - Format tasks for ADO HTML (`<input type="checkbox">`)
  - Handle ADO's rich text editor

### Deliverable
External issues show:
```markdown
## Tasks (24 total, 12 completed)
Progress: ████████░░░░ 50% (12/24)

- [x] **T-001**: Create Enhanced Content Builder (implements US-001, US-002) [#45] ✅
- [ ] **T-002**: Create Spec-to-Increment Mapper (implements US-002) [#46]
- [ ] **T-003**: Enhance GitHub Content Sync (implements US-001) [#47]
```

---

## Week 2: Universal Hierarchy Mapping

### Objectives
- ✅ Support 5-level hierarchy (Capability → Epic → Feature → User Story → Task)
- ✅ Natural mapping to Jira (Portfolio → Epic → Feature → Story → Sub-task)
- ✅ Natural mapping to ADO (Feature → Epic → User Story → Task)

### Tasks

**T-006: Design Universal Hierarchy Schema** (1 day, @architect)
- File: `src/core/types/hierarchy.ts` (NEW)
- Changes:
  - Define `HierarchyLevel` interface
  - Define `HierarchyMapping` interface
  - Define mapping presets (simple, standard, enterprise)
  - Update config schema with hierarchy settings

**T-007: Implement UniversalHierarchyMapper** (2 days, @dev-team)
- File: `src/core/sync/universal-hierarchy-mapper.ts` (NEW)
- Changes:
  - Implement `getMapping(tool)` for GitHub/Jira/ADO
  - Implement `mapToExternal(item, tool)`
  - Implement `detectLevel(item)` to identify SpecWeave item level
  - Support simple/standard/enterprise/custom mappings

**T-008: Update GitHub Hierarchy Sync** (1 day, @dev-team)
- File: `plugins/specweave-github/lib/github-hierarchy-sync.ts` (NEW)
- Changes:
  - Map SpecWeave items to GitHub: Project → Milestone → Issue → Checkbox
  - Create parent containers (Project, Milestone) if needed
  - Link items hierarchically

**T-009: Update Jira Hierarchy Sync** (1 day, @dev-team)
- File: `plugins/specweave-jira/lib/jira-hierarchy-sync.ts` (NEW)
- Changes:
  - Map SpecWeave items to Jira: Portfolio → Epic → Feature → Story → Sub-task
  - Handle Jira issue linking (Epic Link, Parent)
  - Create portfolio/epic/feature items as needed

**T-010: Update ADO Hierarchy Sync** (1 day, @dev-team)
- File: `plugins/specweave-ado/lib/ado-hierarchy-sync.ts` (NEW)
- Changes:
  - Map SpecWeave items to ADO: Feature → Epic → User Story → Task
  - Handle ADO work item relationships
  - Set area paths and iteration paths

### Deliverable
Natural hierarchy mapping for all tools:

**Example (Standard Level)**:
```
SpecWeave:
├── Epic: External Tool Sync
│   ├── Feature: Status Sync
│   │   ├── US-001: Rich External Issue Content
│   │   │   ├── T-001: Create Content Builder
│   │   │   └── T-002: Create Mapper

Jira:
├── Epic: External Tool Sync
│   ├── Feature: Status Sync
│   │   ├── Story: Rich External Issue Content
│   │   │   ├── Sub-task: Create Content Builder
│   │   │   └── Sub-task: Create Mapper
```

---

## Week 3: Configuration Enhancements

### Objectives
- ✅ Per-tool sync enablement (GitHub: true, Jira: false, ADO: false)
- ✅ Per-tool status sync control
- ✅ Init-time configuration prompts

### Tasks

**T-011: Enhance Config Schema** (1 day, @dev-team)
- File: `src/core/schemas/specweave-config.schema.json`
- Changes:
  - Add `sync.tools.<provider>` structure
  - Add `sync.tools.<provider>.enabled`
  - Add `sync.tools.<provider>.status.enabled`
  - Add `sync.tools.<provider>.content.*` settings
  - Add `sync.tools.<provider>.labels` configuration
  - Add `sync.initPrompts` for specweave init
  - Maintain backward compatibility with `sync.statusSync`

**T-012: Add Init Prompts** (1 day, @dev-team)
- File: `src/cli/commands/init.ts`
- Changes:
  - Add prompts for GitHub sync (`? Enable GitHub sync? (Y/n)`)
  - Add prompts for Jira sync (`? Enable Jira sync? (y/N)`)
  - Add prompts for ADO sync (`? Enable ADO sync? (y/N)`)
  - Add prompt for status sync (`? Include status in sync? (Y/n)`)
  - Add prompt for task checkboxes (`? Copy tasks as checkboxes? (Y/n)`)
  - Add prompt for labels (`? Use [Bug]/[Feature] labels? (Y/n)`)
  - Generate config from responses

**T-013: Migration Script** (0.5 days, @dev-team)
- File: `src/cli/commands/migrate-config.ts` (NEW)
- Changes:
  - Detect old config format (`sync.statusSync`)
  - Migrate to new format (`sync.tools.<provider>.status`)
  - Show deprecation warnings
  - Create backup of old config

**T-014: Update Documentation** (0.5 days, @docs-team)
- Files: `.specweave/docs/public/guides/sync-configuration.md`
- Changes:
  - Document new config structure
  - Document init prompts
  - Show migration examples
  - Update ADR-0031 series

### Deliverable
New configuration format:
```json
{
  "sync": {
    "tools": {
      "github": {
        "enabled": true,
        "status": { "enabled": true, "autoSync": true },
        "content": { "includeTaskCheckboxes": true },
        "labels": { "bug": "[Bug]", "feature": "[Feature]", "autoApply": true }
      },
      "jira": {
        "enabled": false
      },
      "ado": {
        "enabled": false
      }
    }
  }
}
```

Init flow:
```
$ npx specweave init .

✨ SpecWeave Initialization

? Enable GitHub sync? Yes
? Include status updates in GitHub sync? Yes
? Copy tasks as checkboxes in GitHub issues? Yes
? Use labels for bugs/features/docs? Yes

? Enable Jira sync? No
? Enable Azure DevOps sync? No

✅ Configuration saved to .specweave/config.json
```

---

## Week 4: Testing & Integration

### Objectives
- ✅ 85%+ test coverage
- ✅ All unit, integration, E2E tests passing
- ✅ Documentation complete

### Tasks

**T-015: Unit Tests** (2 days, @qa-team)
- Files: `tests/unit/sync/*.test.ts`
- Test Cases:
  - Enhanced content builder (buildTasksSection with checkboxes)
  - Universal hierarchy mapper (level detection, mapping)
  - Config schema validation (new structure)
  - Label detector (type detection, label mapping)

**T-016: Integration Tests** (2 days, @qa-team)
- Files: `tests/integration/sync/*.test.ts`
- Test Cases:
  - GitHub sync end-to-end (create issue with task checkboxes)
  - Jira sync end-to-end (create epic/feature/story hierarchy)
  - ADO sync end-to-end (create feature/epic/user story hierarchy)
  - Bidirectional checkbox updates (check checkbox → update task status)
  - Status sync with per-tool configuration

**T-017: E2E Tests** (1 day, @qa-team)
- Files: `tests/e2e/sync/*.spec.ts`
- Test Cases:
  - Full workflow: init → plan → sync → complete → close
  - Conflict resolution (local vs external status changes)
  - Multi-tool sync (GitHub + Jira simultaneously)
  - Time range filtering (1M time range for large repos)

### Deliverable
- ✅ All tests passing
- ✅ Coverage report: 85%+ overall, 90%+ for critical paths
- ✅ Documentation complete
- ✅ Ready for production

---

## Timeline

```
Week 1: Enhanced Content Sync
├── Mon-Tue: T-001 (Enhance Content Builder)
├── Wed:     T-002 (Add Label Support)
├── Thu:     T-003 (Update GitHub Sync)
└── Fri:     T-004, T-005 (Update Jira/ADO Sync)

Week 2: Universal Hierarchy Mapping
├── Mon:     T-006 (Design Schema)
├── Tue-Wed: T-007 (Implement Mapper)
├── Thu:     T-008, T-009 (Update GitHub/Jira)
└── Fri:     T-010 (Update ADO)

Week 3: Configuration Enhancements
├── Mon-Tue: T-011 (Enhance Config Schema)
├── Wed:     T-012 (Add Init Prompts)
├── Thu:     T-013 (Migration Script)
└── Fri:     T-014 (Documentation)

Week 4: Testing & Integration
├── Mon-Tue: T-015 (Unit Tests)
├── Wed-Thu: T-016 (Integration Tests)
└── Fri:     T-017 (E2E Tests)
```

---

## Dependencies

**External Dependencies**:
- GitHub API (v4 GraphQL) - already integrated
- Jira REST API v3 - already integrated
- Azure DevOps REST API 7.0 - already integrated

**Internal Dependencies**:
- Status Sync Engine (✅ implemented - `src/core/sync/status-sync-engine.ts`)
- Conflict Resolver (✅ implemented - `src/core/sync/conflict-resolver.ts`)
- Hierarchy Mapper (✅ implemented - `src/core/living-docs/hierarchy-mapper.ts`)

**No Blockers**: All dependencies satisfied

---

## Risks

### Risk 1: Breaking Changes
**Impact**: Medium
**Probability**: Low
**Mitigation**:
- Maintain backward compatibility
- Add deprecation warnings for old config
- Provide migration script
- Version bump to v0.21.0 (minor version = backward compatible)

### Risk 2: API Rate Limits
**Impact**: Medium
**Probability**: Medium
**Mitigation**:
- Already implemented: Rate limit protection
- Already implemented: Time range filtering (1M default)
- Batch updates in groups of 5
- Add 1-second delay between batches

### Risk 3: Bidirectional Checkbox Sync Complexity
**Impact**: High
**Probability**: Medium
**Mitigation**:
- Phase 1: One-way sync (SpecWeave → GitHub checkboxes)
- Phase 2: Manual sync command to pull checkbox changes
- Future (v0.22.0): Webhooks for real-time bidirectional sync

---

## Success Metrics

### Phase 1: Enhanced Content
- [ ] GitHub issues show tasks as checkboxes (100%)
- [ ] Progress bars visible (100%)
- [ ] Labels auto-applied (100%)
- [ ] Stakeholder feedback: "Can see progress without repo access"

### Phase 2: Hierarchy Mapping
- [ ] Jira sync creates Portfolio → Epic → Feature → Story (100%)
- [ ] ADO sync creates Feature → Epic → User Story → Task (100%)
- [ ] GitHub sync creates Project → Milestone → Issue → Checkbox (100%)
- [ ] Natural hierarchy for each tool (100%)

### Phase 3: Configuration
- [ ] Per-tool sync enablement works (100%)
- [ ] Init prompts generate correct config (100%)
- [ ] Migration script preserves settings (100%)
- [ ] Backward compatibility maintained (100%)

### Phase 4: Testing
- [ ] Test coverage: 85%+ overall
- [ ] Critical paths: 90%+ coverage
- [ ] All tests passing (0 failures)
- [ ] Documentation complete (100%)

---

## Next Actions

1. **Review this roadmap** - Get stakeholder approval
2. **Create GitHub issues** - Track each task
3. **Assign developers** - Allocate resources
4. **Begin Week 1** - Start with T-001 (Enhanced Content Builder)

---

## References

- **Detailed Analysis**: [COMPREHENSIVE-SYNC-ARCHITECTURE-ANALYSIS.md](./COMPREHENSIVE-SYNC-ARCHITECTURE-ANALYSIS.md)
- **Increment Spec**: [../spec.md](../spec.md)
- **Increment Tasks**: [../tasks.md](../tasks.md)
- **ADRs**:
  - [ADR-0031-001: Status Mapping Strategy](../../docs/internal/architecture/adr/0031-001-status-mapping-strategy.md)
  - [ADR-0031-002: Conflict Resolution Approach](../../docs/internal/architecture/adr/0031-002-conflict-resolution-approach.md)
  - [ADR-0031-003: Bidirectional Sync Implementation](../../docs/internal/architecture/adr/0031-003-bidirectional-sync-implementation.md)
