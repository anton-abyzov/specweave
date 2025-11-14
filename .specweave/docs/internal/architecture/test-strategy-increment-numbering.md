# Test Strategy: Increment Number Gap Prevention

**Increment**: 0032-prevent-increment-number-gaps
**Type**: Bug Fix
**Priority**: P1
**Test Coverage Target**: 95%+

## Overview

This document outlines the comprehensive test strategy for the increment number gap prevention feature. The goal is to ensure 100% reliability in increment numbering with zero duplicate IDs.

## Test Pyramid

```
        ┌─────────────────┐
        │  E2E Tests (5)  │  ← Real-world workflows
        │  10% coverage   │
        └─────────────────┘
       ┌───────────────────────┐
       │ Integration Tests (8) │  ← Cross-file behavior
       │   20% coverage        │
       └───────────────────────┘
    ┌────────────────────────────────┐
    │    Unit Tests (40)             │  ← Core logic
    │    70% coverage                │
    └────────────────────────────────┘
```

**Total Tests**: 53 test cases
**Estimated Execution Time**: ~2-3 seconds (all tests)

## Unit Tests (40 tests)

**File**: `tests/unit/increment-utils.test.ts`

### Test Suite 1: `getNextIncrementNumber()` - 15 tests

#### Group 1: Basic Functionality (5 tests)

**UT-001: Empty directory**
```typescript
it('returns 0001 for empty .specweave/increments directory', () => {
  // Setup
  fs.mkdirSync('.specweave/increments', { recursive: true });

  // Execute
  const result = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  // Assert
  expect(result).toBe('0001');
});
```

**UT-002: Single increment in main directory**
```typescript
it('returns next number after scanning main directory', () => {
  createIncrement('0001-feature-a');

  const result = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(result).toBe('0002');
});
```

**UT-003: Multiple increments in main directory**
```typescript
it('finds highest in main directory', () => {
  createIncrement('0001-feature-a');
  createIncrement('0002-feature-b');
  createIncrement('0005-feature-c'); // Gap (0003, 0004 missing)

  const result = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(result).toBe('0006'); // Next after highest (0005)
});
```

**UT-004: Increments in _abandoned directory only**
```typescript
it('scans _abandoned directory when main is empty', () => {
  createIncrement('_abandoned/0004-failed-experiment');

  const result = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(result).toBe('0005');
});
```

**UT-005: Increments in _paused directory only**
```typescript
it('scans _paused directory when main is empty', () => {
  createIncrement('_paused/0010-on-hold-feature');

  const result = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(result).toBe('0011');
});
```

#### Group 2: Comprehensive Scanning (5 tests)

**UT-006: Increments across all directories**
```typescript
it('finds highest across main, _abandoned, and _paused', () => {
  createIncrement('0001-feature-a'); // main
  createIncrement('0002-feature-b'); // main
  createIncrement('_abandoned/0005-failed'); // abandoned
  createIncrement('_paused/0010-on-hold'); // paused

  const result = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(result).toBe('0011'); // Next after 0010 (highest)
});
```

**UT-007: Highest in _abandoned (not main)**
```typescript
it('returns next after _abandoned when it contains highest', () => {
  createIncrement('0001-feature-a'); // main
  createIncrement('_abandoned/0020-failed'); // abandoned (highest)

  const result = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(result).toBe('0021');
});
```

**UT-008: Highest in _paused (not main)**
```typescript
it('returns next after _paused when it contains highest', () => {
  createIncrement('0001-feature-a'); // main
  createIncrement('_paused/0030-on-hold'); // paused (highest)

  const result = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(result).toBe('0031');
});
```

**UT-009: Multiple increments in each directory**
```typescript
it('scans all increments in all directories', () => {
  // Main: 0001, 0002, 0003
  createIncrement('0001-feature-a');
  createIncrement('0002-feature-b');
  createIncrement('0003-feature-c');

  // Abandoned: 0004, 0005, 0006
  createIncrement('_abandoned/0004-failed-1');
  createIncrement('_abandoned/0005-failed-2');
  createIncrement('_abandoned/0006-failed-3');

  // Paused: 0007, 0008
  createIncrement('_paused/0007-on-hold-1');
  createIncrement('_paused/0008-on-hold-2');

  const result = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(result).toBe('0009'); // Next after 0008 (highest)
});
```

