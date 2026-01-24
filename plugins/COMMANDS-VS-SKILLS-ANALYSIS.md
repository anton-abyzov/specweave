# Commands vs Skills: Complete Analysis

> Analysis date: 2026-01-24
> Based on official Claude Code documentation: https://code.claude.com/docs/en/skills

## Executive Summary

**CRITICAL FINDING**: Commands and skills are now **unified** in Claude Code 2.1.3+.

From the official docs:
> "Custom slash commands have been merged into skills. A file at `.claude/commands/review.md` and a skill at `.claude/skills/review/SKILL.md` both create `/review` and work the same way."

## Current State Analysis

### SpecWeave Plugin Structure

| Plugin | Commands | Skills | Status |
|--------|----------|--------|--------|
| specweave (core) | 70 | 25+ | Hybrid |
| specweave-ado | 11 | 1 | Command-heavy |
| specweave-github | 10 | 1 | Command-heavy |
| specweave-jira | 11 | 1 | Command-heavy |
| specweave-testing | 7 | 1 | Command-heavy |
| specweave-frontend | 4 | 1 | Command-heavy |
| specweave-backend | 3 | 1 | Command-heavy |
| specweave-payments | 4 | 1 | Command-heavy |
| specweave-kubernetes | 3 | 1 | Command-heavy |
| specweave-ml | 4 | 2 | Command-heavy |
| specweave-mobile | 3 | 1 | Command-heavy |
| specweave-release | 5 | 1 | Command-heavy |
| specweave-diagrams | 1 | 1 | Balanced |
| specweave-kafka | 4 | 1 | Command-heavy |
| specweave-confluent | 3 | 1 | Command-heavy |
| Other plugins | ~25 | ~5 | Command-heavy |
| **TOTAL** | **~168** | **~45** | |

### Agents Status

**All 35 agents successfully converted to skills with `context: fork`**:
- No `agents/` folders remain
- All converted skills have proper frontmatter
- All use `context: fork` for isolated execution
- All have `allowed-tools:` defined

## Official Claude Code Frontmatter Reference

| Field | Purpose | When to Use |
|-------|---------|-------------|
| `name` | Display name / command name | Always (defaults to directory name) |
| `description` | What it does + when to use | **Always** (used for auto-activation) |
| `disable-model-invocation` | Prevent Claude auto-loading | **Side-effect commands** (deploy, sync, commit) |
| `user-invocable` | Hide from `/` menu | Background knowledge only |
| `allowed-tools` | Restrict tool access | Security/safety constraints |
| `model` | Override model | Performance optimization |
| `context` | Set to `fork` for subagent | Isolated execution needed |
| `agent` | Subagent type | With `context: fork` |
| `hooks` | Lifecycle hooks | Advanced workflows |
| `argument-hint` | Autocomplete hint | Commands with arguments |

## Invocation Control Matrix

| Frontmatter | User Can Invoke | Claude Can Invoke | Context Loading |
|-------------|-----------------|-------------------|-----------------|
| (default) | Yes | Yes | Description always loaded |
| `disable-model-invocation: true` | Yes | **No** | Description NOT loaded |
| `user-invocable: false` | **No** | Yes | Description always loaded |

## The Decision Framework

### Should Commands Be Migrated to Skills?

**Short answer: NO - Commands work fine as-is.**

From the official docs:
> "Your existing `.claude/commands/` files keep working."

However, skills offer **optional benefits**:
1. Supporting files (scripts/, templates/, examples/)
2. More organized directory structure
3. Official "recommended" pattern

### When Commands Should STAY as Commands

Commands with **side effects** that users should control:

| Command Type | Example | Should Remain Command |
|--------------|---------|----------------------|
| Git operations | `/sw:save`, `/commit` | ✅ Yes |
| Deployment | `/sw:deploy`, `/sw:npm` | ✅ Yes |
| External sync | `/sw-github:sync`, `/sw-jira:sync` | ✅ Yes |
| State changes | `/sw:do`, `/sw:done`, `/sw:auto` | ✅ Yes |
| Destructive | `/sw:abandon`, `/sw:archive` | ✅ Yes |

**Recommendation**: Add `disable-model-invocation: true` to critical commands.

### When Commands COULD Be Skills (Auto-activate)

Informational or reference commands:

| Command Type | Example | Could Be Skill |
|--------------|---------|----------------|
| Status/info | `/sw:status`, `/sw:progress` | ⚠️ Maybe |
| Quality checks | `/sw:validate`, `/sw:qa` | ⚠️ Maybe |
| TDD guidance | `/sw:tdd-cycle` | ⚠️ Maybe |

**Note**: These are borderline - they're often invoked intentionally.

## Final Recommendation

### 1. DO NOT mass-migrate commands to skills

**Reason**: 168 commands is significant effort, and commands work fine.

### 2. Agent-to-Skill conversion was CORRECT

All 35 agents with `context: fork` are the right pattern for:
- Domain expertise (frontend, backend, payments, etc.)
- Isolated execution
- Auto-activation on keywords

### 3. Add `disable-model-invocation: true` to critical commands

Should be updated (HIGH PRIORITY):

```yaml
# Example: do.md should have
---
name: sw:do
description: Execute increment implementation...
disable-model-invocation: true  # <-- ADD THIS
hooks:
  PostToolUse: ...
---
```

Commands to update:
- `/sw:do` - Executes tasks (major side effects)
- `/sw:done` - Closes increments
- `/sw:auto` - Autonomous mode
- `/sw:save` - Git commit
- `/sw:npm` - NPM publish
- `/sw-github:sync`, `/sw-github:push` - GitHub sync
- `/sw-jira:sync`, `/sw-jira:push` - JIRA sync
- `/sw-ado:sync`, `/sw-ado:push` - ADO sync

### 4. Skills with `context: fork` are for domain expertise

Pattern confirmed correct:
```yaml
---
name: frontend-architect
description: Frontend architecture expert. Activates for React, Vue...
context: fork        # ← Isolated subagent
model: opus
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---
```

## Migration Decision Matrix

| Current | Migration Needed? | Action |
|---------|------------------|--------|
| `agents/*/AGENT.md` | ✅ **DONE** | Converted to skills with `context: fork` |
| `commands/*.md` | ❌ No | Keep, optionally add `disable-model-invocation` |
| `skills/*/SKILL.md` | ❌ No | Already correct format |

## Conclusion

1. **Agents → Skills**: ✅ Complete (35 converted)
2. **Commands → Skills**: ❌ Not needed (commands work fine)
3. **Commands need update**: Add `disable-model-invocation: true` to side-effect commands

The current hybrid structure (commands + skills) is **valid and recommended**:
- **Commands**: User-invocable workflows with side effects
- **Skills**: Auto-activating domain expertise with isolated context

## Official Documentation Links

- Skills: https://code.claude.com/docs/en/skills
- Subagents: https://code.claude.com/docs/en/sub-agents
- Hooks: https://code.claude.com/docs/en/hooks
- Plugins: https://code.claude.com/docs/en/plugins
