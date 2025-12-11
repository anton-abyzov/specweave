---
id: FS-146
title: "GitHub CLI Token Passthrough Fix"
type: feature
status: completed
priority: P1
created: 2025-12-11
lastUpdated: 2025-12-11
---

# GitHub CLI Token Passthrough Fix

## Overview

The GitHub plugin uses `gh` CLI commands via `execFileNoThrow()` but does not pass the `GH_TOKEN` environment variable from `.env`. This causes GitHub sync operations to use whatever account is configured via `gh auth`, which may be different from the token in `.env`.

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0146-github-cli-token-passthrough-fix](../../../../increments/0146-github-cli-token-passthrough-fix/spec.md) | ✅ completed | 2025-12-11 |

## User Stories

- [US-001: Token Passthrough for GitHub Client](../../specweave/FS-146/us-001-token-passthrough-for-github-client.md)
- [US-002: Token Passthrough for Feature Sync](../../specweave/FS-146/us-002-token-passthrough-for-feature-sync.md)
- [US-003: Token Passthrough for Other GitHub Files](../../specweave/FS-146/us-003-token-passthrough-for-other-github-files.md)
- [US-004: Unit Tests for Token Passthrough](../../specweave/FS-146/us-004-unit-tests-for-token-passthrough.md)
