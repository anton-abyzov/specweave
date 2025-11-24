---
increment: 0059-context-optimization-crash-prevention
total_tasks: 12
completed_tasks: 4
progress: 33%
---

# Implementation Tasks

## Phase 1: AGENTS.md.template Reduction

### T-001: Analyze current template structure
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed

**Test Plan**:
- Given current template (2402 lines)
- When analyzed for essential vs removable content
- Then categorize: keep, consolidate, remove

### T-002: Create reduced AGENTS.md.template
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05
**Status**: [x] completed (2402 -> 348 lines)

**Test Plan**:
- Given analysis from T-001
- When template rewritten to ~400 lines
- Then all essential content preserved
- And non-Claude workflow instructions work

### T-003: Validate template with non-Claude tool
**User Story**: US-001
**Satisfies ACs**: AC-US1-02, AC-US1-03
**Status**: [ ] pending

**Test Plan**:
- Given reduced template
- When used in Cursor/Copilot
- Then all workflows executable

## Phase 2: Hook Optimization

### T-004: Add caching to user-prompt-submit.sh
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-03
**Status**: [x] completed (v0.26.13 already optimized in source)

**Test Plan**:
- Given hook with 30s cache
- When prompt submitted within 30s of last check
- Then cached result used (no node spawn)

### T-005: Add caching to pre-command-deduplication.sh
**User Story**: US-003
**Satisfies ACs**: AC-US3-02
**Status**: [x] completed (v0.26.14 - pure bash, no node)

**Test Plan**:
- Given hook with in-memory state
- When duplicate command checked
- Then no node process spawned

### T-006: Add early exit for non-SpecWeave projects
**User Story**: US-003
**Satisfies ACs**: AC-US3-03
**Status**: [ ] pending

**Test Plan**:
- Given project without .specweave/
- When hook runs
- Then exits immediately (no work done)

### T-007: Measure hook performance improvement
**User Story**: US-003
**Satisfies ACs**: AC-US3-04
**Status**: [ ] pending

**Test Plan**:
- Given optimized hooks
- When 10 prompts submitted
- Then average time < 100ms

## Phase 3: Lazy Skill Loading

### T-008: Add trigger keywords to SKILLS-INDEX.md
**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Status**: [ ] pending

**Test Plan**:
- Given SKILLS-INDEX.md
- When triggers added for each skill
- Then keywords match skill capabilities

### T-009: Document lazy loading pattern
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [ ] pending

**Test Plan**:
- Given lazy loading documentation
- When Claude Code processes it
- Then loads skills on-demand only

## Phase 4: Progressive Plugin Disclosure

### T-010: Create minimal plugin manifest format
**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Status**: [ ] pending

**Test Plan**:
- Given plugin.json format
- When manifest loaded
- Then only name, description, triggers loaded

### T-011: Document progressive loading for plugins
**User Story**: US-004
**Satisfies ACs**: AC-US4-02, AC-US4-03
**Status**: [ ] pending

**Test Plan**:
- Given progressive loading docs
- When followed
- Then plugins load on-demand

## Final Validation

### T-012: End-to-end crash prevention test
**User Story**: US-001, US-002, US-003, US-004
**Satisfies ACs**: All
**Status**: [ ] pending

**Test Plan**:
- Given all optimizations applied
- When Claude Code starts fresh session
- Then no crash for 5+ minutes
- And initial context < 2MB
