# Release Management

**Version**: 1.0.0
**Author**: SpecWeave Contributors
**License**: MIT

## Description

Multi-repository release coordination with version alignment, release waves, RC lifecycle management (alpha/beta/rc), brownfield detection, and rollback planning. Supports lockstep, independent, and umbrella versioning strategies.

## Skills

| Skill | Description |
|-------|-------------|
| release-expert | Multi-repo release expert combining version alignment (semantic versioning, conflict detection, compatibility validation, version matrix management) with release orchestration (RC lifecycle, dependency management, release waves, brownfield detection) |

## Commands

| Command | Description |
|---------|-------------|
| /sw-release:align | Align versions across multiple repositories according to release strategy with conflict detection and validation |
| /sw-release:init | Initialize release strategy and create release-strategy.md documentation |
| /sw-release:rc | Create and manage release candidates with pre-release tag lifecycle |
| /sw-release:npm | NPM-specific release operations including package publishing and version bumping |
| /sw-release:platform | Platform-agnostic release operations for multi-language projects |

## Installation

```bash
vskill add specweave --plugin sw-release
```

## Requirements

- SpecWeave core plugin (sw@specweave)
- Git with version tags support
- Conventional commits in git history
- Release strategy document (.specweave/docs/internal/delivery/release-strategy.md)
