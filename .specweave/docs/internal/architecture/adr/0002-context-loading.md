# ADR-0002: Context Loading Approach

**Status**: Accepted
**Date**: 2025-01-16 (Updated: 2025-10-28)
**Deciders**: Core Team

## Context

**Problem**: Loading ALL skills (35+ with full documentation = 175K+ tokens) for EVERY task wastes tokens and slows AI responses.

**Challenge**: How to load only relevant context while maintaining full capabilities?

## Decision

**Solution**: Leverage Claude's Native Progressive Disclosure

SpecWeave relies on **Claude Code's built-in progressive disclosure mechanism** rather than custom context loading systems.

### How Progressive Disclosure Works

Claude Code implements a two-level skill loading system:

#### Level 1: Metadata Only (Always Loaded)

```yaml
---
name: nextjs
description: NextJS 14+ implementation specialist. Creates App Router projects...
---
```

- **What loads**: Only YAML frontmatter (name + description)
- **Token cost**: ~50-100 tokens per skill
- **Total for 35 skills**: ~2,625 tokens
- **Claude sees**: All skill names and descriptions
- **Claude decides**: Which skills are relevant to current task

#### Level 2: Full Content (Loaded On-Demand)

```markdown
# NextJS Skill

[Full documentation, examples, best practices...]
[5,000+ tokens of content]
```

- **What loads**: Full SKILL.md content **only** if skill is relevant
- **Token cost**: Variable (skill-dependent)
- **Loaded**: Only when Claude determines skill is needed
- **Benefit**: Prevents loading unnecessary skills

### Example Workflow

```
User: "Create a Next.js authentication page"
    ↓
Claude sees all 35 skill metadata (~2,625 tokens)
    ↓
Claude identifies relevant skills:
  - nextjs (matches "Next.js")
  - frontend (matches "page")
    ↓
Claude loads ONLY these skills:
  - nextjs: 5,234 tokens
  - frontend: 3,891 tokens
    ↓
Total: ~11,750 tokens (vs 175,000+ if loading all skills)
Token reduction: ~93%
```

### Sub-Agent Context Isolation

For complex multi-domain tasks, SpecWeave uses **Claude Code's sub-agent system**:

```
Main conversation (100K tokens used)
    ↓
Launches 3 sub-agents in parallel
    ↓
├─ Sub-agent 1: Fresh context (0K initial)
├─ Sub-agent 2: Fresh context (0K initial)
└─ Sub-agent 3: Fresh context (0K initial)
```

**Benefits**:
1. Each sub-agent has isolated context window
2. Doesn't inherit main conversation's token usage
3. Each can load its own relevant skills
4. Results merged back to main conversation

## Alternatives Considered

### 1. Custom Context Manifest System

**Proposed**: YAML files declaring required context per increment

```yaml
# NOT IMPLEMENTED
spec_sections:
  - path/to/spec.md
  - another/spec.md#section
max_context_tokens: 10000
```

**Why Rejected**:
- ❌ Requires manual manifest creation/maintenance
- ❌ Manifests can become stale
- ❌ Reinvents Claude's built-in progressive disclosure
- ❌ Adds complexity without benefit
- ❌ Claude already solves this problem natively

**Decision**: Don't build what Claude already provides

### 2. Load Everything

**Proposed**: Load all 35 skills for every task

**Why Rejected**:
- ❌ 175,000+ tokens wasted on simple tasks
- ❌ Slow responses
- ❌ Inefficient use of context window

### 3. Smart AI Detection (Without Progressive Disclosure)

**Proposed**: AI guesses which skills it needs

**Why Rejected**:
- ❌ Claude already does this with progressive disclosure
- ❌ No need to reinvent the wheel

## Consequences

### Positive

✅ **No Custom System Needed**
- Leverage Claude's native capabilities
- Zero maintenance overhead
- Works automatically

✅ **Token Efficiency**
- Simple tasks: 90%+ reduction (load 1-2 skills vs 35)
- Complex tasks: 50-70% reduction (load 5-10 skills vs 35)
- Sub-agents: Additional 50-70% via context isolation

✅ **Automatic Optimization**
- Claude handles skill selection
- No manual configuration required
- Scales automatically

✅ **Focus on Skill Quality**
- Clear, focused descriptions help Claude identify relevance
- Good descriptions = better progressive disclosure
- Developers focus on content, not loading logic

### Negative

❌ **Depends on Claude Code**
- Progressive disclosure is Claude Code-specific
- Other AI tools need fallback (AGENTS.md adapter)

**Mitigation**: SpecWeave provides AGENTS.md for non-Claude tools

## Implementation

### For Claude Code Users

**No implementation needed** - Progressive disclosure works automatically.

**Best Practice**: Write clear skill descriptions with activation keywords

```yaml
# Good
---
name: nextjs
description: NextJS 14+ App Router specialist. Server Components, SSR, ISR, routing, middleware. Activates for Next.js, React Server Components.
---

# Bad
---
name: nextjs
description: Frontend framework
---
```

### For Other AI Tools

SpecWeave generates **AGENTS.md** adapter for tools without progressive disclosure:
- Cursor
- GitHub Copilot
- Gemini CLI
- Codex
- Any AI tool

## Metrics

### Token Usage (Typical Tasks)

**Simple Task** (e.g., "Create Next.js page"):
- Without progressive disclosure: ~175,000 tokens (all skills)
- With progressive disclosure: ~12,000 tokens (2-3 relevant skills)
- **Reduction**: ~93%

**Complex Task** (e.g., "Build full-stack SaaS"):
- Without progressive disclosure: ~175,000 tokens (all skills)
- With progressive disclosure: ~45,000 tokens (8-10 skills + sub-agents)
- **Reduction**: ~74%

**Note**: Exact percentages vary by task complexity. These are approximations based on typical usage.

### Load Time

- **Progressive disclosure**: Instant (metadata already loaded)
- **Full skill load**: On-demand (only when needed)
- **Sub-agent spawn**: <1s per agent

## Related

- [Context Loading Architecture](../context-loading.md)
- [ADR-0003: Agents vs Skills](0003-agent-vs-skill.md)
- [Claude Skills Documentation](https://support.claude.com/en/articles/12512176-what-are-skills)
- [Agent Skills Engineering Blog](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Sub-Agents Documentation](https://docs.claude.com/en/docs/claude-code/sub-agents)

## Summary

**Decision**: Use Claude's native progressive disclosure instead of custom context loading.

**Rationale**: Claude Code already solves this problem elegantly. No need to build custom manifests, caching, or loading systems.

**Impact**: SpecWeave focuses on skill quality (clear descriptions, good content) rather than building infrastructure that Claude already provides.

**Result**: Simple, maintainable, efficient context management with zero overhead.
