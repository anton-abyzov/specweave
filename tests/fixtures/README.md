# Test Fixtures

This directory contains test fixtures for SpecWeave tests, organized into general-purpose and specialized categories.

## Structure

```
tests/fixtures/
├── increments/          # Increment metadata fixtures
│   ├── minimal.json    # Basic increment with required fields
│   ├── complex.json    # Full increment with all optional fields
│   └── planning.json   # Planning-stage increment
│
├── github/             # GitHub API response fixtures
│   ├── issue.json      # GitHub issue response
│   ├── pull-request.json
│   ├── comment.json
│   ├── label.json
│   └── milestone.json
│
├── ado/                # Azure DevOps API fixtures
│   ├── work-item.json  # ADO work item
│   ├── sprint.json     # ADO sprint/iteration
│   └── board.json      # ADO board configuration
│
├── jira/               # Jira API fixtures
│   ├── issue.json      # Jira issue/story
│   ├── epic.json       # Jira epic
│   └── sprint.json     # Jira sprint
│
├── living-docs/        # Living documentation fixtures
│   ├── user-story.md   # User story template
│   ├── feature.md      # Feature specification
│   ├── epic.md         # Epic overview
│   ├── requirement.md  # Technical requirement
│   ├── index.md        # Documentation index
│   └── glossary.md     # Terminology definitions
│
├── brownfield/         # Brownfield import fixtures
│   ├── notion-export/  # Notion workspace export simulation
│   ├── confluence-export/ # Confluence export simulation
│   ├── wiki-export/    # Git wiki export simulation
│   └── custom/         # Custom edge cases
│
├── specs/              # Spec document fixtures
│   ├── spec-001-user-auth.md
│   └── spec-002-payment-integration.md
│
├── plugins/            # Plugin test fixtures
│   └── specweave-test/ # Test plugin structure
│
└── e2e-brownfield-import/ # E2E brownfield test data
```

## General-Purpose Fixtures

### Increments (`increments/`)

**Purpose**: Test increment metadata parsing, validation, and lifecycle management

**Files**:
- `minimal.json` - Basic increment with only required fields
- `complex.json` - Full increment with all optional fields (metrics, team, etc.)
- `planning.json` - Increment in planning stage

**Usage**:
```typescript
import minimalIncrement from 'tests/fixtures/increments/minimal.json';

it('should parse increment metadata', () => {
  const increment = { ...minimalIncrement, id: '0099' };
  // Test code
});
```

### GitHub (`github/`)

**Purpose**: Test GitHub API integration, issue sync, and PR management

**Files**:
- `issue.json` - GitHub issue with labels, milestone, AC checkboxes
- `pull-request.json` - PR with metadata, state, mergeable status
- `comment.json` - Issue/PR comment
- `label.json` - Label definition
- `milestone.json` - Milestone with due date, progress

**Usage**:
```typescript
import githubIssue from 'tests/fixtures/github/issue.json';

it('should sync GitHub issue', () => {
  const issue = { ...githubIssue, number: 100 };
  // Test GitHub sync logic
});
```

### Azure DevOps (`ado/`)

**Purpose**: Test ADO integration, work item sync, sprint management

**Files**:
- `work-item.json` - ADO work item (Epic/Feature/User Story)
- `sprint.json` - ADO sprint/iteration
- `board.json` - ADO board configuration with columns

**Usage**:
```typescript
import adoWorkItem from 'tests/fixtures/ado/work-item.json';

it('should sync ADO work item', () => {
  const workItem = { ...adoWorkItem, id: 99999 };
  // Test ADO sync logic
});
```

### Jira (`jira/`)

**Purpose**: Test Jira integration, issue sync, epic management

**Files**:
- `issue.json` - Jira issue/story with fields, status, priority
- `epic.json` - Jira epic with custom fields
- `sprint.json` - Jira sprint with dates, state

**Usage**:
```typescript
import jiraIssue from 'tests/fixtures/jira/issue.json';

it('should sync Jira issue', () => {
  const issue = { ...jiraIssue, key: 'SPEC-999' };
  // Test Jira sync logic
});
```

### Living Docs (`living-docs/`)

**Purpose**: Test living documentation generation, Markdown rendering, spec distribution

**Files**:
- `user-story.md` - User story with AC, tasks, implementation notes
- `feature.md` - Feature specification with business value, technical approach
- `epic.md` - Epic overview with vision, features, timeline
- `requirement.md` - Technical requirement with rationale, implementation
- `index.md` - Documentation index with navigation
- `glossary.md` - Terminology definitions

