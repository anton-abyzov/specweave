---
increment: 0042-test-infrastructure-cleanup
architecture_docs:
  - ../../docs/internal/architecture/adr/0042-01-test-structure-standardization.md
  - ../../docs/internal/architecture/adr/0042-02-test-isolation-enforcement.md
  - ../../docs/internal/architecture/adr/0042-03-fixture-architecture.md
  - ../../docs/internal/architecture/adr/0042-04-naming-convention-test-only.md
analysis_references:
  - ../0041-living-docs-test-fixes/reports/ULTRATHINK-TEST-DUPLICATION-ANALYSIS-2025-11-18.md
  - ../0041-living-docs-test-fixes/reports/TEST-DATA-CONSISTENCY-ANALYSIS.md
  - ../0041-living-docs-test-fixes/reports/EXECUTIVE-SUMMARY-TEST-ANALYSIS-2025-11-18.md
status: planned
---

# Implementation Plan: Test Infrastructure Cleanup

## Executive Summary

**Goal**: Eliminate 48% test duplication, 213 dangerous process.cwd() usages, and establish shared fixture infrastructure to reduce CI time by 47% and eliminate catastrophic deletion risk.

**Key Metrics**:
- Test file count: 209 → 109 files (48% reduction)
- CI time: 15 min → 8 min (47% faster)
- Annual savings: 607 hours/year = $72,140/year
- Investment: 23 hours = $2,300
- ROI: 31x return (3,135%)

**Complete Architecture**: See ADRs listed in frontmatter above

---

## Technology Stack

- **Language**: TypeScript 5.x
- **Test Framework**: Vitest (migrated from Jest 2025-11-17)
- **Test Runner**: Node.js 20 LTS
- **Shell Scripts**: Bash 5.x (cleanup automation)
- **CI/CD**: GitHub Actions
- **Test Utilities**: `tests/test-utils/isolated-test-dir.ts` (existing)
- **Mock Factories**: `tests/test-utils/mock-factories.ts` (to create)

---

## Architecture Overview

**Target Structure** (4 semantic categories + shared infrastructure):

```
tests/
├── integration/                 # Component interaction tests
│   ├── core/                    # 44 subdirectories (core framework)
│   ├── external-tools/          # Third-party integrations
│   ├── features/                # 20 subdirectories (plugin features)
│   └── generators/              # Code generation
│
├── e2e/                         # End-to-end user workflows
├── unit/                        # Pure logic tests
│
├── fixtures/                    # ➕ NEW: Shared test data
│   ├── increments/
│   ├── github/
│   ├── ado/
│   ├── jira/
│   └── living-docs/
│
└── test-utils/                  # Test utilities
    ├── isolated-test-dir.ts     # ✅ EXISTING
    └── mock-factories.ts        # ➕ NEW
```

**Key Principles**:
1. **Semantic Categorization**: core, features, external-tools, generators
2. **Single Source of Truth**: No flat duplicates
3. **Isolation First**: All tests use isolated temp directories
4. **DRY Compliance**: Shared fixtures and mock factories

**See**: [ADR-0042-01](../../docs/internal/architecture/adr/0042-01-test-structure-standardization.md)

---

## Technical Decisions (with ADR references)

### Decision 1: Delete Flat Duplicates vs Migrate

**Decision**: DELETE all 62 flat duplicate directories

**Why**: Tests already exist in categorized structure. Migration would waste 10+ hours updating import paths. Deletion is faster (2 hours) and cleaner.

**Automated Tool**: `.specweave/increments/0041/scripts/cleanup-duplicate-tests.sh`

**See**: [ADR-0042-01](../../docs/internal/architecture/adr/0042-01-test-structure-standardization.md)

### Decision 2: Eliminate ALL process.cwd() Usages (CRITICAL)

**Decision**: Replace ALL 213 process.cwd() usages with createIsolatedTestDir()

**Why**: Historical incident (2025-11-17) - Test deleted 1,200+ files from project .specweave/. Catastrophic deletion risk is unacceptable.

**Enforcement**: Eslint rule + pre-commit hook + CI check (multi-layer defense)

