# ADR-0181: Smart Pagination (50-Project Limit)

---
**⚠️ SUPERSEDED**: This ADR has been superseded.

**See instead**: [ADR-0052: CLI-First Defaults and Smart Pagination](./0052-cli-first-defaults-and-smart-pagination)

**Date Superseded**: 2025-11-26
**Reason**: Consolidated with ADR-0052 which covers both CLI-first defaults AND smart pagination comprehensively.
---

## Original Content (Archived)

**Date**: 2025-11-21
**Status**: Superseded

## Context

SpecWeave's current initialization flow for external tools (JIRA, Azure DevOps) fetches all projects at once without pagination, causing timeout errors and poor UX.

## Decision

See [ADR-0052](./0052-cli-first-defaults-and-smart-pagination) for the comprehensive decision covering:
- Phase-based loading (count check → initial load → async fetch)
- 50-project limit during init
- Batch fetching strategy
- Configuration options

## Related

- **Canonical ADR**: [ADR-0052: CLI-First Defaults and Smart Pagination](./0052-cli-first-defaults-and-smart-pagination)
- **Also Superseded**: [ADR-0180: Smart Pagination 50-Project Limit](./0180-smart-pagination-50-project-limit)
