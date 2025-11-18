# ADR-0043: spec.md as Single Source of Truth for Increment Metadata

**Date**: 2025-11-18
**Status**: Accepted
**Increment**: 0043-spec-md-desync-fix

## Context

SpecWeave has two files storing increment status:
1. `metadata.json` - Internal, machine-readable JSON cache
2. `spec.md` YAML frontmatter - User-visible, human-readable Markdown

### The Problem

When closing an increment via `/specweave:done`, the system updates `metadata.json` but fails to update `spec.md` YAML frontmatter. This causes:

**Symptom 1: Status Line Shows Wrong Increment**
```bash
# metadata.json: "status": "completed"
# spec.md: status: active (STALE!)

# Status line hook reads spec.md:
status=$(grep -m1 "^status:" "$spec_file" ...)

# Result: Completed increment 0038 shows as active
Status line: [0038-serverless...] (WRONG!)
```

**Symptom 2: Hooks Read Stale Data**
- `update-status-line.sh` reads spec.md → finds stale "active" status
- `post-increment-completion.sh` reads spec.md → doesn't close GitHub issue
- Living docs sync reads spec.md → generates wrong documentation

**Root Cause**:
```typescript
// src/core/increment/metadata-manager.ts:268-324
static updateStatus(incrementId, newStatus) {
  metadata.status = newStatus;
  this.write(incrementId, metadata); // ✅ Updates metadata.json

  activeManager.smartUpdate(); // ✅ Updates cache

  // ❌ MISSING: Update spec.md YAML frontmatter!
}
```

### Current Reality

**Architecture docs claim**:
> "spec.md YAML frontmatter is the single source of truth for increment metadata.
> metadata.json is a derived cache for performance."

**Code reality**:
- Commands update metadata.json only
- Hooks read spec.md only
- **Result**: Desyncs are inevitable

**Actual Desyncs Found** (2025-11-18):
- Increment 0038: metadata.json="completed", spec.md="active"
- Increment 0041: metadata.json="completed", spec.md="active"

### The Question

**Which file is the true source of truth?**

This isn't just philosophical - it determines:
- Which file do hooks read from?
- Which file do commands update?
- Which file wins during conflicts?
- Which file do we repair when desynced?

## Decision

**spec.md YAML frontmatter is the SINGLE source of truth for increment metadata.**

**metadata.json is a derived cache for performance optimization.**

### Implications

1. **All commands MUST update spec.md** (not just metadata.json)
2. **All hooks MUST read spec.md** (not metadata.json)
3. **Conflicts favor spec.md** (user-visible file wins)
4. **Repair scripts use metadata.json → spec.md** (repair the source of truth)

## Rationale

### 1. User Visibility (User Experience)

**spec.md is user-facing**:
```bash
# Users edit spec.md in their editor
vim .specweave/increments/0001-feature/spec.md

# Users inspect spec.md directly
cat .specweave/increments/0001-feature/spec.md
```

**metadata.json is internal**:
```bash
# Users NEVER directly interact with metadata.json
# It's a hidden implementation detail
```

**Principle**: The file users see and edit should be authoritative.

### 2. Hook Architecture (Existing Implementation)

**All hooks already read spec.md**:

**Status Line Hook** (`update-status-line.sh:50`):
```bash
status=$(grep -m1 "^status:" "$spec_file" 2>/dev/null | cut -d: -f2 | tr -d ' ')
```

**Living Docs Sync** (`post-increment-completion.sh`):
```bash
frontmatter=$(cat "$spec_file" | sed -n '/^---$/,/^---$/p')
status=$(echo "$frontmatter" | grep "^status:" | cut -d: -f2)
```

**GitHub Sync** (`post-increment-completion.sh`):
```typescript
const { data } = matter(fs.readFileSync(specPath, 'utf-8'));
if (data.status === 'completed') {
  await closeGitHubIssue(data.epic);
}
```

**Changing hooks to read metadata.json would require**:
- Rewrite 8+ shell/TypeScript hooks
- Change hook architecture fundamentally
- Break backward compatibility with existing increments

**Principle**: Don't fight existing architecture, embrace it.

### 3. Human-Readable Format (Debugging)

