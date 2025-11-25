---
sidebar_position: 10
title: "Lesson 9: Troubleshooting"
description: "Solve common issues and edge cases"
---

# Lesson 9: Troubleshooting Guide

**Duration**: 30 minutes
**Prerequisites**: Lessons 1-8 completed
**Outcome**: Diagnose and fix common SpecWeave issues confidently

---

## Quick Diagnosis

### The Universal Fix

When something isn't working:

```bash
# Step 1: Check increment status
/specweave:status

# Step 2: Validate structure
/specweave:validate 0001

# Step 3: Sync everything
/specweave:sync-progress

# Step 4: Check workflow state
/specweave:workflow
```

---

## Common Issues

### Issue 1: "No active increment found"

**Symptom**:
```
Error: No active increment found
Cannot proceed with /specweave:do
```

**Causes & Solutions**:

```bash
# Cause 1: No increment created
/specweave:increment "Your feature description"

# Cause 2: Increment in wrong status
/specweave:status
# If shows "backlog" or "paused":
/specweave:resume 0001

# Cause 3: Increment completed
/specweave:status
# If shows "completed", start new:
/specweave:next
```

### Issue 2: "WIP limit reached"

**Symptom**:
```
⚠️ Cannot start new increment
WIP limit reached: 2/2
```

**Solutions**:

```bash
# Option 1: Complete an increment
/specweave:done 0001

# Option 2: Pause an increment
/specweave:pause 0002

# Option 3: Temporarily increase WIP (with reason)
/specweave:increment "urgent-fix" --override-wip "Critical production bug"
```

### Issue 3: "Gate validation failed"

**Symptom**:
```
❌ GATE 1 FAILED
P1 task T-005 incomplete
```

**Solutions**:

```bash
# Check what's missing
/specweave:validate 0001

# Option 1: Complete the work
/specweave:do --task T-005

# Option 2: Defer with reason (P2/P3 only)
# Edit tasks.md:
# **Status**: [ ] deferred
# **Deferral Reason**: Scheduled for 0002

# Option 3: Emergency bypass (production hotfix only!)
/specweave:done 0001 --force --reason "Critical CVE fix"
```

### Issue 4: "External sync failed"

**Symptom**:
```
Error: GitHub sync failed
Authentication failed or rate limit exceeded
```

**Solutions**:

```bash
# Check connection status
/specweave-github:status

# If token expired:
# 1. Generate new token at GitHub
# 2. Update .env:
# GITHUB_TOKEN=ghp_newtoken

# If rate limited:
/specweave:sync-diagnostics
# Wait for reset or use different token

# Force re-sync
/specweave-github:sync 0001 --force
```

### Issue 5: "Tasks not syncing"

**Symptom**:
```
tasks.md shows 80% complete
GitHub issue shows 20% complete
```

**Solutions**:

```bash
# Full sync in correct order
/specweave:sync-progress

# If still wrong, force from SpecWeave
/specweave-github:sync 0001 --force

# Or force from external (GitHub wins)
/specweave:sync-progress --from-external
```

### Issue 6: "AC-IDs not found"

**Symptom**:
```
Warning: Tasks missing AC-ID references
T-003: No AC-ID specified
```

**Solutions**:

```bash
# Edit tasks.md to add AC-IDs:

### T-003: Implement validation
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02  ← Add this line
**Status**: [ ] pending
```

### Issue 7: "Duplicate increments"

**Symptom**:
```
Found 2 increments with similar names:
- 0001-user-auth
- 0002-user-authentication
```

**Solutions**:

```bash
# Check for duplicates
/specweave:status

# Fix duplicates
/specweave:fix-duplicates

# Or manually:
# 1. Review both increments
# 2. Merge tasks into one
# 3. Abandon the duplicate:
/specweave:abandon 0002 --reason "Duplicate of 0001"
```

---

## Hook Issues

### Issue: "Hook not firing"

**Symptom**:
```
Expected auto-sync after task completion
Nothing happened
```

**Diagnosis**:

```bash
# Check hooks status
/specweave:check-hooks

# Verify hooks.json exists
ls plugins/specweave/hooks/hooks.json

# Check hook configuration
cat plugins/specweave/hooks/hooks.json
```

**Common Fixes**:

```json
// hooks.json - ensure proper format
{
  "hooks": [
    {
      "event": "PostToolUse",
      "tools": ["Edit"],
      "match": "tasks.md",
      "command": "specweave sync-progress --silent"
    }
  ]
}
```

### Issue: "Hook causing crashes"

**Symptom**:
```
Claude Code crashes after task completion
Loop detected in hook execution
```

**Emergency Fix**:

```bash
# Disable hooks immediately
export SPECWEAVE_DISABLE_HOOKS=1

# Or rename hooks file
mv plugins/specweave/hooks/hooks.json plugins/specweave/hooks/hooks.json.bak

# Clean hook state
rm -f .specweave/state/.hook-*

# Restart Claude Code
```

---

## File Structure Issues

### Issue: "Invalid increment structure"

**Symptom**:
```
Error: spec.md not found
Error: Invalid increment directory
```

**Required Structure**:

```
.specweave/increments/0001-feature-name/
├── spec.md       ← REQUIRED
├── plan.md       ← REQUIRED
├── tasks.md      ← REQUIRED
├── metadata.json ← REQUIRED
└── reports/      ← Optional subfolder
```

**Fix**:

```bash
# Regenerate missing files
/specweave:validate 0001 --fix

# Or manually create:
# spec.md with YAML frontmatter
# plan.md with architecture
# tasks.md with task list
```

