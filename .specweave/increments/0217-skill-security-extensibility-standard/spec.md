---
increment: 0217-skill-security-extensibility-standard
title: "Skill Security, Extensibility Standard & verified-skill.com"
type: feature
priority: P1
status: planned
created: 2026-02-15
structure: user-stories
test_mode: TDD
coverage_target: 80
---

# Feature: Skill Security, Extensibility Standard & verified-skill.com

## Overview

The AI Skills ecosystem is a security disaster. Snyk's ToxicSkills study (Feb 5, 2026) found 36.82% of skills have security flaws, 76 confirmed malicious payloads, and 13.4% contain critical issues. This increment establishes SpecWeave as the authority on AI skill security by: publishing comprehensive security analysis, designing a Secure Skill Factory standard with three-tier verification, launching the verified-skill.com product vision with `npx vskill` CLI, and solving the contradiction/versioning problems that no platform addresses.

**Key data points**:
- [Snyk ToxicSkills](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/): 3,984 skills scanned, 1,467 flawed
- Smithery breach (Oct 2025): path traversal exposed Fly.io API token, 3000+ apps compromised
- Skills.sh: 233K installs on top skill, zero security scanning, zero versioning
- [NCSC UK](https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection): "Prompt injection may never be fixable"

## User Stories

### US-001: Skills Ecosystem Security Landscape (P1)
**Project**: specweave

**As a** security-conscious developer evaluating AI skill platforms
**I want** a comprehensive analysis of the skills ecosystem security landscape
**So that** I can make informed decisions about which platforms and skills to trust

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Public docs page covers 5+ major platforms (Skills.sh, Smithery, SkillsDirectory, Fabric, vendor skills) with security posture assessment
- [ ] **AC-US1-02**: Risk taxonomy covers prompt injection, credential theft, data exfiltration, supply chain attacks, and privilege escalation
- [ ] **AC-US1-03**: Platform comparison table with verifiable security attributes (scanning, trust tiers, breach history, transparency)
- [ ] **AC-US1-04**: SpecWeave's security approach documented as differentiated alternative with references to existing scanner
- [ ] **AC-US1-05**: Page follows Docusaurus pattern (YAML frontmatter, Mermaid diagrams, Diataxis framework)
- [ ] **AC-US1-06**: Snyk ToxicSkills data cited (36.82%, 76 malicious payloads, specific threat actors)

---

### US-002: YouTube Script — Supply Chain Risk (P1)
**Project**: specweave

**As a** content creator targeting cybersecurity-adjacent audiences
**I want** a YouTube script section covering AI skill supply chain risk
**So that** I can produce engaging video content about a topic with insufficient coverage

**Acceptance Criteria**:
- [ ] **AC-US2-01**: ~8 min section titled "Are AI Skills Safe? The Supply Chain Risk" in `youtube-tutorial-script.md`
- [ ] **AC-US2-02**: Script includes Smithery breach, Snyk findings, base64 exfiltration example
- [ ] **AC-US2-03**: Contrasts SpecWeave's transparent markdown approach vs executable skill platforms
- [ ] **AC-US2-04**: Follows existing script format (narrator voice `> "quotes"`, screen directions `**[SCREEN:]**`, timestamps)
- [ ] **AC-US2-05**: Introduces verified-skill.com as the solution

---

### US-003: Skill Discovery & Evaluation Guide (P2)
**Project**: specweave

**As a** developer searching for skills across multiple platforms
**I want** guidance on finding quality skills and detecting discrepancies between duplicate providers
**So that** I can choose the best version of a skill for my use case

**Acceptance Criteria**:
- [ ] **AC-US3-01**: Guide documents 6+ discovery sources (vendor repos, Skills.sh, ClawHub, GitHub, Fabric registry, third-party scanners)
- [ ] **AC-US3-02**: Quality scoring rubric with 6 dimensions (transparency, security scan, author reputation, update frequency, test coverage, portability)
- [ ] **AC-US3-03**: Discrepancy detection concept documented for same-skill-different-providers
- [ ] **AC-US3-04**: `specweave fabric compare` CLI design document with command syntax and output format

