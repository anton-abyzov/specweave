---
title: Project-Specific Skill Generation
sidebar_label: Skill Generation
description: Auto-detect recurring patterns from living docs using LLM analysis and generate project-local skills on demand
---

import CommandTabs from '@site/src/components/CommandTabs';

# Project-Specific Skill Generation

SpecWeave automatically detects recurring patterns in your project and helps you generate permanent AI skills from them. The system uses LLM-based analysis -- not hardcoded keyword matching -- so it discovers patterns specific to your stack, whether that's Express middleware, PyTorch training loops, or Go microservices.

**Three-layer system:**

1. **Detection** (passive, LLM-based) -- runs on every increment closure
2. **Suggestion** (non-intrusive) -- at most one suggestion per closure
3. **Generation** (on-demand) -- you choose when to codify a pattern via skill-creator

**Progression path:**

```
correction → skill-memory → signal → suggestion → skill
```

Each step requires more confidence, ensuring only truly recurring patterns become permanent skills.

## How It Works

### LLM-Based Detection

On every increment closure, the `SignalCollector` reads all living docs from `.specweave/docs/internal/`, batches them into a structured prompt (up to ~50K tokens), and sends them to the configured LLM (Haiku-class model). The LLM returns an array of detected patterns, each with:

- **category** -- a kebab-case slug discovered by the LLM (e.g., `zod-api-validation`, `data-pipeline-orchestration`)
- **name** -- short human-readable identifier
- **description** -- 1-2 sentences explaining the pattern and why it matters
- **evidence** -- quotes or references from the living docs (max 5 per pattern)

When total living docs exceed the ~50K token budget, they are automatically chunked into separate LLM calls and results are merged with deduplication.

### Dynamic Categories

Categories are not limited to a predefined list. The LLM discovers project-specific categories from your actual documentation. This means skill-gen works equally well for:

- TypeScript web apps (React patterns, Express middleware, Zod validation)
- Python ML projects (data pipelines, model training, experiment tracking)
- Go microservices (gRPC patterns, middleware chains, error propagation)
- Rust systems (error handling, async patterns, unsafe boundaries)
- Any other stack your living docs describe

### File-Based Confidence

Confidence reflects how many **distinct source files** mention a pattern, not how many times the same file was re-scanned across increment closures. The formula:

```
confidence = min(1.0, uniqueSourceFiles.length / minSignalCount)
```

A pattern detected in 3 different source files with `minSignalCount: 3` reaches confidence `1.0`. The same pattern detected in 1 file across 5 closures stays at confidence `0.33`.

### Deduplication

Before suggesting a new pattern, skill-gen checks your existing rules:

- `.claude/skills/**/*.md` (existing project skills)
- `CLAUDE.md` (project instructions)
- `.cursorrules` and `.cursor/rules/*.mdc` (Cursor rules)
- `.github/copilot-instructions.md` (Copilot instructions)

Existing rule content is included in the LLM prompt as context with instructions not to duplicate already-documented patterns. Rule content is capped at ~10K tokens to avoid overwhelming pattern detection.

Additionally, when generating a skill, the system checks if a skill with the same slug already exists at `.claude/skills/{slug}/SKILL.md` and skips generation if so.

## Quick Start

```bash
# 1. Initialize SpecWeave (auto-installs skill-creator)
specweave init

# 2. For existing projects -- seed signals immediately
/sw:skill-gen --seed

# 3. Or just use SpecWeave normally -- signals build over time
```

<CommandTabs
  natural="We're done with increment 0001"
  claude="/sw:done 0001"
  other="done 0001"
/>

```bash
# Signals detected on closure

# 4. When a pattern qualifies, you'll see:
# 💡 Skill suggestion: Detected "zod-validation" pattern across 4 sources.

# 5. Generate the skill
/sw:skill-gen
```

## Prerequisites

### Living Docs

Living docs must be enabled and populated. They are generated automatically during increment work and stored in `.specweave/docs/internal/`. Without living docs, there is nothing for the LLM to analyze.

### LLM Configuration

An LLM provider must be configured in `.specweave/config.json`. The signal collector uses the `analyzeStructured` abstraction, which supports any configured provider. A Haiku-class model is recommended for cost efficiency.

### Skill-Creator

Anthropic's official [skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) is required for the generation step (Step 5 of the pipeline). It is **auto-installed** during `specweave init` and `specweave update-instructions` into `.claude/skills/skill-creator/`.

