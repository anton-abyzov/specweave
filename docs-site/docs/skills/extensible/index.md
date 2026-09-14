---
title: "Extensible Skills"
description: "The customization layer for AI agent skills — skill memories, dynamic context injection, and self-improving AI"
keywords: [extensible-skills, skill-memories, dynamic-context-injection, customization, SKILL.md]
---

# Extensible Skills

**The customization layer.** SpecWeave builds on Claude Code's native skill system with a clean separation:

- Core instructions live in `SKILL.md`, stable and versioned
- Your project-specific rules live in `skill-memories/*.md`

Skills self-load their customizations through **plain LLM instructions** embedded in SKILL.md — a cross-platform approach that tells the skill to read your preferences before executing. No shell execution is required. A typical instruction looks like:

> **Skill Memories**: If `.specweave/skill-memories/{skill-name}.md` exists, read and apply its learnings.

This replaces the previous shell-based dynamic context injection (DCI) approach for skill memories. DCI (Claude Code's `` !`command` `` syntax) is still used for other purposes like loading skill context or PR diffs, but skill memories now use instruction-based loading for better cross-platform compatibility.

A skill that explicitly reads a project preference file can reuse those instructions. That depends on the skill and harness loading the file; this pattern does not guarantee automatic learning or application in every future session.

---

## In This Section

### [Extensible Skills Specification](/docs/skills/extensible/extensible-skills-standard)
The formal specification — extensibility category definitions, dynamic context injection specification, detection algorithm, and conformance requirements.

### Implementation Guide (historical reference; not published)
The separate how-to document for the earlier skill-memories architecture is unavailable. This section does not supply its setup instructions or FAQ.

### [Customization Without Modification](/docs/skills/extensible/extensible-skills)
Overview page with a quick reference table and a link to the published specification.

### Claude Skills Deep Dive (historical reference; not published)
How skills work under the hood — progressive disclosure architecture, comparison with other AI tool systems, and the evolution from prompts to programs.

### Self-Improving Skills (Reflect; historical reference, not published)
Earlier auto-learning design. It is not a current SpecWeave 2.1 lifecycle guarantee; see the [current skills reference](/docs/reference/skills).

### [Development Guidelines](/docs/skills/extensible/skill-development-guidelines)
Design principles for skill authoring — how to design skills that users can extend without modification.

---

## See Also

- **[Skills Overview](/docs/skills/)** — Both skill layers at a glance
- **[Verified Skills Standard](/docs/skills/verified/)** — How skills earn trust through 3-tier security certification
- **[verified-skill.com](https://verified-skill.com)** — The trusted skill registry