**See**: [ADR-0042-02](../../docs/internal/architecture/adr/0042-02-test-isolation-enforcement.md)

### Decision 3: Shared Fixtures + Mock Factories

**Decision**: Create shared fixtures (20+ files) + TypeScript mock factories (4+ classes)

**Why**: ~200 duplicate test data blocks. DRY violation. Hard to maintain (update 50+ files for API changes). Mock factories provide type safety.

**See**: [ADR-0042-03](../../docs/internal/architecture/adr/0042-03-fixture-architecture.md)

### Decision 4: .test.ts Standard (No .spec.ts)

**Decision**: Standardize ALL tests to `.test.ts` extension

**Why**: Industry standard (Jest, Vitest, Mocha). Integration/unit tests already use `.test.ts`. Simpler glob patterns.

**See**: [ADR-0042-04](../../docs/internal/architecture/adr/0042-04-naming-convention-test-only.md)

---

## Implementation Phases (4 phases, 23 hours total)

### Phase 1: Delete Duplicate Directories (CRITICAL - 4 hours)

**Goal**: Immediate 48% test file reduction

**Risk**: IRREVERSIBLE deletion - backup required

#### Step 1.1: Create Safety Backup (5 min)

```bash
# Create backup branch with timestamp
git checkout -b test-cleanup-backup-$(date +%Y%m%d-%H%M)
git add .
git commit -m "chore: backup before test cleanup (increment-0042)"

# Document baseline
echo "Baseline test count: $(find tests/integration -name '*.test.ts' | wc -l)" > cleanup-baseline.txt
echo "Baseline directory count: $(find tests/integration -maxdepth 1 -type d | wc -l)" >> cleanup-baseline.txt
cat cleanup-baseline.txt

# Return to working branch
git checkout develop
```

**Validation**:
```bash
git branch | grep test-cleanup-backup
# Should show backup branch
```

#### Step 1.2: Verify Categorized Structure Completeness (30 min)

**CRITICAL**: Ensure no unique tests exist in flat structure before deletion

```bash
# Verify categorized structure exists
for dir in core features external-tools generators; do
  if [ ! -d "tests/integration/$dir" ]; then
    echo "❌ ERROR: Missing categorized directory: $dir"
    exit 1
  fi
done

# Count tests in categorized structure
CATEGORIZED_COUNT=$(find tests/integration/{core,features,external-tools,generators} -name "*.test.ts" | wc -l | tr -d ' ')
echo "Categorized tests: $CATEGORIZED_COUNT"

# Should be ~109 (all tests present)
if [ $CATEGORIZED_COUNT -lt 100 ]; then
  echo "❌ ERROR: Expected 100+ tests, found $CATEGORIZED_COUNT"
  exit 1
fi

echo "✅ Verification passed - safe to proceed"
```

#### Step 1.3: Run Automated Cleanup Script (10 min)

**Use existing cleanup script** (already tested):

```bash
# Run cleanup script from increment 0041
bash .specweave/increments/0041-living-docs-test-fixes/scripts/cleanup-duplicate-tests.sh

# Script will:
# 1. Verify categorized structure exists
# 2. Count duplicate directories (62 expected)
# 3. Prompt for confirmation ("DELETE" in caps)
# 4. Delete flat duplicates
# 5. Verify only categorized structure remains
# 6. Run tests to verify nothing broken
```

**Expected Output**:
```
✅ Verification passed - safe to proceed with cleanup
Found 62 flat directories to delete
⚠️  Type 'DELETE' (in caps) to proceed...
```

**Validation After Cleanup**:
```bash
# Verify only 7 directories remain
find tests/integration -maxdepth 1 -type d | wc -l
# Expected: 7 (integration/ + core/ + features/ + external-tools/ + generators/ + commands/ + deduplication/)

# Verify test count
find tests/integration/{core,features,external-tools,generators} -name "*.test.ts" | wc -l
# Expected: ~109 files

# All tests must pass
npm run test:integration
```

#### Step 1.4: Update Documentation (1 hour)

**Update `tests/integration/README.md`**:

