# Tasks: Skill Fabric

## Phase A: Terminology + Natural Language UX

### T-001: Rename "skill layer" → "Skill Fabric" across all docs
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03 | **Status**: [ ] pending
Grep-and-replace "skill layer"/"Skill Layer" → "Skill Fabric" across README and docs-site files.

### T-002: Rewrite README workflow to natural language UX
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02 | **Status**: [ ] pending
**Depends On**: T-001
Show natural language prompting as primary UX. Commands shown as "under the hood".

### T-003: Update YouTube tutorial script with natural language notes
**User Story**: US-001 | **Status**: [ ] pending
**Depends On**: T-002
Add notes/markers for natural language demo approach.

## Phase B: Skill Fabric Registry Foundation

### T-004: Create registry schema TypeScript interfaces
**User Story**: US-002 | **Status**: [ ] pending
New file: `src/core/fabric/registry-schema.ts`

### T-005: Seed fabric-registry/registry.json from marketplace.json
**User Story**: US-002 | **Status**: [ ] pending
**Depends On**: T-004
Seed with all 23 existing plugins as "official" tier entries.

### T-006: Implement security scanner for SKILL.md files
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 | **Status**: [ ] pending
**Depends On**: T-004
New file: `src/core/fabric/security-scanner.ts` + tests

### T-007: Implement registry reader (search, info, list, updates)
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03 | **Status**: [ ] pending
**Depends On**: T-005
New file: `src/core/fabric/registry-reader.ts` + tests

### T-008: Implement specweave fabric CLI commands
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03 | **Status**: [ ] pending
**Depends On**: T-007
New file: `src/cli/commands/fabric.ts` + tests

### T-009: Create Fabric docs pages (index, catalog, contributing, security)
**User Story**: US-003 | **Satisfies ACs**: AC-US3-02, AC-US3-03 | **Status**: [ ] pending
**Depends On**: T-005
4 new doc pages under `docs-site/docs/fabric/`

### T-010: Add Fabric section to sidebar and navbar
**User Story**: US-002 | **Status**: [ ] pending
**Depends On**: T-009
Modify sidebars.ts and docusaurus.config.ts

### T-011: Add Fabric section to README
**User Story**: US-002 | **Status**: [ ] pending
**Depends On**: T-001, T-009
Brief Fabric section in README between Extensible Skills and Install.

### T-012: Build & test verification
**User Story**: US-001, US-002, US-003 | **Status**: [ ] pending
**Depends On**: all
npm run rebuild, npm test, docs build, manual review.
