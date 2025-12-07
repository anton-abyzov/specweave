---
title: LivingSpec Release Process
status: draft
created: 2025-12-06
---

# LivingSpec Release Process

## Overview

This document defines the release process for the LivingSpec standard and its reference implementations.

## Version Strategy

LivingSpec follows [Semantic Versioning 2.0.0](https://semver.org/):

| Version Component | When to Increment | Example |
|-------------------|-------------------|---------|
| **Major** (X.0.0) | Breaking changes to schema, ID patterns, or directory structure | 1.0.0 → 2.0.0 |
| **Minor** (0.X.0) | New features, new document types, new sync providers | 1.0.0 → 1.1.0 |
| **Patch** (0.0.X) | Bug fixes, documentation updates, clarifications | 1.0.0 → 1.0.1 |

## Release Artifacts

### Specification Release

1. **SPECIFICATION.md** - Full specification document
2. **CHANGELOG.md** - Version history with breaking changes
3. **schemas/** - JSON Schema files for all document types
4. **examples/** - Reference examples for each document type

### Implementation Release

1. **CLI Validator** - `livingspec-cli` npm package
2. **Docusaurus Plugin** - `@livingspec/docusaurus-plugin`
3. **VS Code Extension** - Schema validation and intellisense

## Release Checklist

### Pre-Release

- [ ] All E-suffix patterns validated
- [ ] JSON schemas updated
- [ ] Examples updated
- [ ] Breaking changes documented
- [ ] Migration guide written (if breaking)

### Release

- [ ] Create git tag: `vX.Y.Z`
- [ ] Generate GitHub Release
- [ ] Publish npm packages
- [ ] Update documentation site
- [ ] Announce on community channels

### Post-Release

- [ ] Monitor for issues
- [ ] Collect feedback
- [ ] Plan next iteration

## Distribution Channels

| Channel | Artifact | URL |
|---------|----------|-----|
| GitHub | Specification | github.com/livingspec/specification |
| npm | CLI | npmjs.com/package/livingspec-cli |
| npm | Docusaurus Plugin | npmjs.com/package/@livingspec/docusaurus-plugin |
| VS Code | Extension | marketplace.visualstudio.com/livingspec |

## E-Suffix Compatibility

When releasing new versions that affect E-suffix:

1. **Never remove E-suffix support** - External origins are permanent
2. **Add new patterns additively** - Don't change existing patterns
3. **Validate backwards compatibility** - Old E-suffix IDs must remain valid

## Changelog Format

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New feature description

### Changed
- Changed behavior description

### Fixed
- Bug fix description

### E-Suffix Changes
- Any changes to E-suffix patterns or validation
```
