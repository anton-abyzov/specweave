---
id: FS-094
title: Unit Test Alignment
type: feature
status: completed
priority: P1
created: 2025-12-06
lastUpdated: 2025-12-06
external_tools:
  github:
    type: milestone
    id: 26
    url: "https://github.com/anton-abyzov/specweave/milestone/26"
---

# Unit Test Alignment

## Overview

263 unit tests are failing due to:
1. **Missing fs-native exports** - `mkdtemp`/`mkdtempSync` not exported
2. **Duplicate imports** - Test files have duplicate vitest imports
3. **fs-extra usage** - Tests still import forbidden `fs-extra` package
4. **Mock pattern issues** - Incorrect vitest mock setup
5. **Template changes** - Template content changed but tests not updated
6. **Logic changes** - Various implementation changes not reflected in tests

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0094-unit-test-alignment](../../../../increments/0094-unit-test-alignment/spec.md) | ✅ completed | 2025-12-06 |
