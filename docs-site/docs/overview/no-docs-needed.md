---
sidebar_position: 3
title: "You Don't Need to Learn Claude Code"
description: "SpecWeave abstracts Claude Code's complexity. Install, use skills, get results — no hooks, plugins, or CLAUDE.md knowledge required."
---

# You Don't Need to Learn Claude Code

Claude Code is powerful. It's also complex — hooks, plugins, CLAUDE.md files, context management, MCP servers, custom slash commands, permission modes.

**You don't need to learn any of that.**

SpecWeave sits on top of Claude Code and handles the complexity for you. Think of it as the difference between writing assembly and writing Python — same machine, radically different experience.

## What SpecWeave Handles For You

| Claude Code Concept | What You'd Need to Learn | SpecWeave Approach |
|---|---|---|
| **Hooks** | Shell scripts, event lifecycle, JSON config | Skills auto-configure hooks during `init` |
| **CLAUDE.md** | Project instructions, formatting rules | Auto-generated and maintained by SpecWeave |
| **Plugins** | Installation, marketplace, version management | Auto-loaded based on your project's tech stack |
| **Context management** | Token budgets, file references, compression | Specs persist in files — zero context loss |
| **Custom commands** | Markdown files, frontmatter, directory structure | 100+ skills ready to use out of the box |
| **MCP servers** | Transport protocols, server configuration | CLI tools used first; MCP when needed |

## The Experience

**Without SpecWeave:**
```
1. Read Claude Code docs (30+ pages)
2. Configure hooks for your workflow
3. Write CLAUDE.md with project instructions
4. Set up plugins for your tech stack
5. Create custom commands for repeated tasks
6. Manage context across sessions manually
7. Hope the AI remembers what you told it last time
```

**With SpecWeave:**
```bash
npm install -g specweave
specweave init .
/sw:increment "Add dark mode"
/sw:auto
# Done. AI handles everything.
```

## How It Works Under the Hood

SpecWeave uses Claude Code's extension points (hooks, plugins, CLAUDE.md) to create a higher-level experience. When you run `specweave init`:

1. **Hooks** are configured to enforce quality gates, TDD discipline, and progress tracking
2. **CLAUDE.md** is generated with your project's conventions and SpecWeave workflow rules
3. **Plugins** auto-load based on your `package.json`, `requirements.txt`, or other project files
4. **Skills** become available as `/sw:*` commands — each one a reusable program

You interact with skills. Skills interact with Claude Code. You never need to touch the plumbing.

## When You Might Want to Learn More

SpecWeave covers 95% of use cases out of the box. You might want to dig deeper if you:

- Want to **create custom skills** for your team — see [Skill Development Guidelines](../guides/skill-development-guidelines)
- Need to **customize existing skills** — see [Extensible Skills](../guides/extensible-skills)
- Are debugging **hook behavior** — see [Troubleshooting](../guides/troubleshooting/common-errors)

But for building features? Just describe what you want and let SpecWeave handle the rest.
