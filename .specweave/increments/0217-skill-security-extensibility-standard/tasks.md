# Tasks: Skill Security, Extensibility Standard & verified-skill.com

## Phase A: Research

### T-001: Research platform security postures
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-06 | **Status**: [x] completed
**Test**: Given 5+ platforms researched → When findings compiled → Then each platform has security posture, breach history, trust model documented
Research: Skills.sh, Smithery, SkillsDirectory, ClawHub, Fabric, vendor skills. Compile Snyk ToxicSkills data (36.82%, 76 payloads, threat actors). Document breach history.

### T-002: Build Agent Skills format compatibility matrix
**User Story**: US-006 | **Satisfies ACs**: AC-US6-01, AC-US6-02 | **Status**: [x] completed
**Test**: Given 15+ platforms investigated → When matrix built → Then each shows format support level (full/partial/none) with variations noted
All 39 agents from `skills@1.3.9`: 7 universal (Amp, Codex, Gemini CLI, GitHub Copilot, Kimi Code CLI, OpenCode, Replit) + 32 non-universal.

### T-003: Catalog skill discovery sources and quality rubric
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02 | **Status**: [x] completed
**Test**: Given 6+ sources identified → When rubric created → Then rubric has 6 scoring dimensions with measurable criteria
6 dimensions: transparency (0-5), security scan (0-5), author reputation (0-5), update frequency (0-5), test coverage (0-5), portability (0-5).

### T-004: Identify real-world skill contradictions
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01 | **Status**: [x] completed
**Depends On**: T-003
**Test**: Given skills from multiple providers compared → When conflicts categorized → Then 4 types documented with 2+ real examples each
Document behavioral, configuration, dependency, and precedence contradictions with real examples.

### T-005: Audit SpecWeave's existing security infrastructure
**User Story**: US-001 | **Satisfies ACs**: AC-US1-04 | **Status**: [x] completed
**Test**: Given existing code reviewed → When capabilities documented → Then complete inventory exists
Audit: security-scanner.ts (26 patterns), registry-schema.ts (3 tiers), skill-validator.ts (6 domains), skill-judge.ts, security skills, 14 pre-commit hooks.

### T-006: Competitive analysis for verified-skill.com
**User Story**: US-007 | **Satisfies ACs**: AC-US7-01 | **Status**: [x] completed
**Test**: Given 6+ competitors analyzed → When feature/gap comparison built → Then verified-skill.com differentiators are clear
Analyze: SkillsDirectory.com (36K skills, 50+ rules), Cisco Skill Scanner, SkillCheck, SkillAudit, SkillScan, Alice.io.

### T-006b: Research Skills.sh installer internals
**User Story**: US-008 | **Satisfies ACs**: AC-US8-02 | **Status**: [x] completed
**Test**: Given installer source analyzed → When agent detection mapped → Then all 39 agent paths documented with vskill equivalents
Research: agent detection filesystem paths, symlink vs copy mechanics, SKILL.md discovery locations. Map to vskill.

## Phase B: Architecture & Product Design

### T-007: Design Secure Skill Factory specification
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-06 | **Status**: [x] completed
**Depends On**: T-001, T-005
**Test**: Given research complete → When spec authored → Then defines mandatory sections, forbidden patterns, security prompt template
Mandatory SKILL.md sections: description, scope, permissions, security-notes. Forbidden patterns: eval, exec, credential access outside safe contexts. Built-in security prompt.

### T-008: Design three-tier certification system
**User Story**: US-004 | **Satisfies ACs**: AC-US4-02 | **Status**: [x] completed
**Depends On**: T-005
**Test**: Given trust model designed → When 3 levels defined → Then each has clear pass criteria and escalation rules
Scanned (rules) → Verified (rules + LLM) → Certified (rules + LLM + human). Define pass criteria per tier.

