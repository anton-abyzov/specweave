# Actionable Test Implementation Plan

## Immediate Actions (Do Today)

### 1. Update Coverage Thresholds ✅
**File**: `jest.config.cjs`
```javascript
// Line 17-24, update to:
coverageThreshold: {
  global: {
    branches: 55,    // Was 45, now achievable
    functions: 68,   // Keep as is
    lines: 70,       // Was 65, now achievable
    statements: 70,  // Was 65, now achievable
  },
},
```

### 2. Fix Jest ES2020 Module Config 🔧
**Problem**: 43 integration tests disabled due to `import.meta.url` issues

**Fix**: Update Jest configuration for ES modules
**Files to modify**:
- `jest.config.cjs` - Update to support ES2020
- `tsconfig.json` - Ensure module resolution is correct
- `tests/setup.ts` - Add proper ES module setup

**Action**:
```bash
# 1. Update jest.config.cjs
# Add transformIgnorePatterns and extensionsToTreatAsEsm

# 2. Remove all the disabled tests from testPathIgnorePatterns (lines 42-91)

# 3. Run tests to verify they work
npm run test:integration

# Expected: +43 tests running, +5-8% coverage increase
```

## Week 1 Sprint (High Priority)

### Task 1: Test Critical CLI Commands
**Priority**: 🔴 CRITICAL (Data loss risk)

#### Test File 1: `tests/unit/cli/migrate-to-profiles.test.ts`
```typescript
import { MigrateToProfiles } from '@/cli/commands/migrate-to-profiles';

describe('MigrateToProfiles', () => {
  test('should migrate V1 config without data loss', async () => {
    // Setup V1 config
    // Run migration
    // Verify all data preserved
    // Verify profiles created correctly
  });

  test('should handle missing config gracefully', async () => {
    // No config.json
    // Run migration
    // Should create default profile
  });

  test('should backup before migration', async () => {
    // Verify backup created
    // Verify rollback possible
  });
});
```

#### Test File 2: `tests/integration/import-docs.test.ts`
```typescript
describe('Import Docs Command', () => {
  test('should import and classify Notion export', async () => {
    // Mock Notion export structure
    // Run import
    // Verify classification (specs, modules, team, legacy)
    // Check report generation
  });

  test('should handle duplicates', async () => {
    // Import same docs twice
    // Verify deduplication
    // No data corruption
  });
});
```

#### Test File 3: `tests/unit/cli/init-multiproject.test.ts`
```typescript
describe('Init Multi-project', () => {
  test('should setup multi-project structure', async () => {
    // Run init-multiproject
    // Verify projects/ folder structure
    // Verify default project created
    // Check migration of existing specs
  });

  test('should handle existing multi-project gracefully', async () => {
    // Already has projects/
    // Should not overwrite
    // Should show appropriate message
  });
});
```

### Task 2: Critical E2E Tests

