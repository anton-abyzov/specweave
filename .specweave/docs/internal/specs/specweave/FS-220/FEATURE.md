---
id: FS-220
title: Decouple docs-site scripts from root package.json
type: feature
status: completed
priority: P1
created: 2026-02-15T00:00:00.000Z
lastUpdated: 2026-02-16
tldr: Remove 5 `docs:*` convenience scripts from root `package.
complexity: medium
stakeholder_relevant: true
external_tools:
  github:
    type: milestone
    id: 101
    url: https://github.com/anton-abyzov/specweave/milestone/101
---

# Decouple docs-site scripts from root package.json

## TL;DR

**What**: Remove 5 `docs:*` convenience scripts from root `package.
**Status**: completed | **Priority**: P1
**User Stories**: 2

## Overview

Remove 5 `docs:*` convenience scripts from root `package.json` that couple `docs-site/` (SpecWeave product website) to the main project. Update CONTRIBUTING.md to reference `specweave docs` CLI instead. Prerequisite for 0219-multi-repo-migrate.

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0220-docs-site-cleanup](../../../../../increments/0220-docs-site-cleanup/spec.md) | ✅ completed | 2026-02-15T00:00:00.000Z |

## User Stories

- [US-001: Remove docs scripts from root package.json (P0)](./us-001-remove-docs-scripts-from-root-package-json-p0-.md)
- [US-002: Update documentation references (P0)](./us-002-update-documentation-references-p0-.md)