If auto-install fails (network error, `claude` CLI not available), a warning is logged but init continues. You can install manually:

```bash
claude install-skill https://github.com/anthropics/skills/tree/main/skills/skill-creator
```

Lookup order: local `.claude/skills/skill-creator/SKILL.md` first, then global `~/.claude/plugins/cache/claude-plugins-official/skill-creator/*/SKILL.md`.

## Walkthrough Example

**Scenario:** Express + React + Zod SaaS project

### Week 1 -- Bootstrap

Developer runs `specweave init` on an existing project, then starts building features. Living docs are generated automatically as increments close.

Or, to skip the cold start, run seed mode:

```
/sw:skill-gen --seed
```

Output:

```
Scanning 12 living docs files...
LLM detected 3 patterns:

  1. zod-api-validation (confidence: 0.8)
     "All API endpoints validate request bodies using Zod schemas
      defined in src/schemas/ before processing"

  2. react-query-hooks (confidence: 0.6)
     "React Query with custom hooks in src/hooks/use*.ts for all
      server state, never raw fetch in components"

  3. error-middleware (confidence: 0.4)
     "Centralized Express error middleware catches all thrown errors
      and returns structured JSON responses"
```

### Week 2 -- Signal Matures

After a few more increments, `zod-api-validation` appears in 4 distinct source files. On the next closure:

```
💡 Skill suggestion: Detected "zod-api-validation" pattern across 4 sources.
   Run /sw:skill-gen to generate project skills.
```

### Week 3 -- Generate the Skill

The developer runs `/sw:skill-gen`, selects `zod-api-validation`, and skill-creator generates:

- `.claude/skills/zod-api-validation/SKILL.md` -- triggering description, full instructions
- `evals/evals.json` -- test cases for quality validation
- With-skill vs without-skill benchmark comparison
- Description optimization for accurate triggering

From this point forward, Claude Code automatically applies the Zod validation pattern when working on API endpoints in this project.

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
| `detection` | `"on-close"` | When to detect patterns: `"on-close"` runs on every increment closure, `"off"` disables detection |
| `suggest` | `true` | Print a suggestion when a pattern qualifies during closure |
| `minSignalCount` | `3` | Minimum distinct source files before a pattern qualifies for suggestion |
| `suggest` | `true` | Print suggestions when patterns qualify |
| `declinedSuggestions` | `[]` | Pattern IDs permanently excluded from future suggestions |
| `maxSignals` | `100` | Maximum signals retained in the store (lowest-confidence pruned first) |

All fields are optional. Defaults apply when `skillGen` is absent from config.

## Instant Seed Mode (`--seed`)

Seed mode solves the cold start problem. Instead of waiting for 3+ increment closures to build signals organically, it scans **all** existing living docs in a single LLM call and creates signals immediately.

```bash
/sw:skill-gen --seed
```

Behavior:

- Reads all markdown files from `.specweave/docs/internal/`
- Sends them to the LLM in one batched call (chunked if over token budget)
- Creates new `SignalEntry` records with confidence based on source file count
- **Deduplicates** against existing signals -- won't create duplicates of patterns already in the store
- Sets `incrementIds: []` since seed signals are not associated with any specific increment

**Best for:** existing projects adopting SpecWeave that already have living docs from prior increment work.

## Drift Detection

The `DriftDetector` checks project-local skills (`.claude/skills/*.md`) for stale module references by comparing PascalCase identifiers in skill files against current living docs content.

Returns structured `DriftResult[]`:

```typescript
interface DriftResult {
  skillFile: string;   // The skill file checked
  staleRefs: string[]; // Module names no longer in living docs
  validRefs: string[]; // Module names still present
}
```

Characteristics:

- **Structured output** -- returns data, does not print warnings directly (caller controls output)
- **False-positive reduction** -- 31 common PascalCase words excluded (TypeScript, JavaScript, SpecWeave, ReactComponent, GraphQL, PostgreSQL, etc.)
- **Error-isolated** -- never throws, never blocks living docs sync
- **Automatic** -- runs during living docs sync

Run manually with:

```bash
/sw:skill-gen --refresh
```

## Skill-Creator Integration

The generation step delegates to Anthropic's official [skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator), which handles:

1. **SKILL.md generation** -- proper frontmatter, triggering description, and full instructions
2. **Eval test cases** -- `evals/evals.json` with quality validation scenarios
3. **Benchmarks** -- with-skill vs without-skill comparison to prove the skill improves output
4. **Description optimization** -- iterates on the triggering description for accurate activation

