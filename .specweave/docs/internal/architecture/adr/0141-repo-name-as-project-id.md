# ADR-0141: Repository Name as Project ID

**Status**: Accepted
**Date**: 2025-11-25

## Context

Project ID generation used complex suffix-stripping that caused collisions:
- `my-frontend` and `your-frontend` both became `frontend`
- Required conflict resolution logic (abbreviations, fallbacks)
- Lost context (original name discarded)

## Decision

**Use repository name directly as project ID** (after normalization).

```typescript
normalizeRepoName('My-SaaS-Frontend')  // → 'my-saas-frontend'
normalizeRepoName('sw_qr_menu_be')     // → 'sw-qr-menu-be'
```

## Rationale

- Repository names are **already unique** within an organization
- No collisions possible
- Predictable: repo name = project ID
- Simpler code (~80 lines vs ~250 lines)

## Implementation

**`repo-id-generator.ts`** exports only 3 functions:
- `normalizeRepoName(name)` - lowercase, replace `_` with `-`, remove invalid chars
- `validateRepoId(id)` - validate format
- `suggestRepoName(project, index, total)` - suggest names for multi-repo setup

## Consequences

- **Positive**: Simpler, no collisions, predictable
- **Negative**: Longer folder names (but more descriptive)
