---
sidebar_position: 1
title: Emergency Recovery Guide
description: How to recover from crashes, freezes, and common issues in SpecWeave
---

# Emergency Recovery Guide

This guide covers how to recover from common issues when using SpecWeave with Claude Code.

## Quick Fixes

### Claude Code Froze or Crashed

**Immediate actions**:

```bash
# 1. Disable hooks (prevents crash loop)
export SPECWEAVE_DISABLE_HOOKS=1

# 2. Clear stale state
rm -f .specweave/state/.hook-*
rm -rf .specweave/state/.dedup-cache

# 3. Restart Claude Code
# Close terminal, open new one, start Claude Code again
```

### Hook Errors Keep Appearing

```bash
# Kill switch - disable all hooks
export SPECWEAVE_DISABLE_HOOKS=1

# Reset circuit breaker
rm -f .specweave/state/.hook-circuit-breaker*

# Clear locks
rm -rf .specweave/state/.hook-*.lock

# Rebuild if needed
npm run rebuild
```

### Nothing Works, Total Reset

```bash
# Nuclear option - clear ALL state
rm -rf .specweave/state/
rm -rf .specweave/cache/

# Rebuild
npm run rebuild
```

---

## Understanding Crashes

### Why Claude Code Crashes

Most crashes happen due to **context explosion** - when the total information Claude is processing exceeds memory limits (~280KB).

**High-risk pattern**:
```
Active increment (10+ tasks) + Large file (2000+ lines) + Tool call = CRASH
```

**The math**:
| Component | Size |
|-----------|------|
| Large increment spec/tasks | ~40KB |
| Large file (2000 lines) | ~120KB |
| System context | ~50KB |
| Conversation history | ~20KB |
| Tool invocation | ~30KB |
| **TOTAL** | ~260KB+ |

When total exceeds ~280KB, Claude Code may freeze or crash silently.

### Symptoms

- Status bar shows `Tasks: X/10+` (large active increment)
- Editing files with 2000+ lines
- Claude thinking for unusually long time (4+ seconds)
- Terminal becomes unresponsive
- No error message (silent crash)

---

## Prevention Strategies

### Strategy 1: Pause Large Increments

**Rule**: If working on files OUTSIDE your increment, pause the increment first.

```bash
# Check status bar
Tasks: 0/12 (0%)  # ← HIGH RISK: 12 tasks = large spec

# Pause before editing external files
/sw:pause 0058

# Now safe to edit project files
# Edit src/some-large-file.ts

# Resume when done with external edits
/sw:resume 0058
```

**Why this works**: Pausing frees 40-80KB of context immediately.

### Strategy 2: Use Focused File Reads

Instead of reading entire large files:

```bash
# ❌ HIGH RISK: Loads entire 2400-line file
Read entire file

# ✅ SAFE: Loads only the section you need
Read with offset=1220, limit=50
```

When requesting Claude to read files, specify line ranges if the file is large.

### Strategy 3: Monitor the Status Bar

Watch for these red flags:

```
Tasks: 0/12 (0%) | ACs: 0/16 (0%)
       ↑              ↑
    12 tasks      16 acceptance criteria
    = Large spec  = HIGH context load
```

If you see `10+` tasks AND you're editing large files outside the increment → **pause first**.

### Strategy 4: One Context Rule

Safe workflows:

```bash
# Pattern A: Work ONLY on increment
/sw:do 0058
# (Edits files defined in the increment spec)

# Pattern B: Work ONLY on project files
/sw:pause 0058
# Edit project files freely
/sw:resume 0058
```

Dangerous workflow:

```bash
# ❌ DON'T DO THIS
# Large increment active +
# Editing large project file +
# = CRASH
```

---

## Recovering from Crashes

### Step 1: Assess Damage

```bash
# Check what was in progress
git status
git diff --stat

# Check if your work was saved
ls -la src/path/to/file  # Check file timestamp
```

### Step 2: Save or Revert Work

```bash
# If work looks good → Commit it
git add .
git commit -m "WIP: work before crash"

# If work is incomplete → Stash it
git stash save "WIP before crash"

# If work is broken → Revert it
git restore src/path/to/file
```

### Step 3: Clear Context

Option A: Close and reopen Claude Code (full reset)

Option B: Use `/clear` command in Claude Code

### Step 4: Resume Work

