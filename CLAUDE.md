# SpecWeave - Intent-Driven Development Framework

## Project Philosophy

**SpecWeave** is a specification-first AI development framework where **documentation and specifications are the SOURCE OF TRUTH**. Code is the expression of these specifications in a particular language.

### Core Principles

1. **Intent Before Implementation** - Define WHAT and WHY before HOW
2. **Living Documentation** - Specs evolve with code, never diverge
3. **Regression Prevention** - Document existing code before modification
4. **Test-Validated Features** - Every feature proven through automated tests
5. **Scalable from Solo to Enterprise** - Modular structure that grows with project size
6. **Context Precision** - Load only relevant specs, not entire 500-page documents
7. **Auto-Role Routing** - Skills detect and route to appropriate expertise automatically

---

## File Organization Rules

### Source Code vs Supporting Files

**CRITICAL**: Separate source code from supporting files to maintain clean project structure.

#### Source Code (Project Root)
Files that ARE source code and belong in project root:
- Application source code (`src/`, `lib/`, `app/`)
- Package configuration (`package.json`, `pyproject.toml`, `Cargo.toml`)
- Build configuration (`tsconfig.json`, `webpack.config.js`, `.babelrc`)
- Environment files (`.env.example`, `.env.local`)
- Version control (`.git/`, `.gitignore`)
- Core documentation (`README.md`, `LICENSE`, `CONTRIBUTING.md`)
- Framework configuration (`.specweave/`, `.claude/`)

#### Supporting Files (ai-temp-files/)
Files that are NOT source code and belong in `ai-temp-files/`:
- **Explanatory documents** - Additional `.md` files explaining concepts
- **Test scripts** - Python, JavaScript, Bash scripts for testing skills/features
- **Validation utilities** - Scripts to validate specs, check structure
- **Example data** - Sample JSON, YAML, CSV for testing
- **Prototypes** - Experimental code not part of main codebase
- **Analysis reports** - Generated reports, benchmarks
- **Migration scripts** - One-time utilities
- **Research notes** - Investigation documentation

```
ai-temp-files/
├── scripts/
│   ├── validation/
│   │   ├── validate-spec-structure.py
│   │   └── check-context-manifest.js
│   ├── testing/
│   │   ├── run-skill-tests.sh
│   │   └── generate-test-report.py
│   └── utilities/
│       ├── sync-to-jira.js
│       └── analyze-codebase.py
├── examples/
│   ├── sample-spec.md
│   ├── context-manifest-example.yaml
│   └── test-data/
│       ├── users.json
│       └── scenarios.yaml
├── prototypes/
│   ├── context-loader-v1/
│   └── skill-router-experiment/
├── reports/
│   ├── feature-001-results.md
│   └── performance-analysis.md
└── notes/
    ├── architecture-decisions.md
    └── research-findings.md
```

**Nested Structure**: Use subdirectories to show relationships and context
- Good: `ai-temp-files/scripts/validation/validate-spec.py`
- Bad: `ai-temp-files/validate-spec.py` (unclear purpose)

---

## Scalable Directory Structure

### Project Root Structure

