# Pre-Flight Sync Check Design

**Purpose**: Ensure living docs and external tools are always in sync BEFORE increment operations
**Trigger**: Before any increment-related command executes
**Pattern**: "Check-then-sync-then-proceed"

---

## The Problem

**Current behavior**:
```
User: /specweave:done 0015
→ Command closes increment immediately
→ Living docs may be stale ❌
→ External tools (GitHub) may be stale ❌
→ Increment closed with outdated state ❌
```

**User's insight**: We need to check and sync BEFORE operations, not just after!

---

## The Solution: Pre-Flight Checks

**New behavior**:
```
User: /specweave:done 0015
→ UserPromptSubmit hook fires (BEFORE command)
→ Detect: This is an increment operation
→ Check: Is increment spec synced to living docs?
   → If NO: Sync increment → living docs
→ Check: Are living docs synced to external tools?
   → If NO: Trigger spec sync (when implemented)
→ Return: "continue": true
→ Command proceeds with fresh data ✅
```

---

## Which Commands Need Pre-Flight Checks?

### Tier 1: CRITICAL (Always check)
1. `/specweave:done` - Closing increment
2. `/specweave:validate` - Validating increment
3. `/specweave:progress` - Showing progress

**Why**: These read final state, must be fresh

### Tier 2: IMPORTANT (Check if stale)
4. `/specweave:increment` - Creating new (check previous)
5. `/specweave:do` - Implementing (check freshness)

**Why**: These start work, should start from known good state

### Tier 3: OPTIONAL (No check needed)
6. `/specweave:status` - Just listing (read-only)
7. `/specweave:pause` - Just pausing (no state change)

**Why**: These don't depend on external state

---

## Architecture

### Hook: UserPromptSubmit Enhancement

**Existing**: `plugins/specweave/hooks/user-prompt-submit.sh`
**Current**: Basic validation
**Add**: Pre-flight sync checks

**Flow**:
```bash
1. Parse user prompt
   → Extract command: /specweave:done
   → Extract args: 0015

2. Detect operation type
   → If Tier 1 command: Always check
   → If Tier 2 command: Check if stale (timestamp)
   → If Tier 3 command: Skip

3. Pre-flight sync check
   → A. Check increment→living docs freshness
   → B. Check living docs→external tools freshness
   → C. Sync if needed

4. Return
   → "continue": true (proceed with user's command)
```

---

## Freshness Detection

### Check A: Increment → Living Docs

**Question**: Is the increment spec newer than living docs spec?

**Implementation**:
```bash
INCREMENT_SPEC=".specweave/increments/0015-auth/spec.md"
LIVING_DOCS_SPEC=".specweave/docs/internal/specs/spec-0015-auth.md"

# Get modification times
INCREMENT_MTIME=$(stat -f %m "$INCREMENT_SPEC" 2>/dev/null || echo 0)
LIVING_DOCS_MTIME=$(stat -f %m "$LIVING_DOCS_SPEC" 2>/dev/null || echo 0)

# Compare
if [ "$INCREMENT_MTIME" -gt "$LIVING_DOCS_MTIME" ]; then
  echo "⚠️  Increment spec is newer than living docs"
  echo "🔄 Syncing increment → living docs..."
  node plugins/specweave/lib/hooks/sync-living-docs.js 0015-auth
fi
```

### Check B: Living Docs → External Tools

**Question**: Have living docs been synced to external tools recently?

**Implementation**:
```bash
# Check last sync timestamp in spec frontmatter
LAST_SYNC=$(grep -A 1 "^external_sync:" "$LIVING_DOCS_SPEC" | grep "last_synced:" | cut -d: -f2-)

# If never synced OR synced >1 hour ago
CURRENT_TIME=$(date +%s)
LAST_SYNC_TIME=$(date -j -f "%Y-%m-%d %H:%M:%S" "$LAST_SYNC" +%s 2>/dev/null || echo 0)
TIME_DIFF=$((CURRENT_TIME - LAST_SYNC_TIME))

if [ "$TIME_DIFF" -gt 3600 ]; then
  echo "⚠️  Living docs haven't been synced in ${TIME_DIFF}s"
  echo "🔄 Triggering external sync..."
  # TODO: Implement spec-level sync (Phase 2-6)
  # node dist/cli/commands/sync-spec-content.js --spec "$LIVING_DOCS_SPEC" --provider github
fi
```

---

## Implementation Plan

### Phase 1: Add Increment→Living Docs Check (30 min)

**Modify**: `plugins/specweave/hooks/user-prompt-submit.sh`

