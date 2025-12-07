---
id: US-001
feature: FS-117
title: "Manifest Schema"
status: planned
priority: P1
---

# US-001: Manifest Schema

## Description

As a LivingSpec implementer, I want a JSON Schema for manifest.yaml so that I can validate project configuration.

## Acceptance Criteria

- [ ] **AC-US1-01**: Schema validates required fields (name, version)
- [ ] **AC-US1-02**: Schema validates optional fields (sync, providers)
- [ ] **AC-US1-03**: Schema includes E-suffix configuration options
- [ ] **AC-US1-04**: VS Code intellisense works with schema

## Tasks

- [ ] T-001: Create manifest.schema.json
- [ ] T-002: Add VS Code schema association

## Schema Preview

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "LivingSpec Manifest",
  "type": "object",
  "required": ["name", "version"],
  "properties": {
    "name": {
      "type": "string",
      "description": "Project name"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "LivingSpec version (SemVer)"
    },
    "sync": {
      "type": "object",
      "properties": {
        "e_suffix_for_imports": {
          "type": "boolean",
          "default": true,
          "description": "Enforce E-suffix for all imported items"
        }
      }
    }
  }
}
```
