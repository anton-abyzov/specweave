---
id: FS-126
title: GitHub/Bitbucket Multi-Repo Pattern Selection Parity with ADO
type: feature
status: completed
priority: P1
created: 2025-12-08
lastUpdated: 2025-12-11
external_tools:
  github:
    type: milestone
    id: 48
    url: https://github.com/anton-abyzov/specweave/milestone/48
---

# GitHub/Bitbucket Multi-Repo Pattern Selection Parity with ADO

## Overview

When selecting "multiple repos" in the init flow, ADO users get a nice pattern selection UI with 4 options:
- All (clone all repositories)
- Pattern (glob) - Match by pattern (e.g., "sw-*", "*-backend")
- Pattern (regex) - Regular expression (e.g., "^sw-.*$")
- Skip - Configure later

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0126-github-bitbucket-multirepo-pattern-parity](../../../../increments/0126-github-bitbucket-multirepo-pattern-parity/spec.md) | ✅ completed | 2025-12-08 |

## User Stories

- [US-001: GitHub Multi-Repo Pattern Selection](../../specweave/FS-126/us-001-github-multi-repo-pattern-selection.md)
- [US-002: Bitbucket Multi-Repo Pattern Selection](../../specweave/FS-126/us-002-bitbucket-multi-repo-pattern-selection.md)