**UT-010: Sparse distribution across directories**
```typescript
it('handles sparse increment distribution', () => {
  createIncrement('0001-feature-a'); // main
  createIncrement('_abandoned/0003-failed'); // abandoned (skip 0002)
  createIncrement('_paused/0005-on-hold'); // paused (skip 0004)
  createIncrement('0007-feature-b'); // main (skip 0006)

  const result = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(result).toBe('0008'); // Next after 0007
});
```

#### Group 3: ID Format Handling (5 tests)

**UT-011: 3-digit legacy IDs**
```typescript
it('handles 3-digit legacy IDs (001, 002, etc.)', () => {
  createIncrement('001-legacy-feature'); // 3-digit

  const result = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(result).toBe('0002'); // Returns 4-digit
});
```

**UT-012: 4-digit modern IDs**
```typescript
it('handles 4-digit modern IDs (0001, 0002, etc.)', () => {
  createIncrement('0001-modern-feature'); // 4-digit

  const result = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(result).toBe('0002');
});
```

**UT-013: Mixed 3-digit and 4-digit IDs**
```typescript
it('normalizes mixed 3-digit and 4-digit IDs', () => {
  createIncrement('001-legacy'); // 3-digit
  createIncrement('0005-modern'); // 4-digit
  createIncrement('010-legacy'); // 3-digit (normalized to 0010)

  const result = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(result).toBe('0011'); // Next after 010 (0010)
});
```

**UT-014: Always pads to 4 digits**
```typescript
it('always returns 4-digit format regardless of input', () => {
  createIncrement('001-legacy'); // 3-digit input

  const result = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(result).toBe('0002'); // 4-digit output
  expect(result).toHaveLength(4);
});
```

**UT-015: Handles large increment numbers**
```typescript
it('handles increment numbers up to 9999', () => {
  createIncrement('9998-large-number');

  const result = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(result).toBe('9999');
});
```

### Test Suite 2: `incrementNumberExists()` - 10 tests

**UT-016: Detects increment in main directory**
```typescript
it('returns true when increment exists in main directory', () => {
  createIncrement('0001-feature');

  const exists = IncrementNumberManager.incrementNumberExists('0001', projectRoot);

  expect(exists).toBe(true);
});
```

**UT-017: Detects increment in _abandoned directory**
```typescript
it('returns true when increment exists in _abandoned', () => {
  createIncrement('_abandoned/0005-failed');

  const exists = IncrementNumberManager.incrementNumberExists('0005', projectRoot);

  expect(exists).toBe(true);
});
```

**UT-018: Detects increment in _paused directory**
```typescript
it('returns true when increment exists in _paused', () => {
  createIncrement('_paused/0010-on-hold');

  const exists = IncrementNumberManager.incrementNumberExists('0010', projectRoot);

  expect(exists).toBe(true);
});
```

**UT-019: Returns false for non-existent increment**
```typescript
it('returns false when increment does not exist', () => {
  createIncrement('0001-feature');

  const exists = IncrementNumberManager.incrementNumberExists('0002', projectRoot);

  expect(exists).toBe(false);
});
```

**UT-020: Normalizes 3-digit to 4-digit for comparison**
```typescript
it('normalizes 3-digit input to 4-digit for comparison', () => {
  createIncrement('001-legacy'); // 3-digit directory

  const exists1 = IncrementNumberManager.incrementNumberExists('001', projectRoot); // 3-digit input
  const exists2 = IncrementNumberManager.incrementNumberExists('0001', projectRoot); // 4-digit input

  expect(exists1).toBe(true);
  expect(exists2).toBe(true);
});
```

**UT-021: Accepts numeric input**
```typescript
it('accepts numeric input (not just strings)', () => {
  createIncrement('0042-feature');

  const exists = IncrementNumberManager.incrementNumberExists(42, projectRoot);

  expect(exists).toBe(true);
});
```

