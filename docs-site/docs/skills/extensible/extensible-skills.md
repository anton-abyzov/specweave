---
title: "Extensible Skills: The Open/Closed Principle for AI"
description: "How SpecWeave makes AI skills transparent, customizable, and extensible using the Open/Closed Principle"
date: "2026-02-21"
authors: ["Anton Abyzov"]
tags: ["extensible-skills", "open-closed-principle", "skill-memories", "DCI", "customization"]
---

# Extensible Skills: The Open/Closed Principle for AI

**Making AI tools transparent, customizable, and extensible**

The Extensible Skills Standard has been split into two documents for clarity:

---

## Formal Standard (Normative)

The **[Extensible Skills Standard](/docs/skills/extensible/extensible-skills-standard)** defines:

- **Tier model (E0-E4)** -- Five levels of extensibility from "not extensible" to "DCI + auto-learning"
- **DCI specification** -- Syntax, execution model, and graceful degradation
- **Frontmatter schema** -- Structured extensibility declarations in YAML
- **Agent portability matrix** -- Which mechanisms work with which agents
- **Detection algorithm** -- How tiers are determined from SKILL.md content
- **Conformance requirements** -- What registries must implement

---

## Implementation Guide (Informative)

The **[Implementation Guide](/docs/skills/extensible/extensible-skills-guide)** covers:

- **Getting started** -- For Claude Code users and SpecWeave users
- **Architecture** -- Cascading lookup, DCI blocks, and the Reflect system
- **Real-world examples** -- How corrections become persistent preferences
- **Skill memory format** -- Structured Markdown for customizations
- **FAQ** -- Common questions and troubleshooting

---

## Quick Reference

| Tier | Name | Mechanism | Portability |
|---|---|---|---|
| E0 | Not Extensible | None | N/A |
| E1 | Declarative | Keywords in prose | All agents |
| E2 | Frontmatter-Declared | YAML `extensibility:` | YAML-reading agents |
| E3 | DCI-Verified | Shell block in SKILL.md | Claude Code |
| E4 | DCI + Auto-Learning | DCI + Reflect | Claude Code |

---

## See Also

- **[Skills Overview](/docs/skills/)** -- Both skill standards at a glance
- **[Claude Skills Deep Dive](/docs/skills/extensible/claude-skills-deep-dive)** -- How skills work under the hood
- **[Self-Improving Skills](/docs/skills/extensible/self-improving-skills)** -- The Reflect auto-learning system
- **[Development Guidelines](/docs/skills/extensible/skill-development-guidelines)** -- SOLID principles for skill authoring
- **[Verified Skills Standard](/docs/skills/verified/verified-skills)** -- How skills earn trust through 3-tier security certification

---

**Version**: 3.0.0
**Authors**: Anton Abyzov
**License**: MIT
