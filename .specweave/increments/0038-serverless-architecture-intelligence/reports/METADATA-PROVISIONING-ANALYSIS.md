# Metadata Provisioning Analysis & Fix

**Date**: 2025-11-16
**Increment**: 0038-serverless-architecture-intelligence
**Issue**: metadata.json was not created during increment planning
**Severity**: High (breaks increment status management, discipline checks, and archiving)

---

## Executive Summary

Increment 0038 was created without metadata.json, causing it to fail initialization checks and appear incomplete. Root cause: the post-increment-planning hook didn't run during increment creation. This exposes a critical architectural flaw: **metadata.json creation relies entirely on Bash hooks instead of TypeScript code**.

### Actions Taken

1. ✅ Created metadata.json manually for increment 0038
2. ✅ Created comprehensive E2E tests (`tests/e2e/metadata-provisioning.spec.ts`)
3. ✅ Documented root cause and architectural issues
4. ⏳ Proposed long-term fix (TypeScript-based metadata creation)

---

## Root Cause Analysis

### What Happened?

1. User ran `/specweave:increment "Serverless Architecture Intelligence"`
2. PM agent created increment folder and files (spec.md, plan.md, tasks.md)
3. **post-increment-planning hook did NOT run** (no logs at 2025-11-16 01:44:42)
4. metadata.json was never created
5. Increment appears incomplete/broken

### Why Did This Happen?

**Current Architecture** (FRAGILE):
```
User → /specweave:increment
  ↓
PM Agent (via Task tool)
  ↓
Creates .specweave/increments/0038/
  ├── spec.md       ✅ Created
  ├── plan.md       ✅ Created
  ├── tasks.md      ✅ Created
  └── metadata.json ❌ NOT CREATED!
  ↓
post-increment-planning.sh hook SHOULD run
  ↓
Hook creates metadata.json as FALLBACK (lines 755-817)
  ↓
❌ Hook didn't run → No metadata.json
```

**Why the hook didn't run**:
- Hook execution is managed by Claude Code (not SpecWeave CLI)
- Hook may fail silently if:
  - Path resolution fails
  - Plugin not properly installed
  - Hook errors are suppressed
  - Claude Code version incompatibility

### Evidence

**File timestamps**:
```bash
$ stat .specweave/increments/0038-serverless-architecture-intelligence/
Modified: 2025-11-16 01:44:42

$ grep "2025-11-16 01:4" .specweave/logs/hooks-debug.log
<no results>  # Hook didn't run
```

**Hook logs end at**: 2025-11-16 01:26:50 (18 minutes before 0038 creation)

---

## Current Implementation Analysis

### Where metadata.json SHOULD Be Created

**Location**: `plugins/specweave/hooks/post-increment-planning.sh`
**Lines**: 755-817 (FALLBACK METADATA CREATION)

```bash
# Lines 755-817: Fallback metadata creation
if [ ! -f "$metadata_file" ]; then
  log_info "  ⚠️  metadata.json not found (hook may have failed)"
  log_info "  📝 Creating minimal metadata as fallback..."

  # Create metadata.json with testing config
  cat > "$metadata_file" <<EOF
{
  "id": "$increment_id",
  "status": "active",
  "type": "$increment_type",
  "created": "$current_timestamp",
  "lastActivity": "$current_timestamp",
  "testMode": "$test_mode",
  "coverageTarget": $coverage_target
}
EOF
fi
```

**Key Issues**:
1. **Bash hook** = unreliable (may not run)
2. **Fallback logic** = should be PRIMARY logic
3. **No TypeScript code** = can't be tested properly
4. **Silent failures** = hard to debug

### MetadataManager Has Lazy Initialization

**Location**: `src/core/increment/metadata-manager.ts:67-94`

```typescript
static read(incrementId: string): IncrementMetadata {
  const metadataPath = this.getMetadataPath(incrementId);

  // Lazy initialization: Create metadata if doesn't exist
  if (!fs.existsSync(metadataPath)) {
    const incrementPath = this.getIncrementPath(incrementId);
    if (!fs.existsSync(incrementPath)) {
      throw new MetadataError(/* ... */);
    }

    // Create default metadata
    const defaultMetadata = createDefaultMetadata(incrementId);
    this.write(incrementId, defaultMetadata);
    return defaultMetadata;
  }

  // Read existing metadata
  const content = fs.readFileSync(metadataPath, 'utf-8');
  return JSON.parse(content);
}
```

**This is GOOD** (safety net) but **NOT ENOUGH** (reactive, not proactive).

