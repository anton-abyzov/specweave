---
sidebar_position: 10
slug: 09-troubleshooting
title: "Lesson 9: Troubleshooting"
description: "Fix common issues quickly"
---

# Lesson 9: Troubleshooting

**Time**: 25 minutes
**Goal**: Diagnose and fix common issues

---

## Quick Diagnosis

When something isn't working:

```bash
# Step 1: Check status
/sw:status

# Step 2: Validate structure
/sw:validate 0001

# Step 3: Sync everything
/sw:sync-progress

# Step 4: Check workflow
/sw:workflow
```

---

## Common Issues

### "No active increment found"

**Cause**: No [increment](/docs/glossary/terms/increments) in progress.

**Solution**:
```bash
# Create new
/sw:increment "Your feature"

# Or resume existing
/sw:resume 0001
```

---

### "WIP limit reached"

**Cause**: Too many increments active.

**Solution**:
```bash
# Complete one
/sw:done 0001

# Or pause one
/sw:pause 0002

# Or override (with reason)
/sw:increment "urgent-fix" --override-wip "Critical bug"
```

---

### "Gate validation failed"

**Cause**: Quality gate not passed.

**Solution**:
```bash
# Check what's missing
/sw:validate 0001

# Complete missing work
/sw:do --task T-005

# Or defer P2/P3 tasks
# In tasks.md:
# **Status**: [ ] deferred
# **Deferral Reason**: Scheduled for 0003

# Emergency bypass (rare!)
/sw:done 0001 --force --reason "CVE fix"
```

---

### "External sync failed"

**Cause**: Token expired or rate limit.

**Solution**:
```bash
# Check status
/sw-github:status

# If expired: regenerate token in .env
# GITHUB_TOKEN=ghp_newtoken

# Force re-sync
/sw-github:sync 0001 --force
```

---

### "AC-IDs not found"

**Cause**: Tasks missing AC references.

**Solution**:
```markdown
### T-003: Implement validation
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02  ← Add this line
**Status**: [ ] pending
```

---

### "Hook not firing"

**Cause**: Hook misconfigured.

**Solution**:
```bash
# Check hooks
/sw:check-hooks

# Verify hooks.json exists
ls plugins/specweave/hooks/hooks.json
```

---

### "Hook causing crashes"

**Emergency fix**:
```bash
# Disable hooks
export SPECWEAVE_DISABLE_HOOKS=1

# Or rename file
mv plugins/specweave/hooks/hooks.json hooks.json.bak

# Clean state
rm -f .specweave/state/.hook-*

# Restart Claude Code
```

---

### "YAML frontmatter invalid"

**Cause**: Bad spec.md format.

**Solution**:
```yaml
# spec.md must start with valid YAML
---
increment: 0001-feature-name
feature_id: FS-001
status: in-progress
---

# Content here...
```

**Common errors**:
```yaml
# ❌ Wrong: Unquoted colon
increment: 0001-feature: name

# ✅ Correct: Quoted
increment: "0001-feature: name"
```

---

### "Tests not detected"

**Cause**: Test command not configured.

**Solution**:
In `.specweave/config.json`:
```json
{
  "testing": {
    "command": "npm test",
    "coverageCommand": "npm test -- --coverage"
  }
}
```

---

### "Performance slow"

**Cause**: Large context or multiple agents.

**Solution**:
```bash
# Pause complex increments
/sw:pause 0001

# Use smaller model
"Using Haiku: find all TODO comments"

# Close completed work
/sw:done 0001
```

---

## Diagnostic Commands

```bash
/sw:status          # Overall status
/sw:validate 0001   # Validate increment
/sw:check-hooks     # Hook health
/sw:sync-diagnostics # Sync issues
/sw:workflow        # Current state
```

---

## Recovery Procedures

### Corrupted Increment

```bash
# Backup
cp -r .specweave/increments/0001 0001.bak

# Try fix
/sw:validate 0001 --fix

# Or restore from git
git checkout HEAD -- .specweave/increments/0001/
```

### Lost Progress

```bash
# Check git history
git log --oneline .specweave/increments/0001/tasks.md

# Restore version
git checkout abc123 -- .specweave/increments/0001/tasks.md
```

---

## Glossary Terms Used

- **[Increment](/docs/glossary/terms/increments)** — A unit of work
- **[WIP Limits](/docs/glossary/terms/wip-limits)** — Work-in-progress constraints
- **[Hooks](/docs/glossary/terms/hooks)** — Automated scripts at lifecycle events

---

## Key Takeaways

| Issue | Quick Fix |
|-------|-----------|
| No active increment | `/sw:status` → create or resume |
| WIP limit | Complete or pause an increment |
| Gate failed | `/sw:validate` → fix issues |
| Sync broken | `/sw:sync-progress --force` |
| Hooks crashing | `export SPECWEAVE_DISABLE_HOOKS=1` |

**Golden rule**: When stuck, run `/sw:workflow`

---

## What's Next?

Master advanced patterns for complex projects.

**:next** → [Lesson 10: Advanced Patterns](./10-advanced-patterns)
