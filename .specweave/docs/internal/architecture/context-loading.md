# Context Management Architecture

**Purpose**: Achieve efficient context usage through Claude's native progressive disclosure and sub-agent parallelization.

**Key Principle**: Leverage built-in Claude Code mechanisms instead of custom systems.

**Related Documentation**:
- [ADR-0002: Context Loading](./adr/0002-context-loading.md) - Architecture decision
- **Context Optimization** - Built into SpecWeave core plugin via progressive disclosure pattern
- [Claude Skills Documentation](https://support.claude.com/en/articles/12512176-what-are-skills) - How skills work
- [Agent Skills Engineering Blog](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) - Anthropic's approach
- [Sub-Agents Documentation](https://docs.claude.com/en/docs/claude-code/sub-agents) - How sub-agents isolate context

---

## The Core Problem

**Traditional AI Coding (No Progressive Disclosure)**:
```
User: "Create a Next.js authentication page"

AI tool loads everything:
├── All documentation (everywhere)
├── All skills/capabilities (no filtering)
├── All context (no prioritization)

Total: Variable, often excessive
Problem: Context bloat, slow responses, high costs
```

**Example Without Progressive Disclosure**:
```
Load all 35 SpecWeave skills at once:
├── nextjs skill (5,234 tokens) ✅ Needed
├── frontend skill (3,891 tokens) ✅ Needed
├── python-backend skill (4,523 tokens) ❌ Not needed
├── devops skill (6,123 tokens) ❌ Not needed
├── hetzner-provisioner skill (3,456 tokens) ❌ Not needed
├── ... (30 more skills) ❌ Not needed

Total: ~175,000 tokens
Relevant: ~9,125 tokens (5.2% efficiency)
Waste: 94.8%
```

**Result**: Massive token waste, slow responses, context confusion.

---

## SpecWeave's Solution: Native Claude Mechanisms

SpecWeave achieves context efficiency through **two Claude Code native features**:

1. **Progressive Disclosure** (Skills)
2. **Sub-Agent Parallelization** (Isolated Contexts)

**No custom systems. No manifests. No caching layers.**

---

## Mechanism 1: Progressive Disclosure

### How It Works

Claude Code's two-level progressive disclosure system:

#### Level 1: Metadata Phase (Always Loaded)

**What loads**:
```yaml
---
name: nextjs
description: NextJS 14+ App Router specialist. Server Components, SSR, ISR...
---
```

**Token cost**:
- Per skill: ~50-100 tokens (metadata only)
- All 35 skills: ~2,625 tokens total
- **Always loaded**: Claude sees all skill names/descriptions

**Purpose**: Claude can identify relevant skills without loading full content

#### Level 2: Full Content Phase (On-Demand)

**What loads**:
```markdown
# NextJS Skill

## Purpose
[Full documentation...]

## Implementation Guide
[5,000+ tokens of detailed content...]
```

**Token cost**:
- Variable (skill-dependent)
- Only loaded when Claude determines relevance

**Benefit**: Prevents loading irrelevant skills

### Example: Simple Task

```
User: "Create a Next.js authentication page"

═══════════════════════════════════════════════════════════
PHASE 1: Metadata Review
═══════════════════════════════════════════════════════════

Claude sees all 35 skill metadata (~2,625 tokens)

Relevant matches found:
✓ nextjs (matches "Next.js")
✓ frontend (matches "page")

Not loaded (irrelevant):
✗ python-backend
✗ devops
✗ hetzner-provisioner
✗ ... (30 more)

═══════════════════════════════════════════════════════════
PHASE 2: Full Content Loading
═══════════════════════════════════════════════════════════

Load only relevant skills:
✓ nextjs full content: 5,234 tokens
✓ frontend full content: 3,891 tokens

═══════════════════════════════════════════════════════════
RESULT
═══════════════════════════════════════════════════════════

Total tokens loaded: ~11,750
Without progressive disclosure: ~175,000
Token reduction: 93.3%

Time saved: Instant (metadata already in memory)
Quality: Full capabilities of relevant skills available
```

### Example: Complex Task

```
User: "Build full-stack SaaS with Next.js, Prisma, and Stripe"

═══════════════════════════════════════════════════════════
PHASE 1: Metadata Review
═══════════════════════════════════════════════════════════

Claude sees all 35 skill metadata (~2,625 tokens)

Relevant matches found:
✓ nextjs (matches "Next.js")
✓ frontend (matches "SaaS")
✓ nodejs-backend (matches "full-stack")
✓ prisma (matches "Prisma")
✓ payment skills (matches "Stripe")
... (8-10 skills total)

Not loaded (irrelevant):
✗ python-backend
✗ dotnet-backend
✗ flutter
✗ ... (25+ more)

═══════════════════════════════════════════════════════════
PHASE 2: Full Content Loading
═══════════════════════════════════════════════════════════

Load 8-10 relevant skills:
✓ Total: ~45,000 tokens

═══════════════════════════════════════════════════════════
RESULT
═══════════════════════════════════════════════════════════

Total tokens loaded: ~47,625
Without progressive disclosure: ~175,000
Token reduction: 72.8%
```

---

## Mechanism 2: Sub-Agent Parallelization

### How It Works

Each sub-agent has **isolated context window**:

```
Main Conversation
├── Context used: 100,000 tokens
├── History: Full conversation
└── Launches 3 sub-agents...

Sub-Agent 1 (Frontend)
├── Context used: 0 tokens (fresh start!)
├── Loads: nextjs, frontend skills only
└── Total: ~12,000 tokens

Sub-Agent 2 (Backend)
├── Context used: 0 tokens (fresh start!)
├── Loads: nodejs-backend, security skills only
└── Total: ~15,000 tokens

Sub-Agent 3 (DevOps)
├── Context used: 0 tokens (fresh start!)
├── Loads: devops, hetzner skills only
└── Total: ~8,000 tokens
```

**Key Benefits**:
1. **Context Isolation**: Each agent starts fresh (doesn't inherit main conversation's 100K tokens)
2. **Parallelization**: All 3 agents work simultaneously
3. **Focused Loading**: Each loads only relevant skills for its domain
4. **Result Merging**: Outputs combined back to main conversation

### Example: Multi-Domain Task

```
User: "Build complete SaaS: UI, API, deployment"

Without Sub-Agents (Single Context):
═══════════════════════════════════════════════════════════
Main conversation: 80,000 tokens (history)
Load all relevant skills: 50,000 tokens
Total context: 130,000 tokens
Risk: Approaching context limit
═══════════════════════════════════════════════════════════

With Sub-Agents (Isolated Contexts):
═══════════════════════════════════════════════════════════
Main: 5,000 tokens (coordination only)
├─ Frontend agent: 15,000 tokens (isolated)
├─ Backend agent: 18,000 tokens (isolated)
└─ DevOps agent: 12,000 tokens (isolated)

Total across all contexts: 50,000 tokens
Reduction: 61.5% (130K → 50K)
Parallelization: 3x faster (simultaneous execution)
═══════════════════════════════════════════════════════════
```

---

## SpecWeave's Role

### What SpecWeave Does

✅ **Organizes skills for progressive disclosure**
- Clear, focused skill descriptions
- Activation keywords in descriptions
- Organized by domain

✅ **Coordinates sub-agent usage**
- role-orchestrator detects multi-domain tasks
- Launches specialized sub-agents automatically
- Merges results intelligently

### What SpecWeave Does NOT Do

❌ **No custom context manifests**
- Doesn't use YAML config files
- Doesn't declare required context
- Claude determines relevance automatically

❌ **No custom caching**
- Claude Code handles caching internally
- No additional caching layer needed

❌ **No custom loading logic**
- Progressive disclosure is automatic
- No code to load/manage context

---

## Best Practices

### For Skill Descriptions

**Good Example**:
```yaml
---
name: nextjs
description: NextJS 14+ App Router specialist. Creates server components, implements SSR/ISR/SSG, handles routing, middleware, API routes. Activates for Next.js, React Server Components, App Router, Server Actions.
---
```

**Why good**:
- Specific technologies mentioned
- Activation keywords included
- Clear capabilities listed

**Bad Example**:
```yaml
---
name: nextjs
description: Frontend framework helper
---
```

**Why bad**:
- Vague description
- No activation keywords
- Unclear capabilities

### For Sub-Agent Usage

**When to use**:
- Multi-domain tasks (frontend + backend + devops)
- Parallel work needed (multiple features simultaneously)
- Context approaching limit

**When NOT to use**:
- Simple single-domain tasks
- Sequential work requiring shared context

---

## Token Reduction Metrics

### Measured Scenarios

#### Simple Task (1-2 Skills)
```
Before: 175,000 tokens (all skills)
After: ~12,000 tokens (2 skills)
Reduction: ~93%
```

#### Medium Task (5-7 Skills)
```
Before: 175,000 tokens (all skills)
After: ~35,000 tokens (6 skills)
Reduction: ~80%
```

#### Complex Task (10+ Skills + Sub-Agents)
```
Before: 175,000 tokens (all skills, single context)
After: ~60,000 tokens (10 skills + 3 sub-agents)
Reduction: ~66%
```

**Note**: Exact percentages vary by task complexity. These are approximations based on typical usage patterns.

---

## Comparison with Custom Solutions

### Rejected Approach: Context Manifests

**What we considered**:
```yaml
# NOT IMPLEMENTED
spec_sections:
  - path/to/spec.md
  - another/spec.md#section
max_context_tokens: 10000
```

**Why rejected**:
- ❌ Manual creation/maintenance overhead
- ❌ Manifests become stale
- ❌ Reinvents Claude's built-in solution
- ❌ Adds complexity without benefit

**Decision**: Use Claude's progressive disclosure instead

### Rejected Approach: Custom Caching

**What we considered**:
- Cache loaded context
- Invalidate on file changes
- Manage cache storage

**Why rejected**:
- ❌ Claude Code handles caching internally
- ❌ No proof custom caching provides benefit
- ❌ Adds complexity and maintenance burden

**Decision**: Trust Claude's internal caching

---

## Implementation Details

### For Claude Code

**No code needed** - Progressive disclosure works automatically

**Requirements**:
1. Skills have clear YAML frontmatter
2. Descriptions include activation keywords
3. Content is well-organized

### For Other AI Tools

SpecWeave generates **AGENTS.md** adapter:
- Contains all skills/agents in one file
- No progressive disclosure (AI tool limitation)
- Still provides full capabilities

**Supported tools**:
- Cursor
- GitHub Copilot
- Gemini CLI
- Codex
- Any AI tool

---

## Debugging

### Check Progressive Disclosure

When Claude mentions using a skill:
```
Claude: "🎨 Using nextjs skill..."
```

**This confirms**:
- Progressive disclosure worked
- Only nextjs skill loaded (not all 35)
- Context efficient

### Check Sub-Agent Usage

When Claude mentions launching agents:
```
Claude: "🤖 Launching 3 specialized agents in parallel..."
```

**This confirms**:
- Sub-agent parallelization active
- Each agent has isolated context
- Efficient multi-domain processing

---

## Related Patterns

### Pattern 1: Skill Organization

**Principle**: One skill = one focused capability

**Example**:
```
✓ nextjs skill (Next.js only)
✓ frontend skill (React/Vue/Angular)
✓ nodejs-backend skill (Node.js APIs)

✗ web-dev skill (everything mixed)
```

### Pattern 2: Description Clarity

**Principle**: Explicit activation triggers

**Example**:
```
✓ "Activates for Next.js, App Router, Server Components"
✗ "Helps with frontend"
```

### Pattern 3: Sub-Agent Delegation

**Principle**: Parallelize multi-domain work

**Example**:
```
✓ Frontend agent + Backend agent + DevOps agent (parallel)
✗ Single agent doing all domains (sequential)
```

---

## Summary

**SpecWeave's context efficiency comes from**:

1. **Progressive Disclosure** (Claude Native)
   - Skills load only when relevant
   - 50-95% token reduction depending on task
   - Zero configuration required

2. **Sub-Agent Parallelization** (Claude Code Native)
   - Isolated context windows
   - Parallel processing
   - Additional 50-70% efficiency on complex tasks

**No custom systems. No manifests. No caching layers.**

**Result**: Simple, maintainable, efficient context management that leverages Claude's built-in capabilities.

**Philosophy**: Use what works. Don't reinvent what Claude already provides.
