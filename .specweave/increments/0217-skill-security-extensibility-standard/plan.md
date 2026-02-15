# Architecture Plan: 0217-skill-security-extensibility-standard

## Overview

This increment spans 5 domains (security, docs/content, architecture, code, product) and establishes SpecWeave + skill-weave.com as the authoritative solution for AI skill security and extensibility.

## Architecture Decisions

### AD-1: Extend existing foundation
Build on `src/core/fabric/security-scanner.ts` (26 pattern checks, 313 lines) and `src/core/fabric/registry-schema.ts` (3 trust tiers) from 0205-skill-fabric. Don't replace — extend.

### AD-2: Three-tier verification model

```
TIER 1: SCANNED (free, automated)
├── SpecWeave security-scanner.ts (26 pattern checks)
├── Deterministic rules: destructive commands, RCE, credential access, prompt injection
├── Result: PASS/FAIL with findings list
└── Badge: "scanned" (basic trust)

TIER 2: VERIFIED (scanner + LLM judge)
├── All Tier 1 checks PLUS
├── LLM-based intent analysis (skill-judge.ts with Opus)
├── Behavioral capability assessment (why does it need shell access?)
├── Dependency freshness check
├── Auto-verified: skills from Anthropic, OpenAI, Google repos
└── Badge: "verified" (recommended trust)

TIER 3: CERTIFIED (manual review)
├── All Tier 2 checks PLUS
├── Human code review by SpecWeave team
├── Behavioral testing (run skill in sandbox, observe actions)
├── Compliance check (data handling, privacy)
├── Signed attestation
└── Badge: "certified" (highest trust)
```

### AD-3: `npx skill-weave` — Secure installer CLI
- **npm package**: `skill-weave` (available, checked Feb 15 2026)
- **API mirrors `npx skills add`** for familiarity but adds security scanning
- **Auto-detect agents**: Same filesystem detection as Skills.sh (35+ agents)
- **Security-first**: Every install runs Tier 1 scan before writing files
- **Vendor fast-path**: Anthropic/OpenAI/Google/Vercel/Supabase repos skip scan, auto-verified
- **Output**: Security score + findings + user confirmation prompt
- **CLI lives in the skill-weave private repo** alongside the website

### AD-4: skill-weave.com as separate private repo
- **Why private**: Contains scanning infrastructure, LLM prompts for analysis, API keys
- **Public output**: Website at skill-weave.com, badge API, public registry JSON
- **Tech**: Next.js 14+ App Router, Vercel hosting, PostgreSQL for scan results
- **Repo structure**: Turborepo monorepo with `packages/cli/`, `packages/web/`, `packages/scanner/`
- **Integration**: SpecWeave CLI reads from skill-weave.com API for `specweave fabric search/info`

### AD-5: Vendor auto-verification
Skills from these GitHub orgs automatically get `verified` badge:
- `anthropics/` — Anthropic official skills
- `openai/` — OpenAI official skills
- `google/` — Google official skills
- `vercel-labs/` — Vercel (Skills.sh creators)
- `supabase/` — Supabase official
- Custom whitelist configurable per deployment

### AD-6: Standards-first, implementation phased
This increment delivers: specs, architecture docs, PRD, public docs, YouTube content, schema extensions, and code skeletons. Full skill-weave.com implementation is a follow-up increment.

### AD-7: Version-pinned verification (anti-update-poisoning)

Skills.sh has zero versioning — `npx skills add` always gets HEAD of main branch. Symlink makes it worse: upstream push silently changes all agents. This enables **update poisoning**: pass scan at v1.0, inject malware at v1.2, badge still says "verified."

```
INSTALL FLOW:
1. npx skill-weave add anthropics/skills --skill frontend-design
2. Fetches skill content + records git SHA / version tag
3. Runs Tier 1 scan on THAT specific version
4. Stores: skill-weave.lock (version pinning)
   {
     "anthropics/skills/frontend-design": {
       "version": "v1.3.0",
       "sha": "abc123def",
       "scannedAt": "2026-02-15T18:00:00Z",
       "tier": "verified",
       "findings": 0
     }
   }
5. Installs to agent dirs (symlink or copy, user choice)

UPDATE FLOW:
1. npx skill-weave update (or npx skill-weave add --latest)
2. Fetches new version
3. Runs DIFF SCAN — compares old vs new version
4. Highlights NEW patterns: "v1.3.1 adds: eval(), fetch() — REVIEW REQUIRED"
5. User approves or rejects update
6. Updates lock file only after approval + scan pass

CONTINUOUS MONITORING:
- skill-weave.com crawls registered skill repos
- If a previously-verified skill gets suspicious update → badge downgraded
- CLI shows: "WARNING: frontend-design v1.3.1 downgraded from verified → scanned"
```

Key: **Verification is per-version, not per-skill.** Badge = "verified at v1.3.0" not just "verified."

### AD-8: Snyk critique acknowledgment
Snyk proved regex-only scanners give false security. Their example: Skill Defender flagged itself (20 findings) while clearing actual malware (0 findings). Our three-tier model addresses this directly.

## Phased Execution

```
Phase A (Research)  →  Phase B (Architecture + Product)  →  Phase C (Docs) + Phase D (Code)  →  Phase E (Verify)
  [7 parallel]           [12, sequential deps]               [8 + 4, parallel]                    [1, final]
```

## Key Files

**Extend**: `src/core/fabric/registry-schema.ts`, `src/core/fabric/security-scanner.ts`
**Template**: `docs-site/docs/guides/agent-security-best-practices.md`, `docs-site/docs/guides/youtube-tutorial-script.md`
**New**: 5 docs pages, contradiction detector, skill-weave repo scaffold

## Research Data Sources

- [Snyk ToxicSkills](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/) — 36.82% of skills flawed
- [SKILL.md to Shell Access](https://snyk.io/articles/skill-md-shell-access/) — attack chains
- [Skill Scanner False Security](https://snyk.io/blog/skill-scanner-false-security/) — scanner limitations
- [SkillsDirectory.com](https://www.skillsdirectory.com/) — 36K skills, 50+ rules
- [Cisco Skill Scanner](https://github.com/cisco-ai-defense/skill-scanner) — open source
- [vercel-labs/skills](https://github.com/vercel-labs/skills) — Skills.sh installer source
- [pors/skill-audit](https://github.com/pors/skill-audit) — scanning CLI
