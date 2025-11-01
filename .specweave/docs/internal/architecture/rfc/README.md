# Request for Comments (RFCs)

**Purpose**: Detailed technical specifications for features, integrations, and architectural changes.

**When to Create an RFC**:
- Complex feature requiring team alignment
- External integrations (JIRA, GitHub, etc.)
- Breaking changes or migrations
- Cross-cutting concerns affecting multiple increments

**RFC Lifecycle**:
1. **Draft** - Proposal written, seeking feedback
2. **Under Review** - Team reviewing, discussing
3. **Accepted** - Approved for implementation
4. **Implemented** - Code complete, linked to increment
5. **Superseded** - Replaced by newer RFC

---

## Active RFCs

| RFC | Title | Status | Increment | Created |
|-----|-------|--------|-----------|---------|
| [RFC-0003](rfc-0003-specweave-test-test-epic-for-sync.md) | Test Epic for Sync | Implemented | 0004 | 2025-10-30 |
| [RFC-0005](rfc-0005-authentication-features.md) | Authentication Features | Draft | TBD | 2025-10-30 |

---

## RFC Template

Use this template when creating new RFCs:

```markdown
# RFC-XXXX: Title

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

**Format**: `rfc-XXXX-descriptive-kebab-case-name.md`

**Examples**:
- ✅ `rfc-0003-specweave-test-test-epic-for-sync.md`
- ✅ `rfc-0005-authentication-features.md`
- ✅ `rfc-0006-github-task-level-sync.md`

**Numbering**: Sequential, zero-padded 4 digits (0001, 0002, 0003, ...)

---

## Related Documentation

- [Architecture Decision Records (ADRs)](../adr/README.md) - What we decided and why
- [System Architecture Diagrams](../diagrams/README.md) - Visual architecture
- [High-Level Design](../hld-system.md) - System overview and entry point

---

**Location**: `.specweave/docs/internal/architecture/rfc/`
**Last Updated**: 2025-11-01
**Maintainer**: SpecWeave Core Team
