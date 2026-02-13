# Tasks: Messaging & Docs Redesign

## Phase 1: README Rewrite

### T-001: Extract Skill Dev Guidelines from README
**User Story**: US-001 | **Status**: [x] completed
Move README lines 236-336 to `docs-site/docs/guides/skill-development-guidelines.md`. Add link from README.

### T-002: Rewrite README structure and messaging
**User Story**: US-001, US-002, US-003 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US2-01, AC-US3-03 | **Status**: [x] completed
**Depends On**: T-001
New tagline, "What Are Skills?" section, agent swarms, enterprise, updated demo, condensed extensible skills, updated comparison table. Target ~350 lines.

## Phase 2: Landing Page & Navigation

### T-003: Create "Skills Are Programs in English" overview page
**User Story**: US-001 | **Status**: [x] completed
New file: `docs-site/docs/overview/skills-as-programs.md`. Add to docsSidebar.

### T-004: Create "No Claude Code Docs Needed" page
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01 | **Status**: [x] completed
New file: `docs-site/docs/overview/no-docs-needed.md`. Add to docsSidebar.

### T-005: Create Enterprise hub/overview page
**User Story**: US-003 | **Satisfies ACs**: AC-US3-02 | **Status**: [x] completed
New file: `docs-site/docs/enterprise/index.md`. Overview of all enterprise capabilities.

### T-006: Restructure landing page (intro.md)
**User Story**: US-001, US-002, US-003, US-004 | **Satisfies ACs**: AC-US2-02, AC-US4-02 | **Status**: [x] completed
**Depends On**: T-003, T-004
Three-pillar section, "no docs needed" mini-section, updated features grid.

### T-007: Restructure navbar and sidebars
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 | **Status**: [x] completed
**Depends On**: T-005
Navbar: Docs | Learn | Skills | Enterprise | Reference | Blog. Rename Academy→Learn. Add Enterprise. Merge Commands→Reference.

### T-008: Update meta tags in docusaurus.config.ts
**User Story**: US-001 | **Status**: [x] completed
Align og:title, og:description with new messaging.

## Phase 3: Supporting Content

### T-009: Update introduction.md and why-specweave.md
**User Story**: US-001 | **Status**: [x] completed
**Depends On**: T-002
Align with "programs in English" messaging. Add enterprise/skills callouts.

### T-010: Update features.md extensible skills section
**User Story**: US-001 | **Status**: [x] completed
**Depends On**: T-002
Reframe with "programs in English" as lead.

### T-011: Add enterprise cross-links across docs
**User Story**: US-003 | **Satisfies ACs**: AC-US3-04 | **Status**: [x] completed
**Depends On**: T-005
Add callouts in getting-started, features, intro.

### T-012: Update YouTube tutorial script notes
**User Story**: US-001 | **Status**: [x] completed
**Depends On**: T-002
Add notes about new messaging pillars. Mark sections for re-recording.
