---
id: FS-124
title: Fix spec-project-validator Hook Regex to Match All Increment Patterns
type: feature
status: completed
priority: P1
created: 2025-12-08
lastUpdated: 2025-12-11
external_tools:
  github:
    type: milestone
    id: 47
    url: https://github.com/anton-abyzov/specweave/milestone/47
---

# Fix spec-project-validator Hook Regex to Match All Increment Patterns

## Overview

The `spec-project-validator.sh` hook is not being triggered for some increment spec.md files because the `matcher_content` regex in `hooks.json` is too restrictive.

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0124-spec-project-validator-regex-fix](../../../../increments/0124-spec-project-validator-regex-fix/spec.md) | ✅ completed | 2025-12-08 |

## User Stories

- [US-001: Fix Regex to Match All Increment Patterns (P1)](../../specweave/FS-124/us-001-fix-regex-to-match-all-increment-patterns-p1-.md)
- [US-002: Ensure JIRA Board Detection Works for 2-Level (P1)](../../specweave/FS-124/us-002-ensure-jira-board-detection-works-for-2-level-p1-.md)
