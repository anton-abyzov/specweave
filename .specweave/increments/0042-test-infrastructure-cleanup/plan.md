---
increment: 0042-test-infrastructure-cleanup
architecture_docs:
  - ../../docs/internal/architecture/adr/0042-01-test-structure-standardization.md
  - ../../docs/internal/architecture/adr/0042-02-test-isolation-enforcement.md
  - ../../docs/internal/architecture/adr/0042-03-fixture-architecture.md
  - ../../docs/internal/architecture/adr/0042-04-naming-convention-test-only.md
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

**Tasks**:
1. Create backup branch: `git checkout -b test-cleanup-backup-$(date +%Y%m%d)`
2. Verify categorized structure completeness: `find tests/integration/{core,features,external-tools,generators} -name "*.test.ts" | wc -l`
3. Run cleanup script: `bash .specweave/increments/0041/scripts/cleanup-duplicate-tests.sh`
4. Verify tests pass: `npm run test:integration`
5. Update README.md (categorized structure documentation)
6. Commit changes

**Success Criteria**:
- ✅ Test file count: 209 → 109 (48% reduction)
- ✅ All integration tests passing (100% success rate)
- ✅ CI time reduced to ~8 minutes

**Detailed Implementation**: [ADR-0042-01](../../docs/internal/architecture/adr/0042-01-test-structure-standardization.md) (Implementation Details section)

---

### Phase 2: Standardize E2E Naming (HIGH - 4 hours)

**Goal**: 100% consistent naming (.test.ts only)

**Tasks**:
1. Rename .spec.ts → .test.ts: `cd tests/e2e/ && for f in *.spec.ts; do git mv "$f" "${f%.spec.ts}.test.ts"; done`
2. Move Kafka tests to integration: `git mv tests/e2e/complete-workflow.test.ts tests/integration/external-tools/kafka/workflows/`
3. Update imports (adjust paths: `../../` → `../../../`)
4. Update test configs (vitest.config.ts glob patterns)
5. Update documentation (tests/e2e/README.md)
6. Verify tests pass: `npm run test:e2e`
7. Commit changes

**Success Criteria**:
- ✅ Zero .spec.ts files in E2E tests
- ✅ Kafka tests correctly categorized
- ✅ 100% naming consistency

**Detailed Implementation**: [ADR-0042-04](../../docs/internal/architecture/adr/0042-04-naming-convention-test-only.md) (Implementation Strategy section)

---

### Phase 3: Fix Test Isolation (CRITICAL - 10-15 hours)

**Goal**: Eliminate 213 unsafe process.cwd() patterns

**Tasks**:
1. **Audit** (1-2 hours): `grep -rn "process.cwd()" tests/ --include="*.test.ts" > audit.txt`
2. **Fix Top 10 Dangerous** (4-6 hours): Tests that delete directories (highest risk)
3. **Batch Migrate Remaining** (4-6 hours): Replace process.cwd() with createIsolatedTestDir()
4. **Add Eslint Rule** (1 hour): Block process.cwd() in tests
5. **Update Pre-commit Hook** (30 min): Block unsafe commits
6. **Verify All Safe** (1-2 hours): Audit fs.rm() calls for isolation
7. **Run Full Suite** (30 min): `npm run test:all`
8. Commit changes

**Migration Pattern**:
```typescript
// BEFORE (DANGEROUS):
const testPath = path.join(process.cwd(), '.specweave', 'increments');
await fs.rm(testPath, { recursive: true }); // DELETES PROJECT!

// AFTER (SAFE):
import { createIsolatedTestDir } from '../test-utils/isolated-test-dir';
const { testDir, cleanup } = await createIsolatedTestDir('my-test');
try {
  const testPath = path.join(testDir, '.specweave', 'increments');
  // Test code
} finally {
  await cleanup(); // Cleans up /tmp/, not project
}
```

**Success Criteria**:
- ✅ Zero process.cwd() usages in tests
- ✅ 100% tests use createIsolatedTestDir() or os.tmpdir()
- ✅ Eslint rule + pre-commit hook active

