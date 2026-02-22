---
title: "Skills"
description: "SpecWeave defines two complementary standards for AI agent skills: Extensible Skills for customization and Verified Skills for trust"
keywords: [skills, extensible-skills, verified-skills, v-skills, standards, AI agent skills]
---

# Skills

AI agent skills are programs written in English — transparent markdown files that define how an AI coding agent behaves in specific domains. Unlike opaque tool integrations, skills are readable, auditable, and customizable.

SpecWeave defines **two complementary standards** that address the two fundamental questions every skill user faces:

1. **How do I make skills work for MY project?** — The Extensible Skills Standard
2. **How do I know a skill is safe to install?** — The Verified Skills Standard

---

## The Two Standards

### Extensible Skills Standard

**The customization layer.** Based on the Open/Closed Principle from SOLID design:

- **Closed for modification** — Core skill logic lives in `SKILL.md`, stable and tested
- **Open for extension** — Your project-specific rules live in `skill-memories/*.md`

Skills self-load their customizations using **Dynamic Context Injection (DCI)** — a shell one-liner that reads your preferences before the skill executes. Three-tier cascading lookup ensures project-level overrides take priority over global defaults.

The result: you correct Claude once ("use React Hook Form, not useState for forms"), and that preference is applied automatically in every future session. No reminders needed.

[Read the full Extensible Skills Standard](/docs/skills/extensible/)

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

The registry at [verifiedskill.com](https://verifiedskill.com) provides a trusted source for browsing and submitting skills, with the `vskill` CLI for command-line access (`npx vskill`, `bunx vskill`, `pnpx vskill`, or `yarn dlx vskill`).

[Read the full Verified Skills Standard](/docs/skills/verified/)

---

## How They Complement Each Other

```
                BEFORE INSTALL                    AFTER INSTALL
          ┌─────────────────────┐          ┌─────────────────────┐
          │  Verified Skills    │          │  Extensible Skills  │
          │  Standard           │          │  Standard           │
          │                     │          │                     │
          │  "Is this skill     │    ──►   │  "How do I make     │
          │   safe to use?"     │          │   this skill work   │
          │                     │          │   for MY project?"  │
          │  3-tier trust       │          │  DCI + memories     │
          └─────────────────────┘          └─────────────────────┘
```

A skill can be both **verified** (passed security certification) and **extensible** (customizable via skill memories). The standards address different stages of the skill lifecycle:

- **Verified Skills** answers: *Should I trust this skill?* — evaluated before installation
- **Extensible Skills** answers: *How do I adapt this skill?* — customized after installation

---

## Explore Further

- **[Extensible Skills Hub](/docs/skills/extensible/)** — All docs about customization, DCI, skill memories, and self-improving AI
- **[Verified Skills Hub](/docs/skills/verified/)** — All docs about security certification, trust tiers, and the skills ecosystem
- **[Skill Discovery & Evaluation](/docs/skills/skill-discovery-evaluation)** — Where to find skills and how to evaluate them
- **[Agent Compatibility](/docs/guides/agent-skills-extensibility-analysis)** — Skills across 39 AI coding agents
- **[All 100+ Skills](/docs/reference/skills)** — Complete SpecWeave skill catalog
- **[verifiedskill.com](https://verifiedskill.com)** — The trusted skill registry
