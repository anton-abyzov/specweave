# ULTRATHINK: Mock Issues Analysis & Resolution

**Date**: 2025-11-17
**Context**: After Vitest migration, 29 tests failing due to mock implementation issues

---

## Root Cause Analysis

### Problem Pattern

All failing tests follow the same pattern:
```
expected +0 to be [non-zero number]
```

This indicates **mocks are not returning data** - the implementation is receiving empty/undefined values from mocked fs operations.

### Why This Happens

**Vitest vs Jest Mocking Differences**:

1. **Automatic Hoisting**:
   - Jest: Automatically hoists `jest.mock()` to top of file
   - Vitest: `vi.mock()` needs manual hoisting or factory functions

2. **Mock Implementation**:
   - Jest: `(fs.readFile as jest.Mock).mockResolvedValue()`
   - Vitest: Requires proper mock factory or `vi.mocked()`

3. **Mock Module Resolution**:
   - Vitest may not automatically mock all exports
   - Need explicit mock implementations

### The Fix Strategy

**Option 1: Use `vi.mocked()` helper**
```typescript
import { vi } from 'vitest';
import fs from 'fs/promises';

vi.mock('fs/promises');

// In test:
vi.mocked(fs.readFile).mockResolvedValue('content');
```

**Option 2: Mock factory with implementation**
```typescript
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    stat: vi.fn(),
  },
}));
```

**Option 3: Inline mocks with `vi.spyOn()`**
```typescript
vi.spyOn(fs, 'readFile').mockResolvedValue('content');
```

---

## Analysis by File

### 1. completion-propagator.test.ts (5 failures)

**Issue**: `fs.readFile` mocks not returning values

**Current code**:
```typescript
(fs.readFile as any).mockResolvedValue(specContent);
```

**Problem**: `as any` bypasses TypeScript but doesn't fix the mock

**Fix**: Use `vi.mocked()`
```typescript
vi.mocked(fs.readFile).mockResolvedValue(specContent);
```

### 2. three-layer-sync.test.ts (4 failures)

**Issue**: Same as above - fs mocks not working

**Current code**:
```typescript
(fs.readFile as any).mockResolvedValueOnce(specContent);
```

**Fix**: Use `vi.mocked()` with chained calls

### 3. cross-linker.test.ts (9 failures)

**Issue**: fs-extra mocks not working

**Current code**:
```typescript
mockFs.readFile.mockResolvedValue('...');
```

**Problem**: `mockFs` might not be properly initialized for Vitest

**Fix**: Recreate mock setup for Vitest or use `vi.spyOn()`

### 4. content-distributor.test.ts (3 failures)

**Issue**: Similar fs-extra mock issues

**Fix**: Same as cross-linker

---

## Solution: Universal Mock Fix

I'll create a systematic fix using `vi.mocked()` for all fs/fs-extra mocks.

### Implementation Plan

1. **Import vi.mocked**:
   ```typescript
   import { vi } from 'vitest';
   ```

2. **Replace `as any` with `vi.mocked()`**:
   ```typescript
   // Before:
   (fs.readFile as any).mockResolvedValue('...');

   // After:
   vi.mocked(fs.readFile).mockResolvedValue('...');
   ```

3. **For fs-extra**: Use factory mock
   ```typescript
   vi.mock('fs-extra', () => ({
     default: {
       readFile: vi.fn(),
       writeFile: vi.fn(),
       // ... other methods
     },
   }));
   ```

---

## Execution Status

- [ ] Fix completion-propagator.test.ts
- [ ] Fix three-layer-sync.test.ts
- [ ] Fix cross-linker.test.ts
- [ ] Fix content-distributor.test.ts
- [ ] Verify all tests pass

**Next**: Implement fixes systematically