**Detailed Implementation**: [ADR-0042-02](../../docs/internal/architecture/adr/0042-02-test-isolation-enforcement.md) (Implementation Strategy section)

---

### Phase 4: Fixtures & Prevention (MEDIUM - 5-8 hours)

**Goal**: Create shared infrastructure + multi-layer prevention

**Tasks**:
1. **Create Fixtures Structure** (15 min): `mkdir -p tests/fixtures/{increments,github,ado,jira,living-docs}`
2. **Create Fixtures** (4-5 hours):
   - Increment fixtures (5 files): minimal.json, multi-project.json, completed.json, with-tasks.json, archived.json
   - GitHub fixtures (4 files): issue.json, create-issue.json, list-issues.json, user-story.json
   - ADO fixtures (2 files): work-item.json, create-work-item.json
   - Jira fixtures (2 files): issue.json, create-issue.json
   - Living docs fixtures (5 files): user-story.md, architecture.md, operations.md, adr.md
3. **Create Mock Factories** (2-3 hours): IncrementFactory, GitHubFactory, ADOFactory, JiraFactory
4. **Migrate 20 Tests** (2-3 hours): Replace inline data with fixtures/factories
5. **Add CI Check** (30 min): Detect flat test structure creation
6. **Update CONTRIBUTING.md** (1 hour): Test best practices
7. Commit changes

**Mock Factory Example**:
```typescript
// tests/test-utils/mock-factories.ts
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
}

// Usage in tests:
const increment = IncrementFactory.create({ id: '0042' });
```

**Success Criteria**:
- ✅ 20+ fixture files created
- ✅ 4+ mock factories created
- ✅ 20+ tests migrated
- ✅ CI check active

**Detailed Implementation**: [ADR-0042-03](../../docs/internal/architecture/adr/0042-03-fixture-architecture.md) (Implementation Strategy section)

---

## Testing Strategy

### Pre-Cleanup Validation

```bash
# 1. Verify categorized structure completeness
find tests/integration/{core,features,external-tools,generators} -name "*.test.ts" | wc -l
# Expected: ~109 (all tests present)

# 2. Run full test suite
npm run test:all
# All tests must pass before proceeding

# 3. Create backup branch
git checkout -b test-cleanup-backup-$(date +%Y%m%d)
```

### Incremental Testing (After Each Phase)

```bash
# Phase 1: Delete duplicates
npm run test:integration
find tests/integration -name "*.test.ts" | wc -l
# Expected: ~109 files, 100% passing

# Phase 2: Rename E2E
npm run test:e2e
find tests/e2e -name "*.spec.ts" | wc -l
# Expected: 0 .spec.ts files

# Phase 3: Fix isolation
npm run test:all
grep -r "process.cwd()" tests/ --include="*.test.ts" | wc -l
# Expected: 0 usages

# Phase 4: Fixtures
npm run test:all
find tests/fixtures -type f | wc -l
# Expected: 20+ fixtures
```

### Performance Validation

```bash
# Measure CI time reduction
time npm run test:integration
# Baseline: ~15 minutes
# Target: ~8 minutes (47% faster)
```

---

## Risk Mitigation

### Risk 1: Accidental Deletion of Unique Tests
- **Mitigation**: Backup branch, automated script validation, ultrathink analysis verified completeness
- **Contingency**: Restore from backup branch

### Risk 2: Breaking Tests During Migration
- **Mitigation**: Migrate top 10 dangerous first, test individually, full suite before commit
- **Contingency**: Git revert if tests fail

### Risk 3: Eslint/Hook False Positives
- **Mitigation**: Test rules with known patterns, allow eslint-disable with justification
- **Contingency**: `// eslint-disable-next-line -- legitimate use case`

### Risk 4: CI Time Not Reduced as Expected
- **Mitigation**: Baseline measurement, post-cleanup measurement, analyze bottlenecks
- **Contingency**: Additional optimizations (parallelization, caching)

