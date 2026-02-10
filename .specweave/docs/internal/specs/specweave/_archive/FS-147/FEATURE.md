---
id: FS-147
title: Eliminate Duplicate Prompts in GitHub + GitHub Issues Init Flow
type: feature
status: completed
priority: P1
created: 2026-01-14
lastUpdated: 2026-01-14
external_tools:
  github:
    type: milestone
    id: 69
    url: https://github.com/anton-abyzov/specweave/milestone/69
---

# Eliminate Duplicate Prompts in GitHub + GitHub Issues Init Flow

## Overview

When users select GitHub for repositories AND GitHub Issues for issue tracking during `specweave init`, they are currently asked the same repository configuration questions TWICE:

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0147-github-init-duplicate-prompts-elimination](../../../../increments/0147-github-init-duplicate-prompts-elimination/spec.md) | ✅ completed | 2026-01-14 |

## User Stories

- [US-001: Pass GitHub Repository Selection Through Init Workflow](./us-001-pass-github-repository-selection-through-init-workflow.md)
- [US-002: Skip Duplicate Prompts When GitHub Data Available](./us-002-skip-duplicate-prompts-when-github-data-available.md)
- [US-003: Parent Repository Selection for Multi-Repo GitHub Issues](./us-003-parent-repository-selection-for-multi-repo-github-issues.md)
