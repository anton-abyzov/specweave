# Forensic Investigation Report: Skill Marketplace Exposure

## Executive Summary

SpecWeave skills are being automatically scraped and republished on multiple third-party registries without permission. The primary scraper is `majiayu000/claude-skill-registry`, an automated GitHub crawler that has indexed 24,176 SKILL.md files, including 30+ SpecWeave skills. The "92/100" security score comes from an external scanner (likely SkillShield.io), NOT from SpecWeave's own scanner. The broader ecosystem has 10+ competing registries with NO unified security standard.

## Finding 1: What is "OpenSkills"?

**OpenSkills** is a community-built CLI tool (npm: `openskills`) by Numman Ali (GitHub: numman-ali). 8.3K stars, 545 forks.

- **NOT affiliated with Anthropic** — community project implementing Anthropic's Agent Skills spec
- **No security scanning** — pure installer/loader from GitHub repos
- **Install**: `npx openskills install owner/repo` → downloads SKILL.md to `.claude/skills/`
- **Website**: openskills.app (~41 curated skills)

## Finding 2: Who is `majiayu000`?

| Field | Value |
|-------|-------|
| GitHub Login | `majiayu000` |
| Display Name | `lif` |
| Account Created | 2016-05-31 |
| Public Repos | 462 (majority are forks) |
| Stars (registry) | 82 |

**Automated scraping operation** — NOT manual curation:
- Daily GitHub Actions pipeline scrapes ALL repos containing SKILL.md files
- Three-repo architecture: `claude-skill-registry-core` (crawler), `claude-skill-registry-data` (archive), `claude-skill-registry` (published artifact)
- Also syncs from SkillsMP.com API (claims 200K+ skills)
- No opt-in or permission mechanism for skill authors
- Web frontend: https://skills-registry-web.vercel.app/

## Finding 3: SpecWeave Skills Scraped

**30+ SpecWeave skill files** downloaded and republished:

First scraped: **2026-01-06** (via SkillsMP) and **2026-01-14** (direct GitHub crawl)

Skills include: pm, framework, detector, github-sync, ado-sync, ado-manager, jira-sync, jira-mapper, preview, docs-writer, qa-lead, context-loader, performance, resume, infrastructure, metro-bundler, github-issue-standard, react-native-setup, release-strategy-advisor, brownfield-analyzer, reflective-reviewer, and more.

Each has metadata:
```json
{
  "name": "pm",
  "repo": "anton-abyzov/specweave",
  "path": "plugins/specweave/skills/pm/SKILL.md",
  "source": "github.com/anton-abyzov/specweave",
  "downloaded_at": "2026-01-14T03:26:36.644672Z"
}
```

## Finding 4: The 92/100 Score

**Not from SpecWeave's scanner.** Our scanner is pass/fail only (29 regex patterns, no numeric score).

Most likely from **SkillShield.io** — a third-party scanner using 4 layers:
1. Manifest Analysis (SKILL.md structure)
2. Static Code Analysis (vulnerability patterns)
3. Dependency Graph (known vulnerabilities)
4. LLM Behavioral Safety (prompt injection)

The "medium" finding "Installs packages at runtime" docked ~8 points.

Other scanners in the ecosystem:
- **Skills Directory** (skillsdirectory.com): Letter grades A-F, 36K skills, 50+ rules
- **SkillCheck**: Quality validation scores
- **Cisco skill-scanner**: Open source security scanner
- **Snyk ToxicSkills**: Research study (36% have flaws)

## Finding 5: Ecosystem Scale

| Platform | Skills Listed |
|----------|--------------|
| skills.sh (Vercel) | ~59,848 |
| SkillsMP | 87K-96K+ |
| Skills Directory | 36,109 |
| SkillShield | 10,644 scanned |
| OpenSkills.app | ~41 curated |
| majiayu000 registry | 24,176 SKILL.md files |

**Critical**: 59% of skills ship scripts, 12% are empty. Raw numbers are misleading.

## Finding 6: No Standard Exists

- Each registry uses its own scoring methodology
- No unified E/S level system
- No self-auditable skills
- No portable trust (score is registry-specific, not skill-embedded)
- No opt-in mechanism for being indexed

## Impact Assessment

**IP Exposure**: Full SKILL.md content (prompts, instructions, implementation details) is publicly available and being redistributed under MIT license by third parties.

**Supply Chain Risk**: Users could install a modified version of SpecWeave skills from these registries, thinking they're official. No provenance verification exists.

**Tamper Risk**: LOW for the current scraper (it downloads verbatim), but HIGH conceptually — nothing prevents a scraper from modifying skill content before republishing.

## Recommendations

1. **SSP Standard** — Publish the Secure Skill Protocol as the unified standard (this increment)
2. **Content Signing** — Implement ed25519 signing for official SpecWeave skills
3. **Self-Audit Manifest** — Add `<!-- VSKILL:VERIFY ssp/v1 -->` to all official skills
4. **Official Sources Page** — Document legitimate install methods
5. **DMCA/Takedown** — Consider for verbatim content republishing (evaluate legal basis)
6. **verified-skill.com** — Position as the trusted, verified registry (0217 deliverable)

## Sources

- OpenSkills CLI: https://github.com/numman-ali/openskills
- majiayu000 profile: https://github.com/majiayu000
- claude-skill-registry: https://github.com/majiayu000/claude-skill-registry
- SkillShield: https://skillshield.io/
- Skills Directory: https://www.skillsdirectory.com/
- Snyk ToxicSkills: https://snyk.io/articles/skill-md-shell-access/
- skills.sh: https://skills.sh/
- SkillsMP: https://skillsmp.com/