---

### US-004: Secure Skill Factory Standard — RFC (P1)
**Project**: specweave

**As a** platform architect
**I want** a Secure Skill Factory standard that defines how skills should be authored, verified, and distributed
**So that** the broader ecosystem converges on safe practices

**Acceptance Criteria**:
- [ ] **AC-US4-01**: RFC document with mandatory SKILL.md sections (description, scope, permissions, security-notes), forbidden patterns, built-in security prompt
- [ ] **AC-US4-02**: Three-tier certification defined: `scanned` (automated rules) → `verified` (rules + LLM judge) → `certified` (manual review)
- [ ] **AC-US4-03**: Trust labels specified: extensible, safe, portable, deprecated, warning — with visual badge design
- [ ] **AC-US4-04**: Vendor auto-verification rules: Anthropic/OpenAI/Google skills auto-get `verified` badge
- [ ] **AC-US4-05**: Registry schema extensions implemented in TypeScript (certification, trust labels, scan history, contradictions)
- [ ] **AC-US4-06**: Standards proposal suitable for broader ecosystem adoption (RFC-style format)

---

### US-005: Contradiction Resolution System (P2)
**Project**: specweave

**As a** developer using skills from multiple providers
**I want** a system that detects and resolves contradicting instructions from different skill sources
**So that** my AI agent follows consistent, predictable instructions

**Acceptance Criteria**:
- [ ] **AC-US5-01**: 4 conflict types documented with real examples: behavioral, configuration, dependency, precedence
- [ ] **AC-US5-02**: Priority resolution chain designed: local > project > vendor > community
- [ ] **AC-US5-03**: Merge strategies documented: additive (combine non-conflicting), replacement (higher priority wins), manual (flag for user)
- [ ] **AC-US5-04**: Contradiction detector skeleton in TypeScript with simple heuristics

---

### US-006: Extensibility Standard Analysis (P2)
**Project**: specweave

**As a** platform integrator
**I want** to understand how universal the Agent Skills format truly is across 39 platforms
**So that** I can build skills that work everywhere without platform-specific forks

**Acceptance Criteria**:
- [ ] **AC-US6-01**: Compatibility matrix across 15+ platforms (Claude, ChatGPT, Codex, Gemini, Cursor, Copilot, Windsurf, Cline, Aider, etc.)
- [ ] **AC-US6-02**: Format variation analysis documenting platform-specific extensions
- [ ] **AC-US6-03**: Portability guidelines with testing checklist
- [ ] **AC-US6-04**: Integration with existing `agentSkillsCompat` field in `FabricRegistryEntry`

---

### US-007: verified-skill.com Product Vision (P1)
**Project**: specweave

**As a** product owner
**I want** a full product spec for verified-skill.com
**So that** we can build the secure skill factory as a standalone product

**Acceptance Criteria**:
- [ ] **AC-US7-01**: PRD with mission, target users, value proposition, competitive positioning
- [ ] **AC-US7-02**: Three-tier verification architecture: basic scan (free) → scanner + LLM (verified) → manual review (certified)
- [ ] **AC-US7-03**: Vendor auto-verification rules (Anthropic/OpenAI/Google → auto-verified)
- [ ] **AC-US7-04**: Continuous scanning pipeline design (crawl Skills.sh, ClawHub, GitHub repos)
- [ ] **AC-US7-05**: Badge/label system: verified, extensible, safe, portable, deprecated, warning
- [ ] **AC-US7-06**: Private repo structure designed (monorepo: packages/cli + packages/web + packages/scanner)
- [ ] **AC-US7-07**: Website architecture (Next.js 14+, search, skill pages, badge API)
- [ ] **AC-US7-08**: Business model consideration (free tier, pro scanning, enterprise)
- [ ] **AC-US7-09**: Landing page onboarding flow — clear step-by-step: init → find → install/verify → update, positioned prominently on homepage
- [ ] **AC-US7-10**: Agent registry visualization — card/grid layout showing all 39 supported agents with universal/non-universal badges and platform icons
- [ ] **AC-US7-11**: UI design direction document — minimalistic, verification-first, distinctive identity (NOT default dark theme), UI8 expert-level craft, unique color palette and typography
- [ ] **AC-US7-12**: Popularity signals aggregation — GitHub stars/forks, npm weekly downloads, vskill install counts, commit recency — displayed on each skill page
- [ ] **AC-US7-13**: Trending algorithm design — weighted composite (install velocity + stars growth + recency + verification tier) with configurable time windows (7d/30d), powering "Trending" section on homepage
- [ ] **AC-US7-14**: Skill comparison/ranking — sortable leaderboard by category (security, coding, writing, etc.) with filters for verification tier, popularity, recency