**Usage**:
```typescript
import fs from 'fs-extra';

it('should parse user story', async () => {
  const content = await fs.readFile('tests/fixtures/living-docs/user-story.md', 'utf-8');
  // Test Markdown parsing, frontmatter extraction
});
```

## Brownfield Import Fixtures

### Structure

```
tests/fixtures/brownfield/
├── notion-export/          # Notion workspace export simulation
│   ├── user-stories/      # Spec-type documents (user stories, features)
│   ├── components/        # Module-type documents (architecture, components)
│   ├── team/              # Team-type documents (onboarding, conventions)
│   └── misc/              # Legacy-type documents (meeting notes, ideas)
│
├── confluence-export/      # Confluence export simulation
│   ├── database-schema.md # Module: Database design
│   └── deployment-guide.md# Module: Deployment documentation
│
├── wiki-export/            # Git wiki export simulation
│   ├── api-reference.md   # Module: API documentation
│   ├── troubleshooting.md # Team: Troubleshooting guide
│   └── faq.md             # Team: FAQ
│
└── custom/                 # Custom edge cases
    ├── security-policy.md # Spec: Security requirements
    ├── performance-requirements.md # Spec: Performance specs
    ├── code-heavy.md      # Module: Heavy code blocks
    ├── mixed-content.md   # Spec: Mixed structure
    ├── empty-file.md      # Legacy: Empty file edge case
    ├── large-file.md      # Spec: Large file (performance test)
    └── special-chars-filename!@#.md # Legacy: Special char handling
```

### Fixture Metadata

Each brownfield fixture file includes YAML frontmatter with expected classification:

```yaml
---
expected_type: spec | module | team | legacy
expected_confidence: high | medium | low
source: notion | confluence | wiki | custom
keywords_density: high | medium | low | none
---
```

### Expected Types

| Type | Description | Examples |
|------|-------------|----------|
| **spec** | Product specifications, user stories, requirements | auth-feature.md, payment-flow.md, security-policy.md |
| **module** | Technical documentation, architecture, components | auth-module.md, api-design.md, database-schema.md |
| **team** | Team processes, onboarding, conventions | onboarding.md, conventions.md, troubleshooting.md |
| **legacy** | Miscellaneous, meeting notes, low-value content | meeting-notes.md, random-ideas.md, empty-file.md |

## Fixture Statistics

**Total Files**: 68+

**By Category**:
- Increments: 3 files
- GitHub: 5 files
- ADO: 3 files
- Jira: 3 files
- Living Docs: 6 files
- Brownfield: 21 files
- Specs: 2 files
- Plugins: 2 files
- E2E Brownfield: 23+ files

**By Type** (Brownfield):
- Spec: 6 files (auth-feature, payment-flow, checkout-flow, security-policy, performance-requirements, mixed-content)
- Module: 7 files (auth-module, api-design, database-schema, deployment-guide, api-reference, code-heavy, large-file)
- Team: 5 files (onboarding, conventions, troubleshooting, faq)
- Legacy: 3 files (meeting-notes, random-ideas, empty-file, special-chars)

## Using Fixtures in Tests

### Import JSON Fixtures

```typescript
import incrementFixture from 'tests/fixtures/increments/minimal.json';
import githubIssue from 'tests/fixtures/github/issue.json';

it('should process fixtures', () => {
  const increment = { ...incrementFixture, id: '0099' };
  const issue = { ...githubIssue, number: 999 };
  // Always clone fixtures to avoid mutation
});
```

### Import Markdown Fixtures

```typescript
import fs from 'fs-extra';
import path from 'path';

it('should parse markdown fixture', async () => {
  const filePath = path.join(__dirname, '../fixtures/living-docs/user-story.md');
  const content = await fs.readFile(filePath, 'utf-8');
  // Parse Markdown, extract frontmatter, etc.
});
```

### Load Brownfield Fixtures

```typescript
import { loadFixtures, getFixturesByType } from '../utils/fixture-loader';

const fixtures = await loadFixtures(); // All brownfield fixtures
const specFixtures = await getFixturesByType('spec'); // Only spec-type fixtures
```

## Best Practices

### 1. Always Clone Fixtures

**❌ Wrong** - Mutates shared fixture:
```typescript
import incrementFixture from 'tests/fixtures/increments/minimal.json';

it('test', () => {
  incrementFixture.id = '0099'; // Mutates shared fixture!
  // Other tests will see the mutation
});
```

