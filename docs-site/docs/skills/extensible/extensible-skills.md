---
title: "Extensible Skills: Customization Without Modification"
description: "How SpecWeave makes AI skills transparent, customizable, and extensible"
date: "2026-02-21"
authors: ["Anton Abyzov"]
tags: ["extensible-skills", "skill-memories", "dynamic-context-injection", "customization"]
---

# Extensible Skills: Customization Without Modification

**Making AI tools transparent, customizable, and extensible**

The Extensible Skills documentation has been split into two documents for clarity:

---

## Formal Specification (Normative)

The **[Extensible Skills Specification](/docs/skills/extensible/extensible-skills-standard)** defines:

- **Three extensibility categories** -- extensible, semi-extensible, not-extensible
- **Dynamic context injection specification** -- Syntax, execution model, and graceful degradation
- **Detection algorithm** -- How categories are determined from SKILL.md content
- **Conformance requirements** -- What registries must implement

---

## Implementation Guide (Informative)

The **[Implementation Guide](/docs/skills/extensible/extensible-skills-guide)** covers:

- **Getting started** -- For Claude Code users and SpecWeave users
- **Architecture** -- Cascading lookup, injection blocks, and the Reflect system
- **Real-world examples** -- How corrections become persistent preferences
- **Skill memory format** -- Structured Markdown for customizations
- **FAQ** -- Common questions and troubleshooting

---

## Quick Reference

| Category | Meaning | Detection |
|---|---|---|
| **Extensible** | Injection block with skill-memories. Standard, discoverable customization. | Injection block referencing `skill-memories` |
| **Semi-Extensible** | Mentions customization but not through the standard system. | Keyword signals or injection block without skill-memories |
| **Not Extensible** | No customization mechanism. Fork to change. | No signals detected |

---

## See Also

- **[Skills Overview](/docs/skills/)** -- Both skill layers at a glance
- **[Claude Skills Deep Dive](/docs/skills/extensible/claude-skills-deep-dive)** -- How skills work under the hood
- **[Self-Improving Skills](/docs/skills/extensible/self-improving-skills)** -- The Reflect auto-learning system
- **[Development Guidelines](/docs/skills/extensible/skill-development-guidelines)** -- Design principles for skill authoring
- **[Verified Skills Standard](/docs/skills/verified/verified-skills)** -- How skills earn trust through 3-tier security certification

---

**Version**: 4.0.0
**Authors**: Anton Abyzov
**License**: MIT