**spec.md is easily inspectable**:
```bash
$ cat .specweave/increments/0038-serverless/spec.md
---
increment: 0038-serverless-template-verification
status: completed  # ← IMMEDIATELY VISIBLE
priority: P1
---
```

**metadata.json requires parsing**:
```bash
$ cat .specweave/increments/0038-serverless/metadata.json
{"id":"0038-serverless-template-verification","status":"completed",...}
# Must parse JSON to find status
```

**Principle**: Source of truth should be easy to inspect/debug.

### 4. Version Control Friendliness (GitOps)

**spec.md diffs are meaningful**:
```diff
--- a/.specweave/increments/0038/spec.md
+++ b/.specweave/increments/0038/spec.md
@@ -2,7 +2,7 @@
 increment: 0038-serverless-template-verification
 title: "Serverless Template Verification"
 priority: P1
-status: active
+status: completed  # ← CLEAR SEMANTIC CHANGE
```

**metadata.json diffs are noisy**:
```diff
--- a/.specweave/increments/0038/metadata.json
+++ b/.specweave/increments/0038/metadata.json
@@ -1 +1 @@
-{"id":"0038-serverless-template-verification","status":"active","created":"2025-11-15T10:00:00Z","lastActivity":"2025-11-15T10:00:00Z",...}
+{"id":"0038-serverless-template-verification","status":"completed","created":"2025-11-15T10:00:00Z","lastActivity":"2025-11-18T14:30:00Z",...}
# Hard to see what changed (JSON on single line, timestamp noise)
```

**Principle**: Source of truth should have clean, reviewable diffs.

### 5. Consistency Principle (Data Integrity)

**Two sources of truth = guaranteed eventual inconsistency**:
- Different update paths
- Different failure modes
- No single owner
- Desyncs are inevitable

**Single source + derived cache = clear ownership**:
- spec.md is authoritative
- metadata.json is derived (can be regenerated)
- Conflicts have clear resolution (spec.md wins)
- No desync ambiguity

**Principle**: One source of truth prevents desyncs by design.

## Alternatives Considered

### Alternative 1: metadata.json as Source of Truth

**Pros**:
- Already updated by all commands (existing behavior)
- Faster to parse (JSON vs YAML)
- Internal file (less user confusion)

