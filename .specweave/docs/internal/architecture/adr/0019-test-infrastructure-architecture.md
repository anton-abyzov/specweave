# ADR-0019: Test Infrastructure Architecture

**Date**: 2025-11-05
**Status**: Accepted
**Deciders**: Architect Agent, Tech Lead
**Related**: ADR-0018 (Brownfield Classification Algorithm)

## Context

SpecWeave v0.8.0 includes major new features (multi-project support, brownfield import) that require comprehensive test coverage. Previous increments had minimal testing infrastructure.

### Requirements

1. **Coverage Target**: 90% unit, 80% integration, 85% overall
2. **Test Types**: Unit, integration, E2E (CLI commands)
3. **Performance**: Test suite runs in \<5 minutes
4. **Zero Flakiness**: Deterministic tests (no random failures)
5. **TDD-Friendly**: Easy to write tests before implementation
6. **CI/CD Integration**: Automated test runs on every PR

### Key Components to Test

1. **ProjectManager**: Path resolution, project switching, caching
2. **BrownfieldAnalyzer**: Keyword-based classification, confidence scoring
3. **BrownfieldImporter**: File copying, import orchestration, report generation
4. **CLI Commands**: init-multiproject, import-docs, switch-project

### Alternatives Considered

1. **Mocha + Chai** (alternative test framework)
   - **Pros**: Flexible, widely used, good plugin ecosystem
   - **Cons**: More verbose, requires separate assertion library
   - **Why not**: Jest is industry standard for TypeScript projects, built-in coverage

2. **Vitest** (fast Jest alternative)
   - **Pros**: Faster than Jest, ESM-native, better TypeScript support
   - **Cons**: Newer (potential breaking changes), smaller ecosystem
   - **Why not**: Jest more mature, SpecWeave already uses Jest for existing tests

3. **Playwright Test** (built-in test runner)
   - **Pros**: Integrated with Playwright, fast parallel execution
   - **Cons**: E2E-focused, not ideal for unit tests
   - **Why not**: Use Playwright for E2E only, Jest for unit/integration

4. **Manual Testing Only**
   - **Pros**: No setup cost, flexible
   - **Cons**: Slow, error-prone, no regression detection
   - **Why not**: Unacceptable for production-ready framework

## Decision

**Use Jest + Playwright Test Infrastructure**

### Architecture

**Three-Layer Test Pyramid**:
```
         /\
        /E2\        E2E Tests (10% coverage)
       /____\       - CLI command execution (Playwright)
      /      \      - End-to-end workflows
     /  Intg  \     Integration Tests (30% coverage)
    /          \    - Real file operations (Jest)
   /____________\   - Multi-component interactions
  /              \
 /      Unit      \ Unit Tests (60% coverage)
/__________________\ - Component isolation (Jest)
                     - Pure functions
                     - Mocked dependencies
```

### Technology Stack

**Unit & Integration Tests**: Jest 29+
- **Why**: Industry standard, built-in coverage, TypeScript support via ts-jest
- **Configuration**: `jest.config.cjs`
- **Test Files**: `tests/unit/**/*.test.ts`, `tests/integration/**/*.test.ts`
- **Mocking**: Jest built-in mocks (`jest.mock()`)

**E2E Tests**: Playwright 1.48+
- **Why**: Best-in-class CLI testing, parallel execution, video recording
- **Configuration**: `playwright.config.ts`
- **Test Files**: `tests/e2e/**/*.spec.ts`
- **Execution**: Spawns CLI processes, verifies output

**Coverage**: Istanbul (built into Jest)
- **Why**: Industry standard, integrated with Jest
- **Output**: `coverage/lcov-report/index.html`
- **CI Integration**: Codecov or similar

### Test Organization

