---
id: US-001
feature: FS-123
title: Human-Readable ADR Names
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 862
    url: https://github.com/anton-abyzov/specweave/issues/862
---

# US-001: Human-Readable ADR Names

**Feature**: [FS-123](./FEATURE.md)

**As a** developer onboarding to a new codebase
**I want** ADRs to have descriptive titles like `0015-use-event-driven-architecture.md`
**So that** I can quickly understand what decisions were made without reading each file

---

## Acceptance Criteria

- [x] **AC-US1-01**: ADR filenames follow format `XXXX-kebab-case-title.md` (not `DETECTED-XXXX.md`)
- [x] **AC-US1-02**: Title is derived from detected pattern context via LLM summarization
- [x] **AC-US1-03**: Title captures the "what" not just the pattern name (e.g., "adopt-cqrs-for-write-operations" not "use-cqrs")
- [x] **AC-US1-04**: Existing DETECTED-* files are not regenerated (only new generations use new format)

---

## Implementation

**Increment**: [0123-intelligent-living-docs-content](../../../../increments/0123-intelligent-living-docs-content/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Add deriveADRTitle Function
- [x] **T-002**: Update ADR ID Generation
