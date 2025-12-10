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
# MANDATORY: Must be a RESOLVED value from "specweave context projects" output
# ⛔ NEVER use {{PROJECT_ID}} placeholder - always resolve BEFORE creating spec.md!
project: {{RESOLVED_PROJECT}}
---

# Feature: {{FEATURE_TITLE}}

## Overview

[High-level description - WHAT this feature does and WHY it's needed]

## User Stories

<!--
⚠️ MANDATORY RESOLUTION (v0.34.0+):
1. Run: specweave context projects
2. Parse JSON: projects[].id gives valid project IDs
3. Replace {{RESOLVED_PROJECT}} with actual ID from step 2
4. Each US MUST have **Project**: field with RESOLVED value

❌ FORBIDDEN: Using {{PROJECT_ID}} placeholder
❌ FORBIDDEN: Inventing project names
✅ REQUIRED: Use ONLY IDs from "specweave context projects" output
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
