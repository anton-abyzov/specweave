# ULTRATHINK: Status Line Force Update Analysis

**Date**: 2025-11-18
**Context**: Increment 0043 - spec.md desync fix
**Problem**: Status line never gets updated, need command to force update
**Analyst**: Claude (Sonnet 4.5)

---

## Problem Statement

### User Report
> "status line never gets updated, we MUST have a specweave command to force updating with the latest current status. This command MUST be called after each [action]"

### Root Cause Analysis

**Current Architecture**:
```
Status Line Update Flow:
1. User makes changes → metadata.json updated
2. Hook triggers → update-status-line.sh runs ASYNC
3. Hook updates cache → .specweave/state/status-line.json
4. Claude Code polls cache → displays in status line

Problem: ASYNC updates = user doesn't see changes immediately!
```

**Why Status Line Appears "Stale"**:

1. **Async Hook Execution** (`update-status-line.sh`):
   - Runs in background after commands
   - Takes 50-100ms to execute
   - User sees OLD cache during this window

2. **Cache-First Strategy** (performance optimization):
   - `StatusLineManager.render()` reads cache file
   - Doesn't scan all increments (too slow)
   - Cache may be outdated for 50-100ms

3. **No Manual Refresh Mechanism**:
   - User has NO way to force cache update
   - Must wait for next async hook trigger
   - Creates perception of "broken" status line

---

## Current Status Line Architecture

### Components

**1. Metadata Layer** (Source of Truth):
```typescript
// src/core/increment/metadata-manager.ts
MetadataManager.updateStatus(incrementId, newStatus)
  → Updates metadata.json
  → Calls SpecFrontmatterUpdater.updateStatus() (fire-and-forget)
  → Calls ActiveIncrementManager.smartUpdate()
```

**2. Active Increment Cache** (Active increments only):
```typescript
// src/core/increment/active-increment-manager.ts
ActiveIncrementManager
  → Manages .specweave/state/active-increment.json
  → Tracks up to 2 active increments (max)
  → smartUpdate() scans all metadata.json, writes cache
```

**3. Status Line Cache** (Full progress data):
```bash
# plugins/specweave/hooks/lib/update-status-line.sh
update-status-line.sh
  → Scans all spec.md files (source of truth!)
  → Parses tasks.md for progress
  → Writes .specweave/state/status-line.json
  → Runs ASYNC (50-100ms)
```

**4. Status Line Manager** (Renderer):
```typescript
// src/core/status-line/status-line-manager.ts
StatusLineManager.render()
  → Reads status-line.json cache
  → Formats for Claude Code display
  → Returns: "[0043] ████░░░░ 5/8 tasks (2 open)"
```

### Data Flow

```
User Action (e.g., /specweave:done)
  ↓
MetadataManager.updateStatus()
  ↓
  ├─ metadata.json updated (SYNC)
  ├─ spec.md frontmatter updated (ASYNC, fire-and-forget)
  └─ ActiveIncrementManager.smartUpdate() (SYNC)
      ↓
      active-increment.json updated (SYNC)
  ↓
Hook Triggered (post-task-completion, etc.)
  ↓
update-status-line.sh (ASYNC, 50-100ms)
  ↓
  ├─ Scans all spec.md files
  ├─ Parses tasks.md
  └─ Writes status-line.json
  ↓
Claude Code Polls Cache (periodic)
  ↓
StatusLineManager.render() → Display

PROBLEM: User sees OLD cache between "Hook Triggered" and "status-line.json updated"
```

---

## Solution Design

### Option 1: Synchronous Command (RECOMMENDED)

**Command**: `/specweave:update-status`

**Purpose**: Force-update status line cache synchronously (user waits for completion)

**When to Use**:
- After completing tasks (user wants to see updated progress)
- After status changes (active → completed)
- When status line appears stale
- Before checking progress (`/specweave:progress`)

**Implementation**:

```typescript
// New CLI: src/cli/update-status-line.ts
#!/usr/bin/env node
import { StatusLineUpdater } from '../core/status-line/status-line-updater.js';

async function main() {
  const updater = new StatusLineUpdater();
  await updater.update();
  console.log('✓ Status line cache updated');
}

main().catch((error) => {
  console.error('❌ Failed to update status line:', error);
  process.exit(1);
});
```