```bash
# If you were working on an increment
/sw:resume XXXX

# If you were working on project files
# Just continue - no increment context loaded
```

---

## Hook-Specific Issues

### "Running PreToolUse hooks... (0/2 done)" and Stuck

```bash
# 1. Disable hooks immediately
export SPECWEAVE_DISABLE_HOOKS=1

# 2. Reset state
rm -f .specweave/state/.hook-circuit-breaker*
rm -rf .specweave/state/.hook-*.lock

# 3. Restart Claude Code
```

### Circuit Breaker Tripped

When hooks fail 3+ times in a row, the circuit breaker trips to prevent crash loops.

```bash
# Check circuit breaker status
cat .specweave/state/.hook-circuit-breaker 2>/dev/null || echo "Not tripped"

# Reset it
rm -f .specweave/state/.hook-circuit-breaker*
```

### Hook Logs

Check what hooks were doing:

```bash
# View recent hook activity
tail -50 .specweave/logs/hooks-debug.log

# Check for running hook processes
ps aux | grep -E "(hook|update-status-line)" | grep -v grep
```

---

## Sync Issues

### GitHub Sync Not Working

```bash
# Check GitHub configuration
cat .specweave/config.json | grep github

# Check if token is set
echo $GITHUB_TOKEN | head -c 10  # Should show first 10 chars

# Manual sync
/sw:sync-progress
```

### "Sync throttled" Message

SpecWeave throttles sync to prevent API rate limits. Wait 60 seconds or:

```bash
# Force bypass throttle
/sw:sync-progress
```

### Duplicate Issues Created

```bash
# Clean up duplicates
/sw-github:cleanup-duplicates
```

---

## Status Line Issues

### Status Line Shows Wrong Information

```bash
# Force update status cache
/sw:update-status

# Or validate and fix
/specweave-validate-status
```

### Status Line Missing

The status line requires proper setup. Check:

```bash
# Verify status line is configured
ls -la .claude/settings.json

# Re-run status line setup if needed
```

---

## Data Recovery

### Lost Increment Data

Increments are stored in `.specweave/increments/`. If deleted:

```bash
# Check git history
git log --oneline --all -- .specweave/increments/

# Restore from git
git restore --source=HEAD~1 .specweave/increments/XXXX-name/
```

### Spec/Tasks Corrupted

```bash
# Validate increment
/sw:validate XXXX

# If corruption detected, restore from git
git restore .specweave/increments/XXXX-name/spec.md
git restore .specweave/increments/XXXX-name/tasks.md
```

---

## Environment Issues

### SPECWEAVE_DISABLE_HOOKS is Set

If hooks aren't running and you want them back:

```bash
# Check if disabled
echo $SPECWEAVE_DISABLE_HOOKS

# Re-enable
unset SPECWEAVE_DISABLE_HOOKS
```

### Wrong Node Version

SpecWeave requires Node.js 18+.

```bash
# Check version
node --version

# If < 18, upgrade
nvm install 18
nvm use 18
```

### Missing Dependencies

```bash
# Reinstall dependencies
npm install

# Rebuild
npm run rebuild
```

---

## Quick Reference Card

### Crash Prevention

```
IF (Tasks: 10+) AND (editing large file) THEN pause_first()
```

### Crash Recovery

1. Check `git status`
2. Commit/stash/revert as needed
3. Restart Claude Code or `/clear`
4. Resume with paused increment

### Hook Reset

```bash
export SPECWEAVE_DISABLE_HOOKS=1
rm -f .specweave/state/.hook-*
npm run rebuild
```

### Total Reset

```bash
rm -rf .specweave/state/
rm -rf .specweave/cache/
npm run rebuild
```

---

## Getting Help

If these solutions don't work:

1. **Check GitHub Issues**: [github.com/spec-weave/specweave/issues](https://github.com/spec-weave/specweave/issues)
2. **Report New Issue**: Include:
   - SpecWeave version (`specweave --version`)
   - Node.js version (`node --version`)
   - Relevant error messages
   - Steps to reproduce

---

## Related Guides

- [Troubleshooting Lesson](/docs/academy/specweave-essentials/09-troubleshooting) - General troubleshooting
- [External Tools](/docs/academy/specweave-essentials/07-external-tools) - GitHub/JIRA/ADO sync
- [FAQ](/docs/faq) - Common questions answered
