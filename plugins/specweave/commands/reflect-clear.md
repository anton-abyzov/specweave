---
name: sw:reflect-clear
description: Clear specific learnings from skill memory files. Activates for reflect clear, clear learning, remove learning, delete memory.
---

# Reflect Clear Command

**Remove specific learnings from skill memory files.**

## Usage

```bash
# Clear specific learning by ID
/sw:reflect-clear --learning LRN-2026-01-05-001

# Clear all learnings for a skill
/sw:reflect-clear --skill frontend

# Clear all learnings older than N days
/sw:reflect-clear --older-than 90

# Clear all learnings (with confirmation)
/sw:reflect-clear --all

# Dry run
/sw:reflect-clear --skill frontend --dry-run
```

## Arguments

| Argument | Description |
|----------|-------------|
| `--learning <id>` | Clear specific learning by ID |
| `--skill <name>` | Clear all learnings for skill |
| `--older-than <days>` | Clear learnings older than N days |
| `--all` | Clear ALL learnings (requires confirmation) |
| `--dry-run` | Show what would be cleared |

## Examples

### Clear Specific Learning

```bash
/sw:reflect-clear --learning LRN-2026-01-05-001
```

Output:
```
🗑️ Clearing learning LRN-2026-01-05-001...

Removed from frontend/MEMORY.md:
  - "Always use Button component with variant='primary'"

✅ Learning cleared.
```

### Clear Skill Memory

```bash
/sw:reflect-clear --skill frontend
```

Output:
```
🗑️ Clear all learnings for 'frontend' skill?

This will remove 23 learnings from:
  ~/.claude/skills/frontend/MEMORY.md

Type 'yes' to confirm: yes

✅ Cleared 23 learnings from frontend skill.
```

### Clear Old Learnings

```bash
/sw:reflect-clear --older-than 90
```

Output:
```
🗑️ Clearing learnings older than 90 days...

Found 7 learnings to remove:
  - frontend: 3 learnings
  - backend: 2 learnings
  - testing: 2 learnings

Type 'yes' to confirm: yes

✅ Cleared 7 old learnings.
```

## Execution

**CRITICAL: Execute steps SEQUENTIALLY. Wait for each tool call to complete before the next.**
**DO NOT make parallel tool calls - this causes API concurrency errors.**

When this command is invoked:

1. **Parse arguments** for learning ID, skill, or age filter (NO tool call - parse from prompt)
2. **Read MEMORY.md file(s)** to find matching learnings (ONE Read per file, sequential)
3. **Show confirmation** with what will be deleted (output to user - NO tool call)
4. **Write updated MEMORY.md** files on confirmation (ONE Write per file, sequential)
5. **Git commit** if configured (ONE Bash call)
