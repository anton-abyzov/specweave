---
increment: 0218-secure-skill-standard-investigation
title: "Secure Skill Standard & Marketplace Investigation"
type: feature
priority: P1
status: completed
created: 2026-02-15
structure: user-stories
test_mode: test-after
coverage_target: 80
---

# Feature: Secure Skill Standard & Marketplace Investigation

## Overview

A SpecWeave skill listing was found on an external "Open Skills" registry published by `majiayu000/claude-skill-registry`, with scraped metadata ("Framework Anton Abyzov Specweave"), a security score of 92/100, and a foreign install command. This triggered investigation into skill security scoring gaps and the need for a universal standard.

**The paradigm shift**: Skills are the new libraries. npm/pip/cargo standardized code packages over decades. Skills — language-agnostic, platform-agnostic AI instructions — need the same security evolution NOW.

**Key data**: Snyk ClawHavoc campaign (Jan 2026) found 341 malicious skills on ClawHub (12% of registry), delivering Atomic Stealer malware. Three fundamental design flaws enable attacks: no sandboxing, no cryptographic verification, precedence override risk.

**Reference**: https://snyk.io/articles/skill-md-shell-access/ (Liran Tal, Snyk, Feb 3 2026)

**Relation**: Findings feed into 0217-skill-security-extensibility-standard for implementation.

## User Stories

### US-001: Forensic Analysis of External Skill Listing (P1)
**Project**: specweave

**As a** SpecWeave maintainer
**I want** to understand how our skill descriptions appeared on the openskills registry
**So that** I can assess IP exposure and supply chain risk

**Acceptance Criteria**:
- [x] **AC-US1-01**: Document what "openskills" registry is — platform, operator, API, publishing mechanism
- [x] **AC-US1-02**: Identify who `majiayu000` is and what `claude-skill-registry` contains
- [x] **AC-US1-03**: Compare scraped listing content against our actual skill descriptions (diff analysis)
- [x] **AC-US1-04**: Assess whether the repackaged skill could introduce malicious modifications

---

### US-002: Secure Skill Protocol (SSP) Standard Draft (P1)
**Project**: specweave

**As a** skill ecosystem participant
**I want** a universal standard for rating skill extensibility and security
**So that** skills carry portable, verifiable trust regardless of which registry hosts them

**Acceptance Criteria**:
- [x] **AC-US2-01**: Define E-levels (E0-E3) — Standalone, Importable, Extensible, Composable — with compliance criteria
- [x] **AC-US2-02**: Define S-levels (S0-S3) — Unknown, Scanned, Verified, Certified — with compliance criteria
- [x] **AC-US2-03**: Design unified scoring rubric (weighted categories → 0-100 score, deterministic, versioned)
- [x] **AC-US2-04**: Specify `<!-- VSKILL:VERIFY ssp/v1 -->` self-audit manifest format for self-auditable skills
- [x] **AC-US2-05**: Draft SSP RFC document for public docs

---

### US-003: `npx vskill` CLI Design (P1)
**Project**: specweave

**As a** skill author or consumer
**I want** a CLI tool to verify, score, and sign skills against the SSP standard
**So that** I can trust skills from any source

**Acceptance Criteria**:
- [x] **AC-US3-01**: Design `vskill verify` command — input: SKILL.md, output: score + findings (human-readable + JSON)
- [x] **AC-US3-02**: Design `vskill install` command — install with pre-verification gate
- [x] **AC-US3-03**: Design `vskill audit` command — scan all installed skills, report E/S levels
- [x] **AC-US3-04**: Design `vskill sign` command — ed25519 cryptographic signing
- [x] **AC-US3-05**: Specify how `vskill` integrates with existing `specweave` CLI

---

### US-004: Public Docs & YouTube Content (P1)
**Project**: specweave

**As a** SpecWeave evangelist
**I want** public documentation and YouTube script content about the SSP standard
**So that** the community understands why secure skills matter

**Acceptance Criteria**:
- [x] **AC-US4-01**: "Skills are the new libraries" narrative page for docs-site
- [x] **AC-US4-02**: SSP standard reference page with E/S level definitions and scoring rubric
- [x] **AC-US4-03**: YouTube script section covering paradigm shift (npm→skills), ClawHavoc data, SSP solution, `npx vskill` demo
- [x] **AC-US4-04**: "Official sources" page listing legitimate SpecWeave install methods
- [x] **AC-US4-05**: Snyk ClawHavoc case study with data points and citations

## Functional Requirements

### FR-001: SSP Two-Dimensional Rating
Every skill rated on two independent axes:
- **Extensibility**: E0 (Standalone) → E3 (Composable)
- **Security**: S0 (Unknown) → S3 (Certified + self-auditable)
- Format: `E2/S3` displayed as badge

### FR-002: Self-Auditable Skills (S3)
S3 skills contain `<!-- VSKILL:VERIFY ssp/v1 -->` manifest that enables reproducible scoring by any runtime. Trust lives in the skill, not in the registry.

### FR-003: Unified Scoring Algorithm
Weighted category scoring: Destructive (25%) + Execution (25%) + Data Access (20%) + Prompt Safety (15%) + Declaration Honesty (15%) = 0-100 score. Deterministic per SSP version.

### FR-004: `npx vskill` CLI
Secure Skill CLI (like `ssh` for skills): verify, install, audit, sign commands. Three keystrokes.

## Success Criteria

- SSP RFC document published in public docs
- Forensic investigation documented with sources
- YouTube script section drafted with Snyk data points
- Scoring algorithm specified with examples
- CLI design documented with command specs

## Out of Scope

- Full `npx vskill` CLI implementation (design only in this increment)
- verified-skill.com website implementation (covered by 0217)
- Cryptographic key infrastructure setup
- Runtime SSP enforcement in agent runtimes

## Dependencies

- 0217-skill-security-extensibility-standard (parent increment, receives findings)
- Existing `security-scanner.ts` (29 patterns, pass/fail)
- Existing `registry-schema.ts` (tier definitions)
- Existing `skill-judge.ts` (planned Tier 2 LLM scoring)
