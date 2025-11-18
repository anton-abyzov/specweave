# Test Fixtures

Reusable test data templates for consistent, maintainable testing.

## Structure

```
fixtures/
├── increments/       # Increment metadata (JSON)
├── github/           # GitHub API responses (JSON)
├── ado/              # Azure DevOps work items (JSON)
├── jira/             # Jira issues (JSON)
└── living-docs/      # Living documentation (Markdown)
```

## Usage

### Option 1: Load Fixtures Directly

```typescript
import * as fs from 'fs-extra';
import * as path from 'path';

const incrementFixture = await fs.readJson(
  path.join(__dirname, '../fixtures/increments/minimal.json')
);
```

### Option 2: Use Mock Factories (Recommended)

```typescript
import { IncrementFactory, GitHubFactory } from '../test-utils/mock-factories';

// Create with defaults
const increment = IncrementFactory.create();

// Create with overrides
const customIncrement = IncrementFactory.create({
  id: '0042-my-test',
  status: 'completed'
});

// Use convenience methods
const completedIncrement = IncrementFactory.createCompleted();
const githubIssue = GitHubFactory.createIssue({ number: 456 });
```

## Benefits

- **DRY**: Single source of truth for test data
- **Type Safety**: Factory methods provide TypeScript types
- **Consistency**: All tests use same data structure
- **Maintainability**: Update once, propagate everywhere

## Available Fixtures

### Increments
- `minimal.json` - Minimal increment (active)
- `completed.json` - Completed increment with report
- `planning.json` - Planning increment with user stories
- `with-tasks.json` - Increment with task list

### GitHub
- `issue.json` - GitHub issue with labels
- `pull-request.json` - Pull request with metadata
- `comment.json` - Issue comment
- `milestone.json` - Milestone with stats

### Azure DevOps
- `work-item.json` - User Story work item
- `sprint.json` - Sprint/iteration

### Jira
- `issue.json` - Jira story
- `epic.json` - Jira epic

### Living Docs
- `user-story.md` - User story with ACs
- `feature.md` - Feature specification
- `epic.md` - Epic overview
- `requirement.md` - Functional requirement
- `glossary.md` - Term definitions
- `index.md` - Documentation index

## Mock Factories API

### IncrementFactory
- `create(overrides?)` - Create increment
- `createCompleted(overrides?)` - Completed increment
- `createPlanning(overrides?)` - Planning increment
- `createWithTasks(overrides?)` - Increment with tasks

### GitHubFactory
- `createIssue(overrides?)` - GitHub issue
- `createPullRequest(overrides?)` - Pull request
- `createComment(overrides?)` - Comment
- `createMilestone(overrides?)` - Milestone

### ADOFactory
- `createWorkItem(overrides?)` - ADO work item
- `createSprint(overrides?)` - Sprint
- `createBoard(overrides?)` - Kanban board

### JiraFactory
- `createIssue(overrides?)` - Jira issue
- `createEpic(overrides?)` - Jira epic
- `createSubtask(overrides?)` - Subtask

## Migration Guide

**Before (Inline Data):**
```typescript
test('my test', () => {
  const increment = {
    id: '0001-test',
    name: 'Test',
    status: 'active',
    type: 'feature',
    priority: 'P1',
    created: '2025-01-01T00:00:00Z',
    updated: '2025-01-01T00:00:00Z',
    testMode: 'TDD',
    coverageTarget: 90
  };
  // ... test code
});
```

**After (Factory):**
```typescript
import { IncrementFactory } from '../test-utils/mock-factories';

test('my test', () => {
  const increment = IncrementFactory.create();
  // ... test code
});
```

**Benefits**: 75% less code, type-safe, reusable.

## Contributing

When adding new fixtures:
1. Use realistic data that matches production
2. Keep fixtures minimal (only required fields)
3. Document fixture purpose in this README
4. Add factory method if pattern is reused 3+ times

---

**Created**: 2025-11-18 (Increment 0042)
**Maintainer**: SpecWeave Core Team