```markdown
# Integration Tests

## Directory Structure

Tests are organized into **four semantic categories**:

### 1. Core Tests (`tests/integration/core/`)
Core SpecWeave framework functionality (44 subdirectories)

### 2. External Tools (`tests/integration/external-tools/`)
Third-party service integrations (ado/, github/, jira/, kafka/)

### 3. Features (`tests/integration/features/`)
Plugin features (20 subdirectories)

### 4. Generators (`tests/integration/generators/`)
Code generation (backend/, frontend/)

## Running Tests

```bash
npm run test:integration          # All integration tests
npx vitest tests/integration/core/ # Specific category
```

## Adding New Tests

**CRITICAL**: ALL new tests MUST use categorized structure:

```bash
# ✅ CORRECT:
tests/integration/core/my-feature/my-feature.test.ts

# ❌ WRONG (will be rejected):
tests/integration/my-feature/my-feature.test.ts
```

**Test Isolation**: Use `createIsolatedTestDir()`:

```typescript
import { createIsolatedTestDir } from '../../test-utils/isolated-test-dir';

test('my test', async () => {
  const { testDir, cleanup } = await createIsolatedTestDir('my-test');
  try {
    // Use testDir (NOT process.cwd()!)
  } finally {
    await cleanup(); // ALWAYS cleanup
  }
});
```
```

#### Step 1.5: Commit Changes (15 min)

```bash
git add tests/integration/
git add .specweave/increments/0042-test-infrastructure-cleanup/

git commit -m "chore: remove duplicate test directories (increment 0042)

- Delete 62 duplicate test directories (48% reduction)
- Test count: 209 → 109 files
- CI time: ~15 min → ~8 min (47% faster)
- Annual savings: 607 hours (25 days/year)

Closes: US-001 (Eliminate Duplicate Test Directories)
Ref: .specweave/increments/0041/reports/ULTRATHINK-TEST-DUPLICATION-ANALYSIS-2025-11-18.md
"

# Final validation
npm run test:all
```

**Success Criteria** (US-001):
- [ ] AC-US1-01: 7 directories remain in `tests/integration/`
- [ ] AC-US1-02: No flat directories exist
- [ ] AC-US1-03: All integration tests pass (100%)
- [ ] AC-US1-04: CI time reduced by 40%+
- [ ] AC-US1-05: Cleanup script executed with zero errors

---

### Phase 2: Standardize E2E Naming (HIGH - 3-4 hours)

**Goal**: 100% consistent naming (.test.ts only)

**Risk**: Low (git mv preserves history)

#### Step 2.1: Rename E2E Tests (.spec.ts → .test.ts) (1 hour)

```bash
cd tests/e2e/

# Rename all .spec.ts files
for file in *.spec.ts workflow/*.spec.ts 2>/dev/null; do
  if [ -f "$file" ]; then
    NEW_NAME="${file%.spec.ts}.test.ts"
    echo "Renaming: $file → $NEW_NAME"
    git mv "$file" "$NEW_NAME"
  fi
done

# Verify no .spec.ts files remain
REMAINING=$(find . -name "*.spec.ts" | wc -l | tr -d ' ')
if [ $REMAINING -ne 0 ]; then
  echo "⚠️  WARNING: $REMAINING .spec.ts files still exist"
  find . -name "*.spec.ts"
  exit 1
fi

echo "✅ All E2E tests renamed to .test.ts"
cd ../..
```

**Validation**:
```bash
find tests/e2e -name "*.spec.ts" | wc -l
# Expected: 0

npm run test:e2e
# All tests must pass
```

#### Step 2.2: Move Misplaced Kafka Tests (30 min)

**Analysis**: `tests/e2e/complete-workflow.test.ts` is Kafka integration test, NOT E2E

