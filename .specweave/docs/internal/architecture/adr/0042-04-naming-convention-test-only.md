# ADR-0042-04: Naming Convention (.test.ts Only)

**Date**: 2025-11-18
**Status**: Accepted
**Epic**: FS-25-11-18
**Increment**: 0042-test-infrastructure-cleanup

---

## Context

### Current State: Mixed Naming Conventions

**Ultrathink Analysis** (2025-11-18) discovered naming inconsistencies in E2E tests:

| Extension | Count | Percentage | Files |
|-----------|-------|------------|-------|
| `.spec.ts` | 21 | 78% | `ac-status-flow.spec.ts`, `ado-sync.spec.ts`, `github-sync-idempotency.spec.ts`, etc. |
| `.test.ts` | 6 | 22% | `complete-workflow.test.ts`, `strategic-init-scenarios.test.ts`, `bidirectional-sync.test.ts`, etc. |

**Comparison Across Test Types**:

| Test Type | Extension | Consistency |
|-----------|-----------|-------------|
| **Unit** | 100% `.test.ts` | ✅ Consistent |
| **Integration** | 100% `.test.ts` | ✅ Consistent |
| **E2E** | 78% `.spec.ts`, 22% `.test.ts` | ❌ Inconsistent |

**Developer Confusion**:
- "Should I use `.spec.ts` or `.test.ts` for my E2E test?"
- "What's the difference between `.spec` and `.test`?"
- "Do glob patterns need to match both extensions?"

---

## Decision

**Standardize ALL tests to `.test.ts` extension** - no exceptions.

**Rationale**:
1. **Industry Standard**: Jest, Vitest, Mocha all prefer `.test.ts`
2. **Consistency**: Integration and unit tests already use `.test.ts`
3. **Simpler Glob Patterns**: `**/*.test.ts` instead of `**/*.{spec,test}.ts`
4. **Clear Convention**: No ambiguity for contributors

