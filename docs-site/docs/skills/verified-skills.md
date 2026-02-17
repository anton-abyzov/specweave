---
title: "Verified Skills Standard"
description: "Three-tier trust certification for AI agent skills: Scanned, Verified, Certified — addressing the 36.82% flaw rate in public skill registries"
keywords: [verified-skills, v-skills, security, certification, trust, SKILL.md, ToxicSkills, verifiedskill.com]
---

# Verified Skills Standard

**A graduated security certification system for AI agent skills.**

---

## The Problem

AI agent skills execute with the full privileges of their host agent — filesystem access, terminal execution, and credential visibility. Yet skills are published to open registries with zero review.

Snyk's [ToxicSkills study](https://snyk.io/blog/toxicskills) (February 5, 2026) quantified the risk: scanning 3,984 skills from public registries, they found **1,467 (36.82%)** containing at least one security flaw, including **76 confirmed malicious payloads**. Real attacks include credential exfiltration (SSH keys, AWS tokens, crypto wallets), crypto miners, and prompt injection designed to persist across sessions via memory poisoning.

No existing platform had comprehensive security scanning. The Verified Skills Standard fills this gap.

For the full threat landscape, platform comparison, and risk taxonomy, see the [Skills Ecosystem Security](/docs/guides/skills-ecosystem-security) page.

---

## Three-Tier Certification

The standard defines three escalating levels of trust, each building on the previous tier.

### Tier 1: Scanned

**Automated pattern matching against 41 known-dangerous patterns across 9 categories.**

| Category | What It Catches |
|----------|----------------|
| Destructive commands | `rm -rf`, `DROP TABLE`, `format`, `dd`, `mkfs` |
| Remote code execution | `curl \| bash`, `wget \| bash`, `eval()`, `exec()`, `child_process` |
| Credential access | `~/.ssh/`, `~/.aws/`, wallet paths, `.env`, `credentials.json` |
| Prompt injection | `<system>` tags, "ignore previous instructions", role reassignment |
| Obfuscation | `atob`/`btoa`, `base64 -d`, hex sequences, password-protected archives |
| Memory poisoning | Writes to `SOUL.md`, `MEMORY.md`, `CLAUDE.md` |
| Data exfiltration | `curl --data`, encoded payloads in URL parameters |
| Dangerous permissions | `chmod 777`, unrestricted file access |
| Network access | `fetch()`, `http.get`, `axios`, hardcoded URLs |

- **Cost**: Free
- **Speed**: < 500ms
- **Output**: Pass/Fail with detailed findings by severity (critical, high, medium, low, info)

### Tier 2: Verified

**Everything in Tier 1 plus LLM-based semantic analysis for threats that pattern matching cannot catch.**

The LLM judge evaluates intent, not just syntax. It detects:

- **Social engineering** — "download and run this helper script"
- **Scope inflation** — declared scope says `src/` only, but behavior touches `~/`
- **Obfuscated intent** — indirect language that avoids triggering pattern rules
- **Multi-step attacks** — individually safe operations that compose into dangerous behavior
- **Chained skill attacks** — dependency chains that distribute trust across multiple skills

- **Cost**: ~$0.03 per skill
- **Speed**: 5-15 seconds
- **Output**: Score 0-100 with verdict (PASS >= 80, CONCERNS 60-79, FAIL < 60)

### Tier 3: Certified

**Everything in Tiers 1 and 2 plus human security review and sandbox testing.**

A professional security reviewer:
- Reads the full skill source code
- Tests behavior in a sandboxed environment
- Validates that declared scope matches actual behavior
- Checks for edge cases the automated tiers cannot catch

- **Cost**: $50-200 per skill
- **Speed**: 1-5 business days
- **Output**: Certification report with findings and recommendations

---

## Trust Badges and Labels

Skills display trust badges indicating their highest achieved certification tier:

