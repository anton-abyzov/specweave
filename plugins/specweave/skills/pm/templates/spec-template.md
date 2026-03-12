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

## Non-Functional Requirements

- **Performance**: [Measurable target, e.g., "Scanner classifies 500 skills in < 100ms"]
- **Accessibility**: [Requirements if UI-facing, e.g., "All interactive elements keyboard-navigable"]
- **Security**: [Relevant security considerations, e.g., "No user input reaches path resolution unsanitized"]
- **Compatibility**: [Platform/browser/OS constraints, e.g., "Works on Windows, macOS, Linux path formats"]

## Edge Cases

- [Edge case 1]: [Expected behavior, e.g., "Empty input returns empty result set"]
- [Edge case 2]: [Expected behavior, e.g., "Symlinked directories resolve to their target path"]
- [Edge case 3]: [Expected behavior, e.g., "Case-insensitive filesystem matching on macOS/Windows"]

## Risks

| Risk | Probability | Impact | Severity | Mitigation |
|------|-------------|--------|----------|------------|
| [Risk description] | [0.0-1.0] | [1-10] | [P×I score] | [Strategy] |
| [Risk description] | [0.0-1.0] | [1-10] | [P×I score] | [Strategy] |

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

### AC Quality Rules (MANDATORY)

**Every AC must be unambiguous and single-outcome:**

- **No "or" conditions**: "disabled or hidden" is ambiguous — pick ONE expected behavior
  - Bad: `AC-US1-01: Button is disabled or hidden`
  - Good: `AC-US1-01: Button has the disabled attribute and shows tooltip "Not available"`
- **Measurable outcomes**: Use concrete values, not subjective descriptions
  - Bad: `AC-US1-01: Card appears visually dimmed`
  - Good: `AC-US1-01: Card text has opacity 0.7 and uses var(--text-tertiary) color`
- **BDD format preferred**: `Given [precondition], when [action], then [single expected result]`
- **One assertion per AC**: If you need to verify multiple things, split into separate ACs
- **No subjective verbs**: Avoid "looks good", "is clear", "feels responsive" — use testable criteria

### Mandatory Spec Sections

Every spec.md MUST include these sections (QA scoring penalizes missing sections):

1. **Problem Statement** — why this exists
2. **Goals** — what success looks like
3. **User Stories** — with ACs in BDD format
4. **Out of Scope** — explicit boundaries
5. **Non-Functional Requirements** — performance, security, accessibility, compatibility
6. **Edge Cases** — boundary conditions, error states, unusual scenarios
7. **Risks** — P×I scored risk table with mitigations
8. **Technical Notes** — dependencies, constraints, architecture decisions
9. **Success Metrics** — measurable outcomes
