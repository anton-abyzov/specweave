---
id: US-001
feature: FS-051
title: "Architect Agent Uses Progressive Disclosure (Priority: P0)"
status: completed
priority: P0
created: 2025-11-21T00:00:00.000Z
---

**Origin**: 🏠 **Internal**


# US-001: Architect Agent Uses Progressive Disclosure (Priority: P0)

**Feature**: [FS-051](../../_features/FS-051/FEATURE.md)

**As a** developer using SpecWeave architect agent
**I want** the agent to load only relevant expertise
**So that** it doesn't crash on complex architecture tasks

---

## Acceptance Criteria

- [x] **AC-US1-01**: Architect agent prompt reduced from 36KB → ≤20KB
- [x] **AC-US1-02**: Serverless knowledge removed from architect (delegates to skill)
- [x] **AC-US1-03**: Compliance knowledge extracted to compliance-architecture skill
- [x] **AC-US1-04**: Architect adds delegation pattern to prompt

---

## Implementation

**Increment**: [0051-progressive-disclosure-refactoring](../../../../increments/0051-progressive-disclosure-refactoring/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-006](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-006): Verify Architect Agent Current State
- [x] [T-007](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-007): Remove Compliance Section from Architect Agent
- [x] [T-008](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-008): Add Response Token Limit to Architect YAML
- [x] [T-009](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-009): Document Architect Delegation Pattern
- [x] [T-010](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-010): Document Chunked Execution Pattern for Architect
- [x] [T-011](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-011): Create Compliance Architecture Skill Directory
- [x] [T-012](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-012): Write Compliance Skill YAML Frontmatter
- [x] [T-013](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-013): Extract SOC 2 Compliance Knowledge
- [x] [T-014](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-014): Extract HIPAA Compliance Knowledge
- [x] [T-015](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-015): Extract GDPR and PCI-DSS Compliance Knowledge
- [x] [T-016](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-016): Update Architect Agent Delegation References
- [x] [T-018](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-018): Test AC-US1-01 - Architect Prompt Size
- [x] [T-019](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-019): Test AC-US1-02 - Serverless Delegation
- [x] [T-020](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-020): Test AC-US1-03 - Compliance Extraction
- [x] [T-021](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-021): Test AC-US1-04 - Delegation Pattern
- [x] [T-025](../../../../increments/0051-progressive-disclosure-refactoring/tasks.md#T-025): Collect Architect Agent Metrics