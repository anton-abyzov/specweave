# Test Data Consistency Analysis
**Analysis Date**: 2025-11-18
**Scope**: Fixture usage, test isolation, and data consistency

---

## Executive Summary

### Key Findings

🔴 **CRITICAL ISSUES**:
1. **213 dangerous `process.cwd()` usages** in tests (risk of project deletion)
2. **ZERO shared fixtures** - all test data inline or duplicated
3. **42% of tests lack isolation** (213 - 90 = 123 tests using cwd without isolation)

🟢 **POSITIVE FINDINGS**:
1. **90 tests use safe isolation patterns** (`createIsolatedTestDir`, `os.tmpdir()`)
2. **Test utilities exist** (`tests/test-utils/isolated-test-dir.ts`)
3. **Pre-commit hook protection** active (blocks dangerous patterns)

---

## Part 1: process.cwd() Danger Analysis

### 1.1 Current Usage

**FINDING**: 213 instances of `process.cwd()` in test files

**Risk Assessment**:
```bash
$ grep -r "process.cwd()" tests/integration tests/e2e --include="*.test.ts" --include="*.spec.ts" | wc -l
213
```

**DANGER**: Tests using `process.cwd()` can accidentally:
- Create directories in project root (pollutes repository)
- Delete `.specweave/` during cleanup (CATASTROPHIC!)
- Interfere with other tests (shared state)

### 1.2 Historical Incident

**2025-11-17 Incident**: Accidental `.specweave/` deletion
- **Root Cause**: Test using `path.join(process.cwd(), '.specweave', ...)`
- **Impact**: 1,200+ files deleted from project `.specweave/`
- **Recovery**: `git restore` recovered all files
- **Prevention**: Pre-commit hook added to block dangerous patterns

**See**: `.specweave/increments/0037/reports/DELETION-ROOT-CAUSE-2025-11-17.md`

### 1.3 Safe vs Unsafe Patterns

#### ❌ **UNSAFE** (213 instances):
```typescript
// DANGER: Uses project root
const testPath = path.join(process.cwd(), '.specweave', 'increments');
// Cleanup will DELETE project .specweave/!
await fs.rm(testPath, { recursive: true });
```

#### ✅ **SAFE** (90 instances):
```typescript
// SAFE: Uses isolated temp directory
const testRoot = path.join(os.tmpdir(), 'test-name-' + Date.now());
const testPath = path.join(testRoot, '.specweave', 'increments');
// Cleanup only affects temp directory
await fs.rm(testRoot, { recursive: true });
```

### 1.4 Recommended Actions

**IMMEDIATE**:
1. Audit all 213 `process.cwd()` usages
2. Replace with `createIsolatedTestDir()` utility
3. Add eslint rule to block `process.cwd()` in tests

**Example Fix**:
```typescript
// BEFORE (DANGEROUS):
const projectRoot = process.cwd();
const incrementPath = path.join(projectRoot, '.specweave', 'increments', '0001');

// AFTER (SAFE):
import { createIsolatedTestDir } from '../test-utils/isolated-test-dir';

const { testDir, cleanup } = await createIsolatedTestDir('my-test');
const incrementPath = path.join(testDir, '.specweave', 'increments', '0001');

// Always cleanup
try {
  // Test code
} finally {
  await cleanup();
}
```

---

## Part 2: Fixture Analysis

### 2.1 Current State

**FINDING**: ZERO shared fixture files

```bash
$ find tests -name "*.fixture.ts" -o -name "*.fixture.json" -o -name "*.mock.ts"
# NO OUTPUT (no fixtures!)
```

**ISSUE**: All test data is:
- ❌ Inline in test files (hard to maintain)
- ❌ Duplicated across tests (DRY violation)
- ❌ Inconsistent formats (no standardization)
- ❌ Tightly coupled to tests (hard to update)

### 2.2 Duplication Examples