```typescript
// New class: src/core/status-line/status-line-updater.ts
/**
 * Status Line Updater
 *
 * Synchronously updates status line cache by scanning spec.md files.
 * Equivalent to update-status-line.sh but runs SYNCHRONOUSLY.
 */
export class StatusLineUpdater {
  async update(rootDir: string = process.cwd()): Promise<void> {
    // Step 1: Find all open increments (scan spec.md)
    const openIncrements = await this.findOpenIncrements(rootDir);

    // Step 2: Sort by creation date (oldest first)
    const sorted = openIncrements.sort((a, b) =>
      new Date(a.created).getTime() - new Date(b.created).getTime()
    );

    // Step 3: Get current increment (oldest)
    const current = sorted[0] || null;

    // Step 4: Parse tasks.md for progress
    const progress = current
      ? await this.parseTaskProgress(rootDir, current.id)
      : { completed: 0, total: 0, percentage: 0 };

    // Step 5: Write cache
    const cache = {
      current: current ? {
        id: current.id,
        name: current.id, // Format: "0043-spec-md-desync-fix"
        completed: progress.completed,
        total: progress.total,
        percentage: progress.percentage
      } : null,
      openCount: openIncrements.length,
      lastUpdate: new Date().toISOString()
    };

    await this.writeCache(rootDir, cache);
  }

  private async findOpenIncrements(rootDir: string): Promise<OpenIncrement[]> {
    // Scan .specweave/increments/*/spec.md
    // Parse YAML frontmatter for status
    // Filter: status === 'active' || 'planning' || 'in-progress'
    // Return: [{id, created}]
  }

  private async parseTaskProgress(rootDir: string, incrementId: string): Promise<TaskProgress> {
    // Read tasks.md
    // Use TaskCounter for accurate counting
    // Return: {completed, total, percentage}
  }

  private async writeCache(rootDir: string, cache: StatusLineCache): Promise<void> {
    // Atomic write to .specweave/state/status-line.json
  }
}
```

**Slash Command** (`plugins/specweave/commands/specweave-update-status.md`):

```markdown
---
name: specweave:update-status
description: Force-update status line cache with latest increment status
---

# Update Status Line

**Purpose**: Force-refresh status line cache when it appears stale.

**Use When**:
- Status line doesn't reflect recent changes
- After completing tasks (want to see updated progress)
- After status transitions (active → completed)
- Before checking progress

**How It Works**:
1. Scans all spec.md files for open increments
2. Parses tasks.md for current increment progress
3. Updates status line cache (.specweave/state/status-line.json)
4. Runs SYNCHRONOUSLY (user waits ~50-100ms)

**Usage**:
```bash
# Force-update status line
/specweave:update-status
```

**Example**:
```
Before: [0043] ████░░░░ 5/8 tasks (2 open)  ← STALE
After:  [0043] ████████ 8/8 tasks (1 open)  ← FRESH ✓
```

**Integration**:
- Called automatically by `/specweave:done` (before PM validation)
- Called automatically by `/specweave:progress` (before showing status)
- User can call manually anytime
```

---

### Option 2: Auto-Update on Key Commands (ADDITIONAL)

**Enhancement**: Automatically call `/specweave:update-status` from key commands

**Commands to Auto-Update**:
1. `/specweave:done` - Before PM validation
2. `/specweave:progress` - Before showing status
3. `/specweave:status` - Before showing increment list
4. `/specweave:do` - After completing each task

**Implementation**:

```markdown
# plugins/specweave/commands/specweave-done.md

Add at start:
```bash
# STEP 0: Force-update status line (ensures fresh cache)
echo "🔄 Updating status line..."
node dist/src/cli/update-status-line.js

