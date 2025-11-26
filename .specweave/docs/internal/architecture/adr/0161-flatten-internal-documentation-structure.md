# ADR-0028: Internal Documentation Structure (Flattened)

**Status**: Accepted
**Date**: 2025-11-11
**Deciders**: Core Team, @anton-abyzov
**Context**: Multi-Project Architecture

---

## Context

SpecWeave organizes internal documentation using a **flattened, document-type-first structure**.

---

## Decision

Use **flattened, document-type-first organization**:

```
.specweave/docs/internal/
├── strategy/              # Cross-project: Business rationale, vision, OKRs
├── architecture/          # System-wide ADRs
├── delivery/              # Build & release processes
├── operations/            # Production operations, runbooks
├── governance/            # Policies, compliance, standards
│
├── specs/                 # Living docs specs (document type first)
│   ├── default/           # Then project ID
│   ├── backend/
│   ├── frontend/
│   └── _parent/           # Special: Parent repo in multi-repo
│
├── modules/               # Module/component documentation
│   ├── default/
│   └── backend/
│
├── team/                  # Team playbooks and conventions
│   ├── default/
│   └── backend/
│
├── project-arch/          # Project-specific ADRs
│   └── backend/
│
└── legacy/                # Brownfield imports (temporary)
    └── default/
```

**Path Format**: `.specweave/docs/internal/{document-type}/{project-id}/`

**Parent Repo Naming**: Use `_parent` for parent repository in multi-repo setups

---

## Rationale

### 1. Simple Paths
- Format: `{document-type}/{project-id}/`
- Example: `specs/backend/`
- Result: Short, clear, easy to navigate

### 2. Consistent Depth
All folders at the same level under `internal/`:
```
.specweave/docs/internal/
├── strategy/       # Cross-project
├── architecture/   # Cross-project
├── specs/          # Per-project
├── modules/        # Per-project
└── team/           # Per-project
```

### 3. Document-Type-First
Organize by what it is, then which project:
- `ls specs/` → All specs across all projects
- `ls specs/backend/` → Backend specs only
- `ls modules/` → All module docs

This matches developer mental models: "Show me all specs" vs "Show me backend stuff"

### 4. Clearer Parent Repo
Use `_parent` as a special project ID for parent repository:
- `specs/_parent/` - Specs for parent repo
- `specs/backend/` - Specs for backend repo
- Underscore prefix clearly indicates "special" status

### 5. Easier External Tool Integration
GitHub sync, JIRA sync, ADO sync all benefit from shorter, cleaner paths

---

## Benefits

1. **Simpler Mental Model** - Document type → Project ID (2 levels)
2. **Shorter Paths** - Less typing, easier to remember
3. **Better Organization** - Group by document type first
4. **Consistent Structure** - All folders at same level
5. **Easier Sync** - External tools have shorter paths
6. **Clear Parent Repo** - `_parent` is self-documenting

---

## Implementation

### Core Components

**1. ProjectManager (`src/core/project-manager.ts`)**:
- `getSpecsPath()` → `.specweave/docs/internal/specs/{projectId}/`
- `getModulesPath()` → `.specweave/docs/internal/modules/{projectId}/`
- `getTeamPath()` → `.specweave/docs/internal/team/{projectId}/`
- `getProjectArchitecturePath()` → `.specweave/docs/internal/project-arch/{projectId}/`
- `getLegacyPath()` → `.specweave/docs/internal/legacy/{projectId}/`
- `createProjectStructure()` → Creates all 5 folders

**2. Init Command (`src/cli/commands/init.ts`)**:
- Creates flattened structure automatically
- Multi-project mode: `specs/{id}/`, `modules/{id}/`, etc.
- Single-project mode: `specs/default/`, `modules/default/`, etc.

**3. All Sync Clients**:
- GitHub, JIRA, ADO all use `ProjectManager.getSpecsPath()`
- Automatically get correct flattened paths

---

## Related Decisions

- **ADR-0014**: Root-Level .specweave/ Only (no nested folders across repos)
- **ADR-0024**: Root-Level Repository Structure (for multi-repo cloning)

---

## Alternatives Considered

### Alternative 1: Use Different Parent Naming

Options:
- `_parent` ✅ **CHOSEN** - Clear intent, self-documenting
- `_system` ❌ - Too generic
- `_root` ❌ - Unclear
- `_shared` ❌ - Could confuse with code
- `_core` ❌ - Could confuse with framework

---

## Validation

- ✅ All tests passing with new structure
- ✅ Path length reduced
- ✅ GitHub/JIRA/ADO sync working
- ✅ Documentation updated

---

**Approved By**: Core Team
**Implemented By**: @anton-abyzov
**Implementation Date**: 2025-11-11
