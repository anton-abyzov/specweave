# Internal Structure Change Analysis

**Date**: 2025-11-11
**Issue**: GitHub plugin and other code is generating specs in wrong location
**Status**: Planning

---

## Problem Statement

The current multi-project structure uses nested folders:

```
.specweave/docs/internal/
└── projects/              ← Extra nesting level
    ├── backend/
    │   ├── specs/
    │   ├── modules/
    │   ├── team/
    │   ├── architecture/
    │   └── legacy/
    └── frontend/
        ├── specs/
        ├── modules/
        └── ...
```

**Issues**:
1. ✅ Extra `projects/` level adds unnecessary complexity
2. ✅ GitHub sync and other tools have longer paths to construct
3. ✅ Inconsistent with top-level cross-project folders (strategy/, architecture/, etc.)
4. ✅ Makes parent repo specs unclear (should use special name like `_parent`)

---

## Proposed Structure

**Flatten the structure** - Remove `projects/` level:

```
.specweave/docs/internal/
├── strategy/              # Cross-project (unchanged)
├── architecture/          # System-wide ADRs (unchanged)
├── delivery/              # Cross-project (unchanged)
├── operations/            # Cross-project (unchanged)
├── governance/            # Cross-project (unchanged)
│
├── specs/                 # ✨ NEW: Flattened project specs
│   ├── backend/           # Project: backend
│   ├── frontend/          # Project: frontend
│   ├── mobile-app/        # Project: mobile-app
│   └── _parent/           # ✨ Special: Parent repo specs
│
├── modules/               # ✨ NEW: Flattened project modules
│   ├── backend/
│   ├── frontend/
│   └── _parent/
│
├── team/                  # ✨ NEW: Flattened project team docs
│   ├── backend/
│   ├── frontend/
│   └── _parent/
│
├── project-arch/          # ✨ NEW: Project-specific ADRs (renamed to avoid conflict)
│   ├── backend/
│   └── frontend/
│
└── legacy/                # ✨ NEW: Flattened brownfield imports
    ├── backend/
    └── frontend/
```

---

## Parent Repo Naming Convention

**Decision**: Use `_parent` for parent repository specs

**Options Considered**:
- ✅ `_parent` - Clear intent, indicates parent in multi-repo setup
- ⚠️ `_system` - Too generic
- ⚠️ `_root` - Unclear meaning
- ⚠️ `_shared` - Could be confused with shared library code
- ⚠️ `_core` - Could be confused with core framework

**Rationale**: `_parent` is self-documenting and immediately conveys "this is the parent repository in a multi-repo setup"

---

## Code Changes Required

### 1. Core Path Resolution (`src/core/project-manager.ts`)

**Current**:
```typescript
getProjectBasePath(projectId?: string): string {
  const project = projectId ? this.getProjectById(projectId) : this.getActiveProject();
  return path.join(
    this.projectRoot,
    '.specweave/docs/internal/projects',  // ❌ REMOVE THIS
    project.id
  );
}

getSpecsPath(projectId?: string): string {
  return path.join(this.getProjectBasePath(projectId), 'specs');
}
```

**Proposed**:
```typescript
// Remove getProjectBasePath() - no longer needed!

getSpecsPath(projectId?: string): string {
  const project = projectId ? this.getProjectById(projectId) : this.getActiveProject();
  return path.join(
    this.projectRoot,
    '.specweave/docs/internal/specs',  // ✅ Direct path
    project.id
  );
}

getModulesPath(projectId?: string): string {
  const project = projectId ? this.getProjectById(projectId) : this.getActiveProject();
  return path.join(
    this.projectRoot,
    '.specweave/docs/internal/modules',  // ✅ Direct path
    project.id
  );
}

getTeamPath(projectId?: string): string {
  const project = projectId ? this.getProjectById(projectId) : this.getActiveProject();
  return path.join(
    this.projectRoot,
    '.specweave/docs/internal/team',  // ✅ Direct path
    project.id
  );
}

// Rename to avoid conflict with top-level architecture/
getProjectArchitecturePath(projectId?: string): string {
  const project = projectId ? this.getProjectById(projectId) : this.getActiveProject();
  return path.join(
    this.projectRoot,
    '.specweave/docs/internal/project-arch',  // ✅ Renamed
    project.id
  );
}

getLegacyPath(source?: string, projectId?: string): string {
  const project = projectId ? this.getProjectById(projectId) : this.getActiveProject();
  const basePath = path.join(
    this.projectRoot,
    '.specweave/docs/internal/legacy',  // ✅ Direct path
    project.id
  );
  return source ? path.join(basePath, source) : basePath;
}
```

### 2. Migration Command (`src/cli/commands/migrate-to-multiproject.ts`)

**Update line 140**:
```typescript
// OLD:
const newSpecsPath = path.join(
  projectRoot,
  `.specweave/docs/internal/projects/${projectId}/specs`
);

// NEW:
const newSpecsPath = path.join(
  projectRoot,
  `.specweave/docs/internal/specs/${projectId}`
);
```

### 3. Brownfield Importer (`src/core/brownfield/importer.ts`)

Already uses `projectManager.getSpecsPath()` - no changes needed! ✅

### 4. All Test Files

