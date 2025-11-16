# Sync Command Consolidation Analysis

**Date**: 2025-11-15
**Context**: User feedback to consolidate sync commands - ONE command per plugin using Universal Hierarchy mapping

---

## Current State Audit

### specweave-github Plugin (5 commands)

| Command | Purpose | Status | Recommendation |
|---------|---------|--------|----------------|
| `specweave-github:sync` | Increment ↔ GitHub Issue (bidirectional, multi-profile) | ✅ PRIMARY | **KEEP - Make this the ONLY sync command** |
| `specweave-github:sync-epic` | Epic → Milestone (4-level hierarchy ONLY) | ⚠️ LEGACY | **DEPRECATE - Auto-detect hierarchy in main sync** |
| `specweave-github:sync-spec` | Living Docs spec → GitHub Project | ⚠️ SPECIALIZED | **DEPRECATE - Merge into main sync with auto-detection** |
| `specweave-github:sync-tasks` | Tasks → Individual GitHub Issues | ⚠️ SPECIALIZED | **DEPRECATE - Merge into main sync as --granularity option** |
| `specweave-github:sync-from` | GitHub → SpecWeave (pull only) | ⚠️ REDUNDANT | **DEPRECATE - Use main sync --direction from-github** |

**Analysis**:
- `sync-from` is redundant (main sync already supports `--direction from-github`)
- `sync-epic` and `sync-spec` should auto-detect from path/context
- `sync-tasks` should be a granularity option, not separate command
- Main `sync` command already has bidirectional support, profiles, time ranges

### specweave-jira Plugin (3 commands)

| Command | Purpose | Status | Recommendation |
|---------|---------|--------|----------------|
| `specweave-jira:sync` | Increment ↔ JIRA Epic/Stories (bidirectional) | ✅ PRIMARY | **KEEP - Already unified** |
| `specweave-jira:sync-epic` | Epic folder → JIRA Epic (hierarchical) | ⚠️ SPECIALIZED | **DEPRECATE - Auto-detect Epic folder in main sync** |
| `specweave-jira:sync-spec` | Living Docs spec → JIRA Epic | ⚠️ SPECIALIZED | **DEPRECATE - Merge into main sync with auto-detection** |

**Analysis**:
- JIRA plugin already has good unified command (`specweave-jira:sync`)
- Epic and spec sync should auto-detect from input path
- Keep single command, add smart detection

### specweave-ado Plugin (2 commands)

| Command | Purpose | Status | Recommendation |
|---------|---------|--------|----------------|
| `specweave-ado:sync` | Increment ↔ ADO Work Item (bidirectional) | ✅ PRIMARY | **KEEP - Already minimal** |
| `specweave-ado:sync-spec` | Living Docs spec → ADO Feature | ⚠️ SPECIALIZED | **DEPRECATE - Merge into main sync** |

**Analysis**:
- ADO already minimal (only 2 commands)
- Spec sync should auto-detect from path
- Already follows best practice

---

## Universal Hierarchy Mapping (Reference)

**SpecWeave Universal Hierarchy** (supports 3-level and 4-level):

```
3-Level (most common):
Feature (FS-XXX) → User Story (US-XXX) → Task (T-XXX)

4-Level (strategic themes):
Epic (EPIC-YYYY-QN-name) → Feature (FS-XXX) → User Story (US-XXX) → Task (T-XXX)
```

**External Tool Mappings**:

| SpecWeave | GitHub | JIRA | Azure DevOps |
|-----------|--------|------|--------------|
| **Epic** (4-level only) | - | Initiative | Epic |
| **Feature (FS-XXX)** | Milestone | Epic | Feature |
| **User Story (US-XXX)** | Issue | Story | User Story |
| **Task (T-XXX)** | Checkbox | Sub-task | Task |

**Key Insight**: The sync command should AUTO-DETECT which level you're syncing based on:
1. Input type (increment ID, Epic folder, Feature folder, spec file)
2. Frontmatter metadata (`epic:`, `feature:`, `type:`)
3. File path (`.specweave/docs/internal/specs/_epics/`, `_features/`, etc.)

---

## Recommended Architecture: ONE Sync Command Per Plugin

### GitHub: `/specweave-github:sync`

**Smart Universal Command**:
```bash
# Auto-detect what to sync based on input
/specweave-github:sync <target> [options]

# Examples:
/specweave-github:sync 0031                    # Increment → Issue
/specweave-github:sync EPIC-2025-Q4-platform   # Epic → Milestone(s) + Issues
/specweave-github:sync FS-031                  # Feature → Milestone + User Story Issues
/specweave-github:sync spec-001                # Living docs spec → Project + Issues
```

