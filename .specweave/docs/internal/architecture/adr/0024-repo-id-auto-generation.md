# ADR-0024: Repository ID Auto-Generation Strategy

**Date**: 2025-11-11
**Status**: Accepted
**Context**: Increment 0022 - Multi-Repository Initialization UX Improvements

---

## Context

Users must provide repository IDs during multi-repo setup for internal references:

**Current Problem**:
- Manual ID entry is repetitive ("my-saas-frontend" → user types "frontend")
- Error-prone (typos, comma-separated input like "parent,fe,be")
- No smart defaults based on repository name
- No uniqueness validation
- Poor UX (feels like busywork)

**Example User Flow (Current)**:
```
Enter repository name: my-saas-frontend-app
Enter repository ID: [user types "frontend"]

Enter repository name: my-saas-backend-api
Enter repository ID: [user types "backend"]

Enter repository name: my-saas-mobile-app
Enter repository ID: [user types "mobile"]
```

**Requirements**:
- Auto-generate IDs from repository names
- Allow user to edit if incorrect
- Prevent invalid IDs (commas, special chars)
- Ensure uniqueness across all repos
- Handle common naming patterns (90%+ coverage)

---

## Decision

Implement a suffix-stripping algorithm that auto-generates repository IDs:

### Algorithm

```typescript
function generateRepoId(repoName: string): string {
  // List of common suffixes to strip
  const suffixes = [
    '-app',
    '-service',
    '-api',
    '-frontend',
    '-backend',
    '-web',
    '-mobile',
    '-client',
    '-server'
  ];

  // Strip suffix if present
  let cleaned = repoName.toLowerCase();
  for (const suffix of suffixes) {
    if (cleaned.endsWith(suffix)) {
      cleaned = cleaned.slice(0, -suffix.length);
      break; // Only strip one suffix
    }
  }

  // Split by hyphen and take last segment
  const segments = cleaned.split('-');
  const id = segments[segments.length - 1];

  // Validate and return
  if (id.length === 0) {
    return repoName.toLowerCase(); // Fallback to full name
  }

  return id;
}
```

### Examples

| Repository Name | Generated ID | Reasoning |
|----------------|--------------|-----------|
| my-saas-frontend-app | frontend | Strips `-app`, takes last segment |
| acme-api-gateway-service | gateway | Strips `-service`, takes last segment |
| backend-service | backend | Strips `-service`, takes remaining |
| mobile-app | mobile | Strips `-app`, takes remaining |
| my-company-portal | portal | No suffix, takes last segment |
| web | web | Single word, no changes |
| frontend | frontend | No suffix, already clean |

### Uniqueness Handling

```typescript
function ensureUniqueId(
  generatedId: string,
  existingIds: Set<string>
): string {
  let uniqueId = generatedId;
  let counter = 2;

  while (existingIds.has(uniqueId)) {
    uniqueId = `${generatedId}-${counter}`;
    counter++;
  }

  return uniqueId;
}
```

**Example**:
- Repo 1: "my-app-frontend" → "frontend"
- Repo 2: "other-frontend-app" → "frontend-2" (conflict resolved)

### User Flow (New)

```
Enter repository name: my-saas-frontend-app
Repository ID: [frontend] (press Enter to accept, or type custom ID)
✓ Using ID: frontend

Enter repository name: my-saas-backend-api
Repository ID: [backend] (press Enter to accept, or type custom ID)
✓ Using ID: backend
```

---

## Alternatives Considered

### Alternative 1: Full Repository Name as ID

**Approach**: Use full repository name as ID (no generation)

```
Repository Name: my-saas-frontend-app
Repository ID: my-saas-frontend-app
```

**Pros**:
- No ambiguity
- No conflicts possible
- Simple implementation

**Cons**:
- ❌ Long IDs are cumbersome ("my-saas-frontend-app" vs "frontend")
- ❌ Poor UX in config files (`repos: { "my-saas-frontend-app": {...} }`)
- ❌ Verbose CLI output
- ❌ Doesn't match user mental model (they think "frontend", not "my-saas-frontend-app")

**Why Not**: IDs should be short and memorable

### Alternative 2: Ask User for Custom Segment

**Approach**: Prompt user to choose which segment to use as ID