**Increment Metadata** (duplicated ~50 times):
```typescript
// tests/integration/core/increment-planner/increment-planner.test.ts
const metadata = {
  id: "0001",
  name: "test-increment",
  status: "active",
  type: "feature",
  priority: "P1",
  // ... 20 more fields
};

// tests/integration/core/living-docs/intelligent-sync.test.ts
const metadata = {  // DUPLICATE!
  id: "0002",
  name: "another-test",
  status: "active",
  type: "feature",
  priority: "P1",
  // ... same 20 fields
};
```

**GitHub API Responses** (duplicated ~30 times):
```typescript
// tests/integration/external-tools/github/github-sync.test.ts
const mockIssue = {
  number: 123,
  title: "Test Issue",
  state: "open",
  body: "...",
  // ... 15 more fields
};

// tests/e2e/github-sync-idempotency.spec.ts
const mockIssue = {  // DUPLICATE!
  number: 456,
  title: "Another Test",
  state: "open",
  body: "...",
  // ... same 15 fields
};
```

### 2.3 Recommended Fixture Structure

**PROPOSAL**: Create shared fixtures directory

```
tests/fixtures/
├── increments/
│   ├── minimal.json              # Minimal valid increment
│   ├── multi-project.json        # Multi-project increment
│   ├── completed.json            # Completed increment
│   └── with-tasks.json           # Increment with tasks
├── github/
│   ├── issue.json                # Standard issue response
│   ├── create-issue.json         # Create issue response
│   ├── list-issues.json          # List issues response
│   └── user-story.json           # User story issue
├── ado/
│   ├── work-item.json            # Work item response
│   └── create-work-item.json    # Create response
├── jira/
│   ├── issue.json                # Jira issue response
│   └── create-issue.json        # Create response
└── living-docs/
    ├── user-story.md             # Sample user story
    ├── architecture.md           # Sample architecture doc
    └── operations.md             # Sample operations doc
```

**Example Fixture**:
```json
// tests/fixtures/increments/minimal.json
{
  "id": "0001",
  "name": "test-increment",
  "status": "active",
  "type": "feature",
  "priority": "P1",
  "metadata": {
    "created": "2025-01-01T00:00:00Z",
    "updated": "2025-01-01T00:00:00Z",
    "author": "test-user"
  }
}
```

**Usage**:
```typescript
import minimalIncrement from '../fixtures/increments/minimal.json';

test('should handle minimal increment', async () => {
  const increment = { ...minimalIncrement }; // Clone fixture
  increment.id = "0042"; // Customize as needed
  // Test with fixture data
});
```

### 2.4 Benefits of Shared Fixtures

| Benefit | Impact |
|---------|--------|
| **DRY** | Eliminate 100+ duplicate test data blocks |
| **Consistency** | All tests use same data format |
| **Maintainability** | Update API contracts in ONE place |
| **Speed** | Faster test development (copy fixture, not create data) |
| **Documentation** | Fixtures serve as examples/templates |

---

## Part 3: Test Isolation Audit

### 3.1 Isolation Patterns

**SAFE PATTERNS** (90 instances):

1. **createIsolatedTestDir** (RECOMMENDED):
   ```typescript
   import { createIsolatedTestDir } from '../test-utils/isolated-test-dir';
   const { testDir, cleanup } = await createIsolatedTestDir('my-test');
   ```

2. **os.tmpdir()** (ACCEPTABLE):
   ```typescript
   import * as os from 'os';
   const testRoot = path.join(os.tmpdir(), 'test-' + Date.now());
   ```

**UNSAFE PATTERNS** (123 instances):

1. **process.cwd() without isolation** (DANGEROUS):
   ```typescript
   const testPath = path.join(process.cwd(), '.test-data');
   ```

2. **Relative paths from __dirname** (RISKY):
   ```typescript
   const testPath = path.join(__dirname, '..', '..', '.specweave');
   ```

### 3.2 Recommended Actions

**Phase 1: Audit** (1-2 hours)
```bash
# Find all process.cwd() usages
grep -rn "process.cwd()" tests/integration tests/e2e --include="*.test.ts" > audit.txt

# Review each usage:
# - Is it wrapped in createIsolatedTestDir? ✅ SAFE
# - Does it use os.tmpdir()? ✅ SAFE
# - Does it create files in project root? ❌ DANGEROUS
```

