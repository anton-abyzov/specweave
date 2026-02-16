# Skill Discovery Sources and Quality Scoring Rubric

Research compiled: 2026-02-15

---

## 1. Executive Summary

The AI agent skills ecosystem has exploded since Anthropic released the Agent Skills specification as an open standard on December 18, 2025. As of February 2026, there are at least 8 distinct discovery channels where developers find SKILL.md-based skills, with aggregate listings exceeding 200,000 entries across all platforms. However, the security landscape is alarming: Snyk's ToxicSkills study found that 36.82% of 3,984 scanned skills have security flaws, 13.4% contain critical-level issues, and 76 confirmed malicious payloads were identified. The barrier to publishing a malicious skill remains dangerously low -- a SKILL.md file and a one-week-old GitHub account is all that is required on most platforms.

This document catalogs 8 discovery sources, defines a 6-dimension quality scoring rubric (0-5 scale, 30 points max), rates each source against the rubric, and identifies gaps and opportunities for SpecWeave's Fabric Registry to differentiate on quality and security.

---

## 2. Discovery Sources Catalog

### 2.1 Vendor Repositories (Official First-Party Skills)

**Description**: Official skill repositories published and maintained by AI platform vendors. These are the highest-trust source of skills, curated by the organizations that created the Agent Skills standard or adopted it.

**Key Repositories**:

