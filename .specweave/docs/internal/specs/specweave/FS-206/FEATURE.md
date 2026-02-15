---
id: FS-206
title: "0206: Universal External Sync Fix"
type: feature
status: active
priority: P1
created: 2026-02-15
lastUpdated: 2026-02-15
tldr: External sync silently drops events because ProjectService requires a
  `project:` field in spec.
complexity: high
stakeholder_relevant: true
external_tools:
  github:
    type: milestone
    id: 100
    url: "https://github.com/anton-abyzov/specweave/milestone/100"
---

# 0206: Universal External Sync Fix

## TL;DR

**What**: External sync silently drops events because ProjectService requires a `project:` field in spec.
**Status**: active | **Priority**: P1
**User Stories**: 5

## Overview

External sync silently drops events because ProjectService requires a `project:` field in spec.md that most increments lack. Additionally, only GitHub has auto-create/auto-close handlers; JIRA and ADO are configured but never receive events.

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0206-universal-external-sync-fix](../../../../increments/0206-universal-external-sync-fix/spec.md) | ⏳ active | 2026-02-15 |

## User Stories

- [US-001: Fix Silent Event Drop in ProjectService](./us-001-fix-silent-event-drop-in-projectservice.md)
- [US-002: Universal Auto-Create for All Providers](./us-002-universal-auto-create-for-all-providers.md)
- [US-003: Explicit Closure on Increment Completion](./us-003-explicit-closure-on-increment-completion.md)
- [US-004: Fix Session-End Batch Sync](./us-004-fix-session-end-batch-sync.md)
- [US-005: Comprehensive Test Coverage](./us-005-comprehensive-test-coverage.md)
