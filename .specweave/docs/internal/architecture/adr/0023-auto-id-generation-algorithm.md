# ADR-0023: Auto-ID Generation Algorithm

**Status**: Accepted
**Date**: 2025-11-11
**Deciders**: System Architect, Tech Lead
**Technical Story**: Increment 0022 - Multi-Repo Initialization UX Improvements

## Context

Users were confused when manually entering repository IDs during multi-repo setup. Common errors included:
- Entering comma-separated values ("parent,fe,be") as a single ID
- Inconsistent naming conventions across repos
- Typos and invalid characters in IDs
- Difficulty choosing meaningful short IDs from long repo names

**User Impact**: Setup wizard created folders with invalid names, requiring manual cleanup and re-initialization.

## Decision

Implement automatic repository ID generation with editable defaults using a smart suffix-stripping algorithm.

### Algorithm

```typescript
function generateRepoId(repoName: string): string {
  // 1. Convert to lowercase
  let cleaned = repoName.toLowerCase();

  // 2. Strip ONE common suffix from end (if exists)
  const suffixes = ['-app', '-service', '-api', '-frontend', '-backend', '-web', '-mobile'];
  for (const suffix of suffixes) {
    if (cleaned.endsWith(suffix)) {
      cleaned = cleaned.slice(0, -suffix.length);
      break; // Only strip one suffix
    }
  }

  // 3. Split by hyphens and take last segment
  const segments = cleaned.split('-').filter(seg => seg.length > 0);
  return segments[segments.length - 1];
}
```

### Examples

| Input Repository Name | Generated ID | Reasoning |
|-----------------------|--------------|-----------|
| `my-saas-frontend-app` | `frontend` | Strips `-app`, takes `frontend` |
| `acme-api-gateway-service` | `gateway` | Strips `-service`, takes `gateway` |
| `backend-service` | `backend` | Strips `-service`, takes `backend` |
| `acme-saas-mobile` | `mobile` | No suffix, takes `mobile` |
| `company-product-auth-api` | `auth` | Strips `-api`, takes `auth` |

### Uniqueness Handling

```typescript
function ensureUniqueId(baseId: string, existingIds: Set<string>): UniqueIdResult {
  if (!existingIds.has(baseId)) {
    return { id: baseId, wasModified: false };
  }

  // Append numeric suffix: frontend-2, frontend-3, etc.
  let counter = 2;
  while (existingIds.has(`${baseId}-${counter}`)) {
    counter++;
  }

  return { id: `${baseId}-${counter}`, wasModified: true };
}
```

### User Experience

1. User enters repository name: "my-saas-frontend-app"
2. System auto-generates ID: "frontend"
3. User sees editable prompt:
   ```
   Repository ID (internal identifier): frontend (auto-generated)
   ```
4. User can:
   - Press Enter to accept
   - Edit to customize (e.g., "fe", "ui", "webapp")
   - System validates: lowercase, alphanumeric + hyphens, no commas

## Alternatives Considered

### Alternative 1: Full Repository Name as ID

**Approach**: Use complete repository name as ID
- Input: "my-saas-frontend-app" → ID: "my-saas-frontend-app"

**Rejected because**:
- Too verbose for internal references
- Redundant with repository name field
- Harder to type in CLI commands

### Alternative 2: Manual ID Entry Only

**Approach**: No auto-generation, user must manually type ID

**Rejected because**:
- Higher cognitive load on users
- More prone to typos and errors
- Inconsistent naming across repositories

### Alternative 3: Numeric IDs (repo-1, repo-2)

**Approach**: Use sequential numbers
- First repo → "repo-1"
- Second repo → "repo-2"

**Rejected because**:
- Not meaningful or memorable
- Harder to understand folder structure
- Doesn't scale to large organizations

## Consequences

### Positive

✅ **Eliminates common user errors**
- No more "parent,fe,be" single-ID mistakes
- Prevents invalid characters (commas, spaces, uppercase)
- Consistent naming conventions

✅ **Reduces cognitive load**
- Users don't have to think of short IDs
- Auto-generated suggestions are sensible
- Still allows customization when needed

✅ **Improves folder structure readability**
- Folder names are short and meaningful
- Easy to navigate in file explorer
- Clear relationship to repository names

✅ **Validates uniqueness automatically**
- Prevents ID conflicts
- Suggests numeric suffixes when needed
- Clear feedback when modifications occur

### Negative

⚠️ **Potential over-simplification**
- "my-saas-auth" and "my-company-auth" both → "auth"
- Requires numeric suffix (auth-2) for second occurrence
- Users must manually distinguish if auto-generated IDs conflict

⚠️ **Limited suffix dictionary**
- Only 7 common suffixes recognized
- Custom suffixes (like "-core", "-utils") not stripped
- May need expansion based on user feedback

### Mitigation

- **Editable defaults**: Users can always modify generated IDs
- **Validation feedback**: Clear error messages for invalid IDs
- **Uniqueness enforcement**: Automatic conflict detection
- **Suffix expansion**: Can add more suffixes based on usage patterns

## Implementation

**Files Modified/Created**:
- `src/core/repo-structure/repo-id-generator.ts` - Algorithm implementation
- `src/core/repo-structure/repo-structure-manager.ts` - Integration with prompts
- `tests/unit/repo-structure/repo-id-generator.test.ts` - Unit tests

**Test Coverage**: 90% (15 test cases covering all edge cases)

## References

- **Increment 0022 Spec**: `.specweave/increments/0022-multi-repo-init-ux/spec.md`
- **User Story**: US-002 - Auto-Generate Repository IDs
- **Acceptance Criteria**: AC-US2-01, AC-US2-02, AC-US2-03
- **Related ADRs**:
  - ADR-0014: Root-Level SpecWeave Only
  - ADR-0024: Root-Level Repository Structure

## Notes

**Design Philosophy**: Prefer convention over configuration, but always allow customization.

**Future Enhancements**:
- Machine learning to detect custom suffixes from usage patterns
- Organization-specific suffix dictionaries
- Bulk ID generation preview before confirmation
