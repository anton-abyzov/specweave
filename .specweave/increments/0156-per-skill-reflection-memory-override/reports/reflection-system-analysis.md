# Reflection System Analysis & Fix

**Date**: 2026-01-07
**Status**: ✅ Fixed
**Root Cause**: Git merge conflict marker breaking reflect.sh script

---

## Problem Summary

The reflection system appeared to be running but was **silently failing** on every session end. Logs showed:

```
{"ts":"2026-01-07T07:21:24Z","lvl":"info","msg":"Starting async reflection"}
{"ts":"2026-01-07T07:21:24Z","lvl":"info","msg":"Reflection completed with no new learnings"}
```

However, the script was **not actually analyzing transcripts** - it was crashing immediately due to a syntax error.

---

## Root Cause Analysis

### 🔍 Discovery Process

1. **Checked reflection config** - Auto-reflect enabled ✅
2. **Checked stop hooks** - `stop-reflect.sh` configured correctly ✅
3. **Checked execution logs** - Hook was running ✅
4. **Checked auto-reflect log** - **FOUND THE ISSUE** ❌

### 🐛 The Bug

File: `plugins/specweave/scripts/reflect.sh` (line 102)

```bash
99→# Set trap for cleanup on script exit
100→trap cleanup_temp EXIT INT TERM
101→
102→>>>>>>> df087427 (feat(auto): make stop hook labels visible via systemMessage (v2.9))
103→# ============================================================================
104→# LOGGING (with rotation)
105→# ============================================================================
```

**Unresolved git merge conflict marker** from commit `df087427` was left in the file.

### 💥 Impact

Every time `reflect.sh` was executed:

```bash
/Users/antonabyzov/.claude/plugins/cache/specweave/sw/1.0.0/hooks/../scripts/reflect.sh: line 102: syntax error near unexpected token `>>'
```

The script **immediately crashed**, so:
- ❌ No transcript analysis happened
- ❌ No signal detection ran
- ❌ No learnings were extracted
- ✅ Hook returned "no new learnings" (technically true - nothing ran!)

---

## How Reflection Actually Works

### Architecture Overview

```
Session End
    ↓
session-end.sh (cleanup)
    ↓
stop-reflect.sh (auto-reflection check)
    ↓
detect signals in transcript
    ↓
reflect.sh (learning extraction)
    ↓
Route to memory files
```

### Storage Model: Centralized vs Per-Skill

**SpecWeave uses CENTRALIZED memory** (not per-skill MEMORY.md files):

```
.specweave/memory/          # Project-specific learnings
├── general.md              # 4 learnings
├── testing.md              # 3 learnings
├── git.md                  # 2 learnings
├── database.md             # 1 learning
└── logging.md              # 0 learnings (empty)