Auto-installed during `specweave init`. The installer:

- Checks if `.claude/skills/skill-creator/SKILL.md` exists (skip if present)
- Runs `claude install-skill <url>` with a 30-second timeout
- Non-blocking: install failure logs a warning but never prevents init from completing
- Works on macOS, Linux, and Windows (where Claude Code CLI is available)

## Connection to Skill-Memories

Skill-memories and skill-gen signals are complementary, not competing:

| | Skill-Memories | Skill-Gen Signals |
|---|---|---|
| **What** | Quick corrections, plain text notes | Patterns detected across increments |
| **Scope** | Per-session | Cross-increment |
| **Output** | Text in `skill-memories/` | Full `SKILL.md` with evals and benchmarks |
| **Trigger** | User correction | Automatic on closure |
| **Persistence** | Loaded into conversation context | Stored in `skill-signals.json` |

They work together: a correction captured as a skill-memory may later be detected as a recurring pattern by skill-gen, which then suggests promoting it to a full skill.

## Signal Store Schema

Signals are persisted in `.specweave/state/skill-signals.json`:

```json
{
  "version": "1.0",
  "signals": [
    {
      "id": "sig-zod-api-validation-zod-validation",
      "pattern": "zod-validation",
      "category": "zod-api-validation",
      "description": "All API endpoints validate request bodies using Zod schemas",
      "incrementIds": ["0012", "0015", "0018"],
      "firstSeen": "2026-01-15T10:00:00.000Z",
      "lastSeen": "2026-02-20T14:30:00.000Z",
      "confidence": 1.0,
      "evidence": [
        "src/routes/users.ts uses zodSchema.parse(req.body)",
        "src/routes/orders.ts validates with UserCreateSchema"
      ],
      "uniqueSourceFiles": [
        ".specweave/docs/internal/specs/api-routes.md",
        ".specweave/docs/internal/specs/validation.md",
        ".specweave/docs/internal/specs/schemas.md"
      ],
      "suggested": true,
      "declined": false,
      "generated": false
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier: `sig-{category}-{pattern}` |
| `pattern` | string | Short human-readable name |
| `category` | string | Kebab-case category slug (LLM-discovered) |
| `description` | string | What the pattern is and why it matters (max 200 chars) |
| `incrementIds` | string[] | Increments where this pattern was observed |
| `firstSeen` | string | ISO timestamp of first detection |
| `lastSeen` | string | ISO timestamp of most recent detection |
| `confidence` | number | 0.0 to 1.0, based on `uniqueSourceFiles.length / minSignalCount` |
| `evidence` | string[] | Supporting quotes/references (max 20, FIFO eviction) |
| `uniqueSourceFiles` | string[] | Distinct source file paths where detected |
| `suggested` | boolean | Has been shown as a suggestion to the user |
| `declined` | boolean | User declined this suggestion |
| `generated` | boolean | A skill was generated from this signal |

The store is validated with Zod on load. Corrupted files are backed up and replaced with an empty store.

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| No patterns detected | Living docs directory is empty | Run a few increments with living docs enabled, or check `.specweave/docs/internal/` |
| No patterns detected | LLM not configured | Add LLM provider config to `.specweave/config.json` |
| "No LLM config found" warning | Missing provider configuration | Configure an LLM provider -- see [LLM setup docs](../../guides/llm-configuration) |
| Suggestion never appears | Patterns haven't reached `minSignalCount` threshold | Lower `minSignalCount` in config or run `/sw:skill-gen --seed` to bootstrap |
| Duplicate suggestion | Existing rules not detected | Ensure rule files (CLAUDE.md, .cursorrules) exist at project root |
| Skill-creator not found | Auto-install failed or `claude` CLI missing | Run `claude install-skill https://github.com/anthropics/skills/tree/main/skills/skill-creator` manually |
| Stale skill warnings | Project evolved since skill was generated | Run `/sw:skill-gen --refresh` to check drift, regenerate if needed |
| Signal store corrupted | Manual edit or disk error | Delete `.specweave/state/skill-signals.json` -- it will be recreated on next closure |

## Usage

```bash
# See detected patterns and generate skills
/sw:skill-gen

# Bootstrap signals from existing living docs (cold start shortcut)
/sw:skill-gen --seed

# Check existing skills for drift against current living docs
/sw:skill-gen --refresh
```