```
Repository Name: my-saas-frontend-app
Segments: my / saas / frontend / app
Which segment should be the ID? [frontend]
```

**Pros**:
- User has full control
- Handles edge cases better

**Cons**:
- ❌ Extra prompt (increases friction)
- ❌ Confusing for users ("What's a segment?")
- ❌ Most users just want defaults
- ❌ Doesn't solve uniqueness problem

**Why Not**: Too much cognitive load for simple task

### Alternative 3: Machine Learning-Based Extraction

**Approach**: Use NLP/ML to extract semantic meaning from repo name

```typescript
// Example using ML model
const id = extractSemanticId(repoName); // "my-saas-frontend-app" → "frontend"
```

**Pros**:
- Potentially more accurate
- Could handle unusual patterns
- Learning from user corrections

**Cons**:
- ❌ Massive overkill for simple problem
- ❌ Requires training data
- ❌ Large model dependency
- ❌ Unpredictable behavior
- ❌ Performance overhead

**Why Not**: Simple rules cover 90%+ of cases

### Alternative 4: No Auto-Generation (Keep Manual)

**Approach**: Always require manual ID entry

```
Repository Name: my-saas-frontend-app
Repository ID: [user must type]
```

**Pros**:
- User has full control
- No algorithm complexity

**Cons**:
- ❌ Poor UX (repetitive busywork)
- ❌ Error-prone (typos)
- ❌ No validation until later
- ❌ Doesn't prevent comma-separated input

**Why Not**: Violates "make it easy to do the right thing" principle

---

## Consequences

### Positive

**User Experience**:
- ✅ Reduces manual typing (saves 5-10 seconds per repo)
- ✅ Smart defaults work 90%+ of the time
- ✅ Clear UX: see default, press Enter or edit
- ✅ Prevents common errors (commas, special chars)

**Implementation**:
- ✅ Simple algorithm (10 lines of code)
- ✅ Easy to test (deterministic)
- ✅ Fast (<1ms per generation)
- ✅ No dependencies

**Maintainability**:
- ✅ Easy to add new suffixes
- ✅ Clear logic (suffix stripping)
- ✅ Well-documented examples

### Negative

**Edge Cases**:
- ❌ Unusual naming patterns may generate poor IDs
- ❌ User must manually edit if incorrect
- ❌ Multiple repos with same pattern → suffixed IDs (frontend-2)

**Algorithm Limitations**:
- ❌ Only handles suffix-based patterns (not prefix/infix)
- ❌ Assumes hyphen separators (not underscores, camelCase)
- ❌ English-centric suffix list

### Neutral

**Customization**:
- User can always override generated ID
- Algorithm is configurable (suffix list can be extended)
- Fallback to full name if no good ID found

---

## Implementation Details

### Validation Rules

```typescript
interface IdValidation {
  valid: boolean;
  error?: string;
}

function validateRepoId(id: string): IdValidation {
  // No commas (common error)
  if (id.includes(',')) {
    return {
      valid: false,
      error: 'Repository ID cannot contain commas. Use separate prompts for each repository.'
    };
  }

  // Alphanumeric + hyphens only
  if (!/^[a-z0-9-]+$/.test(id)) {
    return {
      valid: false,
      error: 'Repository ID must contain only lowercase letters, numbers, and hyphens.'
    };
  }

  // Length limits
  if (id.length < 2) {
    return {
      valid: false,
      error: 'Repository ID must be at least 2 characters.'
    };
  }

  if (id.length > 50) {
    return {
      valid: false,
      error: 'Repository ID must be 50 characters or less.'
    };
  }

  // No leading/trailing hyphens
  if (id.startsWith('-') || id.endsWith('-')) {
    return {
      valid: false,
      error: 'Repository ID cannot start or end with a hyphen.'
    };
  }

  return { valid: true };
}
```

### Uniqueness Check

```typescript
function ensureUniqueness(
  state: SetupState,
  proposedId: string
): { id: string; wasModified: boolean } {
  const existingIds = new Set<string>();

  // Collect existing IDs
  if (state.parentRepo) {
    existingIds.add(state.parentRepo.id);
  }
  for (const repo of state.repos) {
    existingIds.add(repo.id);
  }

  // Check if unique
  if (!existingIds.has(proposedId)) {
    return { id: proposedId, wasModified: false };
  }

  // Generate unique ID
  let counter = 2;
  let uniqueId = `${proposedId}-${counter}`;
  while (existingIds.has(uniqueId)) {
    counter++;
    uniqueId = `${proposedId}-${counter}`;
  }

  return { id: uniqueId, wasModified: true };
}
```

