---
id: FS-164
title: E2E Test Infrastructure Fix
type: feature
status: completed
priority: P0
created: 2026-01-08
lastUpdated: 2026-01-14
external_tools:
  github:
    type: milestone
    id: 81
    url: https://github.com/anton-abyzov/specweave/milestone/81
---

# E2E Test Infrastructure Fix

## Overview

The E2E test suite is currently broken with multiple critical issues:
1. Playwright/Vitest Symbol conflict preventing tests from running
2. Test discovery failures ("No tests found")
3. Complex grep-invert patterns in test:e2e script that are brittle
4. Mix of .spec.ts and .e2e.ts naming conventions causing confusion

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0164-e2e-test-infrastructure-fix](../../../../increments/0164-e2e-test-infrastructure-fix/spec.md) | ✅ completed | 2026-01-08 |

## User Stories

- [US-001: Resolve Playwright/Vitest Conflict](./us-001-resolve-playwright-vitest-conflict.md)
- [US-002: Fix Test Discovery](./us-002-fix-test-discovery.md)
- [US-003: Clean Up Test Runner Configuration](./us-003-clean-up-test-runner-configuration.md)
- [US-004: Ensure All E2E Tests Pass](./us-004-ensure-all-e2e-tests-pass.md)
