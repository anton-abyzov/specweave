---
name: sw:reflect-status
description: Show reflection configuration and learning statistics. Activates for reflect status, reflection status, memory status, learnings status.
---

# Reflect Status Command

**Show reflection configuration and learning statistics.**

## Usage

```bash
/sw:reflect-status
```

## Output Example

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 REFLECT: Status Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CONFIGURATION

  Reflection:      ✅ Enabled
  Auto-reflect:    ✅ On (stop hook active)
  Enabled since:   2026-01-03T10:30:00Z

  Confidence:      medium
  Max/session:     10
  Git commit:      ✅ enabled
  Git push:        ❌ disabled

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 SKILL MEMORIES

  Project Skills (.specweave/skills/):
    • api-patterns/MEMORY.md    12 learnings
    • components/MEMORY.md      8 learnings
    • testing/MEMORY.md         5 learnings

  Global Skills (~/.claude/skills/):
    • frontend/MEMORY.md        23 learnings
    • backend/MEMORY.md         18 learnings
    • devops/MEMORY.md          7 learnings

  Total: 73 learnings across 6 skills

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 RECENT ACTIVITY

  Last reflection:  2026-01-05T09:15:00Z
  Learnings today:  4
  Learnings week:   12

  Recent learnings:
    • [HIGH] Button component usage → frontend
    • [HIGH] API error handling → api-patterns
    • [MED]  Query optimization → database
    • [MED]  Test fixture pattern → testing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 COMMANDS

  /sw:reflect          Manual reflection now
  /sw:reflect-on       Enable auto-reflect
  /sw:reflect-off      Disable auto-reflect
  /sw:reflect-clear    Clear specific learnings

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Information Displayed

| Section | Contents |
|---------|----------|
| **Configuration** | Enable status, auto-reflect, thresholds |
| **Skill Memories** | Project and global skills with learning counts |
| **Recent Activity** | Last reflection, recent learnings |
| **Commands** | Quick reference for reflect commands |

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw:reflect` | Manual reflection |
| `/sw:reflect-on` | Enable auto-reflect |
| `/sw:reflect-off` | Disable auto-reflect |

## Execution

When this command is invoked:

1. **Read state** from `.specweave/state/reflect-config.json`
2. **Scan skills** directories for MEMORY.md files
3. **Count learnings** per skill
4. **Show dashboard** with configuration and statistics
