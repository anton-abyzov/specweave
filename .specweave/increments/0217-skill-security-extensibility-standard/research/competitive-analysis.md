# Competitive Analysis: AI Skill Scanning & Verification Tools

**Date**: 2026-02-15
**Researcher**: research-security agent
**Scope**: 8+ tools/platforms for skill security scanning, with gap analysis for verified-skill.com

---

## Executive Summary

The AI skill security scanning landscape is **fragmented and immature**. No single tool or platform provides comprehensive, multi-tier verification combining static analysis, LLM-based intent analysis, human review, version tracking, and continuous monitoring. Snyk's acquisition of Invariant Labs (mcp-scan) represents the strongest technical offering, but operates as a scanner-only tool without a registry/directory component. SkillsDirectory.com is the only competitor attempting directory + scanning, but its 94.4% Grade-A rate raises questions about depth. This creates a clear market opportunity for **verified-skill.com** as the first platform combining verification pipeline, version-pinned badges, and a curated registry.

---

## 1. Tool-by-Tool Analysis

### 1.1 Snyk agent-scan (formerly Invariant Labs mcp-scan)

| Attribute | Details |
|-----------|---------|
| **URL** | [github.com/snyk/agent-scan](https://github.com/snyk/agent-scan) |
| **Type** | CLI security scanner |
| **License** | Apache 2.0 (open source) |
| **Approach** | Hybrid: static analysis + LLM-based intent analysis |
| **Install** | `pip install mcp-scan` (PyPI) |
| **Version** | 0.4 (released Feb 5, 2026) |
| **Status** | Invariant Labs acquired by Snyk (Jan 2026) |

**What It Scans**:
- Tool poisoning attacks (malicious tool descriptions)
- Rug pull attacks (post-install behavior changes)
- Cross-origin escalation (privilege escalation across tools)
- Toxic flows (unsafe data movement patterns)
- Prompt injection in tool definitions

**Two Operational Modes**:
1. **Static Scan** (`mcp-scan scan`): Analyzes tool descriptions and metadata for known malicious patterns
2. **Proxy Mode** (`mcp-scan proxy`): Runtime monitoring with tool call checking, data flow constraints, PII detection

**Strengths**:
- Backed by Snyk's security research team and ToxicSkills dataset
- LLM-based intent analysis goes beyond regex pattern matching
- Runtime proxy mode for continuous protection
- Open source with active development

**Limitations**:
- Scanner only — no directory, registry, or badge system
- No version-pinned verification
- No submission pipeline or certification
- Python-only CLI (no npm/Node.js native support)
- Hosted Explorer shut down Jan 2026

**Source**: [Invariant Blog](https://invariantlabs.ai/blog/introducing-mcp-scan) | [PyPI](https://pypi.org/project/mcp-scan/)

---

### 1.2 Cisco Skill Scanner

| Attribute | Details |
|-----------|---------|
| **URL** | [github.com/cisco-ai-defense/skill-scanner](https://github.com/cisco-ai-defense/skill-scanner) |
| **Type** | Multi-layer security scanner |
| **License** | Apache 2.0 (open source) |
| **Approach** | Static + behavioral + LLM-assisted + VirusTotal |
| **Backed by** | Cisco AI Defense |

**What It Scans**:
- Static pattern analysis (SAST-style)
- Behavioral code threat analysis (compares documented intent vs actual behavior)
- LLM-assisted semantic analysis
- VirusTotal integration for known malware signatures
- Cisco AI Defense inspection workflows

**Strengths**:
- Enterprise-backed (Cisco)
- Multi-layered approach (not just regex)
- Behavioral analysis catches intent mismatches
- VirusTotal integration for known threats

**Limitations (per Snyk critique)**:
- Static analysis alone cannot catch "the infinite variability of language"
- Denylist approaches are "a losing battle against the infinite corpus of natural language"
- Does not provide registry, directory, or certification
- Enterprise-focused (not community-accessible scanning)

**Cisco also ships**: [mcp-scanner](https://github.com/cisco-ai-defense/mcp-scanner) — a separate tool for MCP server-level scanning with behavioral code threat analysis

**Source**: [Cisco AI Defense Blog](https://blogs.cisco.com/ai/ciscos-mcp-scanner-introduces-behavioral-code-threat-analysis) | [GitHub](https://github.com/cisco-ai-defense/skill-scanner)

---

### 1.3 SkillsDirectory.com

| Attribute | Details |
|-----------|---------|
| **URL** | [skillsdirectory.com](https://www.skillsdirectory.com/) |
| **Type** | Directory + scanning platform |
| **Scale** | 36,109 skills |
| **Scanning** | 50+ rules, 10 threat categories |
| **Trust System** | Letter grades (A-F) |
| **CLI** | `npm install -g openskills` |
| **Tech Stack** | Next.js, React, Cloudflare R2 |

**What It Scans**:
- Prompt injection attacks
- Credential theft patterns
- Data exfiltration risks
- Malware signatures
- 10 distinct threat categories

**Grade Distribution**:
| Grade | Count | % |
|-------|-------|---|
| A | 34,092 | 94.4% |
| B | 1,201 | 3.3% |
| C | 576 | 1.6% |
| D | 156 | 0.4% |
| F | 84 | 0.2% |

**Strengths**:
- Largest curated skill directory (36K+)
- Pre-publish review ("All submissions are reviewed before being published")
- Letter-grade trust system is user-friendly
- CLI installation support

**Limitations**:
- 94.4% Grade-A rate seems too lenient compared to Snyk's 36.82% ecosystem flaw rate
- No LLM-based analysis (appears to be rule-based only)
- No version-pinned verification
- No continuous re-scanning
- Scanning methodology not publicly documented
- No open source component

**Assessment**: Closest competitor to verified-skill.com, but likely shallow scanning. The gap between their 94.4% Grade-A rate and Snyk's 36.82% flaw rate is a major credibility concern.

---

### 1.4 pors/skill-audit

| Attribute | Details |
|-----------|---------|
| **URL** | [github.com/pors/skill-audit](https://github.com/pors/skill-audit) |
| **Type** | CLI security auditing tool |
| **License** | Open source |
| **Approach** | Static analysis with plugin architecture |

**What It Scans**:
- Prompt injection detection
- Secret scanning (hardcoded API keys, tokens, credentials)
- Shell script analysis
- Code security patterns
- SARIF output for CI/CD integration

**Strengths**:
- Extensible plugin architecture
- SARIF output format (industry standard for CI/CD integration)
- Focused on agent skills specifically
- Lightweight CLI tool

**Limitations**:
- No LLM-based analysis
- No directory or registry component
- No version tracking
- Small community / limited adoption
- No runtime monitoring

---

### 1.5 SkillGuard (Cautionary Example)

| Attribute | Details |
|-----------|---------|
| **Status** | **MALICIOUS** — flagged by Snyk |

**Key Finding**: SkillGuard was itself malicious. According to Snyk's research, it "attempted to install a payload under the guise of updating definitions." This demonstrates the **"who audits the auditors?"** problem — security tools in the agent ecosystem can themselves be attack vectors.

**Implication for verified-skill.com**: The scanner itself must be trustworthy. Open source with transparent scanning methodology is essential.

---

### 1.6 Skill Defender (Cautionary Example)

| Attribute | Details |
|-----------|---------|
| **Status** | **UNRELIABLE** — critical false negatives |

**Key Finding**: When tested against a malicious "vercel" deployment skill designed to exfiltrate hostnames, Skill Defender returned **"CLEAN. 0 findings"** while simultaneously flagging itself as **"DANGEROUS. 20 findings"** — the "Antivirus Paradox."

**Implication**: Simple pattern-matching scanners produce dangerous false negatives and false positives. LLM-based intent analysis is necessary to supplement static analysis.

---

### 1.7 MCPServer-Audit (Cloud Security Alliance)

| Attribute | Details |
|-----------|---------|
| **URL** | [github.com/ModelContextProtocol-Security/mcpserver-audit](https://github.com/ModelContextProtocol-Security/mcpserver-audit) |
| **Type** | MCP server source code auditor |
| **Backed by** | Cloud Security Alliance |
| **Approach** | Source code vulnerability detection + AIVSS scoring |

**What It Does**:
- Audits MCP server source code for security vulnerabilities
- AIVSS (AI Vulnerability Severity Scoring) integration
- Educational component (teaches users to identify vulnerabilities)
- Publishes findings to audit-db and vulnerability-db

**Strengths**:
- Backed by CSA (credibility)
- AIVSS scoring provides standardized severity metrics
- Community vulnerability database

**Limitations**:
- MCP server focused (not skill/SKILL.md focused)
- No directory or registry
- No version-pinned badges

---

### 1.8 APISec MCP Audit

| Attribute | Details |
|-----------|---------|
| **URL** | [github.com/apisec-inc/mcp-audit](https://github.com/apisec-inc/mcp-audit) |
| **Type** | MCP configuration scanner |
| **Focus** | Shadow APIs, exposed secrets, AI-BOMs |

**What It Does**:
- Scans MCP configs for exposed secrets
- Detects shadow APIs
- Generates AI-BOMs (Bill of Materials) for compliance
- Model inventory for governance

**Strengths**:
- AI-BOM generation (regulatory compliance)
- Shadow API detection
- Model governance focus

**Limitations**:
- Configuration-level scanning only
- No SKILL.md content analysis
- No directory or certification system

---

## 2. Feature Comparison Matrix

| Feature | Snyk agent-scan | Cisco Skill Scanner | SkillsDirectory | pors/skill-audit | verified-skill.com (planned) |
|---------|:-:|:-:|:-:|:-:|:-:|
| **Static Analysis** | Yes | Yes | Yes (50+ rules) | Yes | Yes (26+ patterns) |
| **LLM-Based Analysis** | Yes | Yes | No | No | Yes (Tier 2) |
| **Human Review** | No | No | Pre-publish | No | Yes (Tier 3) |
| **Runtime Monitoring** | Yes (proxy) | Behavioral | No | No | Planned |
| **Directory/Registry** | No | No | Yes (36K) | No | Yes |
| **Trust Tiers/Badges** | No | No | Grades (A-F) | No | Yes (3 tiers) |
| **Version Pinning** | No | No | No | No | Yes |
| **Content Hashing** | Manifest hash | No | No | No | Yes (SHA-256) |
| **Continuous Re-scan** | Proxy mode | No | No | No | Yes |
| **Badge API** | No | No | No | No | Yes |
| **CLI Install** | `pip install` | GitHub | `npm install` | CLI | `npx vskill` |
| **SARIF Output** | No | No | No | Yes | Planned |
| **Multi-Agent Support** | Yes | No | No | No | Yes (39 agents) |
| **Open Source** | Yes | Yes | No | Yes | Scanner: Yes |
| **Submission Pipeline** | No | No | Yes | No | Yes |
| **Diff Scanning** | No | No | No | No | Yes |

---

## 3. Scanning Approach Comparison

### 3.1 Static Analysis (Pattern Matching)

**Used by**: All tools
**Approach**: Regex/denylist patterns for known dangerous constructs
**Effectiveness**: Catches ~60% of threats (Snyk estimate)
**Bypasses**: Bash parameter expansion (`c${u}rl`), alternative tools (`wget -O-`), standard libraries (`python -c "import urllib.request..."`), natural language reformulation

### 3.2 LLM-Based Intent Analysis

**Used by**: Snyk agent-scan, Cisco Skill Scanner
**Approach**: LLM reads SKILL.md and evaluates intent vs declared capability
**Effectiveness**: Catches behavioral mismatches that regex misses
**Limitations**: LLM hallucination risk, cost per scan, latency

### 3.3 Behavioral Analysis

**Used by**: Cisco Skill Scanner
**Approach**: Compare documented intent against actual code behavior
**Effectiveness**: Catches mismatches between docs and code
**Limitations**: Requires running code (not just static files)

### 3.4 Runtime Monitoring

**Used by**: Snyk agent-scan (proxy mode)
**Approach**: Man-in-the-middle proxy between agent and MCP server
**Effectiveness**: Catches dynamic threats, data exfiltration in real-time
**Limitations**: Performance overhead, requires proxy setup

---

## 4. Gap Analysis: verified-skill.com Differentiators

### 4.1 Unique Value Propositions

| Differentiator | Why It Matters | Who Else Does It? |
|---------------|----------------|-------------------|
| **Three-tier certification** (Scanned → Verified → Certified) | Graduated trust with clear criteria | No one |
| **Version-pinned badges** | Badge tied to specific version, not "current" | No one |
| **Content hash verification** (SHA-256) | Tamper detection between versions | Snyk (manifest hash only) |
| **Diff scanning on updates** | Detect regression or injection in updates | No one |
| **Badge downgrade monitoring** | Continuous re-scan with automatic badge changes | No one |
| **39-agent compatibility registry** | Install to any of 39 agents, not just Claude | No one |
| **Vendor fast-path** | Auto-verify trusted orgs (anthropic/, openai/) | No one |
| **Submission state machine** | Transparent pipeline (RECEIVED → SCANNING → PUBLISHED) | SkillsDirectory (opaque) |
| **Lock file** (`vskill.lock`) | Pin exact versions with hashes | No one |

### 4.2 Competitive Positioning

```
                    Scanning Depth
                         ↑
                         |
    Snyk agent-scan  ●   |
                         |   ○ verified-skill.com (target)
    Cisco Scanner    ●   |
                         |
    pors/skill-audit ●   |
                         |
    SkillsDirectory  ●   |
                         |
    ─────────────────────┼────────────────────→ Registry/Directory
                         |
    Skills.sh        ●   |              Breadth
    ClawHub          ●   |
```

**verified-skill.com occupies the upper-right quadrant**: deep scanning + comprehensive directory. No existing tool occupies this space.

### 4.3 Competitive Threats

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| Snyk adds registry/directory | Medium | High | Move fast, establish brand first |
| SkillsDirectory deepens scanning | Medium | Medium | LLM-based analysis is hard to replicate |
| Vercel adds scanning to skills.sh | Low-Medium | High | First-mover on three-tier certification |
| Anthropic builds official verification | Low | Very High | Position as independent third-party |
| Open-source tool consolidation | Medium | Medium | Community contribution + commercial features |

---

## 5. Snyk's Key Critique: Why Scanners Fail

Snyk's article ["Why Your Skill Scanner Is Just False Security"](https://snyk.io/blog/skill-scanner-false-security/) identifies fundamental limitations:

1. **Denylist futility**: "Relying on a denylist of 'bad words' is a losing battle against the infinite corpus of natural language"
2. **Bypass trivially**: Bash parameter expansion (`c${u}rl`), alternative tools, stdlib imports
3. **The Antivirus Paradox**: Scanners flag themselves (Skill Defender flagged itself as DANGEROUS while clearing actual malware)
4. **Malicious scanners**: SkillGuard was itself malware (payload installer)
5. **Solution**: Combine SAST with LLM-based intent analysis to "catch behavior, not just syntax"

**Implication for verified-skill.com**: Three-tier architecture directly addresses this — Tier 1 (SAST) catches obvious threats, Tier 2 (LLM) catches behavioral mismatches, Tier 3 (human) catches what both miss.

---

## 6. Strategic Recommendations for verified-skill.com

### 6.1 Must-Have for Launch

1. **Scanning parity with Snyk**: Static + LLM analysis minimum
2. **Badge API**: SVG badges embeddable in GitHub READMEs (like shields.io)
3. **CLI**: `npx vskill scan <path>` for pre-submission scanning
4. **Transparency**: Publish scanning methodology and detection rates
5. **Version pinning**: `vskill.lock` with SHA-256 hashes

### 6.2 Key Differentiators to Emphasize

1. **"We verify, they just list"** — vs Skills.sh (zero scanning)
2. **"We scan deeper"** — vs SkillsDirectory (likely shallow rules)
3. **"We verify versions, not just current"** — vs everyone (no version-pinned badges)
4. **"We support all 39 agents"** — vs most tools (Claude-only)
5. **"Three tiers of trust"** — vs Snyk (binary pass/fail)

### 6.3 Partnerships to Explore

- **Snyk**: Integration with agent-scan as Tier 1 scanner
- **Cisco AI Defense**: Enterprise channel partner
- **Cloud Security Alliance**: Standardization alignment
- **Agent platforms**: Skills.sh, Cursor, GitHub Copilot for badge display
