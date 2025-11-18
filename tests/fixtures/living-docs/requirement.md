# REQ-042-FIXTURES: Shared Test Fixtures

**Category**: Test Infrastructure
**Priority**: P2
**Status**: In Progress

## Requirement

All integration tests MUST use shared fixtures from `tests/fixtures/` instead of duplicating test data.

## Rationale

- **DRY Principle**: Eliminate duplication of test data across 78 test files
- **Maintainability**: Update fixtures once, affects all tests
- **Consistency**: Ensure all tests use same data structures
- **Type Safety**: Fixtures provide TypeScript types

## Implementation

### Fixture Categories

1. **Increments** (`tests/fixtures/increments/`)
   - minimal.json
   - complex.json
   - planning.json

2. **GitHub** (`tests/fixtures/github/`)
   - issue.json
   - pull-request.json
   - comment.json
   - label.json
   - milestone.json

3. **ADO** (`tests/fixtures/ado/`)
   - work-item.json
   - sprint.json
   - board.json

4. **Jira** (`tests/fixtures/jira/`)
   - issue.json
   - epic.json
   - sprint.json

5. **Living Docs** (`tests/fixtures/living-docs/`)
   - user-story.md
   - feature.md
   - epic.md
   - requirement.md

## Usage Example

```typescript
import incrementFixture from 'tests/fixtures/increments/minimal.json';

it('should process increment', () => {
  const increment = { ...incrementFixture, id: '0099' };
  // Test code here
});
```

## Validation

- All fixtures MUST be valid JSON/Markdown
- All fixtures MUST include required fields
- All fixtures MUST be documented in README
