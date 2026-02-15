# Tasks: Skill Security, Extensibility Standard & skill-weave.com

## Phase A: Research

### T-001: Research platform security postures
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-06 | **Status**: [ ] pending
**Test**: Given 5+ platforms researched → When findings compiled → Then each platform has security posture, breach history, trust model documented
Research: Skills.sh, Smithery, SkillsDirectory, ClawHub, Fabric, vendor skills. Compile Snyk ToxicSkills data (36.82%, 76 payloads, threat actors). Document breach history.

### T-002: Build Agent Skills format compatibility matrix
**User Story**: US-006 | **Satisfies ACs**: AC-US6-01, AC-US6-02 | **Status**: [ ] pending
**Test**: Given 15+ platforms investigated → When matrix built → Then each shows format support level (full/partial/none) with variations noted
Platforms: Claude, ChatGPT, Codex, Gemini, Cursor, Copilot, Windsurf, Cline, Aider, Bolt, v0, Replit, Amazon Q, JetBrains AI, Goose.

### T-003: Catalog skill discovery sources and quality rubric
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02 | **Status**: [ ] pending
**Test**: Given 6+ sources identified → When rubric created → Then rubric has 6 scoring dimensions with measurable criteria
6 dimensions: transparency (0-5), security scan (0-5), author reputation (0-5), update frequency (0-5), test coverage (0-5), portability (0-5).

### T-004: Identify real-world skill contradictions
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01 | **Status**: [ ] pending
**Depends On**: T-003
**Test**: Given skills from multiple providers compared → When conflicts categorized → Then 4 types documented with 2+ real examples each
Document behavioral, configuration, dependency, and precedence contradictions with real examples.

### T-005: Audit SpecWeave's existing security infrastructure
**User Story**: US-001 | **Satisfies ACs**: AC-US1-04 | **Status**: [ ] pending
**Test**: Given existing code reviewed → When capabilities documented → Then complete inventory exists
Audit: security-scanner.ts (26 patterns), registry-schema.ts (3 tiers), skill-validator.ts (6 domains), skill-judge.ts, security skills, 14 pre-commit hooks.

### T-006: Competitive analysis for skill-weave.com
**User Story**: US-007 | **Satisfies ACs**: AC-US7-01 | **Status**: [ ] pending
**Test**: Given 6+ competitors analyzed → When feature/gap comparison built → Then skill-weave.com differentiators are clear
Analyze: SkillsDirectory.com (36K skills, 50+ rules), Cisco Skill Scanner, SkillCheck, SkillAudit, SkillScan, Alice.io.

### T-006b: Research Skills.sh installer internals
**User Story**: US-008 | **Satisfies ACs**: AC-US8-02 | **Status**: [ ] pending
**Test**: Given installer source analyzed → When agent detection mapped → Then all 35+ agent paths documented with skill-weave equivalents
Research: agent detection filesystem paths, symlink vs copy mechanics, SKILL.md discovery locations. Map to skill-weave.

## Phase B: Architecture & Product Design

### T-007: Design Secure Skill Factory specification
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-06 | **Status**: [ ] pending
**Depends On**: T-001, T-005
**Test**: Given research complete → When spec authored → Then defines mandatory sections, forbidden patterns, security prompt template
Mandatory SKILL.md sections: description, scope, permissions, security-notes. Forbidden patterns: eval, exec, credential access outside safe contexts. Built-in security prompt.

### T-008: Design three-tier certification system
**User Story**: US-004 | **Satisfies ACs**: AC-US4-02 | **Status**: [ ] pending
**Depends On**: T-005
**Test**: Given trust model designed → When 3 levels defined → Then each has clear pass criteria and escalation rules
Scanned (rules) → Verified (rules + LLM) → Certified (rules + LLM + human). Define pass criteria per tier.

### T-009: Design trust label and badge system
**User Story**: US-004 | **Satisfies ACs**: AC-US4-03, AC-US4-04 | **Status**: [ ] pending
**Depends On**: T-005
**Test**: Given labels designed → When 5+ labels defined → Then each has visual spec and vendor auto-verification rules
Labels: extensible, safe, portable, deprecated, warning. Vendor auto-verification: anthropics/, openai/, google/.

