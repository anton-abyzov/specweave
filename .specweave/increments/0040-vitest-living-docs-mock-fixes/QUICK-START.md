# Quick Start: Increment 0040

**Fix Vitest Migration Issues in Living Docs Tests**

## TL;DR

Fix 210 failing tests by replacing invalid `anyed<>` mock syntax with `vi.mocked()` in 5 test files.

**Time**: 9 hours | **Risk**: Low | **Impact**: 100% test pass rate

---

## The Problem

```typescript
// ❌ CURRENT (Breaks)
const mockFs = fs as anyed<typeof fs> & {
  existsSync: anyedFunction<typeof fs.existsSync>;
};
mockFs.existsSync.mockReturnValue(true);

// ✅ FIX (Works)
const mockExistsSync = vi.mocked(fs.existsSync);
mockExistsSync.mockReturnValue(true);
```

---

## Affected Files

1. **tests/unit/living-docs/cross-linker.test.ts** - 5 failures
2. **tests/unit/living-docs/project-detector.test.ts** - 4 failures
3. **tests/unit/living-docs/content-distributor.test.ts** - 3 failures
4. **tests/unit/living-docs/three-layer-sync.test.ts** - 4 failures
5. **tests/unit/living-docs/hierarchy-mapper-project-detection.test.ts** - 1 failure

**Total**: 17 failing tests → Fix to 0 failures

---

## Tasks (5 Tasks, 9 Hours)

| Task | File | Time | Action |
|------|------|------|--------|
| **T-001** | cross-linker.test.ts | 2h | Fix 5 mocks |
| **T-002** | project-detector.test.ts | 2h | Fix 6 mocks + execSync |
| **T-003** | content-distributor.test.ts | 2h | Fix 6 mocks |
| **T-004** | three-layer-sync + hierarchy | 2h | Fix execSync + mocks |
| **T-005** | Validation | 1h | Run full suite |

---

## Execution Plan

### Step 1: Fix First File (T-001)
```bash
# 1. Open file
vim tests/unit/living-docs/cross-linker.test.ts

# 2. Replace mock syntax (see tasks.md T-001 for details)

# 3. Test
npm run test:unit -- tests/unit/living-docs/cross-linker.test.ts

# 4. Verify passes ✅
```

### Step 2: Repeat for T-002, T-003, T-004
Same pattern, different files.

### Step 3: Final Validation (T-005)
```bash
# Run full suite
npm run test:unit -- tests/unit/living-docs/

# Should see: 0 failures
```

---

## Verification Commands

```bash
# Test specific file
npm run test:unit -- tests/unit/living-docs/<filename>

# Test entire living-docs suite
npm run test:unit -- tests/unit/living-docs/

# Check coverage
npm run test:coverage -- tests/unit/living-docs/

# Full build check
npm run build
```

---

## Success Criteria

- ✅ All living-docs tests pass (0 failures)
- ✅ Coverage ≥80%
- ✅ No TypeScript errors
- ✅ CI/CD pipeline green

---

## Common Mock Pattern

**Before** (Invalid):
```typescript
vi.mock('fs-extra');
const mockFs = fs as anyed<typeof fs>;
mockFs.existsSync.mockReturnValue(true);
```

**After** (Vitest):
```typescript
vi.mock('fs-extra');
const mockExistsSync = vi.mocked(fs.existsSync);
mockExistsSync.mockReturnValue(true);
```

---

## File Locations

- **spec.md**: User stories + acceptance criteria
- **plan.md**: Technical architecture + strategy
- **tasks.md**: Detailed task breakdown (5 tasks)
- **reports/GENERATION-SUMMARY.md**: Full analysis

---

## Emergency Rollback

```bash
# Rollback single file
git checkout tests/unit/living-docs/<filename>

# Rollback entire increment
git checkout .specweave/increments/0040-vitest-living-docs-mock-fixes/
git checkout tests/unit/living-docs/
```

---

## Expected Outcome

**Before**: 1601/1811 tests passing (88%)
**After**: 1811/1811 tests passing (100%)

**Impact**: Unblock releases, enable CI/CD, clean test suite

---

**Start Here**: Read [tasks.md](tasks.md) → Execute T-001 → Validate → Repeat

**Questions?** See [plan.md](plan.md) for technical details or [spec.md](spec.md) for context.
