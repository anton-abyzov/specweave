---
id: FS-117
title: "LivingSpec JSON Schemas"
status: planned
owner: specweave-core
epic: null
tags: ["schema", "validation", "json-schema", "e-suffix"]
created: 2025-12-06
parent_feature: FS-116
external_tools:
  github:
    type: milestone
    id: 28
    url: "https://github.com/anton-abyzov/specweave/milestone/28"
---

# FS-117: LivingSpec JSON Schemas

## Overview

JSON Schema definitions for all LivingSpec document types with E-suffix validation support.

## Deliverables

1. **manifest.schema.json** - Project manifest validation
2. **epic.schema.json** - Epic document validation
3. **feature.schema.json** - Feature document validation
4. **user-story.schema.json** - User Story validation
5. **task.schema.json** - Task validation
6. **acceptance-criteria.schema.json** - AC validation

## E-Suffix Validation

All schemas include patterns for both internal and external variants:

```json
{
  "id": {
    "type": "string",
    "pattern": "^US-\\d{3,}E?$",
    "description": "User Story ID. E suffix for external items."
  }
}
```

## User Stories

- [US-001: Manifest Schema](./us-001-manifest-schema.md)
- [US-002: Entity Schemas](./us-002-entity-schemas.md)

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0116-livingspec-universal-standard](../../../../increments/0116-livingspec-universal-standard/spec.md) | ⏳ in-progress | - |

## Links

- **Parent Feature**: [FS-116](../FS-116/FEATURE.md)
- **Schemas Location**: [../FS-116/schemas/](../FS-116/schemas/)
