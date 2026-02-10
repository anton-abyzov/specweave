---
increment: 0155-native-plugin-skill-architecture
title: "Native Claude Code Plugin/Skill Architecture"
status: completed
priority: P0
type: refactor
created: 2026-01-06
---

# Native Claude Code Plugin/Skill Architecture

## Problem Statement

SpecWeave's 24 plugins with ~40 agents are **NOT activating** in user projects because the architecture doesn't match Claude Code's native patterns:

1. **Directory Structure Wrong**: Claude expects `agents/pm.md` (flat), we have `agents/pm/AGENT.md` (nested)
2. **Custom Naming Scheme**: `sw:pm:pm` is a SpecWeave invention - Claude Code doesn't understand it
3. **Agents vs Skills Confusion**: PM, Architect, Tech-Lead are procedural **knowledge** (should be Skills), not isolated task delegation (Agents)
4. **Large Files**: 65KB agent files cause context bloat - need progressive disclosure

## Root Cause Analysis

| What We Have | What Claude Code Expects | Result |
|--------------|-------------------------|--------|
| `agents/pm/AGENT.md` | `agents/pm.md` | Agents NOT discovered |
| `subagent_type: "sw:pm:pm"` | `subagent_type: "pm"` | Task tool fails |
| PM as "Agent" | PM as "Skill" | Wrong activation pattern |
| 65KB monolithic files | Progressive disclosure | Context bloat |

## Solution

1. **Convert "Agents" to Skills**: PM, Architect, Tech-Lead → Skills with progressive disclosure
2. **Keep TRUE Agents flat**: Explore, CodeReviewer → `agents/name.md` (flat files)
3. **Remove custom naming**: Use simple `pm`, `architect` instead of `sw:pm:pm`
4. **Progressive disclosure**: Split large files into phases loaded on-demand

## User Stories

### US-001: Convert PM Agent to Skill
**Project**: specweave
**As a** user asking about product planning
**I want** the PM skill to auto-activate
**So that** I get product management guidance without explicit invocation

**Acceptance Criteria**:
- [x] **AC-US1-01**: PM moved from `agents/pm/` to `skills/pm/SKILL.md`
- [x] **AC-US1-02**: Description contains activation keywords for semantic matching
- [x] **AC-US1-03**: Large content split into progressive disclosure files
- [x] **AC-US1-04**: Skill activates when user mentions "product planning", "user stories", etc.

### US-002: Convert Architect Agent to Skill
**Project**: specweave
**As a** user asking about system design
**I want** the Architect skill to auto-activate
**So that** I get architecture guidance automatically

**Acceptance Criteria**:
- [x] **AC-US2-01**: Architect moved from `agents/architect/` to `skills/architect/SKILL.md`
- [x] **AC-US2-02**: Description optimized for activation keywords
- [x] **AC-US2-03**: ADR templates moved to progressive disclosure
- [x] **AC-US2-04**: Skill activates for "architecture", "design", "ADR" prompts

### US-003: Convert Tech-Lead Agent to Skill
**Project**: specweave
**As a** user asking about code quality
**I want** the Tech-Lead skill to auto-activate
**So that** I get code review guidance automatically

**Acceptance Criteria**:
- [x] **AC-US3-01**: Tech-Lead moved from `agents/tech-lead/` to `skills/tech-lead/SKILL.md`
- [x] **AC-US3-02**: Description optimized for "code review", "best practices"
- [x] **AC-US3-03**: Review checklists in progressive disclosure
- [x] **AC-US3-04**: Skill activates for code quality prompts

### US-004: Flatten TRUE Agents
**Project**: specweave
**As a** developer using Task tool
**I want** true agents to work natively
**So that** I can spawn isolated sub-agents correctly

**Acceptance Criteria**:
- [x] **AC-US4-01**: Any remaining true agents are flat files `agents/name.md`
- [x] **AC-US4-02**: Agent names are simple (no `sw:` prefix)
- [x] **AC-US4-03**: Task tool can spawn agents with `subagent_type: "name"`
- [x] **AC-US4-04**: AGENTS-INDEX.md updated with native format

### US-005: Update CLAUDE.md Template
**Project**: specweave
**As a** SpecWeave user
**I want** CLAUDE.md to use native patterns
**So that** Claude Code understands the instructions

**Acceptance Criteria**:
- [x] **AC-US5-01**: Remove all `sw:pm:pm` style references
- [x] **AC-US5-02**: Update agent table to simple names
- [x] **AC-US5-03**: Document skills auto-activate (no Task call needed)
- [x] **AC-US5-04**: Document agents need explicit Task invocation

### US-006: Tests for Skill Activation
**Project**: specweave
**As a** maintainer
**I want** tests proving skills activate correctly
**So that** I can verify the refactor works

**Acceptance Criteria**:
- [x] **AC-US6-01**: Unit test for PM skill description matching
- [x] **AC-US6-02**: Unit test for Architect skill description matching
- [x] **AC-US6-03**: Integration test for flat agent discovery
- [x] **AC-US6-04**: All existing tests still pass

## Technical Notes

### Skill Format (Native Claude Code)

```yaml
# skills/pm/SKILL.md
---
name: pm
description: Product Manager expertise for creating product requirements, user stories, specifications, and roadmaps. Guides spec-driven development. Activates for: product planning, requirements, user stories, PRD, feature specification, roadmap, MVP, acceptance criteria, backlog, prioritization, RICE, MoSCoW, product strategy.
allowed-tools: Read, Write, Grep, Glob
---

# Product Manager Skill

## Progressive Disclosure

Load only the phase you need:
- Phase 1: Read `phases/research.md`
- Phase 2: Read `phases/spec-creation.md`
- Phase 3: Read `templates/spec-template.md`

[Concise instructions...]
```

### Agent Format (Native Claude Code)

```yaml
# agents/explore.md (flat file!)
---
name: explore
description: Fast codebase exploration agent.
tools: Read, Grep, Glob, Bash
model: haiku
---

You are a fast exploration agent...
```

## Success Metrics

- Skills auto-activate when user mentions relevant keywords
- No `sw:pm:pm` references remain in codebase
- All tests pass
- PM skill < 500 lines (progressive disclosure for rest)
