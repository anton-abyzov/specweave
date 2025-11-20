# Duplicate Increment Prevention Strategy

**Version**: 1.0
**Date**: 2025-11-20
**Status**: Active
**Incident**: 0039 duplicate (active + archived)

---

## Problem Statement

Increment `0039-ultra-smart-next-command` exists in TWO locations:
- `.specweave/increments/0039-ultra-smart-next-command/` (Nov 20)
- `.specweave/increments/_archive/0039-ultra-smart-next-command/` (Nov 17)

This violates the **unique increment number constraint** and causes:
- Status line confusion (which increment is active?)
- `/specweave:fix-duplicates` warnings
- Risk of data loss (which version is canonical?)
- Git commit pollution (both untracked)

---

## Root Cause Analysis

### Timeline
1. **Nov 17 18:26**: Increment 0039 completed and archived
2. **Nov 20 12:20**: Increment 0039 reappears in active folder
3. **Result**: Duplicate (3 days later)

### Most Likely Cause
**Manual file operations bypassing SpecWeave APIs**:
```bash
# ❌ WRONG (creates duplicate)
cp -r .specweave/increments/_archive/0039-* .specweave/increments/

# ✅ CORRECT (prevents duplicate)
/specweave:restore 0039
```

### Other Possible Causes
- Git checkout of old commit (active version restored)
- Failed restore operation (cleanup didn't complete)
- Concurrent processes (race condition)
- External tool sync issue (GitHub/JIRA restore)

---

## Detection Mechanisms (Already Working)

### 1. Runtime Detection
- **Tool**: `detectDuplicatesByNumber()` in `src/core/increment/duplicate-detector.ts`
- **Trigger**: Before archive/restore operations (lines 256-276, 413-433)
- **Output**: Blocks operation with error message

### 2. Status Line Detection
- **Tool**: Status line shows duplicate warning
- **Trigger**: On every prompt
- **Output**: `⚠️ Duplicate increment(s) detected: 0039`

### 3. Fix-Duplicates Command
- **Tool**: `/specweave:fix-duplicates`
- **Trigger**: Manual invocation
- **Output**: Guided resolution wizard

---

## Prevention Mechanisms (6 Layers)

### Layer 1: Pre-Commit Hook (CRITICAL!)

**Goal**: Block commits containing duplicate increments

**Implementation**:
```bash
#!/bin/bash
# File: .git/hooks/pre-commit

# Run duplicate detection
output=$(npx tsx -e "
import { detectAllDuplicates } from './dist/src/core/increment/duplicate-detector.js';
const report = await detectAllDuplicates('.');
if (report.duplicateCount > 0) {
  console.error('❌ DUPLICATE INCREMENTS DETECTED');
  console.error('Run /specweave:fix-duplicates before committing');
  process.exit(1);
}
")

if [ $? -ne 0 ]; then
  echo "$output"
  exit 1
fi
```

**Trigger**: Every `git commit`
**Scope**: All staged files in `.specweave/increments/`
**Action**: Block commit if duplicates exist

---

### Layer 2: Atomic Operations with Rollback

**Goal**: Ensure archive/restore operations are transactional

**Current State** (increment-archiver.ts:252-288):
```typescript
// ✅ Has duplicate check (lines 256-276)
// ✅ Uses fs.move() (line 280)
// ❌ No rollback on partial failure
```

**Enhancement**:
```typescript
async archiveIncrement(increment: string): Promise<void> {
  const lockFile = path.join(this.incrementsDir, '.archiving');

  try {
    // 1. Create lock file
    await fs.writeFile(lockFile, increment);

    // 2. Pre-flight check (ATOMIC)
    await this.validateNoExistingDuplicates(increment);

    // 3. Move operation
    await fs.move(sourcePath, targetPath, { overwrite: false });

    // 4. Post-operation verification
    const sourceGone = !await fs.pathExists(sourcePath);
    const targetExists = await fs.pathExists(targetPath);

    if (!sourceGone || !targetExists) {
      throw new Error('Archive operation incomplete');
    }

    // 5. Clear lock
    await fs.remove(lockFile);

  } catch (error) {
    // Rollback: restore from target if exists
    if (await fs.pathExists(targetPath) && !await fs.pathExists(sourcePath)) {
      await fs.move(targetPath, sourcePath);
    }
    throw error;
  } finally {
    await fs.remove(lockFile).catch(() => {});
  }
}
```

**Benefits**:
- Lock file prevents concurrent operations
- Rollback ensures no partial state
- Verification catches edge cases

---

### Layer 3: Increment Number Lock File

**Goal**: Prevent concurrent operations on same increment

**Implementation**:
```typescript
class IncrementLock {
  private lockDir = '.specweave/.locks';

  async acquire(incrementNumber: string): Promise<void> {
    const lockFile = path.join(this.lockDir, `${incrementNumber}.lock`);

    // Try to create lock file (fails if exists)
    try {
      await fs.writeFile(lockFile, JSON.stringify({
        pid: process.pid,
        timestamp: Date.now(),
        operation: 'archive'
      }), { flag: 'wx' }); // Exclusive create
    } catch (error) {
      throw new Error(`Increment ${incrementNumber} is locked by another operation`);
    }
  }

  async release(incrementNumber: string): Promise<void> {
    const lockFile = path.join(this.lockDir, `${incrementNumber}.lock`);
    await fs.remove(lockFile);
  }
}
```

**Usage**:
```typescript
const lock = new IncrementLock();
await lock.acquire('0039');
try {
  await this.archiveIncrement(increment);
} finally {
  await lock.release('0039');
}
```

---

### Layer 4: Audit Trail

**Goal**: Track all archive/restore operations for debugging

**Implementation**:
```typescript
interface AuditEntry {
  timestamp: string;
  operation: 'archive' | 'restore';
  incrementNumber: string;
  incrementName: string;
  status: 'success' | 'failure' | 'rollback';
  error?: string;
  user?: string;
}

class AuditLog {
  private logFile = '.specweave/logs/archive-operations.jsonl';

  async log(entry: AuditEntry): Promise<void> {
    await fs.appendFile(
      this.logFile,
      JSON.stringify(entry) + '\n'
    );
  }
}
```

**Benefits**:
- Debug duplicate creation
- Track who/when operations occurred
- Identify patterns (e.g., frequent restore-archive cycles)

---

### Layer 5: Startup Validation

**Goal**: Detect duplicates at CLI startup

**Implementation**:
```typescript
// src/cli/index.ts
async function main() {
  // Validate on startup
  const duplicates = await detectAllDuplicates('.');

  if (duplicates.duplicateCount > 0) {
    console.warn('⚠️  Duplicate increments detected!');
    console.warn('   Run /specweave:fix-duplicates to resolve');
    console.warn('');
  }

  // Continue with CLI...
}
```

**Trigger**: Every CLI invocation
**Scope**: All increments (active, archive, abandoned)
**Action**: Warn user (non-blocking)

---

### Layer 6: External Tool Sync Protection

**Goal**: Prevent GitHub/JIRA/ADO syncs from creating duplicates

**Implementation**:
```typescript
// Before syncing from external tool
async syncFromExternal(externalId: string): Promise<void> {
  // 1. Check if increment already exists
  const existingMetadata = await this.findIncrementByExternalId(externalId);

  if (existingMetadata) {
    // 2. Check for duplicates
    const duplicates = await detectDuplicatesByNumber(
      existingMetadata.incrementNumber
    );

    if (duplicates.length > 1) {
      throw new Error(
        `Cannot sync: Increment ${existingMetadata.incrementNumber} ` +
        `exists in multiple locations. Run /specweave:fix-duplicates first.`
      );
    }

    // 3. Update existing increment (don't create new)
    await this.updateIncrement(existingMetadata.incrementNumber, data);
  } else {
    // 4. Create new increment
    await this.createIncrement(data);
  }
}
```

---

## Resolution Workflow (Immediate)

### Step 1: Run Fix-Duplicates Command
```bash
/specweave:fix-duplicates
```

**Expected Output**:
```
🔍 Scanning for duplicates...
✗ 0039-ultra-smart-next-command [completed]
  → .specweave/increments/0039-ultra-smart-next-command/
  ✗ .specweave/increments/_archive/0039-ultra-smart-next-command/

Recommended winner: Active version (Nov 20, most recent)
Action: Delete archived version

Proceed? (y/n)
```

### Step 2: Verify Resolution
```bash
# Check no duplicates remain
ls .specweave/increments/ | grep 0039
ls .specweave/increments/_archive/ | grep 0039

# Should see only ONE result
```

### Step 3: Commit Resolution
```bash
git add .specweave/increments/
git commit -m "fix: resolve duplicate increment 0039"
```

---

## Implementation Priority

| Layer | Priority | Effort | Impact | Status |
|-------|----------|--------|--------|--------|
| **Layer 1**: Pre-commit hook | P0 | 2h | High | Pending |
| **Layer 2**: Atomic operations | P0 | 4h | High | Pending |
| **Layer 3**: Lock files | P1 | 3h | Medium | Pending |
| **Layer 4**: Audit trail | P2 | 2h | Medium | Pending |
| **Layer 5**: Startup validation | P1 | 1h | Low | Pending |
| **Layer 6**: External sync protection | P0 | 3h | High | Pending |

**Total Effort**: 15 hours
**Expected Completion**: 2 days

---

## Testing Strategy

### Unit Tests
- `tests/unit/increment/duplicate-prevention.test.ts`
- Test concurrent archive operations
- Test rollback scenarios
- Test lock file acquisition/release

### Integration Tests
- `tests/integration/archiving/atomic-operations.test.ts`
- Test archive → restore → archive cycle
- Test Git operations (checkout old commits)
- Test external tool sync edge cases

### E2E Tests
- Manual testing workflow:
  1. Archive increment
  2. Manually copy back (simulate bug)
  3. Verify pre-commit hook blocks
  4. Run /specweave:fix-duplicates
  5. Verify resolution

---

## Metrics & Monitoring

### Success Criteria
- ✅ Zero duplicate increments in production
- ✅ Pre-commit hook blocks 100% of duplicate commits
- ✅ Archive operations complete atomically (no partial states)
- ✅ Audit log captures all operations

### Monitoring
- Daily cron job: `npx tsx -e "detectAllDuplicates('.')"` → Slack alert
- Pre-commit hook success rate
- Archive/restore operation count (audit log)

---

## Related Incidents

- **2025-11-20**: Increment 0039 duplicate (active + archived)
- **Root Cause**: Manual file copy bypassing SpecWeave APIs
- **Resolution**: `/specweave:fix-duplicates` → delete archived version

---

## References

- `src/core/increment/increment-archiver.ts` (archive logic)
- `src/core/increment/duplicate-detector.ts` (detection logic)
- `src/core/living-docs/feature-archiver.ts` (feature archiving)
- ADR-0033: Duplicate Increment Prevention System
- Increment 0033: Duplicate prevention implementation

---

## Appendix: Common User Mistakes

### ❌ Don't Do This
```bash
# Manual archive (creates duplicate)
mv .specweave/increments/0039-* .specweave/increments/_archive/

# Manual restore (creates duplicate)
cp -r .specweave/increments/_archive/0039-* .specweave/increments/

# Git checkout (restores old state)
git checkout old-commit -- .specweave/increments/0039-*
```

### ✅ Do This Instead
```bash
# Official archive
/specweave:archive 0039

# Official restore
/specweave:restore 0039

# Check status before Git operations
/specweave:status
```
