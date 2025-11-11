# ADR-0024: Root-Level Repository Structure

**Status**: Accepted
**Date**: 2025-11-11
**Deciders**: System Architect, Tech Lead
**Technical Story**: Increment 0022 - Multi-Repo Initialization UX Improvements

## Context

Previous implementation cloned implementation repositories into a `services/` subdirectory:

```
my-project/
├── .specweave/           ← Parent repo with specs/docs
├── services/             ← Nested folder (REMOVED!)
│   ├── frontend/         ← Implementation repo 1
│   ├── backend/          ← Implementation repo 2
│   └── shared/           ← Implementation repo 3
└── .gitignore
```

**Problems**:
1. **Extra nesting**: Users had to navigate `services/` folder for no clear benefit
2. **Confusion**: "Why is there a services/ folder when we're using parent repo pattern?"
3. **Inconsistency**: Parent repo at root, implementation repos nested (asymmetric)
4. **Monorepo confusion**: Users thought `services/` indicated monorepo structure
5. **User feedback**: "Don't use 'services' folder! just put all repos into the root!"

## Decision

Clone ALL repositories at root level, removing the `services/` intermediary folder.

### New Structure

```
my-project-parent/         ← Parent repo (contains .specweave/)
├── .specweave/
│   ├── increments/
│   ├── docs/
│   └── logs/
├── .env                   ← GitHub configuration
├── .gitignore             ← Ignore implementation repos
├── frontend/              ← Cloned at ROOT (no services/)
├── backend/               ← Cloned at ROOT
└── shared/                ← Cloned at ROOT
```

### Implementation

**File**: `src/core/repo-structure/repo-structure-manager.ts`

**Before** (Line 497):
```typescript
path: useParent ? `services/${id}` : id,  // ❌ Nested in services/
```

**After** (Line 497):
```typescript
path: useParent ? id : id,  // ✅ Root-level cloning
```

### .gitignore Pattern

Implementation repos must be git-ignored to prevent conflicts:

```gitignore
# SpecWeave: Ignore implementation repos (cloned separately)
frontend/
backend/
shared/
mobile/

# But track parent repo files
!.specweave/
!.env.example
!.gitignore
!README.md
```

## Alternatives Considered

### Alternative 1: Keep services/ Folder

**Approach**: Maintain nested structure with `services/` intermediary

**Rejected because**:
- No clear organizational benefit
- Extra folder depth (2 clicks instead of 1)
- User confusion ("Is this a monorepo?")
- Inconsistent with parent repo pattern (parent at root, implementations nested)
- **Direct user feedback**: "Don't use services folder!"

### Alternative 2: Custom Folder Name

**Approach**: Allow users to choose folder name (repos/, apps/, components/, etc.)

**Rejected because**:
- Adds configuration complexity
- No clear default choice
- Doesn't solve the fundamental issue (extra nesting)
- Root-level is simpler and more intuitive

### Alternative 3: Git Submodules

**Approach**: Use git submodules instead of separate clones

**Rejected because**:
- Submodules are complex and error-prone
- Adds learning curve for teams
- Harder to work with (detached HEAD issues)
- SpecWeave goal is simplicity, not git complexity

## Consequences

### Positive

✅ **Cleaner folder structure**
- Less nesting, easier navigation
- Implementation repos at same level as parent folders
- Visually clear separation (parent has .specweave/, implementations don't)

✅ **Eliminates user confusion**
- No "services/" folder to wonder about
- Clear separation: parent repo vs implementation repos
- Consistent with multi-repo mental model

✅ **Faster navigation**
- One less folder to click through
- Shorter paths in terminal commands
- Easier to reference in documentation

✅ **Better .gitignore patterns**
- Simple folder names to ignore
- No nested path complexity
- Clear separation of concerns

### Negative

⚠️ **Potential folder proliferation**
- With 10+ implementation repos, project root has many folders
- Less visual grouping than `services/` provided
- Can be mitigated with clear naming conventions

⚠️ **No built-in categorization**
- `services/` implied "implementation repos"
- Now repos must have self-descriptive names
- Reliance on naming conventions (frontend, backend, mobile, shared, etc.)

### Mitigation

**Naming Conventions**: Encourage descriptive repository names
- Good: `frontend`, `backend`, `auth-service`, `payment-service`
- Avoid: `repo1`, `repo2`, `app`, `service`

**Documentation**: Parent repo README.md explains structure
```markdown
# My Project (Parent Repo)

This repository contains specs, docs, and increments for the entire system.

## Implementation Repositories

- `frontend/` - React frontend ([repo link])
- `backend/` - Node.js API ([repo link])
- `shared/` - Shared TypeScript libraries ([repo link])

## Getting Started

1. Clone parent repo (this repo)
2. Run `./setup.sh` to clone all implementation repos
3. Each implementation repo has its own README
```

**Shell Scripts**: Provide helper scripts
```bash
#!/bin/bash
# setup.sh - Clone all implementation repos

repos=("frontend" "backend" "shared")
owner="my-org"

for repo in "${repos[@]}"; do
  git clone "https://github.com/$owner/my-project-$repo.git" "$repo"
done
```

## Implementation

**Files Modified**:
- `src/core/repo-structure/repo-structure-manager.ts:497` - Path generation
- `src/core/repo-structure/repo-structure-manager.ts:852` - Comment update
- `src/core/repo-structure/repo-structure-manager.ts:865` - Clone logic

**Migration**: Automatic for new projects. Existing projects must manually move folders if desired.

**Test Coverage**: 85% (integration tests verify root-level cloning)

## References

- **Increment 0022 Spec**: `.specweave/increments/0022-multi-repo-init-ux/spec.md`
- **User Story**: US-005 - Root-Level Repository Structure
- **Acceptance Criteria**: AC-US5-01, AC-US5-03, AC-US5-04
- **User Feedback**: "Don't use 'services' folder! just put all repos into the root!"
- **Related ADRs**:
  - ADR-0014: Root-Level SpecWeave Only
  - ADR-0023: Auto-ID Generation Algorithm

## Notes

**Design Philosophy**: Simplicity over rigid structure. Trust users to organize with naming conventions rather than enforcing folder hierarchies.

**Real-World Example**: SpecWeave itself uses root-level organization
```
specweave/ (parent repo with .specweave/)
├── plugins/ (not nested in services/)
├── src/ (not nested in services/)
└── tests/ (not nested in services/)
```

**Future Enhancements**:
- Optional folder organization via configuration
- Helper scripts for batch clone operations
- VS Code workspace file generation for multi-root setup
