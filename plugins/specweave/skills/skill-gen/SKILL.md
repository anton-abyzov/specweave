---
description: "Generate project-specific skills from detected patterns in living docs. Use when saying 'skill-gen', 'generate skills', 'create project skills', 'codify patterns', 'skill generation', 'project-specific skills', or 'detected patterns'. Also use when the user responds to a skill suggestion printed during increment closure."
argument-hint: "[--refresh]"
context: fork
model: opus
---

# sw:skill-gen — Project-Specific Skill Generation

## Project Overrides

!`s="skill-gen"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`

Generate project-local skills from recurring patterns detected across increment closures.

## Overview

This skill reads `.specweave/state/skill-signals.json`, displays qualifying patterns (observed in 3+ increments), and generates SKILL.md files in `.claude/skills/` using Anthropic's official skill-creator plugin.

**Key principle**: Skills are generated on-demand only. The signal detection and suggestion system runs passively — this skill is where the user actively decides what to codify.

## Workflow

### Step 1: Load Signals

```bash
SIGNALS_FILE=".specweave/state/skill-signals.json"
if [ ! -f "$SIGNALS_FILE" ]; then
  echo "No signals detected yet. Run a few increments with living docs enabled, then try again."
  exit 0
fi
```

Read `skill-signals.json` and load config for `minSignalCount` (default: 3).

### Step 2: Display Qualifying Patterns

Filter signals where `incrementIds.length >= minSignalCount`. Display ALL qualifying patterns regardless of `declined` status (the user may reconsider).

For each qualifying signal, show:
- Pattern name and category
- Number of increments where observed
- Confidence score
- Evidence (file paths)
- Status: `[suggested]`, `[declined]`, `[generated]`, or `[new]`

**If no signals qualify**: Print "No qualifying patterns found. Patterns need to be observed in at least {minSignalCount} increments."

### Step 3: User Selects Pattern

Wait for the user to select a pattern by name or number. The user responds in natural language.

### Step 4: Check Skill-Creator Plugin

Verify Anthropic's official skill-creator is available (local-first, then global fallback):

```bash
# Check local project copy first (auto-installed by specweave init)
SKILL_CREATOR_PATH=".claude/skills/skill-creator/SKILL.md"
if [ ! -f "$SKILL_CREATOR_PATH" ]; then
  # Fall back to global plugin cache
  SKILL_CREATOR_PATH=$(find ~/.claude/plugins/cache/claude-plugins-official/skill-creator -name "SKILL.md" -maxdepth 3 2>/dev/null | head -1)
fi
if [ -z "$SKILL_CREATOR_PATH" ]; then
  echo "ERROR: Anthropic's skill-creator plugin is not installed."
  echo "Install it via: claude install-skill https://github.com/anthropics/claude-code/tree/main/skill-creator"
  echo ""
  echo "The skill-creator is required to build tested, benchmarked skills."
  exit 1
fi
```

### Step 5: Delegate to Skill-Creator

**Slug dedup guard** — before delegating, check if a skill with this slug already exists:

```bash
SKILL_SLUG="$SELECTED_PATTERN_SLUG"   # e.g. "error-handling"
SKILL_DIR=".claude/skills/$SKILL_SLUG"
if [ -d "$SKILL_DIR" ] && [ -f "$SKILL_DIR/SKILL.md" ]; then
  echo "Skill '$SKILL_SLUG' already exists at $SKILL_DIR/SKILL.md -- skipping generation."
  # Mark signal as generated in skill-signals.json and continue to next pattern
  exit 0
fi
```

Invoke the skill-creator with the selected pattern context:

1. **Provide context** to skill-creator:
   - Skill name: derive from pattern slug (e.g., `project-error-handling`)
   - Description: based on the signal's description and evidence
   - Purpose: codify the detected project convention
   - Evidence files: provide the file paths from signal evidence for the creator to read

2. **Skill-creator workflow** handles:
   - Writing SKILL.md with proper frontmatter
   - Creating evals/evals.json with test cases
   - Running with-skill vs without-skill benchmarks
   - Description optimization via run_loop.py

3. **Output location**: `.claude/skills/{pattern-slug}/SKILL.md` (project-local)

### Step 6: Update Signal State

After successful generation:

```typescript
signal.generated = true;
// Save updated store
```

### Step 7: Summary

Print:
```
Generated project skill: .claude/skills/{pattern-slug}/SKILL.md

This skill will be active in future conversations for this project.
To test: start a new conversation and try a task related to {pattern-name}.
To remove: delete .claude/skills/{pattern-slug}/
```

## Options

| Flag | Description |
|------|-------------|
| `--refresh` | Re-check all existing `.claude/skills/` against current living docs for drift |

### --refresh Mode

When `--refresh` is passed:
1. Read all `.claude/skills/*.md` files
2. Compare each against current living docs analysis
3. Report which skills may be stale
4. Offer to regenerate stale skills

## Configuration

Controlled via `.specweave/config.json`:

```json
{
  "skillGen": {
    "detection": "on-close",
    "suggest": true,
    "minSignalCount": 3,
    "declinedSuggestions": [],
    "maxSignals": 100
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `detection` | `"on-close"` | When to detect patterns: `"on-close"` or `"off"` |
| `suggest` | `true` | Print suggestions on increment closure |
| `minSignalCount` | `3` | Minimum increments for a pattern to qualify |
| `declinedSuggestions` | `[]` | Pattern IDs permanently excluded from suggestions |
| `maxSignals` | `100` | Maximum signals to retain |

## Error Handling

- **No signals file**: Inform user to run increments with living docs
- **No skill-creator**: Print installation instructions
- **Generation failure**: Catch, log, and offer manual SKILL.md creation as fallback

## When This Skill Activates

This skill activates when the user:
- Says "skill-gen", "generate skills", "create project skills"
- Says "codify patterns", "skill generation", "detected patterns"
- Responds to a suggestion printed during increment closure
- Runs `sw:skill-gen` explicitly

## Resources

- [Official Documentation](https://verified-skill.com/docs/skills/extensible/skill-generation)
