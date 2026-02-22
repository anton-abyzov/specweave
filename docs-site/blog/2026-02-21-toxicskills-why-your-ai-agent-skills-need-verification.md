---
slug: toxicskills-why-your-ai-agent-skills-need-verification
title: "36% of AI Agent Skills Have Security Flaws — Here's What You Can Do About It"
authors: [antonabyzov]
tags: [security, verified-skills, ToxicSkills, supply-chain, Snyk]
description: "Snyk's ToxicSkills study found 1,467 flawed skills out of 3,984 scanned. 76 contained confirmed malicious payloads. We tested SpecWeave's scanner against the worst of them."
keywords: [ToxicSkills, Snyk, AI agent security, skill verification, supply chain attack, Claude Code, verified skills]
---

# 36% of AI Agent Skills Have Security Flaws

On February 5, 2026, Snyk Labs published the [ToxicSkills study](https://snyk.io/blog/toxicskills) — the first large-scale security audit of AI agent skills. They scanned **3,984 publicly listed skills** across every major registry. The results should concern every developer using AI agents.

**1,467 skills (36.82%)** contained at least one security flaw. Of those, **76 contained confirmed malicious payloads** — not accidental overpermissions, but deliberate credential theft, reverse shells, and data exfiltration.

<!-- truncate -->

## What Makes Skills Dangerous

AI agent skills are not sandboxed plugins. They are markdown files that execute with the **full privileges of the host agent** — filesystem access, terminal execution, network requests, and credential visibility. When you install a skill, you are handing an AI agent instructions that it will follow implicitly.

The attack surface is wide:

- **Credential theft**: Skills that read `~/.ssh/`, `~/.aws/credentials`, and crypto wallet files, then exfiltrate them via `curl --data` to attacker-controlled servers
- **Reverse shells**: Base64-obfuscated payloads piped to `bash`, giving attackers persistent remote access
- **Memory poisoning**: Skills that silently modify `CLAUDE.md` or `MEMORY.md`, injecting persistent instructions that survive across sessions
- **Social engineering**: Natural-language instructions like "download and run this helper tool" that trick the agent into executing malware

The Snyk study identified **five named threat actors** operating across multiple platforms simultaneously. This is not hypothetical — it is an active, coordinated campaign.

## The Platform Problem

Most skill platforms offer no defense. Snyk found that the majority of registries — including some of the most popular — have **zero automated security scanning** at the point of publication.

The ClawHub collapse illustrated the consequences. In early 2026, researchers discovered [341+ malicious skills](/docs/guides/why-verified-skill-matters) on the platform. Five of the top seven most-downloaded skills were malware. The platform is now shut down.

Skills.sh, the most popular community registry with listings reaching 234K+ installs, has no automated scanning. Smithery learned the hard way after a path traversal vulnerability exposed data for over 3,000 MCP servers. The full [platform comparison](/docs/skills/verified/skills-ecosystem-security#platform-comparison) is sobering reading.

## We Tested Our Scanner Against ToxicSkills

After the Snyk study dropped, we ran SpecWeave's security scanner against samples from the [snyk-labs/toxicskills-goof](https://github.com/snyk-labs/toxicskills-goof) repository — real malicious skills collected during the research.

**Tier 1 (pattern scanning) results:**

| Sample | Verdict | Findings |
|--------|---------|----------|
| clawhub/skill.md | BLOCKED | 2 critical — base64-obfuscated `curl \| bash` payload |
| vercel/SKILL.md (.agents) | BLOCKED | 2 high — `curl --data` exfiltration of host info |
| vercel/SKILL.md (.gemini) | BLOCKED | 2 high — `curl --data` exfiltration of host info |
| google/SKILL.md | PASS | Social engineering in natural language (no shell syntax) |

Tier 1 caught **3 out of 4** samples — 75% detection through pattern matching alone, running in under 500ms per skill.

The fourth sample used pure social engineering: natural-language instructions directing users to download and run a binary from GitHub releases. No shell commands, no suspicious syntax — just "download this, extract with password, and run."

**Tier 2 (LLM judge) caught it.** When Tier 1 passes a skill, Tier 2 evaluates semantic intent. The LLM judge identified the social engineering pattern and flagged it as malicious.

**Combined detection rate: 4/4 — 100% against the tested samples.**

## Three Tiers of Trust

SpecWeave's [Verified Skills Standard](/docs/skills/verified/verified-skills) defines three escalating levels of certification:

1. **Scanned** — 52 pattern rules across 9 categories. Free. Under 500ms. Catches obfuscation, credential access, destructive commands, prompt injection, and more.
2. **Verified** — LLM-based semantic analysis on top of pattern scanning. ~$0.03 per skill. Catches social engineering, scope inflation, and multi-step attacks.
3. **Certified** — Human security review plus sandbox testing. $50-200. For high-trust, widely-used skills.

Every skill published to [verifiedskill.com](https://verifiedskill.com) passes at least Tier 1 before it reaches any developer. Skills that fail are rejected with detailed findings explaining exactly what was flagged and why.

The scanning methodology is fully transparent. The [52 patterns](docs/skills/secure-skill-factory-standard) are documented. The detection categories are public. Developers can understand exactly what the scanner checks and make informed decisions about trust.

## What You Should Do

If you are using AI agent skills today:

1. **Check your installed skills.** Review the source of every skill you have installed. Look for shell commands, network requests, and file access patterns you did not expect.
2. **Prefer verified sources.** Use skills from registries that scan submissions before publication, not after (or never).
3. **Run `vskill scan`** on any community skill before installing it. The Tier 1 scanner is free and takes under a second.

The full [security landscape analysis](/docs/skills/verified/skills-ecosystem-security) covers the threat taxonomy, platform comparison, and detailed recommendations.

The skill ecosystem is growing fast. Making sure it grows safely is not optional.

---

*The Snyk ToxicSkills study is available at [snyk.io/blog/toxicskills](https://snyk.io/blog/toxicskills). SpecWeave's scanner test results are based on samples from [snyk-labs/toxicskills-goof](https://github.com/snyk-labs/toxicskills-goof). The verified skills registry is at [verifiedskill.com](https://verifiedskill.com).*