### T-009: Design trust label and badge system
**User Story**: US-004 | **Satisfies ACs**: AC-US4-03, AC-US4-04 | **Status**: [x] completed
**Depends On**: T-005
**Test**: Given labels designed → When 5+ labels defined → Then each has visual spec and vendor auto-verification rules
Labels: extensible, safe, portable, deprecated, warning. Vendor auto-verification: anthropics/, openai/, google/.

### T-010: Design contradiction detection system
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04 | **Status**: [x] completed
**Depends On**: T-004
**Test**: Given conflict taxonomy from research → When system designed → Then covers detection heuristics, priority chain, merge strategies
4 types, priority chain (local > project > vendor > community), 3 merge strategies. Integration point with existing scanner.

### T-011: Design continuous scanning pipeline
**User Story**: US-007 | **Satisfies ACs**: AC-US7-04 | **Status**: [x] completed
**Depends On**: T-001, T-003
**Test**: Given sources cataloged → When pipeline designed → Then shows source adapters, schedule, storage, and alert mechanism
Source adapters (Skills.sh, ClawHub, GitHub), crawl schedule (daily/weekly), result storage, alert mechanism. Design only.

### T-012: Design specweave fabric compare CLI
**User Story**: US-003 | **Satisfies ACs**: AC-US3-04 | **Status**: [x] completed
**Depends On**: T-003, T-004
**Test**: Given sources and contradictions known → When CLI designed → Then shows command syntax, comparison algorithm, output format
`specweave fabric compare <skill-name> --sources github,npm,registry`. Side-by-side comparison.

### T-013: Design registry schema extensions
**User Story**: US-004 | **Satisfies ACs**: AC-US4-05 | **Status**: [x] completed
**Depends On**: T-008, T-009
**Test**: Given certification + trust labels designed → When TypeScript interfaces drafted → Then all new fields are optional for backward compat
New types: CertificationLevel, TrustLabel, SecurityScanRecord, ContradictionRecord. Extend FabricRegistryEntry.

### T-014: Design portability guidelines
**User Story**: US-006 | **Satisfies ACs**: AC-US6-03, AC-US6-04 | **Status**: [x] completed
**Depends On**: T-002
**Test**: Given compat matrix complete → When guidelines authored → Then covers universal features, platform-specific extensions, testing checklist
What works universally vs varies. Reference `agentSkillsCompat` field.

### T-015: Write verified-skill.com PRD
**User Story**: US-007 | **Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-05, AC-US7-06, AC-US7-07, AC-US7-08, AC-US7-09, AC-US7-10, AC-US7-11, AC-US7-12, AC-US7-13, AC-US7-14 | **Status**: [x] completed
**Depends On**: T-006, T-008, T-009
**Test**: Given competitive analysis and architecture complete → When PRD authored → Then covers mission, users, tech stack, repo structure, business model, onboarding flow, agent visualization, UI design direction, popularity signals, trending algorithm, skill ranking
Mission, users, value prop, competitive positioning, tech stack (Next.js, PostgreSQL), repo structure (turbo monorepo), website architecture, badge API, business model. MUST include: (1) Landing page onboarding flow (init → find → install/verify → update) with clear step-by-step, (2) Agent registry visualization — card/grid layout for all 39 agents with universal/non-universal badges and platform icons, (3) UI design direction doc — minimalistic, verification-first, distinctive identity (NOT default dark theme), UI8 expert-level craft, unique color palette and typography, (4) Popularity signals aggregation — GitHub stars/forks, npm downloads, vskill install counts, commit recency per skill page, (5) Trending algorithm — weighted composite (install velocity + stars growth + recency + verification tier) with 7d/30d windows, (6) Skill ranking/leaderboard — sortable by category with filters for tier, popularity, recency.

### T-015b: Design npx vskill CLI
**User Story**: US-008 | **Satisfies ACs**: AC-US8-01, AC-US8-03, AC-US8-04, AC-US8-05, AC-US8-07 | **Status**: [x] completed
**Depends On**: T-006b, T-008
**Test**: Given installer research and certification designed → When CLI designed → Then full command reference with scan-before-install flow documented
Commands: `add`, `scan`, `list`, `compare`, `update`, `submit`. Agent auto-detection (39 agents). Security scan-before-install. Vendor fast-path. Output format.