---

## The Fix (Short-Term)

### 1. Created metadata.json for 0038

**File**: `.specweave/increments/0038-serverless-architecture-intelligence/metadata.json`

```json
{
  "id": "0038-serverless-architecture-intelligence",
  "status": "active",
  "type": "feature",
  "priority": "P1",
  "created": "2025-11-16T06:44:42Z",
  "lastActivity": "2025-11-16T06:44:42Z",
  "testMode": "TDD",
  "coverageTarget": 80,
  "feature": "FS-038",
  "projects": ["specweave"]
}
```

**Verified**:
```bash
$ cat .specweave/increments/0038-serverless-architecture-intelligence/metadata.json
{
  "id": "0038-serverless-architecture-intelligence",
  ...
}
```

### 2. Created Comprehensive Tests

**File**: `tests/e2e/metadata-provisioning.spec.ts`

**Coverage**:
- ✅ metadata.json exists after increment creation
- ✅ metadata.json has all required fields
- ✅ metadata.json inherits testing config from .specweave/config.json
- ✅ metadata.json created for all increment types
- ✅ MetadataManager.read() creates metadata if missing (lazy init)
- ✅ metadata.json creation is idempotent
- ✅ metadata.json validates required fields on read
- ✅ Regression test for 0038 bug
- ✅ MetadataManager.read() rescues missing metadata

**All 9 tests PASS**:
```bash
$ npx playwright test tests/e2e/metadata-provisioning.spec.ts
✓  9 passed (565ms)
```

---

## The Solution (Long-Term)

### Architectural Change Required

**MOVE metadata.json creation from Bash hook to TypeScript code**

### Proposed Implementation

**Location**: `src/core/increment/increment-creator.ts` (NEW FILE)

```typescript
/**
 * Increment Creator
 *
 * Handles synchronous creation of increment folders and metadata.
 * Replaces hook-based metadata creation with reliable TypeScript code.
 */
export class IncrementCreator {
  /**
   * Create increment folder structure with metadata
   *
   * CRITICAL: This must be called SYNCHRONOUSLY during increment planning
   * to ensure metadata.json is created BEFORE hooks run.
   */
  static async create(
    incrementId: string,
    options: {
      type?: IncrementType;
      priority?: string;
      testMode?: 'TDD' | 'test-after' | 'manual';
      coverageTarget?: number;
      feature?: string;
      projects?: string[];
    } = {}
  ): Promise<void> {
    const incrementPath = path.join(
      process.cwd(),
      '.specweave',
      'increments',
      incrementId
    );

    // 1. Validate increment doesn't exist
    if (fs.existsSync(incrementPath)) {
      throw new Error(`Increment already exists: ${incrementId}`);
    }

    // 2. Create increment directory
    await fs.ensureDir(incrementPath);

    // 3. Load testing config from .specweave/config.json
    const configPath = path.join(process.cwd(), '.specweave', 'config.json');
    let testMode = options.testMode || 'TDD';
    let coverageTarget = options.coverageTarget || 80;

    if (fs.existsSync(configPath)) {
      const config = await fs.readJson(configPath);
      testMode = config.testing?.defaultTestMode || testMode;
      coverageTarget = config.testing?.defaultCoverageTarget || coverageTarget;
    }

    // 4. Create metadata.json IMMEDIATELY
    const metadata: IncrementMetadata = {
      id: incrementId,
      status: IncrementStatus.ACTIVE,
      type: options.type || IncrementType.FEATURE,
      created: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      testMode,
      coverageTarget,
      ...(options.priority && { priority: options.priority }),
      ...(options.feature && { feature: options.feature }),
      ...(options.projects && { projects: options.projects })
    };

    await fs.writeJson(
      path.join(incrementPath, 'metadata.json'),
      metadata,
      { spaces: 2 }
    );

    // 5. Update active increment state
    const activeManager = new ActiveIncrementManager();
    activeManager.setActive(incrementId);
  }
}
```

### Integration Points

**1. Increment Planner Agent** (`plugins/specweave/agents/pm/AGENT.md`)

Add at the end of planning:
```markdown
## Final Step: Create Increment Structure

After generating spec.md, plan.md, and tasks.md, invoke TypeScript to create the increment:

```typescript
import { IncrementCreator } from '../../src/core/increment/increment-creator.js';

await IncrementCreator.create('0038-serverless-architecture-intelligence', {
  type: 'feature',
  priority: 'P1',
  feature: 'FS-038',
  projects: ['specweave']
});
```

This ensures metadata.json exists BEFORE any hooks run.
```

