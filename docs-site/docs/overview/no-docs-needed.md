---
sidebar_position: 3
title: "Start Building in Minutes"
description: "Describe what you want, SpecWeave handles planning, architecture, testing, and documentation. From idea to production in minutes."
---

import CommandTabs from '@site/src/components/CommandTabs';

# Start Building in Minutes

Structured AI development sounds like overhead — specs, architecture reviews, quality gates, documentation. It sounds like *more work*, not less.

SpecWeave makes it the path of least resistance.

```bash
npm install -g specweave
specweave init .
```

Then just describe what you want:

<CommandTabs
  natural="Add dark mode with system preference detection"
  claude='sw:increment "Add dark mode with system preference detection"'
  other='increment "Add dark mode with system preference detection"'
/>

<CommandTabs
  natural="Start implementing"
  claude="sw:do"
  other="do"
/>

Spec written. Architecture designed. Tests passing. Docs updated.

Describe the feature — SpecWeave handles planning, implementation, testing, and documentation.

## What You Get on Day One

| Capability | What It Does |
|---|---|
| **Spec-driven planning** | Every feature starts with requirements, acceptance criteria, and architecture — persisted in version-controlled files that survive across sessions |
| **Autonomous execution** | Multi-agent coordination: PM writes specs, Architect designs, Planner breaks down tasks, Engineers implement with tests |
| **Quality gates** | Automated code review, TDD enforcement, and 130+ validation checks run before any feature ships |
| **Living documentation** | Docs auto-generate and stay current as your codebase evolves — no manual upkeep |
| **Built-in skills** | ~48 packaged workflows for planning, testing, debugging, releases, and more — ready to use out of the box |
| **External sync** | Bidirectional sync with GitHub Issues, JIRA, and Azure DevOps — progress flows automatically |
| **Context persistence** | Specs, plans, and decisions persist in files. No re-explaining. No lost context between sessions |

## The Experience

**Without structure** (how most teams use AI today):
```
1. Describe feature in chat
2. AI generates code — it works
3. No tests, no docs, no traceability
4. Session ends — decisions vanish
5. Next session: re-explain everything from scratch
6. New team member joins — zero context
7. "Why did we use JWT instead of sessions?" — nobody remembers
```

**With SpecWeave:**
```
1. Describe feature
2. Spec written with acceptance criteria
3. Architecture designed and documented
4. Tasks generated with test plans
5. Implemented with tests at every step
6. Quality-gated before completion
7. Living docs updated, synced to GitHub/JIRA
```

Same AI tools. Radically different outcomes.

## How It Works

When you run `specweave init`, SpecWeave configures your AI coding environment with structured workflows, quality enforcement, and persistent context. It works with Claude Code, Cursor, Copilot, and other AI coding tools.

From there, skills handle everything. Each skill packages domain expertise into a reusable workflow — you don't need to learn the underlying tool mechanics. You interact with skills. Skills interact with your AI tool. You never touch the plumbing.

For the full methodology, see [Philosophy](./philosophy). For why this matters, see [Why SpecWeave?](./why-specweave).

## When You Might Want to Go Deeper

SpecWeave covers the vast majority of workflows out of the box. You might want to dig deeper if you:

- Want to **create custom skills** for your team — see [Skill Development Guidelines](../skills/skill-development-guidelines)
- Need to **customize existing skills** — see [Extensible Skills](../skills/extensible-skills)
- Are debugging **unexpected behavior** — see [Troubleshooting](../guides/troubleshooting/common-errors)

But for building features? Describe what you want and let SpecWeave handle the rest.