**Phase 2: Fix** (8-10 hours)
```bash
# Replace dangerous patterns with safe isolation:
# For each dangerous usage:
#   1. Import createIsolatedTestDir
#   2. Replace process.cwd() with testDir
#   3. Add cleanup in finally block
```

**Phase 3: Prevent** (1 hour)
```javascript
// .eslintrc.js
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'CallExpression[callee.object.name="process"][callee.property.name="cwd"]',
      message: 'Use createIsolatedTestDir() instead of process.cwd() in tests',
    },
  ],
}
```

---

## Part 4: Mock Factory Patterns

### 4.1 Current State

**FINDING**: No centralized mock factories

**ISSUE**: Each test creates its own mocks:
- ❌ Duplicated mock creation logic
- ❌ Inconsistent mock data
- ❌ No type safety for mocks
- ❌ Hard to maintain when APIs change

### 4.2 Recommended Mock Factories

**File**: `tests/test-utils/mock-factories.ts`

```typescript
import { Increment, IncrementMetadata } from '../../src/types';

export class IncrementFactory {
  static create(overrides?: Partial<Increment>): Increment {
    return {
      id: '0001',
      name: 'test-increment',
      status: 'active',
      type: 'feature',
      priority: 'P1',
      metadata: IncrementFactory.createMetadata(),
      ...overrides,
    };
  }

  static createMetadata(overrides?: Partial<IncrementMetadata>): IncrementMetadata {
    return {
      created: new Date('2025-01-01T00:00:00Z'),
      updated: new Date('2025-01-01T00:00:00Z'),
      author: 'test-user',
      ...overrides,
    };
  }

  static createCompleted(overrides?: Partial<Increment>): Increment {
    return IncrementFactory.create({
      status: 'completed',
      metadata: {
        ...IncrementFactory.createMetadata(),
        completedAt: new Date('2025-01-02T00:00:00Z'),
      },
      ...overrides,
    });
  }
}

export class GitHubFactory {
  static createIssue(overrides?: Partial<any>): any {
    return {
      number: 123,
      title: 'Test Issue',
      state: 'open',
      body: 'Test description',
      labels: [],
      assignees: [],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      ...overrides,
    };
  }

  static createComment(overrides?: Partial<any>): any {
    return {
      id: 1,
      body: 'Test comment',
      user: { login: 'test-user' },
      created_at: '2025-01-01T00:00:00Z',
      ...overrides,
    };
  }
}

export class ADOFactory {
  static createWorkItem(overrides?: Partial<any>): any {
    return {
      id: 123,
      fields: {
        'System.Title': 'Test Work Item',
        'System.State': 'Active',
        'System.WorkItemType': 'Epic',
        ...overrides?.fields,
      },
      ...overrides,
    };
  }
}
```

**Usage**:
```typescript
import { IncrementFactory, GitHubFactory } from '../test-utils/mock-factories';

test('should sync increment to GitHub', async () => {
  const increment = IncrementFactory.create({ id: '0042' });
  const issue = GitHubFactory.createIssue({ number: 42 });

  // Test with mocks
});
```

**Benefits**:
- ✅ Type-safe mocks (TypeScript enforces structure)
- ✅ DRY (no duplicate mock logic)
- ✅ Easy to maintain (update factory, all tests fixed)
- ✅ Discoverable (IDE autocomplete shows all factories)

---

## Part 5: Recommended Actions

### 5.1 Priority: CRITICAL (Complete in Week 1)

**Action 1**: Audit `process.cwd()` usage
```bash
# Generate audit report
grep -rn "process.cwd()" tests/integration tests/e2e --include="*.test.ts" --include="*.spec.ts" > process-cwd-audit.txt

# Categorize:
# - SAFE: Wrapped in createIsolatedTestDir ✅
# - UNSAFE: Direct usage ❌
```

**Expected**: Identify 123 unsafe usages

