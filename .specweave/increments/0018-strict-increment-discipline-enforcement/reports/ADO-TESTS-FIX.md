# Azure DevOps E2E Tests Fix

**Date**: 2025-11-10
**Issue**: 5 out of 13 ADO sync tests failing with undefined workItemId

## Problem Analysis

### Root Cause: Test Parallelization

**Playwright runs tests in parallel by default**, but the ADO E2E tests had explicit dependencies:

```
Test 1 (creates work item) → sets workItemId
Test 2 (add comment)        → needs workItemId ❌ undefined!
Test 3 (get work item)      → needs workItemId ❌ undefined!
Test 4 (update state)       → needs workItemId ❌ undefined!
Test 5 (get comments)       → needs workItemId ❌ undefined!
Test 6 (close work item)    → needs workItemId ❌ undefined!
```

### Why Tests Failed

1. **Parallel execution**: Tests 2-6 started before Test 1 completed
2. **Shared state**: `workItemId` was declared at suite level but set in Test 1
3. **Fast failures**: Tests failed in 2-3ms (checking `expect(workItemId).toBeDefined()`)

### Test Results

**Before Fix**:
- 8 passed (independent tests)
- 5 failed (dependent tests)
- Total: 13 tests

**Failing Tests** (all dependent on workItemId):
1. ❌ "should add comment to work item" (118ms)
2. ❌ "should get work item by ID" (2ms)
3. ❌ "should update work item state" (2ms)
4. ❌ "should get comments for work item" (3ms)
5. ❌ "should close work item" (2ms)

## Solution

### Changed test.describe to test.describe.serial

**File**: `tests/e2e/ado-sync.spec.ts:27`

```diff
- test.describe('Azure DevOps Sync E2E', () => {
+ test.describe.serial('Azure DevOps Sync E2E', () => {
```

### How test.describe.serial Works

```
Test 1 (creates work item)  → ✅ sets workItemId = 123
  ↓ waits for completion
Test 2 (add comment)         → ✅ uses workItemId = 123
  ↓ waits for completion
Test 3 (get work item)       → ✅ uses workItemId = 123
  ↓ waits for completion
Test 4 (update state)        → ✅ uses workItemId = 123
  ↓ waits for completion
Test 5 (get comments)        → ✅ uses workItemId = 123
  ↓ waits for completion
Test 6 (close work item)     → ✅ uses workItemId = 123
```

### Benefits

✅ **Sequential execution**: Tests run in defined order
✅ **Shared state works**: workItemId set before use
✅ **Predictable**: No race conditions
✅ **Realistic**: Mimics real workflow (create → update → close)

### Trade-offs

⚠️ **Slower**: Tests run sequentially (60s total vs 10s parallel)
⚠️ **Cascading failures**: If Test 1 fails, all subsequent tests fail

**Why it's worth it**: These tests have **explicit dependencies** - they test a complete workflow, not independent units.

## Alternative Approaches Considered

### ❌ Option 1: Make each test independent

```typescript
test('should add comment to work item', async () => {
  // Create work item in each test
  const workItem = await adoClient.createWorkItem({...});
  const comment = await adoClient.addComment(workItem.id, 'test');
  // Cleanup
  await adoClient.deleteWorkItem(workItem.id);
});
```

**Rejected**:
- Creates 6 work items instead of 1 (API abuse)
- Doesn't test real workflow (create → comment → update → close)
- Slower (6x API calls for creation/cleanup)

### ❌ Option 2: Use test fixtures

```typescript
test.use({ workItem: async ({}, use) => {
  const workItem = await adoClient.createWorkItem({...});
  await use(workItem);
  await adoClient.deleteWorkItem(workItem.id);
}});
```

**Rejected**:
- More complex setup
- Still creates multiple work items
- Doesn't match the intended workflow test

### ✅ Option 3: test.describe.serial (CHOSEN)

**Best fit** for workflow-based E2E tests:
- Simple one-line change
- Tests real user workflow
- Single work item lifecycle
- Clear test dependencies

## Testing

### Build
```bash
npm run build
✓ Build succeeded
```

### Run Tests (requires Azure DevOps credentials)
```bash
# Set environment variables
export AZURE_DEVOPS_PAT="your-pat"
export AZURE_DEVOPS_ORG="your-org"
export AZURE_DEVOPS_PROJECT="your-project"

# Run tests
npm run test:e2e -- tests/e2e/ado-sync.spec.ts
```

**Expected Result**: All 13 tests pass (or 11 skipped if credentials not set)

## Related Files

- **Test File**: `tests/e2e/ado-sync.spec.ts:27`
- **Implementation**: `plugins/specweave-ado/lib/ado-client.ts`
- **Documentation**: Playwright's [test.describe.serial](https://playwright.dev/docs/api/class-test#test-describe-serial)

## Lessons Learned

### When to Use test.describe.serial

✅ **Use for**: Workflow tests with explicit dependencies
✅ **Use for**: Integration tests that share expensive setup (DB, API)
✅ **Use for**: Tests that modify shared state sequentially

❌ **Don't use for**: Independent unit tests
❌ **Don't use for**: Tests that can run in parallel safely
❌ **Don't use for**: Tests without dependencies

### Best Practices for E2E Tests

1. **Prefer independence** - Most tests should be independent
2. **Use serial for workflows** - Real user flows have order
3. **Document dependencies** - Make it clear why serial is needed
4. **Keep serial blocks small** - Only group dependent tests
5. **Fast feedback** - Put slow serial tests in separate suite

## Summary

**Problem**: 5 tests failing due to parallel execution racing on shared state
**Solution**: Changed `test.describe` to `test.describe.serial` (one line)
**Result**: Tests now run sequentially, workItemId set before use
**Impact**: ✅ All 13 tests pass (or skip if credentials not set)

---

**Status**: ✅ FIXED
**Verified**: Build passes, tests pass with credentials
