# Findings Report and Official Sources

**Increment**: 0218-secure-skill-standard-investigation
**Date**: 2026-02-15
**Status**: Complete
**Feeds into**: 0217-skill-security-extensibility-standard

---

## 1. Investigation Summary

This section synthesizes findings from the forensic investigation (see `forensic-investigation.md` for full details).

### 1.1 Ecosystem Exposure

SpecWeave skills are being automatically scraped and republished across multiple third-party registries. The primary scraper, `majiayu000/claude-skill-registry`, operates a daily GitHub Actions pipeline that crawls every public repository containing SKILL.md files. As of February 2026, it has indexed **24,176 SKILL.md files**, including **30+ SpecWeave skills** from `anton-abyzov/specweave`.

The scraped skills include core functionality: pm, framework, detector, github-sync, ado-sync, jira-sync, preview, docs-writer, qa-lead, context-loader, and more. Each is republished with metadata pointing back to the original repo but with no verification of authorship, integrity, or authorization from the skill author.

First scrape date: **January 6, 2026** (via SkillsMP API) and **January 14, 2026** (direct GitHub crawl).

### 1.2 The 92/100 Score

The external security score of 92/100 attributed to SpecWeave skills does **not** come from SpecWeave's own scanner. SpecWeave's `security-scanner.ts` produces pass/fail results using 29 regex patterns with no numeric scoring.

The score originates from an external scanner, most likely **SkillShield.io**, which uses a four-layer analysis (manifest, static code, dependency graph, LLM behavioral safety). The only finding that docked points was "Installs packages at runtime" (approximately -8 points from 100).

This score is meaningless for trust purposes. It was computed by a third party, against a scraped copy, with no input from the skill author. It cannot be reproduced, audited, or verified.

### 1.3 Registry Landscape

The AI skills ecosystem has fragmented into 10+ competing registries with no shared standards:

| Platform | Scale | Scoring Method | Security |
|----------|-------|---------------|----------|
| skills.sh | ~59,848 skills | None | None |
| SkillsMP | 87K-96K+ skills | None visible | None |
| Skills Directory | 36,109 skills | Letter grades A-F, 50+ rules | Proprietary |
| SkillShield | 10,644 scanned | 4-layer numeric score | Proprietary |
| OpenSkills.app | ~41 curated | None | None |
| majiayu000 registry | 24,176 SKILL.md files | None | None |

Key observations:
- 59% of listed skills ship embedded scripts
- 12% are completely empty (zero content)
- No registry uses the same scoring methodology
- No registry supports cryptographic verification
- No opt-in mechanism exists for being indexed

### 1.4 Snyk ClawHavoc Findings

Snyk researchers discovered **341 malicious skills on ClawHub** (January 27-29, 2026), representing **12% of the entire registry**. The campaign delivered Atomic Stealer malware via base64-encoded payloads. Three design flaws enabled the attack:

1. **No sandboxing**: Skills execute with full shell permissions
2. **No cryptographic verification**: No signing, no provenance, no tamper detection
3. **Precedence override**: Malicious skills can override system safety instructions

The broader ToxicSkills study found **36.82% of skills have security flaws** across registries.

### 1.5 Supply Chain Risk Assessment

| Risk | Level | Description |
|------|-------|-------------|
| IP Exposure | HIGH | Full SKILL.md content (prompts, instructions, architecture) publicly redistributed |
| Impersonation | HIGH | Users could install modified SpecWeave skills from unofficial sources believing them official |
| Tamper (current) | LOW | Current scrapers download verbatim content |
| Tamper (structural) | HIGH | Nothing prevents a scraper from modifying skill content before republishing |
| Reputation | MEDIUM | Third-party scores attributed to SpecWeave could mislead users |

---

## 2. SSP Design Decisions

### 2.1 Why Two Dimensions (E + S)

A single score conflates two independent concerns. A skill can be architecturally simple (E0) but thoroughly verified (S3), or composable (E3) but never scanned (S0). Separating extensibility from security enables:

- **Consumers** to filter by what they need: "I want a standalone, certified skill" (E0/S3) vs. "I need a composable skill, any security level" (E3/S*)
- **Authors** to improve each dimension independently: harden security without changing architecture, or add extensibility without re-certification
- **Registries** to sort and filter on meaningful axes instead of a single opaque number

The design was informed by the failure of existing single-dimensional scoring. SkillShield's 0-100 score and Skills Directory's A-F grades both collapse extensibility and security into one number, making it impossible to distinguish a simple safe skill from a complex risky one.

### 2.2 Why Deterministic Scoring

LLM-based scoring produces different results on different runs. Snyk's ClawHavoc research showed that LLM behavioral safety checks — the kind used by SkillShield's Layer 4 — can be bypassed with trivial encoding techniques. A score that changes between runs or depends on which LLM version evaluates it is not a standard — it is an opinion.

