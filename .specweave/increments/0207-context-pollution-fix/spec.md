# 0207: Context Pollution Fix

## Problem
Users get "Prompt is too long" errors because SpecWeave's context contributions (~46K+ chars always-loaded, plus 1-8K per turn from hooks) combined with Claude Code's overhead leave only ~50-75K tokens for conversation.

## User Stories

### US-001: As a developer, I want hook output to be minimal so my conversations last longer
- [x] AC-US1-01: UserPromptSubmit hook output < 3000 chars in all code paths
- [x] AC-US1-02: SKILL FIRST message < 400 chars
- [x] AC-US1-03: TDD enforcement block < 200 chars (reference CLAUDE.md)
- [x] AC-US1-04: Brain Message < 800 chars
- [x] AC-US1-05: MAX_ADDITIONAL_CONTEXT_LENGTH reduced to 3000

### US-002: As a developer, I want CLAUDE.md to contain only essential rules
- [x] AC-US2-01: CLAUDE.md under 9000 chars (from 16K)
- [x] AC-US2-02: TDD, Sync, Testing, MCP sections trimmed to 2-3 lines each
- [x] AC-US2-03: Template updated to match

### US-003: As a developer, I want MEMORY.md to not waste tokens on history
- [x] AC-US3-01: Historical audit notes removed
- [x] AC-US3-02: MEMORY.md under 3000 chars

### US-004: As a developer, I want skill invocations to not overflow context
- [x] AC-US4-01: Top 5 SKILL.md files each under 18K chars
- [x] AC-US4-02: Examples, error handling, config reference removed

### US-005: As a developer, I want skill descriptions to use minimal budget
- [x] AC-US5-01: Total skill descriptions under 16K chars (from 24K)
