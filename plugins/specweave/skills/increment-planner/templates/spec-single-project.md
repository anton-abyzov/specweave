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
# NOTE: project: field REMOVED per ADR-0140 (v0.35.0+)
# Project is now resolved from per-US **Project**: fields or config.project.name
---

# Feature: {{FEATURE_TITLE}}

## Overview

[High-level description - WHAT this feature does and WHY it's needed]

## User Stories

<!--
📋 Per-US **Project**: field (v0.35.0+ - ADR-0140):
- In single-project mode: **Project**: can use config.project.name (auto-resolved)
- In multi-project mode: Each US MUST specify its **Project**: field
- Run: specweave context projects - to get valid project IDs
-->

### US-001: [Story Title] (P1)
**Project**: {{RESOLVED_PROJECT}}

**As a** [user type]
**I want** [goal]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] **AC-US1-01**: [Specific, testable criterion]
- [ ] **AC-US1-02**: [Another criterion]

### US-002: [Story Title] (P2)
**Project**: {{RESOLVED_PROJECT}}

[Repeat structure - change Project per US if spanning multiple projects]

## Functional Requirements

### FR-001: [Requirement]
[Detailed description]

## Success Criteria

[Measurable outcomes - metrics, KPIs]

## Out of Scope

[What this explicitly does NOT include]

## Dependencies

[Other features or systems this depends on]
