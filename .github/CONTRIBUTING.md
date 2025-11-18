# Contributing to SpecWeave

Thank you for considering contributing to SpecWeave! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Community](#community)

---

## Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Getting Started

### Prerequisites

- **Node.js 18+** (for JavaScript/TypeScript projects)
- **Git** for version control
- **Claude Code** (for AI-assisted development)
- **GitHub CLI** (`gh`) recommended

### Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/specweave.git
cd specweave

# Add upstream remote
git remote add upstream https://github.com/anton-abyzov/specweave.git
```

### Install SpecWeave

SpecWeave uses **Claude Code's native plugin system**. For contributors developing SpecWeave itself:

**🚨 CRITICAL**: You MUST create a marketplace symlink for hooks to work!

```bash
# 1. Install build dependencies
npm install

# 2. Build the project
npm run build

# 3. Create marketplace symlink (MANDATORY!)
mkdir -p ~/.claude/plugins/marketplaces
ln -s "$PWD" ~/.claude/plugins/marketplaces/specweave

# 4. Verify setup (MANDATORY!)
bash .specweave/increments/0043-spec-md-desync-fix/scripts/verify-dev-setup.sh
# Must show: ✅ ALL CHECKS PASSED!

# 5. Install git hooks (recommended)
bash scripts/install-git-hooks.sh
```

**Why Symlink is MANDATORY:**

Claude Code's hook execution system looks for hooks in `~/.claude/plugins/marketplaces/specweave/`, NOT in your local repo. Without the symlink:
- ❌ Post-task-completion hooks fail with "No such file or directory"
- ❌ Status line doesn't update automatically
- ❌ Living docs don't sync after task completion
- ❌ Development workflow is broken

**Detailed Setup:** See [CLAUDE.md](../CLAUDE.md#local-development-setup-contributors-only) for complete instructions.

### Verify Installation

```bash
# 1. Run automated setup verification
bash .specweave/increments/0043-spec-md-desync-fix/scripts/verify-dev-setup.sh

# Expected output:
# ✅ ALL CHECKS PASSED! Local development setup is correct.
# You can now use TodoWrite and other tools without hook errors.

# 2. Build the project
npm run build

# 3. Run tests to verify everything works
npm test

# 4. Test hook execution (use TodoWrite tool - should work without errors)
```

### Troubleshooting Installation

**Hook errors: "No such file or directory"**

This means the marketplace symlink is missing or broken.

```bash
# Check if symlink exists
readlink ~/.claude/plugins/marketplaces/specweave

# If missing or wrong path, recreate:
rm -f ~/.claude/plugins/marketplaces/specweave
mkdir -p ~/.claude/plugins/marketplaces
ln -s "$PWD" ~/.claude/plugins/marketplaces/specweave

# Verify setup
bash .specweave/increments/0043-spec-md-desync-fix/scripts/verify-dev-setup.sh
```

**Setup verification fails**

See the verification script output for specific fix instructions, or consult:
- `.specweave/increments/0043-spec-md-desync-fix/reports/PLUGIN-HOOK-ERROR-FIX-2025-11-18.md`
- [CLAUDE.md](../CLAUDE.md#local-development-setup-contributors-only)

---

## Core Development Principles

SpecWeave follows these key principles for all contributions:

### 1. Source of Truth Discipline
- `src/` is ALWAYS the source of truth for TypeScript code
- `.claude/` files are ALWAYS generated (never edit directly)
- Keep project root clean - use increment folders for AI-generated content

### 2. Documentation = Code
- All changes must update relevant documentation
- ADRs required for architecture decisions
- RFCs for feature proposals
- Inline code comments for complex logic

### 3. Testing is Non-Negotiable
- E2E tests MANDATORY for UI features (Playwright)
- 80%+ coverage for critical paths
- Tests must tell the truth (no false positives)
- Agent/skill test cases required (minimum 3 per component)

### 4. Incremental Development
- Work in small, measurable increments
- Use SpecWeave's own workflow (`/specweave:increment`, `/specweave:do`, etc.)
- All work traces back to specs

### 5. Multi-Tool Support
- Core framework must be tool-agnostic
- Tool-specific features in adapters (`src/adapters/`)
- Plain Markdown + YAML = maximum portability

---

## Development Workflow

### Build Process & Best Practices

**CRITICAL**: SpecWeave uses TypeScript ES Modules which require specific build practices.

#### Quick Start

```bash
# Clean build (RECOMMENDED for development)
npm run rebuild

# Or manually:
npm run clean  # Remove dist/
npm run build  # Compile TypeScript
```

#### Build Architecture

SpecWeave has a **dual compilation strategy**:

1. **`tsc`** compiles `src/` → `dist/src/` (TypeScript compiler)
2. **`esbuild`** compiles `plugins/**/lib/hooks/*.ts` → `plugins/**/lib/hooks/*.js` (in-place)

**Why separate compilation?**
- Hooks must import from `dist/src/` (compiled output)
- But TypeScript compiles them, creating chicken-and-egg dependency
- Solution: Exclude hooks from `tsconfig.json`, compile with esbuild after dist/ exists

#### Common Build Issues

**TS5055: Cannot write file (would overwrite input file)**

```bash
# Cause: dist/ polluted with .ts source files
# Fix:
npm run clean && npm run build

# Prevent: Always use clean build in development
```

**Hook Import Errors: "Cannot find module 'src/...'"**

```bash
# Cause: Hooks importing from src/ instead of dist/src/
# Fix:
node scripts/fix-js-extensions.js  # Add missing .js extensions
npm run rebuild

# Verify:
node plugins/specweave/lib/hooks/update-ac-status.js 0001
```

**Missing .js Extensions in Imports**

TypeScript ES Modules **REQUIRE** `.js` extensions in imports:

```typescript
// ❌ WRONG (runtime error):
import { foo } from './bar';

// ✅ CORRECT:
import { foo } from './bar.js';
```

```bash
# Auto-fix all missing extensions:
node scripts/fix-js-extensions.js

# Dry-run first:
node scripts/fix-js-extensions.js --dry-run
```

#### Build Verification

**Pre-commit Hook** (RECOMMENDED):

```bash
# Install git hooks:
bash scripts/install-git-hooks.sh

# Hook verifies:
# - Build succeeds
# - No .ts files in dist/
# - Missing .js extensions warning
```

**Manual Verification**:

```bash
# 1. Verify no source files in dist/
find dist/src -name "*.ts" -not -name "*.d.ts"
# Should return nothing

# 2. Test build from scratch
npm run clean && npm run build

# 3. Test hook execution
node plugins/specweave/lib/hooks/update-ac-status.js --help
```

#### CI Build

GitHub Actions automatically:
- Runs `npm run rebuild` (clean build)
- Verifies no .ts files in dist/
- Runs build verification tests
- Runs hook execution tests

See: `.github/workflows/test.yml`

#### Related Documentation

- **Ultrathink Analysis**: `.specweave/increments/0039/reports/HOOK-IMPORT-ERROR-ULTRATHINK-ANALYSIS.md`
- **Fix Summary**: `.specweave/increments/0039/reports/HOOK-IMPORT-FIX-SUMMARY.md`
- **Build Verification Tests**: `tests/integration/build/build-verification.test.ts`

---

### 1. Check for Existing Issues

Before starting work, search for existing issues or create a new one:

```bash
# Search for issues
gh issue list --search "your topic"

# Create new issue
gh issue create --title "Your Issue" --body "Description"
```

### 2. Create a Feature Branch

```bash
# Update your fork
git checkout features/001-core-feature
git pull upstream features/001-core-feature

# Create feature branch
git checkout -b feature/your-feature-name
```

### 3. Make Changes

Follow SpecWeave conventions (see [CLAUDE.md](../CLAUDE.md)):

**Everything is a Plugin!** SpecWeave uses Claude Code's native plugin system:

- **Core plugin** (always loaded): `plugins/specweave/`
  - **Agents**: `plugins/specweave/agents/{name}/`
  - **Skills**: `plugins/specweave/skills/{name}/`
  - **Commands**: `plugins/specweave/commands/`
  - **Hooks**: `plugins/specweave/hooks/`
- **Other plugins** (opt-in): `plugins/specweave-{name}/`
- **Framework code** (TypeScript): `src/core/`, `src/cli/`
- **Templates** (user projects): `src/templates/`

**Key principle**: `src/` = TypeScript code (compiled to `dist/`), `plugins/` = Claude-native files (loaded directly)

### 4. Test Your Changes

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:skills
npm run test:agents
npm run test:e2e

# Check coverage
npm run test:coverage
```

### 5. Commit Changes

```bash
# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat: add new skill for X"
# or
git commit -m "fix: resolve issue with Y"
# or
git commit -m "docs: update architecture documentation"
```

**Commit Message Format**:
```
<type>: <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or updates
- `chore`: Build process, dependencies, etc.

### 6. Push and Create PR

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create pull request
gh pr create --title "Your PR Title" --body "Description"
```

---

## Contributing Guidelines

### Agents & Skills

#### Creating a New Agent

**Location**: `plugins/specweave/agents/{agent-name}/` (or `plugins/specweave-{plugin}/agents/`)

**Structure**:
```
plugins/specweave/agents/my-agent/
├── AGENT.md           # MANDATORY: System prompt with YAML frontmatter
├── templates/         # Templates for outputs
├── test-cases/        # MANDATORY: Minimum 3 test cases
│   ├── test-1.yaml
│   ├── test-2.yaml
│   └── test-3.yaml
└── references/        # Reference documentation
```

**AGENT.md Format**:
```yaml
---
name: my-agent
description: What this agent does and when to use it. Include activation keywords.
tools: Read, Write, Edit  # Optional: restrict tools
model: sonnet  # Optional: specify model
---

# Agent System Prompt

You are an expert [role] with [expertise]...

Your responsibilities:
1. [Responsibility 1]
2. [Responsibility 2]
...
```

**Test Cases (MANDATORY)**: Minimum 3 test cases in YAML format

#### Creating a New Skill

**Location**: `plugins/specweave/skills/{skill-name}/` (or `plugins/specweave-{plugin}/skills/`)

**Structure**:
```
plugins/specweave/skills/my-skill/
├── SKILL.md           # MANDATORY: Instructions with YAML frontmatter
├── test-cases/        # MANDATORY: Minimum 3 test cases
│   ├── test-1.yaml
│   ├── test-2.yaml
│   └── test-3.yaml
└── scripts/           # Optional: Helper scripts
```

**SKILL.md Format**:
```yaml
---
name: my-skill
description: What this skill does. Include activation keywords users might say.
allowed-tools: Read, Write, Edit  # Optional: restrict tools
---

# Skill Instructions

This skill helps you...
```

**Test Cases (MANDATORY)**: Minimum 3 test cases in YAML format

### Commands

**Location**: `plugins/specweave/commands/{command-name}.md` (or `plugins/specweave-{plugin}/commands/`)

**Format**: Markdown file with YAML frontmatter and command description

**Example**:
```yaml
---
name: my-command
description: What this command does
---

# Command Instructions

This command...
```

**Must be**:
- Framework-agnostic (adapts to ANY tech stack)
- Generic (never assumes Next.js, React, etc.)
- Tech stack detection via `.specweave/config.json` or project files

### Testing Requirements

#### Agent/Skill Testing (MANDATORY)

- **Minimum 3 test cases** per agent/skill
- YAML format in `test-cases/` directory
- Cover: basic functionality, edge cases, integration scenarios
- Test results gitignored (`test-results/`)

**Test Case Format**:
```yaml
---
name: "Test Name"
description: "What this test validates"
input:
  prompt: "User request"
  files: []
expected_output:
  type: "files_generated" or "content_returned"
  files: []
  contains: []
validation:
  - "Validation criterion 1"
  - "Validation criterion 2"
success_criteria:
  - "Success criterion 1"
---
```

#### Code Testing

- **Unit tests**: Co-located with code or in `tests/unit/`
- **Integration tests**: `tests/integration/`
- **E2E tests** (MANDATORY when UI exists): `tests/e2e/` using Playwright
- **Coverage target**: >80% for critical paths

### Documentation

#### When to Update Documentation

- **CLAUDE.md**: When project structure or workflow changes
- **Architecture docs** (`.specweave/docs/internal/architecture/`): When technical design changes
- **API/CLI docs** (`.specweave/docs/public/api/`): Auto-updated via hooks
- **Increment specs**: When feature scope changes

#### Documentation Best Practices

1. **Follow 5-pillar structure** (see `.specweave/docs/README.md`)
2. **Use templates** if available
3. **Add backwards links** to related docs
4. **Update sidebar** if adding new files (see `docs-site/sidebars.ts`)
5. **Test locally**: `npm run docs:dev`

### Code Style

- **TypeScript**: Follow TSConfig strict mode
- **Python**: Follow PEP 8
- **Go**: Follow gofmt standards
- **Formatting**: Use Prettier/Black/gofmt
- **Linting**: Fix all linter warnings

---

## Pull Request Process

### Before Submitting

1. ✅ **Read CLAUDE.md** - Understand SpecWeave conventions
2. ✅ **Tests pass** - Run `npm test`
3. ✅ **Specs align** - Implementation matches specification
4. ✅ **Documentation updated** - If structure/API changed
5. ✅ **Self-review** - Review your own code first

### PR Checklist

Use the PR template to ensure you've covered:

- [ ] **Specification alignment** - Links to spec, TC-0001 IDs referenced
- [ ] **Test coverage** - Tests written, TC-0001 traceability
- [ ] **Brownfield protection** - Docs/tests exist for modified code
- [ ] **Skills validation** - Agents/skills have ≥3 test cases
- [ ] **Documentation** - Updated where applicable
- [ ] **Security** - No secrets committed

### Review Process

1. **Automated checks** - GitHub Actions validate your PR
2. **Maintainer review** - Core team reviews your code
3. **Feedback** - Address review comments
4. **Approval** - Get approval from maintainers
5. **Merge** - Maintainers merge when approved

---

## Testing Requirements

### Running Tests

```bash
# All tests
npm test

# Specific suites
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:skills        # Skill validation
npm run test:agents        # Agent validation
npm run test:e2e           # E2E tests (Playwright)

# Coverage
npm run test:coverage
```

### Writing Tests

#### Unit Tests

```typescript
import { describe, it, expect } from '@jest/globals';

describe('MyFeature', () => {
  it('should do something', () => {
    expect(myFunction()).toBe(expected);
  });
});
```

#### E2E Tests (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('TC-0001: User can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

---

## Documentation

### Documentation Structure

See [.specweave/docs/README.md](../.specweave/docs/README.md) for complete 5-pillar structure:

- **Internal/Strategy** - Business requirements (WHAT/WHY)
- **Internal/Architecture** - Technical design (HOW)
- **Internal/Delivery** - Roadmap, release plans
- **Internal/Operations** - Runbooks, monitoring
- **Internal/Governance** - Security, compliance
- **Public** - User-facing documentation

### Building Documentation

```bash
# Install dependencies
cd docs-site && npm install

# Serve locally (development mode with hot-reload)
npm run docs:dev

# Build (production build)
npm run docs:build

# Deploy (maintainers only - via GitHub Actions)
# Automatically deployed to Vercel/GitHub Pages on push
```

---

## Community

### Communication Channels

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Questions, ideas, community chat
- **Discord**: Real-time chat with community (coming soon)
- **Twitter**: [@specweave](https://twitter.com/specweave) (coming soon)

### Getting Help

- **Documentation**: [docs.specweave.dev](https://docs.specweave.dev) (coming soon)
- **Examples**: [/examples](../examples) directory
- **Issues**: Search existing issues or create new one
- **Discussions**: Ask questions in GitHub Discussions

---

## Recognition

Contributors will be:
- Listed in [CONTRIBUTORS.md](CONTRIBUTORS.md)
- Credited in release notes
- Given shoutouts on social media
- Invited to core contributor team (for significant contributions)

---

## License

By contributing to SpecWeave, you agree that your contributions will be licensed under the same license as the project (see [LICENSE](../LICENSE)).

---

## Questions?

If you have questions about contributing, please:
1. Check [CLAUDE.md](../CLAUDE.md) for development guide
2. Search [GitHub Discussions](https://github.com/anton-abyzov/specweave/discussions)
3. Create a [new discussion](https://github.com/anton-abyzov/specweave/discussions/new)
4. Tag maintainers in your issue/PR

---

**Thank you for contributing to SpecWeave!** 🔷

**Generated with SpecWeave** | [Learn More](https://docs.specweave.dev)