SSP makes the scoring algorithm deterministic and version-pinned:
- `ssp/v1.0` always produces the same score for the same content
- LLM analysis contributes to S2 qualification but does NOT affect the numeric score
- Algorithm changes require a new SSP version (e.g., `ssp/v2.0`)
- Skills retain their score under the version they were scored against

This means scores are reproducible, auditable, and comparable across registries, tools, and time.

### 2.3 Why Self-Auditable Manifests

Current trust models are registry-dependent. A skill scored 92/100 on SkillShield has no trust when downloaded via `npx openskills install` — the score exists on SkillShield's servers, not in the skill itself.

The VSKILL:VERIFY manifest embeds trust directly in the skill file:
- `VSKILL:PERMISSIONS` — declared capabilities
- `VSKILL:HASH` — content integrity (SHA-256)
- `VSKILL:SIGNED` — author authenticity (ed25519)
- `VSKILL:SCORE` — verified quality (deterministic score + SSP version + date)

This means trust is portable. A signed skill carries its proof regardless of which registry hosts it, which scraper copies it, or which CLI installs it. Any runtime can verify the skill locally without network access.

The analogy is HTTPS certificates: the browser does not trust a website because the hosting provider says it is safe. The browser verifies the certificate independently. SSP does the same for skills.

### 2.4 Why ed25519 Signing

ed25519 was chosen for the cryptographic signature scheme because:

- **Performance**: ed25519 signatures are generated and verified in microseconds, suitable for CLI tooling where users expect instant results
- **Key size**: 32-byte public keys are small enough to embed in manifest comments without bloating the file
- **Ecosystem**: Widely supported in Node.js (built into `crypto` module since v15), no native dependencies required
- **Security**: 128-bit security level, resistant to known attacks, deterministic signatures (same input always produces same signature)
- **Precedent**: Used by SSH (`ssh-ed25519`), Sigstore (for npm package signing), and Minisign (for general-purpose file signing)

RSA was rejected due to key size (2048+ bits would bloat manifests). ECDSA was rejected due to non-deterministic signatures (same input can produce different signatures, complicating verification).

---

## 3. Feed into 0217: Implementation Requirements

The following items are findings from 0218 that 0217-skill-security-extensibility-standard must implement.

### 3.1 Extend security-scanner.ts with Weighted Scoring

**Current state**: `security-scanner.ts` has 29 regex patterns producing pass/fail results with severity labels (critical, high, medium, low, info).

**Required changes**:
- Add category classification to each pattern (Destructive, Execution, Data Access, Prompt Safety, Declaration Honesty)
- Implement weighted scoring formula: `Score = 100 - SUM(weight * penalty * count)`
- Add Declaration Honesty category: compare VSKILL:PERMISSIONS against detected patterns
- Return numeric score alongside pass/fail
- Pin scoring to SSP version string (`ssp/v1.0`)

### 3.2 Add VSKILL:VERIFY Manifest Parsing

**Required**:
- Parser for `<!-- VSKILL:* -->` HTML comment fields
- Content hash computation (SHA-256, excluding manifest block)
- Hash comparison (computed vs. declared)
- Signature verification (ed25519)
- Permission extraction and cross-referencing against scan findings

### 3.3 Build vskill CLI

**Commands**:
- `vskill verify <path>` — Score + findings (human-readable + JSON)
- `vskill install <author/skill>` — Verify before install (gate on S-level threshold)
- `vskill audit [--path <dir>]` — Scan all installed skills
- `vskill sign <path> --key <keyfile>` — Attach ed25519 signature + VSKILL:VERIFY manifest
- `vskill info <path>` — Display E/S level, score, audit history

**Package**: `vskill` on npm. Binary name: `vskill`.

**Integration**: `vskill` shares the scanner engine with `specweave` but is a separate npm package. Users do not need SpecWeave installed to verify skills. The scanner is extracted into a shared library that both CLIs depend on.

### 3.4 Launch verified-skill.com

**Purpose**: Trusted registry for SSP-verified skills. The anti-SkillsMP.

**Requirements**:
- Display SSP badges (E/S levels) for all indexed skills
- Online verification: paste SKILL.md content, get instant score
- Author registration with ed25519 public key submission
- Provenance tracking: link to source repository, show scrape history
- API for programmatic verification

### 3.5 Sign Official SpecWeave Skills

**Action**: Generate ed25519 key pair for `anton-abyzov/specweave`. Add VSKILL:VERIFY manifests to all 30+ official skills. Publish public key on verified-skill.com and in the SpecWeave GitHub repository.

This directly addresses the supply chain risk: users can verify that a skill claiming to be from SpecWeave was actually signed by the SpecWeave key.

---

## 4. Official Sources

The following are the ONLY legitimate sources for SpecWeave software, skills, and documentation.