**UT-022: Case-insensitive directory name check**
```typescript
it('handles directory name variations', () => {
  createIncrement('0001-feature-NAME'); // Mixed case

  const exists = IncrementNumberManager.incrementNumberExists('0001', projectRoot);

  expect(exists).toBe(true); // Name doesn't matter, only number
});
```

**UT-023: Multiple matches return true**
```typescript
it('returns true if number exists in ANY directory', () => {
  // Should never happen, but test defensive code
  createIncrement('0001-feature-a'); // main
  createIncrement('_abandoned/0001-feature-b'); // abandoned (duplicate!)

  const exists = IncrementNumberManager.incrementNumberExists('0001', projectRoot);

  expect(exists).toBe(true);
});
```

**UT-024: Empty directories return false**
```typescript
it('returns false when all directories are empty', () => {
  fs.mkdirSync('.specweave/increments', { recursive: true });
  fs.mkdirSync('.specweave/increments/_abandoned', { recursive: true });

  const exists = IncrementNumberManager.incrementNumberExists('0001', projectRoot);

  expect(exists).toBe(false);
});
```

**UT-025: Missing subdirectories handled gracefully**
```typescript
it('handles missing _abandoned and _paused directories', () => {
  createIncrement('0001-feature'); // main only

  const exists = IncrementNumberManager.incrementNumberExists('0001', projectRoot);

  expect(exists).toBe(true);
});
```

### Test Suite 3: Caching - 10 tests

**UT-026: Cache hit on repeated calls**
```typescript
it('uses cache on repeated calls within TTL', () => {
  createIncrement('0001-feature');

  const first = IncrementNumberManager.getNextIncrementNumber(projectRoot);
  const scanSpy = jest.spyOn(fs, 'readdirSync');
  const second = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(first).toBe('0002');
  expect(second).toBe('0002');
  expect(scanSpy).toHaveBeenCalledTimes(0); // Cache hit, no scan
});
```

**UT-027: Cache respects useCache=false**
```typescript
it('bypasses cache when useCache=false', () => {
  createIncrement('0001-feature');

  const first = IncrementNumberManager.getNextIncrementNumber(projectRoot, true); // Cache
  const scanSpy = jest.spyOn(fs, 'readdirSync');
  const second = IncrementNumberManager.getNextIncrementNumber(projectRoot, false); // No cache

  expect(scanSpy).toHaveBeenCalled(); // Cache bypassed
});
```

**UT-028: Cache expires after TTL**
```typescript
it('expires cache after 5 second TTL', async () => {
  createIncrement('0001-feature');

  const first = IncrementNumberManager.getNextIncrementNumber(projectRoot);
  expect(first).toBe('0002');

  // Wait for TTL expiry
  await new Promise(resolve => setTimeout(resolve, 6000));

  // Manually create new increment
  createIncrement('0002-feature');

  const second = IncrementNumberManager.getNextIncrementNumber(projectRoot);
  expect(second).toBe('0003'); // Detected new increment after cache expiry
}, 10000); // Increase Jest timeout
```

**UT-029: Manual cache clear works**
```typescript
it('clears cache manually with clearCache()', () => {
  createIncrement('0001-feature');

  const first = IncrementNumberManager.getNextIncrementNumber(projectRoot);
  IncrementNumberManager.clearCache();
  const scanSpy = jest.spyOn(fs, 'readdirSync');
  const second = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(scanSpy).toHaveBeenCalled(); // Cache cleared, rescan happened
});
```

**UT-030: Cache is per-directory**
```typescript
it('maintains separate cache for different directories', () => {
  const projectA = '/tmp/project-a';
  const projectB = '/tmp/project-b';

  setupProject(projectA, ['0001-feature']);
  setupProject(projectB, ['0005-feature']);

  const nextA = IncrementNumberManager.getNextIncrementNumber(projectA);
  const nextB = IncrementNumberManager.getNextIncrementNumber(projectB);

  expect(nextA).toBe('0002'); // Project A next
  expect(nextB).toBe('0006'); // Project B next (independent)
});
```

