---
id: US-002
feature: FS-117
title: "Entity Schemas"
status: planned
priority: P1
---

# US-002: Entity Schemas

## Description

As a LivingSpec implementer, I want JSON Schemas for all entity types so that I can validate documents.

## Acceptance Criteria

- [ ] **AC-US2-01**: Epic schema with EP-XXXE pattern
- [ ] **AC-US2-02**: Feature schema with FS-XXXE pattern
- [ ] **AC-US2-03**: User Story schema with US-XXXE pattern
- [ ] **AC-US2-04**: Task schema with T-XXXE pattern
- [ ] **AC-US2-05**: AC schema with AC-USXE-XXE pattern
- [ ] **AC-US2-06**: All schemas include origin fields for external items

## Tasks

- [ ] T-003: Create epic.schema.json
- [ ] T-004: Create feature.schema.json
- [ ] T-005: Create user-story.schema.json
- [ ] T-006: Create task.schema.json
- [ ] T-007: Create acceptance-criteria.schema.json

## Schema Patterns

### Epic (EP-XXXE)
```json
{
  "id": {
    "type": "string",
    "pattern": "^EP-\\d{3,}E?$"
  }
}
```

### Feature (FS-XXXE)
```json
{
  "id": {
    "type": "string",
    "pattern": "^FS-\\d{3,}E?$"
  }
}
```

### User Story (US-XXXE)
```json
{
  "id": {
    "type": "string",
    "pattern": "^US-\\d{3,}E?$"
  }
}
```

### Task (T-XXXE)
```json
{
  "id": {
    "type": "string",
    "pattern": "^T-\\d{3,}E?$"
  }
}
```

### Acceptance Criteria (AC-USXE-XXE)
```json
{
  "id": {
    "type": "string",
    "pattern": "^AC-US\\d+E?-\\d{2}E?$"
  }
}
```

## Origin Fields (External Items)

All entity schemas include optional origin fields:

```json
{
  "origin": {
    "type": "string",
    "enum": ["internal", "external"]
  },
  "source": {
    "type": "string",
    "enum": ["github", "jira", "ado"]
  },
  "external_id": {
    "type": "string"
  },
  "external_url": {
    "type": "string",
    "format": "uri"
  }
}
```

**Validation Rule**: If `id` ends with `E`, then `origin` MUST be `"external"`.
