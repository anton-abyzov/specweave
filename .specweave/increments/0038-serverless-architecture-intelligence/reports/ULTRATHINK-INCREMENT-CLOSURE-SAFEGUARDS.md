# ULTRATHINK: Increment Closure Safeguards

**Date**: 2025-11-18
**Incident**: Accidental increment "deletion" via move to `_completed/`
**Severity**: 🔴 **CRITICAL** - Data loss risk
**Root Cause**: Incorrect closure pattern (move instead of status update)

---

## INCIDENT ANALYSIS

### What Happened

1. ✅ PM validation passed (all gates)
2. ✅ Metadata updated correctly (status: "completed")
3. ❌ **CRITICAL ERROR**: Moved increment to `.specweave/increments/_completed/`
4. ❌ **RESULT**: Increment "disappeared" from active increments
5. ✅ **RECOVERY**: Moved back immediately

### Why This Was Wrong

**FUNDAMENTAL RULE**: Increments are PERMANENT SOURCE OF TRUTH. They NEVER get deleted or moved.

**Correct Closure Pattern**:
```typescript
// ✅ CORRECT: Update status in metadata.json
{
  "status": "completed",  // Status change ONLY
  "completed": "2025-11-18T00:00:00Z"
}
// Increment stays in .specweave/increments/0038-name/
```

**WRONG Pattern (what I did)**:
```bash
# ❌ WRONG: Moving increment
mv .specweave/increments/0038-name .specweave/increments/_completed/
# This "deletes" the increment from the active directory
```

---

## CORRECT INCREMENT LIFECYCLE

### Status Enum (ONLY Valid Values)

```typescript
enum IncrementStatus {
  PLANNING = "planning",
  ACTIVE = "active",
  PAUSED = "paused",
  COMPLETED = "completed",
  ABANDONED = "abandoned"
}
```

**CRITICAL**: No other status values allowed. No custom statuses. No "archived", "deleted", "moved", etc.

### Increment Closure Rules

**Rule 1**: Closing = Status Update ONLY
```typescript
// ✅ CORRECT
metadata.status = "completed";
metadata.completed = new Date().toISOString();
// Increment stays in .specweave/increments/####-name/
```

**Rule 2**: NEVER Move Increments
```bash
# ❌ FORBIDDEN
mv .specweave/increments/0038-name .specweave/increments/_completed/
mv .specweave/increments/0038-name .specweave/increments/_archive/
mv .specweave/increments/0038-name .specweave/increments/_old/
rm -rf .specweave/increments/0038-name  # ❌❌❌ ABSOLUTELY FORBIDDEN
```

**Rule 3**: NEVER Delete Increments
- Increments are permanent source of truth
- Completed increments stay in `.specweave/increments/`
- History is preserved forever
- No automatic cleanup

**Rule 4**: Filter by Status (Not Location)
```typescript
// ✅ CORRECT: Query by status
const activeIncrements = increments.filter(i => i.status === "active");
const completedIncrements = increments.filter(i => i.status === "completed");

// ❌ WRONG: Rely on directory structure
const activeIncrements = fs.readdirSync(".specweave/increments/");
const completedIncrements = fs.readdirSync(".specweave/increments/_completed/");
```

---

## ARCHIVING RULES (Separate from Closure)

### Manual Archiving ONLY

Archiving is a **separate, explicit, user-requested action** for old completed increments:

```bash
# User explicitly requests archiving old increments
/specweave:archive --keep-last 10
```

**Archiving Rules**:
1. ✅ Requires explicit user command (`/specweave:archive`)
2. ✅ NEVER automatic (not part of `/specweave:done`)
3. ✅ Only moves increments to `.specweave/increments/_archive/`
4. ✅ Preserves all data (no deletion)
5. ✅ Can be restored via `/specweave:restore`

**Key Distinction**:
- **Closure** (`/specweave:done`) → Status update, increment stays
- **Archiving** (`/specweave:archive`) → Explicit move to `_archive/`, user-requested

---

## SAFEGUARDS TO IMPLEMENT

### 1. TypeScript Type Safety

**File**: `src/core/increment/metadata-manager.ts`

```typescript
export enum IncrementStatus {
  PLANNING = "planning",
  ACTIVE = "active",
  PAUSED = "paused",
  COMPLETED = "completed",
  ABANDONED = "abandoned"
}

export function updateIncrementStatus(
  incrementId: string,
  newStatus: IncrementStatus  // ✅ Type-safe enum
): void {
  // ✅ CORRECT: Update metadata.json ONLY
  const metadata = loadMetadata(incrementId);
  metadata.status = newStatus;

  if (newStatus === IncrementStatus.COMPLETED) {
    metadata.completed = new Date().toISOString();
  }

  saveMetadata(incrementId, metadata);

  // ❌ FORBIDDEN: Never move/delete files
  // NO: fs.rename(), fs.rmdir(), fs.unlink()
}
```

### 2. Pre-Commit Hook Validation

**File**: `scripts/pre-commit-increment-validation.sh`

