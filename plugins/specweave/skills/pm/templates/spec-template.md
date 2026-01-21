# Spec Template

Copy and customize this template for new increments.

```markdown
---
increment: ####-feature-name
title: "Feature Title"
status: active
priority: P0
type: feature
created: YYYY-MM-DD
---

# Feature Title

## Problem Statement

[Describe the problem this feature solves. Be specific about the pain point.]

## Goals

- [Primary goal]
- [Secondary goal]
- [Measurable outcome]

## User Stories

### US-001: [First User Story Title]
**Project**: [project-name]
**As a** [user role]
**I want** [capability/action]
**So that** [benefit/value]

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Given [precondition], when [action], then [expected result]
- [ ] **AC-US1-02**: [Another criterion]
- [ ] **AC-US1-03**: [Edge case handling]

### US-002: [Second User Story Title]
**Project**: [project-name]
**As a** [user role]
**I want** [capability/action]
**So that** [benefit/value]

**Acceptance Criteria**:
- [ ] **AC-US2-01**: [Criterion]
- [ ] **AC-US2-02**: [Criterion]

### US-003: [Third User Story Title]
**Project**: [project-name]
**As a** [user role]
**I want** [capability/action]
**So that** [benefit/value]

**Acceptance Criteria**:
- [ ] **AC-US3-01**: [Criterion]
- [ ] **AC-US3-02**: [Criterion]

## Out of Scope

- [What this feature explicitly does NOT include]
- [Features to be addressed in future increments]
- [Technical limitations accepted for MVP]

## Technical Notes

### Dependencies
- [External service/API]
- [Internal module]

### Constraints
- [Performance requirement]
- [Security consideration]

### Architecture Decisions
- [Key design choice and rationale]

## Success Metrics

- [Metric 1]: [Target value]
- [Metric 2]: [Target value]
- [Qualitative success criteria]
```

## Guidelines

### User Story Sizing
- **Small**: 1-2 tasks, 1-2 days
- **Medium**: 3-5 tasks, 3-5 days
- **Large**: 6+ tasks - consider splitting

### Acceptance Criteria Count
- Minimum: 2 per user story
- Maximum: 5 per user story
- If more needed, split the user story

### AC ID Format
```
AC-US{story_number}-{criterion_number}

Examples:
- AC-US1-01 (User Story 1, Criterion 1)
- AC-US2-03 (User Story 2, Criterion 3)
- AC-US10-01 (User Story 10, Criterion 1)
```

### Priority Levels
- **P0**: Critical, blocks release
- **P1**: Important, should be in release
- **P2**: Nice to have, can defer