**UT-031: Cache updates on fresh scan**
```typescript
it('updates cache when fresh scan finds higher number', () => {
  createIncrement('0001-feature');
  const first = IncrementNumberManager.getNextIncrementNumber(projectRoot);
  expect(first).toBe('0002');

  IncrementNumberManager.clearCache();
  createIncrement('0010-feature'); // New increment

  const second = IncrementNumberManager.getNextIncrementNumber(projectRoot);
  expect(second).toBe('0011'); // Cache updated with new highest
});
```

**UT-032: Cache handles concurrent reads**
```typescript
it('handles concurrent getNextIncrementNumber calls', async () => {
  createIncrement('0001-feature');

  const promises = [
    IncrementNumberManager.getNextIncrementNumber(projectRoot),
    IncrementNumberManager.getNextIncrementNumber(projectRoot),
    IncrementNumberManager.getNextIncrementNumber(projectRoot)
  ];

  const results = await Promise.all(promises);

  // All should return same value (cache prevents race)
  expect(results[0]).toBe('0002');
  expect(results[1]).toBe('0002');
  expect(results[2]).toBe('0002');
});
```

**UT-033: Cache memory footprint is small**
```typescript
it('cache memory usage is minimal', () => {
  const before = process.memoryUsage().heapUsed;

  // Create 100 cache entries
  for (let i = 0; i < 100; i++) {
    IncrementNumberManager.getNextIncrementNumber(`/tmp/project-${i}`);
  }

  const after = process.memoryUsage().heapUsed;
  const increase = (after - before) / 1024; // KB

  expect(increase).toBeLessThan(50); // <50KB for 100 entries
});
```

**UT-034: Cache survives process interruption**
```typescript
it('cache is cleared on process restart (no persistence)', () => {
  createIncrement('0001-feature');
  IncrementNumberManager.getNextIncrementNumber(projectRoot);

  // Simulate restart by clearing cache
  IncrementNumberManager.clearCache();

  const scanSpy = jest.spyOn(fs, 'readdirSync');
  IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(scanSpy).toHaveBeenCalled(); // Rescan after restart
});
```

**UT-035: Cache TTL is configurable**
```typescript
it('uses configurable TTL (future enhancement)', () => {
  // Note: Current implementation uses hardcoded 5s TTL
  // This test documents future enhancement
  expect(IncrementNumberManager['CACHE_TTL']).toBe(5000);
});
```

### Test Suite 4: Error Handling - 5 tests

**UT-036: Missing .specweave directory**
```typescript
it('returns 0001 when .specweave directory does not exist', () => {
  const result = IncrementNumberManager.getNextIncrementNumber('/tmp/no-specweave');

  expect(result).toBe('0001');
});
```

**UT-037: Missing increments directory**
```typescript
it('returns 0001 when increments directory does not exist', () => {
  fs.mkdirSync('.specweave', { recursive: true });

  const result = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(result).toBe('0001');
});
```

**UT-038: Invalid increment folder names**
```typescript
it('ignores invalid increment folder names', () => {
  createIncrement('0001-valid-feature');
  fs.mkdirSync('.specweave/increments/invalid-no-number');
  fs.mkdirSync('.specweave/increments/README.md');

  const result = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(result).toBe('0002'); // Ignores invalid folders
});
```

**UT-039: Corrupted increment folder names**
```typescript
it('handles corrupted increment folder names', () => {
  createIncrement('0001-valid');
  fs.mkdirSync('.specweave/increments/0002'); // Missing hyphen and name
  fs.mkdirSync('.specweave/increments/0003-'); // Missing name

  const result = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(result).toBe('0004'); // Skips corrupted folders
});
```

**UT-040: Permission errors (read-only filesystem)**
```typescript
it('throws clear error on permission failure', () => {
  createIncrement('0001-feature');

  // Mock filesystem error
  jest.spyOn(fs, 'readdirSync').mockImplementation(() => {
    throw new Error('EACCES: permission denied');
  });

  expect(() => {
    IncrementNumberManager.getNextIncrementNumber(projectRoot);
  }).toThrow('Failed to read increments directory');

  jest.restoreAllMocks();
});
```

---

## Integration Tests (8 tests)

**File**: `tests/integration/increment-numbering.test.ts`