**Cons**:
- ❌ Breaks all hooks (would need to rewrite 8+ hooks)
- ❌ Not user-visible (users can't inspect easily)
- ❌ Poor UX (hidden implementation detail wins over visible file)
- ❌ Violates GitOps principle (users edit spec.md, not metadata.json)

**Why NOT chosen**: Too much existing code depends on spec.md.

### Alternative 2: Dual Source of Truth (Both Authoritative)

**Pros**:
- No refactoring needed
- Each system uses its preferred file

**Cons**:
- ❌ Guaranteed desyncs (already happening!)
- ❌ No conflict resolution strategy
- ❌ Ambiguous ownership
- ❌ This is the current broken state we're fixing!

**Why NOT chosen**: This is exactly the problem we're solving.

### Alternative 3: Database (SQLite)

**Pros**:
- True single source (no file sync issues)
- ACID transactions (atomicity)
- Query performance (indexed)

**Cons**:
- ❌ Massive architectural change (rewrite entire framework)
- ❌ Breaks GitOps workflow (files = data principle)
- ❌ Not human-readable (requires tools to inspect)
- ❌ Over-engineering (files work fine if kept in sync)

**Why NOT chosen**: Too invasive, breaks core SpecWeave principle (files are data).

### Alternative 4: spec.md Only (Delete metadata.json)

**Pros**:
- True single source (no sync needed)
- Simplest architecture (one file to rule them all)

**Cons**:
- ❌ Performance impact (YAML parsing overhead on every query)
- ❌ Complex queries slow (no indexing)
- ❌ Lose optimization layer (metadata.json is fast cache)

**Why NOT chosen**: metadata.json provides valuable performance benefits.

## Consequences

### Positive

1. **Clear Ownership**: spec.md is authoritative
   - No ambiguity about which file is correct
   - Conflicts have obvious resolution (spec.md wins)

2. **Hooks Work Correctly**: No changes needed
   - All hooks already read spec.md
   - Fix ensures spec.md is always up-to-date
   - Hook architecture remains unchanged

3. **User-Friendly**: Visible file is source of truth
   - Users edit spec.md → changes are authoritative
   - Users inspect spec.md → see correct state
   - No hidden metadata.json surprises

4. **Git-Friendly**: Meaningful diffs
   - spec.md changes are semantic (status: active → completed)
   - Easy to review in pull requests
   - Clean history in version control

5. **No Desync Resolution Logic**: spec.md always wins
   - Simple repair: metadata.json → spec.md
   - No complex conflict resolution
   - Clear data flow

### Negative

1. **Commands Must Update TWO Files**: spec.md + metadata.json
   - Adds complexity to status update logic
   - Requires atomic dual-write (both succeed or both fail)
   - Rollback mechanism needed on failure

2. **YAML Parsing Overhead**: 5-10ms per update
   - Slower than JSON-only update
   - Acceptable overhead for data integrity
   - Mitigated by async I/O

3. **Rollback Complexity**: Must undo both updates atomically
   - Requires transaction-like behavior
   - Backup original metadata for rollback
   - Error handling must be robust

### Neutral

1. **metadata.json Still Valuable**: Performance cache
   - Fast queries (no YAML parsing)
   - Complex aggregations (scan all increments)
   - Can be regenerated from spec.md if corrupted

2. **Existing Code Works**: Minimal changes
   - Hook architecture unchanged
   - Active increment cache unchanged
   - Only MetadataManager.updateStatus() modified

## Implementation Strategy

### 1. Atomic Dual-Write (Both Succeed or Both Fail)

```typescript
static updateStatus(incrementId, newStatus, reason?) {
  const metadata = this.read(incrementId);
  const originalMetadata = { ...metadata }; // Backup for rollback

  // Update metadata
  metadata.status = newStatus;

  // STEP 1: Update metadata.json
  this.write(incrementId, metadata);

  // STEP 2: Update spec.md (with rollback)
  try {
    await SpecFrontmatterUpdater.updateStatus(incrementId, newStatus);
  } catch (error) {
    // ROLLBACK: Restore metadata.json
    this.write(incrementId, originalMetadata);
    throw new MetadataError(
      `Failed to update spec.md, rolled back metadata.json: ${error.message}`,
      incrementId,
      error
    );
  }

  // STEP 3: Update cache
  activeManager.smartUpdate();

  return metadata;
}
```

### 2. Repair Existing Desyncs (Pre-Deployment)

**Validation Script** (detect desyncs):
```typescript
const desyncs = allIncrements.filter(metadata => {
  const specStatus = readSpecStatus(metadata.id);
  return specStatus !== metadata.status;
});
```

**Repair Script** (fix desyncs):
```typescript
for (const desync of desyncs) {
  // Use metadata.json as source of truth for repair
  // (it has been updated correctly, spec.md is stale)
  await SpecFrontmatterUpdater.updateStatus(
    desync.id,
    desync.metadataStatus
  );
}
```

**Rationale**: metadata.json has historical accuracy (was updated by commands), spec.md is the bug victim (wasn't updated).

### 3. Monitoring (Post-Deployment)

**Daily Validation** (CI job):
```yaml
# .github/workflows/validate-sync.yml
name: Validate Status Sync
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - run: npx specweave validate-status-sync
```

**Alert on Desyncs**: GitHub issue auto-created if validation fails.

## Related Decisions

- **ADR-0044**: YAML Parser Selection (gray-matter) - How to update spec.md frontmatter
- **ADR-0045**: Atomic Update & Rollback Strategy - Transaction semantics for dual-write

## References

**Root Cause Analysis**:
- `.specweave/increments/0043-spec-md-desync-fix/spec.md` (bug specification)
- Incident: Increment 0038, 0041 desyncs (2025-11-18)

**Implementation**:
- `src/core/increment/metadata-manager.ts` (existing status management)
- `src/core/increment/spec-frontmatter-updater.ts` (new frontmatter updater)

**Hook Architecture**:
- `plugins/specweave/hooks/lib/update-status-line.sh` (reads spec.md)
- `plugins/specweave/hooks/lib/post-increment-completion.sh` (reads spec.md)

---

**Last Updated**: 2025-11-18
**Author**: Architect Agent
**Review Status**: Pending Tech Lead approval