**✅ Correct** - Clone before mutation:
```typescript
import incrementFixture from 'tests/fixtures/increments/minimal.json';

it('test', () => {
  const increment = { ...incrementFixture, id: '0099' }; // Clone first
  // Safe to modify 'increment'
});
```

### 2. Use Fixtures for Type Safety

Fixtures provide TypeScript types:

```typescript
import incrementFixture from 'tests/fixtures/increments/complex.json';
import type { IncrementMetadata } from 'src/types/increment';

it('should have correct types', () => {
  const increment: IncrementMetadata = incrementFixture;
  // TypeScript validates structure
});
```

### 3. Extend Fixtures for Test Cases

```typescript
import minimalIncrement from 'tests/fixtures/increments/minimal.json';

it('should handle different statuses', () => {
  const activeIncrement = { ...minimalIncrement, status: 'active' };
  const pausedIncrement = { ...minimalIncrement, status: 'paused' };
  const completedIncrement = { ...minimalIncrement, status: 'completed' };

  // Test all status transitions
});
```

### 4. Combine Fixtures

```typescript
import incrementFixture from 'tests/fixtures/increments/complex.json';
import githubIssue from 'tests/fixtures/github/issue.json';

it('should sync increment to GitHub', () => {
  const increment = { ...incrementFixture, id: '0042' };
  const issue = { ...githubIssue, number: 42 };

  // Test increment → GitHub sync
});
```

## Test Coverage

These fixtures are used to test:

1. **Increment Management** (`tests/unit/increment/`)
   - Metadata parsing and validation
   - Status transitions
   - Type enforcement

2. **External Tool Integration** (`tests/integration/external-tools/`)
   - GitHub sync (`github/`)
   - ADO sync (`ado/`)
   - Jira sync (`jira/`)

3. **Living Documentation** (`tests/integration/core/living-docs/`)
   - Spec distribution (`living-docs/`)
   - Markdown rendering
   - Frontmatter extraction

4. **Brownfield Import** (`tests/integration/brownfield/`)
   - Classification algorithm (`brownfield/`)
   - Keyword scoring
   - Edge case handling

## Adding New Fixtures

### JSON Fixtures

1. Create file in appropriate category:
   ```bash
   touch tests/fixtures/increments/new-fixture.json
   ```

2. Add valid JSON structure:
   ```json
   {
     "id": "0001",
     "name": "example",
     "status": "active"
   }
   ```

3. Validate JSON syntax:
   ```bash
   npx jsonlint tests/fixtures/increments/new-fixture.json
   ```

4. Update fixture count in this README

### Markdown Fixtures

1. Create file in appropriate category:
   ```bash
   touch tests/fixtures/living-docs/new-document.md
   ```

2. Add frontmatter (if needed):
   ```markdown
   ---
   title: Example Document
   type: feature
   ---

   # Content here
   ```

3. Use realistic, test-relevant content

4. Update fixture count in this README

## Validation

Run fixture validation tests:

```bash
# Validate all fixtures load correctly
npm test -- tests/unit/fixtures/fixture-loader.test.ts

# Validate expected classifications (brownfield)
npm test -- tests/integration/fixtures/fixture-validation.test.ts

# Check brownfield classification accuracy
npm test -- tests/integration/brownfield/classification-accuracy.test.ts
```

All fixtures must:
- ✅ Be valid JSON or Markdown
- ✅ Load without errors
- ✅ Have consistent structure
- ✅ Include realistic test data

## Performance Targets

- **Loading time**: <100ms for all fixtures
- **JSON parsing**: <10ms per file
- **Markdown parsing**: <50ms per file
- **Large file handling**: <500ms

## Troubleshooting

**Fixture won't load**:
- Check JSON syntax with `npx jsonlint file.json`
- Verify file encoding is UTF-8
- Ensure file extension is `.json` or `.md`

**Type errors in TypeScript**:
- Ensure fixture structure matches TypeScript interface
- Add type assertion if needed: `const data = fixture as MyType`
- Update fixture to match latest type definitions

**Mutation issues**:
- Always clone fixtures: `const data = { ...fixture }`
- For nested objects: `const data = JSON.parse(JSON.stringify(fixture))`
- Consider using `structuredClone()` (Node 17+)

## References

- Increment types: `src/types/increment.ts`
- GitHub types: `src/integrations/github/types.ts`
- ADO types: `src/integrations/ado/types.ts`
- Jira types: `src/integrations/jira/types.ts`
- Brownfield analyzer: `src/cli/commands/brownfield-analyzer.ts`
- Test utilities: `tests/utils/fixture-loader.ts`
