# ADR-0003: Agents vs Skills Architecture

**Status**: Accepted  
**Date**: 2025-01-17  
**Deciders**: Core Team  

## Context

Claude Code provides two extension mechanisms:
1. **Agents** - Separate context windows
2. **Skills** - Shared context, auto-activation

Question: When to use which?

## Decision

**Use Agents for**:
- Complex, multi-step workflows
- Distinct personality/role needed
- Tool restrictions by role
- Separate context window required
- Long-running tasks
- Examples: PM, Architect, DevOps, Security, QA Lead

**Use Skills for**:
- Focused capabilities
- Quick operations
- Capability extensions
- Shared context acceptable
- Auto-activation based on keywords
- Examples: increment-planner, context-loader, skill-router

## Agent Examples

```yaml
# src/agents/pm/AGENT.md
---
name: pm
description: Product Manager for requirements...
tools: Read, Grep, Glob
model: sonnet
---
You are an expert Product Manager...
```

**Invocation**: Via Task tool
```typescript
await Task({
  subagent_type: "specweave:pm:pm",
  prompt: "Create product requirements for..."
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

**Agents**: 14 agents (PM, Architect, DevOps, SRE, QA, Security, etc.)
**Skills**: 10+ skills (detector, planner, router, loader, etc.)

## Related

- [Agents Development](../../../../CLAUDE.md#agents-development)
- [Skills Development](../../../../CLAUDE.md#skills-development)
- [ADR-0010: Factory Pattern](0010-factory-pattern.md)
