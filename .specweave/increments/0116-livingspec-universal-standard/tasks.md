# Tasks: LivingSpec Universal Standard

## User Stories

- **US-001**: Core Specification Document
- **US-002**: JSON Schema Development  
- **US-003**: CLI Validator
- **US-004**: Documentation & Guides
- **US-005**: Publication Infrastructure

---

### T-001: Write Core Specification Document
**User Story**: US-001
**Satisfies ACs**: AC-001
**Status**: [ ] pending

Create formal specification:
- Directory structure schema
- 6 document type definitions
- ID conventions and validation
- Status lifecycles
- Sync protocol
- AI context protocol

---

### T-002: Create Terminology Glossary
**User Story**: US-001
**Satisfies ACs**: AC-001
**Status**: [ ] pending

Define: Living Documentation, Work Unit, Sync Provider, Context Manifest

---

### T-003: Develop manifest.yaml Schema
**User Story**: US-002
**Satisfies ACs**: AC-002
**Status**: [ ] pending

JSON Schema for project manifest.

---

### T-004: Develop FEATURE.md Schema
**User Story**: US-002
**Satisfies ACs**: AC-002
**Status**: [ ] pending

Required: id, title, status, owner. Optional: epic, priority, tags.

---

### T-005: Develop User Story Schema
**User Story**: US-002
**Satisfies ACs**: AC-002
**Status**: [ ] pending

Required: id, feature, title, status.

---

### T-006: Develop ADR Schema
**User Story**: US-002
**Satisfies ACs**: AC-002
**Status**: [ ] pending

Required: id, title, status, date.

---

### T-007: Develop MODULE.md Schema
**User Story**: US-002
**Satisfies ACs**: AC-002
**Status**: [ ] pending

Required: id, title, type, owner.

---

### T-008: Develop Work Unit Schema
**User Story**: US-002
**Satisfies ACs**: AC-002
**Status**: [ ] pending

Required: id, title, type, status, project.

---

### T-009: Build CLI Validator Core
**User Story**: US-003
**Satisfies ACs**: AC-004
**Status**: [ ] pending

```bash
livingspec validate .
livingspec validate --json
```

---

### T-010: Add CLI Init Command
**User Story**: US-003
**Satisfies ACs**: AC-004
**Status**: [ ] pending

```bash
livingspec init
livingspec init --with-examples
```

---

### T-011: Write Quick-Start Guide
**User Story**: US-004
**Satisfies ACs**: AC-003
**Status**: [ ] pending

5-minute guide: install, init, create spec, validate.

---

### T-012: Write Migration Guide - Confluence
**User Story**: US-004
**Satisfies ACs**: AC-006
**Status**: [ ] pending

Export, mapping, conversion steps.

---

### T-013: Write Migration Guide - Notion
**User Story**: US-004
**Satisfies ACs**: AC-006
**Status**: [ ] pending

Export, database conversion, link preservation.

---

### T-014: Create GitHub Repository
**User Story**: US-005
**Satisfies ACs**: AC-005
**Status**: [ ] pending

Set up livingspec/specification repo structure.

---

### T-015: Create Landing Page
**User Story**: US-005
**Satisfies ACs**: AC-005
**Status**: [ ] pending

Simple site: value prop, examples, links.

---

### T-016: VS Code Schema Integration
**User Story**: US-002
**Satisfies ACs**: AC-002
**Status**: [ ] pending

Configure yaml.schemas associations.

---

## Summary

| US | Tasks | Done |
|----|-------|------|
| US-001 | T-001, T-002 | 0/2 |
| US-002 | T-003-T-008, T-016 | 0/7 |
| US-003 | T-009, T-010 | 0/2 |
| US-004 | T-011-T-013 | 0/3 |
| US-005 | T-014, T-015 | 0/2 |

**Total**: 0/16 tasks