### T-015c: Design version-pinned verification
**User Story**: US-009 | **Satisfies ACs**: AC-US9-01, AC-US9-02, AC-US9-03, AC-US9-04, AC-US9-05 | **Status**: [x] completed
**Depends On**: T-008, T-015b
**Test**: Given certification and CLI designed → When versioning designed → Then lock file schema, diff scan flow, per-version badges, monitoring flow documented
`vskill.lock` schema, diff scanning on updates, per-version badge system, continuous monitoring for badge downgrades.

### T-029: Design submission state machine and pipeline
**User Story**: US-010 | **Satisfies ACs**: AC-US10-03, AC-US10-04, AC-US10-05, AC-US10-06, AC-US10-09, AC-US10-10 | **Status**: [x] completed
**Depends On**: T-008
**Test**: Given three-tier certification designed → When state machine designed → Then all states, transitions, worker architecture, and audit trail documented
States: RECEIVED → TIER1_SCANNING → TIER2_SCANNING → AUTO_APPROVED/NEEDS_REVIEW → PUBLISHED/REJECTED. PostgreSQL job queue (SKIP LOCKED).

### T-030: Design database schema
**User Story**: US-010, US-011, US-012 | **Satisfies ACs**: AC-US10-09, AC-US11-10, AC-US12-05 | **Status**: [x] completed
**Depends On**: T-029
**Test**: Given state machine designed → When Prisma schema drafted → Then all entities defined with relationships and constraints
Entities: Submission, Skill, SkillVersion, ScanResult, Admin, SubmissionStateEvent, AgentCompat, EmailNotification.

### T-031: Design submission API endpoints
**User Story**: US-010 | **Satisfies ACs**: AC-US10-01, AC-US10-02, AC-US10-07 | **Status**: [x] completed
**Depends On**: T-029, T-030
**Test**: Given schema and state machine designed → When API endpoints designed → Then public + admin endpoints documented with request/response schemas
Public: POST /api/v1/submissions, GET /api/v1/submissions/:id, GET /api/v1/skills, GET /api/v1/skills/:name/badge. Admin: login, queue, approve, reject, escalate, stats.

### T-032: Design admin authentication
**User Story**: US-011 | **Satisfies ACs**: AC-US11-01, AC-US11-09 | **Status**: [x] completed
**Depends On**: T-030
**Test**: Given database schema designed → When auth system designed → Then JWT flow, role-based middleware, and token refresh documented
JWT email/password, bcrypt, 24h access / 7d refresh tokens. Roles: super_admin, reviewer.

### T-033: Design admin dashboard architecture
**User Story**: US-011 | **Satisfies ACs**: AC-US11-02, AC-US11-03, AC-US11-04, AC-US11-05, AC-US11-06, AC-US11-07, AC-US11-08 | **Status**: [ ] pending
**Depends On**: T-031, T-032
**Test**: Given API and auth designed → When dashboard designed → Then component hierarchy, data flow, admin actions, and stats views documented
Submission queue, status filters, approve/reject/escalate, scan results display, platform stats, version history.

### T-034: Design auto-approve vs manual-review decision logic
**User Story**: US-010 | **Satisfies ACs**: AC-US10-05, AC-US10-06 | **Status**: [ ] pending
**Depends On**: T-008, T-029
**Test**: Given certification tiers and state machine designed → When decision logic designed → Then thresholds, vendor fast-path, and edge cases documented
Auto-approve: Tier 1 PASS + Tier 2 PASS (score >= 80). Vendor fast-path: trusted orgs skip scanning. Edge cases: borderline scores, mixed signals.

