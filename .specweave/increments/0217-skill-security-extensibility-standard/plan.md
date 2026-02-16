# Architecture Plan: 0217-skill-security-extensibility-standard

## Overview

This increment spans 6 domains (security, docs/content, architecture, code, product, API/database) and establishes SpecWeave + verified-skill.com as the authoritative solution for AI skill security and extensibility.

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

### AD-3: `npx vskill` — Secure installer CLI
- **npm package**: `vskill` (available, checked Feb 15 2026)
- **API mirrors `npx skills add`** for familiarity but adds security scanning
- **Auto-detect agents**: Same filesystem detection as Skills.sh (35+ agents)
- **Security-first**: Every install runs Tier 1 scan before writing files
- **Vendor fast-path**: Anthropic/OpenAI/Google/Vercel/Supabase repos skip scan, auto-verified
- **Output**: Security score + findings + user confirmation prompt
- **CLI lives in the vskill private repo** alongside the website

### AD-4: verified-skill.com as separate private repo
- **Why private**: Contains scanning infrastructure, LLM prompts for analysis, API keys
- **Public output**: Website at verified-skill.com, badge API, public registry JSON
- **Tech**: Next.js 14+ App Router, Vercel hosting, PostgreSQL for scan results
- **Repo structure**: Turborepo monorepo with `packages/cli/`, `packages/web/`, `packages/scanner/`
- **Integration**: SpecWeave CLI reads from verified-skill.com API for `specweave fabric search/info`

### AD-5: Vendor auto-verification
Skills from these GitHub orgs automatically get `verified` badge:
- `anthropics/` — Anthropic official skills
- `openai/` — OpenAI official skills
- `google/` — Google official skills
- `vercel-labs/` — Vercel (Skills.sh creators)
- `supabase/` — Supabase official
- Custom whitelist configurable per deployment

### AD-6: Standards-first, implementation phased
This increment delivers: specs, architecture docs, PRD, public docs, YouTube content, schema extensions, and code skeletons. Full verified-skill.com implementation is a follow-up increment.

### AD-7: Version-pinned verification (anti-update-poisoning)

Skills.sh has zero versioning — `npx skills add` always gets HEAD of main branch. Symlink makes it worse: upstream push silently changes all agents. This enables **update poisoning**: pass scan at v1.0, inject malware at v1.2, badge still says "verified."

```
INSTALL FLOW:
1. npx vskill add anthropics/skills --skill frontend-design
2. Fetches skill content + records git SHA / version tag
3. Runs Tier 1 scan on THAT specific version
4. Stores: vskill.lock (version pinning)
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
1. npx vskill update (or npx vskill add --latest)
2. Fetches new version
3. Runs DIFF SCAN — compares old vs new version
4. Highlights NEW patterns: "v1.3.1 adds: eval(), fetch() — REVIEW REQUIRED"
5. User approves or rejects update
6. Updates lock file only after approval + scan pass

CONTINUOUS MONITORING:
- verified-skill.com crawls registered skill repos
- If a previously-verified skill gets suspicious update → badge downgraded
- CLI shows: "WARNING: frontend-design v1.3.1 downgraded from verified → scanned"
```

Key: **Verification is per-version, not per-skill.** Badge = "verified at v1.3.0" not just "verified."

### AD-8: Snyk critique acknowledgment
Snyk proved regex-only scanners give false security. Their example: Skill Defender flagged itself (20 findings) while clearing actual malware (0 findings). Our three-tier model addresses this directly.

### AD-9: Submission Pipeline — State Machine Architecture
Submissions flow through a deterministic state machine:

```
RECEIVED → TIER1_SCANNING → TIER2_SCANNING → AUTO_APPROVED → PUBLISHED
                ↓                 ↓                              ↑
             REJECTED        NEEDS_REVIEW → TIER3_REVIEW ────────┘
                                  ↓                    ↓
                              REJECTED             REJECTED
```

