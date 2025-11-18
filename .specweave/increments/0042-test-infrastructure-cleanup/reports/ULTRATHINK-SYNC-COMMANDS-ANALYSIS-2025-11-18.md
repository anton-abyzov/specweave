# ULTRATHINK: sync-docs vs sync-specs Command Analysis

**Date**: 2025-11-18
**Issue**: User reports "/specweave:sync-docs update" doesn't sync ACs and tasks
**Analyst**: Claude (Ultrathink Mode)
**Critical Finding**: 🚨 **ARCHITECTURAL GAP IDENTIFIED** 🚨

---

## Executive Summary

**ROOT CAUSE FOUND**: `/specweave:sync-docs update` does NOT call `/specweave:sync-specs` or `LivingDocsSync.syncIncrement()`, despite documentation claiming it syncs "ALL documentation areas."

**Impact**:
- **User Expectation**: Running `/specweave:sync-docs update` should sync everything including user stories, ACs, and tasks
- **Actual Behavior**: Only syncs ADRs, architecture docs, security docs, etc. - **NOT living specs!**
- **Result**: User stories, ACs, and tasks are NOT synchronized when using `/specweave:sync-docs update`

**Severity**: **HIGH** - Documentation misleads users about command capabilities

---

## Command Architecture Analysis

### Two Separate Commands with Different Purposes

#### `/specweave:sync-specs` - Living Specs Sync
**File**: `plugins/specweave/commands/specweave-sync-specs.md`
**Implementation**: `src/cli/commands/sync-specs.ts` → `LivingDocsSync.syncIncrement()`

**What it syncs**:
```
spec.md → Living Specs Structure
├── .specweave/docs/internal/specs/_features/FS-XXX/FEATURE.md
├── .specweave/docs/internal/specs/specweave/FS-XXX/README.md
└── .specweave/docs/internal/specs/specweave/FS-XXX/us-*.md
    ├── ## Acceptance Criteria (with completion status)
    └── ## Tasks (with completion status)
```

**Scope**:
- ✅ User stories
- ✅ Acceptance criteria (with [x] completion status)
- ✅ Tasks (with completion status)
- ✅ Feature files
- ✅ Bidirectional links

**Command execution**:
```typescript
// src/cli/commands/sync-specs.ts
export async function syncSpecs(args: string[]): Promise<void> {
  const sync = new LivingDocsSync(projectRoot);
  const result = await sync.syncIncrement(incrementId, options);
}
```

---

#### `/specweave:sync-docs` - Strategic Docs Sync
**File**: `plugins/specweave/commands/specweave-sync-docs.md`
**Implementation**: **NONE** - Purely prompt-based (markdown command)

**What it syncs** (UPDATE mode):
```yaml
spec.md (features) → .specweave/docs/public/overview/features.md
spec.md (API) → .specweave/docs/public/api/
plan.md (decisions) → .specweave/docs/internal/architecture/adr/
architecture.md → .specweave/docs/internal/architecture/
security.md → .specweave/docs/internal/security/
infrastructure.md → .specweave/docs/internal/operations/
reports/*.md → .specweave/docs/internal/delivery/guides/
test-strategy.md → .specweave/docs/internal/testing/
```

**Scope**:
- ✅ ADRs (Architecture Decision Records)
- ✅ Architecture diagrams
- ✅ Security documentation
- ✅ Infrastructure documentation
- ✅ Test strategy
- ✅ Public feature overview
- ❌ **NO living specs sync!**
- ❌ **NO user stories!**
- ❌ **NO acceptance criteria!**
- ❌ **NO tasks!**

**Command execution**:
```markdown
# IT'S JUST A MARKDOWN PROMPT!
# No TypeScript implementation
# No call to LivingDocsSync
# No call to syncSpecs()
```

---

## The Architectural Gap

### Documentation Claims

From `specweave-sync-specs.md` (line 389-393):
```markdown
❌ **Use `/specweave:sync-docs` instead when**:
- You want to update ALL documentation areas
- You have new architecture decisions (ADRs)
- You updated operations/deployment docs
- You need comprehensive documentation sync
```

**Implication**: `/specweave:sync-docs` should sync "ALL documentation areas" including living specs.

---

### Actual Implementation

**Evidence from code review**:

1. **No TypeScript implementation for sync-docs**:
   ```bash
   $ find src -name "*sync-docs*"
   # Returns: NOTHING
   ```

2. **No call to LivingDocsSync**:
   ```bash
   $ grep -r "LivingDocsSync" plugins/specweave/commands/specweave-sync-docs.md
   # Returns: No matches found
   ```

3. **No call to sync-specs**:
   ```bash
   $ grep -r "sync-specs\|syncSpecs" plugins/specweave/commands/specweave-sync-docs.md
   # Returns: No matches found
   ```