| Badge | Meaning |
|-------|---------|
| **Scanned** | Passed 41-pattern automated scan |
| **Verified** | Passed automated scan + LLM intent analysis |
| **Certified** | Passed all tiers including human review |
| **Vendor** | Published by a trusted organization (Anthropic, OpenAI, Google, Vercel, Microsoft, Supabase) |

Additional labels provide context:

| Label | Meaning |
|-------|---------|
| `safe` | No network access, no filesystem writes outside declared scope |
| `extensible` | Supports DCI and skill memories ([Extensible Skills Standard](/docs/guides/extensible-skills)) |
| `portable` | Works across multiple AI agents |
| `popular` | High install count / community usage |
| `deprecated` | No longer maintained |
| `warning` | Known issues, use with caution |

---

## Mandatory SKILL.md Sections

To qualify for any certification tier, a SKILL.md file must include four sections:

1. **`description`** (frontmatter) — What the skill does and when it activates (10-1,024 characters)
2. **`## Scope`** — Languages, frameworks, tools, file patterns, and a "Does NOT" clause
3. **`## Permissions`** — Table of every tool permission with justification
4. **`## Security Notes`** — Data handling, network access, external dependencies

These sections make skill behavior transparent and auditable. The full specification with compliant examples is in the [Secure Skill Factory Standard RFC](/docs/guides/secure-skill-factory-standard).

---

## Forbidden Patterns

Certain patterns constitute **automatic disqualification** from any certification tier, regardless of context. These include:

- Code execution primitives (`eval()`, `exec()`, `Function()`, `child_process`)
- Remote code execution (`curl | bash`, `wget | bash`)
- Obfuscation (`atob`, `btoa`, base64 decode, hex sequences)
- Credential access (`~/.ssh/`, `~/.aws/`, wallet paths)
- Memory poisoning (writes to `SOUL.md`, `MEMORY.md`, `CLAUDE.md`)
- Data exfiltration (`curl --data`)
- Destructive commands (`rm -rf`, `DROP TABLE`, `format`, `dd`)

The complete list of 41 forbidden patterns across 9 categories is documented in the [Secure Skill Factory Standard RFC](/docs/guides/secure-skill-factory-standard#22-forbidden-patterns).

---

## verifiedskill.com

[verifiedskill.com](https://verifiedskill.com) is the trusted registry for AI agent skills. It provides:

- **Skill browsing** — Search and filter skills by category, verification tier, and compatible agents
- **Submission pipeline** — Submit your skill's GitHub repository for automated security verification
- **Trust badges** — SVG badges you can embed in your skill's README
- **Pre-verified skills** — Skills from major vendor repositories (Anthropic/Claude, OpenAI/Codex, Google/Gemini) are auto-verified and listed from day one

### `npx vskill` CLI

The `vskill` CLI provides command-line access to the registry:

```bash
# Search for skills
npx vskill search "react components"

# Get skill details with verification status
npx vskill info @anthropic/react-frontend

# Submit a skill for verification
npx vskill submit https://github.com/you/your-skill

# Check submission status
npx vskill status <submission-id>
```

:::note
verifiedskill.com is currently in development (see [increment 0225](https://github.com/anton-abyzov/specweave)). The CLI and registry features described above represent the planned functionality.
:::

---

## The Full Specification

This page provides a concise overview of the Verified Skills Standard. For the complete technical specification — including all 41 forbidden patterns, structural validation rules, vendor auto-verification logic, and backwards compatibility considerations — see the [Secure Skill Factory Standard RFC](/docs/guides/secure-skill-factory-standard).

---

## See Also

- **[Skills Overview](/docs/skills/)** — Both skill standards at a glance
- **[Extensible Skills Standard](/docs/guides/extensible-skills)** — How skills adapt to your project
- **[Security Landscape](/docs/guides/skills-ecosystem-security)** — Full ToxicSkills data and platform comparison
- **[Skill Discovery & Evaluation](/docs/guides/skill-discovery-evaluation)** — Where to find and evaluate skills
- **[verifiedskill.com](https://verifiedskill.com)** — The trusted skill registry
