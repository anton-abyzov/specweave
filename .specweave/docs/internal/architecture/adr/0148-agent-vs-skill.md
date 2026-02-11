# ADR-0148: Agents vs Skills Architecture

**Status**: Accepted
**Date**: 2025-01-17
**Updated**: 2026-01-20 (corrected agent/skill classification)
**Deciders**: Core Team

## Context

Claude Code provides two extension mechanisms:
1. **Agents** - Separate context windows, explicit invocation via Task tool
2. **Skills** - Shared context, auto-activation based on keywords

Question: When to use which?

## Decision

**Use Agents for**:
- Complex, multi-step workflows requiring isolated context
- Specialized domain expertise (frontend, K8s, testing, etc.)
- Tool restrictions by role
- Separate context window required
- Long-running tasks
- Examples: frontend-architect, kubernetes-architect, qa-engineer, database-optimizer

**Use Skills for**:
- Auto-activating capabilities based on keywords
- Quick operations in shared context
- Role-based expertise (PM, Architect, Security, etc.)
- Capability extensions
- Examples: pm, architect, tech-lead, increment-planner, context-loader

**Key insight**: PM, Architect, Security are SKILLS (auto-activate), NOT agents!

## Agent Examples

```yaml
# plugins/specweave-frontend/agents/frontend-architect/AGENT.md
---
name: frontend-architect
description: Frontend architecture specialist for React/Vue/Angular...
tools: Read, Grep, Glob, Write, Edit
model: opus
---
You are an expert Frontend Architect...
```

**Invocation**: Via Skill tool (explicit) or auto-activation
```typescript
await Skill({
  skill: "sw-frontend:frontend-architect",
  args: "Design React component architecture for..."
});
```

## Skill Examples

```yaml
# src/skills/increment-planner/SKILL.md
---
name: increment-planner
description: Plan features with context awareness...
---
Plans features by loading context manifests...
```

**Invocation**: Auto-activates based on description

## Consequences

### Positive
- ✅ Clear separation of concerns
- ✅ Context isolation when needed
- ✅ Auto-activation for common tasks
- ✅ Tool restrictions for security
- ✅ Different AI models per role

### Negative
- ❌ Developers must choose correctly
- ❌ More complex architecture
- ❌ Potential confusion between types

## Guidelines

| Create Agent When | Create Skill When |
|-------------------|-------------------|
| Complex workflows | Simple tasks |
| Needs separate context | Can share context |
| Distinct role | Capability extension |
| Tool restrictions | All tools OK |
| Long-running | Quick operations |

## Metrics

**Agents**: 35+ agents in domain plugins (frontend-architect, kubernetes-architect, qa-engineer, etc.)
**Skills**: 50+ skills in core plugin (pm, architect, tech-lead, increment-planner, etc.)

## Related

- [Agents Development](../../../../CLAUDE.md#agents-development)
- [Skills Development](../../../../CLAUDE.md#skills-development)
- [ADR-0010: Factory Pattern](0009-factory-pattern.md)
