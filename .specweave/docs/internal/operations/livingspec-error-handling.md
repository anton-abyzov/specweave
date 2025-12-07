---
title: LivingSpec Error Handling
status: draft
created: 2025-12-06
---

# LivingSpec Error Handling

## Error Categories

### 1. Validation Errors

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `VAL-001` | Invalid frontmatter YAML | Fix YAML syntax |
| `VAL-002` | Missing required field | Add required field |
| `VAL-003` | Invalid ID pattern | Correct ID format |
| `VAL-004` | E-suffix missing on external item | Add E-suffix |
| `VAL-005` | E-suffix on internal item | Remove E-suffix or mark as external |

### 2. Sync Errors

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `SYNC-001` | External tool unreachable | Check network/API status |
| `SYNC-002` | Authentication failed | Refresh credentials |
| `SYNC-003` | Rate limit exceeded | Wait for reset, enable caching |
| `SYNC-004` | Conflict detected | Resolve conflict manually |
| `SYNC-005` | E-suffix propagation failed | Run propagation fix |

### 3. Schema Errors

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `SCHEMA-001` | Unknown document type | Update schema version |
| `SCHEMA-002` | Invalid field type | Correct field value |
| `SCHEMA-003` | Enum value not allowed | Use valid enum value |

## Error Response Format

```json
{
  "error": {
    "code": "VAL-004",
    "message": "E-suffix missing on external item",
    "details": {
      "file": "specs/FS-042/us-001.md",
      "field": "id",
      "expected": "US-001E",
      "actual": "US-001",
      "origin": "github"
    },
    "suggestion": "Add 'E' suffix to mark this as an external item",
    "autoFixAvailable": true
  }
}
```

## Auto-Fix Commands

```bash
# Fix E-suffix issues automatically
livingspec fix --esuffix

# Fix all validation errors that can be auto-fixed
livingspec fix --all

# Preview fixes without applying
livingspec fix --dry-run
```

## E-Suffix Error Scenarios

### Missing E-Suffix on Import

**Problem**: External item imported without E-suffix
```yaml
# Wrong
id: "US-001"
origin: "external"
source: "github"
```

**Fix**: Add E-suffix
```yaml
# Correct
id: "US-001E"
origin: "external"
source: "github"
```

### E-Suffix Propagation Failure

**Problem**: Parent has E-suffix but child doesn't
```yaml
# Parent Feature
id: "FS-042E"

# Child User Story - WRONG
id: "US-001"  # Should be US-001E
feature: "FS-042E"
```

**Fix**: Propagate E-suffix to child
```yaml
# Child User Story - CORRECT
id: "US-001E"
feature: "FS-042E"
```

### Orphaned E-Suffix

**Problem**: Item has E-suffix but no origin metadata
```yaml
# Wrong - E-suffix without origin
id: "US-001E"
# Missing: origin, source, external_id
```

**Fix**: Add origin metadata or remove E-suffix
```yaml
# Option 1: Add origin (if external)
id: "US-001E"
origin: "external"
source: "github"
external_id: "#123"

# Option 2: Remove E-suffix (if internal)
id: "US-001"
```

## Recovery Procedures

### 1. Full Validation Recovery

```bash
# 1. Stop any running syncs
livingspec sync --stop

# 2. Run full validation
livingspec validate . --strict

# 3. Fix all issues
livingspec fix --all

# 4. Verify fixes
livingspec validate .

# 5. Resume syncs
livingspec sync --resume
```

### 2. E-Suffix Recovery

```bash
# 1. Identify all E-suffix issues
livingspec validate --check-esuffix --report

# 2. Auto-fix where possible
livingspec fix --esuffix

# 3. Manual review of unfixable issues
livingspec report --esuffix-issues

# 4. Verify consistency
livingspec validate --check-esuffix
```
