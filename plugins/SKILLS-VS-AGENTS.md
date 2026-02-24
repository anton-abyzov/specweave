# Skills vs Agents: SpecWeave's Approach

> Based on official Claude Code documentation: https://code.claude.com/docs/en/skills and https://code.claude.com/docs/en/sub-agents

## TL;DR

**SpecWeave uses Skills exclusively. No custom agents needed.**

Skills with `context: fork` provide 100% of the functionality we need:
- **Auto-activation** by keywords (Claude detects "React dashboard" → loads frontend skill)
- **Isolated execution** via `context: fork` (like subagents)
- **User-invocable** via `/skill-name`
- **Domain expertise** loaded on-demand

For explicit research/exploration tasks, use **built-in subagents** (Explore, Plan, general-purpose).

## Why Skills Over Custom Agents?

| Feature | Skills (`context: fork`) | Custom Agents |
|---------|-------------------------|---------------|
| **Auto-activation** | ✅ By keywords | ❌ Must be explicitly spawned |
| **Isolated context** | ✅ With `context: fork` | ✅ Always isolated |
| **User-invocable** | ✅ `/skill-name` | ❌ Only via Task tool |
| **Discovery** | ✅ Works with subfolder structure | ❌ Requires flat files |
| **Token efficient** | ✅ Loads on-demand | ❌ Same |
| **Maintenance** | ✅ Simple SKILL.md format | ❌ Stricter requirements |

**Bottom line**: Skills do everything custom agents do, plus auto-activation and simpler maintenance.

## The Pattern: Skills with `context: fork`

```yaml
---
name: frontend-architect
description: Frontend architecture expert. Activates for React, Vue, Next.js, dashboard, component...
context: fork          # <-- Runs in isolated subagent context
model: opus
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Frontend Architect Skill

You are an expert frontend architect...
```

**This gives you:**
- Auto-activation on keywords ("Build React dashboard" → skill activates)
- Isolated context (doesn't pollute main conversation)
- Full tool access within the isolated context
- Results summarized back to main conversation

## Built-in Subagents for Research

For explicit research/exploration tasks, use Claude Code's **built-in subagents** via the Task tool:

| Subagent | Use Case | Example |
|----------|----------|---------|
| **Explore** | Codebase exploration, finding files | "Find all API endpoints" |
| **Plan** | Architecture planning, design | "Design auth system" |
| **general-purpose** | Open-ended research | "Research Stripe vs PayPal for Israel" |

**Example usage:**
```typescript
Task({
  subagent_type: "Explore",
  prompt: "Find all payment-related files and how they're organized",
  description: "Explore payments codebase"
})

Task({
  subagent_type: "general-purpose",
  prompt: "Research best payment providers for businesses in Israel",
  description: "Payment provider research"
})
```

**Key insight**: Built-in subagents handle explicit research needs. Skills handle domain expertise. No custom agents needed!

## SpecWeave Skill Catalog

All domain experts are now skills with `context: fork`:

| Domain | Skill | Triggers (Auto-activate) |
|--------|-------|--------------------------|
| **Frontend** | `sw-frontend:frontend-architect` | React, Vue, Next.js, dashboard, component, UI |
| **Backend** | `sw-backend:database-optimizer` | API, database, SQL, PostgreSQL, optimization |
| **Payments** | `sw-payments:payment-integration` | Stripe, PayPal, checkout, billing, subscriptions |
| **Testing** | `sw-testing:qa-engineer` | E2E, Playwright, Vitest, Jest, TDD, QA |
| **Kubernetes** | `sw-k8s:kubernetes-architect` | K8s, pods, deployments, Helm, GitOps |
| **Infrastructure** | `sw-infra:devops` | Terraform, Docker, CI/CD, AWS, Azure |
| **Mobile** | `sw-mobile:react-native-expert` | React Native, iOS, Android, Expo |
| **ML/AI** | `sw-ml:ml-engineer` | ML, model, training, TensorFlow, PyTorch |
| **Diagrams** | `sw-diagrams:diagrams` | Mermaid, C4, architecture diagram, flowchart |
| **Release** | `sw-release:release-expert` | release, version, changelog, npm publish |

All run in isolated context without polluting the main conversation.

## How It Works in Practice

**User says:** "Build a React dashboard with Stripe checkout"

**What happens:**
1. Claude detects keywords: "React", "dashboard", "Stripe", "checkout"
2. Skills auto-activate (primary mechanism):
   - `sw-frontend:frontend-architect` (React, dashboard)
   - `sw-payments:payment-integration` (Stripe, checkout)
3. Each skill runs in isolated context (`context: fork`)
4. Results return to main conversation

**Two invocation methods** (per [official docs](https://code.claude.com/docs/en/skills)):
1. **Auto-activation** (primary): Keywords in skill description trigger automatic loading
2. **Explicit invocation** (fallback): Use Skill tool or `/skill-name` when auto-activation doesn't trigger

```typescript
// If auto-activation didn't work, explicitly invoke:
Skill({ skill: "sw-frontend:frontend-architect", args: "dashboard" })
```

## Migration Complete

All 35 SpecWeave agents have been converted to skills:

**Before (Didn't Work):**
```
plugins/specweave-frontend/
└── agents/
    └── frontend-architect/
        └── AGENT.md         # NOT discovered by Claude Code!
```

**After (Works):**
```
plugins/specweave-frontend/
└── skills/
    └── frontend-architect/
        └── SKILL.md         # Auto-activates on keywords
```

**Conversion changes:**
- `tools:` → `allowed-tools:`
- Added `context: fork`
- Removed agent-specific fields (`model_preference`, `cost_profile`, `visibility`)
- Removed "How to Invoke" sections

## FAQ

### Q: Do we ever need custom agents?
**A: No.** Skills with `context: fork` cover 100% of our use cases. Built-in subagents (Explore, Plan, general-purpose) handle explicit research tasks.

### Q: Why did custom agents fail?
**A:** Claude Code expects flat files (`agents/<name>.md`), but SpecWeave had subfolder structure (`agents/<name>/AGENT.md`). Skills don't have this limitation.

### Q: How do I invoke a skill explicitly?
**A:** Two ways:
1. **User**: Type `/sw-frontend:frontend-architect` in chat
2. **Claude**: Use `Skill({ skill: "sw-frontend:frontend-architect" })` when auto-activation didn't trigger

Usually just describe what you need - skills auto-activate on keywords. Use explicit invocation as fallback.

### Q: What about parallel execution?
**A:** Built-in subagents can run in parallel via multiple Task tool calls. Skills with `context: fork` also run in isolated contexts, so multiple can activate without conflict.

## Official Documentation

- **Skills**: https://code.claude.com/docs/en/skills
- **Subagents**: https://code.claude.com/docs/en/sub-agents
- **Features Overview**: https://code.claude.com/docs/en/features-overview
- **Best Practices**: https://code.claude.com/docs/en/best-practices

## Summary

1. **Skills are the only choice** for SpecWeave - no custom agents needed
2. **`context: fork`** gives isolated execution (subagent behavior)
3. **Auto-activation by keywords** is the primary mechanism
4. **Built-in subagents** (Explore, Plan, general-purpose) handle explicit research
5. **All 35 agents converted** to skills across all plugins
