# Skills and Subagents: SpecWeave's Architecture

> Based on official Claude Code documentation: https://code.claude.com/docs/en/skills and https://code.claude.com/docs/en/sub-agents

## TL;DR

**SpecWeave uses both Skills AND Custom Subagents — each for what it's best at.**

- **Skills** = reusable instructions (reference knowledge, standalone tasks, user-invocable `/commands`)
- **Custom Subagents** = persistent, isolated workers that preload skills (memory, resumability, background execution)
- **The pattern**: Subagents preload skills via the `skills:` field — subagent owns isolation + memory, skill owns domain logic

## When to Use What

| Use Case | Mechanism | Why |
|----------|-----------|-----|
| **Orchestrated agent** (PM, Architect, Planner) | Custom subagent + preloaded skill | Memory, resumability, auto-compaction, guaranteed skill injection |
| **Standalone heavy task** (grill, brainstorm) | Skill with `context: fork` | Self-contained, user-invocable, no memory needed |
| **Reference knowledge** (api-conventions, style guide) | Skill, NO `context: fork` | Must run inline to enrich main conversation |
| **Quick research** | Built-in subagent (Explore, Plan, general-purpose) | Read-only, disposable, no custom setup |

### Decision Flowchart

```
Does the agent need persistent memory or resumability?
  YES → Custom subagent (with skills: preloading)
  NO  →
    Is it a standalone task producing output?
      YES → Skill with context: fork
      NO  →
        Is it reference/knowledge for the main conversation?
          YES → Skill, NO context: fork (runs inline)
          NO  → Built-in subagent (Explore/Plan/general-purpose)
```

## The Core Pattern: Subagents Preloading Skills

This is the recommended architecture for SpecWeave's orchestrated agents:

```
plugins/specweave/
├── agents/
│   ├── sw-pm.md            # Subagent definition (model, memory, skills)
│   ├── sw-architect.md     # Each preloads its corresponding skill
│   └── sw-planner.md
├── skills/
│   ├── pm/
│   │   ├── SKILL.md        # Domain logic, phases, templates
│   │   ├── phases/         # Supporting files loaded on demand
│   │   └── templates/
│   ├── architect/
│   │   └── SKILL.md
│   └── test-aware-planner/
│       └── SKILL.md
```

### How It Works

**Subagent file** (`agents/sw-pm.md`):
```yaml
---
name: sw-pm
description: Product Manager for writing spec.md...
model: opus
memory: project
skills:
  - sw:pm              # Preloads the PM skill content at startup
---

You are a Product Manager specializing in spec-driven development.
```

**Skill file** (`skills/pm/SKILL.md`):
```yaml
---
description: Product Manager for spec-driven development...
# NO context: fork — the subagent provides isolation
# NO model — the subagent controls the model
---

# Product Manager Skill
...full domain logic, phases, templates...
```

**Why this works**:
- The **subagent** owns: isolation, memory, model, resumability, background execution
- The **skill** owns: domain logic, supporting files (phases, templates), user-invocable `/sw:pm`
- The `skills:` field **guarantees** skill content is injected at startup (no discovery step needed)
- Users can still run `/sw:pm` directly for ad-hoc spec work outside increment flow

### Invocation from the Increment Orchestrator

```typescript
// The increment skill spawns subagents (NOT skills):
Agent({ subagent_type: "sw:sw-pm", prompt: "Write spec for increment XXXX-name: ..." })
Agent({ subagent_type: "sw:sw-architect", prompt: "Design architecture for increment XXXX-name..." })
Agent({ subagent_type: "sw:sw-planner", prompt: "Generate tasks for increment XXXX-name..." })
```

## Feature Comparison

| Feature | Skill (`context: fork`) | Custom Subagent |
|---------|------------------------|-----------------|
| **Isolated context** | Yes | Yes |
| **Auto-activation by keywords** | Yes | No (must be explicitly spawned) |
| **User-invocable** (`/name`) | Yes | No (only via Agent tool) |
| **Persistent memory** | No | Yes (`memory: project/user/local`) |
| **Resumable** (by agent ID) | No | Yes |
| **Background execution** | No (blocks caller) | Yes (`run_in_background: true` or Ctrl+B) |
| **Auto-compaction** | No | Yes (at ~95% capacity) |
| **Permission mode override** | No | Yes (`permissionMode:`) |
| **Skills preloading** | No | Yes (`skills:` field) |
| **Hooks** | Yes | Yes |
| **Custom model** | Yes (`model:`) | Yes (`model:`) |
| **Distributed via plugins** | `plugins/X/skills/` | `plugins/X/agents/` |
| **Supporting files** | Yes (phases/, templates/) | No (but preloaded skills can have them) |