---

### US-008: Secure Multi-Platform Skill Installer CLI (P1)
**Project**: specweave

**As a** developer installing skills from any source
**I want** a CLI that scans skills before installing and works across all 39 agent platforms
**So that** I never install a malicious or vulnerable skill unknowingly

**Acceptance Criteria**:
- [ ] **AC-US8-01**: `npx vskill add owner/repo` command design (mirrors `npx skills add` API)
- [ ] **AC-US8-02**: Auto-detection of all 39 installed agents (verified from `skills@1.3.9` source)
- [ ] **AC-US8-03**: Security scan runs automatically before install (Tier 1 minimum)
- [ ] **AC-US8-04**: Security score displayed with findings summary, user chooses to proceed or abort
- [ ] **AC-US8-05**: Vendor auto-verification skips scan for trusted orgs (anthropics/, openai/, google/)
- [ ] **AC-US8-06**: npm package `vskill` reserved and scaffold published
- [ ] **AC-US8-07**: CLI design document with full command reference (`add`, `scan`, `list`, `compare`, `update`, `submit`)
- [ ] **AC-US8-08**: 39-agent registry data model with paths, detection logic, universal/non-universal classification

---

### US-009: Version-Pinned Verification (P1)
**Project**: specweave

**As a** developer who installed a verified skill
**I want** version pinning and diff scanning on updates
**So that** a malicious update can't silently compromise my agents after the initial verification

**Acceptance Criteria**:
- [ ] **AC-US9-01**: Lock file design (`vskill.lock`) recording version/SHA, scan date, tier, findings per installed skill
- [ ] **AC-US9-02**: Update flow with diff scan — highlights NEW patterns added since last verified version
- [ ] **AC-US9-03**: Badge is per-version: "verified at v1.3.0" not just "verified"
- [ ] **AC-US9-04**: Continuous monitoring design — downgrade badge if suspicious update detected
- [ ] **AC-US9-05**: CLI shows warnings for downgraded skills on next run

---

### US-010: Skill Submission Request System (P1)
**Project**: specweave

**As a** skill author who has built a useful AI skill
**I want** to submit my skill for verification and inclusion on verified-skill.com
**So that** my skill gets a trust badge and reaches a wider audience through a curated marketplace

**Acceptance Criteria**:
- [ ] **AC-US10-01**: Web form accepts GitHub repo URL, skill name, optional email for notification
- [ ] **AC-US10-02**: API endpoint `POST /api/v1/submissions` accepts same data programmatically
- [ ] **AC-US10-03**: Submission immediately triggers Tier 1 scan (deterministic patterns)
- [ ] **AC-US10-04**: If Tier 1 passes, Tier 2 LLM judge runs automatically
- [ ] **AC-US10-05**: If both tiers pass (score >= 80), skill is auto-approved and published with v1.0.0
- [ ] **AC-US10-06**: If either tier has doubts/failures, submission flagged for admin review
- [ ] **AC-US10-07**: Submitter can check status via `GET /api/v1/submissions/:id`
- [ ] **AC-US10-08**: Optional email notification on approval or rejection (email not mandatory)
- [ ] **AC-US10-09**: Submission state machine has full audit trail (state transitions logged)
- [ ] **AC-US10-10**: Vendor auto-verification for trusted orgs bypasses scanning

---

### US-011: Admin Management Dashboard (P1)
**Project**: specweave

