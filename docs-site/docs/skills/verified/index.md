---
title: "Verified Skills Standard"
description: "The trust layer for AI agent skills — three-tier security certification addressing the 36.82% flaw rate in public skill registries"
keywords: [verified-skills, v-skills, security, certification, trust, ToxicSkills, verifiedskill.com]
---

# Verified Skills Standard

**The trust layer.** A graduated security certification system that filters dangerous skills before they reach your codebase.

Snyk's ToxicSkills study (February 2026) found that **36.82% of 3,984 publicly available skills** contained security flaws, including 76 confirmed malicious payloads. The Verified Skills Standard introduces three-tier certification:

| Tier | Method | Cost | Speed |
|------|--------|------|-------|
| **Scanned** | 52 pattern checks + structural validation | Free | < 500ms |
| **Verified** | Tier 1 + LLM intent analysis | ~$0.03/skill | 5-15s |
| **Certified** | Tiers 1+2 + human security review + sandbox | $50-200/skill | 1-5 days |

The registry at [verifiedskill.com](https://verifiedskill.com) provides a trusted source for browsing and submitting skills, with the `npx vskill` CLI for command-line access.

---

## In This Section

### [The Standard (3-Tier Trust)](/docs/skills/verified/verified-skills)
The full overview — three certification tiers, trust badges, mandatory SKILL.md sections, forbidden patterns, and the verifiedskill.com registry.

### [Skill Factory RFC (Full Spec)](/docs/skills/verified/secure-skill-factory-standard)
The complete technical specification — all 41 forbidden patterns, structural validation rules, vendor auto-verification logic, and backwards compatibility.

### [Security Landscape](/docs/skills/verified/skills-ecosystem-security)
Platform comparison, ToxicSkills data, risk taxonomy, threat actors, and real-world attack examples across the skills ecosystem.

---

## See Also

- **[Skills Overview](/docs/skills/)** — Both skill standards at a glance
- **[Extensible Skills Standard](/docs/skills/extensible/)** — How skills adapt to your project through customization
- **[verifiedskill.com](https://verifiedskill.com)** — The trusted skill registry