| Vendor | Repository | Skill Count | Notes |
|--------|-----------|-------------|-------|
| Anthropic | [github.com/anthropics/skills](https://github.com/anthropics/skills) | ~30 | Original standard creator. Includes skill-creator, enterprise workflows |
| OpenAI | [github.com/openai/skills](https://github.com/openai/skills) | ~25 | Adopted same SKILL.md format for Codex CLI and ChatGPT |
| Google | [github.com/google-gemini/gemini-skills](https://github.com/google-gemini/gemini-skills) | ~20 | Gemini CLI native support; progressive disclosure model |
| Microsoft | [github.com/microsoft/skills](https://github.com/microsoft/skills) | 131 | 5 core + 126 language-specific (Python, .NET, TypeScript, Java) for Azure/Foundry |

**Quality Signals**: Code review by vendor engineers, consistent formatting, clear documentation, regular updates, known authorship.

**Security Features**: Implicit trust via vendor reputation. No formal scanning needed -- these are the standard-setters. Microsoft's Skill Explorer offers 1-click install with curated descriptions.

**Strengths**:
- Highest trust level -- authored by the organizations that define the standard
- Professional code review processes
- Consistent quality and formatting
- Regular maintenance and updates
- Partner ecosystem skills (Atlassian, Canva, Cloudflare, Figma, Notion, Ramp, Sentry via Anthropic's directory)

**Weaknesses**:
- Limited selection (total ~200 across all vendors)
- Vendor-specific bias (Microsoft skills focus on Azure, etc.)
- Slow to add new skills compared to community
- No cross-vendor coordination on quality standards

**URLs**:
- https://github.com/anthropics/skills
- https://github.com/openai/skills
- https://github.com/google-gemini/gemini-skills
- https://github.com/microsoft/skills

---

### 2.2 Skills.sh (Vercel Leaderboard Directory)

**Description**: A directory and leaderboard platform for AI agent skill packages launched by Vercel on January 20, 2026. Functions as a discovery layer over GitHub-hosted skills with installation tracking via telemetry.

**URL**: https://skills.sh

**Skill Count**: 200+ listed skills with 59,960+ total installations tracked. Top skill has 234,000+ all-time installs.

**Categories**: Development frameworks (React, Vue, Next.js), best practices (design, testing, architecture), platform-specific (Expo, Vercel, Supabase), marketing/content (copywriting, SEO), infrastructure/DevOps.

**Search/Sort Options**:
- Search with "/" keyboard shortcut
- Sort by: "All Time" installs, "Trending (24h)", "Hot"
- Filter by skill source/repository

**Quality Signals Exposed**:
- Installation counts (all-time and trending)
- Source repository (owner/repo format)
- Skill name and description

**Security Features**: None visible. No authentication, no vetting process, no security warnings on the directory interface. Snyk's ToxicSkills study included skills.sh in its scan of 3,984 skills and found it used as a "curated top-100 reference dataset" but with no security scanning.

**Strengths**:
- Clean, fast interface
- Installation telemetry provides popularity signal
- Cross-agent compatibility (16+ platforms: Claude Code, Copilot, Cursor, Cline, Gemini, etc.)
- One-command install: `npx skills add <owner/repo>`
- Backed by Vercel's infrastructure

**Weaknesses**:
- No security scanning whatsoever
- No author verification
- No quality review before listing
- Installation count can be gamed
- No test coverage or portability metadata

---

### 2.3 ClawHub / OpenClaw Marketplace

**Description**: The official skill registry for OpenClaw (formerly ClawdBot, originally Moltbot), often called "npm for AI agents." This is the marketplace most heavily scrutinized by security researchers due to multiple malicious campaigns discovered in early 2026.

**URL**: https://clawhub.ai (official), https://github.com/openclaw/clawhub (source)

**Skill Count**: 3,286+ skills across 11 categories

**Quality Signals**: Minimal prior to February 2026. After the ClawHavoc campaign and Snyk's ToxicSkills study, OpenClaw partnered with VirusTotal for scanning.

**Security Features (Post-February 2026)**:
- VirusTotal integration: SHA-256 hash check + Code Insight (Gemini-powered) analysis
- Skills with "benign" verdict auto-approved; suspicious flagged with warning
- Daily rescan of all active skills
- OpenClaw maintainers acknowledge this is "not a silver bullet"

**Security Incident History**:
- Snyk ToxicSkills (Feb 5, 2026): 3,984 skills scanned, 36.82% with flaws, 534 (13.4%) critical
- ClawHavoc campaign: 335 infostealer packages deploying Atomic macOS Stealer, keyloggers, backdoors
- 76 confirmed malicious payloads for credential theft, backdoor installation, data exfiltration
- 8 malicious skills remained publicly available at time of Snyk's publication
- 283 skills (7.1%) expose sensitive credentials
- Koi Security audit: 341 malicious skills identified
- 30+ malicious skills in coordinated "clawdhub" typosquatting campaign

**Barrier to Entry**: SKILL.md file + GitHub account (1 week old). No code signing, no security review, no sandbox by default.

**Strengths**:
- Large catalog (3,286+ skills)
- CLI integration with OpenClaw
- Active community
- Now has VirusTotal scanning (post-incident)

**Weaknesses**:
- Worst security track record of any marketplace
- No code signing or verification
- Minimal barrier to publishing malicious skills
- VirusTotal scanning added reactively, not proactively
- Prompt injection payloads can evade pattern-based scanning
- History of coordinated malware campaigns

**URLs**:
- https://clawhub.ai
- https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/
- https://thehackernews.com/2026/02/openclaw-integrates-virustotal-scanning.html

---

### 2.4 SkillsMP (Aggregator Marketplace)

**Description**: A large-scale aggregator marketplace that crawls GitHub repositories to index SKILL.md files. Claims 200,000+ skills compatible with Claude Code, Codex CLI, and ChatGPT. Functions as a search engine over the distributed skill ecosystem.

**URL**: https://skillsmp.com

**Skill Count**: 200,000+ (some sources cite 96,751+ in earlier counts, suggesting rapid growth)

**Categories**: Searchable by category, author, and popularity. Intelligent filtering.

**Quality Signals**:
- Author information
- Category classification
- Popularity metrics

**Security Features**: None documented. As an aggregator, it indexes skills from GitHub without independent security scanning.

**Strengths**:
- Largest catalog by far (200K+)
- Cross-platform compatibility
- Search and filtering capabilities
- Aggregates from multiple sources

**Weaknesses**:
- No security scanning
- Quantity over quality -- aggregates everything found on GitHub
- No verification of skill authors
- No quality scoring or grading
- Aggregation model means it includes malicious skills from other sources

**URL**: https://skillsmp.com

---

### 2.5 SkillsDirectory.com (Security-First Directory)

**Description**: A security-focused directory that positions itself as the "verified" alternative. Every skill is scanned with 50+ detection rules across 10 threat categories before listing. Assigns letter grades (A-F) to skills.

**URL**: https://www.skillsdirectory.com

**Skill Count**: 36,109 skills

**Grade Distribution**:
- A grade: 34,092 skills (94.4%)
- B grade: 1,201 skills (3.3%)
- C grade: 576 skills (1.6%)
- D grade: 156 skills (0.4%)
- F grade: 84 skills (0.2%)

**Categories**: 10 total -- Development, Marketing, Research, Writing, Business, Design, Data & Analytics, Productivity, Legal, Other

**Security Features**:
- 50+ detection rules applied to every submission
- 10 threat categories scanned (prompt injection, credential theft, data exfiltration, etc.)
- Letter grades (A-F) for quality/security scoring
- Filterable by minimum grade
- Cites that "36% of skills in the wild have security flaws"

**Quality Signals**: Letter grades, author info, category, status, features

**Strengths**:
- Security-first approach with automated scanning
- Letter grading provides clear quality signal
- Large catalog (36K+) with most skills passing (94% grade A)
- Transparent security methodology
- Filterable by quality grade

**Weaknesses**:
- 94% receiving grade A suggests scoring may be too lenient
- Unknown scanning depth (pattern-matching vs. semantic analysis)
- Snyk's research suggests pattern-based scanners miss sophisticated attacks
- No test coverage or portability tracking
- No author verification beyond GitHub identity

**URL**: https://www.skillsdirectory.com

---

### 2.6 GitHub Search (Ad-Hoc Discovery)

**Description**: Developers discover skills organically by searching GitHub for SKILL.md files, browsing "awesome-agent-skills" curated lists, or finding skills within repositories they already use. This is the most decentralized and unstructured discovery channel.

**Discovery Patterns**:
- Direct GitHub search for "SKILL.md" files
- "awesome-*" curated lists (VoltAgent/awesome-agent-skills: 300+ skills, skillmatic-ai/awesome-agent-skills, heilcheng/awesome-agent-skills)
- Repository-embedded skills (`.agents/skills/`, `.claude/skills/`, `.cursor/`)
- GitHub Topics: `agent-skills` topic page
- Skills Hub: Curated catalog aggregating from github/awesome-copilot, anthropics/skills, modelcontextprotocol/ext-apps (51 skills from 3 repos, 8 categories)

**Skill Count**: Uncountable. Any GitHub repo can contain SKILL.md files. Estimated 44,000+ via agentskill.sh indexing.

**Quality Signals**: GitHub stars, forks, contributor count, commit history, issues, README quality. Standard open-source signals apply.

**Security Features**: None inherent. GitHub does not scan SKILL.md files for malicious content. Dependabot and CodeQL do not cover skill-specific threats.

**Strengths**:
- Largest possible pool (any public GitHub repo)
- Full source transparency (readable markdown + scripts)
- Standard open-source quality signals (stars, activity, contributors)
- Version history via git
- Community curation through "awesome" lists

**Weaknesses**:
- No security scanning
- No quality standards enforcement
- Discovery is fragmented and inconsistent
- Typosquatting risks (e.g., "clawdhub" campaign)
- No centralized install tracking
- Anyone can publish anything

**URLs**:
- https://github.com/topics/agent-skills
- https://github.com/VoltAgent/awesome-agent-skills
- https://github.com/skillmatic-ai/awesome-agent-skills
- https://agentskill.sh (indexes 44K+ GitHub skills with security scanning)

---

### 2.7 SpecWeave Fabric Registry (Internal)

**Description**: SpecWeave's built-in curated registry for plugins and skills. Defines a structured schema with trust tiers, security scanning, and author tracking. Currently internal to the SpecWeave ecosystem.

**Source**: `/Users/antonabyzov/Projects/github/specweave/src/core/fabric/registry-schema.ts`

**Quality Attributes Already Tracked**:

| Attribute | Type | Description |
|-----------|------|-------------|
| `tier` | `'official' \| 'verified' \| 'community'` | Three-level trust hierarchy |
| `author` | `string` | Author name or organization |
| `version` | `string` | Semantic version tracking |
| `tags` | `string[]` | Search and filtering tags |
| `agentSkillsCompat` | `boolean` | Cross-platform compatibility flag |
| `repository` | `string?` | Source repository URL |
| `homepage` | `string?` | Documentation URL |
| `minSpecweaveVersion` | `string?` | Minimum runtime version |

**Security Scanner** (`security-scanner.ts`):
- 7 detection categories: destructive-command, remote-code-execution, credential-access, dangerous-permissions, prompt-injection, frontmatter-issue, network-access
- 5 severity levels: critical, high, medium, low, info
- Pattern-based static analysis with safe-context suppression
- Fenced code block awareness (downgrades severity inside balanced code blocks)
- Inline suppression via `<!-- scanner:ignore-next-line -->`
- 20+ detection patterns covering rm -rf, curl|bash, eval(), credential access, system tag injection, etc.

**Strengths**:
- Three-tier trust model (official/verified/community)
- Built-in security scanner with nuanced severity levels
- Safe-context awareness (e.g., rm in temp dirs is OK)
- Code block fence detection to prevent false positives
- Structured schema with full metadata
- Agent Skills compatibility tracking

**Weaknesses**:
- Internal only -- not publicly discoverable
- No test coverage tracking
- No update frequency metrics
- No community ratings or install counts
- Scanner is pattern-based (same limitation Snyk flagged for other tools)
- No LLM-assisted semantic analysis
- No behavioral/dataflow analysis

---

### 2.8 Third-Party Security Scanners and Directories

**Description**: A growing ecosystem of tools that scan, grade, and catalog skills with security as the primary lens. These emerged in response to the ClawHub security incidents of early 2026.

#### 2.8.1 Cisco Skill Scanner

**URL**: https://github.com/cisco-ai-defense/skill-scanner

**Approach**: Multi-engine detection combining 4 analysis methods:
1. Static analysis (YAML rules + YARA signatures)
2. Behavioral analysis (AST dataflow for Python files)
3. LLM-based semantic analysis (context-aware assessment)
4. Meta-analysis (false positive filtering)

**Integrations**: VirusTotal, Cisco AI Defense cloud, GitHub Code Scanning (SARIF output)

**Key Stats**: 26% of 31,000 analyzed skills contained vulnerabilities

**Installation**: `pip install cisco-ai-skill-scanner` (Python 3.10+)

**Modes**: strict, balanced, permissive

#### 2.8.2 Alice Caterpillar

**URL**: https://caterpillar.alice.io

**Approach**: Static inspection of skill logic and configurations informed by Alice's RabbitHole adversarial intelligence database.

**Key Stats**: Scanned top 50 skills on skills.sh; 54% contained vulnerabilities; 85 findings across 8 categories

**Detection Categories**: Dangerous permissions (30 findings), Privacy violations (27), Data exfiltration (9), Obfuscation (7), Social engineering (5), Supply chain attacks (3), Credential theft (3), Network attacks (1)

**Grading**: Letter grades A-F with severity-based keep/fix/reject recommendations

**Installation**: `npm install -g @alice-io/caterpillar` or curl installer

#### 2.8.3 SkillShield

**URL**: https://skillshield.io

**Approach**: 4-layer security analysis: manifest, static code, dependency, and LLM behavioral checks

**Key Stats**: 6,923 skills indexed, 330 trusted skills, 1,013 total scans, 270 critical findings

**Score**: "Global trusted ratio" metric

#### 2.8.4 SkillAudit

**URL**: https://skillaudit.vercel.app, https://github.com/megamind-0x/skillaudit

**Approach**: Detects credential theft, data exfiltration, prompt injection, shell execution, obfuscation, privilege escalation, crypto theft, token stealing, DNS rebinding, reverse shells, agent memory modification, suspicious URLs

**Integration**: Native MCP tool for Claude Desktop and Cursor

#### 2.8.5 SkillScan

**URL**: https://skillscan.dev

**Approach**: Reproducible vulnerability detection via static analysis. Certification process to build trust.

#### 2.8.6 Snyk (Research, Not Product Yet)

**URL**: https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/

**Key Contribution**: ToxicSkills study -- the definitive security audit of the agent skills ecosystem. Also published "Why Your Skill Scanner Is Just False Security" debunking pattern-based scanners.

**Critical Finding on Scanner Tools**: Snyk found that SkillGuard was itself malware (reverse shell + credential exfiltration). Skill Defender produced false negatives (marked known-malicious skill as "CLEAN"). Ferret Scan limited to regex despite claiming AST analysis. Fundamental limitation: "You simply cannot enumerate every possible way to ask an LLM to do something dangerous."

**Strengths** (across all scanners):
- Multiple independent scanning approaches emerging
- Industry leaders (Cisco, Alice/ActiveFence) investing in this space
- LLM-assisted analysis beginning to complement pattern matching
- Integration points with CI/CD pipelines

**Weaknesses** (across all scanners):
- Pattern-based approaches have fundamental limits (Snyk's critique)
- Some "security" tools are themselves malware (SkillGuard incident)
- No unified standard for security grading
- Fragmented tooling -- each scanner uses different criteria
- LLM-based analysis adds cost and latency
- False positive/negative rates not well characterized

---

## 3. Quality Scoring Rubric

Six dimensions, each scored 0-5, for a maximum of 30 points.

### 3.1 Transparency (0-5)

How readable, auditable, and understandable is the skill content?

| Score | Criteria |
|-------|----------|
| 0 | Obfuscated, encoded, or binary content. No readable source. |
| 1 | Source available but heavily minified or auto-generated. No documentation. |
| 2 | Readable SKILL.md but no explanation of what scripts do. Bundled scripts are opaque. |
| 3 | Clear SKILL.md with documented instructions. Scripts present but not fully explained. |
| 4 | Fully readable SKILL.md + documented scripts + clear resource descriptions. All referenced files explained. |
| 5 | Full transparency: readable markdown, documented scripts, inline comments, architecture explanation, all external references justified. No hidden functionality. |

### 3.2 Security Scan (0-5)

Has the skill been scanned for threats? By what tier of scanner?

| Score | Criteria |
|-------|----------|
| 0 | No scan performed. Published to unscanned marketplace (raw GitHub, unscanned ClawHub pre-Feb-2026). |
| 1 | Self-reported "safe" with no evidence. Or scanned by a known-unreliable tool (SkillGuard, Skill Defender). |
| 2 | Scanned by a single pattern-based scanner (regex only). Basic threat categories checked. |
| 3 | Scanned by a multi-engine scanner (static + behavioral). Passing grade from SkillsDirectory.com, SkillShield, or equivalent. |
| 4 | Scanned by an enterprise-grade scanner with LLM-assisted analysis (Cisco Skill Scanner, Alice Caterpillar). SARIF output available. No findings above "info." |
| 5 | Multiple independent scans (2+ scanners) with LLM semantic analysis + human expert review. Runtime behavioral testing in sandbox. Zero findings at any severity. Continuous re-scanning on schedule. |

### 3.3 Author Reputation (0-5)

How trustworthy is the skill author?

| Score | Criteria |
|-------|----------|
| 0 | Anonymous author. No profile, no history. Account less than 30 days old. |
| 1 | Pseudonymous author with minimal history. Account exists but no meaningful contributions. |
| 2 | GitHub profile with some public repos and activity. Identity not independently verifiable. |
| 3 | Known developer with consistent contribution history. Multiple published skills or packages. Verifiable GitHub identity. |
| 4 | Verified organization or well-known individual. Published skills from recognized companies. Signed commits. |
| 5 | Official vendor skill (Anthropic, OpenAI, Google, Microsoft) or verified enterprise partner (Atlassian, Cloudflare, Stripe, Sentry). Code-signed releases. Organizational review process documented. |

### 3.4 Update Frequency (0-5)

How actively maintained is the skill?

| Score | Criteria |
|-------|----------|
| 0 | Abandoned. No commits in 6+ months. No response to issues. |
| 1 | Dormant. Last commit 3-6 months ago. Issues unanswered. |
| 2 | Slow. Updated within last 3 months but infrequently (1-2 commits). |
| 3 | Active. Updated within last month. Responds to issues within a week. Semantic versioning. |
| 4 | Well-maintained. Updated within last 2 weeks. Changelog maintained. Breaking changes documented. Dependencies kept current. |
| 5 | Actively maintained. Weekly or more frequent updates. CI/CD pipeline. Automated dependency updates. Rapid response to security advisories. Release notes for every version. |

### 3.5 Test Coverage (0-5)

Does the skill include tests? Are behaviors validated?

| Score | Criteria |
|-------|----------|
| 0 | No tests of any kind. No validation criteria documented. |
| 1 | Manual testing instructions only ("try this command and check output"). |
| 2 | Basic smoke tests or example usage that implicitly validates behavior. |
| 3 | BDD-style test scenarios documented in the skill (Given/When/Then). OR automated tests exist but coverage is partial (<50%). |
| 4 | Automated test suite with good coverage (50-80%). BDD scenarios documented AND automated. Edge cases covered. |
| 5 | Comprehensive test suite (>80% coverage). BDD scenarios, unit tests, integration tests. CI runs tests on every commit. Test results published. Regression tests for known issues. |

### 3.6 Portability (0-5)

How many AI agents/platforms does the skill support?

| Score | Criteria |
|-------|----------|
| 0 | Single-agent only. Uses proprietary format incompatible with Agent Skills standard. |
| 1 | Single-agent. Uses SKILL.md format but relies on agent-specific features or APIs not available elsewhere. |
| 2 | Works with 2-3 agents. SKILL.md compliant but uses some agent-specific instructions. |
| 3 | Works with 4-6 agents. Standard SKILL.md format. No agent-specific dependencies. Tested on major platforms (Claude Code + Codex + one other). |
| 4 | Works with 7-10 agents. Fully standard SKILL.md. Tested across Claude Code, Codex, Gemini CLI, Cursor, Copilot. Documented compatibility matrix. |
| 5 | Universal. Works with 10+ agents. Fully standard SKILL.md with no platform assumptions. Compatibility tested and documented. Graceful degradation when features unavailable. Community-verified on multiple platforms. |

---

## 4. Source Quality Assessment Matrix

How well does each discovery source **expose and enable quality assessment** across the 6 dimensions?

| Source | Transparency | Security Scan | Author Rep | Update Freq | Test Coverage | Portability | Total (/30) |
|--------|:-----------:|:------------:|:----------:|:-----------:|:------------:|:-----------:|:-----------:|
| Vendor Repos | 5 | 4 | 5 | 4 | 3 | 3 | **24** |
| Skills.sh | 4 | 0 | 2 | 1 | 0 | 4 | **11** |
| ClawHub/OpenClaw | 3 | 2 | 1 | 1 | 0 | 2 | **9** |
| SkillsMP | 3 | 0 | 2 | 1 | 0 | 3 | **9** |
| SkillsDirectory.com | 3 | 3 | 2 | 1 | 0 | 2 | **11** |
| GitHub Search | 5 | 0 | 3 | 3 | 1 | 2 | **14** |
| SpecWeave Fabric | 4 | 3 | 3 | 2 | 0 | 3 | **15** |
| Security Scanners | 4 | 4 | 2 | 2 | 0 | 2 | **14** |

### Scoring Rationale

**Vendor Repos (24/30)**: Highest overall quality. Full transparency (source readable), strong implicit security (vendor-reviewed), maximum author reputation, good update cadence. Loses points on test coverage (few skills include tests) and portability (often optimized for vendor's own agent).

**Skills.sh (11/30)**: Good transparency (links to GitHub source) and strong portability signal (16+ agents). Zero security scanning. Minimal author verification. No test or maintenance metadata exposed.

**ClawHub/OpenClaw (9/30)**: Poor across the board. VirusTotal scanning added reactively earns a 2 on security. Worst author verification (1-week-old accounts can publish). No test or update tracking. Multiple confirmed malware campaigns.

**SkillsMP (9/30)**: Large quantity, minimal quality signals. Aggregator model means it inherits weaknesses of all sources. No independent scanning. Basic author and popularity metadata.

**SkillsDirectory.com (11/30)**: Best security posture among large directories (50+ rules, letter grading). But 94% getting grade A suggests the bar is too low. No test coverage or detailed update tracking.

**GitHub Search (14/30)**: Maximum transparency (full source). Highest organic author reputation signals (stars, history, contributors). But zero security scanning and fragmented discovery.

**SpecWeave Fabric (15/30)**: Strong structured approach with three-tier trust model and built-in scanner. Loses points for being internal-only and lacking test coverage, update frequency, and community rating metrics.

**Security Scanners (14/30)**: Good transparency into scan results and strong security methodology (especially Cisco and Alice). But they are scanning tools, not discovery platforms -- no test or update tracking.

---

## 5. Gaps and Opportunities

### 5.1 Critical Gaps Across All Sources

1. **No source tracks test coverage.** Not a single discovery platform surfaces whether a skill has tests, BDD scenarios, or validation criteria. This is the most universal gap.

2. **Security scanning remains pattern-based everywhere except Cisco.** Snyk demonstrated that pattern-based scanning fails against obfuscation, natural-language prompt injection, and context-dependent threats. Only Cisco's Skill Scanner combines static analysis with LLM-semantic analysis and behavioral dataflow detection.

3. **Author verification is superficial.** Most platforms rely on GitHub identity, which is trivially fabricated. No platform requires code signing, organizational verification, or multi-factor identity confirmation.

4. **Update frequency is not tracked.** No discovery platform shows when a skill was last updated, how many versions it has had, or whether it responds to issues. GitHub exposes this data, but no marketplace surfaces it.

5. **Portability is assumed, not verified.** Skills claim "works with Claude, Codex, Gemini" but no platform verifies cross-agent compatibility through testing. The Agent Skills standard ensures format compatibility, but behavioral compatibility varies.

6. **No runtime behavioral sandbox exists.** All scanning is pre-installation static analysis. No platform tests what a skill actually does when activated by an agent in a controlled environment.

### 5.2 Opportunities for SpecWeave

1. **Composite quality score**: Implement the 6-dimension rubric in the Fabric Registry. No other platform offers multi-dimensional quality scoring. SkillsDirectory.com has a letter grade but it is one-dimensional (security only).

2. **Test coverage as differentiator**: SpecWeave already has BDD testing built into its workflow (`tasks.md` with Given/When/Then). Extending this to skill validation would be unique in the market.

3. **Tiered trust with security gates**: The existing `official | verified | community` tier system maps naturally to security requirements. Gate `verified` tier on passing Cisco-class scanning. Gate `official` on human expert review.

4. **Update frequency tracking**: The registry schema already has `version` and `updatedAt`. Extend with `lastCommitDate`, `releaseCount`, and `issueResponseTime` to surface maintenance signals.

5. **Cross-scanner aggregation**: Rather than building yet another pattern-based scanner, integrate results from multiple existing scanners (Cisco, Alice Caterpillar, SkillShield) and present a composite security score. This addresses Snyk's critique that single-scanner results are insufficient.

6. **Portability testing matrix**: Automated testing of skills across Claude Code, Codex, and Gemini CLI to produce verified compatibility matrices. No other platform does this.

7. **LLM-assisted semantic scanning**: The existing SpecWeave scanner (`security-scanner.ts`) is pattern-based. Adding an LLM analysis pass (with user consent per the project's external API cost policy) would close the gap with Cisco's approach.

---

## 6. Recommendations

### Immediate (This Increment)

1. **Extend `FabricRegistryEntry` schema** with fields for:
   - `securityScore: number` (0-5 composite from rubric)
   - `qualityScore: number` (0-30 total from rubric)
   - `lastScannedAt: string` (ISO timestamp)
   - `scannerUsed: string[]` (which scanners produced the result)
   - `testCoverage: 'none' | 'manual' | 'partial' | 'full'`
   - `portabilityMatrix: Record<string, boolean>` (agent name -> verified compatible)
   - `updateFrequency: 'abandoned' | 'dormant' | 'slow' | 'active' | 'maintained'`

2. **Add rubric scoring logic** to the security scanner to produce 0-5 dimension scores alongside the existing pass/fail + findings model.

3. **Document the rubric** in the SpecWeave living docs so plugin authors understand how to achieve higher scores.

### Short-Term (Next 1-2 Increments)

4. **Integrate Cisco Skill Scanner** as an optional external scan provider (behind external API consent gate). This would add LLM-semantic + behavioral analysis without building from scratch.

5. **Add update frequency detection** by querying GitHub API for last commit date and release count when a skill's `repository` URL is provided.

6. **Implement BDD test validation** -- check if a skill folder contains test files and score accordingly.

### Medium-Term

7. **Build portability test runner** that installs a skill into Claude Code, Codex CLI, and Gemini CLI in CI and validates basic activation.

8. **Publish SpecWeave quality scores** alongside the Fabric Registry so the community can see scores for listed plugins -- becoming the first platform with transparent multi-dimensional quality assessment.

9. **Contribute to Agent Skills standard** -- propose quality metadata extensions (test coverage, security scan results, portability matrix) to the open standard so all platforms can benefit.

---

## References

### Discovery Sources
- [Anthropic Skills Repository](https://github.com/anthropics/skills)
- [OpenAI Skills Catalog](https://github.com/openai/skills)
- [Google Gemini Skills](https://github.com/google-gemini/gemini-skills)
- [Microsoft Skills Repository](https://github.com/microsoft/skills)
- [Skills.sh Directory](https://skills.sh/)
- [ClawHub / OpenClaw](https://github.com/openclaw/clawhub)
- [SkillsMP Marketplace](https://skillsmp.com/)
- [SkillsDirectory.com](https://www.skillsdirectory.com/)
- [AgentSkill.sh](https://agentskill.sh/)

### Security Research
- [Snyk ToxicSkills Study](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/)
- [Snyk: Why Your Skill Scanner Is Just False Security](https://snyk.io/blog/skill-scanner-false-security/)
- [Snyk: SKILL.md to Shell Access in Three Lines](https://snyk.io/articles/skill-md-shell-access/)
- [Snyk: OpenClaw 280+ Leaky Skills](https://snyk.io/blog/openclaw-skills-credential-leaks-research/)
- [Snyk: ClawdHub Malicious Campaign](https://snyk.io/articles/clawdhub-malicious-campaign-ai-agent-skills/)

### Security Scanners
- [Cisco Skill Scanner](https://github.com/cisco-ai-defense/skill-scanner)
- [Alice Caterpillar](https://caterpillar.alice.io/)
- [SkillShield](https://skillshield.io/)
- [SkillAudit](https://skillaudit.vercel.app/)
- [SkillScan](https://skillscan.dev/)

### Standards and Documentation
- [Anthropic Agent Skills Announcement](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Agent Skills Specification](https://agentskills.io/home)
- [Gemini CLI Agent Skills Docs](https://geminicli.com/docs/cli/skills/)
- [OpenAI Codex Skills Docs](https://developers.openai.com/codex/skills)
- [GitHub Copilot Agent Skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)

### News Coverage
- [OpenClaw + VirusTotal Partnership (The Hacker News)](https://thehackernews.com/2026/02/openclaw-integrates-virustotal-scanning.html)
- [OpenClaw Security Nightmare (Cisco Blog)](https://blogs.cisco.com/ai/personal-ai-agents-like-openclaw-are-a-security-nightmare)
- [OpenClaw Leaky Security (The Register)](https://www.theregister.com/2026/02/05/openclaw_skills_marketplace_leaky_security/)
- [Anthropic Opens Skills Standard (VentureBeat)](https://venturebeat.com/ai/anthropic-launches-enterprise-agent-skills-and-opens-the-standard)