---

## Success Metrics Summary

### Quantitative Metrics:

**Test Infrastructure Efficiency**:
- ✅ Test file count: 209 → 109 files (48% reduction)
- ✅ CI test time: 15 min → 8 min (47% faster)
- ✅ Annual CI savings: 607 hours/year = $12,140

**Safety & Quality**:
- ✅ Unsafe test patterns: 213 → 0 (100% elimination)
- ✅ Shared fixtures: 0 → 20+ (eliminates ~150 duplicates)
- ✅ Deletion risk: CRITICAL → ZERO

**Prevention Effectiveness**:
- ✅ Pre-commit hook: Blocks 100% of flat structure creation
- ✅ CI validation: Blocks 100% of PRs with duplicates
- ✅ Eslint enforcement: Blocks 100% of unsafe patterns

**ROI**:
- Investment: 23 hours = $2,300
- Annual returns: 707 hours = $72,140/year
- ROI: 31x return (3,135%)

---

## Validation Checklist

Before marking increment complete:

### Code Quality:
- [ ] All tests pass (`npm run test:all`)
- [ ] No flat duplicate directories exist
- [ ] Zero process.cwd() usages in tests
- [ ] All E2E tests use `.test.ts` extension
- [ ] Eslint passes with no warnings

### File Structure:
- [ ] Only categorized structure exists (core/, features/, external-tools/, generators/)
- [ ] 20+ fixture files created
- [ ] 4+ mock factories created
- [ ] Test count reduced to ~109 files

### Documentation:
- [ ] README.md updated (integration + E2E)
- [ ] CONTRIBUTING.md updated
- [ ] ADRs created for all decisions
- [ ] Cleanup script documented

### Infrastructure:
- [ ] Shared fixtures directory created
- [ ] Mock factories implemented
- [ ] Pre-commit hook updated
- [ ] CI duplicate detection added
- [ ] Eslint rule active

### Metrics:
- [ ] Test file count: 209 → 109 (48% reduction)
- [ ] CI time: 15 min → 8 min (47% faster)
- [ ] Unsafe patterns: 213 → 0 (100% elimination)
- [ ] Test duplication: 48% → 0% (100% elimination)

---

## Related Documentation

### Increment Documentation:
- **Spec**: `.specweave/increments/0042-test-infrastructure-cleanup/spec.md`
- **Tasks**: `.specweave/increments/0042-test-infrastructure-cleanup/tasks.md`

### Analysis Reports (Increment 0041):
- **ULTRATHINK-TEST-DUPLICATION-ANALYSIS-2025-11-18.md** (62 KB, 10 parts)
- **TEST-DATA-CONSISTENCY-ANALYSIS.md** (15 KB, 7 parts)
- **EXECUTIVE-SUMMARY-TEST-ANALYSIS-2025-11-18.md**

### Architecture Decision Records:
- **ADR-0042-01**: Test Structure Standardization (delete flat duplicates)
- **ADR-0042-02**: Test Isolation Enforcement (eliminate process.cwd())
- **ADR-0042-03**: Fixture Architecture (shared fixtures + mock factories)
- **ADR-0042-04**: Naming Convention (.test.ts only)

### Code Files:
- **Cleanup Script**: `.specweave/increments/0041/scripts/cleanup-duplicate-tests.sh`
- **Test Utilities**: `tests/test-utils/isolated-test-dir.ts`
- **Mock Factories**: `tests/test-utils/mock-factories.ts` (to be created)

### Historical Incidents:
- **DELETION-ROOT-CAUSE-2025-11-17.md** (Increment 0037)
- **ACCIDENTAL-DELETION-RECOVERY-2025-11-17.md** (Increment 0039)

---

**Implementation Plan Complete**: 2025-11-18
**Status**: Ready for implementation
**Estimated Effort**: 23 hours (4 phases)
**Expected ROI**: 31x return (707 hours/year saved)
**Next Steps**: Begin Phase 1 (Delete Duplicate Directories)