plugins/specweave/skills/*/MEMORY.md  # 39 files, ALL EMPTY (templates only)
```

**Why per-skill MEMORY.md files are empty**:
- SpecWeave repo itself uses centralized memory
- Per-skill files are **templates** for user projects
- When users install SpecWeave, they get fresh MEMORY.md files to populate

### Current Learning Status

**10 total learnings across 5 categories:**

#### General (4 learnings)
- ✗→✓ NEVER suggest scripts/ to end users - use `specweave refresh-marketplace` CLI
- ✗→✓ NEVER create files in project root - use increment folders
- ✗→✓ Always use environment variables for configuration
- ✗→✓ Update project memory (.specweave/), not global (~/.specweave/)

#### Testing (3 learnings)
- → Use vi.fn() for mocks in Vitest (not jest.fn())
- → Use os.tmpdir() for test temp files (not project cwd)
- ✗→✓ Always specify registry to avoid ~/

#### Git (2 learnings)
- ✗→✓ Keep commit messages short and professional
- ✗→✓ Never include "Generated with Claude" or AI attribution

#### Database (1 learning)
- → Use Prisma for all database queries

---

## The Fix

### Changes Made

**File**: `plugins/specweave/scripts/reflect.sh`

```diff
# Set trap for cleanup on script exit
trap cleanup_temp EXIT INT TERM

->>>>>>> df087427 (feat(auto): make stop hook labels visible via systemMessage (v2.9))
 # ============================================================================
 # LOGGING (with rotation)
 # ============================================================================
```

**Commit**: `cad6745b`

```
fix: remove git merge conflict marker from reflect.sh

- Removed unresolved merge conflict marker at line 102
- This was causing reflection hooks to fail silently
- All auto-reflection attempts returned 'no new learnings' due to script syntax error
```

### Validation

```bash
✅ Syntax is now valid!
```

### Marketplace Update

```bash
bash scripts/refresh-marketplace.sh --github
```

Updates cached version in `~/.claude/plugins/cache/specweave/sw/1.0.0/`

---

## How to Verify Fix

### 1. Check Script Syntax

```bash
bash -n plugins/specweave/scripts/reflect.sh
# Should output nothing (means syntax is valid)
```

### 2. Monitor Reflection Logs

```bash
tail -f .specweave/logs/reflect/auto-reflect.log
```

### 3. Trigger a Learning Session

Have a conversation with corrections like:
- "No, don't use X. Use Y instead."
- "Always use Z in this project"
- "Never do W"

### 4. Check Memory Files

```bash
cat .specweave/memory/general.md
```

Should see new learnings with ✗→✓ markers.

---

## Reflection System Design

### Signal Detection

**High-value corrections** (captured):
```
"No, don't X. Do Y instead."
"Wrong! Should be Z."
"Never use A, always use B."
```

**Generic praise** (skipped):
```
"Perfect!"
"Great job!"
"That's right."
```

### Quality Gates

1. **Minimum length**: 15+ characters
2. **Actionable verb**: Must contain use/prefer/always/never/should/avoid
3. **Word count**: 3+ words
4. **No doc artifacts**: Filters out code examples, JSON, line numbers
5. **Deduplication**: Checks keyword overlap (50% threshold)

### Learning Format

```markdown
- ✗→✓ [corrected rule]     # High confidence (user corrected Claude)
- → [explicit rule]         # Medium confidence (user stated preference)
```

### Limits

- **Max per session**: 5 learnings (default)
- **Max per category**: 30 learnings (auto-pruned, newest kept)
- **Max rule length**: 100 characters

---

## Why Reflection Was "Silent Failing"

### Hook Chain Still Executed

```bash
✅ session-end.sh ran
✅ stop-reflect.sh detected signals
✅ reflect.sh was called
❌ reflect.sh crashed immediately (syntax error)
✅ Hook returned "no new learnings" (exit code 0)
```

### Why No Error Was Visible

1. **Hooks use `set +e`** (never fail)
2. **Background execution** (`reflect.sh` runs async)
3. **Errors logged** to `.specweave/logs/reflect/auto-reflect.log` (not shown in UI)
4. **Graceful degradation** - hook always returns success

---

## Lessons Learned

### For Future Development

1. **Pre-commit hooks should check for merge markers**:
   ```bash
   if grep -rn "^<<<<<<< \|^=======\|^>>>>>>> " plugins/; then
     echo "ERROR: Unresolved merge conflicts found"
     exit 1
   fi
   ```

2. **Add syntax validation to marketplace refresh**:
   ```bash
   bash -n plugins/specweave/scripts/*.sh
   ```

3. **Better error reporting in hooks**:
   - Log to both file AND return error message in JSON
   - Add health check command: `/sw:reflect-check`

### For Documentation

- Clarify centralized vs per-skill memory model
- Document that per-skill MEMORY.md are templates, not active in SpecWeave repo
- Add troubleshooting section for "no learnings" scenarios

---

## Next Steps

### Immediate (Done ✅)

- [x] Fix merge conflict in reflect.sh
- [x] Commit and push fix
- [x] Refresh marketplace
- [x] Document root cause analysis

### Short-term (Recommended)

- [ ] Add pre-commit hook for merge markers
- [ ] Add `/sw:reflect-check` health check command
- [ ] Add syntax validation to marketplace refresh
- [ ] Update docs to clarify memory model

### Long-term (Nice to Have)

- [ ] Add reflection dashboard showing recent learnings
- [ ] Add reflection quality metrics (acceptance rate, dedup rate)
- [ ] Add per-project vs global memory toggle
- [ ] Add learning search/query interface

---

## Verification Checklist

After fix applied:

- [x] Script syntax validates (`bash -n`)
- [x] Marketplace refreshed
- [x] Commit pushed to develop
- [ ] Test with actual correction in conversation
- [ ] Verify learning appears in memory file
- [ ] Restart Claude Code to pick up changes

---

## References

- **Reflection Config**: `.specweave/state/reflect-config.json`
- **Memory Files**: `.specweave/memory/*.md`
- **Logs**: `.specweave/logs/reflect/`
- **Hook Scripts**: `plugins/specweave/hooks/`
- **Core Script**: `plugins/specweave/scripts/reflect.sh`

---

**Status**: ✅ Root cause identified, fix applied, marketplace updated.
**Next**: Restart Claude Code to test with live corrections.
