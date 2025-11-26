# Tasks: Umbrella Multi-Repo Support

**Increment**: 0062-umbrella-multi-repo-support
**Status**: Completed (Phase 1)

---

## Completed Tasks

### T-001: Create multi-repo intent detector
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed

Created `src/utils/multi-repo-detector.ts` with:
- Pattern detection for multi-repo keywords
- Repo type inference (FE/BE/Shared/Mobile/Infra)
- GitHub URL extraction
- Prefix generation for user stories

---

### T-002: Create umbrella-repo-detector skill
**User Story**: US-001
**Satisfies ACs**: AC-US1-02, AC-US1-03
**Status**: [x] completed

Created `plugins/specweave/skills/umbrella-repo-detector/SKILL.md` with:
- Activation triggers for multi-repo keywords
- User guidance for setup options
- Project-scoped user story format documentation

---

### T-003: Enhance PM agent for project-scoped stories
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Status**: [x] completed

Updated `plugins/specweave/agents/pm/AGENT.md` with:
- Multi-repo detection patterns section
- User story prefixing rules (US-FE-*, US-BE-*, etc.)
- Acceptance criteria prefixing (AC-FE-US1-*)
- Cross-cutting story handling

---

### T-004: Update config schema for umbrella mode
**User Story**: US-002
**Satisfies ACs**: AC-US2-02
**Status**: [x] completed

Updated `src/core/config/types.ts` with:
- `ChildRepoConfig` interface
- `UmbrellaConfig` interface
- Added `umbrella` field to `SpecWeaveConfig`

---

## Recently Completed Tasks

### T-005: Write unit tests for multi-repo detector
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed

Created `tests/unit/repo-structure/multi-repo-detector.test.ts` with 22 tests:
- Detection of "3 repos" pattern
- Detection of "Frontend repo", "Backend repo"
- GitHub URL extraction
- Prefix generation correctness
- Repo type detection from descriptions

---

### T-006: Create ADR for umbrella architecture
**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Status**: [x] completed

Created `ADR-0142: Umbrella Multi-Repo Support`:
- Project-scoped user story format
- Multi-repo intent detection
- Independent repo configuration
- UmbrellaConfig schema

---

### T-007: Add multi-repo detection to init flow (DEFERRED)
**User Story**: US-001
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Status**: [x] deferred

> **Deferred to Phase 2**: This task requires significant changes to the init flow and should be a separate increment.

Requires (for future increment):
- Detect umbrella mode in init
- Prompt for setup options
- Clone repos from GitHub
- Initialize each child repo

---

## Summary

| Status | Count |
|--------|-------|
| Completed | 6 |
| Deferred to Phase 2 | 1 |
| Total | 7 |

**Progress**: 100% (Phase 1 scope complete)

**Phase 1 Deliverables (COMPLETE)**:
- Multi-repo intent detector (`src/utils/multi-repo-detector.ts`)
- PM agent enhancement for project-scoped stories (US-FE-*, US-BE-*)
- Config schema with UmbrellaConfig (`src/core/config/types.ts`)
- Skill for guiding users through setup (`umbrella-repo-detector`)
- Unit tests (22 passing)
- ADR-0142 documenting architecture

**Phase 2 (Future Increment)**:
- T-007: Full init flow integration (clone from GitHub, prompts, etc.)
- US-004: Per-repo external tool sync
- US-005: Spec distribution to child repos
