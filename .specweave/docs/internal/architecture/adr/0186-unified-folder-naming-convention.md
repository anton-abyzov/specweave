# ADR-0186: Unified Folder Naming Convention for External Tool Integration

**Status**: Accepted
**Date**: 2025-12-01
**Authors**: Claude Code

## Context

When integrating with external tools (Azure DevOps, JIRA, GitHub), SpecWeave creates folders under `.specweave/docs/internal/specs/` to organize living documentation. These folder names are derived from external entity names (ADO projects, JIRA project keys, GitHub repos, etc.).

### Problem

Multiple code paths were creating these folders with **inconsistent normalization**:

1. `ado-project-detector.ts:createProjectFolders()` used **raw project names** directly:
   ```typescript
   const projectPath = path.join(specsPath, project);  // "My Project" with spaces!
   ```

2. `external-import.ts:buildAdoConfigFromProjects()` used `normalizeToProjectId()`:
   ```typescript
   const projectFolder = normalizeToProjectId(proj.name);  // "my-project"
   ```

3. `ado.ts:createSingleProjectFolders()` used **raw project names** directly:
   ```typescript
   const projectDir = path.join(specsDir, projectName);  // "My Project" with spaces!
   ```

**Result**: Duplicate folders for the same ADO project:
- `.specweave/docs/internal/specs/My Project/` (from folder creation)
- `.specweave/docs/internal/specs/my-project/` (from import)

## Decision

**All folder names derived from external tool entities MUST use `normalizeToProjectId()`** from `src/utils/project-id-generator.ts`.

### Canonical Normalization Function

```typescript
export function normalizeToProjectId(name: string): string {
  return name
    .toLowerCase()                    // "My Project" → "my project"
    .replace(/[^a-z0-9]+/g, '-')      // "my project" → "my-project"
    .replace(/-+/g, '-')              // Remove consecutive hyphens
    .replace(/^-|-$/g, '');           // Remove leading/trailing hyphens
}
```

### Normalization Examples

| Input | Output |
|-------|--------|
| `My Project` | `my-project` |
| `Platform Engineering Team` | `platform-engineering-team` |
| `FRONTEND` | `frontend` |
| `League Scheduler\QA Team` | `league-scheduler-qa-team` |
| `Test@#$123` | `test-123` |

### Alternative: `slugify()` Function

The `slugify()` function from `src/utils/string-utils.ts` is similar but NOT identical:

```typescript
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')  // Remove non-word chars (keeps underscores!)
    .replace(/[\s_]+/g, '-')   // Replace spaces/underscores with hyphens
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

**Key difference**: `slugify` removes special characters entirely, while `normalizeToProjectId` replaces them with hyphens.

| Input | `slugify()` | `normalizeToProjectId()` |
|-------|-------------|--------------------------|
| `Test@#$123` | `test123` | `test-123` |
| `hello_world` | `hello-world` | `hello-world` |

For typical external tool names (spaces, letters, numbers), both produce identical results. However, `normalizeToProjectId()` is the **canonical function** for folder naming.

## Implementation

### Files Fixed (2025-12-01)

1. **`plugins/specweave-ado/lib/ado-project-detector.ts`**
   - `createProjectFolders()` now uses `normalizeToProjectId()` for all folder names

2. **`src/cli/helpers/issue-tracker/ado.ts`**
   - `createSingleProjectFolders()` now uses `normalizeToProjectId()` for project, area, and team folders

### Files Already Correct

- `src/cli/helpers/init/external-import.ts` - uses `normalizeToProjectId()`
- `src/core/sync/folder-mapper.ts` - uses `slugify()` (produces same result for typical names)

## Consequences

### Positive
- **No more duplicate folders** for the same external project
- **Consistent folder structure** regardless of entry point (init vs import)
- **Predictable paths** - users can calculate folder paths programmatically

### Negative
- **Existing projects with space-containing folders** will need manual cleanup
- **Migration required** for affected installations (see below)

### Migration for Affected Installations

If you have duplicate folders like "My Project" and "my-project":

```bash
# 1. Check for duplicates
ls -la .specweave/docs/internal/specs/

# 2. Merge content (if any) from space-containing folder to normalized folder
mv ".specweave/docs/internal/specs/My Project/"* \
   ".specweave/docs/internal/specs/my-project/"

# 3. Remove the space-containing folder
rm -rf ".specweave/docs/internal/specs/My Project"
```

## Related ADRs

- ADR-0129: Project ID Generator Architecture
- ADR-0138: Init Command Modular Structure