### Test Suite 5: Cross-File Integration - 8 tests

**IT-001: feature-utils.js delegation**
```typescript
it('feature-utils.js delegates to IncrementNumberManager', () => {
  const { getNextFeatureNumber } = require('../../plugins/specweave/skills/increment-planner/scripts/feature-utils.js');

  createIncrement('0001-feature');
  createIncrement('_abandoned/0005-failed');

  const next = getNextFeatureNumber('.specweave/increments');

  expect(next).toBe('0006'); // Scanned _abandoned
});
```

**IT-002: jira-mapper.ts delegation**
```typescript
it('jira-mapper.ts delegates to IncrementNumberManager', async () => {
  const { JiraMapper } = require('../../src/integrations/jira/jira-mapper');
  const mockClient = createMockJiraClient();
  const mapper = new JiraMapper(mockClient, projectRoot);

  createIncrement('0001-feature');
  createIncrement('_paused/0010-on-hold');

  const next = mapper['getNextIncrementId']();

  expect(next).toBe('0011'); // Scanned _paused
});
```

**IT-003: jira-incremental-mapper.ts delegation**
```typescript
it('jira-incremental-mapper.ts delegates to IncrementNumberManager', () => {
  const { JiraIncrementalMapper } = require('../../src/integrations/jira/jira-incremental-mapper');
  const mockClient = createMockJiraClient();
  const mapper = new JiraIncrementalMapper(mockClient, projectRoot);

  createIncrement('0001-feature');
  createIncrement('_abandoned/0020-failed');

  const next = mapper['getNextIncrementId']();

  expect(next).toBe('0021'); // Scanned _abandoned
});
```

**IT-004: Real-world workflow (abandon increment)**
```typescript
it('prevents duplicate IDs when abandoning increment', async () => {
  // 1. Create increments
  createIncrement('0001-feature-a');
  createIncrement('0002-feature-b');
  createIncrement('0003-feature-c');

  // 2. Abandon 0002
  fs.renameSync(
    '.specweave/increments/0002-feature-b',
    '.specweave/increments/_abandoned/0002-feature-b'
  );

  // 3. Clear cache (simulate restart)
  IncrementNumberManager.clearCache();

  // 4. Create new increment
  const next = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  // 5. Verify: Should be 0004, not 0002
  expect(next).toBe('0004');
  expect(IncrementNumberManager.incrementNumberExists('0002', projectRoot)).toBe(true);
});
```

**IT-005: Real-world workflow (pause increment)**
```typescript
it('prevents duplicate IDs when pausing increment', () => {
  createIncrement('0001-feature-a');
  createIncrement('0005-feature-b');

  // Pause 0005
  fs.renameSync(
    '.specweave/increments/0005-feature-b',
    '.specweave/increments/_paused/0005-feature-b'
  );

  IncrementNumberManager.clearCache();

  const next = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(next).toBe('0006');
  expect(IncrementNumberManager.incrementNumberExists('0005', projectRoot)).toBe(true);
});
```

**IT-006: Concurrent creation prevention**
```typescript
it('detects duplicates via incrementNumberExists', () => {
  createIncrement('0001-feature');
  createIncrement('_paused/0005-on-hold');

  // Simulate PM Agent checking before creation
  const canCreate0002 = !IncrementNumberManager.incrementNumberExists('0002', projectRoot);
  const canCreate0005 = !IncrementNumberManager.incrementNumberExists('0005', projectRoot);

  expect(canCreate0002).toBe(true); // Safe to create 0002
  expect(canCreate0005).toBe(false); // Collision with _paused/0005
});
```

**IT-007: Migration from legacy 3-digit to 4-digit**
```typescript
it('handles migration from 3-digit to 4-digit IDs', () => {
  // Simulate legacy project with 3-digit IDs
  createIncrement('001-legacy-a');
  createIncrement('002-legacy-b');
  createIncrement('010-legacy-c');

  const next = IncrementNumberManager.getNextIncrementNumber(projectRoot);

  expect(next).toBe('0011'); // Next after 010 (normalized to 0010)
  expect(next).toHaveLength(4); // Always 4-digit output
});
```

