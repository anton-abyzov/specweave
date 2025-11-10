# Test Fixtures

This directory contains test fixtures for SpecWeave's brownfield import functionality.

## Structure

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

## Fixture Metadata

Each fixture file includes YAML frontmatter with expected classification:

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

### Confidence Levels

| Level | Description | Keyword Density |
|-------|-------------|-----------------|
| **high** | Strong keyword matches (10+ keywords) | 90%+ match confidence |
| **medium** | Moderate keyword matches (5-10 keywords) | 60-90% match confidence |
| **low** | Few/no keyword matches (<5 keywords) | <60% match confidence |

## Fixture Statistics

**Total Files**: 21

**By Type**:
- Spec: 6 files (auth-feature, payment-flow, checkout-flow, security-policy, performance-requirements, mixed-content)
- Module: 7 files (auth-module, api-design, database-schema, deployment-guide, api-reference, code-heavy, large-file)
- Team: 5 files (onboarding, conventions, troubleshooting, faq)
- Legacy: 3 files (meeting-notes, random-ideas, empty-file, special-chars)

**By Source**:
- Notion: 8 files
- Confluence: 2 files
- Wiki: 3 files
- Custom: 8 files

**By Confidence**:
- High: 11 files
- Medium: 7 files
- Low: 3 files

## Using Fixtures in Tests

### Load All Fixtures

```typescript
import { loadFixtures } from '../utils/fixture-loader';

const fixtures = await loadFixtures();
// Returns all 21 fixture files
```

### Load by Source

```typescript
import { getFixturesBySource } from '../utils/fixture-loader';

const notionFixtures = await getFixturesBySource('notion');
// Returns 8 files from notion-export/
```

### Load by Type

```typescript
import { getFixturesByType } from '../utils/fixture-loader';

const specFixtures = await getFixturesByType('spec');
// Returns 6 spec-type files
```

### Load by Confidence

```typescript
import { getFixturesByConfidence } from '../utils/fixture-loader';

const highConfFixtures = await getFixturesByConfidence('high');
// Returns 11 high-confidence files
```

### Load Single Fixture

```typescript
import { loadFixture } from '../utils/fixture-loader';

const fixture = await loadFixture('notion-export/user-stories/auth-feature.md');
// Returns specific fixture file
```

### Get Statistics

```typescript
import { getFixtureStats } from '../utils/fixture-loader';

const stats = await getFixtureStats();
// Returns: { total: 21, spec: 6, module: 7, team: 5, legacy: 3, ... }
```

## Test Coverage

These fixtures are used to test:

1. **Keyword Scoring Algorithm** (`tests/unit/brownfield/analyzer/keyword-scoring.test.ts`)
   - High density: auth-feature.md, auth-module.md
   - Medium density: payment-flow.md, api-design.md
   - Low density: meeting-notes.md, faq.md

2. **File Classification** (`tests/unit/brownfield/analyzer/classification.test.ts`)
   - Spec classification: auth-feature.md, checkout-flow.md
   - Module classification: database-schema.md, api-reference.md
   - Team classification: onboarding.md, conventions.md
   - Legacy classification: meeting-notes.md, random-ideas.md

3. **Edge Cases** (`tests/unit/brownfield/analyzer/edge-cases.test.ts`)
   - Empty file: empty-file.md
   - Large file: large-file.md (performance test)
   - Special characters: special-chars-filename!@#.md
   - Code-heavy: code-heavy.md (exclude code blocks)

4. **Classification Accuracy** (`tests/integration/brownfield/classification-accuracy.test.ts`)
   - Target: 85%+ accuracy across all fixtures
   - Measured: (correct classifications / total files) ≥ 0.85

## Modifying Fixtures

### Adding New Fixtures

1. Create markdown file in appropriate directory:
   - `notion-export/` for Notion simulations
   - `confluence-export/` for Confluence simulations
   - `wiki-export/` for wiki simulations
   - `custom/` for edge cases

2. Add YAML frontmatter with expected metadata:
   ```yaml
   ---
   expected_type: spec
   expected_confidence: high
   source: notion
   keywords_density: high
   ---
   ```

3. Write realistic content with appropriate keyword density:
   - **Spec**: User stories, acceptance criteria, technical requirements
   - **Module**: Architecture, API docs, components, integration points
   - **Team**: Onboarding, conventions, playbooks, workflows
   - **Legacy**: Meeting notes, random ideas, unstructured content

4. Update fixture count in this README

### Keyword Guidelines

**Spec Keywords** (use 5-10 for high confidence):
- user story, acceptance criteria, requirement, feature, technical requirement
- non-functional requirement, as a, I want, so that
- priority, testable, acceptance test

**Module Keywords** (use 5-10 for high confidence):
- component, architecture, API, endpoint, service, module
- integration, schema, interface, method, function
- class, implementation, library, dependency

**Team Keywords** (use 5-10 for high confidence):
- onboarding, workflow, process, convention, playbook
- team, guide, best practice, how-to, checklist
- contact, resource, tool, standup, retrospective

## Validation

Run fixture validation tests:

```bash
# Validate fixtures load correctly
npm test -- tests/unit/fixtures/fixture-loader.test.ts

# Validate expected classifications
npm test -- tests/integration/fixtures/fixture-validation.test.ts

# Check classification accuracy
npm test -- tests/integration/brownfield/classification-accuracy.test.ts
```

All fixtures must:
- ✅ Have valid YAML frontmatter
- ✅ Have all required metadata fields
- ✅ Load without errors
- ✅ Contribute to 85%+ classification accuracy

## Performance Targets

- **Loading time**: <100ms for all 21 fixtures
- **Classification time**: <5 seconds for all fixtures
- **Large file handling**: large-file.md should classify in <500ms

## Troubleshooting

**Fixture won't load**:
- Check YAML frontmatter syntax
- Verify file encoding is UTF-8
- Ensure file extension is `.md`

**Classification inaccurate**:
- Review keyword density in content
- Check expected_type matches content
- Verify frontmatter metadata is correct
- Run accuracy test to identify misclassifications

**Performance issues**:
- Check file size (large-file.md is intentionally large)
- Profile with benchmark tests
- Optimize keyword scoring algorithm if needed

## References

- Classification algorithm: `src/cli/commands/brownfield-analyzer.ts`
- Keyword lists: `src/cli/commands/brownfield-analyzer.ts` (KEYWORD_SETS)
- Test utilities: `tests/utils/fixture-loader.ts`
