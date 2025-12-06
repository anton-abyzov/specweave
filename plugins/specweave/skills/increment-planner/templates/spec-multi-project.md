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
default_project: {{PROJECT_ID}}
default_board: {{BOARD_ID}}
multi_project: true
projects:
  - id: {{PROJECT_FE_ID}}
    prefix: FE
  - id: {{PROJECT_BE_ID}}
    prefix: BE
  - id: {{PROJECT_SHARED_ID}}
    prefix: SHARED
---

# Feature: {{FEATURE_TITLE}}

## Overview

[High-level description - WHAT this feature does and WHY it's needed]

## User Stories

<!-- Each US has its own **Project** and **Board** fields. User can modify per-US anytime. -->

### Frontend Stories

#### US-FE-001: [Story Title] (P1)
**Project**: {{PROJECT_ID}}
**Board**: {{BOARD_FE_ID}}

**As a** [user type]
**I want** [goal]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] **AC-FE-US1-01**: [Specific, testable criterion]
- [ ] **AC-FE-US1-02**: [Another criterion]

---

### Backend Stories

#### US-BE-001: [Story Title] (P1)
**Project**: {{PROJECT_ID}}
**Board**: {{BOARD_BE_ID}}

**As a** [system/frontend application]
**I want** [API endpoint/service goal]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] **AC-BE-US1-01**: [API endpoint specification]
- [ ] **AC-BE-US1-02**: [Data validation rule]

---

### Shared Library Stories

#### US-SHARED-001: [Story Title] (P1)
**Project**: {{PROJECT_ID}}
**Board**: {{BOARD_SHARED_ID}}

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
