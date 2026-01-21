---
id: FS-158
title: Smart Completion Conditions with Project Type Detection
type: feature
status: completed
priority: P0
created: 2026-01-07
lastUpdated: 2026-01-14
external_tools:
  github:
    type: milestone
    id: 76
    url: https://github.com/anton-abyzov/specweave/milestone/76
---

# Smart Completion Conditions with Project Type Detection

## Overview

Implement intelligent project type detection and smart completion conditions for `/sw:auto` mode to ensure production-ready quality for ultra-long autonomous sessions (days to months). Auto mode will detect project type (web/mobile/API/library) and enforce mandatory E2E tests for web projects, preventing untested deployments.

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0158-smart-completion-conditions](../../../../increments/0158-smart-completion-conditions/spec.md) | ✅ completed | 2026-01-07 |

## User Stories

- [US-001: Project Type Detection](./us-001-project-type-detection.md)
- [US-002: Smart Defaults System](./us-002-smart-defaults-system.md)
- [US-003: Setup Script Integration](./us-003-setup-script-integration.md)
- [US-004: Stop Hook Enforcement](./us-004-stop-hook-enforcement.md)
- [US-005: E2E Coverage Manifest Integration](./us-005-e2e-coverage-manifest-integration.md)
- [US-006: Configuration & Overrides](./us-006-configuration-overrides.md)
- [US-007: Completion Reporting](./us-007-completion-reporting.md)
