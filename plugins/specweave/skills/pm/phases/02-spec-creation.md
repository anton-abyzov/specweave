# PM Phase 2: Spec Creation

## Spec File Location

```
.specweave/increments/####-name/spec.md
```

## Spec Structure

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
[Why does this feature exist? What problem does it solve?]

## Goals
- [Goal 1]
- [Goal 2]

## User Stories

### US-001: [Title]
**Project**: [project-name]
**As a** [role]
**I want** [capability]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Given [precondition], when [action], then [single expected result]
- [ ] **AC-US1-02**: [Another criterion — BDD format, no "or" conditions]

### US-002: [Title]
...

## Out of Scope
- [What this feature does NOT include]

## Non-Functional Requirements
- **Performance**: [Measurable target with units]
- **Security**: [Relevant security considerations]
- **Compatibility**: [Platform/browser/OS constraints]

## Edge Cases
- [Boundary condition]: [Expected behavior]
- [Error state]: [Expected behavior]
- [Unusual scenario]: [Expected behavior]

## Risks
| Risk | Probability | Impact | Severity | Mitigation |
|------|-------------|--------|----------|------------|
| [Risk] | [0.0-1.0] | [1-10] | [P×I] | [Strategy] |

## Technical Notes
[Any technical context that helps implementation]

## Success Metrics
[How will we know this feature is successful? Use measurable targets.]
```

## Chunking Large Specs

**If spec has 6+ user stories, CHUNK IT:**

### Chunk 1: Frontmatter + US-001 to US-003
```markdown
Write frontmatter and first 3 user stories.
Stop and report progress.
```

### Chunk 2: US-004 to US-006
```markdown
Edit spec.md to append remaining user stories.
Report completion.
```

## Multi-Project Story Assignment

Every user story MUST have exactly one `**Project**:` field — no exceptions, no conditional logic.

1. **Decompose by repo ownership**: Each user story targets ONE repo via `**Project**:`
2. **Cross-cutting features**: Split into separate stories per repo (e.g., frontend UI + backend API)
3. **Use prefixed IDs**: When multiple repos are involved, use `US-FE-001`, `US-BE-001` — prefix from `specweave context projects`
4. **Shared/infra work**: Set `**Project**:` to the workspace name
5. **Single-project workspaces**: All stories get `**Project**: <workspace.name>` (auto-resolved)

**Example split for "user login" (multi-repo):**
- `US-FE-001: Login Page` → `**Project**: frontend`
- `US-BE-001: Auth API Endpoint` → `**Project**: backend`
- `US-BE-002: JWT Token Service` → `**Project**: backend`

**Single-project:** All stories get the same `**Project**: <project-name>`.

## User Story Guidelines

### Good User Story
- **Specific**: Clear, testable outcome
- **Independent**: Can be implemented alone
- **Valuable**: Delivers user value
- **Estimable**: Can estimate effort
- **Small**: Fits in one increment

### Acceptance Criteria Format

```markdown
- [ ] **AC-US1-01**: Given [precondition], when [action], then [result]
```

- **ALWAYS use BDD format** (Given/When/Then) — not optional
- **No "or" conditions** — each AC must have a single, unambiguous expected outcome
  - Bad: "button is disabled or hidden" — pick ONE
  - Good: "button has the disabled attribute"
- **Measurable outcomes** — use concrete values, not subjective descriptions
  - Bad: "appears visually dimmed"
  - Good: "text has opacity 0.7"
- **One assertion per AC** — if verifying multiple things, split into separate ACs
- Include edge cases
- 2-5 criteria per user story

## Output After Spec Creation

```markdown
✅ spec.md created

**Summary**:
- User Stories: [N]
- Acceptance Criteria: [N]
- Priority: [P0/P1/P2]

**Next**: Ready to invoke Architect for plan.md?
```

## Token Budget: 400-600 tokens per chunk