```bash
# Create directory if needed
mkdir -p tests/integration/external-tools/kafka/workflows

# Move test file
git mv tests/e2e/complete-workflow.test.ts \
       tests/integration/external-tools/kafka/workflows/complete-workflow.test.ts

# Fix import paths (remove one level: ../../ → ../../../)
sed -i.bak "s|from '../../src/|from '../../../src/|g" \
  tests/integration/external-tools/kafka/workflows/complete-workflow.test.ts

sed -i.bak "s|from '../../utils/|from '../../../utils/|g" \
  tests/integration/external-tools/kafka/workflows/complete-workflow.test.ts

# Remove backup files
rm tests/integration/external-tools/kafka/workflows/*.bak

# Verify test runs
npx vitest tests/integration/external-tools/kafka/workflows/complete-workflow.test.ts
```

#### Step 2.3: Update Test Configs (30 min)

**Update `vitest.config.ts`**:

```typescript
export default defineConfig({
  test: {
    include: [
      'tests/**/*.test.ts',  // ✅ ONLY .test.ts
    ],
    exclude: [
      'tests/**/*.spec.ts',  // ❌ NEVER .spec.ts
      'node_modules/**',
    ],
  },
});
```

#### Step 2.4: Create E2E README (30 min)

**Create `tests/e2e/README.md`**:

```markdown
# E2E Tests

## Naming Convention

**REQUIRED**: All E2E tests MUST use `.test.ts` extension

## Running Tests

```bash
npm run test:e2e                           # All E2E tests
npx vitest tests/e2e/workflow/             # Specific workflow
```

## E2E vs Integration

E2E tests should test **complete user workflows**:
- CLI commands (`specweave init`, `/specweave:increment`)
- Multiple SpecWeave components
- End-to-end data flow

**NOT E2E**: Component-level integration tests belong in `tests/integration/`
```

#### Step 2.5: Commit Changes (15 min)

```bash
git add tests/e2e/
git add tests/integration/external-tools/kafka/
git add vitest.config.ts

git commit -m "chore: standardize E2E naming (increment 0042)

- Rename all .spec.ts → .test.ts (21 files)
- Move Kafka tests to integration
- Update test configs to .test.ts pattern only
- Document naming standard

Closes: US-002 (Standardize E2E Test Naming)
"

npm run test:all
```

**Success Criteria** (US-002):
- [ ] AC-US2-01: Zero `.spec.ts` files in E2E
- [ ] AC-US2-02: Test configs use `.test.ts` only
- [ ] AC-US2-03: README.md documents standard
- [ ] AC-US2-04: All renamed tests pass

---

### Phase 3: Fix Test Isolation (CRITICAL - 10-15 hours)

**Goal**: Eliminate 213 unsafe process.cwd() patterns

**Risk**: Medium (requires careful refactoring)

#### Step 3.1: Audit All process.cwd() Usages (1 hour)

```bash
# Find all process.cwd() usages
grep -rn "process.cwd()" tests/ --include="*.test.ts" > unsafe-tests-audit.txt

UNSAFE_COUNT=$(cat unsafe-tests-audit.txt | wc -l | tr -d ' ')
echo "Total unsafe usages: $UNSAFE_COUNT"

# Categorize by danger level
grep -B3 -A3 "fs.rm.*recursive" tests/ -r --include="*.test.ts" > unsafe-tests-high-danger.txt
HIGH_DANGER=$(grep -c "\.test\.ts:" unsafe-tests-high-danger.txt || echo "0")

echo "🔴 High Danger (deletes directories): $HIGH_DANGER tests"
echo "📄 Full audit saved to: unsafe-tests-audit.txt"

# Review top 10 most dangerous
head -20 unsafe-tests-high-danger.txt
```

#### Step 3.2: Fix Top 10 Most Dangerous Tests (4-6 hours)

**Migration Pattern**:

```typescript
// BEFORE (DANGEROUS):
import * as path from 'path';

test('my test', async () => {
  const projectRoot = process.cwd();
  const testPath = path.join(projectRoot, '.specweave');
  await fs.rm(testPath, { recursive: true }); // ⚠️ DELETES PROJECT!
});

// AFTER (SAFE):
import * as path from 'path';
import { createIsolatedTestDir } from '../../test-utils/isolated-test-dir';

test('my test', async () => {
  const { testDir, cleanup } = await createIsolatedTestDir('my-test');
  try {
    const testPath = path.join(testDir, '.specweave');
    // Test code
  } finally {
    await cleanup(); // ✅ SAFE - only deletes /tmp/
  }
});
```

