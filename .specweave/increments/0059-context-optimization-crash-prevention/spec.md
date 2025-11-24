---
increment: 0059-context-optimization-crash-prevention
title: "Context Optimization & Crash Prevention"
priority: P0
status: active
type: performance
feature_id: FS-059
---

# Increment 0059: Context Optimization & Crash Prevention

## Problem Statement

Claude Code crashes 10-50 seconds after starting in the SpecWeave project due to:

| Issue | Current | Target |
|-------|---------|--------|
| AGENTS.md.template | 2,402 lines | ~400 lines |
| Plugin markdown | 24.6 MB | <5 MB loaded |
| Skills loaded | 117 (all upfront) | On-demand |
| Hooks per prompt | 2 node processes | Cached/skipped |
| Enabled plugins | 27 | Lazy loaded |

## User Stories

### US-001: Reduced Template Size
**As a** SpecWeave user in non-Claude environments (Cursor, Copilot)
**I want** a concise AGENTS.md.template (~400 lines)
**So that** my AI tool doesn't crash from context overload

**Acceptance Criteria**:
- [ ] AC-US1-01: Template reduced from 2402 to ~400 lines
- [ ] AC-US1-02: All essential instructions preserved (hooks, sync, commands)
- [ ] AC-US1-03: Non-Claude workflow instructions maintained
- [ ] AC-US1-04: Section index with search patterns kept
- [ ] AC-US1-05: Critical rules and file organization preserved

### US-002: Lazy Skill Loading
**As a** Claude Code user
**I want** skills loaded only when their keywords are detected
**So that** startup doesn't load 117 skills (1.28 MB) upfront

**Acceptance Criteria**:
- [ ] AC-US2-01: Skills index loaded at startup (not full content)
- [ ] AC-US2-02: Full SKILL.md loaded only on keyword match
- [ ] AC-US2-03: Skill activation triggers documented in index
- [ ] AC-US2-04: 80%+ reduction in initial skill context

### US-003: Hook Optimization
**As a** Claude Code user
**I want** hooks to use caching and skip unnecessary work
**So that** every prompt doesn't spawn multiple node processes

**Acceptance Criteria**:
- [ ] AC-US3-01: Discipline check cached for 30 seconds
- [ ] AC-US3-02: Deduplication uses in-memory state (not node spawn)
- [ ] AC-US3-03: Hooks skip when no .specweave/ directory
- [ ] AC-US3-04: 90%+ reduction in hook overhead

### US-004: Progressive Plugin Disclosure
**As a** SpecWeave developer
**I want** plugins to load metadata only, full content on-demand
**So that** 27 plugins don't load 24.6 MB markdown at startup

**Acceptance Criteria**:
- [ ] AC-US4-01: Plugin manifest (name, description, keywords) loaded
- [ ] AC-US4-02: Full plugin content loaded on first use
- [ ] AC-US4-03: Unused plugins never fully loaded
- [ ] AC-US4-04: 80%+ reduction in plugin context at startup

## Success Metrics

- No crashes within first 5 minutes of Claude Code session
- Initial context load < 2 MB (vs current ~25 MB)
- Hook execution time < 100ms (vs current 500ms+)
- Template readable in single screen (~400 lines)

## Out of Scope

- Changing core SpecWeave functionality
- Breaking existing workflows
- Removing any essential features