**2. Post-Increment-Planning Hook** (DOWNGRADE to validation only)

```bash
# Lines 755-817: REMOVE fallback creation logic
# Hook now VALIDATES metadata.json exists and logs warning if missing

if [ ! -f "$metadata_file" ]; then
  log_error "❌ CRITICAL: metadata.json not found!"
  log_error "   This indicates IncrementCreator was not called."
  log_error "   Please report this bug."
  exit 1  # Fail the hook (non-blocking)
fi
```

### Benefits

1. **Reliability**: TypeScript code always runs (no dependency on hooks)
2. **Testability**: Can unit test increment creation
3. **Debuggability**: Stack traces, error handling
4. **Performance**: No shell overhead
5. **Maintainability**: All logic in one place
6. **Type Safety**: Compile-time checks for metadata schema

---

## Testing Strategy

### 1. Unit Tests (NEW)

**File**: `tests/unit/increment/increment-creator.test.ts`

```typescript
describe('IncrementCreator', () => {
  test('creates metadata.json during increment creation', async () => {
    await IncrementCreator.create('0001-test', { type: 'feature' });
    expect(fs.existsSync('.specweave/increments/0001-test/metadata.json')).toBe(true);
  });

  test('inherits testing config from .specweave/config.json', async () => {
    // Create config with TDD mode
    await fs.writeJson('.specweave/config.json', {
      testing: { defaultTestMode: 'TDD', defaultCoverageTarget: 95 }
    });

    await IncrementCreator.create('0002-test');
    const metadata = await fs.readJson('.specweave/increments/0002-test/metadata.json');
    expect(metadata.testMode).toBe('TDD');
    expect(metadata.coverageTarget).toBe(95);
  });

  test('prevents creating duplicate increments', async () => {
    await IncrementCreator.create('0003-test');
    await expect(IncrementCreator.create('0003-test')).rejects.toThrow(/already exists/);
  });
});
```

### 2. E2E Tests (EXISTING)

**File**: `tests/e2e/metadata-provisioning.spec.ts` (already created)

All 9 tests PASS with current lazy initialization.

### 3. Integration Tests (NEW)

**File**: `tests/integration/increment-planner/metadata-creation.test.ts`

```typescript
describe('Increment Planner → Metadata Creation', () => {
  test('PM agent calls IncrementCreator after generating specs', async () => {
    // Simulate full increment planning flow
    // Verify metadata.json exists immediately after
  });
});
```

---

## Migration Plan

### Phase 1: Add IncrementCreator (Non-Breaking)

1. Create `src/core/increment/increment-creator.ts`
2. Add unit tests
3. Document API

### Phase 2: Update Agents (Opt-In)

1. Update PM agent to call IncrementCreator
2. Test with new increments
3. Monitor for regressions

### Phase 3: Deprecate Hook Fallback (Warning)

1. Hook logs warning if it creates metadata (should never happen)
2. Monitor logs for occurrences
3. Fix any agents not calling IncrementCreator

### Phase 4: Remove Hook Fallback (Breaking Change)

1. Hook fails if metadata.json missing
2. Increment creation REQUIRES IncrementCreator
3. Update CHANGELOG with breaking change

---

## Immediate Action Items

- [x] Create metadata.json for increment 0038
- [x] Create E2E tests for metadata provisioning
- [x] Document root cause and solution
- [ ] Create `IncrementCreator` class
- [ ] Add unit tests for `IncrementCreator`
- [ ] Update PM agent to call `IncrementCreator`
- [ ] Add integration tests
- [ ] Update post-increment-planning hook to validation mode
- [ ] Update CLAUDE.md with new architecture

---

## References

**Code Locations**:
- MetadataManager: `src/core/increment/metadata-manager.ts`
- Post-Increment-Planning Hook: `plugins/specweave/hooks/post-increment-planning.sh:755-817`
- Test Helpers: `tests/helpers/increment-test-helpers.ts`
- New E2E Tests: `tests/e2e/metadata-provisioning.spec.ts`

**Related Increments**:
- 0007: Smart Status Management (introduced metadata.json)
- 0038: Serverless Architecture Intelligence (exposed this bug)

**Architecture Docs**:
- `.specweave/docs/internal/architecture/hld-system.md`
- `.specweave/docs/internal/architecture/adr/` (potential ADR needed)

---

**Analysis by**: Claude (Sonnet 4.5)
**Date**: 2025-11-16
**Status**: FIXED (short-term), PROPOSED (long-term)
