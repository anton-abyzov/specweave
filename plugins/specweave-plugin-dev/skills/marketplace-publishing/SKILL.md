---
name: marketplace-publishing
description: Expert Claude Code marketplace publishing covering npm publishing, GitHub releases, semantic versioning, plugin packaging, README documentation, CHANGELOG management, marketplace submission, and plugin distribution. Activates for publish plugin, npm publish, marketplace, release plugin, semantic versioning, semver, plugin distribution, publish to npm, github release.
---

# Marketplace Publishing Expert

Expert guidance for publishing Claude Code plugins to npm and marketplace.

## Publishing Platforms

**1. GitHub** (Recommended):
```bash
# Install from GitHub
claude plugin add github:username/plugin-name

# Pros:
- Free hosting
- Version control
- Issue tracking
- Easy updates

# Requirements:
- Public repository
- Proper directory structure
- README with installation
```

**2. npm**:
```bash
# Install from npm
claude plugin add plugin-name

# Pros:
- Centralized registry
- Semantic versioning
- Easy discovery

# Requirements:
- npm account
- package.json
- Unique name (prefix: claude-plugin-)
```

**3. Marketplace**:
```bash
# Official Claude Code marketplace
# PR to marketplace repository

# Requirements:
- Quality standards
- Complete documentation
- No security issues
- Proper licensing
```

## Semantic Versioning

**Version Format**: `MAJOR.MINOR.PATCH`

**Rules**:
```yaml
MAJOR (1.0.0 → 2.0.0):
  - Breaking changes
  - Remove commands
  - Change skill keywords
  - Incompatible API changes

MINOR (1.0.0 → 1.1.0):
  - New features
  - Add commands
  - Add skills
  - Backward compatible

PATCH (1.0.0 → 1.0.1):
  - Bug fixes
  - Documentation updates
  - Performance improvements
  - No API changes
```

**Examples**:
```bash
# Bug fix
npm version patch  # 1.0.0 → 1.0.1

# New feature
npm version minor  # 1.0.1 → 1.1.0

# Breaking change
npm version major  # 1.1.0 → 2.0.0
```

## package.json Setup

**Minimum**:
```json
{
  "name": "claude-plugin-my-plugin",
  "version": "1.0.0",
  "description": "Expert [domain] plugin for Claude Code",
  "keywords": ["claude-code", "plugin", "keyword1"],
  "author": "Your Name",
  "license": "MIT",
  "files": [
    ".claude-plugin",
    "commands",
    "skills",
    "agents",
    "README.md",
    "LICENSE"
  ]
}
```

**Full**:
```json
{
  "name": "claude-plugin-my-plugin",
  "version": "1.0.0",
  "description": "Expert [domain] plugin with [features]",
  "main": "index.js",
  "scripts": {
    "test": "echo \"No tests yet\"",
    "validate": "bash validate.sh"
  },
  "keywords": [
    "claude-code",
    "plugin",
    "development-tools",
    "keyword1",
    "keyword2"
  ],
  "author": "Your Name <you@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/username/my-plugin"
  },
  "homepage": "https://github.com/username/my-plugin#readme",
  "bugs": {
    "url": "https://github.com/username/my-plugin/issues"
  },
  "files": [
    ".claude-plugin/**/*",
    "commands/**/*",
    "skills/**/*",
    "agents/**/*",
    "README.md",
    "LICENSE"
  ]
}
```

## Publishing Workflow

**GitHub Release**:
```bash
# 1. Update version
npm version patch

# 2. Commit changes
git add .
git commit -m "Release v1.0.1"

# 3. Create tag
git tag v1.0.1

# 4. Push
git push && git push --tags

# 5. Create GitHub release
gh release create v1.0.1 \
  --title "v1.0.1" \
  --notes "Bug fixes and improvements"
```

**npm Publish**:
```bash
# 1. Login
npm login

# 2. Validate package
npm pack --dry-run

# 3. Publish
npm publish

# 4. Verify
npm view claude-plugin-my-plugin
```

## Documentation Requirements

**README.md**:
```markdown
# Plugin Name

> One-line tagline

Brief description.

## Features

- Feature 1
- Feature 2

## Installation

\```bash
claude plugin add github:user/plugin
\```

## Commands

### /plugin:command

Description.

## Examples

[Working examples]

## License

MIT
```

**CHANGELOG.md**:
```markdown
# Changelog

## [1.0.1] - 2025-01-15

### Fixed
- Bug fix 1
- Bug fix 2

## [1.0.0] - 2025-01-01

### Added
- Initial release
```

## Quality Checklist

**Pre-publish**:
- ✅ All commands working
- ✅ Skills activate correctly
- ✅ No hardcoded secrets
- ✅ README with examples
- ✅ LICENSE file
- ✅ Semantic versioning
- ✅ CHANGELOG updated
- ✅ Git tag created

**Post-publish**:
- ✅ Test installation
- ✅ Verify on npm (if published)
- ✅ Check GitHub release
- ✅ Update marketplace (if applicable)

Publish professional Claude Code plugins!
