# E2E Tests (End-to-End)

**Purpose**: Full user workflow tests simulating real-world SpecWeave usage.

**Framework**: Vitest (migrated from Playwright for consistency)

---

## Directory Structure

```
tests/e2e/
├── README.md                          # This file
├── *.test.ts                          # Top-level E2E tests
├── brownfield/                        # Brownfield project workflows
├── i18n/                              # Internationalization workflows
├── increments/                        # Increment lifecycle tests
├── multi-project/                     # Multi-project workflows
├── serverless/                        # Serverless platform tests
├── status-sync/                       # Status synchronization tests
└── sync/                              # Full sync tests (all permissions)
```

---

## Test Naming Convention

**✅ REQUIRED**: All E2E tests MUST use `.test.ts` extension

```bash
# ✅ CORRECT:
tests/e2e/my-workflow.test.ts
tests/e2e/serverless/platform-recommendations.test.ts

# ❌ WRONG (deprecated):
tests/e2e/my-workflow.spec.ts
```

**Why `.test.ts` only?**
- Consistency with unit and integration tests
- Simpler glob patterns (`**/*.test.ts` vs `**/*.{test,spec}.ts`)
- Aligned with Vitest conventions
- Easier test discovery and tooling configuration

**Standardized**: 2025-11-18 (all 40 E2E tests now use `.test.ts`)

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