```
specweave/                          # Framework root
├── .specweave/                     # Framework internals
│   ├── config.yaml                 # Project configuration
│   ├── cache/                      # Performance cache
│   │   ├── context-index.json
│   │   └── spec-embeddings/
│   └── skills/                     # Project-specific skills
│       └── custom-skill/
├── .claude/
│   ├── commands/                   # Slash commands
│   └── skills/                     # Claude Code skills
│       ├── skill-router/
│       ├── context-loader/
│       ├── docs-updater/
│       └── ...
├── specs/                          # Specifications (SOURCE OF TRUTH)
│   ├── constitution.md             # Governing principles
│   ├── overview.md                 # System overview
│   └── modules/                    # Feature modules
│       ├── payments/               # Example: Payment module
│       │   ├── overview.md         # Module overview
│       │   ├── stripe/
│       │   │   ├── spec.md         # Stripe integration spec
│       │   │   ├── api-contracts.md
│       │   │   └── data-model.md
│       │   ├── paypal/
│       │   │   ├── spec.md
│       │   │   └── webhooks.md
│       │   └── shared/
│       │       ├── payment-entities.md
│       │       └── compliance.md
│       ├── authentication/
│       │   ├── overview.md
│       │   ├── oauth/
│       │   │   └── spec.md
│       │   └── session-management/
│       │       └── spec.md
│       └── integrations/           # External integrations
│           ├── apis/
│           │   ├── overview.md
│           │   ├── rest-apis.md
│           │   └── graphql-apis.md
│           └── services/
│               ├── email-service.md
│               └── sms-service.md
├── features/                       # Implementation plans (auto-numbered)
│   ├── 001-context-loader/
│   │   ├── spec.md                 # Feature specification
│   │   ├── plan.md                 # Implementation plan
│   │   ├── tasks.md                # Executable tasks
│   │   ├── tests.md                # Test strategy
│   │   └── context-manifest.yaml   # What context to load
│   ├── 002-skill-router/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   ├── tasks.md
│   │   ├── tests.md
│   │   └── validation/             # Feature-specific validation
│   │       └── test-cases.yaml
│   └── README.md                   # Features index
├── work/                           # Active development work
│   ├── issues/                     # Work items
│   │   ├── 001-implement-context-loader/
│   │   │   ├── issue.md
│   │   │   ├── subtasks.md
│   │   │   ├── context-manifest.yaml
│   │   │   └── progress.md
│   │   └── 002-test-skill-router/
│   │       ├── issue.md
│   │       └── context-manifest.yaml
│   └── backlog.md                  # Prioritized backlog
├── docs/                           # 📚 ALL KNOWLEDGE (source of truth)
│   ├── README.md                   # Documentation index
│   ├── principles.md               # Framework principles (flexible guidelines)
│   ├── getting-started/
│   │   ├── installation.md
│   │   ├── quickstart.md
│   │   └── configuration.md
│   ├── guides/
│   │   ├── creating-skills.md
│   │   ├── writing-specs.md
│   │   └── brownfield-onboarding.md
│   ├── reference/
│   │   ├── skills-api.md
│   │   ├── context-manifests.md
│   │   └── cli-commands.md
│   ├── architecture/               # 🏗️ System design (MOVED from root)
│   │   ├── overview.md
│   │   ├── system-design.md
│   │   ├── skills-system.md
│   │   ├── context-loading.md
│   │   ├── deployment/
│   │   │   ├── infrastructure.md
│   │   │   └── scaling-strategy.md
│   │   ├── security/
│   │   │   ├── authentication.md
│   │   │   └── authorization.md
│   │   └── data/
│   │       ├── database-schema.md
│   │       └── data-flow.md
│   ├── decisions/                  # 📋 Architecture Decision Records
│   │   ├── index.md
│   │   ├── 001-tech-stack.md
│   │   ├── 002-database-choice.md
│   │   └── 003-auth-strategy.md
│   └── changelog/
│       ├── 2025-01.md
│       └── releases.md
├── ai-temp-files/                  # Non-source supporting files
│   ├── scripts/
│   ├── examples/
│   ├── prototypes/
│   ├── reports/
│   └── notes/
├── src/                            # Source code
│   ├── cli/                        # CLI implementation
│   ├── skills/                     # Core skills (if coded)
│   └── utils/                      # Utilities
├── tests/                          # Test suite
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── CLAUDE.md                       # This file
├── README.md                       # Project README
├── package.json                    # Node package config
└── .gitignore
```

### Key Structure Principles

#### 1. Modular Specifications (`specs/modules/`)
**Problem**: Monolithic 500-page specs are overwhelming and context-inefficient.

**Solution**: Organize specs by functional modules, each with nested submodules:

```
specs/modules/payments/
├── overview.md              # High-level payment module description
├── stripe/
│   ├── spec.md              # Stripe-specific specification
│   ├── api-contracts.md     # Stripe API contracts
│   └── data-model.md        # Stripe data entities
├── paypal/
│   ├── spec.md
│   └── webhooks.md          # PayPal webhook handling
└── shared/
    ├── payment-entities.md  # Common payment models
    └── compliance.md        # PCI-DSS, regulations
```