**Vendor fast-path**: Trusted orgs (AD-5) skip scanning entirely → `AUTO_APPROVED`.
**Auto-approve threshold**: Tier 1 PASS + Tier 2 PASS (score >= 80) → auto-approved.
**Escalation trigger**: Tier 2 CONCERNS or PASS with score < 80 → needs admin review.
**Workers**: Cloudflare Queues for job distribution (push-based), PostgreSQL for result storage.
**Audit trail**: Every state transition logged with timestamp, trigger, and actor.

### AD-10: Semantic Versioning Engine
- **First submission**: Always `1.0.0`
- **Updates**: Diff analysis of SKILL.md content classifies changes:
  - **MAJOR** (x.0.0): New permissions, scope expansion, new destructive capabilities
  - **MINOR** (0.x.0): New instructions/sections adding capabilities, behavior changes
  - **PATCH** (0.0.x): Typos, formatting, documentation, no behavioral change
- Each version independently verified — badge = "verified at v1.2.0"
- Content hash (SHA-256) stored per version for future diff analysis

### AD-11: Admin Authentication (Simple → Extensible)
- **Phase 1**: JWT-based email/password, bcrypt hashing, 24h access / 7d refresh tokens
- **Roles**: `super_admin` (full access), `reviewer` (approve/reject only)
- **Phase 2** (future): GitHub OAuth, RBAC, audit log UI
- All admin actions create audit trail entries

### AD-12: Email Notification Design
- **Service**: Resend (resend.com) — modern API, 100 emails/day free tier
- **Templates**: React Email components in `packages/web/src/emails/`
- **Triggers**: submission_received, auto_approved, needs_review, rejected, version_published
- **Opt-in**: Email field optional on submission; no email = no notifications (check status via API)

### AD-13: Full 39-Agent Registry (verified from `skills@1.3.9`)
Extracted directly from the published npm package source code:

**7 Universal agents** (use `.agents/skills`): Amp, Codex, Gemini CLI, GitHub Copilot, Kimi Code CLI, OpenCode, Replit (hidden)

**32 Non-universal agents**: Antigravity, Augment, Claude Code, OpenClaw, Cline, CodeBuddy, Command Code, Continue, Crush, Cursor, Droid, Goose, Junie, iFlow CLI, Kilo Code, Kiro CLI, Kode, MCPJam, Mistral Vibe, Mux, OpenHands, Pi, Qoder, Qwen Code, Roo Code, Trae, Trae CN, Windsurf, Zencoder, Neovate, Pochi, AdaL

Each agent has: `id`, `displayName`, `localSkillsDir`, `globalSkillsDir`, `detectInstalled()` logic.

### AD-14: NPX Command Name Strategy

Primary: **`npx vskill`** — aligns with verified-skill.com domain.
Consider `@vskill/cli` scoped package for the actual npm publish to prevent name squatting.

## Phased Execution

```
Phase A (Research)  →  Phase B (Architecture + Product + Submission)  →  Phase C (Docs) + Phase D (Code)  →  Phase E (Verify)
  [7 parallel]           [18, sequential deps]                            [11 + 7, parallel]                   [1, final]
```

## Key Files

**Extend**: `src/core/fabric/registry-schema.ts`, `src/core/fabric/security-scanner.ts`
**Template**: `docs-site/docs/guides/agent-security-best-practices.md`, `docs-site/docs/guides/youtube-tutorial-script.md`
**New docs**: 5 public pages, 3 internal strategy docs (submission, admin, versioning), vskill PRD
**New code**: contradiction detector, vskill repo scaffold with Prisma schema, submission pipeline skeleton, 39-agent registry

## Research Data Sources

- [Snyk ToxicSkills](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/) — 36.82% of skills flawed
- [SKILL.md to Shell Access](https://snyk.io/articles/skill-md-shell-access/) — attack chains
- [Skill Scanner False Security](https://snyk.io/blog/skill-scanner-false-security/) — scanner limitations
- [SkillsDirectory.com](https://www.skillsdirectory.com/) — 36K skills, 50+ rules
- [Cisco Skill Scanner](https://github.com/cisco-ai-defense/skill-scanner) — open source
- [vercel-labs/skills](https://github.com/vercel-labs/skills) — Skills.sh installer source
- [pors/skill-audit](https://github.com/pors/skill-audit) — scanning CLI