```
tests/
├── unit/                              # Unit tests (isolated, mocked)
│   ├── project-manager/
│   │   ├── path-resolution.test.ts    # Pure functions
│   │   ├── project-switching.test.ts
│   │   ├── caching.test.ts
│   │   └── validation.test.ts
│   ├── brownfield/
│   │   ├── analyzer/
│   │   │   ├── keyword-scoring.test.ts
│   │   │   ├── classification.test.ts
│   │   │   └── confidence-scoring.test.ts
│   │   └── importer/
│   │       ├── file-copying.test.ts
│   │       ├── structure-preservation.test.ts
│   │       └── report-generation.test.ts
│   └── cli/
│       ├── init-multiproject.test.ts
│       ├── import-docs.test.ts
│       └── switch-project.test.ts
│
├── integration/                        # Integration tests (real FS)
│   ├── project-manager/
│   │   ├── full-lifecycle.test.ts      # Create → Switch → Remove
│   │   ├── structure-creation.test.ts
│   │   └── config-updates.test.ts
│   ├── brownfield/
│   │   ├── import-workflow.test.ts     # Analyze → Import → Report
│   │   ├── multi-source.test.ts
│   │   └── classification-accuracy.test.ts
│   └── cli/
│       ├── init-multiproject-flow.test.ts
│       ├── import-docs-flow.test.ts
│       └── switch-project-flow.test.ts
│
├── e2e/                                # E2E tests (Playwright)
│   ├── multiproject-setup.spec.ts
│   ├── brownfield-import.spec.ts
│   └── project-switching.spec.ts
│
├── fixtures/                           # Test data
│   ├── brownfield/
│   │   ├── notion-export/              # 20+ markdown files
│   │   ├── confluence-export/
│   │   ├── wiki-export/
│   │   └── custom/
│   ├── configs/
│   │   ├── single-project.json
│   │   └── multi-project.json
│   └── README.md                       # Fixture documentation
│
├── utils/                              # Test utilities
│   ├── temp-dir.ts                     # Temp directory helpers
│   ├── fixture-loader.ts               # Load test fixtures
│   ├── benchmark.ts                    # Performance measurement
│   └── matchers.ts                     # Custom Jest matchers
│
├── performance/                        # Performance benchmarks
│   ├── project-manager.bench.ts
│   ├── brownfield-import.bench.ts
│   ├── analyzer.bench.ts
│   └── RESULTS.md                      # Benchmark results
│
└── README.md                           # Test suite documentation
```

### Jest Configuration

**File**: `jest.config.cjs`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
  ],
  coverageThresholds: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/e2e/',  // E2E tests run separately with Playwright
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',  // Handle ESM imports
  },
};
```

### Playwright Configuration

**File**: `playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,  // 60 seconds per test
  retries: 0,  // No retries (deterministic tests)
  workers: 1,  // Sequential execution (file system tests)
  use: {
    headless: true,
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'cli-tests',
      testMatch: '**/*.spec.ts',
    },
  ],
});
```

### Test Utilities

**Temp Directory Helper** (`tests/utils/temp-dir.ts`):
```typescript
import os from 'os';
import path from 'path';
import fs from 'fs-extra';

export async function createTempDir(prefix = 'specweave-test-'): Promise<string> {
  const tempDir = path.join(os.tmpdir(), `${prefix}${Date.now()}`);
  await fs.ensureDir(tempDir);
  return tempDir;
}

export async function cleanupTempDir(tempDir: string): Promise<void> {
  if (await fs.pathExists(tempDir)) {
    await fs.remove(tempDir);
  }
}
```

**Fixture Loader** (`tests/utils/fixture-loader.ts`):
```typescript
import path from 'path';
import fs from 'fs-extra';

export async function loadFixture(fixtureName: string): Promise<string> {
  const fixturePath = path.join(__dirname, '../fixtures', fixtureName);
  return await fs.readFile(fixturePath, 'utf-8');
}

