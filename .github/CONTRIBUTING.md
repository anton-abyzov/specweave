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
git remote add upstream https://github.com/specweave/specweave.git
```

### Install SpecWeave

```bash
# Install dependencies
npm install

# Install SpecWeave agents/skills locally
npm run install:all

# Restart Claude Code to load new components
```

### Verify Installation

```bash
# Run tests to verify everything works
npm test

# Check that agents/skills are installed
ls .claude/agents/
ls .claude/skills/
```

---

## Development Workflow

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

- **Agents** go in `src/agents/{name}/`
- **Skills** go in `src/skills/{name}/`
- **Commands** go in `src/commands/`
- **Hooks** go in `src/hooks/`
- **Templates** go in `src/templates/` (for user project root only)

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

**Location**: `src/agents/{agent-name}/`

**Structure**:
```
src/agents/my-agent/
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

**Location**: `src/skills/{skill-name}/`

**Structure**:
```
src/skills/my-skill/
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

**Location**: `src/commands/{command-name}.md`

**Format**: Markdown file with command description and usage

**Must be**:
- Framework-agnostic (adapts to ANY tech stack)
- Generic (never assumes Next.js, React, etc.)
- Tech stack detection via `.specweave/config.yaml` or project files

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
4. **Update mkdocs.yml** if adding new files
5. **Test locally**: `mkdocs serve`

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
# Install MkDocs
pip install mkdocs mkdocs-material

# Serve locally
mkdocs serve

# Build
mkdocs build

# Deploy (maintainers only)
mkdocs gh-deploy
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
2. Search [GitHub Discussions](https://github.com/specweave/specweave/discussions)
3. Create a [new discussion](https://github.com/specweave/specweave/discussions/new)
4. Tag maintainers in your issue/PR

---

**Thank you for contributing to SpecWeave!** 🔷

**Generated with SpecWeave** | [Learn More](https://docs.specweave.dev)
