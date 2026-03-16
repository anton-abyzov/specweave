---
title: Project-Specific Skill Generation
sidebar_label: Skill Generation
description: Auto-detect recurring patterns from living docs and generate project-local skills on demand
---

# Project-Specific Skill Generation

SpecWeave can detect recurring patterns in your codebase across increment closures and help you codify them into project-local skills. This creates a feedback loop where your project conventions become permanent AI coding instructions.

## How It Works

The skill generation system has three layers:

### 1. Signal Detection (Passive)

Every time an increment closes, SpecWeave's signal collector reads your living docs analysis output and looks for recurring patterns:

- **Error handling** conventions (try/catch patterns, error boundaries)
- **API patterns** (validation, endpoint structure)
- **Architecture patterns** (module organization, dependency injection)
- **Testing patterns** (mock patterns, test organization)
- **Data model** conventions (ORM patterns, migration workflows)
- And more...

Detected patterns are stored as "signals" in `.specweave/state/skill-signals.json`. Each signal tracks which increments it was observed in and builds confidence over time.

### 2. Suggestions (Non-Intrusive)

When a pattern has been observed across 3 or more independent increments (configurable), SpecWeave prints a brief suggestion during increment closure:

```
💡 Skill suggestion: Detected "error-handling-pattern" pattern across 4 increments.
   Run /sw:skill-gen to generate project skills.
```

Suggestions are:
- **Max 1 per closure** — never a wall of suggestions
- **Confidence-gated** — only the highest-confidence qualifying pattern is suggested
- **Declinable** — declined patterns won't be suggested again
- **Configurable** — can be disabled entirely

### 3. Generation (On-Demand)

Run `/sw:skill-gen` to see all qualifying patterns and generate a project-local skill from a selected pattern. The skill is built using Anthropic's official skill-creator, which includes:

- SKILL.md generation with proper frontmatter
- Eval test cases for quality validation
- With-skill vs without-skill benchmarks
- Description optimization for accurate triggering

Generated skills are placed in `.claude/skills/` (project-local), meaning they only affect the current project.

## Signal Schema

Each signal entry contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (e.g., `sig-error-handling`) |
| `pattern` | string | Human-readable name |
| `category` | string | Category slug for deduplication |
| `description` | string | What the pattern is about |
| `incrementIds` | string[] | Increments where observed |
| `confidence` | number | 0.0 to 1.0 score |
| `evidence` | string[] | File paths as evidence |
| `suggested` | boolean | Has been shown as suggestion |
| `declined` | boolean | User declined this suggestion |
| `generated` | boolean | Skill was generated from this |

## Configuration

Add to `.specweave/config.json`:

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

| Option | Default | Description |
|--------|---------|-------------|
| `detection` | `"on-close"` | `"on-close"` to detect on every closure, `"off"` to disable |
| `suggest` | `true` | Print suggestions when patterns qualify |
| `minSignalCount` | `3` | Minimum increments before a pattern qualifies |
| `declinedSuggestions` | `[]` | Pattern IDs permanently excluded from suggestions |
| `maxSignals` | `100` | Maximum signals to retain (prunes lowest-confidence) |

All fields are optional — defaults apply when `skillGen` is absent from config.

## Drift Detection

When living docs sync runs, SpecWeave checks existing project-local skills (`.claude/skills/*.md`) against current analysis output. If a skill references modules or APIs that no longer exist, a warning is printed:

```
[DriftDetector] Possible stale references in my-skill.md: OldModule.
These modules no longer appear in living docs.
```

Drift detection is:
- **Warn-only** — never blocks sync
- **Error-isolated** — failures don't affect living docs
- **Automatic** — runs on every successful sync

## Usage

```bash
# See detected patterns and generate skills
/sw:skill-gen

# Check existing skills for drift
/sw:skill-gen --refresh
```

## The Progression

The system follows a natural escalation path:

1. **Correction** — You correct Claude once ("use React Hook Form, not useState")
2. **Memory** — Reflect captures it into `skill-memories/`
3. **Signal** — Pattern detected across multiple increments
4. **Suggestion** — SpecWeave suggests codifying it
5. **Skill** — You generate a permanent project-local skill

Each step requires more confidence, ensuring only truly recurring patterns become skills.
