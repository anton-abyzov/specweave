# ADR-0180: Smart Pagination During Init (50-Project Limit)

---
**⚠️ SUPERSEDED**: This ADR has been superseded.

**See instead**: [ADR-0052: CLI-First Defaults and Smart Pagination](./0052-cli-first-defaults-and-smart-pagination.md)

**Date Superseded**: 2025-11-26
**Reason**: Consolidated with ADR-0052 which covers both CLI-first defaults AND smart pagination comprehensively.
---

## Original Content (Archived)

**Date**: 2025-11-21
**Status**: Superseded

## Context

Large JIRA/ADO instances have 100-500+ projects. Current `specweave init` behavior:
- Fetches ALL projects immediately
- No pagination or limits
- Takes 2-5 minutes for 100+ projects
- Frequent timeout errors (network, API rate limits)
- Poor user experience (long waits before they can start)

## Decision

See [ADR-0052](./0052-cli-first-defaults-and-smart-pagination.md) for the comprehensive decision covering:
- Smart pagination with 50-project initial limit
- CLI-first defaults
- Upfront strategy choice
- Progress tracking integration

## Related

- **Canonical ADR**: [ADR-0052: CLI-First Defaults and Smart Pagination](./0052-cli-first-defaults-and-smart-pagination.md)
- **Also Superseded**: [ADR-0181: Smart Pagination](./0181-smart-pagination.md)
