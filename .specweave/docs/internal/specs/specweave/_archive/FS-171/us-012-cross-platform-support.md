---
id: US-012
feature: FS-171
title: "Cross-Platform Support"
status: completed
priority: high
created: 2026-01-18
project: specweave
---

# US-012: Cross-Platform Support

**Feature**: [FS-171](./FEATURE.md)

**As a** Windows developer,
**I want** lazy loading to work without Git Bash,
**So that** I can use SpecWeave on any Windows setup.

---

## Acceptance Criteria

- [x] **AC-US12-01**: PowerShell script available as Windows alternative
- [x] **AC-US12-02**: Auto-detection of available shell (Bash > PowerShell)
- [x] **AC-US12-03**: Same functionality in both Bash and PowerShell versions
- [x] **AC-US12-04**: Windows long path support (>260 chars)
- [x] **AC-US12-05**: Documented Windows-specific setup instructions

---

## Implementation

**Increment**: [0171-lazy-plugin-loading](../../../../increments/0171-lazy-plugin-loading/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-043**: Create PowerShell Installation Script
- [x] **T-044**: Implement Shell Auto-Detection
- [x] **T-045**: Add Windows Long Path Support
