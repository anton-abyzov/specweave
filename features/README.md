# Features

This directory contains implementation plans for all features in SpecWeave, organized using auto-numbered directories.

## Structure

Each feature follows this structure:

```
###-feature-name/
├── spec.md                 # Feature specification (WHAT and WHY)
├── plan.md                 # Implementation plan (HOW)
├── tasks.md                # Executable task checklist
├── tests.md                # Test strategy and test cases
└── context-manifest.yaml   # Context loading specification
```

## Naming Convention

Features are auto-numbered using the format `###-short-name`:

- `001-context-loader`
- `002-skill-router`
- `003-docs-updater`

The numbering prevents conflicts when multiple developers work in parallel.

## Creating a Feature

### Using CLI

```bash
specweave feature plan "Add Stripe payment integration"
```

This will:
1. Scan existing features and increment number
2. Generate short name from description
3. Create feature directory structure
4. Populate templates for spec, plan, tasks, tests

### Manual Creation

1. Find highest number in `features/` directory
2. Increment by 1
3. Create directory: `features/###-short-name/`
4. Copy templates from `.specweave/templates/`
5. Fill in: spec.md, plan.md, tasks.md, tests.md, context-manifest.yaml

## Feature Lifecycle

### 1. Planning Phase

- Create `spec.md` - Define what the feature does and why
- Create `plan.md` - Design how to implement it
- Create `tasks.md` - Break down into executable steps
- Create `tests.md` - Define test strategy
- Create `context-manifest.yaml` - Specify required context

### 2. Implementation Phase

- Move feature to `work/issues/###-implement-feature-name/`
- Follow tasks.md checklist
- Mark tasks complete `[ ]` → `[x]`
- Update progress in `work/issues/###-implement-feature-name/progress.md`

### 3. Validation Phase

- Run tests from `tests.md`
- Validate against spec.md acceptance criteria
- Run `specweave validate` for structure compliance
- Review documentation updates

### 4. Completion Phase

- All tasks marked `[x]`
- Tests passing
- Documentation updated
- Feature merged to main

## Priority Levels

Features use P1/P2/P3 prioritization:

- **P1 (Critical)**: Must-have for MVP, blocking other work
- **P2 (Important)**: Enhanced functionality, high value
- **P3 (Nice-to-have)**: Polish, optimizations, future enhancements

Mark priority in `spec.md` frontmatter:

```yaml
---
feature: 001-context-loader
priority: P1
status: in_progress
---
```

## Context Manifests

Each feature declares what specifications, architecture docs, and ADRs it needs:

```yaml
# context-manifest.yaml
---
spec_sections:
  - specs/modules/core/context-loading.md
  - specs/modules/core/caching.md
architecture:
  - architecture/system-design.md#context-architecture
adrs:
  - adrs/004-context-loading-approach.md
max_context_tokens: 10000
priority: high
auto_refresh: false
---
```

This enables:
- Precision loading (only relevant context)
- Performance optimization (caching)
- Context budget management

## Examples

### Example: Context Loader Feature

**Directory**: `features/001-context-loader/`

**spec.md**: Defines what context loading does and why it's needed
**plan.md**: Architecture, components, implementation approach
**tasks.md**:
```markdown
- [ ] [T001] Create context manifest parser
- [ ] [T002] Implement selective spec loading
- [ ] [T003] Build caching layer
- [ ] [T004] Write tests
```

**tests.md**: Test cases for basic loading, large specs, nested modules
**context-manifest.yaml**: Declares specs and architecture docs needed

### Example: Skill Router Feature

**Directory**: `features/002-skill-router/`

Routes user intents to appropriate skills automatically without manual @role selection.

## Best Practices

1. **Keep spec.md technology-agnostic** - Focus on WHAT and WHY, not HOW
2. **Detail plan.md with technical decisions** - Document architecture choices
3. **Make tasks.md executable** - Each task should be independently achievable
4. **Write comprehensive tests.md** - Cover basic, edge cases, and integration
5. **Optimize context manifests** - Load only what you need

## Current Features

| # | Feature | Priority | Status | Description |
|---|---------|----------|--------|-------------|
| [001](./001-context-loader/) | context-loader | P1 | Planned | Selective specification loading based on manifests. Reduces token usage by 70%+ |

### Planned Features
- 002-skill-router (P1) - Auto-detect role and route to appropriate skill
- 003-docs-updater (P2) - Auto-update living documentation via hooks

---

For more information, see [CLAUDE.md](../CLAUDE.md#features) and [Constitution](../specs/constitution.md#article-v-modular-scalability).
