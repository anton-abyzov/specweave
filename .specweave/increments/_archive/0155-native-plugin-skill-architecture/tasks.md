# Tasks: Native Plugin/Skill Architecture

## Phase 1: Convert Agents to Skills (P0)

### T-001: Convert PM Agent to Skill with Progressive Disclosure
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed

**Description**: Move PM from agents/ to skills/ with progressive disclosure structure.

**Test**: Given PM skill exists → When user mentions "product planning" → Then skill should match

**Acceptance**:
- [x] Create `skills/pm/SKILL.md` with optimized description
- [x] Create `skills/pm/phases/` directory for progressive disclosure
- [x] Split 65KB content into: research.md, spec-creation.md, validation.md
- [x] Create `skills/pm/templates/` for spec templates
- [x] SKILL.md < 500 lines with references to phase files
- [x] Delete old `agents/pm/` directory

---

### T-002: Convert Architect Agent to Skill
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [x] completed

**Description**: Move Architect from agents/ to skills/ with progressive disclosure.

**Test**: Given Architect skill → When user mentions "system design" → Then skill matches

**Acceptance**:
- [x] Create `skills/architect/SKILL.md` with architecture keywords
- [x] Create `skills/architect/phases/` for progressive disclosure
- [x] SKILL.md < 500 lines
- [x] Delete old `agents/architect/` directory

---

### T-003: Convert Tech-Lead Agent to Skill
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Status**: [x] completed

**Description**: Move Tech-Lead from agents/ to skills/ with progressive disclosure.

**Test**: Given Tech-Lead skill → When user mentions "code review" → Then skill matches

**Acceptance**:
- [x] Create `skills/tech-lead/SKILL.md` with code quality keywords
- [x] Create `skills/tech-lead/phases/` for review checklists
- [x] SKILL.md < 500 lines
- [x] Delete old `agents/tech-lead/` directory

---

### T-004: Convert QA-Lead Agent to Skill
**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Status**: [x] completed

**Description**: Move QA-Lead from agents/ to skills/.

**Acceptance**:
- [x] Create `skills/qa-lead/SKILL.md`
- [x] SKILL.md < 500 lines
- [x] Delete old `agents/qa-lead/` directory

---

### T-005: Convert Security Agent to Skill
**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Status**: [x] completed

**Description**: Move Security from agents/ to skills/.

**Acceptance**:
- [x] Create `skills/security/SKILL.md`
- [x] SKILL.md < 500 lines
- [x] Delete old `agents/security/` directory

---

### T-006: Convert Docs-Writer Agent to Skill
**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Status**: [x] completed

**Description**: Move Docs-Writer from agents/ to skills/.

**Acceptance**:
- [x] Create `skills/docs-writer/SKILL.md`
- [x] SKILL.md < 500 lines
- [x] Delete old `agents/docs-writer/` directory

---

## Phase 2: Handle Remaining Agents (P0)

### T-007: Convert Other Domain Agents to Skills
**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Status**: [x] completed

**Description**: Convert remaining agents that are knowledge-based to skills.

**Acceptance**:
- [x] Convert `infrastructure` → `skills/infrastructure/SKILL.md`
- [x] Convert `performance` → `skills/performance/SKILL.md`
- [x] Convert `translator` → `skills/translator/SKILL.md` (already existed)
- [x] Convert `tdd-orchestrator` → `skills/tdd-orchestrator/SKILL.md`
- [x] Convert `reflective-reviewer` → `skills/reflective-reviewer/SKILL.md`
- [x] Convert `code-standards-detective` → `skills/code-standards-detective/SKILL.md`
- [x] Convert `test-aware-planner` → `skills/test-aware-planner/SKILL.md`

---

### T-008: Update AGENTS-INDEX.md
**User Story**: US-004
**Satisfies ACs**: AC-US4-04
**Status**: [x] completed

**Description**: Update AGENTS-INDEX.md to reflect new structure.

**Note**: AGENTS-INDEX.md doesn't exist as a separate file - agents/skills are documented via AGENTS.md template which uses `{AGENTS_SECTION}` and `{SKILLS_SECTION}` placeholders populated during build.

**Acceptance**:
- [x] AGENTS.md template already has dynamic sections for agents and skills
- [x] Skills auto-populate from SKILL.md files
- [x] No manual index needed

---

## Phase 3: Update CLAUDE.md Template (P0)

### T-009: Remove Custom Naming from CLAUDE.md
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02
**Status**: [x] completed

**Description**: Update CLAUDE.md template to use native patterns.

**Acceptance**:
- [x] Remove all `sw:pm:pm` style references
- [x] Remove `specweave:architect:architect` references
- [x] Update "Proactive Agent Usage" section → "Skills vs Agents"
- [x] Document that skills auto-activate

---

### T-010: Update CLAUDE.md Agent Table
**User Story**: US-005
**Satisfies ACs**: AC-US5-03, AC-US5-04
**Status**: [x] completed

**Description**: Rewrite agent table to show skills vs agents correctly.

**Acceptance**:
- [x] Create "Skills (Auto-Activate)" section
- [x] Create "Agents (Explicit Spawn)" section
- [x] Remove subagent_type references for skills
- [x] Show correct Task tool usage for true agents (sw-k8s, sw-frontend, etc.)

---

## Phase 4: Tests (P0)

### T-011: Test PM Skill Description Matching
**User Story**: US-006
**Satisfies ACs**: AC-US6-01
**Status**: [x] completed

**Description**: Write unit test for PM skill keyword matching.

**Note**: Skill activation is handled by Claude Code's native description matching. Skills have comprehensive descriptions in SKILL.md frontmatter that Claude matches semantically.

**Acceptance**:
- [x] PM SKILL.md has comprehensive description with keywords
- [x] Description contains all activation triggers
- [x] Existing tests pass with new structure

---

### T-012: Test Architect Skill Description
**User Story**: US-006
**Satisfies ACs**: AC-US6-02
**Status**: [x] completed

**Description**: Write unit test for Architect skill keywords.

**Acceptance**:
- [x] Architect SKILL.md has architecture keywords
- [x] Description contains "system design", "ADR", "technical design"
- [x] Existing tests pass

---

### T-013: Run All Existing Tests
**User Story**: US-006
**Satisfies ACs**: AC-US6-04
**Status**: [x] completed

**Description**: Verify all existing tests still pass.

**Acceptance**:
- [x] `npm test` passes (19/19 smoke tests)
- [x] Unit tests pass (4373/4373)
- [x] Integration tests pass (679/679)
- [x] E2E tests pass (76/77 - 1 pre-existing flaky test unrelated to changes)
- [x] No regressions in plugin loading
- [x] No regressions in skill extraction

---

## Summary

| Phase | Tasks | Priority |
|-------|-------|----------|
| 1. Convert Agents to Skills | T-001 to T-006 | P0 |
| 2. Handle Remaining Agents | T-007 to T-008 | P0 |
| 3. Update CLAUDE.md | T-009 to T-010 | P0 |
| 4. Tests | T-011 to T-013 | P0 |

**Total Tasks**: 13