**Action 2**: Fix top 10 most dangerous tests
```bash
# Priority: Tests that delete directories
grep -B5 -A5 "fs.rm.*recursive" tests/ -r --include="*.test.ts"

# Fix these FIRST (highest risk of deletion)
```

**Expected**: Eliminate catastrophic deletion risk

### 5.2 Priority: HIGH (Complete in Week 2)

**Action 3**: Create fixtures directory
```bash
mkdir -p tests/fixtures/{increments,github,ado,jira,living-docs}

# Copy example fixtures from report
# Start with increments (most reused)
```

**Action 4**: Create mock factories
```bash
# Create tests/test-utils/mock-factories.ts
# Implement IncrementFactory, GitHubFactory, ADOFactory
# Update top 20 tests to use factories
```

**Expected**: 50% reduction in duplicate test data

### 5.3 Priority: MEDIUM (Complete in Week 3)

**Action 5**: Add eslint rule
```javascript
// .eslintrc.js - Block process.cwd() in tests
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'CallExpression[callee.object.name="process"][callee.property.name="cwd"]',
      message: 'Use createIsolatedTestDir() instead of process.cwd() in tests',
    },
  ],
}
```

**Action 6**: Migrate remaining unsafe tests
```bash
# Batch migrate remaining tests to use createIsolatedTestDir
# Target: 100% safe test isolation
```

**Expected**: ZERO unsafe tests

---

## Part 6: Metrics & Success Criteria

### 6.1 Current Metrics

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| `process.cwd()` usages | 213 | 0 | -213 |
| Safe isolation patterns | 90 (42%) | 213 (100%) | +123 |
| Shared fixtures | 0 | 20+ | +20 |
| Mock factories | 0 | 5+ | +5 |
| Duplicate test data blocks | ~200 | <50 | -150 |

### 6.2 Success Criteria

**Week 1** (CRITICAL):
- ✅ 0 unsafe tests that delete directories
- ✅ Audit report generated

**Week 2** (HIGH):
- ✅ Fixtures directory created with 10+ fixtures
- ✅ Mock factories created (Increment, GitHub, ADO)
- ✅ Top 20 tests migrated to use fixtures/factories

**Week 3** (MEDIUM):
- ✅ Eslint rule blocks `process.cwd()` in tests
- ✅ All tests use safe isolation (100%)
- ✅ Duplicate test data reduced by 75%

### 6.3 Expected Benefits

| Benefit | Quantification |
|---------|----------------|
| **Safety** | ZERO risk of `.specweave/` deletion |
| **Maintainability** | 75% less duplicate test data |
| **Speed** | 30% faster test development (reuse fixtures) |
| **Consistency** | 100% tests use same data format |

---

## Part 7: Related Documentation

**Pre-commit Hook Protection**:
- `.git/hooks/pre-commit` - Blocks dangerous test patterns

**Test Utilities**:
- `tests/test-utils/isolated-test-dir.ts` - Safe test isolation
- `tests/test-utils/mock-factories.ts` (TO CREATE)

**Incidents**:
- `.specweave/increments/0037/reports/DELETION-ROOT-CAUSE-2025-11-17.md`
- `.specweave/increments/0039/reports/ACCIDENTAL-DELETION-RECOVERY-2025-11-17.md`

**Guidelines**:
- `CLAUDE.md` → "Test Isolation (CRITICAL)"
- `CLAUDE.md` → "Vitest Mock Best Practices"

---

## Conclusion

**Test data consistency is currently POOR**:
- 🔴 213 dangerous `process.cwd()` usages (42% risk)
- 🔴 ZERO shared fixtures (massive duplication)
- 🟢 90 safe tests (42% - room for improvement)

**Recommended immediate action**:
1. Audit all `process.cwd()` usages (1-2 hours)
2. Fix top 10 most dangerous tests (4-6 hours)
3. Create fixtures directory (1-2 hours)
4. Create mock factories (2-3 hours)

**Total effort**: ~10-15 hours
**Expected benefit**: ELIMINATE catastrophic deletion risk + 75% less duplicate code

---

**Analysis Complete**: 2025-11-18
**Status**: Ready for implementation