**Process** (for each dangerous test):
1. Read unsafe-tests-high-danger.txt
2. For each test file:
   - Add import: `createIsolatedTestDir`
   - Replace `process.cwd()` with `testDir`
   - Wrap in try/finally with cleanup
   - Test passes: `npx vitest path/to/test.test.ts`
   - Commit: `git commit -m "fix: safe isolation for <test-name>"`

#### Step 3.3: Batch Migrate Remaining Tests (4-6 hours)

**Semi-automated approach**:

```bash
# For each remaining test (after top 10)
while read -r line; do
  TEST_FILE=$(echo "$line" | cut -d':' -f1)
  echo "🔧 Fixing: $TEST_FILE"

  # Manual fix required:
  # 1. Add createIsolatedTestDir import
  # 2. Replace process.cwd() with testDir
  # 3. Add try/finally with cleanup

  # Test after fix
  npx vitest "$TEST_FILE"

  # Commit if passing
  if [ $? -eq 0 ]; then
    git add "$TEST_FILE"
    git commit -m "fix: safe test isolation for $(basename $TEST_FILE .test.ts)"
  fi
done < <(tail -n +11 unsafe-tests-audit.txt)
```

#### Step 3.4: Add ESLint Rule (30 min)

**Update `.eslintrc.js`**:

```javascript
module.exports = {
  // ... existing config
  overrides: [
    {
      files: ['tests/**/*.test.ts'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: 'CallExpression[callee.object.name="process"][callee.property.name="cwd"]',
            message: '🚨 DANGER: process.cwd() in tests can delete .specweave/! Use createIsolatedTestDir() instead. See CLAUDE.md',
          },
        ],
      },
    },
  ],
};
```

**Test Rule**:
```bash
# Create test file with process.cwd()
echo 'const x = process.cwd();' > tests/eslint-test.test.ts

# Should FAIL
npx eslint tests/eslint-test.test.ts

# Clean up
rm tests/eslint-test.test.ts
```

#### Step 3.5: Update Pre-commit Hook (30 min)

```bash
cat >> .git/hooks/pre-commit << 'EOF'

# Block process.cwd() in test files
if git diff --cached --name-only | grep -E "tests/.*\.test\.ts$"; then
  if git diff --cached | grep -E "process\.cwd\(\)"; then
    echo "❌ ERROR: process.cwd() in tests!"
    echo "🚨 Use createIsolatedTestDir() instead"
    exit 1
  fi
fi
EOF

chmod +x .git/hooks/pre-commit
```

#### Step 3.6: Commit Phase 3 Changes (30 min)

```bash
git add .eslintrc.js .git/hooks/pre-commit tests/

git commit -m "feat: enforce safe test isolation (increment 0042)

- Migrate 213 tests to createIsolatedTestDir()
- Add ESLint rule to block process.cwd()
- Update pre-commit hook
- Eliminate catastrophic deletion risk

Closes: US-003 (Fix Dangerous Test Isolation)
Related: 2025-11-17 deletion incident
"

npm run test:all
npx eslint tests/
```

**Success Criteria** (US-003):
- [ ] AC-US3-01: Zero process.cwd() in tests
- [ ] AC-US3-02: 100% use createIsolatedTestDir()
- [ ] AC-US3-03: ESLint rule blocks process.cwd()
- [ ] AC-US3-04: Pre-commit hook blocks unsafe commits
- [ ] AC-US3-05: All cleanup operations verified safe

---

### Phase 4: Fixtures & Prevention (MEDIUM - 5-8 hours)

**Goal**: Create shared infrastructure + prevention

**Risk**: Low (additive changes)

#### Step 4.1: Create Fixtures Directory (30 min)

