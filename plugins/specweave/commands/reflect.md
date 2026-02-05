---
description: Analyze session and extract learnings to CLAUDE.md Skill Memories. Supports subcommands --on, --off, --status, --clear. Activates for reflect, remember, learn from session, extract learnings.
argument-hint: [--on | --off | --status | --clear [--skill name | --all]]
---

# Reflect Command

**Analyze session and extract learnings to CLAUDE.md Skill Memories section.**

## Usage

```bash
# Manual reflection (analyzes session signals)
/sw:reflect
/sw:reflect "Focus on the API patterns we discussed"

# Enable auto-reflection on session end
/sw:reflect --on

# Disable auto-reflection
/sw:reflect --off

# Show reflection config and learning statistics
/sw:reflect --status

# Clear learnings
/sw:reflect --clear --skill frontend
/sw:reflect --clear --all
```

## Subcommands

### Default (no flags) - Manual Reflection

Scans conversation for learnable signals and extracts to CLAUDE.md.

**Signal Detection:**

**Corrections (High Confidence)**
```
User: "No, don't use that button. Use our <Button variant='primary'>"
      → Learning: Always use Button component with variant='primary' from design system
      → Skill: frontend
```

**Problem Reports (High Confidence)**
```
User: "Voice control doesn't recognize commands"
      → Learning: Voice dictation mangles slash commands - type manually or paste
      → Skill: general
```

**Approvals (Medium Confidence)**
```
User: "Perfect! That's exactly how our API should look."
      → Learning: Continue using API pattern with status, data, error fields
      → Skill: backend
```

**LLM Extraction** uses Claude Haiku to extract SpecWeave-specific learnings, then writes to the `## Skill Memories` section in CLAUDE.md.

### `--on` - Enable Auto-Reflection

Enables automatic session analysis via the stop hook.

**Execution:**
1. Read existing config from `.specweave/config.json`
2. Update config to set `reflect.enabled: true`
3. Display confirmation

**Output:**
```
Auto-reflection ENABLED

Stop hook will analyze sessions on exit.
Learnings saved to CLAUDE.md Skill Memories section.

Disable with: /sw:reflect --off
```

### `--off` - Disable Auto-Reflection

Disables automatic session analysis. Manual `/sw:reflect` still works.

**CRITICAL: This is a SIMPLE operation. NO Glob, NO parallel tool calls needed.**

**Execution:**
1. Read existing config from `.specweave/state/reflect-config.json`
   (If file doesn't exist, create with autoReflect: false)
2. Write updated config: set `autoReflect` to `false`, preserve other fields
3. Display confirmation

**Output:**
```
Auto-reflection DISABLED

Manual /sw:reflect still works.
Existing learnings preserved.

Re-enable with: /sw:reflect --on
```

**WARNING**: Do NOT use Glob to scan directories - this operation only writes ONE file.

### `--status` - Show Config & Statistics

Shows reflection configuration and learning statistics.

**Execution:**
1. Read config from `.specweave/config.json` for reflect settings
2. Read CLAUDE.md to find Skill Memories section
3. Parse learnings by skill category
4. Display dashboard

**Output:**
```
REFLECT: Status Dashboard

CONFIGURATION
  Reflection:      Enabled
  Model:           haiku
  Max/session:     3

SKILL MEMORIES (CLAUDE.md)
  Skill           Learnings
  devops          1
  frontend        2
  backend         3
  general         2
  Total:          8

RECENT LEARNINGS
  - [devops] LSP requires ENABLE_LSP_TOOL=1 env var
  - [frontend] Use shadcn/ui Button component
  - [backend] Return 404 for missing resources
```

### `--clear` - Remove Learnings

Remove specific learnings from CLAUDE.md Skill Memories section.

```bash
/sw:reflect --clear --skill frontend   # Clear all learnings for skill
/sw:reflect --clear --all              # Clear ALL learnings (requires confirmation)
```

**Execution:**
1. Read CLAUDE.md to find Skill Memories section
2. Show confirmation with what will be deleted
3. Edit CLAUDE.md to remove matching learnings on confirmation

## Configuration

In `.specweave/config.json`:

```json
{
  "reflect": {
    "enabled": true,
    "model": "haiku",
    "maxLearningsPerSession": 3
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Master switch for reflection |
| `model` | `"haiku"` | LLM model for extraction |
| `maxLearningsPerSession` | `3` | Limit per session |

## Skill Categories

Learnings are routed to these skills:

| Skill | What it covers |
|-------|---------------|
| `mobile` | React Native, Expo, iOS, Android |
| `frontend` | React, Vue, Next.js, UI components |
| `backend` | APIs, Node.js, .NET, databases |
| `testing` | Vitest, Jest, Playwright, E2E |
| `devops` | CI/CD, Docker, deployments |
| `architect` | System design, ADRs, patterns |
| `general` | Fallback for general SpecWeave learnings |

## Quality Rules

**NEVER store user input verbatim. ALWAYS synthesize into actionable rules.**

### Learning Quality Checklist

Before storing ANY learning:

| Check | Requirement | Example Failure |
|-------|-------------|-----------------|
| Complete | Full sentence, not truncated | `"eplicilty how to g"` |
| Actionable | Contains DO/DON'T/USE/AVOID | `"Where should I deploy?"` |
| Specific | Names tools, patterns, concepts | `"always command not recognized"` |
| Standalone | Understandable without context | `"user pojrect"` |
| Not a Question | Must be a statement | `"Where should I deploy?"` |

### What to REJECT (Never Store)

1. **Questions** - Not learnings
2. **Fragments** - Truncated mid-sentence
3. **Raw complaints** - Without solution/workaround
4. **Gibberish/typos** - `"pojrect"`, `"promp"`
5. **Duplicates** - Already exists in memory

### Self-Check Before Storing

> "If I read this learning in 6 months with no context, would it help me?"
>
> If NO → Don't store it.
> If MAYBE → Improve it until YES.
> If YES → Store it.
