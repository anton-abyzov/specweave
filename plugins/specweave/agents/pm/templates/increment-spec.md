---
increment: {number}-{name}
title: "{Feature Title}"
implements: SPEC-{spec-number}-{spec-name}
priority: P1
status: planning
created: {YYYY-MM-DD}
---

# Increment {number}: {Feature Title}

**Implements**: [SPEC-{spec-number}: {Feature Area}](../../docs/internal/specs/default/SPEC-{spec-number}-{spec-name}.md)

**Quick Overview**: {1-2 sentence summary of what THIS increment delivers}

---

## What We're Implementing (This Increment Only)

This increment implements the following user stories from [SPEC-{spec-number}](../../docs/internal/specs/default/SPEC-{spec-number}-{spec-name}.md):

- **US-001**: {User story title} ✅
- **US-002**: {User story title} ✅
- **US-003**: {User story title} ⏳

**Total**: {X}/{Y} user stories from SPEC-{spec-number}

**Rationale**: {Why these specific stories? Why now?}

---

## Out of Scope (For This Increment)

The following user stories from SPEC-{spec-number} are **NOT** in this increment:

- ❌ **US-004**: {User story title} → Deferred to Increment {next-number} ({reason})
- ❌ **US-005**: {User story title} → Deferred to Increment {next-number} ({reason})
- ❌ **US-006**: {User story title} → Not planned yet ({reason})

**Rationale**: {Why are these out of scope? Complexity? Dependencies? Resource constraints?}

---

## User Stories (Detailed)

### US-001: {User Story Title}

**As a** {user type}
**I want** {feature}
**So that** {benefit}

**Acceptance Criteria**:
- [ ] **AC-US1-01**: {Criterion description}
- [ ] **AC-US1-02**: {Criterion description}
- [ ] **AC-US1-03**: {Criterion description}

**Implementation Notes** (specific to THIS increment):
- {Technical approach for THIS iteration}
- {Key implementation details}
- {Dependencies or constraints}

**Tests**:
- Unit: `tests/unit/{feature}-us1.test.ts` (85% coverage target)
- Integration: `tests/integration/{feature}-us1.test.ts` (80% coverage target)
- E2E: `tests/e2e/{feature}-us1.spec.ts` (100% critical path)

---

### US-002: {User Story Title}

**As a** {user type}
**I want** {feature}
**So that** {benefit}

**Acceptance Criteria**:
- [ ] **AC-US2-01**: {Criterion description}
- [ ] **AC-US2-02**: {Criterion description}

**Implementation Notes**:
- {Technical approach}
- {Key details}

**Tests**:
- Unit: `tests/unit/{feature}-us2.test.ts`
- Integration: `tests/integration/{feature}-us2.test.ts`

---

### US-003: {User Story Title}

{Similar format...}

---

## Implementation Plan

See [plan.md](./plan.md) for detailed technical implementation steps.

**Key Technical Decisions**:
- {Decision 1 and rationale}
- {Decision 2 and rationale}
- {Decision 3 and rationale}

---

## Success Criteria (This Increment)

| Criterion | Target | Measurement | Status |
|-----------|--------|-------------|--------|
| User stories complete | {X}/{Y} (100%) | All acceptance criteria met | ⏳ |
| Test coverage | >80% | Jest + Playwright | ⏳ |
| Performance | <{X}ms | API response time | ⏳ |
| Zero critical bugs | 0 | Pre-launch testing | ⏳ |
| Documentation | 100% | All docs updated | ⏳ |

---

## Dependencies

**Technical Dependencies**:
- {Library/Service 1} - {Why needed}
- {Library/Service 2} - {Why needed}

**Increment Dependencies**:
- {Increment XXXX} must be complete before starting this increment
- {Reason for dependency}

**External Dependencies**:
- {External system/API} - {What's needed}
- {Third-party service} - {What's needed}

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| {Risk description} | High/Medium/Low | High/Medium/Low | {Mitigation strategy} |

---

## Related Documentation

**For complete feature specification**: [SPEC-{spec-number}: {Feature Area}](../../docs/internal/specs/default/SPEC-{spec-number}-{spec-name}.md)

**Architecture**: See SPEC-{spec-number} for links to architecture docs (NO duplication here!)

**External Tracking**:
- GitHub: Issue #{number}
- Jira: Story {story-key}
- Azure DevOps: User Story #{number}

---

**Status**: {Status}
**Created**: {YYYY-MM-DD}
**Started**: {YYYY-MM-DD}
**Completed**: {YYYY-MM-DD}