**Benefits**:
- Load only relevant module (e.g., `specs/modules/payments/stripe/`)
- Shared concepts in dedicated files (e.g., `shared/payment-entities.md`)
- Enterprise scale: 100+ modules without context bloat

#### 2. Separation of Architecture from Specs
**specs/**: WHAT and WHY (business requirements, user stories)
**architecture/**: HOW (system design, technical decisions)
**adrs/**: Architecture Decision Records (decisions with rationale)

#### 3. Features with Auto-Numbering
Inspired by spec-kit, features are auto-numbered for conflict prevention:

```
features/001-context-loader/
features/002-skill-router/
features/003-docs-updater/
```

Each feature contains:
- `spec.md`: What this feature does and why
- `plan.md`: How to implement it
- `tasks.md`: Executable checklist
- `tests.md`: Test strategy and cases
- `context-manifest.yaml`: What specs/docs to load

#### 4. Context Manifests
**Revolutionary**: Each issue/feature declares what context it needs:

```yaml
# features/001-context-loader/context-manifest.yaml
---
spec_sections:
  - specs/modules/core/context-loading.md
  - specs/modules/core/caching-strategy.md
architecture:
  - architecture/system-design.md#context-loading-architecture
adrs:
  - adrs/004-context-loading-approach.md
max_context_tokens: 10000
priority: high
auto_refresh: false
---
```

**Benefits**:
- Precision loading (load exactly what's needed)
- No 500-page spec bloat
- Context-aware AI agents
- Cache-friendly

---

## Development Workflow

### For Greenfield Projects

1. **Establish Constitution** (`specs/constitution.md`)
   - Define governing principles
   - Code quality standards
   - Testing philosophy
   - Architectural constraints

2. **Create Specifications** (`specs/modules/`)
   - Start with `overview.md`
   - Create module folders as needed
   - Write specs focusing on WHAT and WHY

3. **Design Architecture** (`architecture/`)
   - System design
   - Document technical decisions as ADRs

4. **Plan Features** (`features/###-feature-name/`)
   - Auto-numbered feature folders
   - spec.md → plan.md → tasks.md → tests.md

5. **Implement with Context Manifests**
   - Create work items in `work/issues/`
   - Define context manifests
   - Skills auto-load relevant context

6. **Update Living Docs** (`docs/`)
   - Auto-updated via `docs-updater` skill
   - Claude hooks trigger updates after task completion

### For Brownfield Projects

**CRITICAL PRINCIPLE**: Document before modifying to prevent regression.

1. **Analyze Existing Code**
   - Use `codebase-analyzer` skill
   - Generate specs from existing implementation
   - Create retroactive ADRs

2. **Document Related Modules**
   - Before modifying payment flow, document current payment implementation
   - Create specs in `specs/modules/payments/existing/`
   - Extract data models, API contracts

3. **Create Tests for Current Behavior**
   - Write E2E tests that validate current functionality
   - User reviews tests to ensure completeness
   - Tests act as regression safety net

4. **Plan Modifications**
   - Create feature in `features/###-new-feature/`
   - Reference existing specs in context manifest
   - Show what changes and what stays the same

5. **Implement with Regression Monitoring**
   - Run existing tests before changes
   - Implement new feature
   - Verify existing tests still pass

---

## Claude Hooks Integration

### Auto-Documentation Hook
**Location**: `.claude/hooks/post-task-completion.sh`

**Trigger**: After any task is marked complete

**Action**:
- Activate `docs-updater` skill
- Scan completed task
- Update relevant documentation in `docs/`
- Commit documentation changes

### Human Input Required Hook
**Location**: `.claude/hooks/human-input-required.sh`

**Trigger**: When agent needs clarification or approval

**Action**:
- Create notification
- Log to `work/issues/{current-issue}/progress.md`
- Pause execution
- Resume after human input

### Regression Detection Hook
**Location**: `.claude/hooks/pre-implementation.sh`

**Trigger**: Before implementing any feature

**Action**:
- Check if modification affects existing code
- If yes, verify documentation exists
- If no docs, activate `brownfield-documenter` skill
- Require approval before proceeding

---

## Skills Development Philosophy

### Essential Skills for SpecWeave

1. **skill-router** - Auto-detect role and route to appropriate skill
2. **context-loader** - Selective spec loading based on manifests
3. **docs-updater** - Auto-update living documentation
4. **feature-planner** - Create implementation plans
5. **brownfield-documenter** - Generate specs from existing code
6. **hook-manager** - Manage Claude hooks
7. **test-validator** - Run and validate skill tests

### Skill Testing Requirements

Every skill MUST have:
- Minimum 3 test cases in `test-cases/` directory
- Test results generated in `test-results/` (gitignored)
- Tests covering: basic functionality, edge cases, integration

**Example**:
```
.claude/skills/context-loader/
├── SKILL.md
├── scripts/
│   └── load-context.py
├── test-cases/
│   ├── test-1-basic-loading.yaml
│   ├── test-2-large-spec.yaml
│   └── test-3-nested-modules.yaml
└── test-results/              # Generated, in .gitignore
    ├── test-1-result.md
    ├── test-2-result.md
    └── test-3-result.md
```

---

## Naming Conventions

### Features
- **Format**: `###-short-descriptive-name`
- **Examples**: `001-context-loader`, `002-skill-router`
- **Auto-increment**: Scan `features/` and increment highest number

### Specs Modules
- **Format**: `lowercase-kebab-case`
- **Examples**: `payments`, `authentication`, `user-management`
- **Submodules**: Nested folders (e.g., `payments/stripe/`, `payments/paypal/`)

### ADRs
- **Format**: `###-decision-title.md`
- **Examples**: `001-tech-stack.md`, `002-database-choice.md`
- **Index**: Maintain `adrs/index.md` with all decisions

### Issues
- **Format**: `###-action-object`
- **Examples**: `001-implement-context-loader`, `002-test-skill-router`

---

## Regression Prevention Strategy

### Brownfield Modification Checklist

Before modifying any existing code:

1. ✅ **Documentation exists**
   - Specs for current behavior in `specs/modules/{module}/existing/`
   - Architecture documented in `architecture/`

2. ✅ **Tests exist**
   - E2E tests for critical paths
   - Unit tests for key functions
   - User has reviewed and approved tests

3. ✅ **Context manifest prepared**
   - Identifies all related specs
   - Includes architecture docs
   - Lists relevant ADRs

4. ✅ **Impact analysis completed**
   - Dependency graph generated
   - Affected modules identified
   - Regression risk assessed

5. ✅ **Approval obtained**
   - User reviews impact analysis
   - User approves modification plan
   - Tests validated

Only after all checks pass → proceed with implementation.

---

## Living Documentation Principles

### Documentation Types

1. **Getting Started** (`docs/getting-started/`)
   - Installation, quickstart, configuration
   - Always up-to-date via hooks

2. **Guides** (`docs/guides/`)
   - How-to guides for common tasks
   - Best practices
   - Workflow documentation

3. **Reference** (`docs/reference/`)
   - API documentation
   - CLI commands
   - Configuration options

4. **Architecture** (`docs/architecture/`)
   - System overview
   - Component diagrams (Mermaid)
   - Design patterns used

5. **Changelog** (`docs/changelog/`)
   - Monthly changelogs
   - Release notes
   - Breaking changes

### Auto-Update Rules

The `docs-updater` skill automatically updates:
- API reference when new endpoints added
- CLI reference when commands change
- Changelog when features completed
- Guides when workflows modified

**Manual documentation** (user-written guides, tutorials) is preserved and never auto-modified.

---

## Summary

**SpecWeave** replaces vibe coding with **Intent-Driven Development**:

1. **Specs are SOURCE OF TRUTH** - Code expresses specs
2. **Modular and scalable** - Solo projects to enterprise systems
3. **Context precision** - Load only what's needed
4. **Auto-role routing** - Skills detect expertise automatically
5. **Regression prevention** - Document before modifying
6. **Test-validated** - Every skill and feature proven through tests
7. **Living documentation** - Docs evolve with code via hooks
8. **Brownfield-ready** - Document existing code, prevent regressions

This framework enables building software at any scale with confidence, clarity, and continuous validation.
