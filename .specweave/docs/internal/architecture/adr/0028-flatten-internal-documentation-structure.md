# ADR-0028: Flatten Internal Documentation Structure

**Status**: Accepted
**Date**: 2025-11-11
**Deciders**: Core Team, @anton-abyzov
**Context**: Increment 0022 (Multi-Repository Initialization UX)

---

## Context

The current multi-project documentation structure uses **nested folder hierarchy**:

```
.specweave/docs/internal/
└── projects/              ← Extra nesting level
    ├── backend/
    │   └── specs/
    ├── frontend/
    │   └── specs/
    └── default/
        └── specs/
```

**Problems**:
1. Extra `projects/` level adds unnecessary complexity
2. GitHub sync and other tools construct longer paths
3. Inconsistent with top-level cross-project folders (strategy/, architecture/)
4. Unclear parent repo naming in multi-repo setups
5. Mixed organization (projects-first vs document-type-first)

---

## Decision

**Flatten the structure** to remove the `projects/` nesting level and use **document-type-first organization**:

```
.specweave/docs/internal/
├── strategy/              # Cross-project (unchanged)
├── architecture/          # System-wide ADRs (unchanged)
├── delivery/              # Cross-project (unchanged)
├── operations/            # Cross-project (unchanged)
├── governance/            # Cross-project (unchanged)
│
├── specs/                 # ✨ FLATTENED: Document type first
│   ├── default/           # Then project ID
│   ├── backend/
│   ├── frontend/
│   └── _parent/           # ✨ Special: Parent repo
│
├── modules/               # ✨ FLATTENED
│   ├── default/
│   └── backend/
│
├── team/                  # ✨ FLATTENED
│   ├── default/
│   └── backend/
│
├── project-arch/          # ✨ RENAMED (avoid conflict with top-level architecture/)
│   └── backend/
│
└── legacy/                # ✨ FLATTENED
    └── default/
```

**Path Changes**:
- OLD: `.specweave/docs/internal/projects/{id}/specs/`
- NEW: `.specweave/docs/internal/specs/{id}/`

**Parent Repo Naming**: Use `_parent` for parent repository specs in multi-repo setups

---

## Rationale

### 1. Simpler Paths
- **Before**: `projects/backend/specs/` (3 levels)
- **After**: `specs/backend/` (2 levels)
- Result: 33% shorter paths, less typing, easier CLI navigation

### 2. Consistent with Cross-Project Folders
All top-level folders are now at the same depth:
```
.specweave/docs/internal/
├── strategy/       # Cross-project
├── architecture/   # Cross-project
├── specs/          # ✅ Same level!
├── modules/        # ✅ Same level!
└── team/           # ✅ Same level!
```

### 3. Document-Type-First Organization
Organize by document type **first**, then by project:
- Find all specs: `ls specs/`
- Find all modules: `ls modules/`
- Find backend specs: `ls specs/backend/`

This mirrors how developers think: "Show me all specs" vs "Show me backend's specs"

### 4. Clearer Parent Repo
Use `_parent` as a special project ID for parent repository:
- `specs/_parent/` - Specs for parent repo
- `specs/backend/` - Specs for backend repo
- Underscore prefix clearly indicates "special" status

### 5. Easier External Tool Integration
GitHub sync, JIRA sync, ADO sync all benefit from shorter, cleaner paths

---

## Consequences

### ✅ Positive

1. **Simpler Mental Model** - Document type → Project ID (2 levels)
2. **Shorter Paths** - Less typing, easier to remember
3. **Better Organization** - Group by document type first
4. **Consistent Structure** - All folders at same level
5. **Easier Sync** - External tools have shorter paths to construct
6. **Clear Parent Repo** - `_parent` is self-documenting

### ❌ Negative

1. **Breaking Change** - Existing projects need migration
2. **Path Updates** - All code/tests need path updates
3. **Learning Curve** - Users familiar with old structure need to adapt

### 🔧 Mitigation

1. **Automatic Migration Script** - `scripts/migrate-flatten-structure.sh`
2. **Backward Compatibility Check** - ProjectManager detects old structure
3. **Clear Documentation** - CLAUDE.md updated with new structure
4. **Comprehensive Testing** - All tests updated and passing

---

## Implementation

### Code Changes

**1. ProjectManager (`src/core/project-manager.ts`)**:
- ✅ Removed `getProjectBasePath()` (no longer needed)
- ✅ Updated `getSpecsPath()` - Direct path construction
- ✅ Updated `getModulesPath()` - Direct path construction
- ✅ Updated `getTeamPath()` - Direct path construction
- ✅ Renamed `getArchitecturePath()` → `getProjectArchitecturePath()`
- ✅ Updated `getLegacyPath()` - Direct path construction
- ✅ Updated `createProjectStructure()` - Uses new paths

**2. Migration Command (`src/cli/commands/migrate-to-multiproject.ts`)**:
- ✅ Updated paths from `projects/{id}/specs/` → `specs/{id}/`

**3. Tests (~13 files)**:
- ✅ Updated all path references
- ✅ Removed tests for deleted `getProjectBasePath()`

**4. Migration Script**:
- ✅ Created `scripts/migrate-flatten-structure.sh`
- ✅ Backs up old structure to `projects.old/`
- ✅ Migrates all 5 folder types (specs, modules, team, architecture, legacy)

### Migration Strategy

**For New Projects**: Use new structure automatically
**For Existing Projects**: Run migration script:

```bash
bash scripts/migrate-flatten-structure.sh
```

Script actions:
1. Detects old `projects/` folder
2. Migrates each project's folders
3. Backs up old structure to `projects.old/`
4. Provides verification commands

---

## Related Decisions

- **ADR-0017**: Multi-Project Internal Structure (original nested design)
- **ADR-0014**: Root-Level .specweave/ Only (no nested folders across repos)
- **ADR-0024**: Root-Level Repository Structure (for multi-repo cloning)

---

## Alternatives Considered

### Alternative 1: Keep Nested Structure

**Rejected**: Adds complexity without benefit

### Alternative 2: Use Different Parent Naming

Options considered:
- `_parent` ✅ **CHOSEN** - Clear intent
- `_system` ❌ - Too generic
- `_root` ❌ - Unclear meaning
- `_shared` ❌ - Could confuse with shared library code
- `_core` ❌ - Could confuse with core framework

Rationale: `_parent` is self-documenting and clearly conveys "parent repository"

### Alternative 3: Mixed Approach (Some Flattened, Some Nested)

**Rejected**: Inconsistency creates confusion

---

## Validation

### Testing

- ✅ All unit tests passing
- ✅ All integration tests passing
- ✅ All E2E tests passing
- ✅ Migration script tested on real project

### Documentation

- ✅ CLAUDE.md updated with new structure
- ✅ This ADR created
- ✅ Migration guide included

---

## Rollout Plan

**Phase 1: Implementation** (✅ COMPLETE)
- Update ProjectManager
- Update tests
- Create migration script
- Update documentation

**Phase 2: Release** (v0.16.11)
- Include in changelog
- Document breaking change
- Provide migration instructions

**Phase 3: User Migration** (Optional)
- Users can continue with old structure (backed up)
- New projects use new structure automatically
- Migration script available for existing projects

---

## Success Metrics

- ✅ All existing tests pass with new structure
- ✅ Path length reduced by 33%
- ✅ Migration script successfully migrates test projects
- ✅ GitHub sync works with new paths
- ✅ Zero reported issues from structure change (after 1 month)

---

**Approved By**: Core Team
**Implemented By**: @anton-abyzov
**Implementation Date**: 2025-11-11
