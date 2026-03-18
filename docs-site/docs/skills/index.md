---
title: "Skills"
description: "SpecWeave adds two complementary layers to the AI agent skill ecosystem: Extensible Skills for customization and Verified Skills for trust"
keywords: [skills, extensible-skills, verified-skills, v-skills, standards, AI agent skills]
---

# Skills

Skills extend what AI coding agents can do -- structured markdown files that define how an agent behaves in specific domains. Unlike opaque tool integrations, skills are readable, auditable, and customizable.

:::tip Three Ways to Use Any Skill
Every skill supports three invocation methods:
1. **Natural language** -- just describe what you need (e.g., "design the system architecture")
2. **Slash command** -- `/sw:skill-name` in Claude Code (e.g., `/sw:architect`)
3. **CLI keyword** -- `skill-name` in Cursor, Copilot, and other AI tools (e.g., `architect`)

Start with **[Skills, Plugins & Marketplaces Explained](/docs/skills/fundamentals)** for a deeper guide.
:::

SpecWeave adds **two complementary layers** to the skill ecosystem, addressing the two fundamental questions every skill user faces:

1. **How do I make skills work for MY project?** — Extensible Skills
2. **How do I know a skill is safe to install?** — Verified Skills

---

## The Two Layers

### Extensible Skills

**The customization layer.** SpecWeave builds on Claude Code's native skill system with a clean separation:

- Core instructions live in `SKILL.md`, stable and versioned
- Your project-specific rules live in `skill-memories/*.md`

Skills self-load their customizations using **dynamic context injection** (Claude Code's built-in `` !`command` `` syntax) — a shell one-liner that reads your preferences before the skill executes. Skill memories are loaded from project, personal, and global directories, with project-level overrides taking priority over global defaults.

The result: you correct Claude once ("use React Hook Form, not useState for forms"), and that preference is applied automatically in every future session. No reminders needed.

[Read more about Extensible Skills](/docs/skills/extensible/)

---

### Verified Skills Standard (V-Skills)

**The trust layer.** A graduated security certification system that filters dangerous skills before they reach your codebase.

Snyk's ToxicSkills study (February 2026) found that **36.82% of 3,984 publicly available skills** contained security flaws, including 76 confirmed malicious payloads — credential theft, crypto miners, and prompt injection designed to persist across sessions. No existing platform had meaningful security scanning.

The Verified Skills Standard introduces **three-tier certification**:

| Tier | Method | Cost | Speed |
|------|--------|------|-------|
| **Scanned** | 52 pattern checks + structural validation | Free | < 500ms |
| **Verified** | Tier 1 + LLM intent analysis | ~$0.03/skill | 5-15s |
| **Certified** | Tiers 1+2 + human security review + sandbox | $50-200/skill | 1-5 days |

The registry at [verified-skill.com](https://verified-skill.com) provides a trusted source for browsing and submitting skills, with the `vskill` CLI for command-line access (`npx vskill`, `bunx vskill`, `pnpx vskill`, or `yarn dlx vskill`).

[Read the full Verified Skills Standard](/docs/skills/verified/)

---

## How They Complement Each Other

```
                BEFORE INSTALL                    AFTER INSTALL
          ┌─────────────────────┐          ┌─────────────────────┐
          │  Verified Skills    │          │  Extensible Skills  │
          │                     │          │                     │
          │                     │          │                     │
          │  "Is this skill     │    ──►   │  "How do I make     │
          │   safe to use?"     │          │   this skill work   │
          │                     │          │   for MY project?"  │
          │  3-tier trust       │          │  Injection +        │
          │                     │          │  memories           │
          └─────────────────────┘          └─────────────────────┘
```

A skill can be both **verified** (passed security certification) and **extensible** (customizable via skill memories). These layers address different stages of the skill lifecycle:

- **Verified Skills** answers: *Should I trust this skill?* — evaluated before installation
- **Extensible Skills** answers: *How do I adapt this skill?* — customized after installation

---

## Explore Further

- **[Installing Skills](/docs/skills/installation)** — Find, install, and manage skills with the `vskill` CLI
- **[Skill Studio](/docs/skills/skill-studio)** — Develop and test skills locally in a browser-based IDE
- **[Extensible Skills Hub](/docs/skills/extensible/)** — All docs about customization, dynamic context injection, skill memories, and self-improving AI
- **[Verified Skills Hub](/docs/skills/verified/)** — All docs about security certification, trust tiers, and the skills ecosystem
- **[Skill Discovery & Evaluation](/docs/skills/skill-discovery-evaluation)** — Where to find skills and how to evaluate them
- **[vskill CLI Reference](/docs/skills/vskill-cli)** — Complete command reference for the skill package manager
- **[Agent Compatibility](/docs/guides/agent-skills-extensibility-analysis)** — Skills across 49 AI coding agents
- **[All 100+ Skills](/docs/reference/skills)** — Complete SpecWeave skill catalog
- **[verified-skill.com](https://verified-skill.com)** — The trusted skill registry
