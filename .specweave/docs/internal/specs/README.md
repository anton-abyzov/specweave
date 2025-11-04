# Specifications (Specs)

**Purpose**: Detailed technical specifications for features, integrations, and architectural changes.

**When to Create a Spec**:
- Complex feature requiring team alignment
- External integrations (JIRA, GitHub, Azure DevOps, etc.)
- Breaking changes or migrations
- Cross-cutting concerns affecting multiple increments

**Spec Lifecycle**:
1. **Draft** - Proposal written, seeking feedback
2. **Under Review** - Team reviewing, discussing
3. **Accepted** - Approved for implementation
4. **Implemented** - Code complete, linked to increment
5. **Superseded** - Replaced by newer spec

---

## Active Specs

| Spec | Title | Status | Increment | Created |
|------|-------|--------|-----------|---------|
| [SPEC-0003](spec-0003-specweave-test-test-epic-for-sync.md) | Test Epic for Sync | Implemented | 0004 | 2025-10-30 |
| [SPEC-0005](spec-0005-authentication-features.md) | Authentication Features | Draft | TBD | 2025-10-30 |
| [SPEC-0007](spec-0007-smart-increment-discipline.md) | Smart Increment Discipline System | Draft | 0007 | 2025-11-03 |

---

## Spec Template

Use this template when creating new specs:

```markdown
# SPEC-XXXX: Title

**Status**: Draft | Under Review | Accepted | Implemented | Superseded
**Created**: YYYY-MM-DD
**Author**: Name
**Increment**: XXXX-name (if applicable)

## Problem Statement

What problem does this solve?

## Proposed Solution

How do we solve it?

## Alternatives Considered

What other options were explored?

## Implementation Plan

How will this be built?

## Success Criteria

How do we know it's working?

## References

- Related ADRs
- External docs
- Related increments
```

---

## Naming Convention

**Format**: `spec-XXXX-descriptive-kebab-case-name.md`

**Examples**:
- ✅ `spec-0003-specweave-test-test-epic-for-sync.md`
- ✅ `spec-0005-authentication-features.md`
- ✅ `spec-0006-github-task-level-sync.md`

**Numbering**: Sequential, zero-padded 4 digits (0001, 0002, 0003, ...)

---

## Related Documentation

- [Architecture Decision Records (ADRs)](../architecture/adr/README.md) - What we decided and why
- [System Architecture Diagrams](../architecture/diagrams/README.md) - Visual architecture
- [High-Level Design](../architecture/hld-system.md) - System overview and entry point

---

**Terminology Note**: Renamed to "Spec" (Specification) in v0.8.0 to align with SpecWeave brand and industry standard (Microsoft, Uber, Meta all use "spec").

**Location**: `.specweave/docs/internal/specs/`
**Last Updated**: 2025-11-04
**Maintainer**: SpecWeave Core Team