```bash
mkdir -p tests/fixtures/{increments,github,ado,jira,living-docs}

# Create increment fixtures (3 examples)
cat > tests/fixtures/increments/minimal.json << 'EOF'
{
  "id": "0001",
  "name": "test-increment",
  "status": "active",
  "type": "feature",
  "priority": "P1",
  "metadata": {
    "created": "2025-01-01T00:00:00Z",
    "updated": "2025-01-01T00:00:00Z"
  }
}
EOF

# Create GitHub fixtures (2 examples)
cat > tests/fixtures/github/issue.json << 'EOF'
{
  "number": 123,
  "title": "Test Issue",
  "state": "open",
  "body": "Test description"
}
EOF

# Create ADO, Jira, living-docs fixtures
# (See ADR-0042-03 for complete fixture list)

# Verify fixture count
find tests/fixtures -type f | wc -l
# Expected: 8+ files
```

#### Step 4.2: Create Mock Factories (2-3 hours)

**Create `tests/test-utils/mock-factories.ts`**:

```typescript
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

  static createMetadata(overrides?: any): any {
    return {
      created: new Date('2025-01-01T00:00:00Z'),
      updated: new Date('2025-01-01T00:00:00Z'),
      ...overrides,
    };
  }
}

export class GitHubFactory {
  static createIssue(overrides?: any): any {
    return {
      number: 123,
      title: 'Test Issue',
      state: 'open',
      body: 'Test description',
      ...overrides,
    };
  }
}

// ADOFactory, JiraFactory (see ADR-0042-03 for complete implementation)
```

**Test Factories**:
```bash
npx tsc --noEmit tests/test-utils/mock-factories.ts
```

#### Step 4.3: Migrate 20 Tests to Fixtures (2-3 hours)

**Example Migration**:

```typescript
// BEFORE:
test('should create increment', () => {
  const increment = {
    id: '0001',
    name: 'test-increment',
    // ... 20 fields
  };
});

// AFTER:
import { IncrementFactory } from '../../test-utils/mock-factories';

test('should create increment', () => {
  const increment = IncrementFactory.create();
});
```

**Process**:
- Migrate tests in `tests/integration/core/living-docs/` (most reused increment data)
- Migrate tests in `tests/integration/external-tools/github/` (most reused GitHub data)
- Commit after each 5-10 test migrations

#### Step 4.4: Add CI Checks (1 hour)

**Update `.github/workflows/test.yml`**:

```yaml
jobs:
  test-structure:
    name: Validate Test Structure
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Check for flat test structure
        run: |
          FLAT_DIRS=$(find tests/integration -maxdepth 1 -type d \
            -not -name "tests" -not -name "integration" \
            -not -name "core" -not -name "features" \
            -not -name "external-tools" -not -name "generators" \
            -not -name "deduplication" -not -name "commands" | wc -l)

          if [ $FLAT_DIRS -gt 0 ]; then
            echo "❌ ERROR: Flat test structure detected"
            exit 1
          fi

      - name: Check for unsafe patterns
        run: |
          if grep -r "process.cwd()" tests/ --include="*.test.ts"; then
            echo "❌ ERROR: process.cwd() in tests"
            exit 1
          fi

      - name: Check E2E naming
        run: |
          if find tests/e2e -name "*.spec.ts" | grep -q .; then
            echo "❌ ERROR: .spec.ts files in E2E"
            exit 1
          fi
```

#### Step 4.5: Commit Phase 4 Changes (30 min)

```bash
git add tests/fixtures/ tests/test-utils/mock-factories.ts .github/workflows/

git commit -m "feat: shared fixtures and prevention (increment 0042)

- Create fixtures directory (20+ templates)
- Create mock factories (4+ classes)
- Migrate 20 tests to shared fixtures
- Add CI validation for structure/safety/naming

Closes: US-004 (Shared Fixtures)
Closes: US-005 (Prevention Measures)
"

npm run test:all
```

**Success Criteria** (US-004, US-005):
- [ ] AC-US4-01: Fixtures directory created
- [ ] AC-US4-02: 20+ fixture files
- [ ] AC-US4-03: 4+ mock factories
- [ ] AC-US4-04: 20+ tests migrated
- [ ] AC-US4-05: Duplicate data reduced 50%
- [ ] AC-US5-01: Pre-commit blocks flat structure
- [ ] AC-US5-02: CI detects duplicates
- [ ] AC-US5-03: ESLint enforces safety
- [ ] AC-US5-04: Test structure documented
- [ ] AC-US5-05: CONTRIBUTING.md updated

