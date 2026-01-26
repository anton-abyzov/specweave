---
name: reflect-check
description: Diagnostic tool for validating SpecWeave reflection system health and troubleshooting issues. Use when reflection seems stuck, learnings aren't being captured, or MEMORY.md files aren't updating. Checks configuration, permissions, and system state.
allowed-tools: Read, Bash
---

# Reflect Health Check

**Version**: 1.0.0
**Category**: Diagnostics
**Status**: Active

## Purpose

Diagnostic command to validate reflection system health and troubleshoot issues.

## Activation Triggers

**Primary keywords**:
- `reflect-check`
- `reflect check`
- `check reflect`
- `reflection health`
- `reflect status`
- `reflect diagnostics`

**Natural language**:
- "Check if reflection is working"
- "Why isn't reflection learning?"
- "Is auto-reflect enabled?"
- "Diagnose reflection issues"
- "Reflection not working"

## What This Skill Does

Runs comprehensive health checks on the reflection system:

1. **Config validation**: Checks reflect-config.json exists and is valid
2. **Script syntax**: Validates reflect.sh has no syntax errors
3. **Recent activity**: Shows last 10 reflection attempts
4. **Memory status**: Lists memory files and learning counts
5. **Hook status**: Verifies stop-reflect.sh is working
6. **Pre-flight checks**: Runs same checks as stop-reflect.sh

## Execution

When activated:

```bash
# Run health check
bash plugins/specweave/scripts/reflect-check.sh
```

Returns formatted health report with:
- ✅ Green checkmarks for passing checks
- ❌ Red X for failing checks
- 📊 Status information
- 💡 Suggestions for fixes

## Output Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 REFLECT HEALTH CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Configuration
   Auto-reflect: ON
   Max learnings: 10
   Confidence: medium

✅ Script Syntax
   reflect.sh: Valid

✅ Dependencies
   jq: Found
   bash: 5.2.26

📊 Recent Activity (last 10 attempts)
   2026-01-07 08:00: Pre-flight checks passed
   2026-01-07 07:30: No signals detected
   ...

📚 Memory Status
   general.md: 4 learnings
   testing.md: 3 learnings
   git.md: 2 learnings

💡 RECOMMENDATIONS
   - None - system healthy

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## When to Use

- Reflection seems stuck or not learning
- After marketplace updates
- User reports "reflection not working"
- Debugging silent failures
- Verifying system health

## Success Criteria

- All checks pass (green checkmarks)
- Recent activity shows successful reflections
- Memory files are being updated
- Clear actionable recommendations if issues found

## Related

- `/sw:reflect` - Manual reflection
- `/sw:reflect-status` - Show config and stats
- `stop-reflect.sh` - Auto-reflection hook
