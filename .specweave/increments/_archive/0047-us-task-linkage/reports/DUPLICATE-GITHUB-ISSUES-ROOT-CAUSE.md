# CRITICAL: Duplicate GitHub Issues Root Cause Analysis

**Date**: 2025-11-20
**Severity**: CRITICAL
**Status**: ACTIVE INVESTIGATION
**Incident**: Multiple duplicate GitHub issues created for same User Story

---

## 🚨 Evidence

Screenshot shows duplicate issues for SAME User Story IDs:
- `[SP-US-009]` - Issues #682, #683 (2 duplicates)
- `[SP-US-008]` - Issues #681, #680 (2 duplicates)
- `[SP-US-007]` - Issues #679, #678 (2 duplicates)
- `[SP-US-006]` - Issues #676, #??? (2+ duplicates)
- `[SP-FS-023-specweave]` - Issues #685, #684 (2 duplicates)

**Pattern**: Each User Story has EXACTLY 2 duplicate issues created.

---

## 🔍 ROOT CAUSES IDENTIFIED

### Root Cause #1: Search Returns Only 1 Result (CRITICAL BUG!)

**Location**: `plugins/specweave-github/lib/github-client-v2.ts:324-362`

```typescript
async searchIssueByTitle(title: string): Promise<GitHubIssue | null> {
  const result = await execFileNoThrow('gh', [
    'issue',
    'list',
    '--search',
    `"${escapedTitle}" in:title`,
    '--limit',
    '1',  // ❌ BUG: Only returns 1 issue!
  ]);

  // Returns first match
  return issues[0];
}
```

**Problem**:
- Uses `--limit 1` which ONLY returns the FIRST matching issue
- If a duplicate was just created, the search won't see it (eventual consistency)
- Second sync run sees "no existing issue" and creates ANOTHER duplicate

**Impact**: HIGH - Breaks entire duplicate prevention mechanism!

---

### Root Cause #2: Race Condition Between Searches

**Location**: `plugins/specweave-github/lib/github-feature-sync.ts:148-183`

```typescript
// Check 2: Search GitHub for issue by title
const existingByTitle = await this.client.searchIssueByTitle(issueContent.title);
if (existingByTitle) {
  // Found existing, update it
  await this.updateUserStoryIssue(...);
  continue;
}

// Check 3: No existing issue found, create new
console.log(`🚀 Creating new issue: ${issueContent.title}`);
const issueNumber = await this.createUserStoryIssue(...);
```

**Problem**:
1. Sync #1 runs: `searchIssueByTitle` → No results (correct, first time)
2. Sync #1 creates Issue #676
3. **GitHub search index hasn't updated yet** (eventual consistency, ~2-5 seconds)
4. Sync #2 runs immediately: `searchIssueByTitle` → No results (WRONG! #676 exists but not indexed yet)
5. Sync #2 creates Issue #677 (DUPLICATE!)

**Impact**: HIGH - Creates duplicates when sync runs multiple times quickly

---

### Root Cause #3: Frontmatter Update Not Atomic

**Location**: `plugins/specweave-github/lib/github-feature-sync.ts:538-567`

```typescript
private async updateUserStoryFrontmatter(
  userStoryPath: string,
  issueNumber: number
): Promise<void> {
  const content = await readFile(userStoryPath, 'utf-8');
  // ... parse frontmatter ...
  frontmatter.external.github.issue = issueNumber;

  const newContent = `---\n${newFrontmatter}---${bodyContent}`;
  await writeFile(userStoryPath, newContent, 'utf-8');
}
```

**Problem**:
- Not atomic: read → modify → write
- If two syncs run concurrently:
  - Sync #1 reads file (no issue number)
  - Sync #2 reads file (no issue number) ← RACE!
  - Sync #1 writes issue #676
  - Sync #2 writes issue #677 (overwrites #676!)
- No file locking mechanism

**Impact**: MEDIUM - Concurrent executions can race

---

### Root Cause #4: Hook Fires Multiple Times

**Location**: `plugins/specweave/hooks/post-increment-planning.sh:688-780`

**Trigger Points**:
1. Manual: User runs `/specweave-github:sync FS-047` multiple times
2. Hook: `post-increment-planning.sh` creates increment-level issue (DEPRECATED but may still run)
3. Auto-sync: Living docs sync may trigger GitHub sync multiple times

**Problem**:
- No guard against multiple concurrent executions
- No "sync in progress" lock file
- Hook can fire while previous sync still running

**Impact**: MEDIUM - User behavior or hook timing can trigger duplicates

---

