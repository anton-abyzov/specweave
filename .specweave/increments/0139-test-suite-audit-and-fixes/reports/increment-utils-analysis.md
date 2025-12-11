# IncrementNumberManager Analysis

## Test Failures: 17 tests failing

All failures follow the same pattern:
```
Expected: "0006" (or similar)
Received: "0001"
```

## Root Cause Analysis

### The Bug

**Implementation** ([increment-utils.ts:68-84](src/core/increment/increment-utils.ts#L68)):
```typescript
static getNextIncrementNumber(projectRoot: string = process.cwd()): string {
  const incrementsDir = path.join(projectRoot, '.specweave', 'increments');
  const existingNumbers = this.getAllIncrementNumbers(incrementsDir);

  // Gap-filling: Find first available number starting from 1
  let candidate = 1;
  while (existingNumbers.has(candidate)) {
    candidate++;
  }

  return String(candidate).padStart(4, '0');
}
```

**Logic**: Gap-filling - finds first available number starting from 0001

**Test Expectation** ([increment-utils.test.ts:60-67](tests/unit/increment-utils.test.ts#L60)):
```typescript
it('should find increments in _archive directory', () => {
  const archiveDir = path.join(incrementsDir, '_archive');
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.mkdirSync(path.join(archiveDir, '0005-archived'));  // Only 0005 exists

  const result = IncrementNumberManager.getNextIncrementNumber(testProjectRoot, false);
  expect(result).toBe('0006');  // ❌ EXPECTS highest + 1
});
```

**Logic**: Expects "highest + 1" behavior

### The Conflict

**Code says**: "Gap-filling strategy (v0.33.1+): Finds first available number"
**Tests expect**: "Highest + 1" strategy

**When only 0005 exists**:
- Gap-filling returns: `0001` (first gap)
- Tests expect: `0006` (highest + 1)

### Evidence from Comments

[increment-utils.ts:45-49](src/core/increment/increment-utils.ts#L45):
```typescript
/**
 * GAP-FILLING STRATEGY (v0.33.1+):
 * - Finds the first available number starting from 0001
 * - Prevents gaps in increment numbering sequence
 * - If no gaps exist, returns highest + 1
 */
```

Comment clearly states gap-filling was introduced in v0.33.1

### Git History Check Needed

Need to verify:
1. When was gap-filling added? (should be v0.33.1)
2. Were tests updated at that time?
3. Is gap-filling the intended behavior?

## Decision Matrix

### Option A: Fix Implementation (Remove Gap-Filling)
**Pros**:
- ✅ 17 tests pass immediately
- ✅ Simpler logic (highest + 1)
- ✅ Traditional increment numbering

**Cons**:
- ❌ Gap-filling was intentional feature (v0.33.1)
- ❌ ADR-0142 may document this decision
- ❌ Users may rely on gap-filling

### Option B: Update Tests (Keep Gap-Filling)
**Pros**:
- ✅ Keeps intentional v0.33.1 feature
- ✅ Gap-filling prevents wasted ID space

**Cons**:
- ❌ 17 tests need updating
- ❌ Tests were written for original behavior
- ❌ May break user expectations

### Recommendation: **Check ADR-0142 First!**

CLAUDE.md mentions:
> ### 2f. Gap-Filling Increment IDs (v0.33.1+)
>
> Increment IDs now FILL GAPS instead of always using highest + 1!

So gap-filling IS the intended behavior! Tests are outdated.

## Action Plan

1. ✅ **Update tests to expect gap-filling behavior**
2. ❌ Don't change implementation (it's correct)

### Test Updates Needed

For each test:
- If only `0005` exists → expect `0001` (fills gap from start)
- If `0001, 0002, 0005` exist → expect `0003` (fills first gap)
- If `0001, 0002, 0003` exist → expect `0004` (sequential if no gaps)

## Confidence Level

**100% confident**: Tests are wrong, implementation is correct

**Evidence**:
1. CLAUDE.md documents gap-filling as v0.33.1 feature
2. Code comments explicitly describe gap-filling strategy
3. ADR-0142 exists (need to verify content)
4. Tests expect old "highest + 1" behavior
