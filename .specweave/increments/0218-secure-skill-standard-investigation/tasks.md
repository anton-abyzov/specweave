# Tasks: 0218-secure-skill-standard-investigation

## Phase 1: Forensic Investigation

### T-001: Research openskills registry
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given openskills URL → When researched → Then platform, operator, API, publishing mechanism documented

Research the openskills registry: what is it, who runs it, how are skills published, what security scanning do they perform, what's their scoring methodology (the 92/100).

---

### T-002: Investigate majiayu000 and claude-skill-registry
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02 | **Status**: [x] completed
**Test**: Given majiayu000 profile → When investigated → Then identity, repos, publishing history documented

Find majiayu000's GitHub profile, what claude-skill-registry contains, when it was published, whether it's automated scraping or manual.

---

### T-003: Diff scraped listing against our skill descriptions
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03, AC-US1-04 | **Status**: [x] completed
**Test**: Given scraped content and our SKILL.md files → When diffed → Then overlap percentage and modifications documented

Compare the listing content ("Framework Anton Abyzov Specweave", security tags, description) against our actual skill descriptions. Identify what was copied, modified, or injected.

---

## Phase 2: SSP Standard Design

### T-004: Draft E-level (Extensibility) specification
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 | **Status**: [x] completed
**Test**: Given E0-E3 levels → When spec drafted → Then each level has clear compliance criteria, examples, and detection rules

Define what makes a skill E0 (Standalone), E1 (Importable), E2 (Extensible), E3 (Composable). Include markers, manifest requirements, and validation rules for each.

---

### T-005: Draft S-level (Security) specification
**User Story**: US-002 | **Satisfies ACs**: AC-US2-02 | **Status**: [x] completed
**Test**: Given S0-S3 levels → When spec drafted → Then each level has clear compliance criteria, required checks, and progression rules

Define what makes a skill S0 (Unknown), S1 (Scanned), S2 (Verified), S3 (Certified). Include scanner requirements, score thresholds, signing requirements.

---

### T-006: Design unified scoring algorithm
**User Story**: US-002 | **Satisfies ACs**: AC-US2-03 | **Status**: [x] completed
**Test**: Given scoring rubric → When applied to sample skills → Then produces reproducible 0-100 scores matching manual calculation

Specify weighted categories (Destructive 25%, Execution 25%, Data Access 20%, Prompt Safety 15%, Declaration Honesty 15%), severity penalties, and final score formula. Test with 3+ example skills.

---

### T-007: Define VSKILL:VERIFY manifest format
**User Story**: US-002 | **Satisfies ACs**: AC-US2-04 | **Status**: [x] completed
**Test**: Given manifest spec → When validated against example skills → Then parseable, complete, and verifiable

Design the `<!-- VSKILL:VERIFY ssp/v1 -->` format including permissions, hash, signature, and score fields. Specify parsing rules and validation.

---

### T-008: Write SSP RFC document
**User Story**: US-002 | **Satisfies ACs**: AC-US2-05 | **Status**: [x] completed
**Test**: Given all SSP components → When assembled into RFC → Then complete, self-consistent, publishable

Combine E-levels, S-levels, scoring rubric, and manifest format into a single RFC document suitable for public docs and community review.

---

## Phase 3: `npx vskill` CLI Architecture

### T-009: Design CLI command structure
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04 | **Status**: [x] completed
**Test**: Given command specs → When reviewed → Then covers verify, install, audit, sign with clear input/output contracts

Design all four commands: `vskill verify`, `vskill install`, `vskill audit`, `vskill sign`. Include flags, options, input formats, exit codes.

---

### T-010: Design scoring output format
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 | **Status**: [x] completed
**Test**: Given output format spec → When applied to sample results → Then human-readable AND JSON outputs are clear and parseable

Design both human-readable terminal output (with colors, sections) and JSON output for programmatic use.

---

### T-011: Define specweave CLI integration points
**User Story**: US-003 | **Satisfies ACs**: AC-US3-05 | **Status**: [x] completed
**Test**: Given integration spec → When reviewed → Then `vskill` and `specweave` commands complement without overlap

Specify how `npx vskill` relates to `specweave` CLI. Shared scanner? Separate packages? Plugin architecture?

---

## Phase 4: Docs & YouTube Content

### T-012: Write "Skills are the new libraries" docs page
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-05 | **Status**: [x] completed
**Test**: Given narrative → When published → Then explains paradigm shift with historical parallels and Snyk data

Write the narrative page: npm/pip/cargo evolution → skills as universal packages → ClawHavoc as proof → SSP as the answer. Cite Snyk article.

---

### T-013: Write SSP standard reference page
**User Story**: US-004 | **Satisfies ACs**: AC-US4-02 | **Status**: [x] completed
**Test**: Given SSP RFC → When adapted for docs → Then accessible reference with tables, examples, and verification steps

Adapt the RFC into a user-friendly reference page with E/S level tables, scoring explanation, and `npx vskill` quick start.

---

### T-014: Draft YouTube script section
**User Story**: US-004 | **Satisfies ACs**: AC-US4-03 | **Status**: [x] completed
**Test**: Given script → When reviewed → Then covers paradigm shift, ClawHavoc data, SSP introduction, vskill demo in ~8-10 minutes

Write YouTube script section: hook (341 malicious skills), problem (no standards), solution (SSP + vskill), demo (verify a skill), call to action (verified-skill.com).

---

### T-015: Write findings report and official sources page
**User Story**: US-004 | **Satisfies ACs**: AC-US4-04 | **Status**: [x] completed
**Test**: Given all findings → When compiled → Then links to 0217 with actionable implementation guidance

Compile forensic findings, SSP design decisions, and docs content into a report that feeds into 0217 execution. Include "official sources" content listing legitimate SpecWeave install methods.
