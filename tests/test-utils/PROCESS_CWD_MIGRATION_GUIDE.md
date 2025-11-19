# Process.cwd() Migration Guide for Integration Tests

## Why This Matters

Using `process.cwd()` in tests is **dangerous** because:

1. **Deletion risks**: If cleanup uses wrong `cwd`, could delete project files
2. **Parallel execution failures**: Different test workers have different `cwd` values
3. **Unreliable paths**: `cwd` can change during test execution

## Safe Pattern: Use `findProjectRoot(import.meta.url)`

### Step 1: Import the Utility

```typescript
import { findProjectRoot } from '../../test-utils/project-root.js';
// Adjust path based on test file location
```

### Step 2: Define Project Root at Module Level

```typescript
// ✅ SAFE: Find project root from test file location, not process.cwd()
const projectRoot = findProjectRoot(import.meta.url);
```

### Step 3: Replace All `process.cwd()` Usages

**Pattern 1: Finding Hook Paths**
```typescript
// ❌ BEFORE (UNSAFE)
const hookPath = path.join(
  process.cwd(),
  'plugins/specweave/hooks/my-hook.sh'
);

// ✅ AFTER (SAFE)
const hookPath = path.join(
  projectRoot,
  'plugins/specweave/hooks/my-hook.sh'
);
```

**Pattern 2: Saving/Restoring CWD**
```typescript
// ❌ BEFORE (UNSAFE)
let originalCwd: string;
beforeEach(() => {
  originalCwd = process.cwd();
  process.chdir(testRoot);
});
afterEach(() => {
  process.chdir(originalCwd);
});

// ✅ AFTER (SAFE)
beforeEach(() => {
  // Remove originalCwd variable entirely
  process.chdir(testRoot);
});
afterEach(() => {
  // Use projectRoot from module level
  process.chdir(projectRoot);
});
```

**Pattern 3: Multiple Usages in Same Test**
```typescript
// ❌ BEFORE (UNSAFE)
it('my test', () => {
  const path1 = path.join(process.cwd(), 'file1.js');
  const path2 = path.join(process.cwd(), 'file2.js');
});

// ✅ AFTER (SAFE)
it('my test', () => {
  const path1 = path.join(projectRoot, 'file1.js');
  const path2 = path.join(projectRoot, 'file2.js');
});
```

## Migration Checklist

- [ ] Import `findProjectRoot` from `test-utils/project-root.js`
- [ ] Define `const projectRoot = findProjectRoot(import.meta.url);` at module level
- [ ] Replace ALL `process.cwd()` calls with `projectRoot`
- [ ] Remove `originalCwd` variable if it exists
- [ ] Add safety comments: `// ✅ SAFE: projectRoot is determined from test file location, not process.cwd()`
- [ ] Verify test still passes

## Files Already Fixed (5/20)

✅ tests/integration/core/deduplication/hook-integration.test.ts
✅ tests/integration/hooks/sync-living-docs-hook.test.ts
✅ tests/integration/core/sync-specs-command.test.ts
✅ tests/integration/commands/done-command.test.ts
✅ tests/integration/hooks/status-line-hook.test.ts

## Files Remaining (15/20)

- [ ] tests/integration/external-tools/jira/jira-incremental-sync.test.ts
- [ ] tests/integration/core/task-consistency.test.ts
- [ ] tests/integration/core/hook-health-check.test.ts
- [ ] tests/integration/core/status-line-task-completion.test.ts
- [ ] tests/integration/core/status-line-desync-prevention.test.ts
- [ ] tests/integration/core/increment-status-sync.test.ts
- [ ] tests/integration/core/sync-docs-integration.test.ts
- [ ] tests/integration/external-tools/ado/ado-multi-project/ado-sync-scenarios.test.ts
- [ ] tests/integration/external-tools/ado/ado-multi-project/ado-multi-project.test.ts
- [ ] tests/integration/hook-health-check.test.ts
- [ ] tests/integration/features/status-line/update-status-line-hook.test.ts
- [ ] tests/integration/features/status-line/multi-window.test.ts
- [ ] tests/integration/external-tools/jira/jira-sync.test.ts
- [ ] tests/integration/external-tools/jira/jira-bidirectional-sync.test.ts
- [ ] tests/integration/external-tools/github/github-sync.test.ts

## Example Migration (Complete)

```typescript
// BEFORE
import { describe, it } from 'vitest';
import path from 'path';

describe('My Test', () => {
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    process.chdir(testRoot);
  });

  afterEach(() => {
    process.chdir(originalCwd);
  });

  it('test something', () => {
    const hookPath = path.join(process.cwd(), 'plugins/hook.sh');
    // ... test code
  });
});

// AFTER
import { describe, it } from 'vitest';
import path from 'path';
import { findProjectRoot } from '../../test-utils/project-root.js';

// ✅ SAFE: Find project root from test file location, not process.cwd()
const projectRoot = findProjectRoot(import.meta.url);

describe('My Test', () => {
  beforeEach(() => {
    process.chdir(testRoot);
  });

  afterEach(() => {
    // ✅ SAFE: projectRoot is determined from test file location
    process.chdir(projectRoot);
  });

  it('test something', () => {
    // ✅ SAFE: projectRoot is determined from test file location
    const hookPath = path.join(projectRoot, 'plugins/hook.sh');
    // ... test code
  });
});
```

## Testing Your Changes

```bash
# Run the specific test you modified
npm run test:integration -- path/to/your.test.ts

# Run all integration tests to verify no breakage
npm run test:integration
```

## Reference

See `tests/test-utils/project-root.ts` for implementation details.
