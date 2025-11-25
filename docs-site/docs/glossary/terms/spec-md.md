---
id: spec-md
title: spec.md (Specification File)
sidebar_label: spec.md
---

# spec.md (Specification File)

The **spec.md** file is the primary specification document in a SpecWeave [increment](/docs/glossary/terms/increments), containing requirements, [user stories](/docs/glossary/terms/user-stories), and [acceptance criteria](/docs/glossary/terms/acceptance-criteria).

## Purpose

**spec.md answers: "WHAT and WHY?"**

- What are we building?
- Why are we building it?
- Who is it for?
- What defines "done"?

## Location

```
.specweave/increments/0001-user-authentication/
├── spec.md         ← Specification (WHAT/WHY)
├── plan.md         ← Architecture (HOW)
├── tasks.md        ← Implementation checklist
└── metadata.json
```

## Structure

```markdown
---
increment: 0001-user-authentication
feature_id: FS-001
status: active
---

# Increment 0001: User Authentication

## Overview
Brief description of what this increment delivers and why.

## User Stories

### US-001: User Login
**As a** registered user
**I want to** log in with my credentials
**So that** I can access my account

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Valid credentials → redirect to dashboard (P1, testable)
- [ ] **AC-US1-02**: Invalid credentials → error message (P1, testable)
- [ ] **AC-US1-03**: Remember me checkbox works (P2, testable)

### US-002: Password Reset
...

## Out of Scope
- ❌ Social login (future increment)
- ❌ Biometric authentication

## Success Criteria
- All P1 acceptance criteria met
- 80%+ test coverage
- No critical security vulnerabilities
```

## Key Elements

### YAML Frontmatter
```yaml
---
increment: 0001-user-authentication  # Required
feature_id: FS-001                   # Optional, links to living docs
status: active                       # auto-managed
---
```

### User Stories
Follow the format:
```markdown
### US-XXX: Story Title
**As a** [user role]
**I want to** [action]
**So that** [benefit]
```

### Acceptance Criteria with AC-IDs
```markdown
- [ ] **AC-US1-01**: Description (Priority, testability)
```

**AC-ID format**: `AC-US{story}-{number}` (e.g., AC-US1-01)

### Priority Labels
- **P1** - Must-have for this increment
- **P2** - Nice-to-have
- **P3** - Future enhancement

## Relationship to Other Files

| File | Purpose | Who Creates |
|------|---------|-------------|
| **spec.md** | Requirements (WHAT/WHY) | [PM Agent](/docs/glossary/terms/pm-agent) |
| plan.md | Architecture (HOW) | [Architect Agent](/docs/glossary/terms/architect-agent) |
| tasks.md | Implementation checklist | Test-Aware Planner |

## Best Practices

✅ **DO:**
- Keep user stories focused (one feature per story)
- Make acceptance criteria testable
- Document out-of-scope items
- Use consistent AC-ID format

❌ **DON'T:**
- Mix HOW with WHAT (that goes in plan.md)
- Create vague acceptance criteria
- Forget to mark criteria as P1/P2

## Related

- [Increments](/docs/glossary/terms/increments) - Contains spec.md
- [User Stories](/docs/glossary/terms/user-stories) - Format for requirements
- [AC-ID](/docs/glossary/terms/ac-id) - Traceability identifiers
- [PM Agent](/docs/glossary/terms/pm-agent) - Creates spec.md
