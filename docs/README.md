# SpecWeave Documentation

Welcome to the SpecWeave documentation. This is living documentation that evolves with the framework through automated hooks.

## Documentation Structure

### Getting Started
New to SpecWeave? Start here.

- [Installation](getting-started/installation.md) - Install SpecWeave on macOS, Windows, or Linux
- [Quick Start](getting-started/quickstart.md) - Get up and running in 5 minutes
- [Configuration](getting-started/configuration.md) - Configure SpecWeave for your project

### Guides
Step-by-step guides for common tasks.

- [Writing Specifications](guides/writing-specs.md) - How to write effective specs
- [Creating Skills](guides/creating-skills.md) - Build custom skills for your workflow
- [Brownfield Onboarding](guides/brownfield-onboarding.md) - Add SpecWeave to existing projects
- [Feature Planning](guides/feature-planning.md) - Plan and implement features
- [Testing Strategy](guides/testing-strategy.md) - Write tests that prevent regression

### Reference
Technical reference documentation (auto-updated).

- [CLI Commands](reference/cli-commands.md) - Complete CLI reference
- [Skills API](reference/skills-api.md) - Skills development API
- [Context Manifests](reference/context-manifests.md) - Context loading specification
- [Configuration](reference/configuration.md) - All configuration options
- [Hooks](reference/hooks.md) - Claude Code hooks integration

### Architecture
High-level architecture and design.

- [Overview](architecture/overview.md) - System architecture overview
- [Skills System](architecture/skills-system.md) - How skills work
- [Context Loading](architecture/context-loading.md) - Context precision architecture
- [Auto-Role Routing](architecture/auto-role-routing.md) - Intelligent skill routing

### Changelog
Release notes and changes.

- [2025-01](changelog/2025-01.md) - January 2025 changes
- [Releases](changelog/releases.md) - Version history

## Quick Links

### For Newcomers
1. [Installation](getting-started/installation.md)
2. [Quick Start](getting-started/quickstart.md)
3. [Your First Feature](guides/feature-planning.md)

### For Existing Users
- [CLI Reference](reference/cli-commands.md)
- [Configuration Options](reference/configuration.md)
- [Latest Changes](changelog/releases.md)

### For Brownfield Projects
- [Brownfield Onboarding Guide](guides/brownfield-onboarding.md)
- [Generating Specs from Code](guides/generating-specs.md)
- [Regression Prevention](guides/regression-prevention.md)

### For Skill Developers
- [Creating Skills](guides/creating-skills.md)
- [Skills API](reference/skills-api.md)
- [Testing Skills](guides/testing-skills.md)

## Contributing to Documentation

### Auto-Updated Documentation

These sections are automatically updated via the `docs-updater` skill:
- CLI reference
- Skills API reference
- Configuration reference
- Changelog (monthly)

**Do not manually edit auto-updated sections** - your changes will be overwritten.

### Manual Documentation

These sections are manually written and preserved:
- Getting started guides
- How-to guides
- Architecture overviews
- Tutorials

You can safely edit these without hooks overwriting your work.

### Documentation Standards

- **Markdown**: Use GitHub-flavored markdown
- **Headers**: Use ATX-style (`#` symbols)
- **Code Blocks**: Include language hints (````bash`, ````yaml`, etc.)
- **Links**: Use relative links for internal docs
- **Examples**: Include practical, runnable examples
- **Clarity**: Write for beginners, provide depth for experts

## Living Documentation Philosophy

SpecWeave treats documentation as a first-class citizen:

1. **Documentation is Source of Truth** - See [Constitution Article I](../specs/constitution.md#article-i-source-of-truth-principle)
2. **Auto-Updated** - Hooks update docs after task completion
3. **Manual Content Protected** - User-written guides never overwritten
4. **Always Current** - No stale documentation
5. **Validated** - Documentation structure validated on build

## Documentation Hooks

### post-task-completion
When a task is completed, the `docs-updater` skill:
- Scans completed task
- Identifies affected documentation
- Updates CLI reference if commands changed
- Updates API reference if APIs modified
- Updates changelog

### pre-implementation
Before implementing features, docs are validated:
- Required docs exist
- Structure is correct
- Links are valid

## Search and Navigation

### By Topic
- **Installation**: [Getting Started](getting-started/installation.md)
- **Specifications**: [Writing Specs](guides/writing-specs.md)
- **Features**: [Feature Planning](guides/feature-planning.md)
- **Testing**: [Testing Strategy](guides/testing-strategy.md)
- **Brownfield**: [Brownfield Onboarding](guides/brownfield-onboarding.md)

### By Role
- **Product Manager**: [Writing Specs](guides/writing-specs.md)
- **Architect**: [Architecture Docs](architecture/overview.md)
- **Developer**: [Feature Planning](guides/feature-planning.md), [CLI Reference](reference/cli-commands.md)
- **QA Engineer**: [Testing Strategy](guides/testing-strategy.md)
- **Skill Developer**: [Creating Skills](guides/creating-skills.md), [Skills API](reference/skills-api.md)

## Feedback

Found an error or have a suggestion?

- For auto-updated docs: File an issue (the generator may have a bug)
- For manual docs: Submit a pull request with corrections
- For missing docs: Open an issue requesting new documentation

## Documentation Roadmap

Coming soon:
- [ ] Video tutorials
- [ ] Interactive examples
- [ ] API playground
- [ ] Brownfield migration case studies
- [ ] Enterprise deployment guides

---

**SpecWeave Documentation** - Living, validated, always current.
