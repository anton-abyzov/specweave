---
increment: {{INCREMENT_ID}}
title: "{{FEATURE_TITLE}}"
type: {{TYPE}}
priority: {{PRIORITY}}
status: planned
created: {{DATE}}
structure: user-stories
test_mode: {{TEST_MODE}}
coverage_target: {{COVERAGE_TARGET}}
# NOTE: project:/board: fields REMOVED per ADR-0140 (v0.35.0+)
# Project and Board are now resolved from per-US **Project**: and **Board**: fields
multi_project: true
projects:
  - id: {{RESOLVED_PROJECT_FE}}
    prefix: FE
  - id: {{RESOLVED_PROJECT_BE}}
    prefix: BE
  - id: {{RESOLVED_PROJECT_SHARED}}
    prefix: SHARED
---

# Feature: {{FEATURE_TITLE}}

## Overview

[High-level description - WHAT this feature does and WHY it's needed]

## User Stories

<!--
⛔ MANDATORY: **Project**: and **Board**: fields on EVERY User Story (v0.35.0+)

BEFORE creating this file, you MUST:
1. Run: specweave context projects
2. Get project IDs and board IDs from output
3. Replace {{RESOLVED_PROJECT}} and {{RESOLVED_BOARD_*}} with actual values

DO NOT leave {{...}} placeholders in the final file!
DO NOT create User Stories without **Project**: field!
DO NOT create 2-level User Stories without **Board**: field!
-->

### Frontend Stories

#### US-FE-001: [Story Title] (P1)
**Project**: {{RESOLVED_PROJECT}}
**Board**: {{RESOLVED_BOARD_FE}}

**As a** [user type]
**I want** [goal]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] **AC-FE-US1-01**: [Specific, testable criterion]
- [ ] **AC-FE-US1-02**: [Another criterion]

---

### Backend Stories

#### US-BE-001: [Story Title] (P1)
**Project**: {{RESOLVED_PROJECT}}
**Board**: {{RESOLVED_BOARD_BE}}

**As a** [system/frontend application]
**I want** [API endpoint/service goal]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] **AC-BE-US1-01**: [API endpoint specification]
- [ ] **AC-BE-US1-02**: [Data validation rule]

---

### Shared Library Stories

#### US-SHARED-001: [Story Title] (P1)
**Project**: {{RESOLVED_PROJECT}}
**Board**: {{RESOLVED_BOARD_SHARED}}

**As a** developer in FE or BE repos
**I want** [shared types/utilities/validators]
**So that** [consistency across projects]

**Acceptance Criteria**:
- [ ] **AC-SHARED-US1-01**: [Type definition]
- [ ] **AC-SHARED-US1-02**: [Validator/utility function]

---

## Functional Requirements

### FR-001: [Requirement]
[Detailed description]

## Success Criteria

[Measurable outcomes - metrics, KPIs]

## Out of Scope

[What this explicitly does NOT include]

## Dependencies

[Other features or systems this depends on]
