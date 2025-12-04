---
id: FS-101
title: "Judge LLM Command - Ad-hoc Work Validation"
type: feature
status: completed
priority: P2
created: 2025-12-03
lastUpdated: 2025-12-04
---

# Judge LLM Command - Ad-hoc Work Validation

## Overview

Users completing ad-hoc work (not within SpecWeave increments) have no quick way to validate their work using LLM-as-Judge pattern. The current `/specweave:qa` command is **increment-bound** and cannot assess arbitrary file changes or work outside the increment system.

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0101-judge-llm-command](../../../../increments/0101-judge-llm-command/spec.md) | ✅ completed | 2025-12-03 |

## User Stories

- [US-001: Basic File Validation](../../specweave/FS-101/us-001-basic-file-validation.md)
- [US-002: Git-Aware Validation](../../specweave/FS-101/us-002-git-aware-validation.md)
- [US-003: Validation Modes](../../specweave/FS-101/us-003-validation-modes.md)
- [US-004: Issue Reporting](../../specweave/FS-101/us-004-issue-reporting.md)
- [US-005: Slash Command Implementation](../../specweave/FS-101/us-005-slash-command-implementation.md)
