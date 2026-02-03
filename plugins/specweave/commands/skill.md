---
name: skill
description: Create Claude Code skills with proper YAML frontmatter, validation, and best practices
argument-hint: [--name skill-name] [--type auto|command|knowledge]
---

# Skill Creator

Create Claude Code skills with proper YAML frontmatter, validation, and best practices.

**Quick skill scaffolding** - from concept to working skill in under 2 minutes.

## Interactive Questionnaire

Use **AskUserQuestion** to gather information:

### Question 1: Skill Name
```
What should we name this skill?
- Use lowercase letters, numbers, and hyphens only
- Max 64 characters
- Examples: python-expert, react-hooks, kubernetes-helper
```

**Validation**:
- Must match: `^[a-z0-9][a-z0-9-]*[a-z0-9]$` (or single char `^[a-z0-9]$`)
- No consecutive hyphens
- Cannot start/end with hyphen
- Max 64 characters

### Question 2: Skill Type

```
What type of skill?

○ Auto-activating (Recommended)
  → Claude loads it when keywords match user's request
  → Best for: domain expertise, best practices, knowledge

○ Command skill
  → User must invoke with /skill-name explicitly
  → Best for: workflows with side effects (deploy, commit, send)

○ Knowledge skill
  → Only Claude can activate, user cannot invoke directly
  → Best for: background context, internal APIs, legacy systems
```

**Frontmatter mapping**:
| Type | Frontmatter |
|------|-------------|
| Auto-activating | (default, no extra fields) |
| Command | `disable-model-invocation: true` |
| Knowledge | `user-invocable: false` |

### Question 3: Description

```
Describe what this skill does AND when to use it.
Include trigger keywords users might say.

Example:
"React hooks expert. Explains useState, useEffect, custom hooks.
Activates for: React hooks, useState, useEffect, custom hook, React state"
```

**Requirements**:
- Max 1024 characters
- MUST include "Activates for:" with keywords
- Front-load the purpose

### Question 4: Location

```
Where should this skill live?

○ Project (.claude/skills/) (Recommended)
  → Only in this project
  → Shared with team via git

○ Personal (~/.claude/skills/)
  → Available in ALL your projects
  → Private to you
```

### Question 5 (Optional): Tool Restrictions

```
Should this skill have restricted tool access?

○ Full access (default)
  → Can use all tools

○ Read-only
  → allowed-tools: Read, Grep, Glob, WebSearch

○ Custom
  → Specify which tools: Read, Write, Edit, Grep, Glob, Bash, WebSearch, WebFetch
```

## Generation

### Step 1: Create Directory

```bash
# Personal skill
mkdir -p ~/.claude/skills/{skill-name}

# Project skill
mkdir -p .claude/skills/{skill-name}
```

### Step 2: Generate SKILL.md

**Auto-activating skill**:
```yaml
---
name: {skill-name}
description: {description with "Activates for:" keywords}
---

# {Skill Title}

## What I Know

- [Topic 1]
- [Topic 2]
- [Topic 3]

## When to Use

Ask me about:
- "How do I [use case 1]..."
- "What's the best way to [use case 2]..."

## Key Concepts

### [Concept 1]

[Explanation with code examples]

## Best Practices

1. ✅ **[Practice 1]**: [Why]
2. ⚠️ **[Anti-pattern]**: [Why to avoid]

## Examples

### [Example 1]

```[language]
[code]
```
```

**Command skill** (add frontmatter):
```yaml
---
name: {skill-name}
description: {description}
disable-model-invocation: true
---
```

**Knowledge skill** (add frontmatter):
```yaml
---
name: {skill-name}
description: {description}
user-invocable: false
---
```

**With tool restrictions** (add frontmatter):
```yaml
---
name: {skill-name}
description: {description}
allowed-tools: Read, Grep, Glob, WebSearch
---
```

### Step 3: Validate

Check these before finishing:
- [ ] SKILL.md starts with `---` on line 1
- [ ] Has `name:` field (matches directory name)
- [ ] Has `description:` field (includes "Activates for:")
- [ ] Closing `---` present before markdown content
- [ ] Description under 1024 characters
- [ ] Name matches `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`

### Step 4: Show Next Steps

```
✅ Skill created: {path}/SKILL.md

Next steps:
  1. Edit SKILL.md with your expertise content
  2. Restart Claude Code to load the skill
  3. Test: Ask a question with your trigger keywords

Test your skill:
  "{example trigger question based on description}"

Troubleshooting:
  - Skill doesn't activate → Add more keywords to description
  - YAML errors → Check frontmatter format (---)
  - Not loading → Restart Claude Code
```

## Non-Interactive Mode

Support flags for automation:

```bash
/sw:skill --name python-expert --type auto --location personal \
  --description "Python expert. Activates for: python, pip, virtualenv"
```

| Flag | Values | Default |
|------|--------|---------|
| `--name` | skill-name | (required) |
| `--type` | `auto`, `command`, `knowledge` | `auto` |
| `--location` | `project`, `personal` | `project` |
| `--description` | "text" | (required) |
| `--tools` | `full`, `readonly`, or comma-separated list | `full` |

## Examples

### Example 1: React Hooks Expert

```
/sw:skill

Name: react-hooks-expert
Type: Auto-activating
Description: React hooks expert. Explains useState, useEffect, useContext,
  useMemo, useCallback, and custom hooks patterns. Activates for: React hooks,
  useState, useEffect, custom hook, React state management, hooks patterns.
Location: Project
Tools: Full access
```

**Creates** `.claude/skills/react-hooks-expert/SKILL.md`

### Example 2: Deploy Command

```
/sw:skill

Name: deploy-production
Type: Command skill
Description: Production deployment workflow with safety checks.
Location: Project
Tools: Full access
```

**Creates** `.claude/skills/deploy-production/SKILL.md` with `disable-model-invocation: true`

### Example 3: Internal API Docs

```
/sw:skill

Name: internal-api-docs
Type: Knowledge skill
Description: Internal API documentation for company services.
  Activates for: internal API, company API, service endpoints.
Location: Project
Tools: Read-only
```

**Creates** `.claude/skills/internal-api-docs/SKILL.md` with:
```yaml
---
name: internal-api-docs
description: Internal API documentation...
user-invocable: false
allowed-tools: Read, Grep, Glob, WebSearch
---
```

## Validation Errors

| Error | Fix |
|-------|-----|
| "Invalid name format" | Use lowercase, hyphens only |
| "Name too long" | Max 64 characters |
| "Description too long" | Max 1024 characters |
| "Missing Activates for:" | Add trigger keywords |
| "Directory exists" | Choose different name or remove existing |

## Quick Reference

**Skill types**:
- **Auto-activating**: Claude loads when keywords match (default)
- **Command**: User invokes with `/skill-name` explicitly
- **Knowledge**: Only Claude activates, user cannot invoke

**Locations**:
- **Personal**: `~/.claude/skills/` (all projects)
- **Project**: `.claude/skills/` (this project only)

**Tool restrictions**:
- Read-only: `allowed-tools: Read, Grep, Glob, WebSearch`
- Custom: specify tools you need

Create your skill!