### T-035: Design semantic versioning engine
**User Story**: US-012 | **Satisfies ACs**: AC-US12-01, AC-US12-02, AC-US12-03, AC-US12-06, AC-US12-07 | **Status**: [ ] pending
**Depends On**: T-015c
**Test**: Given version-pinning designed → When versioning engine designed → Then diff analysis rules, bump classification, and content comparison documented
MAJOR: new permissions/scope. MINOR: new capabilities. PATCH: typos/formatting. Content hash (SHA-256) per version.

### T-036: Design email notification system
**User Story**: US-010 | **Satisfies ACs**: AC-US10-08 | **Status**: [ ] pending
**Depends On**: T-029
**Test**: Given submission pipeline designed → When email system designed → Then service choice, templates, triggers, and opt-in flow documented
Resend (resend.com), React Email templates, 5 triggers, opt-in (email field optional).

### T-037: Design 39-agent registry data model
**User Story**: US-008 | **Satisfies ACs**: AC-US8-08 | **Status**: [x] completed
**Depends On**: T-006b
**Test**: Given installer research complete → When data model designed → Then AgentDefinition interface with all 39 agents documented
Interface: id, displayName, localSkillsDir, globalSkillsDir, detectInstalled(), isUniversal. All 39 agents from `skills@1.3.9`.

## Phase C: Documentation & Content

### T-016: Write Skills Ecosystem Security Landscape page
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05, AC-US1-06 | **Status**: [ ] pending
**Depends On**: T-001, T-005, T-007
**Test**: Given research and architecture complete → When page authored → Then has frontmatter, platform comparison table, risk taxonomy, Mermaid diagrams
File: `docs-site/docs/guides/skills-ecosystem-security.md`

### T-017: Write YouTube script section on supply chain risk
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05 | **Status**: [x] completed
**Depends On**: T-001
**Test**: Given research complete → When section authored → Then has narrator voice, screen directions, timestamps, covers breach + scanner + verified-skill.com
Append to `docs-site/docs/guides/youtube-tutorial-script.md`. ~8 min section.

### T-018: Write Skill Discovery and Evaluation guide
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03 | **Status**: [x] completed
**Depends On**: T-003, T-004
**Test**: Given sources and rubric complete → When guide authored → Then covers 6+ sources, scoring rubric, discrepancy detection
File: `docs-site/docs/guides/skill-discovery-evaluation.md`

### T-019: Write Secure Skill Factory Standard RFC
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-06 | **Status**: [ ] pending
**Depends On**: T-007, T-008
**Test**: Given architecture complete → When RFC authored → Then has Abstract, Motivation, Specification, Security Considerations, Backwards Compatibility
File: `docs-site/docs/guides/secure-skill-factory-standard.md`

### T-020: Write Agent Skills Extensibility Analysis page
**User Story**: US-006 | **Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03 | **Status**: [x] completed
**Depends On**: T-002, T-014
**Test**: Given compat matrix and portability guidelines complete → When page authored → Then has compat table, variation analysis, portability guidelines
File: `docs-site/docs/guides/agent-skills-extensibility-analysis.md`

### T-021: Write Skill Contradiction Resolution design doc
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03 | **Status**: [x] completed
**Depends On**: T-010
**Test**: Given detection system designed → When doc authored → Then covers conflict types, heuristics, priority chain, merge strategies with Mermaid diagram
File: `docs-site/docs/guides/skill-contradiction-resolution.md`

### T-022: Write verified-skill.com PRD as living doc
**User Story**: US-007 | **Satisfies ACs**: AC-US7-01, AC-US7-07, AC-US7-08, AC-US7-09, AC-US7-10, AC-US7-11, AC-US7-12, AC-US7-13, AC-US7-14 | **Status**: [ ] pending
**Depends On**: T-015
**Test**: Given PRD designed → When living doc authored → Then internal strategy doc complete with architecture diagrams
File: `.specweave/docs/internal/strategy/skillweave-prd.md`