### Issue: "YAML frontmatter invalid"

**Symptom**:
```
Error: Invalid YAML in spec.md
Cannot parse increment metadata
```

**Fix**:

```yaml
# spec.md must start with valid YAML
---
increment: 0001-feature-name
feature_id: FS-001
status: in-progress
---

# Content here...
```

**Common YAML Errors**:
```yaml
# ❌ Wrong: Missing quotes for special chars
increment: 0001-feature: name

# ✅ Correct: Quote strings with colons
increment: "0001-feature: name"

# ❌ Wrong: Tab indentation
status:
	in-progress

# ✅ Correct: Space indentation
status:
  in-progress
```

---

## Test Issues

### Issue: "Tests not detected"

**Symptom**:
```
Gate 2: Tests (0/0 detected)
```

**Solutions**:

```bash
# Check test configuration in config.json
cat .specweave/config.json

# Ensure test command is configured:
{
  "testing": {
    "command": "npm test",
    "coverageCommand": "npm test -- --coverage"
  }
}

# Run tests manually to verify
npm test
```

### Issue: "Coverage below threshold"

**Symptom**:
```
❌ GATE 2 FAILED
Coverage: 72% (required: 80%)
```

**Solutions**:

```bash
# Option 1: Add more tests
/specweave:tdd-red  # Generate failing tests
/specweave:tdd-green  # Implement to pass

# Option 2: Lower threshold (if justified)
# Edit .specweave/config.json:
{
  "quality": {
    "coverage": {
      "unit": 70  # Lower from 80
    }
  }
}

# Option 3: Per-increment override
# In spec.md frontmatter:
---
quality:
  tests:
    minCoverage: 70
---
```

---

## Documentation Issues

### Issue: "Living docs not syncing"

**Symptom**:
```
FEATURES.md doesn't show new feature
Feature folder not created
```

**Solutions**:

```bash
# Force sync to living docs
/specweave:sync-docs

# Verify feature ID in spec.md
---
increment: 0001-user-auth
feature_id: FS-001  ← Required for living docs
---

# Manual sync
/specweave:sync-specs
```

### Issue: "ACs not checked in spec.md"

**Symptom**:
```
Gate 3: Unchecked acceptance criteria
- [ ] AC-US1-03: Session expires
```

**Solutions**:

```bash
# Auto-sync AC status from tasks
/specweave:sync-acs

# Or manually check in spec.md:
- [x] AC-US1-03: Session expires after 24h
```

---

## Performance Issues

### Issue: "Claude running slow"

**Causes**:
1. Large context (many files read)
2. Complex increment active
3. Multiple agents running

**Solutions**:

```bash
# Reduce context
/specweave:pause 0001  # Pause complex increment

# Use smaller model for simple tasks
"Using Haiku: find all TODO comments"

# Close completed work
/specweave:done 0001
```

### Issue: "Frequent crashes"

**Prevention**:

```bash
# 1. Keep increments focused (< 10 tasks)
# 2. Close increments before large edits
# 3. Use sequential, not parallel agents

# Emergency mode (explicit activation)
EMERGENCY MODE. 1 edit. 50 lines max. No agents.
```

---

## Diagnostic Commands

### Full System Check

```bash
# 1. SpecWeave status
/specweave:status

# 2. Increment validation
/specweave:validate 0001

# 3. Hook health
/specweave:check-hooks

# 4. External sync status
/specweave:sync-diagnostics

# 5. Workflow state
/specweave:workflow
```

### Debug Mode

```bash
# Enable verbose logging
export SPECWEAVE_DEBUG=1

# Run command
/specweave:do

# Check logs
cat .specweave/logs/debug.log
```

---

## Recovery Procedures

### Corrupted Increment

```bash
# 1. Backup current state
cp -r .specweave/increments/0001 .specweave/increments/0001.bak

# 2. Reset from metadata
/specweave:validate 0001 --fix

# 3. Or restore from git
git checkout HEAD -- .specweave/increments/0001/
```

### Lost Progress

```bash
# Check git history
git log --oneline .specweave/increments/0001/tasks.md

# Restore specific version
git checkout abc123 -- .specweave/increments/0001/tasks.md
```

### Complete Reset (Last Resort)

```bash
# ⚠️ DANGER: Loses all increment data
# Only use if completely corrupted

# 1. Backup first!
cp -r .specweave .specweave.backup

# 2. Remove and reinitialize
rm -rf .specweave/increments/*
specweave init . --reconfigure
```

---

## Getting Help

### Self-Service

```bash
# Command help
/specweave --help

# Specific command help
/specweave:increment --help

# Check documentation
/specweave:workflow  # Shows current state and suggestions
```

### Community

- **GitHub Issues**: Report bugs at github.com/specweave/specweave
- **Discussions**: Ask questions in GitHub Discussions
- **Documentation**: https://spec-weave.com

---

## Summary

| Issue | Quick Fix |
|-------|-----------|
| No active increment | `/specweave:status` → create or resume |
| WIP limit | Complete or pause an increment |
| Gate failed | `/specweave:validate` → fix issues |
| Sync broken | `/specweave:sync-progress --force` |
| Hooks crashing | `export SPECWEAVE_DISABLE_HOOKS=1` |
| YAML invalid | Check frontmatter format |
| Tests failing | Run tests manually first |

**Golden Rule**: When stuck, run `/specweave:workflow` — it shows your current state and suggests the next action.

:next → [Lesson 10: Advanced Patterns](./10-advanced-patterns)