**Pattern to replace**:
```typescript
// OLD:
path.join(specweaveRoot, 'docs/internal/projects/default/specs')
path.join(specweaveRoot, `docs/internal/projects/${project.id}/specs`)

// NEW:
path.join(specweaveRoot, 'docs/internal/specs/default')
path.join(specweaveRoot, `docs/internal/specs/${project.id}`)
```

**Files to update** (~20 files):
- `tests/e2e/brownfield/import.spec.ts`
- `tests/e2e/multi-project/workflow.spec.ts`
- `tests/e2e/multi-project/switching.spec.ts`
- `tests/e2e/increment-discipline.spec.ts`
- `tests/unit/cli/import-docs.test.ts`
- And others...

### 5. Documentation

**Files to update**:
- `CLAUDE.md` - Update "Internal Documentation Structure" section
- `.specweave/docs/internal/architecture/adr/0017-multi-project-internal-structure.md` - Update with new structure
- Create new ADR for this change: `0023-flatten-internal-structure.md`

### 6. Schema (`src/core/schemas/specweave-config.schema.json`)

Check if any schema definitions reference the old path structure. Update if needed.

---

## Migration Strategy

### For Existing Projects

**Option 1: Automatic Migration Script**

```bash
#!/bin/bash
# migrate-flatten-structure.sh

echo "🔄 Migrating to flattened structure..."

# Move each project's folders
for project_dir in .specweave/docs/internal/projects/*/; do
  project_id=$(basename "$project_dir")

  # Move specs
  if [ -d "$project_dir/specs" ]; then
    mkdir -p ".specweave/docs/internal/specs/$project_id"
    mv "$project_dir/specs/"* ".specweave/docs/internal/specs/$project_id/"
  fi

  # Move modules
  if [ -d "$project_dir/modules" ]; then
    mkdir -p ".specweave/docs/internal/modules/$project_id"
    mv "$project_dir/modules/"* ".specweave/docs/internal/modules/$project_id/"
  fi

  # Move team
  if [ -d "$project_dir/team" ]; then
    mkdir -p ".specweave/docs/internal/team/$project_id"
    mv "$project_dir/team/"* ".specweave/docs/internal/team/$project_id/"
  fi

  # Move project-specific architecture
  if [ -d "$project_dir/architecture" ]; then
    mkdir -p ".specweave/docs/internal/project-arch/$project_id"
    mv "$project_dir/architecture/"* ".specweave/docs/internal/project-arch/$project_id/"
  fi

  # Move legacy
  if [ -d "$project_dir/legacy" ]; then
    mkdir -p ".specweave/docs/internal/legacy/$project_id"
    mv "$project_dir/legacy/"* ".specweave/docs/internal/legacy/$project_id/"
  fi
done

# Remove old projects/ directory
rm -rf .specweave/docs/internal/projects

echo "✅ Migration complete!"
```

**Option 2: Detect and Prompt**

Add detection in `specweave init` or CLI commands:
```typescript
if (fs.existsSync('.specweave/docs/internal/projects')) {
  console.warn('⚠️  Old structure detected!');
  console.warn('   Run: npm run migrate-flatten-structure');
}
```

---

## Backwards Compatibility

**Strategy**: Add version detection and automatic migration

```typescript
// In ConfigManager or ProjectManager
async detectAndMigrate(): Promise<void> {
  const oldPath = path.join(this.projectRoot, '.specweave/docs/internal/projects');
  const newPath = path.join(this.projectRoot, '.specweave/docs/internal/specs');

  if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
    console.log('🔄 Migrating to new structure...');
    await runMigrationScript();
    console.log('✅ Migration complete!');
  }
}
```

---

## Benefits of This Change

1. ✅ **Simpler paths** - Remove extra `projects/` nesting level
2. ✅ **Consistent with cross-project folders** - All internal folders at same level
3. ✅ **Clearer parent repo** - Use `_parent` special name
4. ✅ **Easier GitHub sync** - Shorter paths to construct
5. ✅ **Better file organization** - Group by document type first, then by project

---

## Risks and Mitigation

### Risk 1: Breaking Existing Projects

**Mitigation**:
- Automatic migration script
- Version detection
- Clear upgrade instructions

### Risk 2: Confusion with Cross-Project Architecture

**Mitigation**:
- Rename project-specific architecture to `project-arch/`
- Update documentation clearly explaining the difference

### Risk 3: Test Failures

**Mitigation**:
- Update all tests in same commit
- Run full test suite before merging

---

## Implementation Checklist

- [ ] Update `ProjectManager` class methods
- [ ] Update migration command
- [ ] Create migration script for existing projects
- [ ] Update all test files (E2E, integration, unit)
- [ ] Update CLAUDE.md
- [ ] Update ADR 0017
- [ ] Create ADR 0023 for this change
- [ ] Update schema if needed
- [ ] Test with single-project mode
- [ ] Test with multi-project mode
- [ ] Test migration script on real project

---

## Next Steps

1. **Get approval** on this structure change
2. **Implement code changes** in ProjectManager
3. **Create migration script** for existing projects
4. **Update documentation** (CLAUDE.md, ADRs)
5. **Update tests** to use new paths
6. **Test thoroughly** with various scenarios
7. **Merge and release** with clear migration guide

---

**Decision Required**: Approve this structure change?

- ✅ **YES** - Proceed with implementation
- ❌ **NO** - Explain concerns and propose alternative