**IT-008: Full workflow (create → abandon → create)**
```typescript
it('full workflow: create → abandon → create new', () => {
  // Phase 1: Create increments
  const next1 = IncrementNumberManager.getNextIncrementNumber(projectRoot);
  createIncrement(`${next1}-feature-a`);
  expect(next1).toBe('0001');

  const next2 = IncrementNumberManager.getNextIncrementNumber(projectRoot);
  createIncrement(`${next2}-feature-b`);
  expect(next2).toBe('0002');

  // Phase 2: Abandon 0001
  fs.renameSync(
    '.specweave/increments/0001-feature-a',
    '.specweave/increments/_abandoned/0001-feature-a'
  );

  IncrementNumberManager.clearCache();

  // Phase 3: Create new increment
  const next3 = IncrementNumberManager.getNextIncrementNumber(projectRoot);
  createIncrement(`${next3}-feature-c`);

  // Verify: Should be 0003, not 0001 (collision)
  expect(next3).toBe('0003');
  expect(fs.existsSync('.specweave/increments/0003-feature-c')).toBe(true);
  expect(fs.existsSync('.specweave/increments/_abandoned/0001-feature-a')).toBe(true);
});
```

---

## E2E Tests (5 tests)

**File**: `tests/e2e/increment-creation.spec.ts` (Playwright)

### Test Suite 6: End-to-End Workflows - 5 tests

**E2E-001: PM Agent creates increment via CLI**
```typescript
test('PM Agent creates increment with correct numbering', async () => {
  // Setup: Existing increments
  await exec('mkdir -p .specweave/increments/0001-feature-a');
  await exec('mkdir -p .specweave/increments/_abandoned/0005-failed');

  // Execute: PM Agent creates new increment
  const { stdout } = await exec('npx specweave increment "New Feature"');

  // Verify: Correct increment number
  expect(stdout).toContain('Increment 0006'); // Next after 0005
  expect(fs.existsSync('.specweave/increments/0006-new-feature')).toBe(true);
});
```

**E2E-002: JIRA import creates correct increment**
```typescript
test('JIRA import creates increment with correct numbering', async () => {
  await exec('mkdir -p .specweave/increments/0010-existing');

  const { stdout } = await exec('npx specweave jira-import EPIC-123');

  expect(stdout).toContain('Increment 0011');
  expect(fs.existsSync('.specweave/increments/0011-epic-123')).toBe(true);
});
```

**E2E-003: Abandon increment workflow**
```typescript
test('Abandoning increment prevents ID reuse', async () => {
  await exec('mkdir -p .specweave/increments/0001-feature');
  await exec('mkdir -p .specweave/increments/0002-feature');

  // Abandon 0001
  await exec('npx specweave abandon 0001 --reason="Scope changed"');

  // Create new increment
  const { stdout } = await exec('npx specweave increment "Another Feature"');

  expect(stdout).toContain('Increment 0003'); // Skips 0001
  expect(fs.existsSync('.specweave/increments/_abandoned/0001-feature')).toBe(true);
});
```

**E2E-004: Pause and resume workflow**
```typescript
test('Pausing increment reserves ID number', async () => {
  await exec('mkdir -p .specweave/increments/0005-feature');

  // Pause 0005
  await exec('npx specweave pause 0005 --reason="Waiting for dependency"');

  // Create new increment
  const { stdout } = await exec('npx specweave increment "Other Feature"');

  expect(stdout).toContain('Increment 0006'); // Skips 0005
  expect(fs.existsSync('.specweave/increments/_paused/0005-feature')).toBe(true);

  // Resume 0005
  await exec('npx specweave resume 0005');

  expect(fs.existsSync('.specweave/increments/0005-feature')).toBe(true);
  expect(fs.existsSync('.specweave/increments/_paused/0005-feature')).toBe(false);
});
```