#### E2E Test 1: `tests/e2e/increment-lifecycle-complete.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Complete Increment Lifecycle', () => {
  test('should handle full increment workflow', async () => {
    // Step 1: Initialize project
    await execAsync('specweave init .');

    // Step 2: Create increment (mock interactive prompts)
    const result = await execAsync('specweave increment "Add user auth"');
    expect(result.stdout).toContain('Increment created');

    // Step 3: Verify files created
    expect(await fs.pathExists('.specweave/increments/0001-add-user-auth/spec.md')).toBe(true);
    expect(await fs.pathExists('.specweave/increments/0001-add-user-auth/plan.md')).toBe(true);
    expect(await fs.pathExists('.specweave/increments/0001-add-user-auth/tasks.md')).toBe(true);

    // Step 4: Complete a task (simulate)
    const tasksContent = await fs.readFile('.specweave/increments/0001-add-user-auth/tasks.md', 'utf8');
    const updatedTasks = tasksContent.replace('- [ ] T-001', '- [x] T-001');
    await fs.writeFile('.specweave/increments/0001-add-user-auth/tasks.md', updatedTasks);

    // Step 5: Verify living docs sync
    expect(await fs.pathExists('.specweave/docs/internal/specs/spec-001-add-user-auth.md')).toBe(true);

    // Step 6: Close increment
    await execAsync('specweave done 0001');

    // Step 7: Verify metadata updated
    const metadata = await fs.readJSON('.specweave/increments/0001-add-user-auth/metadata.json');
    expect(metadata.status).toBe('completed');
  });
});
```

#### E2E Test 2: `tests/e2e/github-sync-complete.spec.ts`
```typescript
test.describe('GitHub Sync E2E', () => {
  test('should sync with GitHub bidirectionally', async () => {
    // Mock GitHub API
    const github = new GitHubMockServer();
    await github.start();

    // Create increment
    await execAsync('specweave increment "Feature X"');

    // Verify auto-created issue
    expect(github.issues.length).toBe(1);
    expect(github.issues[0].title).toContain('Feature X');

    // Complete task locally
    // ... mark task complete

    // Verify GitHub updated
    await execAsync('specweave sync');
    expect(github.issues[0].body).toContain('[x] T-001');

    // Update GitHub externally
    github.updateIssue(1, { body: 'External change' });

    // Pull changes
    await execAsync('specweave sync --pull');

    // Verify local updated
    const spec = await fs.readFile('.specweave/increments/0001/spec.md', 'utf8');
    expect(spec).toContain('External change');
  });
});
```

## Week 2 Sprint (Important)

### Task 3: Integration Tests for Sync

#### Test File: `tests/integration/github/multi-repo-sync.test.ts`
```typescript
describe('GitHub Multi-Repo Sync', () => {
  test('should sync to different repos based on profile', async () => {
    // Setup multiple profiles
    // Create increments with different profiles
    // Verify each syncs to correct repo
    // Test profile switching
  });

  test('should handle rate limiting gracefully', async () => {
    // Mock rate limit response
    // Attempt sync
    // Verify backs off
    // Verify retry logic
  });
});
```

### Task 4: Test Core Components

#### Test File: `tests/unit/core/repo-structure-manager.test.ts`
```typescript
describe('RepoStructureManager', () => {
  test('should detect monorepo structure', async () => {
    // Setup monorepo
    // Run detection
    // Verify correct identification
  });

  test('should handle polyrepo with submodules', async () => {
    // Setup polyrepo
    // Verify submodule detection
    // Test operations across repos
  });
});
```

#### Test File: `tests/unit/core/spec-parser.test.ts`
```typescript
describe('SpecParser', () => {
  test('should parse spec with all sections', async () => {
    // Parse complete spec
    // Verify all sections extracted
    // Test user stories extraction
    // Test AC-ID extraction
  });

  test('should handle malformed specs gracefully', async () => {
    // Missing sections
    // Invalid YAML
    // Should not crash
  });
});
```

## Week 3 Sprint (Nice to Have)

### Task 5: Advanced E2E Tests

#### Test File: `tests/e2e/brownfield-complete.spec.ts`
```typescript
test('should import existing project documentation', async () => {
  // Setup existing docs
  // Run import
  // Verify classification
  // Create increment using imported specs
  // Full workflow validation
});
```

#### Test File: `tests/e2e/quality-gates.spec.ts`
```typescript
test('should enforce quality gates', async () => {
  // Create increment
  // Run QA checks
  // Verify risk scoring
  // Test gate pass/fail
  // Verify blocking on fail
});
```

## Quick Reference: Test Commands

```bash
# Run after making changes
npm test                    # Quick smoke test
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests
npm run test:e2e            # E2E tests
npm run test:coverage       # Full coverage report

# Run specific test file
npm test -- tests/unit/cli/migrate-to-profiles.test.ts

# Run with watch mode (during development)
npm test -- --watch

# Debug a failing test
npm test -- --verbose --no-coverage migrate-to-profiles

# Run E2E with specific tag
npm run test:e2e -- --grep "Critical"
```

## GitHub Actions Updates

**File**: `.github/workflows/test.yml`
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm run test:unit
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npx playwright install
      - run: npm run test:e2e -- --grep "Critical"

  coverage-report:
    runs-on: ubuntu-latest
    continue-on-error: true  # Don't fail build on coverage
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3  # Optional: Upload to Codecov
```

## Definition of Done

### For Each Test File:
- [ ] Test file created
- [ ] All critical paths covered
- [ ] Error cases tested
- [ ] Edge cases handled
- [ ] Mocks/fixtures created
- [ ] Documentation added
- [ ] Passes locally
- [ ] Passes in CI

### For Coverage Goals:
- [ ] Branches: ≥55% ✅
- [ ] Functions: ≥68% ✅
- [ ] Lines: ≥70% ✅
- [ ] Statements: ≥70% ✅

### For Business Goals:
- [ ] Critical user journeys: 100% tested
- [ ] Data loss scenarios: 100% prevented
- [ ] External integrations: 100% tested
- [ ] Error recovery: 80% covered

## Success Metrics

### Week 1 Target:
- Fix Jest config: ✅ 43 tests enabled
- Add 3 CLI command tests
- Add 2 E2E critical path tests
- Coverage: 70%+ overall

### Week 2 Target:
- Add integration tests for sync
- Test core components
- Coverage: 75%+ overall

### Week 3 Target:
- Add advanced E2E tests
- Complete brownfield testing
- Coverage: 78%+ overall

### Week 4 Target:
- Polish and refactor tests
- Add test helpers library
- Coverage: 80%+ overall
- All critical paths: 100% tested

---

*This plan is immediately actionable. Start with updating jest.config.cjs and fixing the ES2020 module issue for quick wins.*

*Remember: Focus on preventing real bugs, not hitting numbers.*