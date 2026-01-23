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
# NOTE: project:/board: fields REMOVED per ADR-0140
# Project resolved from per-US **Project**: fields
# Board resolved from per-US **Board**: fields (2-LEVEL ONLY!)
multi_project: true
projects:
  - id: {{RESOLVED_PROJECT_1}}
    prefix: {{PREFIX_1}}
  - id: {{RESOLVED_PROJECT_2}}
    prefix: {{PREFIX_2}}
  - id: {{RESOLVED_PROJECT_3}}
    prefix: {{PREFIX_3}}
---

# Feature: {{FEATURE_TITLE}}

## Overview

[High-level description - WHAT this feature does and WHY it's needed]

## User Stories

<!--
⛔ STRUCTURE-LEVEL DETECTION IS CRITICAL!

BEFORE using this template, run: specweave context projects

IF level: 1 (GitHub, multi-repo):
  ✅ Use **Project**: field on each US
  ❌ Do NOT add **Board**: field!

IF level: 2 (ADO area paths, JIRA boards, multi-team umbrella):
  ✅ Use **Project**: AND **Board**: fields on each US

Replace {{RESOLVED_PROJECT_*}} with actual project IDs from context output.
For 2-level ONLY: also replace {{RESOLVED_BOARD_*}} placeholders.

DO NOT leave {{...}} placeholders in the final file!
-->

### {{PREFIX_1}} Service Stories

#### US-{{PREFIX_1}}-001: [Story Title] (P1)
**Project**: {{RESOLVED_PROJECT_1}}

**As a** [user type]
**I want** [goal]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] **AC-{{PREFIX_1}}-US1-01**: [Specific, testable criterion]
- [ ] **AC-{{PREFIX_1}}-US1-02**: [Another criterion]

---

### {{PREFIX_2}} Service Stories

#### US-{{PREFIX_2}}-001: [Story Title] (P1)
**Project**: {{RESOLVED_PROJECT_2}}

**As a** [system/frontend application]
**I want** [API endpoint/service goal]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] **AC-{{PREFIX_2}}-US1-01**: [API endpoint specification]
- [ ] **AC-{{PREFIX_2}}-US1-02**: [Data validation rule]

---

### {{PREFIX_3}} Service Stories

#### US-{{PREFIX_3}}-001: [Story Title] (P1)
**Project**: {{RESOLVED_PROJECT_3}}

**As a** developer
**I want** [shared types/utilities/validators]
**So that** [consistency across services]

**Acceptance Criteria**:
- [ ] **AC-{{PREFIX_3}}-US1-01**: [Type definition]
- [ ] **AC-{{PREFIX_3}}-US1-02**: [Validator/utility function]

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
