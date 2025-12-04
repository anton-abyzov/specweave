---
id: FS-058
title: "Fix Status Sync Desync Bug + Auto GitHub Sync on Status Change"
type: feature
status: completed
priority: P0
created: 2025-11-24T00:00:00.000Z
lastUpdated: 2025-11-26
---

# Fix Status Sync Desync Bug + Auto GitHub Sync on Status Change

## Overview

**Problem 1**: `increment-reopener.ts` bypasses `MetadataManager.updateStatus()`, causing spec.md/metadata.json desync when increments are reopened.

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0058-fix-status-sync-and-auto-github-update](../../../../../../increments/_archive/0058-fix-status-sync-and-auto-github-update/spec.md) | ✅ completed | 2025-11-24T00:00:00.000Z |

## User Stories

- [US-001: Fix Reopen Desync Bug (P0)](./us-001-fix-reopen-desync-bug-p0-.md)
- [US-002: Auto GitHub Sync on Status Change (P0)](./us-002-auto-github-sync-on-status-change-p0-.md)
- [US-003: Safety Guards Against Crashes (P0)](./us-003-safety-guards-against-crashes-p0-.md)
