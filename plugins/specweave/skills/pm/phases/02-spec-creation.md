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
- [ ] **AC-US1-01**: [Criterion]
- [ ] **AC-US1-02**: [Criterion]

### US-002: [Title]
...

## Out of Scope
- [What this feature does NOT include]

## Technical Notes
[Any technical context that helps implementation]

## Success Metrics
[How will we know this feature is successful?]
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

## Umbrella Mode: Multi-Project Story Assignment

When the increment uses **umbrella mode** (args contain "UMBRELLA MODE" with child repo list):

1. **Decompose by repo ownership**: Each user story targets ONE child repo via `**Project**:`
2. **Cross-cutting features**: Split into separate stories per repo (e.g., frontend UI + backend API)
3. **Use prefixed IDs**: `US-FE-001`, `US-BE-002` — prefix from `specweave context projects`
4. **Shared/infra work**: Set `**Project**:` to the umbrella project name
5. **Every US must have exactly one `**Project**:`** — never omit, never assign multiple

**Example split for "user login":**
- `US-FE-001: Login Page` → `**Project**: frontend`
- `US-BE-001: Auth API Endpoint` → `**Project**: backend`
- `US-BE-002: JWT Token Service` → `**Project**: backend`

When NOT in umbrella mode, all stories get the same `**Project**: <project-name>`.

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

- Use BDD format where possible
- Make criteria testable
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
