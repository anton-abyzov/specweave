---
title: LivingSpec Backwards Compatibility Policy
status: approved
created: 2025-12-06
---

# LivingSpec Backwards Compatibility Policy

## Core Principle

**LivingSpec prioritizes stability over new features.**

Projects using LivingSpec must be able to upgrade without breaking their existing documentation.

## Compatibility Guarantees

### Tier 1: Permanent (Never Changes)

| Item | Guarantee |
|------|-----------|
| E-suffix meaning | `E` = External origin |
| E-suffix position | Always at end of ID |
| Directory structure | `.livingspec/` root |
| Core entity types | Epic, Feature, User Story, Task, AC |

### Tier 2: Stable (RFC Required)

| Item | Change Process |
|------|----------------|
| New entity types | RFC → Vote → 2 release notice |
| New frontmatter fields | RFC → Vote |
| Validation rules | RFC → Vote |
| Sync protocol | RFC → Vote |

### Tier 3: Flexible (PR Sufficient)

| Item | Change Process |
|------|----------------|
| Documentation | PR review |
| Examples | PR review |
| CLI options (additive) | PR review |
| New sync providers | PR review |

## E-Suffix Compatibility

### Absolute Rules

1. **E-suffix is permanent** - Once an ID has E-suffix, it cannot be removed
2. **E-suffix pattern is fixed** - Always `{ID}E` format
3. **Propagation is mandatory** - External parent → External children
4. **No E-suffix conflicts** - `US-001` and `US-001E` are distinct IDs

### Migration Scenarios

#### Scenario: Internal → External (Not Allowed)

```yaml
# WRONG: Cannot add E-suffix to existing internal item
# Before
id: "US-001"

# After (INVALID - breaks references)
id: "US-001E"
```

**Solution**: Create new external item, deprecate internal.

#### Scenario: External → Internal (Not Allowed)

```yaml
# WRONG: Cannot remove E-suffix
# Before
id: "US-001E"
origin: "external"

# After (INVALID - loses provenance)
id: "US-001"
```

**Solution**: External items remain external forever.

#### Scenario: Re-import with Different Parent

```yaml
# ALLOWED: Same E-suffix ID, different parent
# Before
id: "US-001E"
feature: "FS-042E"

# After (parent changed in external tool)
id: "US-001E"
feature: "FS-043E"  # Valid - ID preserved, parent updated
```

## Schema Evolution

### Adding Fields (Safe)

```json
// v1.0.0
{
  "id": "US-001E",
  "title": "Feature"
}

// v1.1.0 (backwards compatible)
{
  "id": "US-001E",
  "title": "Feature",
  "priority": "P1"  // New optional field
}
```

### Removing Fields (Breaking)

```json
// v1.0.0
{
  "id": "US-001E",
  "title": "Feature",
  "deprecated_field": "value"
}

// v2.0.0 (breaking - requires MAJOR version)
{
  "id": "US-001E",
  "title": "Feature"
  // deprecated_field removed
}
```

### Renaming Fields (Breaking)

```json
// WRONG: Field rename breaks compatibility
// v1
{ "user_story": "US-001E" }

// v2 (BREAKING)
{ "story": "US-001E" }
```

**Solution**: Add new field, deprecate old, remove in MAJOR.

## Validation Compatibility

### Strict Mode vs Lenient Mode

```bash
# Strict: All rules enforced (CI/CD)
livingspec validate --strict

# Lenient: Warnings for deprecated features (development)
livingspec validate --lenient

# E-Suffix: Always strict (no lenient mode)
livingspec validate --check-esuffix  # Always strict
```

## Upgrade Path

### From v1 to v2

```bash
# 1. Check compatibility
livingspec check-upgrade --from v1 --to v2

# 2. Run migration (if needed)
livingspec migrate --to v2

# 3. Validate
livingspec validate --strict
```

### E-Suffix Migration (One-Time)

For projects upgrading from before E-suffix standard:

```bash
# Identify external items without E-suffix
livingspec audit --check-external-origin

# Add E-suffix to identified items
livingspec fix --add-esuffix-to-external

# Validate
livingspec validate --check-esuffix
```

## Deprecation Timeline

```
v1.0.0 - Feature introduced
v1.1.0 - Deprecation announced (DEPRECATED tag)
v1.2.0 - Warning emitted on use
v2.0.0 - Feature removed (breaking change)
```

**E-Suffix Exception**: E-suffix features are NEVER deprecated.
