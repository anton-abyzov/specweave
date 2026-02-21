---
title: "Extensible Skills Standard"
description: "The customization layer for AI agent skills — Open/Closed Principle, Dynamic Context Injection, skill memories, and self-improving AI"
keywords: [extensible-skills, open-closed-principle, skill-memories, DCI, customization, SKILL.md]
---

# Extensible Skills Standard

**The customization layer.** Extensible Skills apply the Open/Closed Principle from SOLID design to AI agent skills:

- **Closed for modification** — Core skill logic lives in `SKILL.md`, stable and tested
- **Open for extension** — Your project-specific rules live in `skill-memories/*.md`

Skills self-load their customizations using **Dynamic Context Injection (DCI)** — a shell one-liner that reads your preferences before the skill executes. Three-tier cascading lookup ensures project-level overrides take priority over global defaults.

The result: you correct Claude once ("use React Hook Form, not useState for forms"), and that preference is applied automatically in every future session.

---

## In This Section

### [The Standard (Open/Closed)](/docs/skills/extensible/extensible-skills)
The full specification — architecture, cascading lookup, DCI blocks, skill memory format, FAQ, and getting started guide.

### [Claude Skills Deep Dive](/docs/skills/extensible/claude-skills-deep-dive)
How skills work under the hood — progressive disclosure architecture, comparison with other AI tool systems, and the evolution from prompts to programs.

### [Self-Improving Skills (Reflect)](/docs/skills/extensible/self-improving-skills)
The Reflect system auto-learns from corrections and saves them to skill memories. Correct once, applied forever.

### [Development Guidelines](/docs/skills/extensible/skill-development-guidelines)
SOLID principles applied to skill authoring — how to design skills that users can extend without modification.

---

## See Also

- **[Skills Overview](/docs/skills/)** — Both skill standards at a glance
- **[Verified Skills Standard](/docs/skills/verified/)** — How skills earn trust through 3-tier security certification
- **[verifiedskill.com](https://verifiedskill.com)** — The trusted skill registry
