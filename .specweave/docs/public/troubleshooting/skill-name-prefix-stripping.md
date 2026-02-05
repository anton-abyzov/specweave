# Skill Name Field: Plugin Prefix Stripping

## Problem

Using `name:` in SKILL.md or command YAML frontmatter causes Claude Code to **strip the plugin namespace prefix** from slash commands.

**Symptoms:**
- Skills show as `/grill` instead of `/sw:grill`
- Commands not found when invoking `/sw:do`, `/sw:increment`, etc.
- Autocomplete shows skills without their plugin prefix
- Only a few items appear when typing `/sw:` in the command palette

## Root Cause

When a SKILL.md file includes `name:` in its YAML frontmatter, Claude Code uses that literal name instead of prepending the plugin prefix. Since the `name` field doesn't include the plugin prefix (e.g., `sw:`), the skill loses its namespace.

**Example (broken):**
```yaml
---
name: grill
description: Critical code review...
---
```
Result: Skill registers as `/grill` (no prefix)

**Example (correct):**
```yaml
---
description: Critical code review...
---
```
Result: Skill registers as `/sw:grill` (prefix from plugin.json `name` field)

## How Plugin Prefixes Work

1. Each plugin has a `plugin.json` with `"name": "sw"` (or `sw-testing`, etc.)
2. Claude Code uses this as the namespace prefix: `sw:*`
3. Skill/command names are derived from:
   - **Skills**: Directory name (`skills/grill/SKILL.md` → `grill`)
   - **Commands**: Filename (`commands/do.md` → `do`)
4. Combined: `sw:` + `grill` = `/sw:grill`

When `name:` is in frontmatter, Claude Code **overrides** step 3 with the literal value, skipping the prefix.

## Solution

Remove `name:` from all SKILL.md and command frontmatter files:

```bash
# Find all SKILL.md files with name: in frontmatter
find plugins -name "SKILL.md" -exec awk '/^---$/{c++}c==1&&/^name:/{print FILENAME; nextfile}c==2{nextfile}' {} +

# Find all command .md files with name: in frontmatter
find plugins -path "*/commands/*.md" -exec awk '/^---$/{c++}c==1&&/^name:/{print FILENAME; nextfile}c==2{nextfile}' {} +
```

For each file found, edit and remove the `name:` line from the YAML frontmatter block.

## When `name:` IS Acceptable

The `name:` field is safe to use for **standalone skills** (not in plugins):
- `~/.claude/skills/my-skill/SKILL.md` - Personal skills have no plugin prefix
- `.claude/skills/my-skill/SKILL.md` - Project skills have no plugin prefix

Only **plugin-based** skills (in `plugins/*/skills/`) are affected.

## Prevention

SpecWeave includes a pre-commit guard (`scripts/pre-commit-no-name-frontmatter.sh`) that blocks commits containing `name:` in plugin SKILL.md or command frontmatter.

## Related

- [Skill Truncation: Character Budget Limit](./skill-truncation-budget.md) - Another cause of missing skills
- [Plugin Naming Conventions](./plugin-naming-conventions.md)

---

**Last Updated**: 2026-02-05