4. **Mapping rules don't include living specs**:
   From `specweave-sync-docs.md` (line 280-312):
   - ❌ No mapping for `.specweave/docs/internal/specs/_features/`
   - ❌ No mapping for `.specweave/docs/internal/specs/specweave/`
   - ❌ No mapping for user story files

**Conclusion**: `/specweave:sync-docs update` does NOT sync living specs at all!

---

## Impact on User Experience

### Scenario: User Completes Tasks

```
1. User completes tasks in increment 0042
2. ACStatusManager updates spec.md: AC-US1-01: [ ] → [x]
3. User runs: /specweave:sync-docs update 0042

Expected: Living docs user stories show [x] for completed ACs
Actual: Living docs user stories STILL show [ ] (not updated!)

Reason: sync-docs doesn't call LivingDocsSync!
```

### User Confusion

**What users think**:
- "/specweave:sync-docs syncs ALL docs, so I don't need /specweave:sync-specs"
- "I ran sync-docs, so my user stories should be updated"

**Reality**:
- sync-docs only syncs ADRs, architecture, security, etc.
- User stories, ACs, and tasks are NOT synced
- User must also run `/specweave:sync-specs` separately

---

## Root Cause Analysis

### Why This Gap Exists

**Hypothesis 1: Design Evolution**
- `/specweave:sync-docs` was designed early for strategic documentation
- `/specweave:sync-specs` was added later for living specs
- Commands were never integrated

**Hypothesis 2: Separation of Concerns**
- sync-docs = Strategic documentation (ADRs, architecture)
- sync-specs = Tactical documentation (user stories, tasks)
- Intended to be separate, but documentation is misleading

**Hypothesis 3: Implementation Incomplete**
- sync-docs SHOULD call sync-specs
- Implementation was planned but never completed
- Markdown prompt doesn't reflect actual behavior

---

## Recommended Solutions

### Option 1: Make sync-docs Call sync-specs (RECOMMENDED)

**Change**: Have `/specweave:sync-docs update` call `/specweave:sync-specs` as part of its flow

**Implementation**:
1. Create TypeScript implementation for sync-docs command
2. In UPDATE mode, after syncing strategic docs:
   ```typescript
   // Sync strategic docs (ADRs, architecture, etc.)
   await syncStrategicDocs(incrementId);

   // ALSO sync living specs (user stories, ACs, tasks)
   await syncSpecs([incrementId]);  // Call sync-specs!
   ```

**Benefits**:
- ✅ Matches user expectation ("ALL documentation areas")
- ✅ One command syncs everything
- ✅ Reduces user confusion
- ✅ Backward compatible

**Risks**:
- Sync-docs becomes slower (doing more work)
- Users who only want strategic docs have to wait

---

### Option 2: Update Documentation (QUICK FIX)

**Change**: Update documentation to be accurate about what each command does

**Implementation**:
1. Update `specweave-sync-specs.md`:
   ```markdown
   ❌ **Use `/specweave:sync-docs` instead when**:
   - You have new architecture decisions (ADRs)
   - You updated operations/deployment docs
   - You need strategic documentation sync

   ⚠️ **Note**: sync-docs does NOT sync user stories, ACs, or tasks!
   For that, use /specweave:sync-specs or run both commands.
   ```

2. Update `specweave-sync-docs.md`:
   ```markdown
   ## NEXT STEPS

   4. Sync living specs (user stories, ACs, tasks):
      /specweave:sync-specs {increment_id}
   ```

**Benefits**:
- ✅ Quick fix (just docs)
- ✅ Accurate documentation
- ✅ No code changes needed

**Risks**:
- Users still need to run two commands
- Doesn't match user expectation ("ALL docs")

---

### Option 3: Create Unified Command (NEW)

**Change**: Create new command `/specweave:sync-all` that calls both

**Implementation**:
```typescript
// src/cli/commands/sync-all.ts
export async function syncAll(incrementId: string): Promise<void> {
  console.log('🔄 Syncing all documentation...\n');

  // 1. Sync living specs (user stories, ACs, tasks)
  console.log('📋 Syncing living specs...');
  await syncSpecs([incrementId]);

  // 2. Sync strategic docs (ADRs, architecture, etc.)
  console.log('📐 Syncing strategic documentation...');
  await syncStrategicDocs(incrementId);

  console.log('\n✅ All documentation synced!');
}
```

**Benefits**:
- ✅ Clear intent ("sync ALL")
- ✅ One command does everything
- ✅ Existing commands stay focused

**Risks**:
- Need to implement TypeScript version of sync-docs first
- More commands for users to learn

---

## Testing Requirements

### Test 1: Verify sync-docs Does NOT Sync Living Specs

