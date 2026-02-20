---
id: claude-code-basics
title: Claude Code Basics
sidebar_label: Claude Code Basics
description: Essential concepts for working with Claude Code - skills, commands, plugins, and agents explained
keywords: [claude code, skills, commands, plugins, agents, slash commands, SKILL.md, subagents]
---

# Claude Code Basics

## Introduction

Claude Code 2.1.3+ unified skills and slash commands into a single system. This guide explains the core concepts you need to know.

---

## Core Concepts

| Concept | What It Is | How to Use |
|---------|------------|------------|
| **Skills** | Reusable instructions in SKILL.md | `/skill-name` or auto-invoke via keywords |
| **Plugins** | Packages with skills, agents, hooks | `claude plugin install sw@specweave` |
| **Agents** | Isolated subagents with own context | Task tool or `context: fork` in skill |

---

## Skills and Commands (Now Unified)

**Since Claude Code 2.1.3, skills and slash commands are the same thing.** Both file formats create the same `/name` command:

- `.claude/commands/review.md` → `/review`
- `.claude/skills/review/SKILL.md` → `/review`

### Skill Locations

```
# Project-level (your repo)
.claude/skills/my-skill/SKILL.md     → /my-skill
.claude/commands/my-cmd.md           → /my-cmd

# Plugin skills (namespaced)
plugins/specweave/skills/pm/SKILL.md → /sw:pm (auto-activates on keywords)
plugins/specweave/commands/do.md     → /sw:do (explicit command)
```

### Invocation Control (Frontmatter)

| Frontmatter | User Invoke? | Claude Invoke? | Use Case |
|-------------|--------------|----------------|----------|
| (default) | Yes | Yes | Most skills |
| `disable-model-invocation: true` | Yes | **No** | Workflows with side effects |
| `user-invocable: false` | **No** | Yes | Background knowledge |

---

## Plugins

Plugins bundle related skills, agents, and hooks into installable packages.

### Installing Plugins

```bash
claude plugin install sw@specweave          # Core SpecWeave
claude plugin install sw-frontend@specweave # Frontend expertise
claude plugin list                          # Show installed
```

### Plugin Structure

```
plugins/specweave/
├── .claude-plugin/
│   └── plugin.json           # Plugin manifest
├── commands/                 # User-invocable workflows
│   ├── do.md                # → /sw:do
│   ├── done.md              # → /sw:done
│   └── status.md            # → /sw:status
├── skills/                   # Auto-activating expertise
│   ├── architect/SKILL.md   # → activates on "architecture"
│   ├── pm/SKILL.md          # → activates on "product", "MVP"
│   └── tech-lead/SKILL.md   # → activates on "code review"
└── agents/                   # Isolated subagents
    └── diagrams/AGENT.md    # Spawned via Task tool
```

---

## Agents (Subagents)

Agents are isolated AI instances with their own context window, system prompt, and tool restrictions.

### Skills vs Agents

| Aspect | Skills | Agents |
|--------|--------|--------|
| **Context** | Same context (or `context: fork`) | Own isolated context |
| **Invocation** | `/skill-name` or auto-keywords | Task tool spawn |
| **Model** | Inherits (or specify `model:`) | Can override model |
| **Tools** | All available | Can restrict tools |

### When to Use What

| Scenario | Use |
|----------|-----|
| Domain expertise (architecture, security) | Skills (auto-activate) |
| Complex isolated tasks | Agents (Task tool) |
| Background knowledge | Skills with `user-invocable: false` |

### Skill with Forked Context

A skill can run as an isolated subagent by adding `context: fork`:

```yaml
---
context: fork
model: opus
---
```

This gives the skill its own context window while still being invocable as `/increment`.

---

## Invoking Skills

Per [official Anthropic documentation](https://code.claude.com/docs/en/skills):

> "Claude uses skills when relevant, or you can invoke one directly with `/skill-name`."

### Two Invocation Mechanisms

1. **Auto-Activation (Primary)**: Skills auto-activate when their description keywords match your request
2. **Explicit Invocation (Fallback)**: Use `/skill-name` or Skill tool when auto-activation doesn't trigger

### Explicit Invocation (User Types Command)

```bash
/sw:do                              # Execute tasks
/sw:increment "auth feature"        # Plan new increment
/sw:status                          # Show status
```

### Auto-Activation (Claude Detects Keywords)

Just describe what you need - Claude loads the relevant skill:

```
"Design the authentication architecture"  # → architect skill
"Help me plan this product feature"       # → PM skill
"Review my code for security issues"      # → security skill
```

### Fallback: Skill Tool (When Auto-Activation Fails)

If a skill didn't auto-activate, Claude can explicitly invoke it:

```typescript
// Skill didn't auto-load? Invoke explicitly:
Skill({ skill: "sw-frontend:frontend-architect", args: "dashboard" })
```

### Via Task Tool (Subagents)

For complex tasks requiring isolated context:

```typescript
// Use valid subagent types: Explore, Plan, general-purpose
Task({
  subagent_type: "Explore",
  prompt: "Analyze the frontend codebase structure and patterns",
  description: "Frontend codebase exploration"
})
```

**Note**: Task tool accepts these subagent types: `Explore`, `Plan`, `general-purpose`. For skills, use the Skill tool instead.

---

## Creating Your Own Skills

### Basic Skill

Create `.claude/skills/my-skill/SKILL.md`:

```markdown
---
name: my-skill
description: Does something useful. Activates for: keyword1, keyword2
---

# My Skill

Instructions for what this skill does...
```

### Skill with Model Override

```yaml
---
name: deep-analysis
description: Deep code analysis
model: opus
context: fork
allowed-tools: Read, Grep, Glob
---
```

### Command (Explicit Only)

Create `.claude/commands/deploy.md`:

```markdown
---
name: deploy
description: Deploy to production
disable-model-invocation: true
---

# Deploy Command

Only runs when user types /deploy explicitly.
```

---

## Summary

1. **Skills = Commands** (since 2.1.3) - same system, different activation
2. **Plugins** bundle skills, agents, and hooks
3. **Agents** are isolated subagents with own context
4. **`context: fork`** makes a skill run as a subagent
5. Use frontmatter to control who can invoke (`disable-model-invocation`, `user-invocable`)