### T-010: Design contradiction detection system
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04 | **Status**: [ ] pending
**Depends On**: T-004
**Test**: Given conflict taxonomy from research → When system designed → Then covers detection heuristics, priority chain, merge strategies
4 types, priority chain (local > project > vendor > community), 3 merge strategies. Integration point with existing scanner.

### T-011: Design continuous scanning pipeline
**User Story**: US-007 | **Satisfies ACs**: AC-US7-04 | **Status**: [ ] pending
**Depends On**: T-001, T-003
**Test**: Given sources cataloged → When pipeline designed → Then shows source adapters, schedule, storage, and alert mechanism
Source adapters (Skills.sh, ClawHub, GitHub), crawl schedule (daily/weekly), result storage, alert mechanism. Design only.

### T-012: Design specweave fabric compare CLI
**User Story**: US-003 | **Satisfies ACs**: AC-US3-04 | **Status**: [ ] pending
**Depends On**: T-003, T-004
**Test**: Given sources and contradictions known → When CLI designed → Then shows command syntax, comparison algorithm, output format
`specweave fabric compare <skill-name> --sources github,npm,registry`. Side-by-side comparison.

### T-013: Design registry schema extensions
**User Story**: US-004 | **Satisfies ACs**: AC-US4-05 | **Status**: [ ] pending
**Depends On**: T-008, T-009
**Test**: Given certification + trust labels designed → When TypeScript interfaces drafted → Then all new fields are optional for backward compat
New types: CertificationLevel, TrustLabel, SecurityScanRecord, ContradictionRecord. Extend FabricRegistryEntry.

### T-014: Design portability guidelines
**User Story**: US-006 | **Satisfies ACs**: AC-US6-03, AC-US6-04 | **Status**: [ ] pending
**Depends On**: T-002
**Test**: Given compat matrix complete → When guidelines authored → Then covers universal features, platform-specific extensions, testing checklist
What works universally vs varies. Reference `agentSkillsCompat` field.

### T-015: Write skill-weave.com PRD
**User Story**: US-007 | **Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-05, AC-US7-06, AC-US7-07, AC-US7-08 | **Status**: [ ] pending
**Depends On**: T-006, T-008, T-009
**Test**: Given competitive analysis and architecture complete → When PRD authored → Then covers mission, users, tech stack, repo structure, business model
Mission, users, value prop, competitive positioning, tech stack (Next.js, PostgreSQL), repo structure (turbo monorepo), website architecture, badge API, business model.

### T-015b: Design npx skill-weave CLI
**User Story**: US-008 | **Satisfies ACs**: AC-US8-01, AC-US8-03, AC-US8-04, AC-US8-05, AC-US8-07 | **Status**: [ ] pending
**Depends On**: T-006b, T-008
**Test**: Given installer research and certification designed → When CLI designed → Then full command reference with scan-before-install flow documented
Commands: `add`, `scan`, `list`, `compare`, `update`. Agent auto-detection (35+ agents). Security scan-before-install. Vendor fast-path. Output format.

### T-015c: Design version-pinned verification
**User Story**: US-009 | **Satisfies ACs**: AC-US9-01, AC-US9-02, AC-US9-03, AC-US9-04, AC-US9-05 | **Status**: [ ] pending
**Depends On**: T-008, T-015b
**Test**: Given certification and CLI designed → When versioning designed → Then lock file schema, diff scan flow, per-version badges, monitoring flow documented
`skill-weave.lock` schema, diff scanning on updates, per-version badge system, continuous monitoring for badge downgrades.

## Phase C: Documentation & Content

### T-016: Write Skills Ecosystem Security Landscape page
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05, AC-US1-06 | **Status**: [ ] pending
**Depends On**: T-001, T-005, T-007
**Test**: Given research and architecture complete → When page authored → Then has frontmatter, platform comparison table, risk taxonomy, Mermaid diagrams
File: `docs-site/docs/guides/skills-ecosystem-security.md`

### T-017: Write YouTube script section on supply chain risk
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05 | **Status**: [ ] pending
**Depends On**: T-001
**Test**: Given research complete → When section authored → Then has narrator voice, screen directions, timestamps, covers breach + scanner + skill-weave.com
Append to `docs-site/docs/guides/youtube-tutorial-script.md`. ~8 min section.

