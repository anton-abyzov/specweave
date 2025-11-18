# ULTRATHINK: Status Line Not Updating Automatically

**Date**: 2025-11-18
**Critical Issue**: Status line shows "No active increment" but 0043 is active
**Root Cause Analysis**: Deep dive into why automatic update isn't happening

---

## Evidence

### User Report
Screenshot shows:
- Status line: "No active increment"
- Context: "left until auto-compact: 12%"
- **Expected**: Should show "0043-spec-md-desync-fix [active]"

### Metadata Evidence
```json
// .specweave/increments/0043-spec-md-desync-fix/metadata.json
{
  "id": "0043-spec-md-desync-fix",
  "status": "active",  // ✅ ACTIVE in metadata.json
  "type": "feature",
  "lastActivity": "2025-11-18T20:32:08.458Z"
}
```

### Spec.md Evidence
```yaml
---
increment: 0043-spec-md-desync-fix
status: active  # ✅ ACTIVE in spec.md frontmatter
---
```

**Conclusion**: Both sources say "active" but status line doesn't reflect this!

---

## Hypothesis Tree

### Hypothesis 1: Status Line Hook Not Running
**Likelihood**: HIGH

**Evidence to check**:
- When was update-status-line.sh last executed?
- Is it configured to run automatically?
- Check hook configuration in Claude Code

**Test**:
```bash
# Manually run status line update
bash plugins/specweave/hooks/lib/update-status-line.sh
# Check if status line updates
```

### Hypothesis 2: Status Line Cache Stale
**Likelihood**: MEDIUM

**Evidence to check**:
- Check `.specweave/state/status-line.json` contents
- Check `.claude/data/status-line-cache.json` (if exists)
- When was cache last updated?

**Test**:
```bash
# Check status line cache
cat .specweave/state/status-line.json
# Or
cat .claude/data/status-line-cache.json
```

### Hypothesis 3: Hook Reads Wrong File
**Likelihood**: LOW

**Reasoning**: Validation said all files in sync, so if hook reads spec.md it should find "active"

**Test**:
```bash
# Verify hook logic
grep -A 5 "status=" plugins/specweave/hooks/lib/update-status-line.sh
```

### Hypothesis 4: Multiple Increments Confusion
**Likelihood**: LOW

**Evidence**: Only 1 increment is "active" (0043), others are "completed"

---

## Investigation Plan

### Step 1: Check Status Line Cache
```bash
find .specweave .claude -name "*status-line*" -type f 2>/dev/null
cat .specweave/state/status-line.json 2>/dev/null || echo "File not found"
```

### Step 2: Manually Run Status Line Hook
```bash
bash plugins/specweave/hooks/lib/update-status-line.sh
echo "Exit code: $?"
```

### Step 3: Check Hook Configuration
```bash
# Check if hook is registered with Claude Code
cat ~/.claude/config.json 2>/dev/null | grep -A 10 "hooks"
```

### Step 4: Verify Active Increment Detection
```bash
# What increments are "active" according to files?
find .specweave/increments -name "spec.md" -exec grep -l "status: active" {} \;
find .specweave/increments -name "metadata.json" -exec grep -l '"status": "active"' {} \;
```

---

## Root Cause (Preliminary)

**Most Likely**: Status line hook is NOT running automatically after task completion.

**Why**:
1. Hook execution depends on Claude Code's hook system
2. Post-task-completion hook may not be triggering
3. User may need to manually trigger status line update

**Fix**:
1. **Immediate**: Manual update via `/specweave:update-status` command
2. **Long-term**: Ensure hook runs automatically (investigate hook system)

---

## Action Items

### Immediate (Next 5 minutes)
- [ ] Check status line cache file
- [ ] Manually run update-status-line.sh
- [ ] Verify hook updates cache
- [ ] Check if manual trigger works

### Short-term (This session)
- [ ] Create `/specweave:update-status` command if missing
- [ ] Add force-update flag to bypass cache
- [ ] Document manual trigger in user guide

### Long-term (Post-increment)
- [ ] Investigate why post-task-completion hook not firing
- [ ] Add status line update to /specweave:done workflow
- [ ] Consider auto-refresh mechanism

---

**Status**: INVESTIGATING
**Priority**: P0 (CRITICAL - affects user experience)
**Blocking**: Increment closure (this is AC-US1-01)