**Auto-Detection Logic**:
```typescript
if (target.startsWith('EPIC-')) {
  // 4-level hierarchy: Epic → Milestone, Features → Milestones, User Stories → Issues
  return syncEpic(target);
} else if (target.startsWith('FS-')) {
  // 3-level hierarchy: Feature → Milestone, User Stories → Issues
  return syncFeature(target);
} else if (target.startsWith('spec-')) {
  // Living docs: Spec → Project, User Stories → Issues
  return syncSpec(target);
} else if (target.match(/^\d{4}/)) {
  // Increment: Increment → Issue
  return syncIncrement(target);
}
```

**Options** (unified across all sync types):
- `--profile <id>`: Multi-project support
- `--direction <to-github|from-github|bidirectional>`: Sync direction (default: bidirectional)
- `--time-range <1W|1M|3M|6M|ALL>`: Rate limit protection
- `--granularity <issue|tasks>`: Issue-level (default) or task-level sync
- `--dry-run`: Preview changes
- `--force`: Force update

### JIRA: `/specweave-jira:sync`

**Already Good** - Just add auto-detection:
```bash
/specweave-jira:sync <target> [options]

# Examples:
/specweave-jira:sync 0031                    # Increment → Story
/specweave-jira:sync EPIC-2025-Q4-platform   # Epic → Initiative + Epics + Stories
/specweave-jira:sync FS-031                  # Feature → Epic + Stories
```

### ADO: `/specweave-ado:sync`

**Already Good** - Just add auto-detection:
```bash
/specweave-ado:sync <target> [options]

# Examples:
/specweave-ado:sync 0031                    # Increment → User Story
/specweave-ado:sync EPIC-2025-Q4-platform   # Epic → Epic + Features + User Stories
/specweave-ado:sync FS-031                  # Feature → Feature + User Stories
```

---

## Migration Plan

### Phase 1: Add Auto-Detection to Main Sync Command

**GitHub**:
1. Update `/specweave-github:sync` to detect input type
2. Add `GitHubEpicSync`, `GitHubFeatureSync` (already exists!), `GitHubSpecSync` as internal modules
3. Route to correct sync based on detection
4. Test with all input types

**JIRA**:
1. Update `/specweave-jira:sync` to detect input type
2. Add routing logic
3. Test with Epic, Feature, Increment inputs

**ADO**:
1. Update `/specweave-ado:sync` to detect input type
2. Add routing logic
3. Test with Epic, Feature, Increment inputs

### Phase 2: Mark Specialized Commands as Deprecated

**Add deprecation warnings to**:
- `specweave-github:sync-epic`
- `specweave-github:sync-spec`
- `specweave-github:sync-tasks`
- `specweave-github:sync-from`
- `specweave-jira:sync-epic`
- `specweave-jira:sync-spec`
- `specweave-ado:sync-spec`

**Warning Message**:
```
⚠️ DEPRECATED: This command will be removed in v0.20.0
   Use `/specweave-github:sync <target>` instead (auto-detects hierarchy)

   Example: /specweave-github:sync FS-031  (replaces sync-epic + sync-spec)
```

### Phase 3: Remove Deprecated Commands (v0.20.0)

**Target Release**: v0.20.0
**Breaking Change**: Remove all specialized sync commands
**Migration Guide**: Update CHANGELOG.md with migration examples

---

## Benefits of Consolidation

✅ **Simpler UX**: ONE command to remember per plugin
✅ **Smarter**: Auto-detects what you're syncing
✅ **Consistent**: Same command structure across GitHub, JIRA, ADO
✅ **Fewer Docs**: Less confusion, less maintenance
✅ **Universal Hierarchy**: Respects SpecWeave's architecture automatically
✅ **Future-Proof**: Easy to add new hierarchy levels without new commands

---

## Implementation Priority

**HIGH PRIORITY** (this increment - 0031):
1. ✅ **Document current state** (this report)
2. ⚠️ **Add deprecation warnings** to specialized commands
3. ⚠️ **Update CLAUDE.md** to recommend main sync command only

**NEXT INCREMENT** (0034 or 0035):
1. Implement auto-detection in main sync commands
2. Add comprehensive tests for all input types
3. Update all documentation to use unified command

**FUTURE** (v0.20.0):
1. Remove deprecated commands
2. Publish migration guide
3. Update marketplace descriptions

---

## Recommended Next Steps

1. **Add deprecation warnings NOW** (quick win, non-breaking)
2. **Update docs** to recommend `/specweave-{tool}:sync` as primary command
3. **Create new increment** for auto-detection implementation
4. **Test thoroughly** with all hierarchy levels
5. **Ship v0.20.0** with clean, unified commands

---

**Conclusion**: We have 12 sync commands today. After consolidation, we'll have **3 smart commands** (one per plugin) that auto-detect hierarchy and route internally. This aligns perfectly with SpecWeave's Universal Hierarchy architecture.
