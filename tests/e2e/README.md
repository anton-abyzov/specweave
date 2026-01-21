# E2E Tests

End-to-end tests for SpecWeave using **Vitest** (not Playwright).

## Overview

The `tests/e2e/` directory contains integration tests that validate complete workflows and system behavior. Despite being called "E2E", these tests focus on **CLI and backend logic**, not browser automation.

## Test Framework

**Framework**: Vitest (NOT Playwright)
**Why Vitest?** These tests verify CLI commands, file operations, and backend processes - not browser UI.

### The Symbol Conflict (RESOLVED)

**Problem**: Playwright and Vitest both define `Symbol($$jest-matchers-object)`, causing:
```
TypeError: Cannot redefine property: Symbol($$jest-matchers-object)
```

**Solution**:
- E2E tests use **Vitest exclusively**
- Playwright config excludes `tests/e2e/` via `testIgnore: '**/e2e/**'`
- Separation of concerns: Playwright for browser tests (future), Vitest for backend E2E

---

## Directory Structure

```
tests/e2e/
├── README.md                          # This file
├── *.spec.ts, *.e2e.ts, *.test.ts    # Top-level E2E tests (all patterns supported)
├── auto/                              # Auto mode workflow tests
├── lsp/                               # LSP integration tests
├── plugin-activation/                 # Plugin and skill activation tests
└── reflection/                        # Self-reflection system tests
```

**Note**: Currently supports mixed naming (.spec.ts, .e2e.ts, .test.ts) - Vitest discovers all patterns.

---

## Test Naming Convention

**CURRENT STATE**: Mixed naming conventions supported (.spec.ts, .e2e.ts, .test.ts)

```bash
# All patterns work:
tests/e2e/ac-to-github-sync-flow.spec.ts       # Playwright-style
tests/e2e/auto/full-workflow.e2e.ts            # E2E semantic naming
tests/e2e/project-cli.test.ts                  # Vitest-style
```

**Vitest Discovery**: Configured to discover all patterns in tests/e2e/

**Why Mixed Naming?**
- `.e2e.ts` - Semantic distinction (end-to-end workflows)
- `.spec.ts` - Specification/behavior tests
- `.test.ts` - Standard Vitest convention

All patterns are valid and discovered correctly.

---

## Running E2E Tests

### All E2E Tests

```bash
npm run test:e2e                  # Run all E2E tests
```

### Specific Test File

```bash
npx vitest tests/e2e/cli-commands.test.ts
```

### Specific Test Pattern

```bash
npx vitest tests/e2e/serverless/
```

### Watch Mode (Development)

```bash
npx vitest tests/e2e/ --watch
```

---

## Writing E2E Tests

### Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('My E2E Workflow', () => {
  let testRoot: string;

  beforeEach(async () => {
    // ✅ CRITICAL: Use isolated temp directory
    testRoot = path.join(os.tmpdir(), 'e2e-my-workflow-' + Date.now());
    await fs.ensureDir(testRoot);
  });

  afterEach(async () => {
    // Cleanup temp directory
    await fs.remove(testRoot);
  });

  it('should complete full workflow', async () => {
    // Simulate user workflow
    // 1. Initialize project
    // 2. Create increment
    // 3. Execute tasks
    // 4. Validate results

    expect(result).toBe(expected);
  });
});
```

### Best Practices

1. **Test Isolation** ✅
   - Always use `os.tmpdir()` for test directories
   - Never use `process.cwd()` (can delete project files!)
   - Clean up temp directories in `afterEach()`

2. **Realistic Scenarios** 📋
   - Test complete user workflows (not individual functions)
   - Use realistic data (sample PRDs, increments, etc.)
   - Simulate external tool interactions when possible

3. **Test Data** 📦
   - Use fixtures from `tests/fixtures/`
   - Create reusable mock factories
   - Avoid hardcoding test data in tests

4. **Timeout Configuration** ⏱️
   - E2E tests have 60-second timeout (vs 10s for unit/integration)
   - Override if needed: `it('test', { timeout: 120000 }, async () => { ... })`

5. **Error Handling** 🛡️
   - Test both happy paths and error cases
   - Verify error messages and exit codes
   - Test graceful degradation

---

## Test Categories

### Workflow Tests (Top-Level)

Full end-to-end user workflows across multiple features:
- `cli-commands.test.ts` - CLI command execution
- `increment-discipline.test.ts` - Increment lifecycle discipline
- `specweave-smoke.test.ts` - Quick smoke test (critical paths)

### Integration Tests (Subdirectories)

Specific integration scenarios:
- `brownfield/` - Existing project onboarding
- `i18n/` - Multi-language workflows
- `serverless/` - Platform recommendation and IaC generation
- `status-sync/` - Status synchronization across tools
- `sync/` - Full sync (GitHub, JIRA, ADO)

---

## Configuration

**File**: `vitest.e2e.config.ts`

Key settings:
- **Test Pattern**: `tests/e2e/**/*.test.ts`
- **Timeout**: 60 seconds (E2E workflows need more time)
- **Environment**: Node.js
- **Reporter**: Verbose (show detailed output)

---

## Troubleshooting

### Test Timeout Errors

```bash
# Increase timeout for specific test
it('long-running workflow', { timeout: 120000 }, async () => {
  // Test code
});
```

### Import Errors

```bash
# ❌ Wrong:
import { MyClass } from '../../src/MyClass';

# ✅ Correct (add .js extension):
import { MyClass } from '../../src/MyClass.js';
```

### Test Isolation Issues

```bash
# ❌ Dangerous (can delete project files):
const testRoot = path.join(process.cwd(), '.test-data');

# ✅ Safe (isolated temp directory):
const testRoot = path.join(os.tmpdir(), 'test-name-' + Date.now());
```

---

## Migration Notes

**2025-11-17**: Migrated from Playwright to Vitest for consistency
- Kept E2E test structure and naming
- Updated imports from Playwright → Vitest
- Maintained test isolation patterns

**2025-11-18**: Standardized naming to `.test.ts` only
- Renamed 34 test files (.spec.ts → .test.ts)
- Updated vitest.e2e.config.ts pattern
- Aligned with project-wide naming convention

---

## Related Documentation

- **Test Organization**: `.specweave/docs/internal/architecture/TEST-ORGANIZATION-PROPOSAL.md`
- **Integration Tests**: `tests/integration/README.md`
- **Test Utilities**: `tests/test-utils/`
- **CLAUDE.md**: Project-level test documentation and guidelines

---

**Last Updated**: 2025-11-18 (Increment 0042 - Test Infrastructure Cleanup)

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx vitest run tests/e2e/auto/full-workflow.e2e.ts

# Run in watch mode
npx vitest tests/e2e

# Run with debug output
DEBUG=* npm run test:e2e
```

## Available npm Scripts

```bash
# Run all E2E tests
npm run test:e2e

# Run in watch mode (development)
npm run test:e2e:watch          # Coming soon - use: npx vitest tests/e2e --watch

# Run with debug output
npm run test:e2e:debug           # Coming soon - use: DEBUG=* npm run test:e2e

# Run headed mode (if UI tests added)
npm run test:e2e:headed          # Coming soon - for future Playwright browser tests
```

## Test Results

**Current Status** (as of 2026-01-08):
- 74 tests discovered
- 55 passing (74%)
- 17 failing (hook infrastructure issues)
- 2 skipped (registry-dependent)

**Known Issues**:
- stop-auto.sh hook missing (being migrated)
- Some tests fail due to hook path changes

---

**Last Updated**: 2026-01-08 (Increment 0164)
**Test Framework**: Vitest v2.1.9
**Symbol Conflict**: RESOLVED ✅