**As a** platform admin
**I want** a dashboard to manage skill submission requests and monitor platform health
**So that** I can review flagged submissions, approve/reject skills, and ensure quality

**Acceptance Criteria**:
- [ ] **AC-US11-01**: Admin login with JWT-based authentication (email/password)
- [ ] **AC-US11-02**: Dashboard shows submission queue with status filters (pending, needs-review, approved, rejected)
- [ ] **AC-US11-03**: Admin can approve a submission (moves to published, assigns version)
- [ ] **AC-US11-04**: Admin can reject a submission with a reason text (submitter notified)
- [ ] **AC-US11-05**: Admin can escalate auto-flagged submission to Tier 3 manual review
- [ ] **AC-US11-06**: Dashboard shows scan results per submission (Tier 1 findings, Tier 2 judge verdict)
- [ ] **AC-US11-07**: Dashboard shows platform stats: total skills, approval rate, scan metrics
- [ ] **AC-US11-08**: Version history visible per skill with badge status per version
- [ ] **AC-US11-09**: Admin roles: super_admin (full access), reviewer (approve/reject only)
- [ ] **AC-US11-10**: All admin actions logged in audit trail

---

### US-012: Skill Versioning Mechanism (P1)
**Project**: specweave

**As a** skill author updating my previously verified skill
**I want** my updates to be independently verified and assigned a new semantic version
**So that** users know which version was verified and can track changes

**Acceptance Criteria**:
- [ ] **AC-US12-01**: First verified version is always 1.0.0
- [ ] **AC-US12-02**: Subsequent submissions for same skill trigger diff analysis against previous version
- [ ] **AC-US12-03**: Version bump type (major/minor/patch) determined by diff analysis rules
- [ ] **AC-US12-04**: Each version independently scanned — badge = "verified at v1.2.0"
- [ ] **AC-US12-05**: Version history tracked per skill with scan results per version
- [ ] **AC-US12-06**: Git SHA recorded per version for content integrity
- [ ] **AC-US12-07**: Content hash stored for future diff analysis

## Functional Requirements

### FR-001: Extend existing security scanner foundation
Build on `src/core/fabric/security-scanner.ts` (26 patterns, 6 severity levels) and `src/core/fabric/registry-schema.ts` (3 trust tiers) from 0205-skill-fabric.

### FR-002: Standards-first, implementation phased
This increment delivers specs, architecture docs, PRD, public docs, YouTube content, schema extensions, and code skeletons. Full verified-skill.com implementation deferred to follow-up increment.

### FR-003: Three-tier verification addresses scanner limitations
Snyk proved regex-only scanners give false security. Three tiers: deterministic rules (fast, cheap) → LLM intent analysis (catches obfuscation) → human review (catches everything).

## Success Criteria

- 5 new public docs pages published and building successfully
- YouTube script section integrated with existing tutorial
- Registry schema extended with backward-compatible TypeScript interfaces
- Contradiction detector skeleton with >80% test coverage
- verified-skill.com PRD complete with architecture, tech stack, business model
- vskill private repo scaffolded as monorepo
- Submission system design doc with state machine, API spec, decision logic
- Admin dashboard design doc with auth flow, wireframes, role matrix
- Versioning mechanism design doc with diff rules and content hashing
- Prisma schema validates with all entities (submissions, skills, versions, admins)
- Submission state machine TypeScript skeleton compiles
- 39-agent registry data file with all agent paths and detection logic

## Out of Scope

- Full verified-skill.com website implementation (follow-up increment)
- Full `npx vskill` CLI implementation (follow-up increment)
- Continuous scanning daemon runtime (design only)
- Runtime contradiction resolution (skeleton only)
- npm package publishing (scaffold only)

## Dependencies

- 0205-skill-fabric (abandoned — foundation code already shipped): `security-scanner.ts`, `registry-schema.ts`, `fabric-registry/registry.json`
- Existing docs infrastructure: `docs-site/` (Docusaurus), `sidebars.ts`
- Existing skill infrastructure: `skill-validator.ts`, `skill-judge.ts`
