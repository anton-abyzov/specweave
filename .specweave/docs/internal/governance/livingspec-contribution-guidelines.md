---
title: LivingSpec Contribution Guidelines
status: approved
created: 2025-12-06
---

# LivingSpec Contribution Guidelines

## Overview

Guidelines for contributing to the LivingSpec standard and its implementations.

## Contribution Types

### 1. Specification Changes

Changes to the core LivingSpec standard require:

| Change Type | Process | Approval |
|-------------|---------|----------|
| **Breaking** | RFC → Discussion → Vote | 2/3 maintainers |
| **Feature** | Proposal → Review → Merge | 1 maintainer |
| **Clarification** | PR → Review → Merge | 1 maintainer |
| **Typo/Doc** | PR → Merge | Auto-merge allowed |

### 2. Schema Changes

JSON Schema changes follow strict versioning:

```
schemas/
├── v1/
│   ├── epic.schema.json
│   ├── feature.schema.json
│   ├── user-story.schema.json
│   ├── task.schema.json
│   └── acceptance-criteria.schema.json
└── v2/  # New version for breaking changes
```

### 3. Implementation Contributions

- CLI tools
- Editor plugins
- Sync providers
- Documentation generators

## E-Suffix Standard Governance

### Immutability Rule

**The E-suffix convention is IMMUTABLE once established.**

| Rule | Governance Level | Change Process |
|------|------------------|----------------|
| E = External | **Permanent** | Cannot be changed |
| Pattern: `*E` suffix | **Permanent** | Cannot be changed |
| Propagation rules | **Stable** | RFC required |
| Validation rules | **Stable** | RFC required |

### Adding New Entity Types

When adding new entity types with E-suffix support:

1. **Propose** new entity in RFC
2. **Define** internal and external patterns
3. **Document** propagation rules
4. **Implement** validation
5. **Update** JSON schemas

Example RFC for new entity:
```markdown
# RFC: Add Component Entity

## Patterns
- Internal: `COMP-{NNN}`
- External: `COMP-{NNN}E`

## Propagation
- Parent Feature E → Child Component E
- Component E → Child Module E

## Validation
- Pattern: `^COMP-\d{3,}E?$`
```

## Code of Conduct

### Be Respectful
- Constructive feedback only
- No personal attacks
- Assume good intentions

### Be Inclusive
- Welcome newcomers
- Explain decisions
- Document thoroughly

### Be Professional
- Follow coding standards
- Write tests
- Update documentation

## Pull Request Process

### 1. Fork & Branch

```bash
git clone https://github.com/YOUR_USER/livingspec.git
cd livingspec
git checkout -b feature/your-feature
```

### 2. Make Changes

- Follow existing code style
- Add tests for new features
- Update documentation
- Validate E-suffix patterns if applicable

### 3. Submit PR

```markdown
## Description
Brief description of changes

## Type
- [ ] Feature
- [ ] Bug fix
- [ ] Documentation
- [ ] Schema change

## E-Suffix Impact
- [ ] Adds new E-suffix pattern
- [ ] Modifies E-suffix validation
- [ ] No E-suffix impact

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] E-suffix validation passes
- [ ] No breaking changes (or RFC approved)
```

### 4. Review Process

1. Automated checks run
2. Maintainer reviews
3. Address feedback
4. Approval & merge

## Versioning Policy

### Semantic Versioning

```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes (E-suffix pattern changes NOT allowed)
MINOR: New features, new entity types
PATCH: Bug fixes, documentation
```

### Deprecation Policy

1. **Announce** deprecation in MINOR release
2. **Warn** for 2 MINOR releases
3. **Remove** in next MAJOR release

**Exception**: E-suffix patterns are NEVER deprecated or removed.

## License

LivingSpec is released under the MIT License.

```
MIT License

Copyright (c) 2026 LivingSpec Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software...
```