---

## Testing Strategy

### Validation Between Phases

```bash
# After Phase 1
npm run test:integration
find tests/integration -name "*.test.ts" | wc -l  # ~109

# After Phase 2
npm run test:e2e
find tests/e2e -name "*.spec.ts" | wc -l  # 0

# After Phase 3
npm run test:all
grep -r "process.cwd()" tests/ --include="*.test.ts" | wc -l  # 0

# After Phase 4
npm run test:all
find tests/fixtures -type f | wc -l  # 20+
```

### Performance Validation

```bash
# Measure CI time reduction
time npm run test:integration
# Before: ~15 minutes
# After: ~8 minutes (47% faster)
```

---

## Risk Mitigation

### Risk 1: Accidental Deletion of Unique Tests
- **Mitigation**: Backup branch, completeness verification, dry-run mode
- **Contingency**: `git checkout test-cleanup-backup`

### Risk 2: Breaking Tests During Migration
- **Mitigation**: Top 10 first, test individually, full suite before commit
- **Contingency**: `git revert HEAD`

### Risk 3: ESLint/Hook False Positives
- **Mitigation**: Test with known patterns, allow `eslint-disable` with justification
- **Contingency**: `// eslint-disable-next-line -- legitimate use case`

### Risk 4: CI Time Not Reduced as Expected
- **Mitigation**: Baseline measurement, bottleneck analysis
- **Contingency**: Additional optimizations (parallelization)

---

## Success Metrics Summary

**Quantitative**:
- Test file count: 209 → 109 (48% reduction)
- CI time: 15 min → 8 min (47% faster)
- Unsafe patterns: 213 → 0 (100% elimination)
- Annual savings: 607 hours = $72,140/year

**ROI**:
- Investment: 23 hours = $2,300
- Annual returns: 707 hours = $72,140
- ROI: 31x (3,135%)

---

## Validation Checklist

**Code Quality**:
- [ ] All tests pass
- [ ] No flat duplicates
- [ ] Zero process.cwd()
- [ ] All E2E use .test.ts
- [ ] ESLint passes

**Infrastructure**:
- [ ] 20+ fixtures created
- [ ] 4+ mock factories
- [ ] Pre-commit hook updated
- [ ] CI checks added

**Documentation**:
- [ ] README.md updated (integration + E2E)
- [ ] ADRs created
- [ ] CONTRIBUTING.md updated

**Metrics**:
- [ ] File count: 209 → 109
- [ ] CI time: 15 → 8 min
- [ ] Unsafe: 213 → 0
- [ ] Duplication: 48% → 0%

---

## Related Documentation

**Increment Files**:
- `spec.md` - User stories & acceptance criteria
- `tasks.md` - Task breakdown with embedded tests

**Analysis Reports** (Increment 0041):
- ULTRATHINK-TEST-DUPLICATION-ANALYSIS-2025-11-18.md
- TEST-DATA-CONSISTENCY-ANALYSIS.md
- EXECUTIVE-SUMMARY-TEST-ANALYSIS-2025-11-18.md

**ADRs** (Architecture decisions):
- ADR-0042-01: Test Structure Standardization
- ADR-0042-02: Test Isolation Enforcement
- ADR-0042-03: Fixture Architecture
- ADR-0042-04: Naming Convention

**Tools**:
- Cleanup script: `.specweave/increments/0041/scripts/cleanup-duplicate-tests.sh`
- Test utilities: `tests/test-utils/isolated-test-dir.ts`

**Historical**:
- DELETION-ROOT-CAUSE-2025-11-17.md (Increment 0037)
- ACCIDENTAL-DELETION-RECOVERY-2025-11-17.md (Increment 0039)

---

**Implementation Plan Complete**: 2025-11-18
**Status**: Ready for implementation
**Estimated Effort**: 23 hours (4 phases)
**Expected ROI**: 31x return (707 hours/year saved)
**Next Steps**: Begin Phase 1 (Delete Duplicate Directories)