# STEP 1: PM Validation Gate
...
```

**Benefits**:
- User NEVER sees stale status
- No manual refresh needed
- Consistent UX across all commands

**Cost**:
- +50-100ms per command execution
- Acceptable for user-facing commands (not hooks)

---

## Test Strategy

### Test Coverage

**1. Unit Tests** (`tests/unit/status-line/status-line-updater.test.ts`):
```typescript
describe('StatusLineUpdater', () => {
  it('should scan spec.md files for open increments', async () => {
    // Setup: 3 increments (2 active, 1 completed)
    // Assert: finds 2 open increments
  });

  it('should select oldest increment as current', async () => {
    // Setup: 2 active (created 2025-11-17, 2025-11-18)
    // Assert: selects 2025-11-17 as current
  });

  it('should parse tasks.md for progress', async () => {
    // Setup: tasks.md with 5/8 completed
    // Assert: progress = {completed: 5, total: 8, percentage: 62}
  });

  it('should write cache atomically', async () => {
    // Setup: concurrent updates
    // Assert: no corruption, last write wins
  });

  it('should handle no open increments gracefully', async () => {
    // Setup: all increments completed
    // Assert: cache = {current: null, openCount: 0}
  });
});
```

**2. Integration Tests** (`tests/integration/core/status-line-force-update.test.ts`):
```typescript
describe('Status Line Force Update', () => {
  it('should update cache when command called', async () => {
    // Step 1: Create increment with tasks
    // Step 2: Call update-status-line CLI
    // Step 3: Verify cache updated
  });

  it('should reflect task completion in cache', async () => {
    // Step 1: Increment with 5/8 tasks completed
    // Step 2: Complete 3 more tasks
    // Step 3: Call update-status-line
    // Step 4: Verify cache shows 8/8
  });

  it('should update after status transition', async () => {
    // Step 1: Active increment 0043
    // Step 2: Mark as completed
    // Step 3: Call update-status-line
    // Step 4: Verify cache shows next active increment
  });
});
```

**3. E2E Tests** (`tests/e2e/status-line-workflow.test.ts`):
```typescript
describe('Status Line Workflow', () => {
  it('should show fresh status after /specweave:done', async () => {
    // Simulate: Complete all tasks → /specweave:done
    // Verify: Status line shows 100% completion
  });

  it('should update after manual refresh', async () => {
    // Simulate: Complete tasks → /specweave:update-status
    // Verify: Status line cache updated
  });
});
```

---

## Migration Plan

### Phase 1: Core Implementation
1. ✅ Create `StatusLineUpdater` class (`src/core/status-line/status-line-updater.ts`)
2. ✅ Create CLI wrapper (`src/cli/update-status-line.ts`)
3. ✅ Add unit tests
4. ✅ Add integration tests

### Phase 2: Slash Command
1. ✅ Create command definition (`plugins/specweave/commands/specweave-update-status.md`)
2. ✅ Add to plugin manifest
3. ✅ Test manual invocation

### Phase 3: Auto-Integration
1. ✅ Update `/specweave:done` to call before PM validation
2. ✅ Update `/specweave:progress` to call before display
3. ✅ Update `/specweave:status` to call before display
4. ✅ Test E2E workflows

### Phase 4: Documentation
1. ✅ Update CLAUDE.md quick reference
2. ✅ Add to user guide (`.specweave/docs/public/guides/`)
3. ✅ Add to troubleshooting guide

---

## Success Criteria

### Must Have
- ✅ `/specweave:update-status` command exists
- ✅ Cache updated synchronously (50-100ms)
- ✅ Accurate progress counting (uses TaskCounter)
- ✅ Handles no open increments gracefully
- ✅ Atomic cache writes (no corruption)
- ✅ Unit tests pass (90%+ coverage)
- ✅ Integration tests pass

### Should Have
- ✅ Auto-called from `/specweave:done` before PM validation
- ✅ Auto-called from `/specweave:progress` before display
- ✅ Documentation in CLAUDE.md
- ✅ E2E tests for full workflow

### Nice to Have
- ⚠️ Performance metrics logged (cache update time)
- ⚠️ Progress bar animation in terminal
- ⚠️ Sound notification when cache updated

---

## Risk Assessment

### Low Risk
- **Synchronous execution**: User waits 50-100ms (acceptable)
- **Cache corruption**: Atomic writes prevent this
- **Test isolation**: Uses temp directories

### Medium Risk
- **Performance regression**: If many increments (>100)
  - Mitigation: Optimize spec.md scanning (parallel reads)
- **Race conditions**: Concurrent updates
  - Mitigation: Atomic writes, last write wins

### High Risk
- **Duplicate hook calls**: If both hook AND command run
  - Mitigation: Make hook async, command sync (different purposes)
  - Hook = background refresh (async)
  - Command = user demand (sync)

---

## Alternative Designs Considered

### Alternative 1: Smart Hook (Rejected)
**Idea**: Make hook detect when cache is stale, auto-refresh

**Rejected Because**:
- Still async, user doesn't see immediate update
- Adds complexity to hook logic
- Doesn't solve "force refresh" use case

### Alternative 2: Real-Time Status Line (Rejected)
**Idea**: StatusLineManager scans metadata.json on every render

**Rejected Because**:
- Too slow (50-100ms per render)
- Claude Code polls status line frequently
- Would cause noticeable lag

### Alternative 3: Event-Based Updates (Future Enhancement)
**Idea**: File watcher on metadata.json, auto-update cache on change

**Deferred Because**:
- Requires fs.watch() (complex, platform-specific)
- Overkill for current use case
- Can add later if needed

---

## Conclusion

**Recommended Solution**: Option 1 + Option 2

**Implementation Plan**:
1. Create `StatusLineUpdater` class (sync version of update-status-line.sh)
2. Add `/specweave:update-status` command (manual refresh)
3. Auto-call from `/specweave:done`, `/specweave:progress` (convenience)
4. Add comprehensive tests (unit + integration + E2E)
5. Update documentation

**Benefits**:
- ✅ User has MANUAL control (force refresh anytime)
- ✅ Auto-refresh on key commands (no extra steps)
- ✅ Consistent with existing architecture
- ✅ Minimal performance impact (50-100ms)
- ✅ Backward compatible (hook still works)

**Next Steps**:
1. Implement `StatusLineUpdater` class
2. Create CLI wrapper
3. Add slash command
4. Write tests
5. Integrate with existing commands

---

**Analysis Complete** ✓