### T-023: Update sidebars and cross-link all new pages
**User Story**: US-001, US-003, US-004, US-005, US-006 | **Status**: [ ] pending
**Depends On**: T-016, T-018, T-019, T-020, T-021
**Test**: Given all pages created → When sidebar updated → Then all new pages in navigation, cross-references work
Update `docs-site/sidebars.ts`. Cross-link from existing pages.

### T-038: Write submission system design doc
**User Story**: US-010 | **Satisfies ACs**: AC-US10-01, AC-US10-02, AC-US10-09 | **Status**: [ ] pending
**Depends On**: T-029, T-031, T-034, T-036
**Test**: Given all submission architecture designed → When doc authored → Then covers state machine, API spec, decision logic, email flow
File: `.specweave/docs/internal/strategy/skillweave-submission-system.md`

### T-039: Write admin dashboard design doc
**User Story**: US-011 | **Satisfies ACs**: AC-US11-01, AC-US11-02, AC-US11-07 | **Status**: [ ] pending
**Depends On**: T-032, T-033
**Test**: Given auth and dashboard architecture designed → When doc authored → Then covers auth flow, wireframes, role matrix, action flows
File: `.specweave/docs/internal/strategy/skillweave-admin-dashboard.md`

### T-040: Write versioning mechanism design doc
**User Story**: US-012 | **Satisfies ACs**: AC-US12-01, AC-US12-03, AC-US12-07 | **Status**: [ ] pending
**Depends On**: T-035
**Test**: Given versioning engine designed → When doc authored → Then covers diff rules, version assignment, content hashing
File: `.specweave/docs/internal/strategy/skillweave-versioning.md`

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

### T-027: Create vskill private repo scaffold
**User Story**: US-007 | **Satisfies ACs**: AC-US7-06 | **Status**: [ ] pending
**Depends On**: T-015
**Test**: Given PRD complete → When repo scaffolded → Then monorepo builds with `npm run dev`
Turborepo monorepo: `packages/cli/` (npm package skeleton), `packages/web/` (Next.js 14+ skeleton), `packages/scanner/` (shared security scanner). README, package.json, .gitignore, turbo.json.

### T-041: Create submission state machine TypeScript skeleton
**User Story**: US-010 | **Satisfies ACs**: AC-US10-09 | **Status**: [ ] pending
**Depends On**: T-027, T-029
**Test**: Given vskill repo scaffolded and state machine designed → When skeleton created → Then compiles with all states and transition types defined
File: `packages/scanner/src/pipeline/submission-pipeline.ts`. SubmissionState enum, transition function, audit event types.

### T-042: Create Prisma schema file
**User Story**: US-010, US-011, US-012 | **Satisfies ACs**: AC-US10-09, AC-US12-05 | **Status**: [ ] pending
**Depends On**: T-027, T-030
**Test**: Given repo scaffolded and database schema designed → When Prisma schema created → Then `npx prisma validate` passes
File: `packages/web/prisma/schema.prisma`. All entities: Submission, Skill, SkillVersion, ScanResult, Admin, SubmissionStateEvent, AgentCompat, EmailNotification.

### T-043: Create 39-agent registry data file
**User Story**: US-008 | **Satisfies ACs**: AC-US8-08 | **Status**: [ ] pending
**Depends On**: T-027, T-037
**Test**: Given repo scaffolded and data model designed → When registry file created → Then all 39 agents defined with paths and detection logic
File: `packages/scanner/src/agents/agents-registry.ts`. AgentDefinition interface, all 39 agents with localSkillsDir, globalSkillsDir, detectInstalled, isUniversal.

## Phase E: Verification

### T-028: Full build and test verification
**User Story**: US-001 through US-012 | **Status**: [ ] pending
**Depends On**: all
**Test**: Given all tasks complete → When verification runs → Then zero errors, zero test failures, docs build clean
Run: `npm run rebuild`, `npm test`, `cd docs-site && npm run build`. Review all new files. Validate cross-links. Check schema backward compat. Verify Prisma schema validates. Verify submission pipeline skeleton compiles. Verify 39-agent registry has all agents.
