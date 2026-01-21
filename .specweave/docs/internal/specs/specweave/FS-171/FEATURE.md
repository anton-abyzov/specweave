---
id: FS-171
title: Lazy Plugin Loading - Conditional SpecWeave Activation
type: feature
status: completed
priority: high
created: 2026-01-18
lastUpdated: 2026-01-19
external_tools:
  github:
    type: milestone
    id: 87
    url: https://github.com/anton-abyzov/specweave/milestone/87
---

# Lazy Plugin Loading - Conditional SpecWeave Activation

## Overview

Currently, SpecWeave installs **all 24 plugins** (~251 skills) at once, which:
1. **Bloats context** - Only 108 of 251 skills (43%) are shown due to token limits
2. **Wastes tokens** - ~60,000 tokens consumed even when SpecWeave isn't needed
3. **Slows startup** - All plugins loaded regardless of user intent
4. **Reduces quality** - Important skills get truncated from context

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0171-lazy-plugin-loading](../../../../increments/0171-lazy-plugin-loading/spec.md) | ✅ completed | 2026-01-18 |

## User Stories

- [US-001: Router Skill Detection](./us-001-router-skill-detection.md)
- [US-002: On-Demand Plugin Installation](./us-002-on-demand-plugin-installation.md)
- [US-003: Skill Cache Management](./us-003-skill-cache-management.md)
- [US-004: Context Forking for Heavy Skills](./us-004-context-forking-for-heavy-skills.md)
- [US-005: Migration for Existing Installations](./us-005-migration-for-existing-installations.md)
- [US-006: Updated Init Flow for New Users](./us-006-updated-init-flow-for-new-users.md)
- [US-007: Loading State Tracking](./us-007-loading-state-tracking.md)
- [US-008: Manual Load/Unload Commands](./us-008-manual-load-unload-commands.md)
- [US-009: MCP Alternative Implementation [DEFERRED - Stretch Goal]](./us-009-mcp-alternative-implementation-deferred-stretch-goal-.md)
- [US-010: Telemetry and Analytics](./us-010-telemetry-and-analytics.md)
- [US-011: Graceful Degradation](./us-011-graceful-degradation.md)
- [US-012: Cross-Platform Support](./us-012-cross-platform-support.md)