**E2E-005: Multi-user concurrent creation**
```typescript
test('Concurrent increment creation from multiple users', async () => {
  // Simulate two developers creating increments simultaneously
  const promises = [
    exec('npx specweave increment "User 1 Feature"'),
    exec('npx specweave increment "User 2 Feature"')
  ];

  const [result1, result2] = await Promise.all(promises);

  // Verify: Different increment numbers (no collision)
  const id1 = result1.stdout.match(/Increment (\d{4})/)?.[1];
  const id2 = result2.stdout.match(/Increment (\d{4})/)?.[1];

  expect(id1).not.toBe(id2);
  expect(fs.existsSync(`.specweave/increments/${id1}-user-1-feature`)).toBe(true);
  expect(fs.existsSync(`.specweave/increments/${id2}-user-2-feature`)).toBe(true);
});
```

---

## Performance Tests (Benchmarks)

**File**: `tests/performance/increment-numbering.bench.ts`

```typescript
describe('Performance Benchmarks', () => {
  it('scans 10 increments in <5ms', () => {
    setupIncrements(10);
    const start = performance.now();
    IncrementNumberManager.getNextIncrementNumber(projectRoot, false); // No cache
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(5);
  });

  it('scans 100 increments in <15ms', () => {
    setupIncrements(100);
    const start = performance.now();
    IncrementNumberManager.getNextIncrementNumber(projectRoot, false);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(15);
  });

  it('cached lookup in <1ms', () => {
    setupIncrements(100);
    IncrementNumberManager.getNextIncrementNumber(projectRoot, true); // Prime cache
    const start = performance.now();
    IncrementNumberManager.getNextIncrementNumber(projectRoot, true); // Cache hit
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1);
  });
});
```

---

## Test Execution Plan

### Local Development
```bash
# Run all tests
npm test

# Run unit tests only
npm test -- tests/unit/increment-utils.test.ts

# Run integration tests only
npm test -- tests/integration/increment-numbering.test.ts

# Run E2E tests
npm run test:e2e

# Run with coverage
npm test -- --coverage
```

### CI/CD Pipeline
```yaml
test:
  - name: Unit Tests
    command: npm test -- tests/unit/
    parallel: true

  - name: Integration Tests
    command: npm test -- tests/integration/
    requires: unit-tests

  - name: E2E Tests
    command: npm run test:e2e
    requires: integration-tests

  - name: Coverage Report
    command: npm test -- --coverage --coverageReporters=lcov
    threshold: 95%
```

---

## Coverage Targets

| Component | Target | Rationale |
|-----------|--------|-----------|
| `IncrementNumberManager` | 100% | Critical path, must be bulletproof |
| `getNextIncrementNumber()` | 100% | Core logic, all branches tested |
| `incrementNumberExists()` | 100% | Duplicate detection, zero tolerance |
| Cache logic | 95% | TTL edge cases acceptable |
| Error handling | 90% | Permission errors hard to mock |
| **Overall** | **95%+** | High reliability requirement |

---

## Test Data Fixtures

**File**: `tests/fixtures/increment-setup.ts`

```typescript
export function setupTestProject(scenarios: string[]) {
  const fixtures = {
    'empty': [],
    'single': ['0001-feature-a'],
    'multiple': ['0001-a', '0002-b', '0003-c'],
    'with-gaps': ['0001-a', '0005-b', '0010-c'],
    'with-abandoned': ['0001-a', '_abandoned/0005-failed'],
    'with-paused': ['0001-a', '_paused/0010-on-hold'],
    'comprehensive': [
      '0001-a', '0002-b', '0003-c',
      '_abandoned/0004-failed-1', '_abandoned/0005-failed-2',
      '_paused/0010-on-hold'
    ],
    'legacy-3digit': ['001-legacy', '010-old', '020-ancient'],
    'mixed-formats': ['001-legacy', '0005-modern', '010-old']
  };

  return fixtures[scenario] || [];
}
```

---

## Success Criteria

**Test Suite Passes**:
- ✅ All 53 tests pass
- ✅ Zero flaky tests (100% reliability)
- ✅ Coverage >95%
- ✅ Performance benchmarks met

**Real-World Validation**:
- ✅ PM Agent creates increment with correct number
- ✅ Abandoned increment IDs are not reused
- ✅ Paused increment IDs are not reused
- ✅ JIRA import uses correct increment number
- ✅ Multi-user concurrent creation works

**Last Updated**: 2025-11-14