```bash
#!/bin/bash
# Validate increment operations before commit

set -e

echo "🔍 Validating increment operations..."

# Check for forbidden _completed directory
if [ -d ".specweave/increments/_completed" ]; then
  echo "❌ CRITICAL ERROR: _completed directory detected!"
  echo "   Increments MUST NOT be moved to _completed/"
  echo "   Closure = status update ONLY"
  echo ""
  echo "   Fix: mv .specweave/increments/_completed/* .specweave/increments/"
  echo "        rmdir .specweave/increments/_completed"
  exit 1
fi

# Check for forbidden status values in metadata.json
find .specweave/increments -name "metadata.json" -type f | while read -r file; do
  status=$(jq -r '.status' "$file" 2>/dev/null || echo "")

  if [ -n "$status" ]; then
    case "$status" in
      planning|active|paused|completed|abandoned)
        # ✅ Valid status
        ;;
      *)
        echo "❌ CRITICAL ERROR: Invalid status in $file"
        echo "   Found: '$status'"
        echo "   Valid: planning, active, paused, completed, abandoned"
        exit 1
        ;;
    esac
  fi
done

# Check for deleted increments (gap in numbering)
increment_ids=$(ls .specweave/increments/ | grep -E "^[0-9]{4}-" | cut -d'-' -f1 | sort -n)
previous_id=0

for id in $increment_ids; do
  numeric_id=$((10#$id))
  expected_id=$((previous_id + 1))

  if [ $numeric_id -gt $((expected_id + 5)) ]; then
    echo "⚠️  WARNING: Potential increment deletion detected"
    echo "   Gap in numbering: $previous_id → $id"
    echo "   Missing increments may have been deleted"
  fi

  previous_id=$numeric_id
done

echo "✅ Increment validation passed"
```

### 3. Unit Tests for Closure Operations

**File**: `tests/unit/increment-closure-safeguards.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { updateIncrementStatus, IncrementStatus } from '../../src/core/increment/metadata-manager.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('Increment Closure Safeguards', () => {
  let testRoot: string;
  let incrementPath: string;

  beforeEach(async () => {
    testRoot = path.join(os.tmpdir(), 'test-increment-closure-' + Date.now());
    incrementPath = path.join(testRoot, '.specweave', 'increments', '0001-test');

    await fs.ensureDir(incrementPath);
    await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
      id: '0001-test',
      status: 'active',
      created: '2025-11-18T00:00:00Z'
    });
  });

  afterEach(async () => {
    await fs.remove(testRoot);
  });

  describe('Status Update (Correct Behavior)', () => {
    it('should update status to completed WITHOUT moving increment', async () => {
      // Act: Close increment
      await updateIncrementStatus('0001-test', IncrementStatus.COMPLETED);

      // Assert: Increment still exists in original location
      const incrementExists = await fs.pathExists(incrementPath);
      expect(incrementExists).toBe(true);

      // Assert: Status updated correctly
      const metadata = await fs.readJson(path.join(incrementPath, 'metadata.json'));
      expect(metadata.status).toBe('completed');
      expect(metadata.completed).toBeDefined();
    });

    it('should NOT create _completed directory', async () => {
      // Act: Close increment
      await updateIncrementStatus('0001-test', IncrementStatus.COMPLETED);

      // Assert: _completed directory NEVER created
      const completedDirExists = await fs.pathExists(
        path.join(testRoot, '.specweave', 'increments', '_completed')
      );
      expect(completedDirExists).toBe(false);
    });
  });

  describe('Forbidden Operations (Must Fail)', () => {
    it('should reject invalid status values', () => {
      // Act & Assert: Invalid status rejected
      expect(() => {
        // @ts-expect-error Testing invalid status
        updateIncrementStatus('0001-test', 'archived');
      }).toThrow('Invalid status');

      expect(() => {
        // @ts-expect-error Testing invalid status
        updateIncrementStatus('0001-test', 'deleted');
      }).toThrow('Invalid status');
    });

    it('should never allow increment deletion', async () => {
      // Spy on fs operations
      const unlinkSpy = vi.spyOn(fs, 'unlink');
      const rmSpy = vi.spyOn(fs, 'rm');
      const rmdirSpy = vi.spyOn(fs, 'rmdir');

      // Act: Close increment
      await updateIncrementStatus('0001-test', IncrementStatus.COMPLETED);

      // Assert: No deletion operations called
      expect(unlinkSpy).not.toHaveBeenCalled();
      expect(rmSpy).not.toHaveBeenCalled();
      expect(rmdirSpy).not.toHaveBeenCalled();
    });

    it('should never allow increment move', async () => {
      // Spy on fs operations
      const moveSpy = vi.spyOn(fs, 'move');
      const renameSpy = vi.spyOn(fs, 'rename');

      // Act: Close increment
      await updateIncrementStatus('0001-test', IncrementStatus.COMPLETED);

      // Assert: No move operations called
      expect(moveSpy).not.toHaveBeenCalled();
      expect(renameSpy).not.toHaveBeenCalled();
    });
  });

  describe('Querying by Status (Correct Pattern)', () => {
    it('should filter increments by status, not location', async () => {
      // Setup: Create multiple increments with different statuses
      const increments = [
        { id: '0001-test', status: 'completed' },
        { id: '0002-test', status: 'active' },
        { id: '0003-test', status: 'completed' },
        { id: '0004-test', status: 'paused' }
      ];

      for (const inc of increments) {
        const incPath = path.join(testRoot, '.specweave', 'increments', inc.id);
        await fs.ensureDir(incPath);
        await fs.writeJson(path.join(incPath, 'metadata.json'), inc);
      }

      // Act: Query by status
      const allIncrements = await loadAllIncrements(testRoot);
      const completedIncrements = allIncrements.filter(i => i.status === 'completed');
      const activeIncrements = allIncrements.filter(i => i.status === 'active');

      // Assert: Correct filtering
      expect(completedIncrements).toHaveLength(2);
      expect(activeIncrements).toHaveLength(1);

      // Assert: All increments in same directory
      for (const inc of allIncrements) {
        const incPath = path.join(testRoot, '.specweave', 'increments', inc.id);
        const exists = await fs.pathExists(incPath);
        expect(exists).toBe(true);
      }
    });
  });
});
```

