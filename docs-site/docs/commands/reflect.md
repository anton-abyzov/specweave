---
sidebar_position: 13
---

import CommandTabs from '@site/src/components/CommandTabs';

# Reflect

**`sw:reflect`** — analyze the current session and extract learnings to the `## Skill Memories` section of `CLAUDE.md`. Also exposes a dashboard of skill-refinement suggestions and a session-end nudge (added in increment 0671).

## Usage

<CommandTabs
  natural='Extract learnings from this session'
  claude='sw:reflect'
  other='reflect'
/>

Subcommands:

```bash
sw:reflect                    # Manual reflection — scan session signals and persist learnings
sw:reflect "Focus on the API patterns we discussed"

sw:reflect --on               # Enable auto-reflection via the stop hook
sw:reflect --off              # Disable auto-reflection
sw:reflect --status           # Show config, learning stats, and refinement suggestions
sw:reflect --clear --skill frontend
sw:reflect --clear --all
```

---

## `--status` dashboard

`sw:reflect --status` prints the current reflection configuration, a summary of saved Skill Memories, recent learnings, and a **Skill Refinement Suggestions** section (new in 0671):

```
REFLECT: Status Dashboard

CONFIGURATION
  Reflection:      Enabled
  Auto-nudge:      Enabled
  Model:           haiku
  Max/session:     3

SKILL MEMORIES (CLAUDE.md)
  Skill           Learnings
  devops          1
  frontend        2
  backend         3
  general         2
  Total:          8

## Skill Refinement Suggestions
  Skill            Signals (J/R/C)   Severity   Last seen         Command
  sw:architect     5 (3/1/1)         high       2026-04-19 18:22  sw:skill-refine sw:architect
  sw:pm            3 (2/1/0)         medium     2026-04-18 09:07  sw:skill-refine sw:pm
```

### Skill Refinement Suggestions

- Skills with ≥3 `type: "refinement"` signals in `.specweave/state/skill-signals.json` appear in this section.
- Ranking is severity × recency. Severity weights: `high=3`, `medium=2`, `low=1`.
- Signal sources (J/R/C) are `judge-llm` / `rubric` / `code-reviewer`.
- The entire section is **omitted** when no skills meet the ≥3 threshold.
- The `Command` column is copy-pasteable — see [`sw:skill-refine`](./skill-refine.md) for full flag and attribution docs.

---

## Session-end Nudge

Added in increment 0671. When `/sw:done` closes an increment, the reflect stop-hook checks whether the session accumulated either:

- ≥1 high-confidence learning (eligible for `CLAUDE.md` persistence), or
- ≥1 refinement signal attributed to an existing skill.

If so, a one-line prompt is printed at closure:

```
Detected: 2 signals for sw:architect — run sw:skill-refine sw:architect? (y/N)
```

or, for a learning:

```
Detected: 1 high-confidence learning — run sw:reflect? (y/N)
```

**The nudge never auto-executes a command.** The user must run the suggested command explicitly. Declining (`N` or timeout within 5s) is free — the underlying signals remain in `skill-signals.json` for later.

### Disable

```json
// .specweave/config.json
{
  "reflect": {
    "enabled": true,
    "autoNudge": false
  }
}
```

The close-time check adds under 100ms to `/sw:done`.

---

## Configuration

```json
{
  "reflect": {
    "enabled": true,
    "autoNudge": true,
    "model": "haiku",
    "maxLearningsPerSession": 3
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Master switch for reflection |
| `autoNudge` | `true` | Session-end nudge when learnings or refinement signals are detected (0671) |
| `model` | `"haiku"` | LLM model for extraction |
| `maxLearningsPerSession` | `3` | Max learnings persisted per session |

---

## See also

- [`sw:skill-refine`](./skill-refine.md) — the command the nudge and `--status` dashboard point users toward.
- The full reflect behavior (signal detection rules, quality checklist, what to reject) is documented in `plugins/specweave/commands/reflect.md`.