**Add**:
```bash
# After existing validation logic
detect_increment_operation() {
  local prompt="$1"

  # Tier 1 commands (always check)
  if echo "$prompt" | grep -qE "/(specweave:)?(done|validate|progress)"; then
    return 0  # Is increment operation
  fi

  # Tier 2 commands (check if stale)
  if echo "$prompt" | grep -qE "/(specweave:)?(increment|do)"; then
    return 0  # Is increment operation
  fi

  return 1  # Not increment operation
}

check_and_sync_increment_to_living_docs() {
  local increment_id="$1"

  # Find increment spec and living docs spec
  # Compare modification times
  # Sync if increment is newer
}

# Main hook logic
PROMPT=$(cat)  # Read user prompt from stdin

if detect_increment_operation "$PROMPT"; then
  # Extract increment ID from prompt
  # check_and_sync_increment_to_living_docs "$INCREMENT_ID"
fi

# Return continue
echo '{"continue": true}'
```

### Phase 2: Add Living Docs→External Sync Check (30 min)

**Modify**: Same hook

**Add**:
```bash
check_and_sync_to_external_tools() {
  local spec_file="$1"

  # Check last sync timestamp
  # If stale, trigger sync
  # (Requires Phase 2-6 spec sync implementation)
}
```

### Phase 3: Add Spec Frontmatter Sync Tracking (15 min)

**Modify**: Spec sync commands (when implemented)

**Add to spec frontmatter**:
```yaml
---
spec_id: spec-001
title: Core Framework Architecture
status: in-progress
external_sync:
  provider: github
  project_id: 5
  last_synced: 2025-11-11 18:45:30
  sync_status: success
---
```

### Phase 4: Test Pre-Flight Checks (30 min)

**Test scenarios**:
1. Modify increment spec → Run /done → Verify auto-sync
2. Wait 1+ hour → Run /done → Verify external sync trigger
3. Run /status → Verify no sync (Tier 3 command)

---

## Expected Behavior

### Scenario 1: Fresh State

```bash
User: /specweave:done 0015
Hook: ✓ Increment→Living docs: Fresh (0s)
      ✓ Living docs→GitHub: Fresh (5m ago)
      ✅ Pre-flight checks passed
Command: Proceeding with /done...
```

### Scenario 2: Stale Increment Spec

```bash
User: /specweave:done 0015
Hook: ⚠️  Increment→Living docs: Stale (modified 2m ago)
      🔄 Syncing increment → living docs...
      ✅ Synced: spec-0015-auth.md
      ✓ Living docs→GitHub: Fresh (3m ago)
      ✅ Pre-flight checks passed
Command: Proceeding with /done...
```

### Scenario 3: Stale External Sync

```bash
User: /specweave:done 0015
Hook: ✓ Increment→Living docs: Fresh (0s)
      ⚠️  Living docs→GitHub: Stale (synced 2h ago)
      🔄 Triggering external sync...
      ✅ Synced to GitHub Project #5
      ✅ Pre-flight checks passed
Command: Proceeding with /done...
```

### Scenario 4: Both Stale

```bash
User: /specweave:done 0015
Hook: ⚠️  Increment→Living docs: Stale (modified 5m ago)
      🔄 Syncing increment → living docs...
      ✅ Synced: spec-0015-auth.md
      ⚠️  Living docs→GitHub: Stale (synced 3h ago)
      🔄 Triggering external sync...
      ✅ Synced to GitHub Project #5
      ✅ Pre-flight checks passed
Command: Proceeding with /done...
```

---

## Benefits

1. **Always Fresh Data** ✅
   - Commands always see latest state
   - No race conditions
   - No stale closures

2. **Automatic Sync** ✅
   - User doesn't think about it
   - Just works
   - Invisible correctness

3. **Audit Trail** ✅
   - Log shows all sync operations
   - Timestamps recorded
   - Debugging is easy

4. **Performance** ✅
   - Only sync when needed (freshness check)
   - Fast path for fresh state
   - No unnecessary work

5. **User Experience** ✅
   - Transparent
   - No manual `/sync` commands
   - Confidence in data correctness

---

## Implementation Timeline

**Phase 1**: Increment→Living Docs Check (30 min) - Can implement NOW
**Phase 2**: External Sync Check (30 min) - Needs Phase 2-6 spec sync
**Phase 3**: Frontmatter Tracking (15 min) - Part of Phase 2-6
**Phase 4**: Testing (30 min) - After all phases

**Total**: ~2 hours (Phase 1 can be done immediately)

---

## Success Criteria

- ✅ `/done` always sees fresh data
- ✅ `/validate` always validates fresh data
- ✅ `/progress` always shows fresh progress
- ✅ Increment specs auto-sync to living docs before operations
- ✅ Living docs auto-sync to external tools before operations (when implemented)
- ✅ No manual sync commands needed
- ✅ Fast path for fresh state (no unnecessary syncs)

---

## Next Steps

1. Implement Phase 1 (increment→living docs check) NOW
2. Test with current increment (0025)
3. Wait for Phase 2-6 spec sync before implementing Phase 2
4. Full integration test after all phases complete

**Ready to implement Phase 1!**
