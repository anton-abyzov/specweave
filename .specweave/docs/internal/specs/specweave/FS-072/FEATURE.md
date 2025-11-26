---
id: FS-072
title: "GitHub Status Reconciliation"
type: feature
status: in-progress
priority: P1
created: 2025-11-26
lastUpdated: 2025-11-26
---

# GitHub Status Reconciliation

## Overview

GitHub issues remain open even after increments are closed because:
1. The hook chain has silent failure points (no feature_id, gate checks, API errors)
2. No REOPEN logic exists when increments are resumed
3. No reconciliation mechanism to detect/fix drift

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0072-github-status-reconciliation](../../../../increments/0072-github-status-reconciliation/spec.md) | ⏳ in-progress | 2025-11-26 |

## User Stories

- [US-001: GitHub Status Reconciliation Command](../../specweave/FS-072/us-001-github-status-reconciliation-command.md)
- [US-002: Automatic Issue Reopen on Resume](../../specweave/FS-072/us-002-automatic-issue-reopen-on-resume.md)
- [US-003: Automatic Issue Close on Abandon](../../specweave/FS-072/us-003-automatic-issue-close-on-abandon.md)
- [US-004: Optional Auto-Reconcile on Session Start](../../specweave/FS-072/us-004-optional-auto-reconcile-on-session-start.md)