### Root Cause #5: Incorrect Title Format (SPEC VIOLATION!)

**Evidence**: Screenshot shows titles like:
- `[SP-US-009]` ❌ WRONG!
- `[SP-FS-023-specweave]` ❌ WRONG!

**Correct Format** (per CLAUDE.md Section 10):
- `[FS-047][US-001] User Story Title` ✅ CORRECT

**Problem**:
- Old/incorrect code creating issues with wrong title format
- Search won't match if format changes between syncs
- Duplicate detector won't recognize same User Story

**Impact**: HIGH - Wrong format = broken duplicate detection

---

## 🎯 CRITICAL VULNERABILITIES

### Vulnerability #1: No Uniqueness Constraint

**Missing**: Unique identifier in User Story frontmatter

**Current**:
```yaml
---
id: US-001
feature: FS-047
external:
  github:
    issue: 676  # ← Can be overwritten!
---
```

**Should Be**:
```yaml
---
id: US-001
feature: FS-047
uuid: "a1b2c3d4-e5f6-..."  # ← Unique, never changes
external:
  github:
    issue: 676
    uuid: "a1b2c3d4-e5f6-..."  # ← Match on UUID, not title!
---
```

---

### Vulnerability #2: No Post-Create Verification

**Missing**: Count verification after issue creation

**Current Flow**:
```
1. Search for existing → None found
2. Create issue #676
3. ✅ DONE (assumes success)
```

**Should Be**:
```
1. Search for existing → None found
2. Create issue #676
3. **VERIFY**: Search again → Count results
4. If count > 1 → Close duplicates, keep oldest
5. ✅ DONE (verified unique)
```

The `DuplicateDetector` class DOES THIS (lines 175-265), but it's **NOT BEING USED**!

---

### Vulnerability #3: Search Doesn't Use DuplicateDetector

**Location**: `plugins/specweave-github/lib/github-feature-sync.ts:171`

```typescript
// ❌ CURRENT: Manual search (buggy!)
const existingByTitle = await this.client.searchIssueByTitle(issueContent.title);

// ✅ SHOULD BE: Use DuplicateDetector
const titlePattern = `[${featureId}][${userStory.id}]`;
const existing = await DuplicateDetector.checkBeforeCreate(titlePattern);
```

**Why This Matters**:
- `DuplicateDetector` has 3-phase protection (Detection → Verification → Reflection)
- Handles race conditions
- Auto-closes duplicates
- Proven, tested code

**Current code IGNORES the DuplicateDetector completely!**

---

## 📊 Impact Assessment

| Issue | Severity | Frequency | User Impact |
|-------|----------|-----------|-------------|
| Duplicate issues created | CRITICAL | Every sync if run 2x quickly | Confusion, broken tracking |
| Wrong title format | HIGH | All issues in screenshot | Breaks tooling, hard to find |
| Frontmatter desync | MEDIUM | Concurrent executions | Lost issue links |
| GitHub search lag | LOW | First 5 seconds after create | Temporary, self-corrects |

---

## 🛡️ PREVENTION STRATEGY

### Immediate Fix (Today)

1. **Use DuplicateDetector** in `github-feature-sync.ts`
2. **Fix title format** - Enforce `[FS-XXX][US-YYY]` pattern
3. **Add UUID field** to User Story frontmatter
4. **Increase search limit** from 1 to 50 in `searchIssueByTitle`

### Short-term Fix (This Week)

1. **Add sync lock** - Prevent concurrent executions
2. **Post-create verification** - Count and auto-close duplicates
3. **Idempotency token** - UUID-based deduplication

### Long-term Fix (Next Sprint)

1. **Distributed lock** - Redis/file-based locking
2. **Event-driven sync** - Queue-based, guaranteed ordering
3. **Webhook validation** - Detect duplicates on GitHub side

---

## 🔧 PROPOSED FIX

### Fix #1: Use DuplicateDetector Everywhere

**File**: `plugins/specweave-github/lib/github-feature-sync.ts`

```typescript
// BEFORE (lines 148-183):
if (userStory.existingIssue) {
  // Check 1...
}
const existingByTitle = await this.client.searchIssueByTitle(...);
if (existingByTitle) {
  // Check 2...
}
// Check 3: Create new

// AFTER:
const titlePattern = `[${featureId}][${userStory.id}]`;
const result = await DuplicateDetector.createWithProtection({
  title: issueContent.title,
  body: issueContent.body,
  titlePattern,
  labels: issueContent.labels,
  incrementId: userStory.id,
  repo: `${this.client.getOwner()}/${this.client.getRepo()}`
});

// Result includes:
// - result.issue.number (use this)
// - result.duplicatesFound (log this)
// - result.duplicatesClosed (log this)
// - result.wasReused (true if existing issue was reused)
```

