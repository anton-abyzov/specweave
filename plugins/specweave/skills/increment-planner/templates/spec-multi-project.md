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
# MANDATORY: Must be RESOLVED values from "specweave context projects" output
# ⛔ NEVER use {{PROJECT_ID}} or {{BOARD_ID}} placeholders!
# For 2-level structures: BOTH project AND board are REQUIRED per US
project: {{RESOLVED_PROJECT}}
board: {{RESOLVED_BOARD}}
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
⚠️ MANDATORY RESOLUTION (v0.34.0+):
1. Run: specweave context projects
2. Parse JSON output:
   - level 1: projects[].id gives valid project IDs
   - level 2: projects[].id + boardsByProject[project][].id gives project AND board IDs
3. Replace ALL placeholders with actual IDs from step 2
4. Each US MUST have **Project**: (and **Board**: for 2-level) with RESOLVED values

❌ FORBIDDEN: Using {{PROJECT_ID}}, {{BOARD_ID}} placeholders
❌ FORBIDDEN: Inventing project/board names
✅ REQUIRED: Use ONLY IDs from "specweave context projects" output
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
