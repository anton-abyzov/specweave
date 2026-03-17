---
title: "Extensible Skills"
description: "The customization layer for AI agent skills — dynamic context injection, skill memories, and self-improving AI"
keywords: [extensible-skills, skill-memories, dynamic-context-injection, customization, SKILL.md]
---

# Extensible Skills

**The customization layer.** SpecWeave builds on Claude Code's native skill system with a clean separation:

- Core instructions live in `SKILL.md`, stable and versioned
- Your project-specific rules live in `skill-memories/*.md`

Skills self-load their customizations using **dynamic context injection** (Claude Code's built-in `` !`command` `` syntax) — a shell one-liner that reads your preferences before the skill executes. Skill memories are loaded from project, personal, and global directories, with project-level overrides taking priority over global defaults.

The result: you correct Claude once ("use React Hook Form, not useState for forms"), and that preference is applied automatically in every future session.

---

## In This Section

### [Extensible Skills Specification](/docs/skills/extensible/extensible-skills-standard)
The formal specification — extensibility category definitions, dynamic context injection specification, detection algorithm, and conformance requirements.

### [Implementation Guide](/docs/skills/extensible/extensible-skills-guide)
Practical how-to — getting started, architecture, cascading lookup, real-world examples, skill memory format, and FAQ.

### [Customization Without Modification](/docs/skills/extensible/extensible-skills)
Overview page with quick reference table and links to the specification and guide.

### [Claude Skills Deep Dive](/docs/skills/extensible/claude-skills-deep-dive)
How skills work under the hood — progressive disclosure architecture, comparison with other AI tool systems, and the evolution from prompts to programs.

### [Self-Improving Skills (Reflect)](/docs/skills/extensible/self-improving-skills)
The Reflect system auto-learns from corrections and saves them to skill memories. Correct once, applied forever.

### [Development Guidelines](/docs/skills/extensible/skill-development-guidelines)
Design principles for skill authoring — how to design skills that users can extend without modification.

---

## See Also

- **[Skills Overview](/docs/skills/)** — Both skill layers at a glance
- **[Verified Skills Standard](/docs/skills/verified/)** — How skills earn trust through 3-tier security certification
- **[verified-skill.com](https://verified-skill.com)** — The trusted skill registry