---

### Fix #2: Add UUID to User Stories

**File**: Generate UUID when User Story is created

```typescript
// In user story creation:
import { randomUUID } from 'crypto';

const frontmatter = {
  id: 'US-001',
  uuid: randomUUID(),  // e.g., "a1b2c3d4-e5f6-..."
  feature: 'FS-047',
  // ...
};
```

**Then search by UUID**:
```typescript
const existing = await this.searchIssueByUUID(userStory.uuid);
```

---

### Fix #3: Enforce Title Format Validation

**File**: `plugins/specweave-github/lib/user-story-issue-builder.ts:94`

```typescript
// BEFORE:
const title = `[${this.featureId}][${frontmatter.id}] ${frontmatter.title}`;

// AFTER (with validation):
const title = this.buildValidatedTitle(this.featureId, frontmatter.id, frontmatter.title);

private buildValidatedTitle(featureId: string, usId: string, usTitle: string): string {
  // Validate format: [FS-XXX][US-YYY] Title
  if (!featureId.match(/^FS-\d{3}$/)) {
    throw new Error(`Invalid feature ID: ${featureId} (expected FS-XXX)`);
  }
  if (!usId.match(/^US-\d{3}$/)) {
    throw new Error(`Invalid User Story ID: ${usId} (expected US-XXX)`);
  }

  return `[${featureId}][${usId}] ${usTitle}`;
}
```

---

## 🧹 CLEANUP SCRIPT

Create script to close existing duplicates:

```bash
# File: scripts/cleanup-duplicate-github-issues.sh

#!/bin/bash

# Find all duplicate User Story issues and close them
# Keeps the OLDEST issue for each User Story ID

PATTERNS=(
  "[SP-US-006]"
  "[SP-US-007]"
  "[SP-US-008]"
  "[SP-US-009]"
  "[SP-FS-023-specweave]"
)

for pattern in "${PATTERNS[@]}"; do
  echo "🔍 Searching for duplicates: $pattern"

  # List all issues matching pattern
  issues=$(gh issue list --search "$pattern in:title" --state all --json number,createdAt --limit 50)

  count=$(echo "$issues" | jq 'length')

  if [ "$count" -gt 1 ]; then
    echo "  ⚠️  Found $count duplicates for $pattern"

    # Sort by creation date, keep oldest (first)
    oldest=$(echo "$issues" | jq -r 'sort_by(.createdAt) | .[0].number')
    duplicates=$(echo "$issues" | jq -r "sort_by(.createdAt) | .[1:] | .[].number")

    echo "  ✅ Keeping issue #$oldest (oldest)"

    # Close duplicates
    for dup in $duplicates; do
      echo "  🗑️  Closing duplicate #$dup..."
      gh issue close "$dup" --comment "Duplicate of #$oldest

This issue was automatically closed by SpecWeave's duplicate cleanup script.

The original issue (#$oldest) should be used for tracking instead.

🤖 Auto-closed by SpecWeave"
    done
  else
    echo "  ✅ No duplicates found"
  fi
done

echo ""
echo "✅ Cleanup complete!"
```

---

## 🎓 LESSONS LEARNED

1. **ALWAYS use established duplicate prevention** (DuplicateDetector exists but wasn't used!)
2. **Search limits hide problems** (--limit 1 masked the duplicate issue)
3. **Eventual consistency is REAL** (GitHub search has 2-5 second lag)
4. **Race conditions are subtle** (concurrent file writes, async operations)
5. **Title format matters** (wrong format = broken search)

---

## 📋 ACTION ITEMS

- [ ] **URGENT**: Implement Fix #1 (Use DuplicateDetector)
- [ ] **URGENT**: Run cleanup script to close existing duplicates
- [ ] **HIGH**: Add UUID field to User Story frontmatter
- [ ] **HIGH**: Enforce title format validation
- [ ] **MEDIUM**: Add sync lock mechanism
- [ ] **MEDIUM**: Increase search limit from 1 to 50
- [ ] **LOW**: Add post-create verification logging

---

## 🔗 Related

- Duplicate Detector: `plugins/specweave-github/lib/duplicate-detector.ts`
- GitHub Feature Sync: `plugins/specweave-github/lib/github-feature-sync.ts`
- Title Format Policy: `CLAUDE.md` Section 10
- Three-Phase Protection: Detection → Verification → Reflection

---

**Next Steps**: Implement Fix #1 and run cleanup script TODAY.
