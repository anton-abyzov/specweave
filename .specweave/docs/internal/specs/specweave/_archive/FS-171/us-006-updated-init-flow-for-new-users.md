---
id: US-006
feature: FS-171
title: "Updated Init Flow for New Users"
status: completed
priority: high
created: 2026-01-18
project: specweave
---

# US-006: Updated Init Flow for New Users

**Feature**: [FS-171](./FEATURE.md)

**As a** new SpecWeave user,
**I want** `specweave init` to default to lazy loading mode,
**So that** I start with optimized token usage.

---

## Acceptance Criteria

- [x] **AC-US6-01**: `specweave init` installs router skill by default
- [x] **AC-US6-02**: Full plugins cached at `~/.specweave/skills-cache/`
- [x] **AC-US6-03**: User informed about lazy loading behavior during init
- [x] **AC-US6-04**: `specweave init --full` option for traditional full install
- [x] **AC-US6-05**: Init completion message explains how lazy loading works

---

## Implementation

**Increment**: [0171-lazy-plugin-loading](../../../../increments/0171-lazy-plugin-loading/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-020**: Update Init Command for Lazy Default
- [x] **T-021**: Add --full Flag to Init
- [x] **T-022**: Add Lazy Loading Explanation to Init Output
- [x] **T-036**: Write E2E Tests for Full Flow
- [x] **T-038**: Update README Documentation
- [x] **T-039**: Update CLAUDE.md Instructions