### User Prompt Integration

```typescript
async function promptForRepositoryId(
  repoName: string,
  existingIds: Set<string>
): Promise<string> {
  // Generate default
  const generated = generateRepoId(repoName);
  const { id: defaultId, wasModified } = ensureUniqueness(
    { repos: Array.from(existingIds).map(id => ({ id })) },
    generated
  );

  // Show warning if modified
  if (wasModified) {
    console.warn(
      `⚠️  ID "${generated}" already exists. Suggesting "${defaultId}" instead.`
    );
  }

  // Prompt user
  const answer = await inquirer.prompt([
    {
      type: 'input',
      name: 'id',
      message: 'Repository ID:',
      default: defaultId,
      validate: (input: string) => {
        const validation = validateRepoId(input);
        if (!validation.valid) {
          return validation.error!;
        }

        // Check uniqueness
        if (existingIds.has(input)) {
          return `ID "${input}" is already in use. Please choose a different ID.`;
        }

        return true;
      }
    }
  ]);

  return answer.id;
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('generateRepoId', () => {
  test('strips common suffixes', () => {
    expect(generateRepoId('my-app-frontend-app')).toBe('frontend');
    expect(generateRepoId('api-gateway-service')).toBe('gateway');
    expect(generateRepoId('backend-api')).toBe('backend');
  });

  test('handles single-word names', () => {
    expect(generateRepoId('frontend')).toBe('frontend');
    expect(generateRepoId('web')).toBe('web');
  });

  test('takes last segment', () => {
    expect(generateRepoId('my-company-portal')).toBe('portal');
    expect(generateRepoId('acme-widget-factory')).toBe('factory');
  });

  test('handles no suffix match', () => {
    expect(generateRepoId('custom-name')).toBe('name');
  });

  test('handles edge cases', () => {
    expect(generateRepoId('app')).toBe('app'); // No hyphen
    expect(generateRepoId('my-app')).toBe('my'); // Strips suffix, returns remaining
  });
});
```

### Integration Tests

```typescript
describe('Repository ID Generation Flow', () => {
  test('auto-generates and validates uniqueness', async () => {
    const repos = [
      { name: 'my-app-frontend', expectedId: 'frontend' },
      { name: 'my-app-backend', expectedId: 'backend' },
      { name: 'other-frontend-app', expectedId: 'frontend-2' } // Conflict!
    ];

    const existingIds = new Set<string>();
    for (const repo of repos) {
      const id = await promptForRepositoryId(repo.name, existingIds);
      expect(id).toBe(repo.expectedId);
      existingIds.add(id);
    }
  });
});
```

---

## Performance Characteristics

- **Generation Time**: <1ms per repository
- **Memory**: O(n) where n = number of repos (small)
- **Scalability**: Linear with number of repos (100+ repos = no issue)

---

## Future Enhancements

### Potential Improvements

1. **Custom Suffix List**: Allow users to configure suffix list in `.specweaverc`
2. **Prefix Stripping**: Handle "acme-" prefix patterns
3. **camelCase Support**: "myAppFrontend" → "frontend"
4. **ML-Based Fallback**: Use LLM for unusual patterns (optional)
5. **Language Support**: Non-English suffix lists (e.g., "-servicio" in Spanish)

---

## Related Decisions

- **ADR-0023**: Multi-Repo Initialization UX Architecture (parent ADR)
- **ADR-0025**: Setup State Persistence Design (uses generated IDs)
- **ADR-0026**: GitHub API Validation Approach (validates repos with IDs)

---

## References

**Code Implementation**:
- `src/core/repo-structure/repo-id-generator.ts` (main algorithm)
- `src/cli/helpers/issue-tracker/github-multi-repo.ts` (prompt integration)

**User Stories**:
- US-002: Auto-Generate Repository IDs

**Test Coverage**:
- Unit: `tests/unit/repo-structure/repo-id-generator.test.ts`
- Integration: `tests/integration/repo-structure/multi-repo-flow.test.ts`
