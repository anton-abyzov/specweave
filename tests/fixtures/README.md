# Test Fixtures

Shared test data for SpecWeave test suite.

## Directory Structure

```
tests/fixtures/
├── increments/       # Increment metadata fixtures
├── github/           # GitHub API response fixtures
├── ado/              # Azure DevOps fixtures
├── jira/             # Jira API fixtures
└── living-docs/      # Living documentation examples
```

## Usage

```typescript
import minimalIncrement from '../fixtures/increments/minimal.json';
import githubIssue from '../fixtures/github/issue.json';

test('should load increment', () => {
  expect(minimalIncrement.id).toBe('0001-test-increment');
});
```

## Fixtures by Category

### Increments (4 files)
- `minimal.json` - Minimal increment metadata
- `with-tasks.json` - Increment with GitHub issues linked
- `planning.json` - Increment in planning status
- `completed.json` - Completed increment

### GitHub (4 files)
- `issue.json` - GitHub issue
- `pull-request.json` - Pull request
- `comment.json` - Issue comment
- `milestone.json` - Milestone

### Living Docs (2 files)
- `user-story.md` - User story example
- `feature.md` - Feature specification example

## Guidelines

1. **Keep fixtures minimal** - Include only fields needed for tests
2. **Use realistic data** - Data should match production schema
3. **Document purpose** - Add comments explaining fixture use case
4. **Validate fixtures** - Run `npm run validate:fixtures` before committing
