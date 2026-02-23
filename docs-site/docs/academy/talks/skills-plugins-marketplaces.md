---
sidebar_position: 2
title: "Talk: Skills, Plugins & Marketplaces"
description: "Video talk clearing up the confusion around Claude Code skills, plugins, and marketplaces — with a practical SpecWeave example"
---

# Skills, Plugins & Marketplaces — Clearing the Confusion

There's a lot of confusion about how skills, plugins, and marketplaces work in Claude Code. This talk walks through the fundamentals with a practical example from SpecWeave and [verifiedskill.com](https://verifiedskill.com).

---

## Watch the Talk

<!-- TODO: Replace with actual YouTube video URL when published -->

*Coming soon — video will be embedded here once published.*

Subscribe to the [SpecWeave YouTube channel](https://www.youtube.com/@antonabyzov) for notifications.

---

## What's Covered

### The 4 Concepts Everyone Confuses

- **Skills** — a `SKILL.md` file with instructions for Claude (like an app)
- **Plugins** — a package bundling skills + agents + hooks (like an app bundle)
- **Marketplaces** — a JSON catalog listing available plugins (like an app store)
- **Commands** — the old name for skills (still works, same thing)

### The Files That Make It Work

- `SKILL.md` — frontmatter config + markdown instructions
- `.claude-plugin/plugin.json` — plugin identity (name, version, description)
- `.claude-plugin/marketplace.json` — catalog of plugins with download sources

### Practical Example: SpecWeave + vskill

How SpecWeave delivers 126 skills across 22 plugins through a single marketplace — with skill chaining, dynamic context injection, and on-demand loading.

---

## Key Takeaways

1. **Skill = markdown file** — it's just a `SKILL.md` with YAML frontmatter and instructions
2. **Plugin = package** — bundles skills, agents, hooks, and MCP servers with a `plugin.json`
3. **Marketplace = catalog** — a `marketplace.json` listing plugins and where to fetch them
4. **Two invocation modes** — you type `/skill-name`, or Claude auto-triggers based on the description
5. **Namespacing** — plugin skills become `/plugin:skill` to prevent conflicts
6. **On-demand loading** — plugins activate based on what you're working on, not all at once

---

## Deep Dive: Read the Guide

For the full written reference with code examples, diagrams, and SpecWeave internals:

**[Skills, Plugins & Marketplaces Explained](/docs/skills/fundamentals)** — the complete guide

---

## Official Claude Code Documentation

- [Skills](https://code.claude.com/docs/en/skills) — creating and configuring skills
- [Create Plugins](https://code.claude.com/docs/en/plugins) — building plugin packages
- [Discover & Install Plugins](https://code.claude.com/docs/en/discover-plugins) — browsing marketplaces
- [Create Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) — distributing plugins

---

## Related Resources

- [Extensible Skills Standard](/docs/skills/extensible/) — customizing skills for your project
- [Verified Skills Standard](/docs/skills/verified/) — evaluating skill security and trust
- [verifiedskill.com](https://verifiedskill.com) — the trusted skill registry
- [All 100+ SpecWeave Skills](/docs/reference/skills) — browse the complete catalog
