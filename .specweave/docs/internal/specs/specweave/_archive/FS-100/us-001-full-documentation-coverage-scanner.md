---
id: US-001
feature: FS-100
title: "Full Documentation Coverage Scanner"
status: completed
priority: P1
created: 2025-12-04
---

# US-001: Full Documentation Coverage Scanner

**Feature**: [FS-100](./FEATURE.md)

**As a** developer
**I want** the living docs builder to scan all documentation folders (specs, architecture, ADRs, governance)
**So that** I get a complete picture of documentation health across the entire codebase

---

## Acceptance Criteria

- [x] **AC-US1-01**: Scanner discovers all `.specweave/docs/internal/` subdirectories
- [x] **AC-US1-02**: Scans `specs/` for feature specifications and user stories
- [x] **AC-US1-03**: Scans `architecture/adr/` for Architecture Decision Records
- [x] **AC-US1-04**: Scans `governance/` for coding standards and conventions
- [x] **AC-US1-05**: Report shows document counts per category

---

## Implementation

**Increment**: [0100-enterprise-living-docs](../../../../increments/0100-enterprise-living-docs/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Implement Documentation Folder Scanner