**Migration Strategy**:
1. Rename all 21 E2E `.spec.ts` files to `.test.ts`
2. Use `git mv` to preserve file history
3. Update any import references (rare - tests don't import each other)
4. Update test runner configurations
5. Update documentation (README.md, CONTRIBUTING.md)

---

## Alternatives Considered

### Alternative 1: Standardize to .spec.ts

**Approach**: Rename all `.test.ts` files to `.spec.ts`

**Pros**:
- ✅ Less work (only 6 files to rename vs 21)
- ✅ Some teams prefer `.spec.ts` (RSpec, Jasmine heritage)

**Cons**:
- ❌ Goes against industry trend (Jest/Vitest prefer `.test.ts`)
- ❌ Requires renaming integration/unit tests too (100+ files)
- ❌ Less common in TypeScript ecosystem

**Why Not Chosen**: Industry standard is `.test.ts`. Majority of tests (integration + unit) already use `.test.ts`. Easier to rename 21 E2E files than 100+ integration/unit files.

### Alternative 2: Keep Both Extensions

**Approach**: Allow both `.spec.ts` and `.test.ts`

**Pros**:
- ✅ Zero migration effort
- ✅ No breaking changes

**Cons**:
- ❌ Perpetuates inconsistency
- ❌ Developer confusion continues
- ❌ More complex glob patterns (`**/*.{spec,test}.ts`)
- ❌ No clear convention for new tests

**Why Not Chosen**: Inconsistency creates cognitive load. Clear conventions reduce decisions and mistakes.

### Alternative 3: Use Different Extensions by Test Type

**Approach**:
- Unit tests: `.test.ts`
- Integration tests: `.integration.ts`
- E2E tests: `.e2e.ts`

**Pros**:
- ✅ Self-documenting (file extension indicates test type)
- ✅ Easier to filter by test type

**Cons**:
- ❌ Not industry standard (custom convention)
- ❌ Requires custom test runner configuration
- ❌ Verbose (`my-feature.e2e.ts` vs `my-feature.test.ts`)
- ❌ Directory structure already indicates type (`tests/e2e/`, `tests/integration/`)

**Why Not Chosen**: Directory structure already categorizes tests (`tests/unit/`, `tests/integration/`, `tests/e2e/`). Extension doesn't need to duplicate this information. Industry standard is simpler.

---

## Consequences

### Positive

- ✅ **100% consistency** across all test types
- ✅ **Industry standard** (Jest, Vitest, Mocha)
- ✅ **Simpler glob patterns** (`**/*.test.ts` only)
- ✅ **Clear convention** for new contributors
- ✅ **No ambiguity** (one extension, one pattern)

### Negative

- ❌ **21 files to rename** (30-60 minutes effort)
- ❌ **Potential import references to update** (rare)
- ❌ **Documentation updates required** (README.md, CONTRIBUTING.md)

### Risks & Mitigations

**Risk 1: Breaking import references**
- **Probability**: LOW (tests rarely import each other)
- **Impact**: LOW (test failures, easy to fix)
- **Mitigation 1**: Search for `.spec.ts` in imports before renaming
- **Mitigation 2**: Run tests after renaming batch
- **Contingency**: Update any broken imports manually

**Risk 2: CI/CD configurations need updating**
- **Probability**: MEDIUM
- **Impact**: LOW (easy fix)
- **Mitigation 1**: Check `vitest.config.ts` glob patterns
- **Mitigation 2**: Check GitHub Actions workflows
- **Mitigation 3**: Run CI after renaming
- **Contingency**: Update configurations if needed

---

## Implementation Strategy

### Phase 1: Rename Files (30-60 minutes)

```bash
cd tests/e2e/

# Batch rename using git mv (preserves history)
for file in *.spec.ts; do
  git mv "$file" "${file%.spec.ts}.test.ts"
done

# Verify renaming
find tests/e2e -name "*.spec.ts" | wc -l
# Expected: 0
```

**Files to Rename** (21 total):
```
ac-status-flow.spec.ts → ac-status-flow.test.ts
ado-sync.spec.ts → ado-sync.test.ts
archive-command.spec.ts → archive-command.test.ts
fix-duplicates-command.spec.ts → fix-duplicates-command.test.ts
github-sync-idempotency.spec.ts → github-sync-idempotency.test.ts
github-user-story-sync.spec.ts → github-user-story-sync.test.ts
increment-discipline.spec.ts → increment-discipline.test.ts
living-docs-sync-bidirectional.spec.ts → living-docs-sync-bidirectional.test.ts
... (13 more files)
```

### Phase 2: Update Import References (30 minutes)

```bash
# Check for any import references to .spec.ts files
grep -r "\.spec\.ts" tests/e2e/

# If found, update manually (unlikely - tests don't import each other)
```

### Phase 3: Update Test Configurations (30 minutes)

```bash
# Check vitest.config.ts
cat vitest.config.ts | grep "include"

# Should be: **/*.test.ts (not *.{spec,test}.ts)
# Update if needed:
# include: ['**/*.test.ts']
```

**GitHub Actions**:
```yaml
# .github/workflows/test.yml
# Verify glob patterns use **/*.test.ts
```

### Phase 4: Update Documentation (45 minutes)

**tests/e2e/README.md**:
```markdown
## Naming Convention

**ALL E2E tests use `.test.ts` extension** (NOT `.spec.ts`).

✅ CORRECT: `my-workflow.test.ts`
❌ WRONG: `my-workflow.spec.ts`

This maintains consistency with integration and unit tests.
```

**CONTRIBUTING.md**:
```markdown
## Test Naming Standards

**ALL tests use `.test.ts` extension**:
- Unit tests: `{component}.test.ts`
- Integration tests: `{feature}.test.ts`
- E2E tests: `{workflow}.test.ts`

**DO NOT use `.spec.ts`** - this extension is deprecated.
```

### Phase 5: Verify Tests Pass (30 minutes)

```bash
# Run E2E test suite
npm run test:e2e

# Verify test count
find tests/e2e -name "*.test.ts" | wc -l
# Expected: 26 (21 renamed + 6 existing - 1 moved to integration)

# Run full test suite
npm run test:all
# Expected: 100% success rate
```

---

## Validation Criteria

### Success Metrics

- ✅ E2E `.spec.ts` files: 21 → 0 (100% elimination)
- ✅ E2E `.test.ts` files: 6 → 26 (consistency achieved)
- ✅ Naming consistency: 78% → 100% (across all test types)
- ✅ Glob pattern simplicity: `**/*.{spec,test}.ts` → `**/*.test.ts`

### Acceptance Tests

```bash
# 1. Verify no .spec.ts files in E2E tests
find tests/e2e -name "*.spec.ts" | wc -l
# Expected: 0

# 2. Verify all E2E tests use .test.ts
find tests/e2e -name "*.test.ts" | wc -l
# Expected: 26 (or current count)

# 3. Verify no .spec.ts files anywhere in tests/
find tests -name "*.spec.ts" | wc -l
# Expected: 0 (100% consistency)

# 4. Verify all tests pass
npm run test:e2e
# Expected: 100% success rate

# 5. Verify test runner configuration
grep "include" vitest.config.ts | grep "test.ts"
# Expected: Pattern uses .test.ts only
```

---

## Industry Standards Reference

### Test Frameworks Using .test.ts

| Framework | Convention | Source |
|-----------|------------|--------|
| **Jest** | `.test.ts` | [Jest Docs](https://jestjs.io/docs/configuration#testmatch-arraystring) |
| **Vitest** | `.test.ts` | [Vitest Docs](https://vitest.dev/config/#include) |
| **Mocha** | `.test.ts` | [Mocha Docs](https://mochajs.org/#getting-started) |
| **Node.js** | `.test.js` | [Node.js Docs](https://nodejs.org/api/test.html#test-runner) |

**Default Glob Patterns**:
```javascript
// Jest default
testMatch: ['**/*.test.ts', '**/*.test.tsx']

// Vitest default
include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']

// Mocha default (CLI)
mocha "**/*.test.ts"
```

**Why .test.ts is preferred**:
1. **Alphabetical sorting**: Files with `.test.ts` appear next to their source files in editors
2. **Clarity**: Explicit "test" in name (no ambiguity)
3. **Common practice**: Most TypeScript projects use `.test.ts`
4. **Tool defaults**: Many tools default to `.test.ts` patterns

---

## Migration Timeline

**Total Time**: 2-3 hours

| Phase | Task | Time | Complexity |
|-------|------|------|------------|
| 1 | Rename 21 files | 30-60 min | Low |
| 2 | Update imports | 30 min | Low |
| 3 | Update configs | 30 min | Low |
| 4 | Update docs | 45 min | Low |
| 5 | Verify tests | 30 min | Medium |

**Schedule**:
- **Day 1**: Phases 1-3 (rename + update configs)
- **Day 1**: Phases 4-5 (document + verify)

---

## Related Decisions

- **ADR-0042-01**: Test Structure Standardization (delete flat duplicates)
- **ADR-0042-02**: Test Isolation Enforcement (eliminate process.cwd())
- **ADR-0042-03**: Fixture Architecture (shared test data)

---

## References

- **Analysis**: `.specweave/increments/0041/reports/ULTRATHINK-TEST-DUPLICATION-ANALYSIS-2025-11-18.md` (Part 2: E2E Test Naming)
- **Industry Standards**: Jest, Vitest, Mocha documentation
- **Current Inconsistency**: 21 `.spec.ts` files, 6 `.test.ts` files in E2E

---

**Decision Made**: 2025-11-18
**Decision Maker**: Architect Agent (Increment 0042)
**Review Status**: Approved
**Implementation Status**: Planned