export async function loadFixtureJSON(fixtureName: string): Promise<any> {
  const content = await loadFixture(fixtureName);
  return JSON.parse(content);
}
```

**Benchmark Utility** (`tests/utils/benchmark.ts`):
```typescript
export async function benchmark(
  fn: () => Promise<void>,
  iterations = 100
): Promise<{ avgTime: number; totalTime: number; minTime: number; maxTime: number }> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  return {
    avgTime: times.reduce((a, b) => a + b, 0) / times.length,
    totalTime: times.reduce((a, b) => a + b, 0),
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
  };
}
```

### NPM Scripts

**File**: `package.json`

```json
{
  "scripts": {
    "test:unit": "jest tests/unit --coverage",
    "test:integration": "jest tests/integration --coverage",
    "test:e2e": "playwright test tests/e2e",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:performance": "ts-node tests/performance/*.bench.ts"
  }
}
```

## Consequences

### Positive

- ✅ **Industry Standard**: Jest + Playwright are industry-standard tools
- ✅ **TypeScript Support**: ts-jest provides excellent TypeScript integration
- ✅ **Built-in Coverage**: No need for separate coverage tool
- ✅ **Fast Execution**: Test suite runs in \<5 minutes
- ✅ **TDD-Friendly**: Easy to write tests before implementation
- ✅ **CI/CD Ready**: Works with GitHub Actions, GitLab CI, etc.
- ✅ **Deterministic**: Mocked dependencies ensure consistent results

### Negative

- ❌ **Setup Complexity**: Initial setup requires configuration
- ❌ **Mock Maintenance**: Mocked dependencies need updates when APIs change
- ❌ **Temp Directory Cleanup**: Integration tests require temp directory management
- ❌ **E2E Slowness**: E2E tests slower than unit tests (60s timeout per test)

### Neutral

- ⚠️ **Coverage Thresholds**: 85% overall coverage is ambitious but achievable
- ⚠️ **Test Fixtures**: Requires 20+ realistic markdown files (manual creation)
- ⚠️ **Performance Benchmarks**: Requires separate tooling for performance measurement

## Testing Best Practices

### 1. Test Isolation

**Unit Tests**: Mock all external dependencies
```typescript
jest.mock('fs-extra');
jest.mock('../config-manager');

const mockFs = fs as jest.Mocked<typeof fs>;
mockFs.readFile.mockResolvedValue('file content');
```

**Integration Tests**: Use real file system (temp directories)
```typescript
describe('ProjectManager integration', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it('should create project structure', async () => {
    const pm = new ProjectManager(tempDir);
    await pm.createProjectStructure('test-project');
    // Verify files exist
  });
});
```

### 2. Deterministic Tests

**Avoid Random Data**:
```typescript
// ❌ BAD (flaky)
const projectId = `project-${Math.random()}`;

// ✅ GOOD (deterministic)
const projectId = 'test-project-123';
```

**Use Fixed Timestamps**:
```typescript
// ❌ BAD (flaky)
const timestamp = Date.now();

// ✅ GOOD (deterministic)
const timestamp = 1609459200000; // 2021-01-01 00:00:00
```

### 3. Clear Error Messages

```typescript
// ❌ BAD (unclear)
expect(result).toBe(expected);

// ✅ GOOD (clear)
expect(result).toBe(expected);
// Custom matcher with descriptive message:
expect(result).toMatchExpectedClassification({
  type: 'spec',
  confidence: 0.8,
  message: 'Expected spec classification with high confidence'
});
```

### 4. Fast Execution

**Optimize Test Setup**:
```typescript
// ❌ BAD (slow)
beforeEach(async () => {
  await createLargeTestData();  // Runs before EVERY test
});

// ✅ GOOD (fast)
beforeAll(async () => {
  await createLargeTestData();  // Runs ONCE before all tests
});
```

## Coverage Measurement

### Coverage Thresholds

**Global** (85% overall):
```javascript
coverageThresholds: {
  global: {
    branches: 85,
    functions: 85,
    lines: 85,
    statements: 85
  }
}
```

**Per-Component** (custom thresholds):
```javascript
coverageThresholds: {
  'src/core/project-manager.ts': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90
  },
  'src/core/brownfield/analyzer.ts': {
    branches: 85,
    functions: 85,
    lines: 85,
    statements: 85
  }
}
```

### Coverage Report

**HTML Report**: `coverage/lcov-report/index.html`
- Open in browser to see line-by-line coverage
- Red = uncovered, green = covered

**Terminal Report**: `npm run test:coverage`
- Shows coverage percentages per file
- Highlights files below threshold

**CI Integration**: Upload to Codecov or Coveralls
```bash
# .github/workflows/test.yml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Performance Benchmarking

### Benchmark Tests

**Location**: `tests/performance/*.bench.ts`

**Example** (`project-manager.bench.ts`):
```typescript
import { benchmark } from '../utils/benchmark';
import { ProjectManager } from '../../src/core/project-manager';

describe('ProjectManager Performance', () => {
  it('should resolve paths in \<1ms', async () => {
    const pm = new ProjectManager('/test-root');

    const result = await benchmark(async () => {
      pm.getSpecsPath();
    }, 1000);

    console.log(`Avg time: ${result.avgTime.toFixed(2)}ms`);
    expect(result.avgTime).toBeLessThan(1);  // \<1ms target
  });
});
```

**Output**: `tests/performance/RESULTS.md`
```markdown
# Performance Benchmark Results

## ProjectManager

- `getSpecsPath()`: 0.12ms average (target: \<1ms) ✅
- `getProjectBasePath()`: 0.08ms average (target: \<1ms) ✅

## BrownfieldImporter

- Import 50 files: 4.2s (target: \<10s) ✅
- Import 500 files: 87s (target: \<120s) ✅
```

## CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/test.yml`

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Check coverage thresholds
        run: |
          if [ $(jq '.total.lines.pct' coverage/coverage-summary.json | cut -d. -f1) -lt 85 ]; then
            echo "Coverage below 85% threshold"
            exit 1
          fi
```

## Future Enhancements

### Short-Term (v0.9.0)
- Add mutation testing (Stryker) to validate test quality
- Add visual regression tests for CLI output formatting
- Add contract tests for external API integrations (GitHub, Jira)

### Long-Term (v1.0.0+)
- Add property-based testing (fast-check) for edge case discovery
- Add performance regression detection (fail CI if >10% slower)
- Add test coverage dashboard (Codecov, Coveralls)

## Related Decisions

- **ADR-0018**: Brownfield Classification Algorithm (defines classification accuracy targets)
- **ADR-0017**: Multi-Project Internal Structure (defines components to test)

## References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [TypeScript Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Test Pyramid Concept](https://martinfowler.com/articles/practical-test-pyramid.html)

---

**Created**: 2025-11-05
**Last Updated**: 2025-11-05
**Author**: Architect Agent