### T-018: Write Skill Discovery and Evaluation guide
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03 | **Status**: [ ] pending
**Depends On**: T-003, T-004
**Test**: Given sources and rubric complete → When guide authored → Then covers 6+ sources, scoring rubric, discrepancy detection
File: `docs-site/docs/guides/skill-discovery-evaluation.md`

### T-019: Write Secure Skill Factory Standard RFC
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-06 | **Status**: [ ] pending
**Depends On**: T-007, T-008
**Test**: Given architecture complete → When RFC authored → Then has Abstract, Motivation, Specification, Security Considerations, Backwards Compatibility
File: `docs-site/docs/guides/secure-skill-factory-standard.md`

### T-020: Write Agent Skills Extensibility Analysis page
**User Story**: US-006 | **Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03 | **Status**: [ ] pending
**Depends On**: T-002, T-014
**Test**: Given compat matrix and portability guidelines complete → When page authored → Then has compat table, variation analysis, portability guidelines
File: `docs-site/docs/guides/agent-skills-extensibility-analysis.md`

### T-021: Write Skill Contradiction Resolution design doc
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03 | **Status**: [ ] pending
**Depends On**: T-010
**Test**: Given detection system designed → When doc authored → Then covers conflict types, heuristics, priority chain, merge strategies with Mermaid diagram
File: `docs-site/docs/guides/skill-contradiction-resolution.md`

### T-022: Write skill-weave.com PRD as living doc
**User Story**: US-007 | **Satisfies ACs**: AC-US7-01, AC-US7-07, AC-US7-08 | **Status**: [ ] pending
**Depends On**: T-015
**Test**: Given PRD designed → When living doc authored → Then internal strategy doc complete with architecture diagrams
File: `.specweave/docs/internal/strategy/skillweave-prd.md`

### T-023: Update sidebars and cross-link all new pages
**User Story**: US-001, US-003, US-004, US-005, US-006 | **Status**: [ ] pending
**Depends On**: T-016, T-018, T-019, T-020, T-021
**Test**: Given all pages created → When sidebar updated → Then all new pages in navigation, cross-references work
Update `docs-site/sidebars.ts`. Cross-link from existing pages.

## Phase D: Code Foundation

### T-024: Implement registry schema extensions
**User Story**: US-004 | **Satisfies ACs**: AC-US4-05 | **Status**: [ ] pending
**Depends On**: T-013
**Test**: Given schema design finalized → When TypeScript interfaces added → Then `npm run rebuild` passes and new types exported
File: `src/core/fabric/registry-schema.ts`. Add CertificationLevel, TrustLabel, SecurityScanRecord, ContradictionRecord. All new fields optional.

### T-025: Create contradiction detector skeleton
**User Story**: US-005 | **Satisfies ACs**: AC-US5-04 | **Status**: [ ] pending
**Depends On**: T-010, T-024
**Test**: Given design complete and schema extended → When skeleton created → Then `detectContradictions()` exists with stub + simple heuristics
File: `src/core/fabric/contradiction-detector.ts`. Accepts multiple SKILL.md contents, returns ContradictionRecord[].

### T-026: Write tests for schema extensions and contradiction detector
**User Story**: US-004, US-005 | **Status**: [ ] pending
**Depends On**: T-024, T-025
**Test**: Given code implemented → When `npm test` runs → Then all new tests pass with >80% coverage
File: `tests/unit/core/fabric/contradiction-detector.test.ts`. Test: clean pair, behavioral contradiction, config contradiction, dependency contradiction, empty input, single input, backward compat.

### T-027: Create skill-weave private repo scaffold
**User Story**: US-007 | **Satisfies ACs**: AC-US7-06 | **Status**: [ ] pending
**Depends On**: T-015
**Test**: Given PRD complete → When repo scaffolded → Then monorepo builds with `npm run dev`
Turborepo monorepo: `packages/cli/` (npm package skeleton), `packages/web/` (Next.js 14+ skeleton), `packages/scanner/` (shared security scanner). README, package.json, .gitignore, turbo.json.

## Phase E: Verification

### T-028: Full build and test verification
**User Story**: US-001 through US-009 | **Status**: [ ] pending
**Depends On**: all
**Test**: Given all tasks complete → When verification runs → Then zero errors, zero test failures, docs build clean
Run: `npm run rebuild`, `npm test`, `cd docs-site && npm run build`. Review all new files. Validate cross-links. Check schema backward compat.