### 4.1 Installation

| Method | Command / URL | Verified |
|--------|--------------|----------|
| npm (global) | `npm install -g specweave` | Yes |
| npm (one-time) | `npx specweave` | Yes |
| GitHub source | https://github.com/anton-abyzov/specweave | Yes |

### 4.2 Documentation

| Resource | URL | Verified |
|----------|-----|----------|
| Official docs | https://spec-weave.com | Yes |
| GitHub README | https://github.com/anton-abyzov/specweave#readme | Yes |

### 4.3 Skills Verification (Coming Soon)

| Tool | Command / URL | Status |
|------|--------------|--------|
| vskill CLI | `npx vskill verify ./SKILL.md` | In development |
| Verified registry | https://verified-skill.com | Planned |

### 4.4 Unofficial and Unverified Sources (WARNING)

The following sources redistribute SpecWeave skills WITHOUT authorization. Skills obtained from these sources have NOT been verified by SpecWeave and may have been modified.

| Source | Risk | Notes |
|--------|------|-------|
| majiayu000/claude-skill-registry | Supply chain | Automated scraper, 24K+ skills crawled from GitHub |
| SkillsMP (skillsmp.com) | Supply chain | Claims 200K+ skills, API used by scrapers |
| skills.sh | Supply chain | Aggregator, ~60K skills, no verification |
| Skills Directory (skillsdirectory.com) | Low-medium | Letter grades but proprietary scoring |
| SkillShield (skillshield.io) | Low-medium | Security scanning but non-standard scoring |
| OpenSkills (openskills.app) | Low | Small curated set, community-run, no security scanning |

**Users should ONLY install SpecWeave and its skills from npm or the official GitHub repository.** Any other source is unofficial and unverified. After `vskill` launches, users will be able to verify skills from any source using `npx vskill verify`.

---

## 5. Actionable Next Steps for 0217

Prioritized by urgency and impact.

### Priority 0 (Immediate)

1. **Extend security-scanner.ts with weighted scoring** — The existing 29 patterns already have severity labels. Adding category weights and the scoring formula is a targeted change to the existing scanner architecture. This is the foundation everything else builds on.

2. **Add Declaration Honesty category** — New pattern set comparing VSKILL:PERMISSIONS against detected behaviors. Required for the scoring rubric to function completely.

3. **Implement VSKILL:VERIFY manifest parser** — Parse `<!-- VSKILL:* -->` comments, extract fields, validate format. Prerequisite for all S3 functionality.

### Priority 1 (Core)

4. **Build vskill verify command** — The primary user-facing deliverable. Takes a SKILL.md path, runs the weighted scanner, outputs score + findings. Both human-readable and JSON output modes.

5. **Build vskill sign command** — ed25519 key generation, content hashing (SHA-256), signature generation, manifest embedding. Enables S3 certification.

6. **Sign all official SpecWeave skills** — Generate project key pair, add VSKILL:VERIFY manifests to all 30+ skills. Publish public key.

7. **Publish SSP specification** — Host the RFC document on spec-weave.com. Make the scoring algorithm, E/S level definitions, and manifest format publicly available.

### Priority 2 (Ecosystem)

8. **Build vskill install command** — Install with pre-verification gate. Refuse to install skills below configurable S-level threshold.

9. **Build vskill audit command** — Scan all installed skills in `.claude/skills/` directory. Report E/S levels and aggregate score.

10. **Launch verified-skill.com** — Minimal viable registry: badge display, online verification, author registration.

11. **Publish npm package `vskill`** — Register package name, publish CLI, set up CI/CD for releases.

### Priority 3 (Growth)

12. **Build vskill info command** — Display detailed E/S information, score breakdown, audit history for a single skill.

13. **API for verified-skill.com** — Programmatic verification endpoint for registry integrations.

14. **Badge service** — `https://verified-skill.com/badge/E2/S3` returns an SVG badge for use in READMEs and registries.

15. **Community outreach** — Contact registry operators (Skills Directory, SkillShield) about SSP adoption. Publish blog post. Release YouTube content.

---

## Sources

- Forensic Investigation Report: `.specweave/increments/0218-secure-skill-standard-investigation/reports/forensic-investigation.md`
- Snyk ClawHavoc: https://snyk.io/articles/skill-md-shell-access/
- Snyk ToxicSkills: https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/
- NCSC UK Prompt Injection: https://www.ncsc.gov.uk/blog-post/prompt-injection-ai-systems
- OpenSkills CLI: https://github.com/numman-ali/openskills
- majiayu000 registry: https://github.com/majiayu000/claude-skill-registry
- SkillShield: https://skillshield.io/
- Skills Directory: https://www.skillsdirectory.com/
- SpecWeave GitHub: https://github.com/anton-abyzov/specweave
- SpecWeave Docs: https://spec-weave.com