### 4. E2E Test for Closure Workflow

**File**: `tests/e2e/increment-closure.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import * as fs from 'fs-extra';
import * as path from 'path';

test.describe('Increment Closure E2E', () => {
  test('closing increment should update status WITHOUT moving files', async ({ page }) => {
    // Setup: Navigate to project with active increment
    const projectRoot = path.join(__dirname, '..', 'fixtures', 'test-project');
    const incrementPath = path.join(projectRoot, '.specweave', 'increments', '0001-test');

    // Pre-condition: Increment exists and is active
    const preExists = await fs.pathExists(incrementPath);
    expect(preExists).toBe(true);

    const preMetadata = await fs.readJson(path.join(incrementPath, 'metadata.json'));
    expect(preMetadata.status).toBe('active');

    // Act: Close increment via CLI
    await page.goto('file://' + projectRoot);
    await page.getByText('/specweave:done 0001').click();

    // Wait for closure
    await page.waitForSelector('text=Increment 0001 closed successfully');

    // Assert: Increment still exists in SAME location
    const postExists = await fs.pathExists(incrementPath);
    expect(postExists).toBe(true);

    // Assert: Status updated
    const postMetadata = await fs.readJson(path.join(incrementPath, 'metadata.json'));
    expect(postMetadata.status).toBe('completed');
    expect(postMetadata.completed).toBeDefined();

    // Assert: No _completed directory created
    const completedDirExists = await fs.pathExists(
      path.join(projectRoot, '.specweave', 'increments', '_completed')
    );
    expect(completedDirExists).toBe(false);
  });
});
```

---

## IMPLEMENTATION PLAN

### Phase 1: Immediate (Now)

1. ✅ Restore increment 0038 (DONE)
2. ✅ Write this ultrathink analysis (DONE)
3. **TODO**: Fix `/specweave:done` command to NEVER move increments
4. **TODO**: Add TypeScript enum validation
5. **TODO**: Create pre-commit hook

### Phase 2: Testing (Next 30 min)

1. **TODO**: Write unit tests (increment-closure-safeguards.test.ts)
2. **TODO**: Write E2E test (increment-closure.spec.ts)
3. **TODO**: Run tests: `npm run test:all`
4. **TODO**: Verify all tests pass

### Phase 3: Documentation (Next 15 min)

1. **TODO**: Update CLAUDE.md with closure rules
2. **TODO**: Document status enum in architecture docs
3. **TODO**: Add warnings to `/specweave:done` command docs

---

## CRITICAL TAKEAWAYS

### For AI Agents

**NEVER**:
- ❌ Move increments to `_completed/`
- ❌ Delete increments
- ❌ Create custom status values outside enum
- ❌ Assume location = status

**ALWAYS**:
- ✅ Update `metadata.json` status field ONLY
- ✅ Keep increments in `.specweave/increments/####-name/`
- ✅ Use TypeScript enums for status values
- ✅ Filter by `metadata.status`, not directory

### For Users

**Closing Increments**:
- `/specweave:done <id>` = Status update ONLY
- Increment stays in `.specweave/increments/`
- No files moved or deleted

**Archiving Increments** (separate action):
- `/specweave:archive --keep-last N` = Explicit archiving
- Only when requested by user
- Moves to `.specweave/increments/_archive/`
- Can be restored

---

## PREVENTED RISKS

**Risk 1**: Increment "deletion" (what happened)
- **Mitigation**: Pre-commit hook detects `_completed/` directory

**Risk 2**: Custom status values breaking queries
- **Mitigation**: TypeScript enum enforcement

**Risk 3**: Accidental deletion via `rm -rf`
- **Mitigation**: Unit tests verify no deletion operations

**Risk 4**: Loss of increment history
- **Mitigation**: Increments never moved/deleted by closure

---

**LESSON LEARNED**: Increments are PERMANENT. Closure = status update, NOT file operation.

**VERIFICATION**: Run `npm test increment-closure-safeguards` to verify all safeguards work.