```typescript
it('should NOT sync living specs when running sync-docs', async () => {
  // Create increment with ACs
  const incrementId = '0103-sync-docs-test';
  await createIncrementWithACs(incrementId);

  // Run sync-docs update
  // (Note: This is a markdown prompt, so we'd need to implement it first)
  // await syncDocs('update', incrementId);

  // Verify living specs were NOT created
  const userStoryFile = path.join(
    testRoot,
    '.specweave/docs/internal/specs/specweave/FS-103/us-001-test.md'
  );

  expect(await fs.pathExists(userStoryFile)).toBe(false);
  // Living specs NOT synced!
});
```

### Test 2: Verify sync-specs Does NOT Sync ADRs

```typescript
it('should NOT sync ADRs when running sync-specs', async () => {
  // Create increment with plan.md containing architecture decision
  const incrementId = '0104-sync-specs-test';
  await createIncrementWithArchitectureDecision(incrementId);

  // Run sync-specs
  await syncSpecs([incrementId]);

  // Verify ADR was NOT created
  const adrFiles = await fs.readdir(path.join(
    testRoot,
    '.specweave/docs/internal/architecture/adr/'
  ));

  expect(adrFiles.length).toBe(0);
  // ADRs NOT synced!
});
```

### Test 3: Verify Running Both Commands Works

```typescript
it('should sync everything when running both commands', async () => {
  const incrementId = '0105-both-commands-test';

  // Create increment with ACs AND architecture decisions
  await createIncrementWithEverything(incrementId);

  // Run both commands
  await syncSpecs([incrementId]);
  await syncDocs('update', incrementId);  // Need TS implementation first!

  // Verify living specs were created
  expect(await fs.pathExists(userStoryFile)).toBe(true);

  // Verify ADRs were created
  const adrFiles = await fs.readdir(adrDir);
  expect(adrFiles.length).toBeGreaterThan(0);

  // ✅ Everything synced!
});
```

---

## Proposed Implementation Plan

### Phase 1: Documentation Fix (Immediate)
1. Update `specweave-sync-specs.md` - clarify what each command does
2. Update `specweave-sync-docs.md` - add note to run sync-specs separately
3. Add FAQ: "Which sync command should I use?"

### Phase 2: TypeScript Implementation (Week 1)
1. Create `src/cli/commands/sync-docs.ts`
2. Implement UPDATE mode logic (sync strategic docs)
3. Add call to `syncSpecs()` at the end
4. Add tests

### Phase 3: Integration (Week 2)
1. Update markdown command to call TypeScript implementation
2. Verify all sync flows work
3. Update documentation
4. Release

---

## Answers to User's Question

### "Confirm that update-docs is calling /specweave:sync-specs under the hood"

**Answer**: ❌ **NO, IT IS NOT!**

**Evidence**:
1. `/specweave:sync-docs` is a markdown prompt (no TypeScript implementation)
2. Markdown prompt does NOT mention sync-specs or LivingDocsSync
3. No grep matches for "sync-specs" in sync-docs.md
4. Mapping rules don't include `.specweave/docs/internal/specs/`

**Consequence**:
- User runs `/specweave:sync-docs update`
- User stories, ACs, and tasks are NOT synchronized
- User expects them to be synced (misleading documentation)
- **This is why the user reported the issue!**

---

## Recommended Immediate Action

### For Users (Workaround)
Run BOTH commands:
```bash
# Sync living specs (user stories, ACs, tasks)
/specweave:sync-specs 0042

# Sync strategic docs (ADRs, architecture, etc.)
/specweave:sync-docs update 0042
```

### For Developers (Fix)
1. **Immediate**: Update documentation to clarify (Option 2)
2. **Short-term**: Implement TypeScript sync-docs that calls sync-specs (Option 1)
3. **Long-term**: Consider unified `/specweave:sync-all` command (Option 3)

---

## Impact Assessment

**Current State**:
- **Documentation**: Misleading ❌
- **User Experience**: Confusing ❌
- **Functionality**: Incomplete ❌

**After Fix (Option 1)**:
- **Documentation**: Accurate ✅
- **User Experience**: Intuitive ✅
- **Functionality**: Complete ✅

**After Fix (Option 2)**:
- **Documentation**: Accurate ✅
- **User Experience**: Still requires two commands ⚠️
- **Functionality**: Works but manual ⚠️

---

## Conclusion

**Finding**: `/specweave:sync-docs update` does NOT call `/specweave:sync-specs` under the hood.

**User Impact**: User stories, ACs, and tasks are NOT synchronized when using sync-docs alone.

**Root Cause**: Commands evolved separately, integration was never completed, documentation is misleading.

**Recommended Fix**: Implement TypeScript version of sync-docs that calls sync-specs (Option 1).

**Immediate Workaround**: Users must run both `/specweave:sync-specs` AND `/specweave:sync-docs update` separately.

---

**Status**: Analysis complete. Architectural gap confirmed.
**Next**: Implement Option 1 or Option 2 based on priority.