## When NOT to Use `context: fork`

A skill should **not** have `context: fork` when:

1. **A subagent preloads it** — the subagent already provides isolation. Adding `context: fork` would double-fork (skill forks inside already-forked subagent = wasted tokens)
2. **It provides reference knowledge** — conventions, patterns, style guides that Claude needs in the main conversation context
3. **It needs conversation history** — `context: fork` creates a fresh context; the skill won't see prior messages

**DO use `context: fork`** when:
- The skill is a **standalone task** producing output (grill, brainstorm, code-simplifier)
- No custom subagent wraps it
- You want isolation without creating a full subagent definition

## Built-in Subagents for Research

For explicit research/exploration, use Claude Code's built-in subagents:

| Subagent | Model | Tools | Use Case |
|----------|-------|-------|----------|
| **Explore** | Haiku | Read-only | Fast codebase search, file discovery |
| **Plan** | Inherited | Read-only | Architecture planning, design research |
| **general-purpose** | Inherited | All | Complex multi-step research + modification |

```typescript
Agent({ subagent_type: "Explore", prompt: "Find all API endpoints", description: "API exploration" })
Agent({ subagent_type: "general-purpose", prompt: "Research Stripe integration patterns", description: "Stripe research" })
```

## SpecWeave Agent Catalog

### Core Orchestration Agents (Subagent + Skill)

| Agent | Subagent | Preloads Skill | Writes | Model |
|-------|----------|---------------|--------|-------|
| **PM** | `sw-pm` | `sw:pm` | spec.md | Opus |
| **Architect** | `sw-architect` | `sw:architect` | plan.md | Opus |
| **Planner** | `sw-planner` | `sw:test-aware-planner` | tasks.md | Sonnet |

### Standalone Skills (context: fork)

| Skill | Purpose | Why not a subagent? |
|-------|---------|-------------------|
| `sw:grill` | Code review before ship | No memory needed, one-shot |
| `sw:brainstorm` | Multi-perspective ideation | Spawns parallel lenses, disposable |
| `sw:judge-llm` | Deep validation | One-shot evaluation |

### Reference Skills (inline, no fork)

| Skill | Purpose |
|-------|---------|
| `api-conventions` | API design patterns |
| `error-handling-patterns` | Error handling standards |

## FAQ

### Q: When should I create a custom subagent vs a skill with `context: fork`?
**A:** If the agent needs **persistent memory**, **resumability**, or **background execution** — make it a custom subagent. If it's a **one-shot task** or **user-invocable command** — make it a skill with `context: fork`. If it's **reference knowledge** — skill without fork.

### Q: Can a skill work both standalone AND preloaded by a subagent?
**A:** Yes. Remove `context: fork` from the skill. Users invoke it directly via `/sw:pm` (runs inline). The subagent preloads it via `skills: [sw:pm]` (runs in subagent's isolated context). Same logic, two execution modes.

### Q: What happens if the skills: preloading fails?
**A:** The subagent still runs — it just won't have the skill content injected. The subagent's own markdown body (system prompt) is always available. To guard against this, keep critical instructions in the subagent body and use skills for detailed/phase logic.

### Q: Can subagents spawn other subagents?
**A:** No. Subagents cannot nest. If you need chained delegation, the **main conversation** (or orchestrator skill) spawns each subagent sequentially.

### Q: Why did custom agents fail before?
**A:** SpecWeave originally used subfolder structure (`agents/<name>/AGENT.md`). Claude Code expected flat files (`agents/<name>.md`). This was fixed — flat `.md` files in `agents/` now work correctly.

## Official Documentation

- **Skills**: https://code.claude.com/docs/en/skills
- **Subagents**: https://code.claude.com/docs/en/sub-agents
- **Agent Teams**: https://code.claude.com/docs/en/agent-teams
- **Plugins**: https://code.claude.com/docs/en/plugins

## Summary

1. **Subagents + Skills together** — subagent owns isolation/memory, skill owns domain logic
2. **`context: fork`** for standalone tasks only (grill, brainstorm, judge)
3. **No `context: fork`** on skills preloaded by subagents (avoids double-fork)
4. **No `context: fork`** on reference/knowledge skills (need inline context)
5. **Built-in subagents** (Explore, Plan, general-purpose) for ad-hoc research
6. **Agent()** to invoke custom subagents, **Skill()** for standalone skills
