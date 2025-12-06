# Plan: LivingSpec Universal Standard

## Overview

Extract proven patterns from SpecWeave into a vendor-neutral LivingSpec standard.

## Phase 1: Specification Authoring

### 1.1 Core Standard Document
- Formal specification (Markdown + YAML)
- Terminology glossary
- Versioning scheme (SemVer)

### 1.2 Schema Definitions
- Directory structure schema
- Document type schemas (6 types)
- Sync protocol specification
- AI context protocol

## Phase 2: Reference Implementation

### 2.1 JSON Schema Files
```
schemas/
├── livingspec.schema.json
├── manifest.schema.json
├── feature.schema.json
├── user-story.schema.json
├── adr.schema.json
├── module.schema.json
└── work.schema.json
```

### 2.2 VS Code Integration
- Schema associations
- Intellisense for YAML
- Validation on save

### 2.3 CLI Validator
```bash
livingspec validate .
livingspec validate --fix
livingspec init
livingspec migrate confluence
```

## Phase 3: Documentation

- Specification reference
- Quick-start guide (5 min)
- Migration guides (Confluence, Notion)
- Team adoption playbook

## Phase 4: Publication

### Repository Structure
```
livingspec/specification/
├── README.md
├── SPECIFICATION.md
├── schemas/
├── examples/
└── guides/
```

### Website
- Landing page
- Interactive spec browser
- Schema playground

## Deliverables

| Deliverable | Priority |
|-------------|----------|
| Specification v1.0 | P0 |
| JSON Schemas (6) | P0 |
| CLI validator | P1 |
| Quick-start guide | P1 |
| VS Code extension | P2 |
| Website | P2 |
| Migration guides | P3 |

## Success Metrics

1. 3+ projects using LivingSpec within 3 months
2. All 6 document schemas defined
3. < 30 min to first valid project
4. Community engagement (stars, contributors)
